from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        """
        Se ejecuta automaticamente cuando Django inicia el servidor.
        Inserta catalogos y cuentas de prueba si no existen.
        """
        try:
            self._seed_catalogos()
        except Exception as e:
            # No detener el servidor si falla (puede ser que la tabla no exista aun)
            import sys
            print(f"[SEED WARNING] No se pudo ejecutar el seed: {e}", file=sys.stderr)

    def _seed_catalogos(self):
        from django.contrib.auth.hashers import make_password
        from .models import Sede, Carrera, Administrador, Colegiado

        # ======================================================
        # 1. SEDES (27 Consejos Departamentales reales del CIP)
        # ======================================================
        SEDES = [
            'Consejo Departamental Amazonas',
            'Consejo Departamental Áncash - Chimbote',
            'Consejo Departamental Áncash - Huaraz',
            'Consejo Departamental Apurímac',
            'Consejo Departamental Arequipa',
            'Consejo Departamental Ayacucho',
            'Consejo Departamental Cajamarca',
            'Consejo Departamental Callao',
            'Consejo Departamental Cusco',
            'Consejo Departamental Huancavelica',
            'Consejo Departamental Huánuco',
            'Consejo Departamental Ica',
            'Consejo Departamental Junín',
            'Consejo Departamental La Libertad',
            'Consejo Departamental Lambayeque',
            'Consejo Departamental Lima',
            'Consejo Departamental Loreto',
            'Consejo Departamental Madre de Dios',
            'Consejo Departamental Moquegua',
            'Consejo Departamental Pasco',
            'Consejo Departamental Piura',
            'Consejo Departamental Puno',
            'Consejo Departamental San Martín - Moyobamba',
            'Consejo Departamental San Martín - Tarapoto',
            'Consejo Departamental Tacna',
            'Consejo Departamental Tumbes',
            'Consejo Departamental Ucayali',
        ]
        for nombre in SEDES:
            Sede.objects.get_or_create(nombre=nombre, defaults={'activo': True})

        # ======================================================
        # 2. CARRERAS (20 Ingenierías registradas en el CIP)
        # ======================================================
        CARRERAS = [
            'Ingeniería Civil',
            'Ingeniería Industrial',
            'Ingeniería de Sistemas e Inteligencia Artificial',
            'Ingeniería de Software',
            'Ingeniería Agrónoma',
            'Ingeniería Ambiental y de Seguridad Industrial',
            'Ingeniería Mecánica',
            'Ingeniería Electrónica',
            'Ingeniería Mecatrónica',
            'Ingeniería de Minas',
            'Ingeniería Química',
            'Ingeniería Geológica',
            'Ingeniería Eléctrica',
            'Ingeniería Pesquera',
            'Ingeniería Forestal',
            'Ingeniería Zootecnista',
            'Ingeniería Sanitaria',
            'Ingeniería de Telecomunicaciones',
            'Ingeniería Naval',
            'Ingeniería de Petróleo y Gas Natural',
        ]
        for nombre in CARRERAS:
            Carrera.objects.get_or_create(nombre=nombre, defaults={'activo': True})

        # ======================================================
        # 3. ADMINISTRADORES (2 cuentas de prueba)
        # ======================================================
        ADMINS = [
            {
                'usuario': 'admin.cip',
                'correo': 'admin@cip.org.pe',
                'nombres': 'Administrador Principal CIP',
                'password': 'Cip@2025',
            },
            {
                'usuario': 'secretaria',
                'correo': 'secretaria@cip.org.pe',
                'nombres': 'Secretaria de Registro',
                'password': 'Secretaria@2025',
            },
        ]
        for a in ADMINS:
            if not Administrador.objects.filter(usuario=a['usuario']).exists():
                Administrador.objects.create(
                    usuario=a['usuario'],
                    correo=a['correo'],
                    nombres=a['nombres'],
                    password_hash=make_password(a['password']),
                    activo=True,
                )

        # ======================================================
        # 4. COLEGIADOS DE PRUEBA (2 cuentas)
        # ======================================================
        sede_lima = Sede.objects.filter(nombre='Consejo Departamental Lima').first()
        sede_la_libertad = Sede.objects.filter(nombre='Consejo Departamental La Libertad').first()
        carrera_sistemas = Carrera.objects.filter(nombre='Ingeniería de Sistemas e Inteligencia Artificial').first()
        carrera_civil = Carrera.objects.filter(nombre='Ingeniería Civil').first()

        COLEGIADOS = [
            {
                'dni': '70000001',
                'nombres': 'CARLOS ANDRES HUAMANI QUISPE',
                'correo': 'carlos.huamani@email.com',
                'celular': '987654321',
                'password': '70000001',  # DNI como contraseña por defecto
                'carrera': carrera_sistemas,
                'sede': sede_la_libertad,
                'nro_colegiado': '1001',
            },
            {
                'dni': '70000002',
                'nombres': 'MARIA ELENA TORRES VARGAS',
                'correo': 'maria.torres@email.com',
                'celular': '912345678',
                'password': '70000002',
                'carrera': carrera_civil,
                'sede': sede_lima,
                'nro_colegiado': '2001',
            },
        ]
        from datetime import date
        for c in COLEGIADOS:
            if c['carrera'] and c['sede'] and not Colegiado.objects.filter(dni=c['dni']).exists():
                Colegiado.objects.create(
                    dni=c['dni'],
                    nombres=c['nombres'],
                    correo=c['correo'],
                    celular=c['celular'],
                    password_hash=make_password(c['password']),
                    foto_url='',
                    carrera=c['carrera'],
                    sede=c['sede'],
                    nro_colegiado=c['nro_colegiado'],
                    colegiado_desde=date(2024, 1, 1),
                    activo=True,
                )
