import os
import unittest
from unittest.mock import patch, Mock
from fastapi.testclient import TestClient
from app import app
from providers import deepseek_ask, NotConfigured
from pipeline import ask, configured


class DeepSeekTests(unittest.TestCase):
    @patch.dict(os.environ, {'RELAY_PROVIDER':'deepseek','DEEPSEEK_API_KEY':'test-not-a-real-key'}, clear=True)
    @patch('providers.requests.post')
    def test_image_and_json_contract(self, post):
        post.return_value=Mock(**{'json.return_value':{'choices':[{'finish_reason':'stop','message':{'content':'{"name":"台灯"}'}}]}})
        result=ask('输出 JSON', [{'text':'看图'},{'image':'data:image/jpeg;base64,AAAA'}])
        self.assertEqual(result,{'name':'台灯'})
        args=post.call_args
        self.assertEqual(args.args[0],'https://api.deepseek.com/chat/completions')
        self.assertEqual(args.kwargs['json']['model'],'deepseek-flash')
        self.assertEqual(args.kwargs['json']['messages'][1]['content'][1]['type'],'image_url')
        self.assertEqual(args.kwargs['json']['response_format'],{'type':'json_object'})
        self.assertTrue(configured())

    @patch.dict(os.environ, {'RELAY_PROVIDER':'deepseek'}, clear=True)
    def test_no_key_is_not_ready(self):
        self.assertFalse(configured())
        with self.assertRaises(NotConfigured):deepseek_ask('json', 'hello')

    @patch.dict(os.environ, {'DEEPSEEK_API_KEY':'test-only'}, clear=True)
    @patch('providers.requests.post')
    def test_truncated_json_is_rejected(self, post):
        post.return_value=Mock(**{'json.return_value':{'choices':[{'finish_reason':'length','message':{'content':'{}'}}]}})
        with self.assertRaises(ValueError):deepseek_ask('json', 'hello')

    def test_private_access_required_and_cors_preflight(self):
        with patch.dict(os.environ,{'RELAY_REQUIRE_ACCESS':'1','RELAY_ACCESS_CODE':'class-test-code'},clear=True),TestClient(app) as client:
            self.assertEqual(client.post('/listing-draft',json={'image':'bad'}).status_code,401)
            self.assertEqual(client.post('/listing-draft',headers={'X-Relay-Access':'class-test-code'},json={'image':'bad'}).status_code,400)
            response=client.options('/listing-draft',headers={'Origin':'http://localhost:5173','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'X-Relay-Access,Content-Type'})
            self.assertEqual(response.status_code,200)
            self.assertTrue(client.get('/health').json()['requiresAccessCode'])
            self.assertNotIn('class-test-code',client.get('/health').text)

    def test_public_mode_fails_closed_without_access_code(self):
        with patch.dict(os.environ,{'RELAY_REQUIRE_ACCESS':'1'},clear=True),TestClient(app) as client:
            self.assertEqual(client.post('/price-reference',json={'name':'台灯'}).status_code,503)


if __name__=='__main__':unittest.main()
