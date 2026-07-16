-- ============================================================================
--  SISTEMA DE COLEGIATURA Y CONTROL DE HABILITACIÓN - CIP
--  Esquema PostgreSQL — alineado con modelos Django (back-cip/core/models.py)
-- ============================================================================


-- ============================================================================
-- 1. TABLAS CATÁLOGO / MAESTRAS
-- ============================================================================

CREATE TABLE carrera (
    id     SERIAL PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE sede (
    id     SERIAL PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE administrador (
    id            SERIAL PRIMARY KEY,
    usuario       VARCHAR(60)  NOT NULL UNIQUE,
    correo        VARCHAR(160) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nombres       VARCHAR(160) NOT NULL,
    activo        BOOLEAN NOT NULL DEFAULT true,
    creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE configuracion (
    id          BIGSERIAL PRIMARY KEY,
    clave       VARCHAR(50)  NOT NULL UNIQUE,
    valor       VARCHAR(200) NOT NULL,
    descripcion VARCHAR(200) NOT NULL DEFAULT ''
);


-- ============================================================================
-- 2. TABLAS OPERATIVAS
-- ============================================================================

CREATE TABLE solicitud (
    id              SERIAL PRIMARY KEY,
    dni             CHAR(8)      NOT NULL,
    nombres         VARCHAR(160) NOT NULL,
    correo          VARCHAR(160),                          -- opcional
    celular         VARCHAR(15),
    carrera_id      INTEGER NOT NULL REFERENCES carrera(id),
    sede_id         INTEGER NOT NULL REFERENCES sede(id),
    foto_url        VARCHAR(500) NOT NULL,
    titulo_pdf_url  VARCHAR(500) NOT NULL,
    recibo_pago_url VARCHAR(500) NOT NULL,
    estado          VARCHAR(20)  NOT NULL DEFAULT 'EN_REVISION',  -- EN_REVISION | APROBADA | RECHAZADA
    motivo_rechazo  TEXT,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    resuelto_en     TIMESTAMPTZ,
    resuelto_por    INTEGER REFERENCES administrador(id)
);

-- Solo UNA solicitud EN_REVISION por DNI a la vez
CREATE UNIQUE INDEX uq_solicitud_en_revision_por_dni
    ON solicitud (dni)
    WHERE estado = 'EN_REVISION';

CREATE INDEX idx_solicitud_dni ON solicitud (dni);


CREATE TABLE colegiado (
    id              SERIAL PRIMARY KEY,
    dni             CHAR(8)      NOT NULL UNIQUE,   -- clave de acceso al portal (sin contraseña)
    nombres         VARCHAR(160) NOT NULL,
    foto_url        VARCHAR(500) NOT NULL DEFAULT '',
    carrera_id      INTEGER NOT NULL REFERENCES carrera(id),
    nro_colegiado   CHAR(5)  NOT NULL,
    sede_id         INTEGER  REFERENCES sede(id),
    solicitud_id    INTEGER  REFERENCES solicitud(id) ON DELETE SET NULL,
    colegiado_desde DATE NOT NULL,
    activo          BOOLEAN NOT NULL DEFAULT true,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_sede_carrera_numero UNIQUE (sede_id, carrera_id, nro_colegiado)
);

CREATE INDEX idx_colegiado_dni    ON colegiado (dni);
CREATE INDEX idx_colegiado_codigo ON colegiado (sede_id, carrera_id, nro_colegiado);


-- ============================================================================
-- 3. TABLAS FINANCIERAS
-- ============================================================================

CREATE TABLE pago (
    id            SERIAL PRIMARY KEY,
    colegiado_id  INTEGER NOT NULL REFERENCES colegiado(id),
    tipo          VARCHAR(20) NOT NULL,          -- INCORPORACION | MENSUALIDAD
    periodo       DATE NOT NULL,
    monto         NUMERIC NOT NULL,
    canal         VARCHAR(30) NOT NULL,          -- CAJA | PORTAL | 
    metodo        VARCHAR(30),                   -- TARJETA | YAPE | PLIN | EFECTIVO | TRANSFERENCIA
    nro_operacion VARCHAR(40),
    fecha_pago    DATE NOT NULL,
    creado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_colegiado_periodo UNIQUE (colegiado_id, periodo)
);

CREATE INDEX idx_pago_colegiado ON pago (colegiado_id);
CREATE INDEX idx_pago_periodo   ON pago (colegiado_id, periodo);


CREATE TABLE pago_voucher_pendiente (
    id             BIGSERIAL PRIMARY KEY,
    colegiado_id   BIGINT NOT NULL REFERENCES colegiado(id),
    periodos_json  TEXT NOT NULL,
    monto          NUMERIC NOT NULL,
    metodo         VARCHAR(20) NOT NULL,         -- YAPE | PLIN | TRANSFERENCIA
    voucher        VARCHAR(500) NOT NULL,
    estado         VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',  -- PENDIENTE | APROBADO | RECHAZADO
    nro_referencia VARCHAR(40) NOT NULL DEFAULT '',
    observacion    TEXT,
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================================
-- 4. VISTAS: HABILITACIÓN COMO ESTADO DERIVADO
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

-- Deuda: periodos exigibles sin un pago de mensualidad.
CREATE VIEW v_deuda AS
SELECT e.colegiado_id, e.periodo
FROM v_periodos_exigibles e
LEFT JOIN pago p
    ON p.colegiado_id = e.colegiado_id
   AND p.periodo      = e.periodo
   AND p.tipo         = 'MENSUALIDAD'
WHERE p.id IS NULL;

-- Estado del colegiado: fuente del carnet.
CREATE VIEW v_estado_colegiado AS
SELECT
    c.id  AS colegiado_id,
    c.dni,
    c.nombres,
    c.nro_colegiado,
    s.nombre  AS sede,
    car.nombre AS carrera,
    COUNT(d.periodo)              AS meses_adeudados,
    COALESCE(COUNT(d.periodo) * 20.00, 0) AS deuda_total,
    (COUNT(d.periodo) = 0)        AS habilitado
FROM colegiado c
JOIN carrera car ON car.id = c.carrera_id
JOIN sede s      ON s.id   = c.sede_id
LEFT JOIN v_deuda d ON d.colegiado_id = c.id
WHERE c.activo = true
GROUP BY c.id, c.dni, c.nombres, c.nro_colegiado, s.nombre, car.nombre;
