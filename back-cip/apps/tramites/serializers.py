from rest_framework import serializers
from .models import TramiteInscripcion, EstadoTramiteChoices
from .services import BancoNacionMockService


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
            'numero_operacion', 'banco', 'fecha_pago',
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
                {"voucher": "Debe proporcionar el comprobante de pago (archivo o URL)."}
            )
            
        # Validar campos de pago requeridos
        numero_operacion = data.get('numero_operacion')
        fecha_pago = data.get('fecha_pago')
        banco = data.get('banco')
        
        if not numero_operacion:
            raise serializers.ValidationError({"numero_operacion": "El número de operación es obligatorio."})
        if not fecha_pago:
            raise serializers.ValidationError({"fecha_pago": "La fecha de pago es obligatoria."})
            
        # Llamar al Mock API del Banco de la Nación para validación en tiempo real
        if banco == 'BN':
            resultado = BancoNacionMockService.verificar_operacion(numero_operacion, fecha_pago)
            if not resultado["valido"]:
                raise serializers.ValidationError({
                    "numero_operacion": resultado["mensaje"]
                })

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
            'numero_operacion', 'banco', 'fecha_pago',
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
