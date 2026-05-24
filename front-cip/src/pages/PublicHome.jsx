import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Info, X } from 'lucide-react';

export default function PublicHome() {
  const navigate = useNavigate();
  const [searchMethod, setSearchMethod] = useState('documento');
  const [tipoColegiado, setTipoColegiado] = useState('Ordinario');
  const [tipoDocumento, setTipoDocumento] = useState('DNI');
  const [documentoVal, setDocumentoVal] = useState('');
  const [nombresVal, setNombresVal] = useState('');
  const [errors, setErrors] = useState({});

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [dniConsulta, setDniConsulta] = useState('');
  const [estadoConsulta, setEstadoConsulta] = useState(null); // null, 'EN_REVISION', 'APROBADA', 'RECHAZADA'

  const validateForm = () => {
    const newErrors = {};
    if (searchMethod === 'documento') {
      if (!documentoVal.trim()) {
        newErrors.documento = 'El número de documento es obligatorio';
      }
    } else {
      if (!nombresVal.trim()) {
        newErrors.nombres = 'Los apellidos y nombres son obligatorios';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (validateForm()) {
      alert("Búsqueda pública iniciada (Solo muestra condición habilitado/inhabilitado).");
    }
  };

  const handleConsultarTramite = (e) => {
    e.preventDefault();
    if (dniConsulta.length !== 8) {
      alert("Ingrese un DNI válido de 8 dígitos");
      return;
    }
    // Mocking response
    if (dniConsulta === '11111111') setEstadoConsulta('APROBADA');
    else if (dniConsulta === '22222222') setEstadoConsulta('RECHAZADA');
    else setEstadoConsulta('EN_REVISION');
  };

  const resetModal = () => {
    setShowModal(false);
    setDniConsulta('');
    setEstadoConsulta(null);
  };

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="logo-container">
          <div className="logo-placeholder">CIP</div>
          <span className="nav-title">Colegio de Ingenieros del Perú</span>
        </div>
        <div className="nav-links">
          <button className="btn btn-outline">Postular</button>
          <span className="nav-link active">Inicio</span>
          <button className="btn btn-primary" onClick={() => navigate('/login')}>Ingresar</button>
        </div>
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
            <div className="form-row">
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

              <div className="form-group">
                <label className="form-label">Tipo de Colegiado</label>
                <select 
                  className="form-select"
                  value={tipoColegiado}
                  onChange={(e) => setTipoColegiado(e.target.value)}
                >
                  <option value="Ordinario">Ordinario / Vitalicio</option>
                  <option value="Temporal">Temporal</option>
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
                    placeholder="Ingrese el número..."
                    value={documentoVal}
                    onChange={(e) => setDocumentoVal(e.target.value)}
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
                  placeholder="Ej. Pérez García, Juan Carlos"
                  value={nombresVal}
                  onChange={(e) => setNombresVal(e.target.value)}
                />
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              <Search size={18} /> Buscar en Padrón
            </button>
          </form>
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
                      className="form-input" 
                      placeholder="Número de DNI de 8 dígitos"
                      value={dniConsulta}
                      onChange={(e) => setDniConsulta(e.target.value)}
                      maxLength={8}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-block">Consultar</button>
                  <p style={{ fontSize: '0.875rem', marginTop: '1rem', color: 'var(--text-muted)' }}>
                    Tips: Usa '11111111' para ver Aprobado, '22222222' para Rechazado.
                  </p>
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
                        <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem', fontWeight: '500' }}>
                          <li>LA FOTO ESTÁ MAL ENCUADRADA</li>
                          <li>EL RECIBO DE PAGO ES ILEGIBLE</li>
                        </ul>
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
