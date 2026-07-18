import re

filepath = 'core/views.py'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove payer email block
old_payer = """            "payer": {
                "email": "pagador@cip.org.pe",
            },"""

content = content.replace(old_payer, "")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
