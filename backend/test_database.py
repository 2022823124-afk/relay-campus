import base64
import io
import os
import unittest
from unittest.mock import patch

from PIL import Image
from database import platform_price_reference, record_transaction, save_listing


def sample():
    output = io.BytesIO()
    Image.new('RGB', (20, 20), 'purple').save(output, 'PNG')
    return 'data:image/png;base64,' + base64.b64encode(output.getvalue()).decode()


class DatabaseTests(unittest.TestCase):
    def test_unconfigured_database_keeps_endpoint_honest(self):
        try:
            from fastapi.testclient import TestClient
            from app import app
        except ModuleNotFoundError:
            self.skipTest('FastAPI test dependencies are not installed in this local runtime')
        with patch.dict(os.environ, {}, clear=True), TestClient(app) as client:
            response = client.post('/items', json={
                'id': 'ITEM-TEST', 'name': '旧台灯', 'category': '宿舍好物',
                'description': '开关正常', 'price': 20, 'school': '广州大学',
                'gate': 'living', 'image': sample(),
            })
            self.assertEqual(response.status_code, 503)
            self.assertFalse(client.get('/health').json()['databaseConfigured'])

    def test_listing_uploads_images_then_writes_structured_rows(self):
        calls = []
        def fake_upload(path, value):
            calls.append(('upload', path))
            return path
        def fake_rest(method, table, **kwargs):
            calls.append((method, table, kwargs.get('json')))
            return [{'id': 'db-item'}] if table == 'items' else None
        data = {'id':'ITEM-TEST','name':'旧台灯','category':'宿舍好物','condition':'正常使用',
                'description':'开关正常','price':20,'school':'广州大学','gate':'living',
                'owner':'我','ownerNote':'自用','image':sample(),'photos':{},'proof':'',
                'history':'unknown','previousPrice':'','source':'','version':1}
        with patch('database._upload', fake_upload), patch('database._rest', fake_rest):
            result = save_listing(data)
        self.assertTrue(result['saved'])
        self.assertEqual(result['databaseId'], 'db-item')
        self.assertTrue(any(call[:2] == ('POST', 'items') for call in calls))
        self.assertTrue(any(call[:2] == ('POST', 'item_images') for call in calls))

    def test_only_confirmed_platform_rows_drive_database_price_reference(self):
        rows = [{'id':'p1','comparable_name':'台灯','price':'30','source_label':'本站双方确认成交','occurred_at':'2026-09-22'}]
        with patch('database.configured', return_value=True), patch('database._rest', return_value=rows):
            result = platform_price_reference('宿舍好物')
        self.assertEqual(result['source'], 'Platform Transaction')
        self.assertEqual(result['samples'][0]['price'], 30)
        self.assertIsNone(result['suggested'])

    def test_transaction_requires_both_confirmations(self):
        with self.assertRaises(ValueError):
            record_transaction({'clientItemId':'ITEM-X','price':20,
                                'buyerConfirmed':True,'sellerConfirmed':False})


if __name__ == '__main__':
    unittest.main()
