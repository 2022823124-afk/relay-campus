import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app import app
from database import watched_items
from writing import generate_writing

class WatchTests(unittest.TestCase):
    def test_no_drafts_or_private_fields_requested(self):
        with patch('database._rest',return_value=[]) as request:
            self.assertEqual(watched_items(['ITEM-123']),[])
            params=request.call_args.kwargs['params']
            self.assertEqual(params['status'],'in.(published,sold)')
            self.assertNotIn('owner',params['select'])
            self.assertNotIn('proof',params['select'])
    def test_ids_cannot_inject_filters(self):
        with patch.dict('os.environ',{'RELAY_REQUIRE_ACCESS':'0','RELAY_ACCESS_CODE':''}),patch('database.watched_items') as query:
            client=TestClient(app)
            self.assertEqual(client.post('/watch-updates',json={'ids':['x),status.eq.review']}).status_code,400)
            self.assertEqual(client.post('/watch-updates',json={'ids':['ITEM-123']*51}).status_code,422)
            query.assert_not_called()
    def test_focus_summary_rejects_long_model_result(self):
        with self.assertRaises(ValueError):
            generate_writing('focus','台灯','划痕','清洁',run=lambda *args:{'message':'长'*121,'questions':[]})
