import sqlite3

conn = sqlite3.connect('db.sqlite3')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()

found = False
for t in tables:
    table_name = t[0]
    try:
        rows = cursor.execute(f"SELECT * FROM {table_name}").fetchall()
        for row in rows:
            if '73736742' in str(row):
                print(f"Found in {table_name}: {row}")
                found = True
    except Exception as e:
        pass

if not found:
    print("Not found in any table.")
