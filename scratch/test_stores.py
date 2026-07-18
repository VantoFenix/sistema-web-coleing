import os
import requests
from dotenv import load_dotenv

load_dotenv(r'c:\Users\TiagoTZ\Desktop\Agile\Parcial\sistema-web-coleing\.env')
token = os.getenv('MP_ACCESS_TOKEN')

headers = {
    "Authorization": f"Bearer {token}",
}

print("Fetching stores...")
resp = requests.get("https://api.mercadopago.com/users/3528698528/stores", headers=headers)
print(f"Status: {resp.status_code}")
print(f"Body: {resp.text}")
