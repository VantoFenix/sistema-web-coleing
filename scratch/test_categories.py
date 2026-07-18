import os
import requests
from dotenv import load_dotenv

load_dotenv(r'c:\Users\TiagoTZ\Desktop\Agile\Parcial\sistema-web-coleing\.env')
token = os.getenv('MP_ACCESS_TOKEN')

headers = {
    "Authorization": f"Bearer {token}",
}
resp = requests.get("https://api.mercadopago.com/instore/points-of-sale/categories", headers=headers)
print(resp.status_code)
print(resp.text[:1000])
