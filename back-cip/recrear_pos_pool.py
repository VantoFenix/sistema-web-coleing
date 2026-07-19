"""
Script para recrear las cajas POS en MercadoPago con fixed_amount=False.
Primero elimina las existentes con fixed_amount=True, luego las recrea correctamente.
"""
import os
import django
import requests
import time

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from core.models import CajaPOS
from django.conf import settings

def recrear_pos():
    token = settings.MP_ACCESS_TOKEN
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    mp_user_id = token.split("-")[-1]
    
    # 1. Buscar la tienda existente
    store_id = 79121563
    print("Buscando tienda...")
    resp = requests.get(f"https://api.mercadopago.com/users/{mp_user_id}/stores/search", headers=headers)
    if resp.status_code == 200:
        results = resp.json().get('results', [])
        if results:
            store_id = results[0].get('id')
            print(f"Tienda encontrada: {store_id}")
        else:
            print(f"No se encontraron tiendas, usando fallback {store_id}")
    
    # 2. Eliminar las cajas POS existentes que tienen fixed_amount=True
    print("\nEliminando cajas POS existentes...")
    for i in range(1, 16):
        external_pos_id = f"CIPWEBPOS{i:02d}"
        
        # Buscar el POS en MP
        check_resp = requests.get(f"https://api.mercadopago.com/pos?external_id={external_pos_id}", headers=headers)
        if check_resp.status_code == 200:
            pos_results = check_resp.json().get('results', [])
            for pos in pos_results:
                pos_id = pos.get('id')
                if pos_id:
                    del_resp = requests.delete(f"https://api.mercadopago.com/pos/{pos_id}", headers=headers)
                    print(f"  Eliminada POS {external_pos_id} (id={pos_id}): {del_resp.status_code}")
        time.sleep(0.3)
    
    time.sleep(2)  # Esperar que MP procese las eliminaciones
    
    # 3. Recrear las cajas con fixed_amount=False
    print("\nCreando nuevas cajas POS con fixed_amount=False...")
    for i in range(1, 16):
        external_pos_id = f"CIPWEBPOS{i:02d}"
        pos_payload = {
            "name": f"Caja Web {i:02d}",
            "fixed_amount": False,
            "store_id": store_id,
            "external_id": external_pos_id
        }
        
        pos_resp = requests.post("https://api.mercadopago.com/pos", json=pos_payload, headers=headers)
        if pos_resp.status_code in (200, 201):
            print(f"  Creada POS {external_pos_id} OK")
        else:
            print(f"  Error creando POS {external_pos_id}: {pos_resp.status_code} - {pos_resp.text}")
        
        # Asegurar que existe en la BD local
        CajaPOS.objects.get_or_create(external_id=external_pos_id)
        time.sleep(0.5)
    
    print(f"\nPool recreado con {CajaPOS.objects.count()} cajas POS.")

if __name__ == "__main__":
    recrear_pos()
