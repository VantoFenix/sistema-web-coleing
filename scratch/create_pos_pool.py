import os
import requests
from dotenv import load_dotenv
import time

load_dotenv(r'c:\Users\TiagoTZ\Desktop\Agile\Parcial\sistema-web-coleing\.env')
token = os.getenv('MP_ACCESS_TOKEN')

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

print("Obteniendo ID de la sucursal...")
mp_user_id = token.split("-")[-1]
store_resp = requests.get(f"https://api.mercadopago.com/users/{mp_user_id}/stores?external_id=CIPSTORE01", headers=headers)
store_id = 79121563 # Fallback
if store_resp.status_code == 200:
    results = store_resp.json().get('results', [])
    if results:
        store_id = results[0].get('id')
print(f"Usando Store ID: {store_id}")

print("Creando 30 cajas estáticas...")
for i in range(1, 31):
    external_pos_id = f"CIPWEBPOS{i:02d}"
    pos_payload = {
        "name": f"Caja Web {i:02d}",
        "fixed_amount": True,
        "store_id": store_id,
        "external_id": external_pos_id
    }
    
    # Check if exists first to avoid errors
    check_resp = requests.get(f"https://api.mercadopago.com/pos?external_id={external_pos_id}", headers=headers)
    if check_resp.status_code == 200 and check_resp.json().get('results'):
        print(f"{external_pos_id} ya existe, saltando...")
        continue

    pos_resp = requests.post("https://api.mercadopago.com/pos", json=pos_payload, headers=headers)
    if pos_resp.status_code in (200, 201):
        print(f"Creada caja {external_pos_id}")
    else:
        print(f"Error creando {external_pos_id}: {pos_resp.text}")
    time.sleep(0.5)

print("Proceso completado.")
