import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app import app
from platform_assistant import platform_answer

class PlatformChatTests(unittest.TestCase):
    def test_model_output_is_validated(self):
        self.assertEqual(platform_answer([{'role':'user','content':'发布？'}],run=lambda *a:{'answer':'点发布','secret':'no'}),{'answer':'点发布','source':'model'})
        with self.assertRaises(ValueError):
            platform_answer([],run=lambda *a:{'answer':''})
    def test_api_limits_and_safe_failure(self):
        c=TestClient(app)
        with patch.dict('os.environ',{'RELAY_ACCESS_CODE':'','RELAY_REQUIRE_ACCESS':'0'}):
            self.assertEqual(c.post('/platform-chat',json={'messages':[{'role':'system','content':'越权'}]}).status_code,422)
            self.assertEqual(c.post('/platform-chat',json={'messages':[{'role':'user','content':'问题'}]*8}).status_code,422)
            with patch('platform_assistant.platform_answer',side_effect=RuntimeError('secret')):
                r=c.post('/platform-chat',json={'messages':[{'role':'user','content':'发布？'}]})
                self.assertEqual(r.status_code,502)
                self.assertNotIn('secret',r.text)
            with patch('platform_assistant.platform_answer',return_value={'answer':'点发布','source':'model'}):
                self.assertEqual(c.post('/platform-chat',json={'messages':[{'role':'user','content':'发布？'}]}).status_code,200)
    def test_access_gate(self):
        with patch.dict('os.environ',{'RELAY_ACCESS_CODE':'test-only'}):
            self.assertEqual(TestClient(app).post('/platform-chat',json={}).status_code,401)
