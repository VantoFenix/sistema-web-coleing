-- ==============================================================================
-- 1. CATÁLOGOS Y TIPOS DE DATOS
-- ==============================================================================

CREATE TABLE sedes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL
);

-- Tabla de Carreras de Ingeniería
CREATE TABLE carreras (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) UNIQUE NOT NULL
);

-- Estados permitidos para un trámite
CREATE TYPE estado_tramite AS ENUM ('PENDIENTE', 'OBSERVADO', 'APROBADO', 'RECHAZADO');


-- ==============================================================================
-- 2. TABLAS PRINCIPALES DEL NEGOCIO
-- ==============================================================================

-- Módulo de Inscripciones (Postulantes)
CREATE TABLE tramites_inscripcion (
    id SERIAL PRIMARY KEY,
    dni VARCHAR(8) NOT NULL CHECK (dni ~ '^[0-9]{8}$'),
    nombre_completo VARCHAR(150) NOT NULL,
    correo VARCHAR(100) NOT NULL,
    celular VARCHAR(9) NOT NULL,
    
    -- Llaves foráneas hacia los catálogos
    carrera_id INTEGER REFERENCES carreras(id) ON DELETE RESTRICT,
    sede_id INTEGER REFERENCES sedes(id) ON DELETE RESTRICT, 
    
    -- Archivos
    foto_url TEXT NOT NULL,
    titulo_pdf_url TEXT NOT NULL,
    voucher_url TEXT NOT NULL,
    
    estado estado_tramite DEFAULT 'PENDIENTE',
    observacion TEXT NULL,
    
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Módulo de Credenciales (El Padrón Oficial)
CREATE TABLE colegiados (
    id SERIAL PRIMARY KEY,
    dni VARCHAR(8) UNIQUE NOT NULL CHECK (dni ~ '^[0-9]{8}$'),
    nombre_completo VARCHAR(150) NOT NULL,
    correo VARCHAR(100) NOT NULL,
    celular VARCHAR(9) NOT NULL,
    
    -- Llaves foráneas hacia los catálogos
    carrera_id INTEGER REFERENCES carreras(id) ON DELETE RESTRICT,
    sede_id INTEGER REFERENCES sedes(id) ON DELETE RESTRICT,
    
    cip VARCHAR(5) NOT NULL CHECK (cip ~ '^[0-9]{5}$'),
    
    -- Seguridad (Activación por correo)
    password_hash VARCHAR(255) NULL, 
    cuenta_activa BOOLEAN DEFAULT FALSE, 
    token_activacion VARCHAR(100) NULL, 

    habilitado BOOLEAN DEFAULT TRUE,
    fecha_colegiatura DATE DEFAULT CURRENT_DATE,

    -- RESTRICCIÓN VITAL
    UNIQUE (cip, sede_id)
);

-- Módulo Financiero (Pagos Mensuales)
CREATE TABLE cuotas (
    id SERIAL PRIMARY KEY,
    colegiado_id INTEGER REFERENCES colegiados(id) ON DELETE CASCADE,
    mes_cobro INTEGER NOT NULL CHECK (mes_cobro BETWEEN 1 AND 12),
    anio_cobro INTEGER NOT NULL,
    monto DECIMAL(10,2) DEFAULT 20.00,
    
    pagado BOOLEAN DEFAULT FALSE,
    fecha_pago TIMESTAMP NULL,
    transaccion_id VARCHAR(100) NULL, 
    
    UNIQUE(colegiado_id, mes_cobro, anio_cobro) 
);


-- ==============================================================================
-- 3. TRIGGERS (Automatización)
-- ==============================================================================
CREATE OR REPLACE FUNCTION actualizar_fecha_modificacion()
RETURNS TRIGGER AS $$
BEGIN
   NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tramites_modtime
BEFORE UPDATE ON tramites_inscripcion
FOR EACH ROW
EXECUTE FUNCTION actualizar_fecha_modificacion();


-- ==============================================================================
-- 4. DATA SEEDING: CATÁLOGOS (SEDES Y CARRERAS)
-- ==============================================================================

-- Catálogo de Sedes
INSERT INTO sedes (nombre) VALUES 
('Consejo Departamental Amazonas'), ('Consejo Departamental Áncash'),
('Consejo Departamental Arequipa'), ('Consejo Departamental Ayacucho'),
('Consejo Departamental Cajamarca'), ('Consejo Departamental Callao'),
('Consejo Departamental Cusco'), ('Consejo Departamental Ica'),
('Consejo Departamental Junín'), ('Consejo Departamental La Libertad'), -- ID 10
('Consejo Departamental Lambayeque'), ('Consejo Departamental Lima');    -- ID 12

-- Catálogo de Carreras (El Frontend lee esto para su desplegable)
INSERT INTO carreras (nombre) VALUES 
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
-- 5. DATA SEEDING: TRÁMITES Y PADRÓN
-- ==============================================================================

-- Trámite pendiente de prueba (Aplica a Ingeniería Civil - ID 1)
INSERT INTO tramites_inscripcion 
(dni, nombre_completo, correo, celular, carrera_id, sede_id, foto_url, titulo_pdf_url, voucher_url, estado) 
VALUES 
('73333333', 'Carlos Mendoza', 'carlos@email.com', '987654321', 1, 12, 'https://dummyimage.com/foto.jpg', 'https://dummyimage.com/titulo.pdf', 'https://dummyimage.com/voucher.jpg', 'PENDIENTE');

-- A. Ingeniero de La Libertad (Totalmente al día, HABILITADO)
-- Aplica a Ingeniería de Sistemas e IA (ID 3)
INSERT INTO colegiados 
(dni, nombre_completo, correo, celular, carrera_id, cip, sede_id, password_hash, cuenta_activa, habilitado, fecha_colegiatura) 
VALUES 
('70000000', 'BRUNO MARTIN VELASQUEZ GONGORA', 'bruno@email.com', '999888777', 3, '12345', 10, 'pbkdf2_sha256$260000$hashdeprueba$', true, true, '2025-01-15');

-- Su cuota pagada (Buscando ID de forma segura)
INSERT INTO cuotas (colegiado_id, mes_cobro, anio_cobro, monto, pagado) 
VALUES ((SELECT id FROM colegiados WHERE dni = '70000000'), 5, 2026, 20.00, true); 


-- B. Ingeniera de Lima (Con deuda, INHABILITADO)
-- Aplica a Ingeniería Industrial (ID 2)
INSERT INTO colegiados 
(dni, nombre_completo, correo, celular, carrera_id, cip, sede_id, password_hash, cuenta_activa, habilitado, fecha_colegiatura) 
VALUES 
('44444444', 'Ana Torres', 'ana@email.com', '911222333', 2, '12345', 12, 'pbkdf2_sha256$260000$hashdeprueba$', true, false, '2022-08-20');

-- Sus dos meses de deuda (Buscando ID de forma segura)
INSERT INTO cuotas (colegiado_id, mes_cobro, anio_cobro, monto, pagado) 
VALUES 
((SELECT id FROM colegiados WHERE dni = '44444444'), 4, 2026, 20.00, false),
((SELECT id FROM colegiados WHERE dni = '44444444'), 5, 2026, 20.00, false);