import os
import threading
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pipeline import MAX_BYTES, NotConfigured, configured, decode_image, listing_draft, extract_receipt

app = FastAPI(title='Relay Campus Agent', docs_url='/docs')
app.add_middleware(CORSMiddleware,
    allow_origins=os.getenv('RELAY_ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(','),
    allow_methods=['POST', 'GET'], allow_headers=['Content-Type'])
slot = threading.BoundedSemaphore(1)


class ImageRequest(BaseModel):
    image: str = Field(max_length=MAX_BYTES * 4 // 3 + 100)
    note: str = Field(default='', max_length=1000)


@app.get('/health')
def health():
    return {'service': 'relay-agent', 'visionConfigured': configured(),
            'ocrEnabled': os.getenv('RELAY_OCR_ENABLED') == '1',
            'note': '配置状态不代表模型连通性；发布仍需人工确认和审核'}


def execute(payload, operation):
    try:
        raw = decode_image(payload.image)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    if not slot.acquire(blocking=False):
        raise HTTPException(429, '正在处理另一张图片，请稍后重试')
    try:
        return operation(raw)
    except NotConfigured as exc:
        raise HTTPException(503, str(exc)) from exc
    except Exception as exc:
        # Do not expose provider messages, credentials, image data, or file paths.
        raise HTTPException(502, '识别暂时不可用，请手动填写或稍后重试') from exc
    finally:
        slot.release()


@app.post('/listing-draft')
def draft(payload: ImageRequest):
    return execute(payload, lambda raw: listing_draft(raw, note=payload.note))


@app.post('/history-ocr')
def history(payload: ImageRequest):
    return execute(payload, extract_receipt)
