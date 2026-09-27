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

class CurrencyEvidenceTests(unittest.TestCase):
    def test_both_yen_widths_and_rmb_are_accepted(self):
        for quote in ['二手报价 ¥899', '二手报价 ￥899', '二手报价 RMB 899', '二手报价 899元']:
            pages=[{'title':'耳机','url':'https://example.com/item','content':quote}]
            samples=verified_samples([{'sourceIndex':0,'price':899,'quote':quote}],pages)
            self.assertEqual(len(samples),1,quote)

    def test_sources_without_price_are_returned_for_manual_review(self):
        from pricing import price_reference
        from unittest.mock import Mock
        page={'title':'二手耳机','url':'https://example.com/item','content':'请查看商品详情','raw_content':None}
        with patch.dict(os.environ,{'TAVILY_API_KEY':'test'},clear=True), patch('pricing.requests.post') as post, patch('pricing.ask',return_value={'samples':[]}):
            post.return_value=Mock(**{'json.return_value':{'results':[page]}})
            result=price_reference('索尼 WH-1000XM4')
            self.assertIsNone(result['suggested'])
            self.assertEqual(result['samples'],[])
            self.assertEqual(result['sourceLinks'][0]['url'],page['url'])
            self.assertEqual(result['searchedPages'],1)
            self.assertTrue(result['emptyReason'])
