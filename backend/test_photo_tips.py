import unittest
from pipeline import validate_photo_tips, listing_draft

class PhotoTipsTests(unittest.TestCase):
    def test_invalid_and_duplicate_slots_are_discarded(self):
        tip={'slot':'side','title':'拍侧面接口','reason':'主图未展示接口','angle':'侧面平拍，保持光线充足'}
        self.assertEqual(validate_photo_tips([tip,tip,{'slot':'other'},None]),[tip])
        self.assertEqual(validate_photo_tips('bad'),[])
        self.assertEqual(validate_photo_tips([{**tip,'angle':'x'*121}]),[])
    def test_draft_preserves_valid_tips_without_inventing_them(self):
        draft={'name':'台灯','description':'底座有划痕','guidance':'请核对','questions':[]}
        self.assertEqual(listing_draft(b'photo',run=lambda *a:draft)['photoTips'],[])
        tip={'slot':'defect','title':'拍底座划痕','reason':'让买家了解已披露磨损','angle':'自然光近拍，不遮盖划痕'}
        result=listing_draft(b'photo',run=lambda *a:{**draft,'photoTips':[tip]})
        self.assertEqual(result['photoTips'],[tip])
        self.assertTrue(result['requiresConfirmation'])
