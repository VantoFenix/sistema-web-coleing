import { useState } from 'react'

function App() {
  const [searchMethod, setSearchMethod] = useState('documento');
  const [tipoColegiado, setTipoColegiado] = useState('Ordinario');
  const [tipoDocumento, setTipoDocumento] = useState('DNI');
  
  // Form fields
  const [documentoVal, setDocumentoVal] = useState('');
  const [nombresVal, setNombresVal] = useState('');
  
  // Errors
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (searchMethod === 'documento') {
      if (!documentoVal.trim()) {
        newErrors.documento = 'El número de documento es obligatorio';
      } else {
        if (tipoDocumento === 'DNI' && documentoVal.length !== 8) {
          newErrors.documento = 'El DNI debe tener 8 dígitos';
        } else if (tipoDocumento === 'RUC' && documentoVal.length !== 11) {
          newErrors.documento = 'El RUC debe tener 11 dígitos';
        } else if (tipoDocumento === 'Reg. CIP' && documentoVal.length !== 5) {
          newErrors.documento = 'El Reg. CIP debe tener 5 dígitos';
        }
      }
    } else {
      if (!nombresVal.trim()) {
        newErrors.nombres = 'Los apellidos y nombres son obligatorios';
      } else if (nombresVal.trim().length < 4) {
        newErrors.nombres = 'Ingrese al menos 4 caracteres';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (validateForm()) {
      alert("Buscando colegiado...");
      // Here would go the fetch to backend
    }
  };

  return (
    <>
      <nav className="navbar">
        <div className="logo-container">
          <div className="logo-placeholder">LOGO</div>
          <span className="nav-title">Colegio de Ingenieros</span>
        </div>
        <div>
          <button className="login-btn">Iniciar sesión</button>
        </div>
      </nav>

      <section className="hero-section">
        <h1 className="hero-title">Bienvenidos al Colegio de Ingenieros</h1>
        <p style={{ marginBottom: '2rem', fontSize: '1.125rem', opacity: 0.9 }}>
          Únete a nuestra prestigiosa orden profesional
        </p>
        <button className="inscripciones-btn">Inscripciones</button>
      </section>

      <main className="main-container">
        <div className="search-card">
          <div className="search-header">
            <h2>Búsqueda de Colegiados</h2>
            <p>Verifique la habilidad y estado de un ingeniero colegiado (Consulta Pública)</p>
          </div>

          <form className="search-form" onSubmit={handleSearch}>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Método de búsqueda</label>
                <select 
                  className="form-select" 
                  value={searchMethod} 
                  onChange={(e) => {
                    setSearchMethod(e.target.value);
                    setErrors({});
                  }}
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
                  <option value="Ordinario">Ordinario</option>
                  <option value="Vitalicio">Vitalicio</option>
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
                    <option value="RUC">RUC</option>
                    <option value="PASS">Pasaporte (PASS)</option>
                    <option value="C.E">Carné de Extranjería (C.E)</option>
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
                <label className="form-label">Apellidos y Nombres completos</label>
                <input 
                  type="text" 
                  className={`form-input ${errors.nombres ? 'error' : ''}`}
                  placeholder="Ej. Pérez García, Juan Carlos"
                  value={nombresVal}
                  onChange={(e) => setNombresVal(e.target.value)}
                />
                {errors.nombres && <span className="error-text">{errors.nombres}</span>}
              </div>
            )}

            <button type="submit" className="search-submit-btn">
              Buscar Colegiado
            </button>

          </form>
        </div>
      </main>
    </>
  )
}

export default App
