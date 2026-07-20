import sys
import calendar
from datetime import date, datetime
from django.core.management.base import BaseCommand
from django.db import connection
from core.emails import enviar_aviso_preventivo, enviar_aviso_inhabilitacion

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

        # 2. NOTIFICACIONES DE INHABILITACIÓN (Día 1 del mes)
        if hoy.day == 1:
            self.stdout.write(self.style.SUCCESS('Detectado inicio de mes (Día 1). Enviando avisos de inhabilitación.'))
            self._enviar_inhabilitaciones()
        else:
            self.stdout.write('No es el día 1 del mes, omitiendo avisos de inhabilitación.')

    def _enviar_preventivos(self, dias_restantes):
        # Buscamos activos que deben pagar para no inhabilitarse el próximo mes.
        # En v_estado_colegiado, "meses_adeudados = 0" significa que pagaron todo,
        # pero tenemos que validar si el último mes cubierto es este mes (por lo que el próximo mes deberan).
        
        # En realidad, si meses_adeudados = 0, el pago cubre el mes actual.
        # Significa que a fin de mes vencerá si no pagan el siguiente mes.
        # Espera: En el sistema CIP, si estás "meses_adeudados = 0", estás al día.
        # Cuando cambia de mes, tu deuda sube a 1 si no pagaste.
        # Por ende, TODOS los colegiados activos (meses_adeudados = 0) deben recibir el aviso
        # preventivo para pagar el mes que viene? 
        # O solo los que su último pago fue EXACTAMENTE este mes? 
        # Bueno, los que adelantaron 1 año de pagos tendrán meses_adeudados = -11. 
        # Solo notificaremos a los que tienen meses_adeudados = 0 (su saldo exacto es 0),
        # lo que significa que el próximo mes estarán en deuda de 1 mes.
        
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

    def _enviar_inhabilitaciones(self):
        # El día 1, los que no pagaron pasaron a meses_adeudados = 1 (recién inhabilitados).
        # Los que ya tenían > 1 ya fueron inhabilitados antes (o podríamos notificarlos de nuevo, pero el plan dice "Día 1 para los que acaban de entrar").
        # Enviaremos a los que tienen meses_adeudados = 1.
        sql = """
            SELECT c.id, c.nombres, c.nro_colegiado, c.correo
            FROM v_estado_colegiado v
            JOIN colegiado c ON c.id = v.colegiado_id
            WHERE v.meses_adeudados = 1 AND c.correo IS NOT NULL AND c.correo != ''
        """
        
        with connection.cursor() as cursor:
            cursor.execute(sql)
            rows = cursor.fetchall()
            
        enviados = 0
        for r in rows:
            col_id, nombres, nro_col, correo = r
            try:
                enviar_aviso_inhabilitacion(
                    correo=correo,
                    nombres=nombres,
                    nro_colegiado=nro_col
                )
                enviados += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error al enviar a {correo}: {e}'))
                
        self.stdout.write(self.style.SUCCESS(f'Enviados {enviados} avisos de inhabilitación.'))
