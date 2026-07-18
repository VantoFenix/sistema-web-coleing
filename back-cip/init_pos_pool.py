import os
import django
import requests
import time

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from core.models import CajaPOS
from django.conf import settings

def init_pool():
    token = settings.MP_ACCESS_TOKEN
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    mp_user_id = token.split("-")[-1]
    
    # 1. Search for existing store or use fallback
    store_id = 79121563
    print("Checking stores...")
    resp = requests.get(f"https://api.mercadopago.com/users/{mp_user_id}/stores/search", headers=headers)
    if resp.status_code == 200:
        results = resp.json().get('results', [])
        if results:
            store_id = results[0].get('id')
            print(f"Found store: {store_id}")
        else:
            print("No stores found, using fallback 79121563")
    
    # 2. Create 15 POS
    for i in range(1, 16):
        external_pos_id = f"CIPWEBPOS{i:02d}"
        pos_payload = {
            "name": f"Caja Web {i:02d}",
            "fixed_amount": True,
            "store_id": store_id,
            "external_id": external_pos_id
        }
        
        # Avoid recreating if it exists
        check_resp = requests.get(f"https://api.mercadopago.com/pos?external_id={external_pos_id}", headers=headers)
        if check_resp.status_code == 200 and check_resp.json().get('results'):
            print(f"POS {external_pos_id} already exists in MP.")
        else:
            pos_resp = requests.post("https://api.mercadopago.com/pos", json=pos_payload, headers=headers)
            if pos_resp.status_code in (200, 201):
                print(f"Created POS {external_pos_id} in MP.")
            else:
                print(f"Error creating POS {external_pos_id}: {pos_resp.text}")
        
        # Create in DB
        CajaPOS.objects.get_or_create(external_id=external_pos_id)
        time.sleep(0.5)
        
    print(f"Pool initialized with {CajaPOS.objects.count()} POSs.")

if __name__ == "__main__":
    init_pool()
