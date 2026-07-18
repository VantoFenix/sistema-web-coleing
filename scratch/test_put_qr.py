import os
import sys
import json
import requests
from dotenv import load_dotenv

env_path = r'c:\Users\TiagoTZ\Desktop\Agile\Parcial\sistema-web-coleing\.env'
load_dotenv(env_path)

token = os.getenv("MP_ACCESS_TOKEN")
mp_user_id = token.split("-")[-1]
external_pos_id = "CIPWEBPOS01"

qr_url = f"https://api.mercadopago.com/instore/orders/qr/seller/collectors/{mp_user_id}/pos/{external_pos_id}/qrs"
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

order_data = {
    "external_reference": "cip-9~2026-07~1710002534",
    "title": "CIP - 1 cuota(s)",
    "total_amount": 20.0,
    "description": "Pago de colegiatura",
    "items": [{
        "sku_number": "CUOTA",
        "category": "services",
        "title": "Mensualidad",
        "description": "Cuota CIP",
        "unit_price": 20.0,
        "quantity": 1,
        "unit_measure": "unit",
        "total_amount": 20.0
    }]
}

resp = requests.put(qr_url, json=order_data, headers=headers)
print(f"Status: {resp.status_code}")
print(f"Body: {resp.text}")
