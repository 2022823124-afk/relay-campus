import base64
import io
import os
import unittest
from unittest.mock import patch
from PIL import Image
from fastapi.testclient import TestClient
from app import app
from pipeline import decode_image, listing_draft


def sample():
    output = io.BytesIO()
    Image.new('RGB', (32, 32), 'purple').save(output, 'PNG')
    return 'data:image/png;base64,' + base64.b64encode(output.getvalue()).decode()


class ContractTests(unittest.TestCase):
    def test_real_qwen_package_initializes_without_network_request(self):
        from qwen_agent.agents import Assistant
        bot = Assistant(llm={'model': 'qwen-vl-max', 'api_key': 'configuration-check-only'}, function_list=[])
        self.assertIsNotNone(bot)

    def test_reject_remote_url_and_invalid_image(self):
        for value in ['https://example.com/private.jpg', 'data:image/png;base64,YWJj']:
            with self.assertRaises(ValueError):
                decode_image(value)

    def test_normalize_image(self):
        self.assertEqual(Image.open(io.BytesIO(decode_image(sample()))).format, 'JPEG')

    def test_two_stages_and_untrusted_fields_cannot_publish(self):
        calls = []
        def fake(system, content):
            calls.append(content)
            if len(calls) == 1:
                return dict(name='椅子', visible='黑色布面', questions='请确认承重')
            return dict(name='椅子', description='黑色布面，功能待确认', guidance='补拍支架',
                        price=100, platformTransfers=5, source='Platform Record', stage='PUBLISHED')
        result = listing_draft(decode_image(sample()), fake)
        self.assertEqual(len(calls), 2)
        self.assertEqual(result['source'], 'Image Suggestion')
        self.assertEqual(result['stage'], 'DRAFT')
        self.assertTrue(result['requiresConfirmation'])
        self.assertNotIn('price', result)
        self.assertNotIn('platformTransfers', result)

    def test_incomplete_model_output_is_rejected(self):
        with self.assertRaises(ValueError):
            listing_draft(decode_image(sample()), lambda *_: {'name': '椅子'})

    def test_missing_configuration_is_not_fake_success(self):
        with patch.dict(os.environ, {}, clear=True), TestClient(app) as client:
            self.assertEqual(client.post('/listing-draft', json={'image': sample()}).status_code, 503)
            self.assertEqual(client.post('/history-ocr', json={'image': sample()}).status_code, 503)

    def test_invalid_input_and_concurrency_limit(self):
        from app import slot
        with TestClient(app) as client:
            self.assertEqual(client.post('/listing-draft', json={'image': 'bad'}).status_code, 400)
            slot.acquire()
            try:
                self.assertEqual(client.post('/listing-draft', json={'image': sample()}).status_code, 429)
            finally:
                slot.release()


if __name__ == '__main__':
    unittest.main()
