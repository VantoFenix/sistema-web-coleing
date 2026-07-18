import os
import requests
from dotenv import load_dotenv

load_dotenv(r'c:\Users\TiagoTZ\Desktop\Agile\Parcial\sistema-web-coleing\.env')
token = os.getenv('MP_ACCESS_TOKEN')

pos_payload = {
    "name": "Caja Web 999",
    "fixed_amount": True,
    "store_id": 79121563,
    "external_id": "CIP999123456"
}
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}
pos_resp = requests.post("https://api.mercadopago.com/pos", json=pos_payload, headers=headers)
print(pos_resp.status_code)
print(pos_resp.text)
