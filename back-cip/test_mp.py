import os
import django
import sys
import mercadopago

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.conf import settings

def test():
    sdk = mercadopago.SDK(settings.MP_ACCESS_TOKEN)
    
    preference_data = {
        "items": [{
            "title": "Test",
            "quantity": 1,
            "unit_price": 10.0,
            "currency_id": "PEN",
        }],
        "back_urls": {
            "success": "https://sistema-web-coleing.onrender.com/portal/mis-pagos",
            "failure": "https://sistema-web-coleing.onrender.com/portal/mis-pagos",
            "pending": "https://sistema-web-coleing.onrender.com/portal/mis-pagos"
        },
        "auto_return": "approved",
        "external_reference": "test-123"
    }
    
    result = sdk.preference().create(preference_data)
    print(result)

if __name__ == "__main__":
    test()
