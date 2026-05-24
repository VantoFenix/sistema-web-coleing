import os

files = ['core/views.py', 'core/urls.py', 'core/models.py']
for f in files:
    with open(f, 'rb') as file:
        content = file.read()
        if b'\x00' in content:
            print(f"NULL BYTE FOUND IN {f}")
        else:
            print(f"No null bytes in {f}")
