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
    firma_url = serializers.SerializerMethodField()

    class Meta:
        model = Colegiado
        fields = ['id', 'dni', 'nombres', 'correo', 'celular', 'carrera', 'nro_colegiado',
                  'sede', 'foto_url', 'activo', 'colegiado_desde', 'firma_url']

    def get_firma_url(self, obj):
        if not obj.solicitud_id:
            return None
        from django.db import connection
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT firma_url FROM solicitud WHERE id = %s",
                    [obj.solicitud_id]
                )
                row = cursor.fetchone()
                return row[0] if row else None
        except Exception:
            return None

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
