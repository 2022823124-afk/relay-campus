import os
import unittest
from unittest.mock import patch, Mock
import requests
from fastapi.testclient import TestClient
from fastapi import HTTPException
from app import app
from accounts import validate_state, session_response


class AccountTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_signed_out_cannot_read_or_write_account_state(self):
        self.assertEqual(self.client.get('/account/state').status_code, 401)
        self.assertEqual(self.client.post('/account/state', json={'state':{}, 'revision':0}).status_code, 401)

    def test_token_verified_and_only_its_user_can_read(self):
        with patch('accounts.auth_call', return_value={'id':'user-A'}), patch('accounts._rest', return_value=[{'state':{'saved':['ITEM-1']},'revision':2}]) as rest:
            response = self.client.get('/account/state?user_id=user-B', headers={'Authorization':'Bearer token-A'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(rest.call_args.kwargs['params']['user_id'], 'eq.user-A')

    def test_expired_token_never_reaches_database(self):
        with patch('accounts.auth_call', side_effect=HTTPException(401, 'expired')), patch('accounts._rest') as rest:
            response=self.client.get('/account/state',headers={'Authorization':'Bearer expired'})
        self.assertEqual(response.status_code,401)
        rest.assert_not_called()

    def test_first_save_uses_verified_user_and_no_client_owner(self):
        with patch('accounts.auth_call', return_value={'id':'user-A'}), patch('accounts._rest',return_value=[{'revision':1}]) as rest:
            response=self.client.post('/account/state',headers={'Authorization':'Bearer token'},json={'revision':0,'state':{'saved':['ITEM-1']},'user_id':'user-B'})
        self.assertEqual(response.status_code,200)
        self.assertEqual(rest.call_args.kwargs['json']['user_id'],'user-A')

    def test_stale_revision_rejected_without_overwrite(self):
        with patch('accounts.auth_call',return_value={'id':'user-A'}), patch('accounts._rest',return_value=[]) as rest:
            response=self.client.post('/account/state',headers={'Authorization':'Bearer token'},json={'revision':4,'state':{'saved':[]}})
        self.assertEqual(response.status_code,409)
        self.assertEqual(rest.call_args.kwargs['params'],{'user_id':'eq.user-A','revision':'eq.4'})

    def test_initial_insert_race_returns_conflict(self):
        response=Mock(status_code=409)
        with patch('accounts.auth_call',return_value={'id':'user-A'}), patch('accounts._rest',side_effect=requests.HTTPError(response=response)):
            result=self.client.post('/account/state',headers={'Authorization':'Bearer token'},json={'revision':0,'state':{}})
        self.assertEqual(result.status_code,409)

    def test_signup_requires_confirmation_when_no_session(self):
        self.assertEqual(session_response({'user':{'id':'u'}}),{'verificationRequired':True})

    def test_session_never_returns_admin_fields(self):
        data=session_response({'access_token':'access','refresh_token':'refresh','user':{'id':'u','email':'u@example.test','role':'service_role','user_metadata':{'name':'芽','admin':True}}})
        self.assertEqual(set(data['user']),{'id','email','name'})

    def test_unconfigured_signup_reports_unavailable(self):
        with patch.dict(os.environ,{},clear=True):
            response=self.client.post('/account/signup',json={'email':'demo@example.test','password':'test-only-password'})
        self.assertEqual(response.status_code,503)

    def test_account_routes_do_not_require_ai_access_code(self):
        with patch.dict(os.environ,{'RELAY_ACCESS_CODE':'ai-code'}), patch('accounts.auth_call',return_value={'user':{'id':'u'}}):
            response=self.client.post('/account/login',json={'email':'demo@example.test','password':'test-only-password'})
        self.assertEqual(response.status_code,200)

    def test_invalid_lists_and_shapes_rejected(self):
        for state in ({'saved':['x'*81]},{'saved':{}},{'items':[{}]},{'school':{}},{'garden':{'events':[]}}, {'user_id':'other'}):
            with self.subTest(state=state), self.assertRaises(HTTPException): validate_state(state)


if __name__=='__main__': unittest.main()
