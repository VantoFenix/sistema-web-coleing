from rest_framework import serializers
from .models import Carrera, Sede, Colegiado, Administrador, Solicitud

class SedeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sede
        fields = ['id', 'nombre', 'activo']

class CarreraSerializer(serializers.ModelSerializer):
    class Meta:
        model = Carrera
        fields = ['id', 'nombre', 'activo']

class ColegiadoSerializer(serializers.ModelSerializer):
    carrera = CarreraSerializer(read_only=True)
    sede = SedeSerializer(read_only=True)

    class Meta:
        model = Colegiado
        fields = ['id', 'dni', 'nombres', 'carrera', 'nro_colegiado',
                  'sede', 'foto_url', 'activo', 'colegiado_desde']

class AdministradorSerializer(serializers.ModelSerializer):
    estado_display = serializers.SerializerMethodField()

    class Meta:
        model = Administrador
        fields = ['id', 'usuario', 'correo', 'nombres', 'estado_display', 'fecha_creacion']

    def get_estado_display(self, obj):
        if not obj.cuenta_confirmada:
            return 'PENDIENTE'
        if obj.activo:
            return 'ACTIVO'
        return 'INHABILITADO'

from django.contrib.auth.hashers import make_password

class AdministradorCRUDSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    estado_display = serializers.SerializerMethodField()

    class Meta:
        model = Administrador
        fields = ['id', 'usuario', 'correo', 'nombres', 'rol', 'sede', 'activo', 'cuenta_confirmada', 'estado_display', 'fecha_creacion', 'password']
        
    def get_estado_display(self, obj):
        if not obj.cuenta_confirmada:
            return 'PENDIENTE'
        if obj.activo:
            return 'ACTIVO'
        return 'INHABILITADO'
        
    def validate(self, data):
        rol = data.get('rol', self.instance.rol if self.instance else None)
        sede = data.get('sede', self.instance.sede if self.instance else None)
        
        if rol == 'ADMIN' and sede:
            queryset = Administrador.objects.filter(rol='ADMIN', sede=sede)
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError({"sede": "Ya existe un Administrador (Jefe de Sede) asignado a esta sede."})
                
        return data
        
    def create(self, validated_data):
        if 'password' in validated_data:
            validated_data['password_hash'] = make_password(validated_data.pop('password'))
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'password' in validated_data:
            if validated_data['password']:  # Only hash and update if not empty
                validated_data['password_hash'] = make_password(validated_data.pop('password'))
            else:
                validated_data.pop('password')
        return super().update(instance, validated_data)

from utils.storage import select_media_storage, select_raw_storage
from django.conf import settings

def _format_media_url(url_val):
    if not url_val:
        return url_val
    if url_val.startswith('http://') or url_val.startswith('https://'):
        return url_val
    
    # Si es una ruta relativa que empieza por /media/
    if url_val.startswith('/media/'):
        clean_path = url_val.replace('/media/', '', 1)
        if getattr(settings, 'CLOUDINARY_STORAGE', None):
            try:
                if clean_path.lower().endswith('.pdf'):
                    return select_raw_storage().url(clean_path)
                else:
                    return select_media_storage().url(clean_path)
            except Exception:
                pass
    return url_val

class SolicitudSerializer(serializers.ModelSerializer):
    carrera = CarreraSerializer(read_only=True)
    sede = SedeSerializer(read_only=True)
    foto_url = serializers.SerializerMethodField()
    titulo_pdf_url = serializers.SerializerMethodField()
    recibo_pago_url = serializers.SerializerMethodField()
    dni_anverso_url = serializers.SerializerMethodField()
    dni_reverso_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Solicitud
        fields = '__all__'

    def get_foto_url(self, obj):
        return _format_media_url(obj.foto_url)

    def get_titulo_pdf_url(self, obj):
        return _format_media_url(obj.titulo_pdf_url)

    def get_recibo_pago_url(self, obj):
        return _format_media_url(obj.recibo_pago_url)

    def get_dni_anverso_url(self, obj):
        return _format_media_url(obj.dni_anverso_url)

    def get_dni_reverso_url(self, obj):
        return _format_media_url(obj.dni_reverso_url)

