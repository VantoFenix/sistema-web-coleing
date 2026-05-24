import { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { Search, Info, X, CheckCircle, FileText, Home, LogIn } from 'lucide-react';

export default function PublicHome() {
  const navigate = useNavigate();
  const [searchMethod, setSearchMethod] = useState('documento');
  const [tipoDocumento, setTipoDocumento] = useState('DNI');
  const [documentoVal, setDocumentoVal] = useState('');
  const [nombresVal, setNombresVal] = useState('');
  const [errors, setErrors] = useState({});
  const [searchResult, setSearchResult] = useState([]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [dniConsulta, setDniConsulta] = useState('');
  const [estadoConsulta, setEstadoConsulta] = useState(null); // null, 'EN_REVISION', 'APROBADA', 'RECHAZADA'
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [consultaError, setConsultaError] = useState('');
  const [consultando, setConsultando] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (searchMethod === 'documento') {
      if (!documentoVal.trim()) {
        newErrors.documento = 'El número de documento es obligatorio';
      } else if (tipoDocumento === 'DNI' && documentoVal.length !== 8) {
        newErrors.documento = 'El DNI debe tener exactamente 8 dígitos';
      } else if (tipoDocumento === 'Reg. CIP' && documentoVal.length !== 5) {
        newErrors.documento = 'El número CIP debe tener exactamente 5 dígitos';
      }
    } else {
      if (!nombresVal.trim()) {
        newErrors.nombres = 'Los apellidos y nombres son obligatorios';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setSearchResult([]);
    if (validateForm()) {
      try {
        let url = '';
        if (searchMethod === 'documento') {
          if (tipoDocumento === 'DNI') url = `/api/public/padron/?dni=${documentoVal}`;
          else url = `/api/public/padron/?cip=${documentoVal}`;
        } else {
          url = `/api/public/padron/?nombres=${nombresVal}`;
        }

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.length === 0) {
            setErrors({ general: 'No se encontraron resultados en el padrón.' });
          } else {
            const mappedResults = data.map(col => ({
              nombre: col.nombres,
              cip: col.nro_colegiado,
              carrera: col.carrera.nombre,
              sede: col.sede?.nombre || 'Desconocida',
              condicion: col.habilitado ? 'HABILITADO' : 'INHABILITADO'
            }));
            setSearchResult(mappedResults);
          }
        } else {
          setErrors({ general: 'Ingeniero no encontrado o datos incorrectos.' });
        }
      } catch (err) {
        setErrors({ general: 'Error de conexión con el servidor.' });
      }
    }
  };

  const handleConsultarTramite = async (e) => {
    e.preventDefault();
    if (dniConsulta.length !== 8) {
      setConsultaError("Ingrese un DNI válido de 8 dígitos");
      return;
    }
    setConsultaError('');
    setConsultando(true);
    setMotivoRechazo('');
    
    try {
      const res = await fetch(`/api/public/solicitudes/?dni=${dniConsulta}`);
      if (res.ok) {
        const data = await res.json();
        setEstadoConsulta(data.estado);
        setMotivoRechazo(data.motivo_rechazo || '');
      } else {
        setConsultaError("No se encontró ninguna solicitud de colegiatura para este DNI.");
        setEstadoConsulta(null);
      }
    } catch (err) {
      setConsultaError("Error de conexión con el servidor.");
    } finally {
      setConsultando(false);
    }
  };

  const resetModal = () => {
    setShowModal(false);
    setDniConsulta('');
    setEstadoConsulta(null);
    setConsultaError('');
  };

  return (
    <div className="app-container">
      <nav className="navbar" style={{ padding: '1rem 3rem' }}>
        {/* Lado Izquierdo: Logo CIP */}
        <div className="logo-container" style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <img src="/webp-logo-cip.webp" alt="Colegio de Ingenieros del Perú" style={{ height: '64px', width: 'auto', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }} />
        </div>

        {/* CENTRO: Enlaces de navegación */}
        <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifySelf: 'center' }}>
          <NavLink 
            to="/postular" 
            className="nav-link" 
            style={{ fontWeight: '500', fontSize: '1.125rem', padding: '0.5rem', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FileText size={18} /> Postular
          </NavLink>
          <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }}></div>
          <NavLink 
            to="/" 
            className="nav-link active" 
            style={{ fontWeight: '600', fontSize: '1.125rem', borderBottom: '3px solid transparent', padding: '0.5rem', borderRadius: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Home size={18} /> Inicio
          </NavLink>
          <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }}></div>
          <NavLink 
            to="/login" 
            className="nav-link" 
            style={{ fontWeight: '500', fontSize: '1.125rem', padding: '0.5rem', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <LogIn size={18} /> Ingresar
          </NavLink>
        </div>
        
        {/* Lado Derecho Vacío para equilibrar el CSS Grid */}
        <div></div>
      </nav>

      <section className="hero-section">
        <h1 className="hero-title">Bienvenidos al Colegio de Ingenieros</h1>
        <p style={{ marginBottom: '2rem', fontSize: '1.125rem', opacity: 0.9 }}>
          Consulte su estado de inscripción o verifique el padrón de ingenieros.
        </p>
        <button 
          className="btn btn-primary" 
          style={{ padding: '0.75rem 1.5rem', fontSize: '1.125rem' }}
          onClick={() => setShowModal(true)}
        >
          <Search size={20} /> Consultar Inscripción
        </button>
      </section>

      <main className="main-container">
        <div className="card">
          <div className="card-header">
            <h2>Búsqueda de Colegiados (Padrón Público)</h2>
            <p className="text-muted">Verifique la condición de un ingeniero sin exponer datos sensibles.</p>
          </div>

          <form onSubmit={handleSearch}>
            <div className="form-row" style={{ gridTemplateColumns: '1fr' }}>
              <div className="form-group">
                <label className="form-label">Método de búsqueda</label>
                <select 
                  className="form-select" 
                  value={searchMethod} 
                  onChange={(e) => { setSearchMethod(e.target.value); setErrors({}); }}
                >
                  <option value="documento">Por Número de Documento</option>
                  <option value="nombres">Por Apellidos y Nombres</option>
                </select>
              </div>
            </div>

            {searchMethod === 'documento' ? (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tipo de Documento</label>
                  <select 
                    className="form-select"
                    value={tipoDocumento}
                    onChange={(e) => setTipoDocumento(e.target.value)}
                  >
                    <option value="DNI">DNI</option>
                    <option value="Reg. CIP">Reg. CIP</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Número de Documento</label>
                  <input
                    type="text"
                    className={`form-input ${errors.documento ? 'error' : ''}`}
                    placeholder={tipoDocumento === 'DNI' ? '8 dígitos' : '5 dígitos'}
                    value={documentoVal}
                    maxLength={tipoDocumento === 'DNI' ? 8 : 5}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setDocumentoVal(val);
                      setErrors({});
                    }}
                  />
                  {errors.documento && <span className="error-text">{errors.documento}</span>}
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Apellidos y Nombres</label>
                <input
                  type="text"
                  className={`form-input ${errors.nombres ? 'error' : ''}`}
                  placeholder="Ej. PÉREZ GARCÍA, JUAN CARLOS"
                  value={nombresVal}
                  onChange={(e) => {
                    const val = e.target.value
                      .toUpperCase()
                      .replace(/[^A-ZÁÉÍÓÚÜÑ\s,]/g, '');
                    setNombresVal(val);
                    setErrors({});
                  }}
                />
                {errors.nombres && <span className="error-text" style={{ color: 'var(--cip-red)', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>{errors.nombres}</span>}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              <Search size={18} /> Buscar en Padrón
            </button>
            {errors.general && <div className="error-text" style={{ marginTop: '1rem', color: 'var(--cip-red)', fontWeight: '500' }}>{errors.general}</div>}
          </form>

          {/* TARJETAS DE RESULTADO DE BÚSQUEDA */}
          {searchResult.length > 0 && (
            <div style={{ marginTop: '2.5rem' }}>
              <h3 style={{ color: 'var(--cip-blue)', marginBottom: '1.5rem', borderBottom: '2px solid var(--cip-red)', paddingBottom: '0.5rem', display: 'inline-block' }}>
                Resultados de Búsqueda ({searchResult.length})
              </h3>
              
              <div style={{ display: 'grid', gap: '1rem' }}>
                {searchResult.map((res, idx) => (
                  <div key={idx} style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '12px', background: '#F8FAFC', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    <div>
                      <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>Apellidos y Nombres</p>
                      <p style={{ fontWeight: '600', color: 'var(--text-main)' }}>{res.nombre}</p>
                    </div>
                    <div>
                      <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>Carrera</p>
                      <p style={{ fontWeight: '600', color: 'var(--text-main)' }}>{res.carrera}</p>
                    </div>
                    <div>
                      <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>Registro CIP</p>
                      <p style={{ fontWeight: '600', color: 'var(--text-main)' }}>{res.cip}</p>
                    </div>
                    <div>
                      <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>Sede Departamental</p>
                      <p style={{ fontWeight: '600', color: 'var(--text-main)' }}>{res.sede}</p>
                    </div>
                    <div>
                      <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>Condición</p>
                      <span style={{ 
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '9999px', 
                        fontSize: '0.875rem', 
                        fontWeight: '700',
                        background: res.condicion === 'HABILITADO' ? '#D1FAE5' : '#FEE2E2',
                        color: res.condicion === 'HABILITADO' ? '#065F46' : '#991B1B'
                      }}>
                        {res.condicion}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* MODAL CONSULTAR INSCRIPCIÓN */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', color: 'var(--cip-blue)' }}>Consultar Estado de Trámite</h3>
              <button className="modal-close" onClick={resetModal}><X size={24} /></button>
            </div>
            <div className="modal-body">
              {!estadoConsulta ? (
                <form onSubmit={handleConsultarTramite}>
                  <div className="form-group">
                    <label className="form-label">Ingrese su DNI</label>
                    <input 
                      type="text" 
                      className={`form-input ${consultaError ? 'error' : ''}`} 
                      placeholder="Número de DNI de 8 dígitos"
                      value={dniConsulta}
                      onChange={(e) => { setDniConsulta(e.target.value); setConsultaError(''); }}
                      maxLength={8}
                    />
                    {consultaError && <span className="error-text" style={{ color: 'var(--cip-red)', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>{consultaError}</span>}
                  </div>
                  <button type="submit" className="btn btn-primary btn-block" disabled={consultando}>
                    {consultando ? 'Buscando...' : 'Consultar'}
                  </button>
                </form>
              ) : (
                <div>
                  {estadoConsulta === 'EN_REVISION' && (
                    <div className="alert alert-warning">
                      <Info size={24} />
                      <div>
                        <strong>Trámite en Revisión</strong>
                        <p>Su solicitud está siendo evaluada por el Consejo. Por favor revise nuevamente en unos días.</p>
                      </div>
                    </div>
                  )}
                  {estadoConsulta === 'APROBADA' && (
                    <div className="alert alert-success">
                      <Info size={24} />
                      <div>
                        <strong>¡Inscripción Aprobada!</strong>
                        <p>Felicidades, su colegiatura ha sido aprobada. Ahora puede ingresar al portal del colegiado usando su DNI.</p>
                      </div>
                    </div>
                  )}
                  {estadoConsulta === 'RECHAZADA' && (
                    <div className="alert alert-danger">
                      <Info size={24} />
                      <div>
                        <strong>Inscripción No Aprobada</strong>
                        <p style={{ marginBottom: '0.5rem' }}>Su trámite ha sido observado/rechazado por los siguientes motivos:</p>
                        <p style={{ marginLeft: '1rem', marginBottom: '1rem', fontWeight: '500', color: 'var(--cip-red)' }}>
                          {motivoRechazo || "Documentación inconsistente o ilegible."}
                        </p>
                        <p style={{ fontSize: '0.875rem' }}>* Por motivos de seguridad y privacidad, no puede editar este trámite. Deberá crear una nueva solicitud desde cero anexando los documentos correctos.</p>
                      </div>
                    </div>
                  )}
                  <button className="btn btn-outline btn-block" style={{ color: 'var(--cip-blue)', borderColor: 'var(--cip-blue)' }} onClick={() => setEstadoConsulta(null)}>
                    Volver
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
