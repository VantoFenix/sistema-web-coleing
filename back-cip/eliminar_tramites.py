import os
import django

# Configurar el entorno de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.tramites.models import TramiteInscripcion
from core.models import Solicitud, Colegiado

def run():
    print("Iniciando la eliminación de trámites y solicitudes...")
    
    # 1. Eliminar trámites de inscripción nuevos
    tramites_count, _ = TramiteInscripcion.objects.all().delete()
    print(f"- {tramites_count} trámites de inscripción eliminados.")
    
    # 2. Desvincular las solicitudes de los colegiados (para evitar el error de Foreign Key)
    colegiados_actualizados = Colegiado.objects.filter(solicitud__isnull=False).update(solicitud=None)
    print(f"- {colegiados_actualizados} colegiados fueron desvinculados de sus solicitudes pasadas.")
    
    # 3. Eliminar solicitudes clásicas
    solicitudes_count, _ = Solicitud.objects.all().delete()
    print(f"- {solicitudes_count} solicitudes clásicas eliminadas.")
    
    print("¡Base de datos limpiada con éxito!")

if __name__ == '__main__':
    run()
