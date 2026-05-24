-- ============================================================================
--  SISTEMA DE COLEGIATURA Y CONTROL DE HABILITACIÓN - CIP
--  Modelo de Base de Datos · PostgreSQL   (v2 - ajustado tras entrevista)
-- ----------------------------------------------------------------------------
--  Convenciones:
--    [MVP]        -> se implementa para el Sprint Review
--    [POSTERIOR]  -> modelado desde ya para no rediseñar; no es parte del MVP
--
--  Decisiones de diseño clave:
--   1. El COLEGIADO NO tiene login: su portal se accede solo por DNI (info pública,
--      sin medidas de seguridad estrictas, según indicación del cliente para el MVP).
--      Solo el ADMINISTRADOR tiene login (aprueba colegiaturas; no puede ser público).
--   2. El código de colegiado es ÚNICO POR (REGIÓN/SEDE + CARRERA). El número solo
--      NO es identificador único. La sede es OBLIGATORIA y parte de la clave.
--   3. La HABILITACIÓN no es columna ni tabla: es un ESTADO DERIVADO calculado
--      comparando periodos debidos vs. pagados. Se expone como VISTA.
--   4. El PAGO se asocia a un PERIODO (mes/año), no a la fecha de pago. Un acto de
--      pago puede cubrir varios periodos (deuda acumulada / adelanto).
--   5. Mensualidades: DOS vías de registro (sin CSV).
--        a) El COLEGIADO paga por PASARELA SIMULADA ("Mago de Oz") desde su portal.
--        b) El ADMIN registra un pago presencial (Yape/Plin/efectivo/transferencia).
--      La inscripción (S/1500) se paga por VOUCHER subido, validado por el admin al aprobar.
--   6. La SOLICITUD es única y de un solo uso: estado terminal, sin reenvío.
--      Varias solicitudes por DNI a lo largo del tiempo; solo una EN_REVISION a la vez.
-- ============================================================================


-- ============================================================================
--  TIPOS ENUM
-- ============================================================================

-- [MVP] Estados de una solicitud de colegiatura
CREATE TYPE estado_solicitud AS ENUM ('EN_REVISION', 'APROBADA', 'RECHAZADA');

-- [MVP] Tipo de pago: incorporación (única, S/1500) o mensualidad (S/20)
CREATE TYPE tipo_pago AS ENUM ('INCORPORACION', 'MENSUALIDAD');

-- [MVP] Forma en que entró el pago:
--   VOUCHER            -> comprobante subido (exclusivo de la incorporación de S/1500)
--   PASARELA_SIMULADA  -> el colegiado paga su mensualidad en el portal (Mago de Oz)
--   REGISTRO_ADMIN     -> el admin registra un pago presencial de mensualidad
CREATE TYPE forma_pago AS ENUM ('VOUCHER', 'PASARELA_SIMULADA', 'REGISTRO_ADMIN');


-- ============================================================================
--  CATÁLOGOS
-- ============================================================================

-- [MVP] Carrera profesional. Parte de la clave del código de colegiado.
CREATE TABLE carrera (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(120) NOT NULL UNIQUE,   -- p.ej. 'Ingeniería de Sistemas'
    activo      BOOLEAN NOT NULL DEFAULT TRUE
);

-- [MVP] Sede / Consejo Departamental (Región). OBLIGATORIA: parte de la clave
-- del código de colegiado (único por región + carrera).
CREATE TABLE sede (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(120) NOT NULL UNIQUE,   -- p.ej. 'La Libertad'
    activo      BOOLEAN NOT NULL DEFAULT TRUE
);


-- ============================================================================
--  AUTENTICACIÓN — SOLO ADMINISTRADOR
-- ============================================================================

-- [MVP] Personal interno del CIP. Único rol con login.
-- El colegiado NO tiene login (acceso por DNI), por eso aquí solo está el admin.
CREATE TABLE administrador (
    id              SERIAL PRIMARY KEY,
    usuario         VARCHAR(60)  NOT NULL UNIQUE,   -- nombre de usuario para /admin
    correo          VARCHAR(160) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,          -- bcrypt / PBKDF2, NUNCA texto plano
    nombres         VARCHAR(160) NOT NULL,
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================================
--  SOLICITUDES DE COLEGIATURA (TRÁMITE)
-- ============================================================================

-- [MVP] Cada postulación es UNA solicitud. Única y de un solo uso.
-- Si se rechaza, NO se edita: el postulante crea otra solicitud nueva.
-- El historial existe naturalmente: cada intento es una fila independiente.
CREATE TABLE solicitud (
    id                  SERIAL PRIMARY KEY,
    dni                 CHAR(8)      NOT NULL,
    nombres             VARCHAR(160) NOT NULL,      -- autocompletado vía API identidad
    correo              VARCHAR(160) NOT NULL,
    celular             VARCHAR(15),
    carrera_id          INTEGER      NOT NULL REFERENCES carrera(id),
    sede_id             INTEGER      NOT NULL REFERENCES sede(id),  -- OBLIGATORIA (región)

    -- Documentos cargados (se guardan referencias/URLs al object storage, no el binario)
    foto_url            VARCHAR(500) NOT NULL,
    titulo_pdf_url      VARCHAR(500) NOT NULL,
    recibo_pago_url     VARCHAR(500) NOT NULL,      -- VOUCHER de los S/1500

    estado              estado_solicitud NOT NULL DEFAULT 'EN_REVISION',
    motivo_rechazo      TEXT,                       -- qué estuvo mal (si RECHAZADA)

    -- Origen del registro: público (web) o presencial (admin con aprobación directa)
    es_presencial       BOOLEAN NOT NULL DEFAULT FALSE,

    creado_en           TIMESTAMPTZ NOT NULL DEFAULT now(),
    resuelto_en         TIMESTAMPTZ,                -- cuándo se aprobó/rechazó
    resuelto_por        INTEGER REFERENCES administrador(id),

    -- Coherencia: si está rechazada, debe tener motivo
    CONSTRAINT chk_rechazo_motivo
        CHECK (estado <> 'RECHAZADA' OR motivo_rechazo IS NOT NULL)
);

-- [MVP] REGLA CLAVE: solo puede existir UNA solicitud EN_REVISION por DNI.
-- Tras rechazo/aprobación, el DNI queda libre para una nueva.
CREATE UNIQUE INDEX uq_solicitud_en_revision_por_dni
    ON solicitud (dni)
    WHERE estado = 'EN_REVISION';

CREATE INDEX idx_solicitud_dni      ON solicitud (dni);
CREATE INDEX idx_solicitud_estado   ON solicitud (estado);


-- ============================================================================
--  COLEGIADO
-- ============================================================================

-- [MVP] Nace SOLO al aprobar una solicitud. SIN login: se accede por DNI.
-- Identidad: DNI (único global). Código operativo: (sede, carrera, nro_colegiado).
CREATE TABLE colegiado (
    id              SERIAL PRIMARY KEY,

    -- Identidad y contacto (NO hay password: el portal se accede por DNI)
    dni             CHAR(8)      NOT NULL UNIQUE,    -- único a nivel global; clave de acceso al portal
    nombres         VARCHAR(160) NOT NULL,
    correo          VARCHAR(160) NOT NULL,
    celular         VARCHAR(15),
    foto_url        VARCHAR(500) NOT NULL,

    -- Código de colegiado: ÚNICO POR (SEDE + CARRERA)
    sede_id         INTEGER  NOT NULL REFERENCES sede(id),
    carrera_id      INTEGER  NOT NULL REFERENCES carrera(id),
    nro_colegiado   CHAR(5)  NOT NULL,              -- 5 dígitos, secuencial por sede+carrera

    -- Trazabilidad del origen
    solicitud_id    INTEGER  REFERENCES solicitud(id),
    colegiado_desde DATE     NOT NULL,              -- mes de colegiatura (gracia)

    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- UNICIDAD COMPUESTA: el número es único dentro de (sede, carrera)
    CONSTRAINT uq_sede_carrera_numero UNIQUE (sede_id, carrera_id, nro_colegiado)
);

CREATE INDEX idx_colegiado_dni     ON colegiado (dni);
CREATE INDEX idx_colegiado_codigo  ON colegiado (sede_id, carrera_id, nro_colegiado);


-- ============================================================================
--  PAGOS
-- ============================================================================

-- [MVP] El corazón financiero. Un PAGO cubre UN PERIODO (mes/año).
-- Mensualidad: PASARELA_SIMULADA (colegiado) o REGISTRO_ADMIN (admin presencial).
-- Incorporación: VOUCHER (al aprobar). Un acto de pago de varios meses = varias filas.
-- La habilitación se DERIVA de estas filas; no hay flag de habilitado.
CREATE TABLE pago (
    id              SERIAL PRIMARY KEY,
    colegiado_id    INTEGER  NOT NULL REFERENCES colegiado(id),

    tipo            tipo_pago  NOT NULL,            -- INCORPORACION | MENSUALIDAD
    forma           forma_pago NOT NULL,            -- VOUCHER | PASARELA_SIMULADA | REGISTRO_ADMIN
    periodo         DATE       NOT NULL,            -- normalizado al día 1 del mes (AAAA-MM-01)
    monto           NUMERIC(8,2) NOT NULL,          -- 1500.00 incorporación, 20.00 mensualidad

    -- Pasarela simulada: código de transacción generado (patrón Mago de Oz)
    cod_transaccion VARCHAR(40),                    -- NULL si no fue pasarela
    -- Voucher (incorporación): referencia al comprobante subido
    voucher_url     VARCHAR(500),                   -- NULL si no fue voucher
    -- Registro presencial por admin: método informativo y quién lo registró
    metodo          VARCHAR(30),                    -- yape/plin/efectivo/transferencia (solo REGISTRO_ADMIN)
    registrado_por  INTEGER REFERENCES administrador(id),  -- NULL si pagó el colegiado por pasarela

    fecha_pago      DATE NOT NULL DEFAULT CURRENT_DATE,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Un periodo no puede pagarse dos veces para el mismo colegiado
    CONSTRAINT uq_colegiado_periodo UNIQUE (colegiado_id, periodo)
);

CREATE INDEX idx_pago_colegiado ON pago (colegiado_id);
CREATE INDEX idx_pago_periodo   ON pago (colegiado_id, periodo);


-- ============================================================================
--  AUDITORÍA
-- ============================================================================

-- [MVP] Rastro de acciones (aprobaciones, pagos, etc.).
CREATE TABLE auditoria (
    id              BIGSERIAL PRIMARY KEY,
    actor_tipo      VARCHAR(20) NOT NULL,          -- 'ADMIN' | 'COLEGIADO' | 'SISTEMA'
    actor_id        INTEGER,                       -- id en su tabla respectiva (puede ser NULL)
    accion          VARCHAR(80) NOT NULL,          -- p.ej. 'APROBAR_SOLICITUD', 'PAGAR_MENSUALIDAD'
    entidad         VARCHAR(40),
    entidad_id      INTEGER,
    detalle         JSONB,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_auditoria_actor   ON auditoria (actor_tipo, actor_id);
CREATE INDEX idx_auditoria_entidad ON auditoria (entidad, entidad_id);


-- ============================================================================
--  [POSTERIOR] Tablas modeladas desde ya para no rediseñar (NO son MVP)
-- ============================================================================

-- [POSTERIOR] Registro de correos/notificaciones (aviso de aprobación, rechazo, etc.)
CREATE TABLE notificacion (
    id              SERIAL PRIMARY KEY,
    destinatario    VARCHAR(160) NOT NULL,
    tipo            VARCHAR(40)  NOT NULL,
    asunto          VARCHAR(200),
    cuerpo          TEXT,
    enviado         BOOLEAN NOT NULL DEFAULT FALSE,
    enviado_en      TIMESTAMPTZ,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- [POSTERIOR] Configuración de cuotas por si la tarifa cambia con el tiempo.
CREATE TABLE tarifa (
    id              SERIAL PRIMARY KEY,
    tipo            tipo_pago NOT NULL,
    monto           NUMERIC(8,2) NOT NULL,
    vigente_desde   DATE NOT NULL,
    vigente_hasta   DATE
);


-- ============================================================================
--  HABILITACIÓN COMO ESTADO DERIVADO (no es columna: se calcula)
-- ============================================================================

-- [MVP] Periodos que el colegiado DEBERÍA tener pagados:
-- desde el mes siguiente a su colegiatura hasta el último mes cerrado.
CREATE VIEW v_periodos_exigibles AS
SELECT
    c.id AS colegiado_id,
    gs::date AS periodo
FROM colegiado c
CROSS JOIN LATERAL generate_series(
    date_trunc('month', c.colegiado_desde) + INTERVAL '1 month',
    date_trunc('month', CURRENT_DATE) - INTERVAL '1 month',
    INTERVAL '1 month'
) AS gs
WHERE c.activo = TRUE;

-- [MVP] Periodos exigibles que NO están pagados = la deuda.
CREATE VIEW v_deuda AS
SELECT
    e.colegiado_id,
    e.periodo
FROM v_periodos_exigibles e
LEFT JOIN pago p
    ON p.colegiado_id = e.colegiado_id
   AND p.periodo = e.periodo
   AND p.tipo = 'MENSUALIDAD'
WHERE p.id IS NULL;

-- [MVP] Estado de habilitación resumido por colegiado.
-- ESTA es la fuente del carnet: si meses_adeudados > 0 -> marca de agua INHABILITADO.
CREATE VIEW v_estado_colegiado AS
SELECT
    c.id              AS colegiado_id,
    c.dni,
    c.nombres,
    c.nro_colegiado,
    s.nombre          AS sede,
    car.nombre        AS carrera,
    COUNT(d.periodo)  AS meses_adeudados,
    COALESCE(COUNT(d.periodo) * 20.00, 0) AS deuda_total,
    (COUNT(d.periodo) = 0) AS habilitado
FROM colegiado c
JOIN carrera car ON car.id = c.carrera_id
JOIN sede s      ON s.id  = c.sede_id
LEFT JOIN v_deuda d ON d.colegiado_id = c.id
WHERE c.activo = TRUE
GROUP BY c.id, c.dni, c.nombres, c.nro_colegiado, s.nombre, car.nombre;