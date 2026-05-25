"""
Migración correctiva: limpia el esquema de 'colegiado' para que coincida
con el modelo actual (sin password_hash, correo ni celular) y corrige
tipos incompatibles en 'pago' si la DB fue creada con el init.sql viejo.

Usa DROP COLUMN IF EXISTS / DO$$ para ser idempotente.
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_configuracion'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                -- ── 1. Eliminar columnas que ya no usa el modelo Colegiado ───────────
                ALTER TABLE colegiado
                    DROP COLUMN IF EXISTS password_hash,
                    DROP COLUMN IF EXISTS correo,
                    DROP COLUMN IF EXISTS celular;

                -- ── 2. Corregir pago.canal si es ENUM en vez de VARCHAR ────────────
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name  = 'pago'
                          AND column_name = 'canal'
                          AND udt_name   != 'varchar'
                    ) THEN
                        ALTER TABLE pago
                            ALTER COLUMN canal TYPE VARCHAR(30) USING canal::text;
                    END IF;
                END$$;

                -- ── 3. solicitud.correo → nullable ───────────────────────────────────
                ALTER TABLE solicitud
                    ALTER COLUMN correo DROP NOT NULL;
            """,
            reverse_sql="SELECT 1;",
        ),
    ]
