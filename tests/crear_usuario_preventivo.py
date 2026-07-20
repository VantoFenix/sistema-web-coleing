import os, sys, django
from datetime import date
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'back-cip'))
django.setup()
from core.models import Colegiado, Carrera, Sede, Pago

def crear():
    carrera, _ = Carrera.objects.get_or_create(nombre="Ingeniería de Sistemas")
    sede, _ = Sede.objects.get_or_create(nombre="Lima")
    colegiado, _ = Colegiado.objects.update_or_create(
        dni="11111111",
        defaults={'nombres': "USUARIO PREVENTIVO", 'correo': "dosceroceroseis2006@gmail.com", 'carrera': carrera, 'sede': sede, 'nro_colegiado': "11111", 'colegiado_desde': date(2026, 7, 1), 'activo': True}
    )
    hoy = date.today()
    Pago.objects.update_or_create(colegiado=colegiado, periodo=date(hoy.year, hoy.month, 1), defaults={'tipo': 'MENSUALIDAD', 'monto': 20.0, 'canal': 'CAJA', 'fecha_pago': hoy})
    print("[OK] Usuario de PREVENTIVO (al día) creado.")

if __name__ == "__main__":
    crear()
