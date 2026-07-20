import os
import sys
import django
from datetime import date

# Configurar el entorno de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.append(os.path.join(os.path.dirname(__file__), 'back-cip'))
django.setup()

from core.models import Colegiado, Carrera, Sede, Pago

def crear_usuario_prueba():
    correo_prueba = "dosdosceroceroseis2006@gmail.com"
    dni_prueba = "99999999"
    
    print(f"Verificando si ya existe el colegiado con DNI {dni_prueba}...")
    colegiado = Colegiado.objects.filter(dni=dni_prueba).first()
    
    if not colegiado:
        carrera, _ = Carrera.objects.get_or_create(nombre="Ingeniería de Sistemas")
        sede, _ = Sede.objects.get_or_create(nombre="Lima")
        
        colegiado = Colegiado.objects.create(
            dni=dni_prueba,
            nombres="USUARIO PRUEBA VENCIMIENTO",
            correo=correo_prueba,
            carrera=carrera,
            sede=sede,
            nro_colegiado="99999",
            colegiado_desde=date(2020, 1, 1),
            foto_url="https://via.placeholder.com/150",
            activo=True
        )
        print(f"[OK] Colegiado creado: {colegiado.nombres} ({correo_prueba})")
    else:
        # Actualizamos correo por si acaso
        colegiado.correo = correo_prueba
        colegiado.save()
        print(f"[INFO] El colegiado ya existía. Correo actualizado a {correo_prueba}")

    # Asegurar que esté pagado hasta el mes actual para que venza al terminar este mes
    hoy = date.today()
    periodo_actual = date(hoy.year, hoy.month, 1)
    
    pago, created = Pago.objects.get_or_create(
        colegiado=colegiado,
        periodo=periodo_actual,
        defaults={
            'tipo': 'MENSUALIDAD',
            'monto': 20.00,
            'canal': 'CAJA',
            'fecha_pago': hoy
        }
    )
    
    if created:
        print(f"[OK] Pago registrado para el periodo {periodo_actual}. El usuario está al día por este mes.")
    else:
        print(f"[INFO] El usuario ya tenía el pago del periodo {periodo_actual}.")

    print("----------------------------------------------------------------------")
    print("Para probar el envío de correo de vencimiento (3 días antes del fin de mes):")
    import calendar
    _, ultimo_dia = calendar.monthrange(hoy.year, hoy.month)
    dia_prueba = ultimo_dia - 3
    fecha_test = date(hoy.year, hoy.month, dia_prueba).strftime("%Y-%m-%d")
    
    print(f"Ejecuta el siguiente comando en la carpeta back-cip:")
    print(f"python manage.py notificar_vencimientos --test-fecha {fecha_test}")

if __name__ == "__main__":
    crear_usuario_prueba()
