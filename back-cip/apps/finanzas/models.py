from django.db import models
from django.core.validators import RegexValidator


# ==============================================================================
# CATÁLOGOS (Necesarios para las relaciones del módulo de finanzas)
# ==============================================================================

class Sede(models.Model):
    """Catálogo de sedes del Colegio de Ingenieros"""
    nombre = models.CharField(max_length=100, unique=True)

    class Meta:
        verbose_name = "Sede"
        verbose_name_plural = "Sedes"
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Carrera(models.Model):
    """Catálogo de carreras de ingeniería"""
    nombre = models.CharField(max_length=150, unique=True)

    class Meta:
        verbose_name = "Carrera"
        verbose_name_plural = "Carreras"
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


# ==============================================================================
# ENTIDAD PRINCIPAL: COLEGIADO (El Padrón Oficial)
# ==============================================================================

class Colegiado(models.Model):
    """Representa un ingeniero colegiado en el sistema"""
    
    # Validadores personalizados para DNI y CIP
    dni_validator = RegexValidator(
        regex=r'^[0-9]{8}$',
        message='El DNI debe tener exactamente 8 dígitos.'
    )
    cip_validator = RegexValidator(
        regex=r'^[0-9]{5}$',
        message='El CIP debe tener exactamente 5 dígitos.'
    )
    celular_validator = RegexValidator(
        regex=r'^[0-9]{9}$',
        message='El celular debe tener exactamente 9 dígitos.'
    )

    # Opciones
    TIPO_DOCUMENTO_CHOICES = [
        ('DNI', 'DNI'),
        ('CIP', 'Reg. CIP'),
        ('RUC', 'RUC'),
        ('PASS', 'Pasaporte'),
        ('CE', 'Carné de Extranjería'),
    ]

    TIPO_COLEGIADO_CHOICES = [
        ('Ordinario', 'Ordinario'),
        ('Vitalicio', 'Vitalicio'),
        ('Temporal', 'Temporal'),
    ]

    # Información personal
    tipo_documento = models.CharField(
        max_length=10,
        choices=TIPO_DOCUMENTO_CHOICES,
        default='DNI'
    )
    numero_documento = models.CharField(
        max_length=20,
        unique=True,
    )
    nombre_completo = models.CharField(max_length=150)
    correo = models.EmailField(max_length=100)
    celular = models.CharField(
        max_length=9,
        validators=[celular_validator]
    )

    # Tipo de colegiatura
    tipo_colegiado = models.CharField(
        max_length=20,
        choices=TIPO_COLEGIADO_CHOICES,
        default='Ordinario'
    )

    # Relaciones con catálogos
    carrera = models.ForeignKey(
        Carrera,
        on_delete=models.PROTECT,
        related_name='colegiados'
    )
    sede = models.ForeignKey(
        Sede,
        on_delete=models.PROTECT,
        related_name='colegiados'
    )

    # Credenciales y activación
    cip = models.CharField(
        max_length=5,
        validators=[cip_validator]
    )
    password_hash = models.CharField(max_length=255, null=True, blank=True)
    cuenta_activa = models.BooleanField(default=False)
    token_activacion = models.CharField(max_length=100, null=True, blank=True)

    # Estado del colegiado
    habilitado = models.BooleanField(default=True)
    fecha_colegiatura = models.DateField(auto_now_add=True)

    class Meta:
        verbose_name = "Colegiado"
        verbose_name_plural = "Colegiados"
        unique_together = (('cip', 'sede'),)
        ordering = ['-fecha_colegiatura', 'nombre_completo']

    def __str__(self):
        return f"{self.nombre_completo} ({self.cip})"


# ==============================================================================
# MÓDULO FINANCIERO: CUOTAS
# ==============================================================================

class Cuota(models.Model):
    """Representa una cuota mensual de un colegiado"""

    colegiado = models.ForeignKey(
        Colegiado,
        on_delete=models.CASCADE,
        related_name='cuotas'
    )
    mes_cobro = models.IntegerField()
    anio_cobro = models.IntegerField()
    monto = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=20.00
    )

    # Estado del pago
    pagado = models.BooleanField(default=False)
    fecha_pago = models.DateTimeField(null=True, blank=True)
    transaccion_id = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        verbose_name = "Cuota"
        verbose_name_plural = "Cuotas"
        unique_together = (('colegiado', 'mes_cobro', 'anio_cobro'),)
        ordering = ['-anio_cobro', '-mes_cobro']

    def __str__(self):
        estado = "Pagada" if self.pagado else "Pendiente"
        return f"Cuota {self.mes_cobro}/{self.anio_cobro} - {self.colegiado.nombre_completo} ({estado})"
