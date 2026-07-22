from django.contrib import admin
from .models import Sede, Carrera, Colegiado, Cuota, Comprobante


@admin.register(Sede)
class SedeAdmin(admin.ModelAdmin):
    """Administrador para Sedes"""
    list_display = ['id', 'nombre']
    search_fields = ['nombre']
    ordering = ['nombre']


@admin.register(Carrera)
class CarreraAdmin(admin.ModelAdmin):
    """Administrador para Carreras"""
    list_display = ['id', 'nombre']
    search_fields = ['nombre']
    ordering = ['nombre']


@admin.register(Colegiado)
class ColegiadorAdmin(admin.ModelAdmin):
    """Administrador para Colegiados"""
    list_display = [
        'cip', 'nombre_completo', 'tipo_documento', 'numero_documento', 'tipo_colegiado', 'carrera', 'sede',
        'habilitado', 'cuenta_activa', 'fecha_colegiatura'
    ]
    list_filter = [
        'habilitado', 'cuenta_activa', 'carrera', 'sede',
        'fecha_colegiatura'
    ]
    search_fields = ['nombre_completo', 'numero_documento', 'cip', 'correo']
    readonly_fields = ['fecha_colegiatura']
    
    fieldsets = (
        ('Información Personal', {
            'fields': ('tipo_documento', 'numero_documento', 'nombre_completo', 'correo', 'celular')
        }),
        ('Información Profesional', {
            'fields': ('cip', 'tipo_colegiado', 'carrera', 'sede', 'fecha_colegiatura')
        }),
        ('Seguridad y Activación', {
            'fields': (
                'password_hash', 'cuenta_activa', 'token_activacion',
                'habilitado'
            )
        }),
    )
    ordering = ['-fecha_colegiatura']


@admin.register(Cuota)
class CuotaAdmin(admin.ModelAdmin):
    """Administrador para Cuotas"""
    list_display = [
        'id', 'colegiado', 'mes_cobro', 'anio_cobro',
        'monto', 'pagado', 'fecha_pago'
    ]
    list_filter = [
        'pagado', 'anio_cobro', 'mes_cobro', 'fecha_pago'
    ]
    search_fields = [
        'colegiado__nombre_completo', 'colegiado__cip',
        'colegiado__numero_documento', 'transaccion_id'
    ]
    readonly_fields = ['id']
    
    fieldsets = (
        ('Información de la Cuota', {
            'fields': ('id', 'colegiado', 'mes_cobro', 'anio_cobro', 'monto')
        }),
        ('Estado del Pago', {
            'fields': ('pagado', 'fecha_pago', 'transaccion_id')
        }),
    )
    ordering = ['-anio_cobro', '-mes_cobro']

@admin.register(Comprobante)
class ComprobanteAdmin(admin.ModelAdmin):
    list_display = ['numero_comprobante', 'colegiado', 'monto', 'fecha_hora_pago', 'estado', 'sunat_estado']
    list_filter = ['estado', 'canal', 'metodo_pago', 'sunat_estado', 'sunat_tipo_comprobante']
    search_fields = ['numero_comprobante', 'colegiado__nombre_completo', 'colegiado__cip']
    readonly_fields = ['fecha_hora_pago', 'sunat_hash', 'sunat_mensaje']
    fieldsets = (
        ('Información Básica', {
            'fields': ('numero_comprobante', 'colegiado', 'cuota', 'monto', 'fecha_hora_pago')
        }),
        ('Detalles de Pago', {
            'fields': ('canal', 'metodo_pago', 'estado', 'fecha_descarga', 'transaccion_id', 'observaciones')
        }),
        ('SUNAT (Facturación Electrónica)', {
            'fields': ('sunat_tipo_comprobante', 'sunat_serie', 'sunat_correlativo', 'sunat_estado', 'sunat_hash', 'sunat_mensaje')
        }),
    )
