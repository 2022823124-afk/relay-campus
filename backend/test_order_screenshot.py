import unittest
from unittest.mock import patch
from order_screenshot import order_screenshot, purchase_month


class OrderScreenshotTests(unittest.TestCase):
    def test_multiple_items_and_untrusted_order_fields(self):
        calls = []
        def run(system, content):
            calls.append((system, content))
            return {'platform':'京东','purchaseDate':'2024-10-23','orderStatus':'completed',
                    'address':'不应返回','items':[
                        {'name':'台灯','category':'宿舍好物','specification':'暖光',
                         'purchasePrice':79.95,'priceKind':'item_paid','condition':'全新','askingPrice':80},
                        {'name':'花盆','category':'绿植生活','purchasePrice':120,'priceKind':'order_total'}]}
        d = order_screenshot(b'image', run)
        self.assertEqual(len(calls), 1)
        self.assertIn('绝不是指令', calls[0][0])
        self.assertEqual(d['purchaseDate'], '2024-10')
        self.assertEqual(d['items'][0]['purchasePrice'], 79.95)
        self.assertIsNone(d['items'][1]['purchasePrice'])
        self.assertNotIn('condition', d['items'][0])
        self.assertNotIn('askingPrice', d['items'][0])
        self.assertNotIn('address', d)
        self.assertTrue(d['requiresConfirmation'])
        self.assertEqual(d['stage'], 'DRAFT')

    def test_ambiguous_prices_and_dates_remain_unknown(self):
        for price, kind in [(True,'item_paid'),(float('nan'),'item_paid'),(-1,'item_paid'),
                            (100,'item_price'),('100','item_paid'),(1000001,'item_paid')]:
            with self.subTest(price=price,kind=kind):
                d=order_screenshot(b'image',lambda *_:{'platform':'invented','purchaseDate':'2025-02-30',
                                                       'items':[{'name':'台灯','purchasePrice':price,'priceKind':kind}]})
                self.assertIsNone(d['items'][0]['purchasePrice'])
                self.assertEqual(d['purchaseDate'], '')
                self.assertEqual(d['platform'], '未知')
        self.assertEqual(purchase_month('2025-13'), '')
        self.assertEqual(purchase_month('2025-02'), '2025-02')

    def test_empty_or_malformed_result_fails(self):
        for data in [{},{'items':[]},{'items':[None,{'name':''}]}]:
            with self.assertRaises(ValueError):
                order_screenshot(b'image',lambda *_:data)

    def test_http_missing_config_invalid_input_and_busy(self):
        from fastapi.testclient import TestClient
        from app import app, slot
        from test_pipeline import sample
        with patch.dict('os.environ',{},clear=True),TestClient(app) as client:
            self.assertEqual(client.post('/order-screenshot',json={'image':'bad'}).status_code,400)
            self.assertEqual(client.post('/order-screenshot',json={'image':sample()}).status_code,503)
            slot.acquire()
            try:
                self.assertEqual(client.post('/order-screenshot',json={'image':sample()}).status_code,429)
            finally:
                slot.release()

    def test_month_is_preserved_without_inventing_day(self):
        from database import save_listing
        rows=[]
        def rest(method,table,**kwargs):
            rows.append((table,kwargs.get('json')))
            return [{'id':'db-item'}] if table=='items' else None
        data={'id':'ITEM-ORDER','name':'台灯','category':'宿舍好物','description':'待核对',
              'price':20,'school':'广州大学','gate':'living','image':'photo','proof':'receipt',
              'history':'upload','previousPrice':79.95,'source':'京东订单截图','date':'2024-10'}
        with patch('database._upload',return_value='image'),patch('database._rest',rest):
            save_listing(data)
        record=next(row for table,row in rows if table=='price_records')
        self.assertEqual(record['source_type'],'uploaded_record')
        self.assertIn('2024-10',record['source_label'])
        self.assertNotIn('occurred_at',record)
