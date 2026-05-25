from django.db import models

class Carrera(models.Model):
    nombre = models.CharField(max_length=120, unique=True)
    activo = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = 'carrera'

    def __str__(self):
        return self.nombre

class Sede(models.Model):
    nombre = models.CharField(max_length=120, unique=True)
    activo = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = 'sede'

    def __str__(self):
        return self.nombre

class Administrador(models.Model):
    usuario = models.CharField(max_length=60, unique=True)
    correo = models.EmailField(max_length=160, unique=True)
    password_hash = models.CharField(max_length=255)
    nombres = models.CharField(max_length=160)
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'administrador'

class Solicitud(models.Model):
    ESTADOS = [
        ('EN_REVISION', 'EN_REVISION'),
        ('APROBADA', 'APROBADA'),
        ('RECHAZADA', 'RECHAZADA'),
    ]
    dni = models.CharField(max_length=8)
    nombres = models.CharField(max_length=160)
    correo = models.EmailField(max_length=160)
    celular = models.CharField(max_length=15, null=True, blank=True)
    carrera = models.ForeignKey(Carrera, on_delete=models.DO_NOTHING)
    sede = models.ForeignKey(Sede, on_delete=models.DO_NOTHING, null=True, blank=True)
    
    foto_url = models.CharField(max_length=500)
    titulo_pdf_url = models.CharField(max_length=500)
    recibo_pago_url = models.CharField(max_length=500)
    firma_url = models.CharField(max_length=500)
    
    estado = models.CharField(max_length=20, choices=ESTADOS, default='EN_REVISION')
    motivo_rechazo = models.TextField(null=True, blank=True)
    
    creado_en = models.DateTimeField(auto_now_add=True)
    resuelto_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'solicitud'

class Colegiado(models.Model):
    correo = models.EmailField(max_length=160, unique=True)
    password_hash = models.CharField(max_length=255)
    dni = models.CharField(max_length=8, unique=True)
    nombres = models.CharField(max_length=160)
    celular = models.CharField(max_length=15, null=True, blank=True)
    foto_url = models.CharField(max_length=500)
    
    carrera = models.ForeignKey(Carrera, on_delete=models.DO_NOTHING)
    nro_colegiado = models.CharField(max_length=5)
    sede = models.ForeignKey(Sede, on_delete=models.DO_NOTHING, null=True, blank=True)
    
    solicitud = models.ForeignKey(Solicitud, on_delete=models.DO_NOTHING, null=True, blank=True)
    colegiado_desde = models.DateField()
    
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'colegiado'
        # CIP único por carrera + sede (cada combinación tiene su propia serie 00001, 00002…)
        unique_together = ('carrera', 'sede', 'nro_colegiado')

class CargaRecaudacion(models.Model):
    nombre_archivo = models.CharField(max_length=255)
    procesado_por = models.ForeignKey(Administrador, on_delete=models.DO_NOTHING)
    procesado_en = models.DateTimeField(auto_now_add=True)
    total_filas = models.IntegerField(default=0)
    filas_ok = models.IntegerField(default=0)
    filas_error = models.IntegerField(default=0)

    class Meta:
        managed = False
        db_table = 'carga_recaudacion'

class Pago(models.Model):
    TIPO_PAGO = [
        ('INCORPORACION', 'INCORPORACION'),
        ('MENSUALIDAD', 'MENSUALIDAD'),
    ]
    CANAL = [
        ('CAJA', 'CAJA'),
        ('ARCHIVO_RECAUDACION', 'ARCHIVO_RECAUDACION'),
    ]
    colegiado = models.ForeignKey(Colegiado, on_delete=models.DO_NOTHING)
    tipo = models.CharField(max_length=20, choices=TIPO_PAGO)
    periodo = models.DateField()
    monto = models.DecimalField(max_digits=8, decimal_places=2)
    canal = models.CharField(max_length=30, choices=CANAL)
    metodo = models.CharField(max_length=30, null=True, blank=True)
    nro_operacion = models.CharField(max_length=40, null=True, blank=True)
    fecha_pago = models.DateField()
    carga = models.ForeignKey(CargaRecaudacion, on_delete=models.DO_NOTHING, null=True, blank=True, db_column='carga_id')
    registrado_por = models.ForeignKey(Administrador, on_delete=models.DO_NOTHING, null=True, blank=True, db_column='registrado_por')
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'pago'
        unique_together = ('colegiado', 'periodo')
