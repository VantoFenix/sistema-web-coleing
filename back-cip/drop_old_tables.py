import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.db import connection

drop_sql = """
DROP TABLE IF EXISTS finanzas_cuota CASCADE;
DROP TABLE IF EXISTS finanzas_colegiado CASCADE;
DROP TABLE IF EXISTS finanzas_carrera CASCADE;
DROP TABLE IF EXISTS finanzas_sede CASCADE;
"""

with connection.cursor() as cursor:
    cursor.execute(drop_sql)

print("Old tables dropped successfully.")
