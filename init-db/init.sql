

-- ============================================================================
--  SISTEMA DE COLEGIATURA Y CONTROL DE HABILITACIÓN - CIP
--  Modelo de Base de Datos · PostgreSQL
-- ----------------------------------------------------------------------------
--  Convenciones:
--    [MVP]        -> se implementa para el Sprint Review
--    [POSTERIOR]  -> modelado desde ya para no rediseñar; no es parte del MVP
--
--  Decisiones de diseño clave:
--   1. ADMINISTRADOR y COLEGIADO son tablas SEPARADAS (no comparten atributos
--      ni ciclo de vida; cada una tiene su propio login). No hay tabla rol_usuario:
--      los roles son dos y excluyentes, una relación M:N sería sobreingeniería.
--   2. El número de colegiado es ÚNICO POR CARRERA (clave compuesta carrera+numero),
--      no global ni por sede. El número solo NO es identificador único.
--   3. La SEDE (Consejo Departamental) es solo información adicional: no condiciona
--      unicidad ni lógica. Es nullable y catálogo para evitar texto inconsistente.
--   4. La HABILITACIÓN no es columna ni tabla: es un ESTADO DERIVADO calculado
--      comparando periodos debidos vs. pagados. Se expone como VISTA/función.
--   5. El PAGO se asocia a un PERIODO (mes/año), no a la fecha de pago. Un acto de
--      pago puede cubrir varios periodos (caso acumulado / adelantado).
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

-- [MVP] Canal por el que se registró el pago
CREATE TYPE canal_pago AS ENUM ('CAJA', 'ARCHIVO_RECAUDACION');


-- ============================================================================
--  CATÁLOGOS
-- ============================================================================

-- [MVP] Carrera profesional. Base de la unicidad del número de colegiado.
CREATE TABLE carrera (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(120) NOT NULL UNIQUE,   -- p.ej. 'Ingeniería de Sistemas'
    activo      BOOLEAN NOT NULL DEFAULT TRUE
);

-- [MVP, uso limitado] Sede / Consejo Departamental. SOLO información adicional.
-- No participa en ninguna restricción de unicidad ni en lógica de negocio.
CREATE TABLE sede (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(120) NOT NULL UNIQUE,   -- p.ej. 'La Libertad'
    activo      BOOLEAN NOT NULL DEFAULT TRUE
);


-- ============================================================================
--  AUTENTICACIÓN (TABLAS SEPARADAS)
-- ============================================================================

-- [MVP] Personal interno del CIP. Login propio e independiente.
-- No tiene relación con colegiado: es otro mundo.
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
    sede_id             INTEGER      REFERENCES sede(id),   -- opcional, info adicional

    -- Documentos cargados (se guardan referencias/URLs al object storage, no el binario)
    foto_url            VARCHAR(500) NOT NULL,
    titulo_pdf_url      VARCHAR(500) NOT NULL,
    recibo_pago_url     VARCHAR(500) NOT NULL,      -- comprobante de los S/1500

    estado              estado_solicitud NOT NULL DEFAULT 'EN_REVISION',
    motivo_rechazo      TEXT,                       -- qué estuvo mal (si RECHAZADA)

    creado_en           TIMESTAMPTZ NOT NULL DEFAULT now(),
    resuelto_en         TIMESTAMPTZ,                -- cuándo se aprobó/rechazó
    resuelto_por        INTEGER REFERENCES administrador(id),

    -- Coherencia: si está resuelta, debe tener fecha de resolución
    CONSTRAINT chk_rechazo_motivo
        CHECK (estado <> 'RECHAZADA' OR motivo_rechazo IS NOT NULL)
);

-- [MVP] REGLA CLAVE: solo puede existir UNA solicitud EN_REVISION por DNI.
-- Tras rechazo/aprobación, el DNI queda libre para una nueva.
-- Índice único parcial: elegante forma PostgreSQL de imponer esto.
CREATE UNIQUE INDEX uq_solicitud_en_revision_por_dni
    ON solicitud (dni)
    WHERE estado = 'EN_REVISION';

CREATE INDEX idx_solicitud_dni      ON solicitud (dni);
CREATE INDEX idx_solicitud_estado   ON solicitud (estado);


-- ============================================================================
--  COLEGIADO
-- ============================================================================

-- [MVP] Nace SOLO al aprobar una solicitud. Tiene su propio login.
-- Identidad: DNI (único global). Código operativo: (carrera, nro_colegiado).
CREATE TABLE colegiado (
    id              SERIAL PRIMARY KEY,

    -- Login propio (tabla separada del admin, como se decidió)
    correo          VARCHAR(160) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,          -- generada por el sistema, hasheada

    -- Identidad
    dni             CHAR(8)      NOT NULL UNIQUE,    -- único a nivel global
    nombres         VARCHAR(160) NOT NULL,
    celular         VARCHAR(15),
    foto_url        VARCHAR(500) NOT NULL,

    -- Código de colegiado: ÚNICO POR CARRERA (no global)
    carrera_id      INTEGER  NOT NULL REFERENCES carrera(id),
    nro_colegiado   CHAR(5)  NOT NULL,              -- 5 dígitos, secuencial por carrera
    sede_id         INTEGER  REFERENCES sede(id),   -- info adicional, opcional

    -- Trazabilidad del origen
    solicitud_id    INTEGER  REFERENCES solicitud(id),
    colegiado_desde DATE     NOT NULL,              -- mes de colegiatura (gracia)

    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- UNICIDAD COMPUESTA: el número se repite entre carreras, NO dentro de una
    CONSTRAINT uq_carrera_numero UNIQUE (carrera_id, nro_colegiado)
);

CREATE INDEX idx_colegiado_dni      ON colegiado (dni);
CREATE INDEX idx_colegiado_carrera  ON colegiado (carrera_id, nro_colegiado);


-- ============================================================================
--  PAGOS Y RECAUDACIÓN
-- ============================================================================

-- [MVP] Cabecera de cada archivo de recaudación procesado (trazabilidad del lote).
-- Permite saber qué archivo trajo qué pagos y cuándo se procesó.
CREATE TABLE carga_recaudacion (
    id                  SERIAL PRIMARY KEY,
    nombre_archivo      VARCHAR(255) NOT NULL,
    procesado_por       INTEGER NOT NULL REFERENCES administrador(id),
    procesado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
    total_filas         INTEGER NOT NULL DEFAULT 0,
    filas_ok            INTEGER NOT NULL DEFAULT 0,
    filas_error         INTEGER NOT NULL DEFAULT 0
);

-- [MVP] El corazón financiero. Un PAGO cubre UN PERIODO (mes/año).
-- Un acto de pago de varios meses = varias filas (acumulado o adelantado).
-- La habilitación se DERIVA de estas filas; no hay flag de habilitado.
CREATE TABLE pago (
    id              SERIAL PRIMARY KEY,
    colegiado_id    INTEGER  NOT NULL REFERENCES colegiado(id),

    tipo            tipo_pago NOT NULL,            -- INCORPORACION | MENSUALIDAD
    periodo         DATE      NOT NULL,            -- normalizado al día 1 del mes (AAAA-MM-01)
    monto           NUMERIC(8,2) NOT NULL,         -- 1500.00 incorporación, 20.00 mensualidad

    canal           canal_pago NOT NULL,           -- CAJA | ARCHIVO_RECAUDACION
    metodo          VARCHAR(30),                   -- yape/plin/transferencia/tarjeta (informativo)
    nro_operacion   VARCHAR(40),                   -- referencia del comprobante externo
    fecha_pago      DATE NOT NULL,                 -- cuándo se pagó (auditoría; no define el periodo)

    -- Si vino por archivo, de qué carga (NULL si fue registro en caja)
    carga_id        INTEGER REFERENCES carga_recaudacion(id),

    registrado_por  INTEGER REFERENCES administrador(id),  -- quién lo registró
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Un periodo no puede pagarse dos veces para el mismo colegiado
    CONSTRAINT uq_colegiado_periodo UNIQUE (colegiado_id, periodo)
);

CREATE INDEX idx_pago_colegiado ON pago (colegiado_id);
CREATE INDEX idx_pago_periodo   ON pago (colegiado_id, periodo);


-- ============================================================================
--  AUDITORÍA
-- ============================================================================

-- [MVP] Rastro de acciones sensibles (aprobaciones, registros de pago, logins).
CREATE TABLE auditoria (
    id              BIGSERIAL PRIMARY KEY,
    actor_tipo      VARCHAR(20) NOT NULL,          -- 'ADMIN' | 'COLEGIADO' | 'SISTEMA'
    actor_id        INTEGER,                       -- id en su tabla respectiva (puede ser NULL)
    accion          VARCHAR(80) NOT NULL,          -- p.ej. 'APROBAR_SOLICITUD', 'REGISTRAR_PAGO'
    entidad         VARCHAR(40),                   -- tabla/entidad afectada
    entidad_id      INTEGER,
    detalle         JSONB,                         -- payload flexible del evento
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_auditoria_actor   ON auditoria (actor_tipo, actor_id);
CREATE INDEX idx_auditoria_entidad ON auditoria (entidad, entidad_id);


-- ============================================================================
--  [POSTERIOR] Tablas modeladas desde ya para no rediseñar (NO son MVP)
-- ============================================================================

-- [POSTERIOR] Registro de correos/notificaciones enviados (contraseña, rechazo, etc.)
CREATE TABLE notificacion (
    id              SERIAL PRIMARY KEY,
    destinatario    VARCHAR(160) NOT NULL,
    tipo            VARCHAR(40)  NOT NULL,         -- 'CREDENCIALES', 'RECHAZO', etc.
    asunto          VARCHAR(200),
    cuerpo          TEXT,
    enviado         BOOLEAN NOT NULL DEFAULT FALSE,
    enviado_en      TIMESTAMPTZ,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- [POSTERIOR] Configuración de cuotas, por si la tarifa cambia en el tiempo.
-- Evita hardcodear 1500/20 y permite vigencias. Para MVP puedes usar constantes.
CREATE TABLE tarifa (
    id              SERIAL PRIMARY KEY,
    tipo            tipo_pago NOT NULL,
    monto           NUMERIC(8,2) NOT NULL,
    vigente_desde   DATE NOT NULL,
    vigente_hasta   DATE                            -- NULL = vigente actualmente
);


-- ============================================================================
--  HABILITACIÓN COMO ESTADO DERIVADO (no es columna: se calcula)
-- ============================================================================

-- [MVP] Vista que genera, por colegiado, todos los periodos que DEBERÍA tener
-- pagados (desde el mes siguiente a su colegiatura hasta el último mes cerrado).
-- generate_series produce un periodo por mes.
CREATE VIEW v_periodos_exigibles AS
SELECT
    c.id AS colegiado_id,
    gs::date AS periodo
FROM colegiado c
CROSS JOIN LATERAL generate_series(
    date_trunc('month', c.colegiado_desde) + INTERVAL '1 month',  -- mes siguiente a colegiatura
    date_trunc('month', CURRENT_DATE) - INTERVAL '1 month',       -- último mes cerrado
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
    car.nombre        AS carrera,
    COUNT(d.periodo)  AS meses_adeudados,
    COALESCE(COUNT(d.periodo) * 20.00, 0) AS deuda_total,
    (COUNT(d.periodo) = 0) AS habilitado
FROM colegiado c
JOIN carrera car ON car.id = c.carrera_id
LEFT JOIN v_deuda d ON d.colegiado_id = c.id
WHERE c.activo = TRUE
GROUP BY c.id, c.dni, c.nombres, c.nro_colegiado, car.nombre;


-- ==============================================================================
-- 3. TRIGGERS (Automatización)
-- ==============================================================================
-- Trigger para registrar automáticamente la fecha de resolución en solicitudes
CREATE OR REPLACE FUNCTION actualizar_fecha_resolucion()
RETURNS TRIGGER AS $$
BEGIN
   IF NEW.estado <> 'EN_REVISION' AND OLD.estado = 'EN_REVISION' THEN
       NEW.resuelto_en = CURRENT_TIMESTAMP;
   END IF;
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_solicitud_resolucion
BEFORE UPDATE ON solicitud
FOR EACH ROW
EXECUTE FUNCTION actualizar_fecha_resolucion();


-- ==============================================================================
-- 4. DATA SEEDING: CATÁLOGOS (SEDES Y CARRERAS)
-- ==============================================================================

-- Catálogo de Sedes (Consejos Departamentales completos del CIP)
INSERT INTO sede (nombre) VALUES 
('Consejo Departamental Amazonas'), 
('Consejo Departamental Áncash - Chimbote'),
('Consejo Departamental Áncash - Huaraz'),
('Consejo Departamental Apurímac'),
('Consejo Departamental Arequipa'), 
('Consejo Departamental Ayacucho'),
('Consejo Departamental Cajamarca'), 
('Consejo Departamental Callao'),
('Consejo Departamental Cusco'), 
('Consejo Departamental Huancavelica'),
('Consejo Departamental Huánuco'),
('Consejo Departamental Ica'),
('Consejo Departamental Junín'), 
('Consejo Departamental La Libertad'), 
('Consejo Departamental Lambayeque'), 
('Consejo Departamental Lima'),
('Consejo Departamental Loreto'),
('Consejo Departamental Madre de Dios'),
('Consejo Departamental Moquegua'),
('Consejo Departamental Pasco'),
('Consejo Departamental Piura'),
('Consejo Departamental Puno'),
('Consejo Departamental San Martín - Moyobamba'),
('Consejo Departamental San Martín - Tarapoto'),
('Consejo Departamental Tacna'),
('Consejo Departamental Tumbes'),
('Consejo Departamental Ucayali');

-- Catálogo de Carreras (Base de la unicidad del número de colegiado)
INSERT INTO carrera (nombre) VALUES 
('Ingeniería Civil'),                         -- ID 1
('Ingeniería Industrial'),                    -- ID 2
('Ingeniería de Sistemas e Inteligencia Artificial'), -- ID 3
('Ingeniería de Software'),                   -- ID 4
('Ingeniería Agrónoma'),                      -- ID 5
('Ingeniería Ambiental'),                     -- ID 6
('Ingeniería Mecánica'),                      -- ID 7
('Ingeniería Electrónica'),                   -- ID 8
('Ingeniería Mecatrónica'),                   -- ID 9
('Ingeniería de Minas'),                      -- ID 10
('Ingeniería Química'),                       -- ID 11
('Ingeniería Geológica');                     -- ID 12


-- ==============================================================================
-- 5. DATA SEEDING: ADMINISTRADOR, TRÁMITES Y PADRÓN
-- ==============================================================================

-- Administrador de prueba
INSERT INTO administrador
(usuario, correo, password_hash, nombres)
VALUES
('admin', 'admin@cip.org.pe', 'pbkdf2_sha256$260000$hashdeprueba$', 'Administrador Principal');

-- Trámite pendiente de prueba (Postulante a Ingeniería Civil - Lima)
INSERT INTO solicitud 
(dni, nombres, correo, celular, carrera_id, sede_id, foto_url, titulo_pdf_url, recibo_pago_url, estado) 
VALUES 
('73333333', 'Carlos Mendoza', 'carlos@email.com', '987654321', 1, 16, 'https://dummyimage.com/foto.jpg', 'https://dummyimage.com/titulo.pdf', 'https://dummyimage.com/voucher.jpg', 'EN_REVISION');


-- A. Ingeniero de La Libertad (Totalmente al día, HABILITADO)
-- Aplica a Ingeniería de Sistemas e IA (ID 3)
INSERT INTO colegiado 
(correo, password_hash, dni, nombres, celular, foto_url, carrera_id, nro_colegiado, sede_id, colegiado_desde, activo) 
VALUES 
('bruno@email.com', 'pbkdf2_sha256$260000$hashdeprueba$', '70000000', 'BRUNO MARTIN VELASQUEZ GONGORA', '999888777', 'https://dummyimage.com/bruno.jpg', 3, '12345', 14, '2025-01-01', true);

-- Su pago registrado de mensualidad
INSERT INTO pago (colegiado_id, tipo, periodo, monto, canal, metodo, fecha_pago, registrado_por) 
VALUES ((SELECT id FROM colegiado WHERE dni = '70000000'), 'MENSUALIDAD', '2026-05-01', 20.00, 'CAJA', 'Transferencia', '2026-05-15', 1); 


-- B. Ingeniera de Lima (Con deuda, INHABILITADO)
-- Aplica a Ingeniería Industrial (ID 2)
INSERT INTO colegiado 
(correo, password_hash, dni, nombres, celular, foto_url, carrera_id, nro_colegiado, sede_id, colegiado_desde, activo) 
VALUES 
('ana@email.com', 'pbkdf2_sha256$260000$hashdeprueba$', '44444444', 'Ana Torres', '911222333', 'https://dummyimage.com/ana.jpg', 2, '54321', 16, '2022-08-01', true);

-- Esta ingeniera NO tiene pagos registrados recientemente, por lo que la vista v_deuda generará 
-- registros de meses adeudados y v_estado_colegiado la marcará como INHABILITADA automáticamente.