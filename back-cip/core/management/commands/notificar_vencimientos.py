import sys
import calendar
from datetime import date, datetime
from django.core.management.base import BaseCommand
from django.db import connection
from core.emails import enviar_aviso_preventivo, enviar_aviso_inhabilitacion, enviar_recordatorio_deuda

class Command(BaseCommand):
    help = 'Envía notificaciones automáticas (preventivas 7/3 días e inhabilitación día 1) a los colegiados'

    def add_arguments(self, parser):
        parser.add_argument(
            '--test-fecha',
            type=str,
            help='Forzar una fecha de ejecución (YYYY-MM-DD) para pruebas',
        )

    def handle(self, *args, **options):
        if options['test_fecha']:
            hoy = datetime.strptime(options['test_fecha'], '%Y-%m-%d').date()
            self.stdout.write(self.style.WARNING(f'[TEST] Simulando ejecución para el día: {hoy}'))
        else:
            hoy = date.today()

        # Obtener el último día del mes actual
        _, ultimo_dia = calendar.monthrange(hoy.year, hoy.month)
        dias_para_fin_de_mes = ultimo_dia - hoy.day

        # 1. NOTIFICACIONES PREVENTIVAS (7 días y 3 días antes de fin de mes)
        if dias_para_fin_de_mes in [7, 3]:
            self.stdout.write(self.style.SUCCESS(f'Detectado aviso preventivo ({dias_para_fin_de_mes} días restantes)'))
            self._enviar_preventivos(dias_para_fin_de_mes)
        else:
            self.stdout.write(f'No hay avisos preventivos hoy (faltan {dias_para_fin_de_mes} días para fin de mes).')

        # 2. NOTIFICACIONES DE INHABILITACIÓN Y RECORDATORIOS (Día 1 del mes)
        if hoy.day == 1:
            self.stdout.write(self.style.SUCCESS('Detectado inicio de mes (Día 1). Enviando avisos de inhabilitación y recordatorios de deuda.'))
            self._enviar_inhabilitaciones_y_recordatorios()
        else:
            self.stdout.write('No es el día 1 del mes, omitiendo avisos de inhabilitación y recordatorios.')

    def _enviar_preventivos(self, dias_restantes):
        sql = """
            SELECT c.id, c.nombres, c.nro_colegiado, c.correo
            FROM v_estado_colegiado v
            JOIN colegiado c ON c.id = v.colegiado_id
            WHERE v.meses_adeudados = 0 AND c.correo IS NOT NULL AND c.correo != ''
        """
        
        with connection.cursor() as cursor:
            cursor.execute(sql)
            rows = cursor.fetchall()
            
        enviados = 0
        for r in rows:
            col_id, nombres, nro_col, correo = r
            try:
                enviar_aviso_preventivo(
                    correo=correo,
                    nombres=nombres,
                    nro_colegiado=nro_col,
                    dias_restantes=dias_restantes
                )
                enviados += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error al enviar a {correo}: {e}'))
                
        self.stdout.write(self.style.SUCCESS(f'Enviados {enviados} avisos preventivos.'))

    def _enviar_inhabilitaciones_y_recordatorios(self):
        # 1. Nuevos inhabilitados (meses_adeudados = 1)
        sql_inhabilitados = """
            SELECT c.id, c.nombres, c.nro_colegiado, c.correo
            FROM v_estado_colegiado v
            JOIN colegiado c ON c.id = v.colegiado_id
            WHERE v.meses_adeudados = 1 AND c.correo IS NOT NULL AND c.correo != ''
        """
        
        with connection.cursor() as cursor:
            cursor.execute(sql_inhabilitados)
            rows_inh = cursor.fetchall()
            
        enviados_inh = 0
        for r in rows_inh:
            col_id, nombres, nro_col, correo = r
            try:
                enviar_aviso_inhabilitacion(
                    correo=correo,
                    nombres=nombres,
                    nro_colegiado=nro_col
                )
                enviados_inh += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error al enviar inhabilitacion a {correo}: {e}'))
                
        self.stdout.write(self.style.SUCCESS(f'Enviados {enviados_inh} avisos de inhabilitación nueva.'))

        # 2. Recordatorios de deuda (meses_adeudados > 1)
        sql_recordatorios = """
            SELECT c.id, c.nombres, c.nro_colegiado, c.correo, v.meses_adeudados
            FROM v_estado_colegiado v
            JOIN colegiado c ON c.id = v.colegiado_id
            WHERE v.meses_adeudados > 1 AND c.correo IS NOT NULL AND c.correo != ''
        """

        # Obtenemos la mensualidad de la configuracion (MVP)
        from core.models import Configuracion
        conf = Configuracion.objects.first()
        mensualidad = conf.monto_mensualidad if conf else 20.00
        
        with connection.cursor() as cursor:
            cursor.execute(sql_recordatorios)
            rows_rec = cursor.fetchall()

        enviados_rec = 0
        for r in rows_rec:
            col_id, nombres, nro_col, correo, meses_adeudados = r
            deuda_total = float(meses_adeudados) * float(mensualidad)
            try:
                enviar_recordatorio_deuda(
                    correo=correo,
                    nombres=nombres,
                    nro_colegiado=nro_col,
                    meses_adeudados=meses_adeudados,
                    deuda_total=deuda_total
                )
                enviados_rec += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error al enviar recordatorio a {correo}: {e}'))
                
        self.stdout.write(self.style.SUCCESS(f'Enviados {enviados_rec} recordatorios de deuda.'))
