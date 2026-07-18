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
    estado = serializers.SerializerMethodField()

    class Meta:
        model = Colegiado
        fields = ['id', 'dni', 'nombres', 'carrera', 'nro_colegiado',
                  'sede', 'foto_url', 'activo', 'estado', 'colegiado_desde']
                  
    def get_estado(self, obj):
        return 'ACTIVO' if obj.activo else 'INHABILITADO'

class AdministradorSerializer(serializers.ModelSerializer):
    estado_display = serializers.SerializerMethodField()
    sede_id = serializers.IntegerField(source='sede.id', read_only=True, default=None)
    sede_nombre = serializers.CharField(source='sede.nombre', read_only=True, default=None)

    class Meta:
        model = Administrador
        fields = ['id', 'usuario', 'correo', 'nombres', 'rol', 'sede', 'sede_id', 'sede_nombre', 'estado_display', 'fecha_creacion']

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

class SolicitudCreateSerializer(serializers.Serializer):
    dni = serializers.CharField(max_length=8)
    nombres = serializers.CharField(max_length=160)
    carrera = serializers.CharField(max_length=100)
    sede = serializers.CharField(max_length=100)
    origen = serializers.CharField(max_length=20, required=False, default='WEB')
    numero_operacion = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    fecha_pago = serializers.DateField(required=False, allow_null=True)
    
    foto = serializers.ImageField(required=True)
    titulo = serializers.FileField(required=True)
    recibo = serializers.FileField(required=False)
    metodo_pago = serializers.CharField(max_length=50, required=False)

    def validate_titulo(self, value):
        if value.content_type != 'application/pdf':
            raise serializers.ValidationError('El Título Profesional debe ser un archivo PDF.')
        return value

    def validate_recibo(self, value):
        if value and not (value.content_type.startswith('image/') or value.content_type == 'application/pdf'):
            raise serializers.ValidationError('El Recibo de Caja debe ser un PDF o una imagen.')
        return value
        
    def validate(self, data):
        carrera_nombre = data.get('carrera')
        sede_nombre = data.get('sede')

        if str(carrera_nombre).isdigit():
            carrera = Carrera.objects.filter(id=carrera_nombre).first()
        else:
            carrera = Carrera.objects.filter(nombre=carrera_nombre).first()
            
        if str(sede_nombre).isdigit():
            sede = Sede.objects.filter(id=sede_nombre).first()
        else:
            sede = Sede.objects.filter(nombre=sede_nombre).first()

        if not carrera:
            raise serializers.ValidationError({'carrera': 'Carrera no válida'})
        if not sede:
            raise serializers.ValidationError({'sede': 'Sede no válida'})

        data['carrera_obj'] = carrera
        data['sede_obj'] = sede
        return data

class SolicitudSerializer(serializers.ModelSerializer):
    carrera = CarreraSerializer(read_only=True)
    sede = SedeSerializer(read_only=True)
    
    class Meta:
        model = Solicitud
        fields = '__all__'
