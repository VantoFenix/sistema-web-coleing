from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_administrador_cuenta_confirmada'),
    ]

    operations = [
        migrations.RenameField(
            model_name='administrador',
            old_name='creado_en',
            new_name='fecha_creacion',
        ),
        migrations.AlterField(
            model_name='administrador',
            name='fecha_creacion',
            field=models.DateTimeField(auto_now_add=True),
        ),
    ]
