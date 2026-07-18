import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

with connection.cursor() as cursor:
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS caja_pos (
            id SERIAL PRIMARY KEY,
            external_id VARCHAR(50) UNIQUE NOT NULL,
            en_uso_hasta TIMESTAMP NULL
        );
    """)
print("Table created.")
