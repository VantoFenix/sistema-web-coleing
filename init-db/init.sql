-- ============================================================================
--  SISTEMA DE COLEGIATURA Y CONTROL DE HABILITACIÓN - CIP
--  Esquema PostgreSQL — versión final (respeta nombres del backend en uso)
-- ============================================================================

-- ============================================================================
-- 1. TIPOS (ENUMS)
-- ============================================================================
CREATE TYPE estado_solicitud AS ENUM ('EN_REVISION', 'APROBADA', 'RECHAZADA');
CREATE TYPE tipo_pago AS ENUM ('INCORPORACION', 'MENSUALIDAD');
-- NOTA: canal y estado del pago se guardan como VARCHAR en el backend Django
-- canal: CAJA | PORTAL | ARCHIVO_RECAUDACION
-- metodo: TARJETA | YAPE | PLIN | EFECTIVO | TRANSFERENCIA


-- ============================================================================
-- 2. TABLAS CATÁLOGO / MAESTRAS
-- ============================================================================
CREATE TABLE carrera (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE sede (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE administrador (
    id SERIAL PRIMARY KEY,
    usuario VARCHAR(60) NOT NULL UNIQUE,
    correo VARCHAR(160) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nombres VARCHAR(160) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE configuracion (
    id BIGSERIAL PRIMARY KEY,
    clave VARCHAR(50) NOT NULL UNIQUE,
    valor VARCHAR(200) NOT NULL,
    descripcion VARCHAR(200) NOT NULL
);


-- ============================================================================
-- 3. TABLAS OPERATIVAS
-- ============================================================================
CREATE TABLE solicitud (
    id SERIAL PRIMARY KEY,
    dni CHAR(8) NOT NULL,
    nombres VARCHAR(160) NOT NULL,
    correo VARCHAR(160),
    celular VARCHAR(15),
    carrera_id INTEGER NOT NULL REFERENCES carrera(id),
    sede_id INTEGER NOT NULL REFERENCES sede(id),
    foto_url VARCHAR(500) NOT NULL,
    titulo_pdf_url VARCHAR(500) NOT NULL,
    recibo_pago_url VARCHAR(500) NOT NULL,
    estado estado_solicitud NOT NULL DEFAULT 'EN_REVISION',
    motivo_rechazo TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    resuelto_en TIMESTAMPTZ,
    resuelto_por INTEGER REFERENCES administrador(id)
);

-- Solo UNA solicitud EN_REVISION por DNI a la vez (tras rechazo, el DNI queda libre)
CREATE UNIQUE INDEX uq_solicitud_en_revision_por_dni
    ON solicitud (dni)
    WHERE estado = 'EN_REVISION';

CREATE INDEX idx_solicitud_dni ON solicitud (dni);

CREATE TABLE colegiado (
    id SERIAL PRIMARY KEY,
    dni CHAR(8) NOT NULL UNIQUE,
    nombres VARCHAR(160) NOT NULL,
    correo VARCHAR(160),                    -- puede ser nulo
    celular VARCHAR(15),
    password_hash VARCHAR(255) NOT NULL DEFAULT '',  -- hash Django del DNI; se genera al aprobar solicitud
    foto_url VARCHAR(500) NOT NULL DEFAULT '',
    carrera_id INTEGER NOT NULL REFERENCES carrera(id),
    nro_colegiado CHAR(5) NOT NULL,
    sede_id INTEGER NOT NULL REFERENCES sede(id),
    solicitud_id INTEGER REFERENCES solicitud(id) ON DELETE SET NULL,
    colegiado_desde DATE NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- El número es único dentro de (sede, carrera)
    CONSTRAINT uq_sede_carrera_numero UNIQUE (sede_id, carrera_id, nro_colegiado)
);

CREATE INDEX idx_colegiado_dni ON colegiado (dni);
CREATE INDEX idx_colegiado_codigo ON colegiado (sede_id, carrera_id, nro_colegiado);


-- ============================================================================
-- 4. TABLAS FINANCIERAS Y DE REGISTRO
-- ============================================================================
CREATE TABLE pago (
    id SERIAL PRIMARY KEY,
    colegiado_id INTEGER NOT NULL REFERENCES colegiado(id),
    tipo tipo_pago NOT NULL,
    periodo DATE NOT NULL,
    monto NUMERIC NOT NULL,
    canal VARCHAR(30) NOT NULL,                       -- CAJA | PORTAL | ARCHIVO_RECAUDACION
    metodo VARCHAR(30),                               -- TARJETA | YAPE | PLIN | EFECTIVO | TRANSFERENCIA
    nro_operacion VARCHAR(40),                        -- nº de MercadoPago, o el transcrito por el admin
    fecha_pago DATE NOT NULL,
    carga_id INTEGER,
    registrado_por INTEGER REFERENCES administrador(id),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Un periodo no se paga dos veces para el mismo colegiado
    CONSTRAINT uq_colegiado_periodo UNIQUE (colegiado_id, periodo)
);

CREATE INDEX idx_pago_colegiado ON pago (colegiado_id);
CREATE INDEX idx_pago_periodo ON pago (colegiado_id, periodo);
CREATE INDEX idx_pago_estado ON pago (estado);

CREATE TABLE pago_voucher_pendiente (
    id BIGSERIAL PRIMARY KEY,
    colegiado_id BIGINT NOT NULL REFERENCES colegiado(id),
    periodos_json TEXT NOT NULL,
    monto NUMERIC NOT NULL,
    metodo VARCHAR(20) NOT NULL,
    voucher VARCHAR(100) NOT NULL,
    estado VARCHAR(20) NOT NULL,
    nro_referencia VARCHAR(40) NOT NULL,
    observacion TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comprobante (boleta interna) generado al confirmarse una mensualidad. Sin SUNAT.
CREATE TABLE comprobante (
    id SERIAL PRIMARY KEY,
    pago_id INTEGER NOT NULL UNIQUE REFERENCES pago(id),
    numero_comprobante VARCHAR(30) NOT NULL UNIQUE,   -- correlativo interno, p.ej. 'CIP-2026-000123'
    monto NUMERIC NOT NULL,
    emitido_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comprobante_pago ON comprobante (pago_id);

CREATE TABLE tarifa (
    id SERIAL PRIMARY KEY,
    tipo tipo_pago NOT NULL,
    monto NUMERIC NOT NULL,
    vigente_desde DATE NOT NULL,
    vigente_hasta DATE
);


-- ============================================================================
-- 5. HISTORIAL Y NOTIFICACIONES
-- ============================================================================
CREATE TABLE auditoria (
    id BIGSERIAL PRIMARY KEY,
    actor_tipo VARCHAR(20) NOT NULL,
    actor_id INTEGER,
    accion VARCHAR(80) NOT NULL,
    entidad VARCHAR(40),
    entidad_id INTEGER,
    detalle JSONB,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notificacion (
    id SERIAL PRIMARY KEY,
    destinatario VARCHAR(160) NOT NULL,
    tipo VARCHAR(40) NOT NULL,
    asunto VARCHAR(200),
    cuerpo TEXT,
    enviado BOOLEAN NOT NULL DEFAULT false,
    enviado_en TIMESTAMPTZ,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================================
-- 6. VISTAS: HABILITACIÓN COMO ESTADO DERIVADO
-- ============================================================================
-- Periodos exigibles: desde el mes siguiente a la colegiatura hasta el último mes cerrado.
CREATE VIEW v_periodos_exigibles AS
SELECT c.id AS colegiado_id, gs::date AS periodo
FROM colegiado c
CROSS JOIN LATERAL generate_series(
    date_trunc('month', c.colegiado_desde) + INTERVAL '1 month',
    date_trunc('month', CURRENT_DATE) - INTERVAL '1 month',
    INTERVAL '1 month'
) AS gs
WHERE c.activo = true;

-- Deuda: periodos exigibles sin un pago de mensualidad CONFIRMADO.
CREATE VIEW v_deuda AS
SELECT e.colegiado_id, e.periodo
FROM v_periodos_exigibles e
LEFT JOIN pago p
    ON p.colegiado_id = e.colegiado_id
   AND p.periodo = e.periodo
   AND p.tipo = 'MENSUALIDAD'
   AND p.estado = 'CONFIRMADO'
WHERE p.id IS NULL;

-- Estado del colegiado: fuente del carnet (marca de agua si meses_adeudados > 0).
CREATE VIEW v_estado_colegiado AS
SELECT
    c.id AS colegiado_id,
    c.dni,
    c.nombres,
    c.nro_colegiado,
    s.nombre AS sede,
    car.nombre AS carrera,
    COUNT(d.periodo) AS meses_adeudados,
    COALESCE(COUNT(d.periodo) * 20.00, 0) AS deuda_total,
    (COUNT(d.periodo) = 0) AS habilitado
FROM colegiado c
JOIN carrera car ON car.id = c.carrera_id
JOIN sede s ON s.id = c.sede_id
LEFT JOIN v_deuda d ON d.colegiado_id = c.id
WHERE c.activo = true
GROUP BY c.id, c.dni, c.nombres, c.nro_colegiado, s.nombre, car.nombre;