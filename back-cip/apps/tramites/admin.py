from django.contrib import admin
from .models import TramiteInscripcion, EstadoTramiteChoices, PagoBancoNacionMock


@admin.register(TramiteInscripcion)
class TramiteInscripcionAdmin(admin.ModelAdmin):
    """Administrador para Trámites de Inscripción"""
    
    list_display = [
        'id', 'nombre_completo', 'dni', 'carrera', 'sede',
        'numero_operacion', 'banco', 'estado', 'fecha_solicitud'
    ]
    
    list_filter = [
        'estado', 'carrera', 'sede', 'fecha_solicitud'
    ]
    
    search_fields = [
        'nombre_completo', 'dni', 'correo', 'carrera__nombre', 'sede__nombre', 'numero_operacion'
    ]
    
    readonly_fields = [
        'fecha_solicitud', 'fecha_actualizacion', 'foto_preview', 'titulo_preview'
    ]
    
    fieldsets = (
        ('Información Personal', {
            'fields': ('dni', 'nombre_completo', 'correo', 'celular')
        }),
        ('Información Académica', {
            'fields': ('carrera', 'sede')
        }),
        ('Información de Pago', {
            'fields': ('numero_operacion', 'banco', 'fecha_pago', 'voucher', 'voucher_url')
        }),
        ('Documentos Adicionales', {
            'fields': (
                'foto', 'foto_preview', 'foto_url',
                'titulo_pdf', 'titulo_preview', 'titulo_pdf_url'
            )
        }),
        ('Estado del Trámite', {
            'fields': ('estado', 'observacion')
        }),
        ('Auditoría', {
            'fields': ('fecha_solicitud', 'fecha_actualizacion'),
            'classes': ('collapse',)
        }),
    )
    
    actions = [
        'marcar_pendiente',
        'marcar_aprobado',
        'marcar_rechazado'
    ]
    
    ordering = ['-fecha_solicitud']

    def foto_preview(self, obj):
        """Muestra una vista previa de la foto"""
        if obj.foto:
            return f'<img src="{obj.foto.url}" width="100" height="100" />'
        return 'Sin foto'
    foto_preview.allow_tags = True
    foto_preview.short_description = 'Vista previa de foto'

    def titulo_preview(self, obj):
        """Muestra un enlace al PDF del título"""
        if obj.titulo_pdf:
            return f'<a href="{obj.titulo_pdf.url}" target="_blank">Ver PDF</a>'
        return 'Sin archivo'
    titulo_preview.allow_tags = True
    titulo_preview.short_description = 'Título PDF'

    @admin.action(description='Marcar como PENDIENTE')
    def marcar_pendiente(self, request, queryset):
        updated = queryset.update(estado=EstadoTramiteChoices.PENDIENTE, observacion=None)
        self.message_user(request, f'{updated} trámite(s) marcado(s) como PENDIENTE.')

    @admin.action(description='Marcar como APROBADO')
    def marcar_aprobado(self, request, queryset):
        updated = queryset.update(estado=EstadoTramiteChoices.APROBADO, observacion=None)
        self.message_user(request, f'{updated} trámite(s) marcado(s) como APROBADO.')

    @admin.action(description='Marcar como RECHAZADO (requiere observación)')
    def marcar_rechazado(self, request, queryset):
        # Esta acción es demostrativa; en producción, se requeriría un formulario
        updated = queryset.update(
            estado=EstadoTramiteChoices.RECHAZADO,
            observacion='Rechazado desde el admin'
        )
        self.message_user(request, f'{updated} trámite(s) marcado(s) como RECHAZADO.')

@admin.register(PagoBancoNacionMock)
class PagoBancoNacionMockAdmin(admin.ModelAdmin):
    """Administrador para los pagos simulados del Banco de la Nación"""
    list_display = ('numero_operacion', 'fecha_pago', 'monto', 'usado')
    search_fields = ('numero_operacion',)
    list_filter = ('usado', 'fecha_pago')
    ordering = ('-fecha_pago',)
