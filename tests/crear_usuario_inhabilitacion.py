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
        dni="22222222",
        defaults={'nombres': "USUARIO INHABILITACION", 'correo': "dosceroceroseis2006@gmail.com", 'carrera': carrera, 'sede': sede, 'nro_colegiado': "22222", 'colegiado_desde': date(2026, 6, 1), 'activo': True}
    )
    hoy = date.today()
    mes_anterior = date(hoy.year, hoy.month - 1, 1) if hoy.month > 1 else date(hoy.year - 1, 12, 1)
    Pago.objects.update_or_create(colegiado=colegiado, periodo=mes_anterior, defaults={'tipo': 'MENSUALIDAD', 'monto': 20.0, 'canal': 'CAJA', 'fecha_pago': hoy})
    Pago.objects.filter(colegiado=colegiado, periodo=date(hoy.year, hoy.month, 1)).delete()
    print("[OK] Usuario de INHABILITACION (1 mes de deuda) creado.")

if __name__ == "__main__":
    crear()
