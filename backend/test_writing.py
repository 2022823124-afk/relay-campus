import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app import app
from writing import generate_writing

class WritingTests(unittest.TestCase):
    def test_only_draft_fields_leave_model(self):
        result = generate_writing('seller','台灯','底座有划痕','正常亮灯',run=lambda *args:{'description':'物主描述：正常亮灯，底座有划痕。','questions':[], 'price':999,'status':'published'})
        self.assertEqual(set(result), {'description','questions','requiresConfirmation'})
        self.assertTrue(result['requiresConfirmation'])

    def test_invalid_questions_rejected(self):
        for questions in ['not a list',[{}],['x'*201],['a']*4]:
            with self.assertRaises(ValueError):
                generate_writing('buyer','台灯','描述','',run=lambda *args:{'message':'请问配件？','questions':questions})

    def test_endpoint_validation_and_failure_do_not_leak(self):
        client=TestClient(app)
        payload={'mode':'buyer','name':'台灯','description':'底座有划痕','note':''}
        with patch.dict('os.environ',{'RELAY_REQUIRE_ACCESS':'0','RELAY_ACCESS_CODE':''}):
            self.assertEqual(client.post('/writing-assist',json={**payload,'mode':'publish'}).status_code,422)
            with patch('writing.generate_writing',side_effect=RuntimeError('secret-token')):
                r=client.post('/writing-assist',json=payload)
                self.assertEqual(r.status_code,502)
                self.assertNotIn('secret-token',r.text)
            with patch('writing.generate_writing',return_value={'message':'可以补拍接口吗？','questions':['接口是什么规格？'],'requiresConfirmation':True}):
                self.assertEqual(client.post('/writing-assist',json=payload).status_code,200)

    def test_access_gate_applies_to_new_endpoint(self):
        with patch.dict('os.environ',{'RELAY_ACCESS_CODE':'test-only'}):
            self.assertEqual(TestClient(app).post('/writing-assist',json={}).status_code,401)

if __name__=='__main__': unittest.main()
