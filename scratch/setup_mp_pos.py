import os
import sys
import json
import requests
from dotenv import load_dotenv

# Load env vars
env_path = r'c:\Users\TiagoTZ\Desktop\Agile\Parcial\sistema-web-coleing\.env'
load_dotenv(env_path)

TOKEN = os.getenv("MP_ACCESS_TOKEN")
if not TOKEN:
    print("Error: MP_ACCESS_TOKEN no encontrado en .env")
    sys.exit(1)

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

print("1. Obteniendo user_id de Mercado Pago...")
me_resp = requests.get("https://api.mercadopago.com/users/me", headers=headers)
if me_resp.status_code != 200:
    print(f"Error al obtener usuario: {me_resp.text}")
    sys.exit(1)

user_id = me_resp.json().get("id")
print(f"User ID obtenido: {user_id}")

pos_id = "CIPWEBPOS01"
store_id = "CIPSTORE01"

print(f"\n2. Verificando si existe la caja {pos_id}...")
pos_resp = requests.get(f"https://api.mercadopago.com/pos?external_id={pos_id}", headers=headers)
pos_data = pos_resp.json()
results = pos_data.get("results", [])

if results:
    print(f"¡La caja {pos_id} YA EXISTE!")
    print(json.dumps(results[0], indent=2))
else:
    print(f"La caja {pos_id} NO EXISTE. Procediendo a crear la sucursal y la caja...")
    
    # 3. Crear Sucursal
    print(f"\n3. Creando sucursal {store_id}...")
    store_payload = {
        "name": "Sede Principal CIP",
        "location": {
            "street_number": "123",
            "street_name": "Av. Ingenieros",
            "city_name": "Lima",
            "state_name": "Lima",
            "latitude": -12.046374,
            "longitude": -77.042793,
            "reference": "Colegio de Ingenieros"
        },
        "external_id": store_id
    }
    store_req = requests.post(f"https://api.mercadopago.com/users/{user_id}/stores", json=store_payload, headers=headers)
    if store_req.status_code not in (200, 201):
        print(f"Error creando sucursal: {store_req.text}")
        # Puede que ya exista, intentamos continuar
    else:
        print("Sucursal creada exitosamente.")
        
    # 4. Crear Caja
    print(f"\n4. Creando caja {pos_id}...")
    pos_payload = {
        "name": "Caja Web Principal",
        "fixed_amount": True,
        "store_id": store_id,
        "external_id": pos_id,
        "category": 4733 # Restaurantes/General
    }
    create_pos_req = requests.post("https://api.mercadopago.com/pos", json=pos_payload, headers=headers)
    if create_pos_req.status_code not in (200, 201):
        print(f"Error creando caja: {create_pos_req.text}")
    else:
        print("¡Caja creada exitosamente!")
        print(json.dumps(create_pos_req.json(), indent=2))

print("\n¡Proceso finalizado!")
