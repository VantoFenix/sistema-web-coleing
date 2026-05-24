from django.apps import AppConfig
from django.db.models.signals import post_migrate

def do_seed_catalogos(sender, **kwargs):
    """
    Ejecutado post-migración. Inserta catálogos y cuentas de prueba
    de forma segura, evitando RuntimeWarning.
    """
    try:
        from django.contrib.auth.hashers import make_password
        from .models import Sede, Carrera, Administrador, Colegiado

        # 1. SEDES
        SEDES = [
            'Consejo Departamental Amazonas', 'Consejo Departamental Áncash - Chimbote',
            'Consejo Departamental Áncash - Huaraz', 'Consejo Departamental Apurímac',
            'Consejo Departamental Arequipa', 'Consejo Departamental Ayacucho',
            'Consejo Departamental Cajamarca', 'Consejo Departamental Callao',
            'Consejo Departamental Cusco', 'Consejo Departamental Huancavelica',
            'Consejo Departamental Huánuco', 'Consejo Departamental Ica',
            'Consejo Departamental Junín', 'Consejo Departamental La Libertad',
            'Consejo Departamental Lambayeque', 'Consejo Departamental Lima',
            'Consejo Departamental Loreto', 'Consejo Departamental Madre de Dios',
            'Consejo Departamental Moquegua', 'Consejo Departamental Pasco',
            'Consejo Departamental Piura', 'Consejo Departamental Puno',
            'Consejo Departamental San Martín - Moyobamba', 'Consejo Departamental San Martín - Tarapoto',
            'Consejo Departamental Tacna', 'Consejo Departamental Tumbes', 'Consejo Departamental Ucayali',
        ]
        for nombre in SEDES:
            Sede.objects.get_or_create(nombre=nombre, defaults={'activo': True})

        # 2. CARRERAS
        CARRERAS = [
            'Ingeniería Civil', 'Ingeniería Industrial', 'Ingeniería de Sistemas e Inteligencia Artificial',
            'Ingeniería de Software', 'Ingeniería Agrónoma', 'Ingeniería Ambiental y de Seguridad Industrial',
            'Ingeniería Mecánica', 'Ingeniería Electrónica', 'Ingeniería Mecatrónica', 'Ingeniería de Minas',
            'Ingeniería Química', 'Ingeniería Geológica', 'Ingeniería Eléctrica', 'Ingeniería Pesquera',
            'Ingeniería Forestal', 'Ingeniería Zootecnista', 'Ingeniería Sanitaria',
            'Ingeniería de Telecomunicaciones', 'Ingeniería Naval', 'Ingeniería de Petróleo y Gas Natural',
        ]
        for nombre in CARRERAS:
            Carrera.objects.get_or_create(nombre=nombre, defaults={'activo': True})

        # 3. ADMINISTRADORES
        ADMINS = [
            {'usuario': 'admin.cip', 'correo': 'admin@cip.org.pe', 'password': 'Cip@2025', 'nombres': 'Administrador Principal CIP'},
            {'usuario': 'secretaria', 'correo': 'secretaria@cip.org.pe', 'password': 'Secretaria@2025', 'nombres': 'Secretaria de Registro'},
            {'usuario': 'tesoreria', 'correo': 'tesoreria@cip.org.pe', 'password': 'Tesoreria@2025', 'nombres': 'Area de Tesoreria'},
            {'usuario': 'auditor', 'correo': 'auditor@cip.org.pe', 'password': 'Auditor@2025', 'nombres': 'Auditor del Sistema'},
        ]
        for a in ADMINS:
            if not Administrador.objects.filter(usuario=a['usuario']).exists() and not Administrador.objects.filter(correo=a['correo']).exists():
                Administrador.objects.create(
                    usuario=a['usuario'],
                    correo=a['correo'],
                    nombres=a['nombres'],
                    password_hash=make_password(a['password']),
                    activo=True,
                )

        # 4. COLEGIADOS
        sede_lima = Sede.objects.filter(nombre='Consejo Departamental Lima').first()
        sede_la_libertad = Sede.objects.filter(nombre='Consejo Departamental La Libertad').first()
        carrera_sistemas = Carrera.objects.filter(nombre='Ingeniería de Sistemas e Inteligencia Artificial').first()
        carrera_civil = Carrera.objects.filter(nombre='Ingeniería Civil').first()

        COLEGIADOS = [
            {
                'dni': '70000001', 'nombres': 'CARLOS ANDRES HUAMANI QUISPE',
                'correo': 'carlos.huamani@email.com', 'celular': '987654321',
                'password': '70000001', 'carrera': carrera_sistemas,
                'sede': sede_la_libertad, 'nro_colegiado': '00001',
            },
            {
                'dni': '70000002', 'nombres': 'MARIA ELENA TORRES VARGAS',
                'correo': 'maria.torres@email.com', 'celular': '912345678',
                'password': '70000002', 'carrera': carrera_civil,
                'sede': sede_lima, 'nro_colegiado': '00001',
            },
            {
                'dni': '70000003', 'nombres': 'JUAN PABLO LOPEZ CASTRO',
                'correo': 'juan.lopez@email.com', 'celular': '999888777',
                'password': '70000003', 'carrera': carrera_sistemas,
                'sede': sede_la_libertad, 'nro_colegiado': '00002',
            },
            {
                'dni': '70000004', 'nombres': 'LUCIA MENDOZA RUIZ',
                'correo': 'lucia.mendoza@email.com', 'celular': '944555666',
                'password': '70000004', 'carrera': carrera_civil,
                'sede': sede_lima, 'nro_colegiado': '00002',
            },
            {
                'dni': '70000005', 'nombres': 'FERNANDO ALVAREZ GOMEZ',
                'correo': 'fernando.alvarez@email.com', 'celular': '922111333',
                'password': '70000005', 'carrera': carrera_sistemas,
                'sede': sede_la_libertad, 'nro_colegiado': '00003',
            },
            {
                'dni': '70000006', 'nombres': 'ANA MARIA ROJAS CHAVEZ',
                'correo': 'ana.rojas@email.com', 'celular': '998877665',
                'password': '70000006', 'carrera': carrera_civil,
                'sede': sede_lima, 'nro_colegiado': '00003',
            },
        ]
        from datetime import date
        from dateutil.relativedelta import relativedelta
        today = date.today()
        
        for idx, c in enumerate(COLEGIADOS):
            # Simulamos diferentes deudas restando meses a su fecha de colegiatura
            # idx=0 -> 0 meses de deuda (Habilitado perfecto)
            # idx=1 -> 1 mes de deuda (Habilitado con deuda)
            # idx=2 -> 2 meses de deuda (Habilitado con riesgo)
            # idx>=3 -> >3 meses de deuda (Inhabilitado)
            meses_atras = idx
            if idx >= 3:
                meses_atras = 5 # Debe 5 meses
                
            fecha_col = today - relativedelta(months=meses_atras)
            
            if c['carrera'] and c['sede'] and not Colegiado.objects.filter(dni=c['dni']).exists():
                Colegiado.objects.create(
                    dni=c['dni'], nombres=c['nombres'], correo=c['correo'],
                    celular=c['celular'], password_hash=make_password(c['password']),
                    foto_url='', carrera=c['carrera'], sede=c['sede'],
                    nro_colegiado=c['nro_colegiado'], colegiado_desde=fecha_col, activo=True,
                )
    except Exception as e:
        import sys
        print(f"[SEED WARNING] No se pudo ejecutar el seed: {e}", file=sys.stderr)


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        # Conectar el seeder al post_migrate signal en lugar de ejecutarlo directamente
        post_migrate.connect(do_seed_catalogos, sender=self)
