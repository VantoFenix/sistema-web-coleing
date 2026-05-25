from django.db import models
from django.core.validators import RegexValidator, FileExtensionValidator


# ==============================================================================
# IMPORTAR DESDE FINANZAS (Catálogos y Colegiado)
# ==============================================================================
from apps.finanzas.models import Sede, Carrera


# ==============================================================================
# ENUMERADOS Y CONSTANTES
# ==============================================================================

class EstadoTramiteChoices(models.TextChoices):
    """Estados permitidos para un trámite"""
    PENDIENTE = 'PENDIENTE', 'Pendiente de revisión'
    OBSERVADO = 'OBSERVADO', 'Observado'
    APROBADO = 'APROBADO', 'Aprobado'
    RECHAZADO = 'RECHAZADO', 'Rechazado'


# ==============================================================================
# MODELO: TRÁMITE DE INSCRIPCIÓN
# ==============================================================================

class TramiteInscripcion(models.Model):
    """
    Modelo para gestionar solicitudes de inscripción de nuevos postulantes.
    Basado en la tabla tramites_inscripcion del SQL.
    """

    # Validadores personalizados
    dni_validator = RegexValidator(
        regex=r'^[0-9]{8}$',
        message='El DNI debe tener exactamente 8 dígitos.'
    )
    celular_validator = RegexValidator(
        regex=r'^[0-9]{9}$',
        message='El celular debe tener exactamente 9 dígitos.'
    )

    # ==== Información Personal ====
    dni = models.CharField(
        max_length=8,
        validators=[dni_validator],
        help_text='8 dígitos del DNI'
    )
    nombre_completo = models.CharField(
        max_length=150,
        help_text='Nombre y apellido del postulante'
    )
    correo = models.EmailField(
        max_length=100,
        help_text='Correo electrónico de contacto'
    )
    celular = models.CharField(
        max_length=9,
        validators=[celular_validator],
        help_text='Número de celular (9 dígitos)'
    )

    # ==== Información Académica ====
    carrera = models.ForeignKey(
        Carrera,
        on_delete=models.PROTECT,
        related_name='tramites_inscripcion',
        help_text='Carrera a la que aplica'
    )
    sede = models.ForeignKey(
        Sede,
        on_delete=models.PROTECT,
        related_name='tramites_inscripcion',
        help_text='Sede donde solicita inscripción'
    )

    # ==== Documentos Requeridos ====
    foto = models.ImageField(
        upload_to='tramites/fotos/%Y/%m/%d/',
        validators=[FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png'])],
        help_text='Foto del postulante (JPG/PNG)',
        null=True,
        blank=True
    )
    titulo_pdf = models.FileField(
        upload_to='tramites/titulos/%Y/%m/%d/',
        validators=[FileExtensionValidator(allowed_extensions=['pdf'])],
        help_text='Copia del título profesional (PDF)',
        null=True,
        blank=True
    )
    voucher = models.FileField(
        upload_to='tramites/vouchers/%Y/%m/%d/',
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'jpg', 'jpeg', 'png'])],
        help_text='Comprobante de pago (PDF/JPG/PNG)',
        null=True,
        blank=True
    )

    # URLs alternativas para documentos (en caso de almacenamiento externo)
    foto_url = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        help_text='URL externa de la foto (si se usa almacenamiento en la nube)'
    )
    titulo_pdf_url = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        help_text='URL externa del título (si se usa almacenamiento en la nube)'
    )
    voucher_url = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        help_text='URL externa del voucher (si se usa almacenamiento en la nube)'
    )

    firma_url = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        help_text='URL externa de la firma (si se usa almacenamiento en la nube)'
    )

    # ==== Estado del Trámite ====
    estado = models.CharField(
        max_length=15,
        choices=EstadoTramiteChoices.choices,
        default=EstadoTramiteChoices.PENDIENTE,
        help_text='Estado actual del trámite'
    )
    observacion = models.TextField(
        blank=True,
        null=True,
        help_text='Observaciones del revisor (si aplica)'
    )

    # ==== Auditoría ====
    fecha_solicitud = models.DateTimeField(
        auto_now_add=True,
        help_text='Fecha y hora de la solicitud'
    )
    fecha_actualizacion = models.DateTimeField(
        auto_now=True,
        help_text='Última fecha de actualización'
    )

    class Meta:
        verbose_name = "Trámite de Inscripción"
        verbose_name_plural = "Trámites de Inscripción"
        ordering = ['-fecha_solicitud']
        indexes = [
            models.Index(fields=['dni']),
            models.Index(fields=['estado']),
            models.Index(fields=['fecha_solicitud']),
            models.Index(fields=['carrera', 'sede']),
        ]

    def __str__(self):
        return f"{self.nombre_completo} ({self.dni}) - {self.get_estado_display()}"

    def marcar_aprobado(self):
        """Marca el trámite como aprobado"""
        self.estado = EstadoTramiteChoices.APROBADO
        self.observacion = None
        self.save()

    def marcar_rechazado(self, observacion):
        """Marca el trámite como rechazado con observación"""
        self.estado = EstadoTramiteChoices.RECHAZADO
        self.observacion = observacion
        self.save()

    def marcar_observado(self, observacion):
        """Marca el trámite como observado con observación"""
        self.estado = EstadoTramiteChoices.OBSERVADO
        self.observacion = observacion
        self.save()
