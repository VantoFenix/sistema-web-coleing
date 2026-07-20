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
        dni="33333333",
        defaults={'nombres': "USUARIO RECORDATORIO", 'correo': "dosceroceroseis2006@gmail.com", 'carrera': carrera, 'sede': sede, 'nro_colegiado': "33333", 'colegiado_desde': date(2026, 5, 1), 'activo': True}
    )
    hoy = date.today()
    mes_trasanterior = date(hoy.year, hoy.month - 2, 1) if hoy.month > 2 else date(hoy.year - 1, 10 + hoy.month, 1)
    Pago.objects.update_or_create(colegiado=colegiado, periodo=mes_trasanterior, defaults={'tipo': 'MENSUALIDAD', 'monto': 20.0, 'canal': 'CAJA', 'fecha_pago': hoy})
    Pago.objects.filter(colegiado=colegiado, periodo__gt=mes_trasanterior).delete()
    print("[OK] Usuario de RECORDATORIO (2 meses de deuda) creado.")

if __name__ == "__main__":
    crear()
