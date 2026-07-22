from rest_framework import serializers
from .models import Sede, Carrera, Colegiado, Cuota, Comprobante


# ==============================================================================
# SERIALIZERS PARA CATÁLOGOS
# ==============================================================================

class SedeSerializer(serializers.ModelSerializer):
    """Serializador para las sedes del colegio"""

    class Meta:
        model = Sede
        fields = ['id', 'nombre']


class CarreraSerializer(serializers.ModelSerializer):
    """Serializador para las carreras de ingeniería"""

    class Meta:
        model = Carrera
        fields = ['id', 'nombre']


# ==============================================================================
# SERIALIZERS PARA COLEGIADO
# ==============================================================================

class ColegiadorSerializer(serializers.ModelSerializer):
    """Serializador para colegiados con validaciones personalizadas"""
    
    # Campos anidados para visualización
    carrera_nombre = serializers.CharField(source='carrera.nombre', read_only=True)
    sede_nombre = serializers.CharField(source='sede.nombre', read_only=True)

    class Meta:
        model = Colegiado
        fields = [
            'id', 'tipo_documento', 'numero_documento', 'tipo_colegiado', 'nombre_completo', 'correo', 'celular',
            'carrera', 'carrera_nombre', 'sede', 'sede_nombre',
            'cip', 'cuenta_activa', 'habilitado', 'fecha_colegiatura'
        ]
        read_only_fields = ['id', 'fecha_colegiatura']

    def validate_numero_documento(self, value):
        """Valida longitud base del documento"""
        if len(value) < 4:
            raise serializers.ValidationError(
                "El documento debe contener al menos 4 caracteres."
            )
        return value

    def validate_cip(self, value):
        """Valida que el CIP tenga exactamente 5 dígitos"""
        if not value.isdigit() or len(value) != 5:
            raise serializers.ValidationError(
                "El CIP debe contener exactamente 5 dígitos numéricos."
            )
        return value

    def validate(self, data):
        """Validaciones adicionales a nivel de objeto"""
        # Validar unicidad de CIP + Sede
        if self.instance is None:  # Si es creación (no actualización)
            existe = Colegiado.objects.filter(
                cip=data.get('cip'),
                sede=data.get('sede')
            ).exists()
            if existe:
                raise serializers.ValidationError(
                    "Ya existe un colegiado con este CIP en la sede seleccionada."
                )
        return data


# ==============================================================================
# SERIALIZERS PARA CUOTAS
# ==============================================================================

class CuotaSerializer(serializers.ModelSerializer):
    """Serializador para cuotas con información del colegiado"""
    
    # Campos de solo lectura con información del colegiado
    colegiado_documento = serializers.CharField(source='colegiado.numero_documento', read_only=True)
    colegiado_nombre = serializers.CharField(source='colegiado.nombre_completo', read_only=True)
    colegiado_cip = serializers.CharField(source='colegiado.cip', read_only=True)

    class Meta:
        model = Cuota
        fields = [
            'id', 'colegiado', 'colegiado_documento', 'colegiado_nombre', 'colegiado_cip',
            'mes_cobro', 'anio_cobro', 'monto', 'pagado', 'fecha_pago', 'transaccion_id'
        ]
        read_only_fields = ['id']

    def validate_mes_cobro(self, value):
        """Valida que el mes esté en rango 1-12"""
        if not (1 <= value <= 12):
            raise serializers.ValidationError(
                "El mes debe estar entre 1 y 12."
            )
        return value

    def validate_anio_cobro(self, value):
        """Valida que el año sea razonable"""
        from datetime import datetime
        current_year = datetime.now().year
        if value < 2000 or value > current_year + 5:
            raise serializers.ValidationError(
                f"El año debe estar entre 2000 y {current_year + 5}."
            )
        return value

    def validate(self, data):
        """Validaciones adicionales a nivel de objeto"""
        # Validar que no exista una cuota duplicada
        if self.instance is None:  # Si es creación
            existe = Cuota.objects.filter(
                colegiado=data.get('colegiado'),
                mes_cobro=data.get('mes_cobro'),
                anio_cobro=data.get('anio_cobro')
            ).exists()
            if existe:
                raise serializers.ValidationError(
                    "Ya existe una cuota para este colegiado en el mes/año especificado."
                )
        return data


class CuotaListSerializer(serializers.ModelSerializer):
    """Serializador simplificado para listados de cuotas"""
    
    colegiado_nombre = serializers.CharField(source='colegiado.nombre_completo', read_only=True)
    estado = serializers.SerializerMethodField()

    class Meta:
        model = Cuota
        fields = ['id', 'colegiado', 'colegiado_nombre', 'mes_cobro', 'anio_cobro', 'monto', 'estado']

    def get_estado(self, obj):
        """Retorna el estado de la cuota"""
        return "Pagada" if obj.pagado else "Pendiente"


class CuotaDetailSerializer(serializers.ModelSerializer):
    """Serializador detallado para cuotas individuales"""
    
    colegiado = ColegiadorSerializer(read_only=True)

    class Meta:
        model = Cuota
        fields = '__all__'
        read_only_fields = ['id']


# ==============================================================================
# SERIALIZERS PARA COMPROBANTES
# ==============================================================================

class ComprobanteSerializer(serializers.ModelSerializer):
    """Serializador para comprobantes de pago"""
    
    colegiado_nombre = serializers.CharField(source='colegiado.nombre_completo', read_only=True)
    colegiado_cip = serializers.CharField(source='colegiado.cip', read_only=True)
    fecha_hora_pago_formateada = serializers.SerializerMethodField()
    factusmart_pdf = serializers.SerializerMethodField()

    class Meta:
        model = Comprobante
        fields = [
            'id', 'numero_comprobante', 'colegiado', 'colegiado_nombre', 'colegiado_cip',
            'monto', 'fecha_hora_pago', 'fecha_hora_pago_formateada',
            'canal', 'metodo_pago', 'estado', 'transaccion_id', 'observaciones', 'factusmart_pdf'
        ]
        read_only_fields = ['id', 'numero_comprobante', 'fecha_hora_pago', 'estado']

    def get_fecha_hora_pago_formateada(self, obj):
        """Retorna la fecha y hora formateadas"""
        from datetime import datetime
        return obj.fecha_hora_pago.strftime('%d/%m/%Y %H:%M:%S') if obj.fecha_hora_pago else None
        
    def get_factusmart_pdf(self, obj):
        if obj.sunat_hash:
            import os
            ruc = os.getenv("SUNAT_RUC_EMISOR", "20123456789")
            base_url = os.getenv("FACTU_URL", "https://20123456789.s2.factusmart.pe/api/v1/issuer/documents").split('/documents')[0]
            return f"{base_url}/documents/{obj.sunat_hash}/pdf?ruc={ruc}"
        return None


class ComprobanteListSerializer(serializers.ModelSerializer):
    """Serializador simplificado para listados de comprobantes"""
    
    colegiado_nombre = serializers.CharField(source='colegiado.nombre_completo', read_only=True)
    colegiado_cip = serializers.CharField(source='colegiado.cip', read_only=True)
    fecha_formateada = serializers.SerializerMethodField()
    factusmart_pdf = serializers.SerializerMethodField()

    class Meta:
        model = Comprobante
        fields = [
            'id', 'numero_comprobante', 'colegiado_cip', 'colegiado_nombre',
            'monto', 'fecha_formateada', 'canal', 'metodo_pago', 'estado', 'factusmart_pdf'
        ]

    def get_fecha_formateada(self, obj):
        """Retorna la fecha formateada"""
        return obj.fecha_hora_pago.strftime('%d/%m/%Y') if obj.fecha_hora_pago else None
        
    def get_factusmart_pdf(self, obj):
        if obj.sunat_hash:
            import os
            ruc = os.getenv("SUNAT_RUC_EMISOR", "20123456789")
            base_url = os.getenv("FACTU_URL", "https://20123456789.s2.factusmart.pe/api/v1/issuer/documents").split('/documents')[0]
            return f"{base_url}/documents/{obj.sunat_hash}/pdf?ruc={ruc}"
        return None


class ComprobanteDetailSerializer(serializers.ModelSerializer):
    """Serializador detallado para comprobante individual"""
    
    colegiado = ColegiadorSerializer(read_only=True)
    cuota = CuotaSerializer(read_only=True)
    fecha_hora_pago_formateada = serializers.SerializerMethodField()
    factusmart_pdf = serializers.SerializerMethodField()

    class Meta:
        model = Comprobante
        fields = '__all__'
        read_only_fields = ['id', 'numero_comprobante', 'fecha_hora_pago', 'estado', 'fecha_descarga']

    def get_fecha_hora_pago_formateada(self, obj):
        """Retorna la fecha y hora formateadas"""
        return obj.fecha_hora_pago.strftime('%d/%m/%Y %H:%M:%S') if obj.fecha_hora_pago else None
        
    def get_factusmart_pdf(self, obj):
        if obj.sunat_hash:
            import os
            ruc = os.getenv("SUNAT_RUC_EMISOR", "20123456789")
            base_url = os.getenv("FACTU_URL", "https://20123456789.s2.factusmart.pe/api/v1/issuer/documents").split('/documents')[0]
            return f"{base_url}/documents/{obj.sunat_hash}/pdf?ruc={ruc}"
        return None
