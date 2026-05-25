from rest_framework import serializers
from .models import Carrera, Sede, Colegiado, Administrador, Solicitud

class SedeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sede
        fields = ['id', 'nombre']

class CarreraSerializer(serializers.ModelSerializer):
    class Meta:
        model = Carrera
        fields = ['id', 'nombre']

class ColegiadoSerializer(serializers.ModelSerializer):
    carrera = CarreraSerializer(read_only=True)
    sede = SedeSerializer(read_only=True)

    class Meta:
        model = Colegiado
        fields = ['id', 'dni', 'nombres', 'carrera', 'nro_colegiado',
                  'sede', 'foto_url', 'activo', 'colegiado_desde']

class AdministradorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Administrador
        fields = ['id', 'usuario', 'correo', 'nombres']

class SolicitudSerializer(serializers.ModelSerializer):
    carrera = CarreraSerializer(read_only=True)
    sede = SedeSerializer(read_only=True)
    
    class Meta:
        model = Solicitud
        fields = '__all__'
