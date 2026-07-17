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

class SolicitudSerializer(serializers.ModelSerializer):
    carrera = CarreraSerializer(read_only=True)
    sede = SedeSerializer(read_only=True)
    
    class Meta:
        model = Solicitud
        fields = '__all__'
