import os
import requests
from dotenv import load_dotenv
import time

load_dotenv(r'c:\Users\TiagoTZ\Desktop\Agile\Parcial\sistema-web-coleing\.env')
token = os.getenv('MP_ACCESS_TOKEN')
mp_user_id = token.split("-")[-1]

external_pos_id = "CIPWEBPOS02"

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

from datetime import timedelta
import datetime

exp_dt = datetime.datetime.utcnow() + timedelta(minutes=15)
exp_str = exp_dt.strftime('%Y-%m-%dT%H:%M:%S.000-05:00')

order_data = {
    "external_reference": f"cip-test-{int(time.time())}",
    "title": "CIP - 1 cuota(s)",
    "total_amount": 20.0,
    "description": "Pago de colegiatura",
    "expiration_date": exp_str,
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
qr_url = f"https://api.mercadopago.com/instore/orders/qr/seller/collectors/{mp_user_id}/pos/{external_pos_id}/qrs"
resp = requests.put(qr_url, json=order_data, headers=headers)
print(resp.status_code)
print(resp.text)
