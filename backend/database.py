"""Supabase persistence for confirmed listing drafts and platform transactions.

The service-role key is used only by this trusted backend. Browser code never
talks to Supabase directly.
"""
import os
import uuid
from datetime import datetime, timezone
from statistics import median
from urllib.parse import quote

import requests

from pipeline import decode_image


class DatabaseNotConfigured(RuntimeError):
    pass


def configured():
    return bool(os.getenv('SUPABASE_URL') and os.getenv('SUPABASE_SERVICE_ROLE_KEY'))


def _settings():
    if not configured():
        raise DatabaseNotConfigured('Supabase 尚未配置，交易卡只保存在当前浏览器')
    base = os.environ['SUPABASE_URL'].rstrip('/')
    if not base.startswith(('https://', 'http://127.0.0.1:', 'http://localhost:')):
        raise ValueError('SUPABASE_URL 必须使用 HTTPS')
    key = os.environ['SUPABASE_SERVICE_ROLE_KEY']
    return base, key, os.getenv('SUPABASE_STORAGE_BUCKET', 'item-images')


def _headers(extra=None):
    _, key, _ = _settings()
    return {'apikey': key, 'Authorization': f'Bearer {key}', **(extra or {})}


def _rest(method, table, *, params=None, json=None, prefer=None):
    base, _, _ = _settings()
    headers = _headers({'Content-Type': 'application/json'})
    if prefer:
        headers['Prefer'] = prefer
    response = requests.request(method, f'{base}/rest/v1/{table}', params=params,
                                json=json, headers=headers, timeout=20)
    response.raise_for_status()
    return response.json() if response.content else None


def _upload(path, image_data_url):
    base, _, bucket = _settings()
    raw = decode_image(image_data_url)
    encoded_path = '/'.join(quote(part, safe='') for part in path.split('/'))
    response = requests.post(f'{base}/storage/v1/object/{quote(bucket, safe="")}/{encoded_path}',
                             data=raw,
                             headers=_headers({'Content-Type': 'image/jpeg', 'x-upsert': 'true'}),
                             timeout=30)
    response.raise_for_status()
    return path


def _delete_upload(path):
    base, _, bucket = _settings()
    encoded_path = '/'.join(quote(part, safe='') for part in path.split('/'))
    try:
        requests.delete(f'{base}/storage/v1/object/{quote(bucket, safe="")}/{encoded_path}',
                        headers=_headers(), timeout=15).raise_for_status()
    except requests.RequestException:
        # Cleanup is best-effort; a failed cleanup must not hide the original error.
        pass


def save_listing(data):
    """Save a human-confirmed draft and its images. Returns stable DB identifiers."""
    client_id = data['id']
    database_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f'relay-campus:{client_id}'))
    image_sources = [('primary', data.get('image'))]
    image_sources.extend((kind, (data.get('photos') or {}).get(kind)) for kind in ('side', 'defect'))
    image_sources.append(('proof', data.get('proof')))
    uploaded = []
    try:
        for kind, value in image_sources:
            if value:
                path = f'{database_id}/{kind}.jpg'
                _upload(path, value)
                uploaded.append((kind, path))

        row = {
            'id': database_id,
            'client_item_id': client_id,
            'name': data['name'].strip(),
            'category': data['category'].strip(),
            'condition': data.get('condition', '见物品描述').strip(),
            'description': data['description'].strip(),
            'asking_price': data['price'],
            'school': data['school'].strip(),
            'gate': data['gate'].strip(),
            'owner_label': data.get('owner', '我').strip(),
            'owner_statement': data.get('ownerNote', '').strip(),
            'status': 'review',
            'source_type': 'owner_statement',
            'confirmed_by_owner': True,
            'version': data.get('version', 1),
        }
        rows = _rest('POST', 'items', params={'on_conflict': 'client_item_id'}, json=row,
                     prefer='resolution=merge-duplicates,return=representation')
        saved = rows[0] if rows else row
        database_id = saved.get('id', database_id)

        if uploaded:
            image_rows = [{'item_id': database_id, 'image_type': kind, 'storage_path': path}
                          for kind, path in uploaded]
            _rest('POST', 'item_images', params={'on_conflict': 'item_id,image_type'}, json=image_rows,
                  prefer='resolution=merge-duplicates,return=minimal')

        previous = data.get('previousPrice')
        if data.get('history') == 'upload' and previous not in ('', None):
            _rest('POST', 'price_records', json={
                'item_id': database_id,
                'comparable_name': row['name'],
                'category': row['category'],
                'condition': row['condition'],
                'price': previous,
                'source_type': 'uploaded_record',
                'source_label': (data.get('source') or '用户上传凭证')[:100],
                'confirmed': True,
            }, prefer='return=minimal')
        return {'saved': True, 'databaseId': database_id, 'clientItemId': client_id,
                'imageCount': len(uploaded)}
    except Exception:
        for _, path in uploaded:
            _delete_upload(path)
        raise


def record_transaction(data):
    if not data.get('buyerConfirmed') or not data.get('sellerConfirmed'):
        raise ValueError('成交记录必须由买卖双方分别确认')
    rows = _rest('GET', 'items', params={
        'client_item_id': f"eq.{data['clientItemId']}",
        'select': 'id,name,category,condition', 'limit': 1,
    })
    if not rows:
        raise ValueError('数据库中找不到这件物品')
    item = rows[0]
    now = datetime.now(timezone.utc).isoformat()
    _rest('POST', 'transactions', json={
        'item_id': item['id'], 'final_price': data['price'],
        'buyer_confirmed': True, 'seller_confirmed': True,
        'completed_at': now, 'source_type': 'platform_transaction',
    }, prefer='return=minimal')
    _rest('POST', 'price_records', json={
        'item_id': item['id'], 'comparable_name': item['name'],
        'category': item['category'], 'condition': item['condition'],
        'price': data['price'], 'source_type': 'platform_transaction',
        'source_label': '本站双方确认成交', 'confirmed': True, 'occurred_at': now,
    }, prefer='return=minimal')
    _rest('PATCH', 'items', params={'id': f"eq.{item['id']}"}, json={'status': 'sold'},
          prefer='return=minimal')
    return {'saved': True, 'source': 'Platform Transaction', 'completedAt': now}


def platform_price_reference(category):
    """Use only confirmed platform transactions for a database price reference."""
    if not configured() or not category:
        return None
    rows = _rest('GET', 'price_records', params={
        'category': f'eq.{category}', 'source_type': 'eq.platform_transaction',
        'confirmed': 'eq.true',
        'select': 'id,comparable_name,price,source_label,occurred_at',
        'order': 'occurred_at.desc', 'limit': 12,
    }) or []
    samples = [{'recordId': row['id'], 'name': row['comparable_name'],
                'price': float(row['price']), 'source': row['source_label'],
                'publishedAt': row.get('occurred_at')}
               for row in rows if row.get('price') is not None and float(row['price']) >= 0]
    if not samples:
        return None
    return {'samples': samples,
            'suggested': round(median(s['price'] for s in samples), 2) if len(samples) >= 3 else None,
            'checkedAt': datetime.now(timezone.utc).isoformat(),
            'source': 'Platform Transaction', 'requiresConfirmation': True}
