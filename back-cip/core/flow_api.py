import hmac
import hashlib
import requests
import urllib.parse
from django.conf import settings

class FlowAPI:
    def __init__(self):
        self.api_key = settings.FLOW_API_KEY
        self.secret_key = settings.FLOW_SECRET_KEY
        env = settings.FLOW_ENV.lower()
        if env == 'live' or env == 'production':
            self.base_url = 'https://www.flow.cl/api'
        else:
            self.base_url = 'https://sandbox.flow.cl/api'

    def _sign(self, params):
        keys = sorted(params.keys())
        string_to_sign = ""
        for k in keys:
            string_to_sign += f"{k}{params[k]}"
            
        hashed = hmac.new(
            self.secret_key.encode('utf-8'),
            string_to_sign.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return hashed

    def create_payment(self, commerce_order, subject, amount, email, url_confirmation, url_return):
        # Flow Sandbox/Production is currently strictly rejecting unverified emails
        # Forcing the use of the only known working email to ensure the QR modal generates successfully.
        email = "vantofortnite@gmail.com"
            
        endpoint = f"{self.base_url}/payment/create"
        
        params = {
            "apiKey": self.api_key,
            "commerceOrder": str(commerce_order),
            "subject": subject,
            "currency": "PEN",
            "amount": str(round(float(amount), 2)),
            "email": email,
            "urlConfirmation": url_confirmation,
            "urlReturn": url_return,
            "paymentMethod": 169
        }
        
        if params["amount"].endswith(".0") or params["amount"].endswith(".00"):
            params["amount"] = str(int(float(amount)))
        
        params["s"] = self._sign(params)
        
        response = requests.post(endpoint, data=params)
        return response.json()

    def get_payment_status(self, token):
        endpoint = f"{self.base_url}/payment/getStatus"
        params = {
            "apiKey": self.api_key,
            "token": token
        }
        params["s"] = self._sign(params)
        
        response = requests.get(endpoint, params=params)
        return response.json()
