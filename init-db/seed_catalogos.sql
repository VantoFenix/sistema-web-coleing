-- ============================================================================
-- SEED COMPLETO DE CATÁLOGOS REALES DEL CIP
-- Ejecutar en el SQL Editor de Supabase
-- Usa INSERT ... ON CONFLICT DO NOTHING para no duplicar
-- ============================================================================

-- 27 SEDES REALES (Consejos Departamentales del CIP - una por departamento)
INSERT INTO sede (nombre, activo) VALUES 
('Consejo Departamental Amazonas',             true),
('Consejo Departamental Áncash - Chimbote',    true),
('Consejo Departamental Áncash - Huaraz',      true),
('Consejo Departamental Apurímac',             true),
('Consejo Departamental Arequipa',             true),
('Consejo Departamental Ayacucho',             true),
('Consejo Departamental Cajamarca',            true),
('Consejo Departamental Callao',               true),
('Consejo Departamental Cusco',                true),
('Consejo Departamental Huancavelica',         true),
('Consejo Departamental Huánuco',              true),
('Consejo Departamental Ica',                  true),
('Consejo Departamental Junín',                true),
('Consejo Departamental La Libertad',          true),
('Consejo Departamental Lambayeque',           true),
('Consejo Departamental Lima',                 true),
('Consejo Departamental Loreto',               true),
('Consejo Departamental Madre de Dios',        true),
('Consejo Departamental Moquegua',             true),
('Consejo Departamental Pasco',                true),
('Consejo Departamental Piura',                true),
('Consejo Departamental Puno',                 true),
('Consejo Departamental San Martín - Moyobamba', true),
('Consejo Departamental San Martín - Tarapoto',  true),
('Consejo Departamental Tacna',                true),
('Consejo Departamental Tumbes',               true),
('Consejo Departamental Ucayali',              true)
ON CONFLICT (nombre) DO NOTHING;


-- 20 CARRERAS REALES DE INGENIERÍA registradas en el CIP
INSERT INTO carrera (nombre, activo) VALUES 
('Ingeniería Civil',                                    true),
('Ingeniería Industrial',                               true),
('Ingeniería de Sistemas e Inteligencia Artificial',    true),
('Ingeniería de Software',                              true),
('Ingeniería Agrónoma',                                 true),
('Ingeniería Ambiental y de Seguridad Industrial',      true),
('Ingeniería Mecánica',                                 true),
('Ingeniería Electrónica',                              true),
('Ingeniería Mecatrónica',                              true),
('Ingeniería de Minas',                                 true),
('Ingeniería Química',                                  true),
('Ingeniería Geológica',                                true),
('Ingeniería Eléctrica',                                true),
('Ingeniería Pesquera',                                 true),
('Ingeniería Forestal',                                 true),
('Ingeniería Zootecnista',                              true),
('Ingeniería Sanitaria',                                true),
('Ingeniería de Telecomunicaciones',                    true),
('Ingeniería Naval',                                    true),
('Ingeniería de Petróleo y Gas Natural',                true)
ON CONFLICT (nombre) DO NOTHING;


-- Verificación: ver cuántos registros hay
SELECT 'sedes' AS tabla, COUNT(*) AS total FROM sede WHERE activo = true
UNION ALL
SELECT 'carreras' AS tabla, COUNT(*) AS total FROM carrera WHERE activo = true;
