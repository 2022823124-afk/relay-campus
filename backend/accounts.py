"""Supabase Auth gateway and isolated, revision-controlled account snapshots."""
import json
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
import requests
from database import _settings, _headers, _rest, DatabaseNotConfigured

router = APIRouter(prefix='/account')


def auth_call(method, path, *, body=None, token=None):
    try:
        base, _, _ = _settings()
        headers = _headers({'Content-Type': 'application/json'})
        if token:
            headers['Authorization'] = f'Bearer {token}'
        response = requests.request(method, f'{base}/auth/v1/{path}', headers=headers,
                                    json=body, timeout=20)
    except DatabaseNotConfigured as exc:
        raise HTTPException(503, '账号服务尚未连接，请先以访客继续使用。') from exc
    except requests.RequestException as exc:
        raise HTTPException(502, '账号服务暂时无法连接，请稍后重试。') from exc
    if not response.ok:
        if response.status_code == 429:
            raise HTTPException(429, '操作太频繁，请稍后重试。')
        if token:
            raise HTTPException(401, '登录已失效，请重新登录。')
        # Never relay upstream responses, credentials or account-existence details.
        raise HTTPException(400, '操作未完成，请检查邮箱、密码及邮箱验证状态。')
    return response.json() if response.content else {}


def public_user(user):
    return {'id': user['id'], 'email': user.get('email', ''),
            'name': (user.get('user_metadata') or {}).get('name', '')[:30]}


def session_response(data):
    if not data.get('access_token'):
        return {'verificationRequired': True}
    return {'accessToken': data['access_token'], 'refreshToken': data['refresh_token'],
            'expiresIn': data.get('expires_in', 3600), 'user': public_user(data['user'])}


def require_user(request):
    value = request.headers.get('Authorization', '')
    if not value.startswith('Bearer ') or len(value) > 10000:
        raise HTTPException(401, '请先登录。')
    return auth_call('GET', 'user', token=value[7:])


class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=254, pattern=r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(default='', max_length=30)


class RefreshRequest(BaseModel):
    refreshToken: str = Field(min_length=1, max_length=10000)


@router.post('/signup')
def signup(payload: Credentials):
    return session_response(auth_call('POST', 'signup', body={
        'email': payload.email.strip(), 'password': payload.password,
        'data': {'name': payload.name.strip()},
    }))


@router.post('/login')
def login(payload: Credentials):
    return session_response(auth_call('POST', 'token?grant_type=password', body={
        'email': payload.email.strip(), 'password': payload.password,
    }))


@router.post('/refresh')
def refresh(payload: RefreshRequest):
    return session_response(auth_call('POST', 'token?grant_type=refresh_token',
                                      body={'refresh_token': payload.refreshToken}))


@router.post('/logout')
def logout(request: Request):
    require_user(request)
    auth_call('POST', 'logout?scope=local', token=request.headers['Authorization'][7:])
    return {'signedOut': True}


class StateRequest(BaseModel):
    revision: int = Field(ge=0)
    state: dict


def validate_state(state):
    allowed = {'saved', 'drafts', 'items', 'school', 'garden', 'care'}
    if set(state) - allowed or len(json.dumps(state, ensure_ascii=False).encode()) > 16000000:
        raise HTTPException(400, '同步内容过大或格式不正确，请减少图片后重试。')
    for key in ('saved', 'drafts', 'items'):
        if key in state and (not isinstance(state[key], list) or len(state[key]) > 500):
            raise HTTPException(400, '同步列表格式不正确。')
    if any(not isinstance(x, str) or len(x) > 80 for x in state.get('saved', [])):
        raise HTTPException(400, '收藏记录格式不正确。')
    for key in ('drafts', 'items'):
        for item in state.get(key, []):
            if not isinstance(item, dict) or not isinstance(item.get('id'), str) or not isinstance(item.get('name'), str) or not isinstance(item.get('owner'), str) or not isinstance(item.get('platform'), list) or not isinstance(item.get('uploaded'), list):
                raise HTTPException(400, '物品记录格式不正确。')
    for key in ('garden', 'care'):
        if key in state and state[key] is not None and not isinstance(state[key], dict):
            raise HTTPException(400, '成长记录格式不正确。')
    garden = state.get('garden')
    if garden and any(not isinstance(garden.get(k), list) for k in ('events', 'coupons', 'boosts')):
        raise HTTPException(400, '接力树记录格式不正确。')
    if 'school' in state and (not isinstance(state['school'], str) or len(state['school']) > 80):
        raise HTTPException(400, '学校信息格式不正确。')
    return state


def state_call(method, **kwargs):
    try:
        return _rest(method, 'account_states', **kwargs)
    except (DatabaseNotConfigured, requests.RequestException) as exc:
        raise HTTPException(503, '云端保存暂不可用，本机数据已保留，请稍后重试。') from exc


@router.get('/state')
def load_state(request: Request):
    user = require_user(request)
    rows = state_call('GET', params={'user_id': f"eq.{user['id']}",
                                   'select': 'state,revision', 'limit': 1}) or []
    return rows[0] if rows else {'state': None, 'revision': 0}


@router.post('/state')
def save_state(payload: StateRequest, request: Request):
    user = require_user(request)
    state = validate_state(payload.state)
    if payload.revision == 0:
        try:
            rows = _rest('POST', 'account_states', json={
                'user_id': user['id'], 'state': state, 'revision': 1},
                prefer='return=representation')
        except requests.HTTPError as exc:
            if exc.response is not None and exc.response.status_code == 409:
                raise HTTPException(409, '其他设备已更新，请重新加载云端记录。') from exc
            raise HTTPException(503, '云端保存暂不可用，本机数据已保留。') from exc
        except (DatabaseNotConfigured, requests.RequestException) as exc:
            raise HTTPException(503, '云端保存暂不可用，本机数据已保留。') from exc
    else:
        rows = state_call('PATCH', params={'user_id': f"eq.{user['id']}",
                                          'revision': f'eq.{payload.revision}'},
                          json={'state': state, 'revision': payload.revision + 1},
                          prefer='return=representation')
        if not rows:
            raise HTTPException(409, '其他设备已更新，请重新加载云端记录。')
    return {'revision': rows[0]['revision'], 'saved': True}
