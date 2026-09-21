import unittest
import os
from unittest.mock import patch
from fastapi.testclient import TestClient
from app import app
from pricing import verified_samples


class PricingTests(unittest.TestCase):
    def test_prices_need_exact_evidence_and_unique_sources(self):
        pages=[{'title':'旧台灯','url':'https://example.com/1','content':'这盏旧台灯标价20元。'}]
        good={'sourceIndex':0,'price':20,'quote':'标价20元'}
        self.assertEqual(len(verified_samples([good,good],pages)),1)
        for bad in [dict(good,price=30),dict(good,quote='标价30元'),dict(good,sourceIndex=4),dict(good,price=True),dict(good,price=float('nan'))]:
            self.assertEqual(verified_samples([bad],pages),[])

    def test_foreign_currency_and_missing_service_are_not_fake_prices(self):
        self.assertEqual(verified_samples([{'sourceIndex':0,'price':20,'quote':'$20'}],[{'title':'lamp','url':'https://example.com','content':'$20'}]),[])
        with patch.dict(os.environ,{},clear=True),TestClient(app) as client:
            self.assertEqual(client.post('/price-reference',json={'name':'台灯'}).status_code,503)


if __name__=='__main__':unittest.main()
