import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.db import connection

sql_file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'init-db', 'init.sql')

with open(sql_file_path, 'r', encoding='utf-8') as f:
    sql_script = f.read()

with connection.cursor() as cursor:
    cursor.execute(sql_script)

print("SQL script executed successfully!")
