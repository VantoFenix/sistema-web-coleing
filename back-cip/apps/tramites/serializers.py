from rest_framework import serializers
from .models import TramiteInscripcion, EstadoTramiteChoices


# ==============================================================================
# SERIALIZADOR PARA TRÁMITES DE INSCRIPCIÓN
# ==============================================================================

class TramiteInscripcionSerializer(serializers.ModelSerializer):
    """
    Serializador completo para trámites de inscripción.
    Incluye validaciones personalizadas y manejo de archivos.
    """

    # Campos anidados (solo lectura)
    carrera_nombre = serializers.CharField(source='carrera.nombre', read_only=True)
    sede_nombre = serializers.CharField(source='sede.nombre', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)

    class Meta:
        model = TramiteInscripcion
        fields = [
            'id', 'dni', 'nombre_completo', 'correo', 'celular',
            'carrera', 'carrera_nombre', 'sede', 'sede_nombre',
            'foto', 'titulo_pdf', 'voucher',
            'foto_url', 'titulo_pdf_url', 'voucher_url',
            'estado', 'estado_display', 'observacion',
            'fecha_solicitud', 'fecha_actualizacion'
        ]
        read_only_fields = ['id', 'fecha_solicitud', 'fecha_actualizacion']

    def validate_dni(self, value):
        """Valida que el DNI tenga exactamente 8 dígitos"""
        if not value.isdigit() or len(value) != 8:
            raise serializers.ValidationError(
                "El DNI debe contener exactamente 8 dígitos numéricos."
            )
        return value

    def validate_foto(self, value):
        """Valida que la foto no exceda 5 MB"""
        if value and value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError(
                "La foto no debe exceder 5 MB."
            )
        return value

    def validate_titulo_pdf(self, value):
        """Valida que el PDF del título no exceda 10 MB"""
        if value and value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError(
                "El archivo PDF no debe exceder 10 MB."
            )
        return value

    def validate_voucher(self, value):
        """Valida que el voucher no exceda 10 MB"""
        if value and value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError(
                "El archivo del voucher no debe exceder 10 MB."
            )
        return value

    def validate(self, data):
        """
        Validaciones adicionales a nivel de objeto.
        Asegura que se proporcione al menos una forma de documentos.
        """
        # Validar que exista al menos una foto (local o URL)
        if not data.get('foto') and not data.get('foto_url'):
            raise serializers.ValidationError(
                "Debe proporcionar al menos una foto (archivo o URL)."
            )

        # Validar que exista al menos un título (local o URL)
        if not data.get('titulo_pdf') and not data.get('titulo_pdf_url'):
            raise serializers.ValidationError(
                "Debe proporcionar el PDF del título profesional (archivo o URL)."
            )

        # Validar que exista al menos un voucher (local o URL)
        if not data.get('voucher') and not data.get('voucher_url'):
            raise serializers.ValidationError(
                "Debe proporcionar el comprobante de pago (archivo o URL)."
            )

        return data


# ==============================================================================
# SERIALIZADOR SIMPLIFICADO PARA LISTADOS
# ==============================================================================

class TramiteInscripcionListSerializer(serializers.ModelSerializer):
    """Serializador simplificado para listados de trámites"""

    carrera_nombre = serializers.CharField(source='carrera.nombre', read_only=True)
    sede_nombre = serializers.CharField(source='sede.nombre', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)

    class Meta:
        model = TramiteInscripcion
        fields = [
            'id', 'dni', 'nombre_completo', 'carrera_nombre', 'sede_nombre',
            'estado', 'estado_display', 'fecha_solicitud'
        ]


# ==============================================================================
# SERIALIZADOR PARA CAMBIAR ESTADO DE TRÁMITE
# ==============================================================================

class CambiarEstadoTramiteSerializer(serializers.Serializer):
    """
    Serializador para actualizar el estado de un trámite.
    Se usa en acciones personalizadas.
    """

    estado = serializers.ChoiceField(
        choices=EstadoTramiteChoices.choices,
        help_text='Nuevo estado del trámite'
    )
    observacion = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=1000,
        help_text='Observación (requerida si es OBSERVADO o RECHAZADO)'
    )

    def validate(self, data):
        """Valida que se proporcione observación si es necesario"""
        estado = data.get('estado')
        observacion = data.get('observacion', '').strip()

        if estado in [EstadoTramiteChoices.OBSERVADO, EstadoTramiteChoices.RECHAZADO]:
            if not observacion:
                raise serializers.ValidationError(
                    f"La observación es requerida para estado '{estado}'."
                )

        return data
