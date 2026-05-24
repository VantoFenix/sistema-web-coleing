import psycopg2
import os

try:
    print("Connecting to Supabase...")
    conn = psycopg2.connect(
        dbname='postgres',
        user='postgres.wzgpowttjoimlcowgdcp',
        password='+Cipcontraseña',
        host='aws-1-us-west-2.pooler.supabase.com',
        port='6543'
    )
    conn.autocommit = True
    cur = conn.cursor()
    
    print("Dropping public schema to reset database...")
    cur.execute("DROP SCHEMA public CASCADE;")
    cur.execute("CREATE SCHEMA public;")
    cur.execute("GRANT ALL ON SCHEMA public TO postgres;")
    cur.execute("GRANT ALL ON SCHEMA public TO public;")
    
    print("Schema reset! Running init.sql to recreate tables...")
    with open('../init-db/init.sql', 'r', encoding='utf-8') as f:
        sql = f.read()
    cur.execute(sql)
    
    print("init.sql executed successfully. Database is freshly reset!")
except Exception as e:
    print("Error:", e)
