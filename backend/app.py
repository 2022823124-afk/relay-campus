import os
import threading
import secrets
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pipeline import MAX_BYTES, NotConfigured, configured, decode_image, listing_draft, extract_receipt
from pricing import price_reference
from providers import provider_name
from database import (DatabaseNotConfigured, configured as database_configured,
                      platform_price_reference, record_transaction, save_listing)

app = FastAPI(title='Relay Campus Agent', docs_url='/docs')
app.add_middleware(CORSMiddleware,
    allow_origins=os.getenv('RELAY_ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(','),
    allow_methods=['POST', 'GET'], allow_headers=['Content-Type', 'X-Relay-Access'])
slot = threading.BoundedSemaphore(1)


@app.middleware('http')
async def protect_model_requests(request: Request, call_next):
    if request.method == 'POST':
        code = os.getenv('RELAY_ACCESS_CODE', '')
        if os.getenv('RELAY_REQUIRE_ACCESS') == '1' and not code:
            response = JSONResponse({'detail': '服务访问码尚未配置'}, status_code=503)
        elif code and not secrets.compare_digest(request.headers.get('X-Relay-Access', '').encode(), code.encode()):
            response = JSONResponse({'detail': '请填写正确的 AI 服务访问码'}, status_code=401)
        else:
            return await call_next(request)
        # This middleware is outside CORS, so include allowed origin on errors.
        origin = request.headers.get('origin')
        allowed = os.getenv('RELAY_ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(',')
        if origin in allowed:
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Vary'] = 'Origin'
        return response
    return await call_next(request)


class ImageRequest(BaseModel):
    image: str = Field(max_length=MAX_BYTES * 4 // 3 + 100)
    note: str = Field(default='', max_length=1000)


@app.get('/health')
def health():
    return {'service': 'relay-agent', 'provider': provider_name(), 'visionConfigured': configured(),
            'databaseConfigured': database_configured(),
            'requiresAccessCode': bool(os.getenv('RELAY_ACCESS_CODE')) or os.getenv('RELAY_REQUIRE_ACCESS') == '1',
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


class PriceRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    category: str = Field(default='', max_length=40)


@app.post('/price-reference')
def price_lookup(payload: PriceRequest):
    if not slot.acquire(blocking=False):
        raise HTTPException(429, '服务正忙，请稍后再试')
    try:
        database_result = platform_price_reference(payload.category.strip())
        if database_result:
            return database_result
        return price_reference(payload.name.strip())
    except NotConfigured as exc:
        raise HTTPException(503, str(exc)) from exc
    except Exception as exc:
        raise HTTPException(502, '暂时无法获取可靠的市场参考价') from exc
    finally:
        slot.release()


class ListingRequest(BaseModel):
    id: str = Field(min_length=4, max_length=80)
    name: str = Field(min_length=1, max_length=80)
    category: str = Field(min_length=1, max_length=40)
    condition: str = Field(default='见物品描述', max_length=80)
    description: str = Field(min_length=1, max_length=1500)
    price: float = Field(ge=0, le=1000000)
    school: str = Field(min_length=1, max_length=80)
    gate: str = Field(pattern='^(teaching|living)$')
    owner: str = Field(default='我', max_length=80)
    ownerNote: str = Field(default='', max_length=1000)
    image: str = Field(max_length=MAX_BYTES * 4 // 3 + 100)
    proof: str = Field(default='', max_length=MAX_BYTES * 4 // 3 + 100)
    photos: dict[str, str] = Field(default_factory=dict)
    history: str = Field(default='unknown', pattern='^(unknown|statement|upload)$')
    previousPrice: float | None = Field(default=None, ge=0, le=1000000)
    source: str = Field(default='', max_length=100)
    version: int = Field(default=1, ge=1)


class TransactionRequest(BaseModel):
    clientItemId: str = Field(min_length=4, max_length=80)
    price: float = Field(ge=0, le=1000000)
    buyerConfirmed: bool
    sellerConfirmed: bool


def _model_data(payload):
    return payload.model_dump() if hasattr(payload, 'model_dump') else payload.dict()


@app.post('/items')
def create_item(payload: ListingRequest):
    if any(key not in ('side', 'defect') for key in payload.photos):
        raise HTTPException(400, '附加照片类型不正确')
    if any(len(value) > MAX_BYTES * 4 // 3 + 100 for value in payload.photos.values()):
        raise HTTPException(400, '附加图片过大')
    try:
        return save_listing(_model_data(payload))
    except DatabaseNotConfigured as exc:
        raise HTTPException(503, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except Exception as exc:
        raise HTTPException(502, '交易卡暂时无法写入数据库，请保留本机记录后重试') from exc


@app.post('/transactions')
def create_transaction(payload: TransactionRequest):
    try:
        return record_transaction(_model_data(payload))
    except DatabaseNotConfigured as exc:
        raise HTTPException(503, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except Exception as exc:
        raise HTTPException(502, '成交记录暂时无法写入数据库') from exc
