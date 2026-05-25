"""
Migración correctiva: alinea el esquema de la BD con los modelos Django actuales.
Elimina columnas/tablas obsoletas y convierte ENUMs a VARCHAR.
Idempotente — segura de ejecutar varias veces.
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_configuracion'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                -- ── 1. colegiado: quitar columnas que ya no usa el modelo ─────────
                ALTER TABLE colegiado
                    DROP COLUMN IF EXISTS password_hash,
                    DROP COLUMN IF EXISTS correo,
                    DROP COLUMN IF EXISTS celular;

                -- ── 2. solicitud: quitar firma_url ────────────────────────────────
                ALTER TABLE solicitud
                    DROP COLUMN IF EXISTS firma_url;

                -- ── 3. solicitud.correo → nullable ────────────────────────────────
                ALTER TABLE solicitud
                    ALTER COLUMN correo DROP NOT NULL;

                -- ── 4. solicitud.estado: ENUM → VARCHAR si aplica ─────────────────
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name  = 'solicitud'
                          AND column_name = 'estado'
                          AND udt_name   != 'varchar'
                    ) THEN
                        ALTER TABLE solicitud
                            ALTER COLUMN estado TYPE VARCHAR(20) USING estado::text;
                    END IF;
                END$$;

                -- ── 5. pago: quitar columnas obsoletas ────────────────────────────
                ALTER TABLE pago
                    DROP COLUMN IF EXISTS carga_id,
                    DROP COLUMN IF EXISTS registrado_por,
                    DROP COLUMN IF EXISTS estado;

                -- ── 6. pago.canal: ENUM → VARCHAR si aplica ───────────────────────
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

                -- ── 7. pago.tipo: ENUM → VARCHAR si aplica ────────────────────────
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name  = 'pago'
                          AND column_name = 'tipo'
                          AND udt_name   != 'varchar'
                    ) THEN
                        ALTER TABLE pago
                            ALTER COLUMN tipo TYPE VARCHAR(20) USING tipo::text;
                    END IF;
                END$$;

                -- ── 8. Quitar tabla carga_recaudacion si existe ───────────────────
                DROP TABLE IF EXISTS carga_recaudacion;

                -- ── 9. Quitar ENUMs obsoletos si existen ─────────────────────────
                DROP TYPE IF EXISTS forma_pago;
                DROP TYPE IF EXISTS estado_pago;
                DROP TYPE IF EXISTS estado_solicitud;
                DROP TYPE IF EXISTS tipo_pago;
            """,
            reverse_sql="SELECT 1;",
        ),
    ]
