"""Provider adapters. Model secrets remain in the backend process only."""
import json
import os
import requests


class NotConfigured(Exception):
    pass


def provider_name():
    return os.getenv('RELAY_PROVIDER', 'deepseek' if os.getenv('DEEPSEEK_API_KEY') else 'qwen').strip().lower()


def deepseek_ask(system, content):
    key = os.getenv('DEEPSEEK_API_KEY')
    if not key:
        raise NotConfigured('DeepSeek 尚未配置密钥，请继续手动填写')
    model = os.getenv('DEEPSEEK_MODEL', 'deepseek-flash')
    converted = content
    if isinstance(content, list):
        converted = []
        for part in content:
            if 'text' in part:
                converted.append({'type': 'text', 'text': part['text']})
            elif 'image' in part:
                if model not in ('deepseek-flash', 'deepseek-v4-flash', 'deepseek-v4-flash-vision-exp'):
                    raise NotConfigured('此模型未配置图像支持，请使用 deepseek-flash')
                converted.append({'type': 'image_url', 'image_url': {'url': part['image']}})
            else:
                raise ValueError('Unsupported input block')
    response = requests.post('https://api.deepseek.com/chat/completions',
        headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
        json={'model': model, 'messages': [{'role': 'system', 'content': system + '\nReturn a JSON object.'},
                                          {'role': 'user', 'content': converted}],
              'response_format': {'type': 'json_object'}, 'thinking': {'type': 'disabled'},
              'max_tokens': 1600, 'stream': False}, timeout=(5, 45))
    response.raise_for_status()
    choice = response.json()['choices'][0]
    if choice.get('finish_reason') != 'stop':
        raise ValueError('DeepSeek response incomplete')
    result = json.loads(choice['message']['content'])
    if not isinstance(result, dict):
        raise ValueError('DeepSeek response must be an object')
    return result
