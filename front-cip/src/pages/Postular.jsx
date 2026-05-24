import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UploadCloud, CheckCircle2, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

export default function Postular() {
  const navigate = useNavigate();

  // Estados del formulario
  const [dni, setDni] = useState('');
  const [nombres, setNombres] = useState('');
  const [celular, setCelular] = useState('');
  const [correo, setCorreo] = useState('');
  const [carrera, setCarrera] = useState('');
  
  // Archivos
  const [foto, setFoto] = useState(null);
  const [titulo, setTitulo] = useState(null);
  const [recibo, setRecibo] = useState(null);

  // Estados de carga y simulación
  const [isValidando, setIsValidando] = useState(false);
  const [dniValidado, setDniValidado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [success, setSuccess] = useState(false);
  const [dniError, setDniError] = useState('');
  const [submitError, setSubmitError] = useState('');

  const handleValidarDNI = (e) => {
    e.preventDefault();
    if (dni.length !== 8) {
      setDniError("El DNI debe tener 8 dígitos.");
      return;
    }
    setDniError('');

    setIsValidando(true);

    // Simulador de apis.net.pe
    setTimeout(() => {
      setIsValidando(false);
      
      if (dni === '77777777') {
        setDniError("DNI no encontrado en RENIEC o apis.net.pe. Verifique el número.");
        setDniValidado(false);
        setNombres('');
      } else {
        // Simular éxito
        setNombres('JUAN CARLOS PÉREZ GARCÍA');
        setDniValidado(true);
      }
    }, 1000);
  };

  const handleFileChange = (e, setter) => {
    if (e.target.files && e.target.files[0]) {
      setter(e.target.files[0].name);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitError('');
    
    // Validación manual de campos
    if (!dniValidado) {
      setSubmitError("Debe validar su DNI primero.");
      return;
    }
    if (!celular || !correo || !carrera) {
      setSubmitError("Complete todos los datos de contacto y académicos.");
      return;
    }
    if (!foto || !titulo || !recibo) {
      setSubmitError("Debe adjuntar todos los documentos requeridos (Foto, Título y Recibo).");
      return;
    }

    setEnviando(true);

    // Simulador de envío a backend
    setTimeout(() => {
      setEnviando(false);
      setSuccess(true);
    }, 1500);
  };

  if (success) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ textAlign: 'center', maxWidth: '500px', padding: '3rem 2rem' }}>
          <CheckCircle2 size={64} color="var(--success)" style={{ margin: '0 auto 1rem auto' }} />
          <h2 style={{ color: 'var(--cip-blue)', marginBottom: '1rem' }}>¡Solicitud Enviada!</h2>
          <p className="text-muted" style={{ marginBottom: '2rem' }}>
            Su expediente ha ingresado a estado de <strong>revisión</strong>. Nos comunicaremos a su correo electrónico ante cualquier observación.
          </p>
          <button className="btn btn-primary btn-block" onClick={() => navigate('/')}>
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ padding: '4rem 2rem 2rem 2rem', position: 'relative' }}>
      
      {/* Botón de retroceso arriba a la izquierda */}
      <button 
        className="btn btn-outline" 
        style={{ position: 'absolute', top: '1.5rem', left: '2rem', border: 'none', padding: '0.5rem', color: 'var(--text-muted)' }}
        onClick={() => navigate('/')}
      >
        <ArrowLeft size={24} /> Volver al inicio
      </button>

      <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ color: 'var(--cip-blue)', fontSize: '2.25rem', fontWeight: '800' }}>Formulario de Colegiatura</h1>
        <p className="text-muted" style={{ fontSize: '1.125rem', marginTop: '0.5rem' }}>Inicie su trámite de inscripción adjuntando los documentos requeridos.</p>
      </div>

      <div className="card" style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
            
            {/* COLUMNA IZQUIERDA: ARCHIVOS */}
            <div style={{ background: '#f8fafc', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ color: 'var(--cip-blue)', marginBottom: '1.5rem', borderBottom: '2px solid var(--cip-red)', paddingBottom: '0.5rem', display: 'inline-block' }}>Documentos Adjuntos</h3>
              
              <div className="alert alert-warning" style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                <AlertCircle size={16} /> Asegúrese de que los archivos sean legibles.
              </div>

              <div className="form-group" style={{ marginTop: '1.5rem' }}>
                <label className="form-label">1. Fotografía Tamaño Pasaporte</label>
                <div style={{ border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '1.5rem', textAlign: 'center', background: 'white', cursor: 'pointer' }}>
                  <UploadCloud size={32} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem auto' }} />
                  <p style={{ fontSize: '0.875rem', color: 'var(--cip-blue)', fontWeight: '500' }}>{foto ? foto : "Clic para subir imagen (JPG/PNG)"}</p>
                  <input type="file" accept="image/*" style={{ opacity: 0, position: 'absolute', width: '0' }} id="file-foto" onChange={(e) => handleFileChange(e, setFoto)} />
                  <label htmlFor="file-foto" className="btn btn-outline" style={{ marginTop: '1rem', borderColor: 'var(--border-color)', color: 'var(--text-main)', fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}>Seleccionar archivo</label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">2. Título Profesional</label>
                <div style={{ border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '1.5rem', textAlign: 'center', background: 'white' }}>
                  <UploadCloud size={32} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem auto' }} />
                  <p style={{ fontSize: '0.875rem', color: 'var(--cip-blue)', fontWeight: '500' }}>{titulo ? titulo : "Clic para subir documento (PDF)"}</p>
                  <input type="file" accept=".pdf" style={{ opacity: 0, position: 'absolute', width: '0' }} id="file-titulo" onChange={(e) => handleFileChange(e, setTitulo)} />
                  <label htmlFor="file-titulo" className="btn btn-outline" style={{ marginTop: '1rem', borderColor: 'var(--border-color)', color: 'var(--text-main)', fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}>Seleccionar archivo</label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">3. Recibo de Pago (S/ 1500.00)</label>
                <div style={{ border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '1.5rem', textAlign: 'center', background: 'white' }}>
                  <UploadCloud size={32} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem auto' }} />
                  <p style={{ fontSize: '0.875rem', color: 'var(--cip-blue)', fontWeight: '500' }}>{recibo ? recibo : "Clic para subir comprobante (PDF/JPG)"}</p>
                  <input type="file" accept=".pdf,image/*" style={{ opacity: 0, position: 'absolute', width: '0' }} id="file-recibo" onChange={(e) => handleFileChange(e, setRecibo)} />
                  <label htmlFor="file-recibo" className="btn btn-outline" style={{ marginTop: '1rem', borderColor: 'var(--border-color)', color: 'var(--text-main)', fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}>Seleccionar archivo</label>
                </div>
              </div>

            </div>

            {/* COLUMNA DERECHA: DATOS */}
            <div style={{ padding: '2rem 0' }}>
              <h3 style={{ color: 'var(--cip-blue)', marginBottom: '1.5rem', borderBottom: '2px solid var(--cip-red)', paddingBottom: '0.5rem', display: 'inline-block' }}>Datos Personales y Académicos</h3>
              
              <div className="form-group">
                <label className="form-label">Número de DNI</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    style={{ flex: 1 }}
                    placeholder="Ingrese su DNI de 8 dígitos"
                    maxLength={8}
                    value={dni}
                    disabled={dniValidado}
                    onChange={(e) => { setDni(e.target.value); setDniError(''); setDniValidado(false); setNombres(''); }}
                  />
                  <button type="button" className="btn btn-outline" style={{ borderColor: 'var(--cip-blue)', color: 'var(--cip-blue)' }} onClick={handleValidarDNI} disabled={isValidando || dniValidado}>
                    {isValidando ? <Loader2 size={18} className="spin" /> : <><CheckCircle size={18} style={{marginRight: '5px'}}/> Validar</>}
                  </button>
                </div>
                {dniError && <span className="error-text" style={{ color: 'var(--cip-red)', fontSize: '0.875rem', marginTop: '0.5rem', display: 'block' }}>{dniError}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Nombres y Apellidos Completos</label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ background: '#f1f5f9', cursor: 'not-allowed', color: 'var(--cip-blue)', fontWeight: '600' }}
                  placeholder="Se autocompletará tras validar el DNI"
                  value={nombres}
                  readOnly
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Celular</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ej. 987654321"
                    maxLength={9}
                    value={celular}
                    onChange={(e) => setCelular(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Correo Electrónico</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="ejemplo@correo.com"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Carrera Profesional</label>
                <select 
                  className="form-select"
                  value={carrera}
                  onChange={(e) => setCarrera(e.target.value)}
                >
                  <option value="">Seleccione una carrera...</option>
                  <option value="Ingeniería Civil">Ingeniería Civil</option>
                  <option value="Ingeniería Industrial">Ingeniería Industrial</option>
                  <option value="Ingeniería de Sistemas">Ingeniería de Sistemas e Inteligencia Artificial</option>
                  <option value="Ingeniería Agrónoma">Ingeniería Agrónoma</option>
                  <option value="Ingeniería Ambiental">Ingeniería Ambiental</option>
                  <option value="Ingeniería de Minas">Ingeniería de Minas</option>
                </select>
              </div>

              {submitError && (
                <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: '8px', marginTop: '1.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  {submitError}
                </div>
              )}

            </div>

          </div>

          <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ padding: '1rem 3rem', fontSize: '1.25rem' }}
              disabled={enviando}
            >
              {enviando ? <Loader2 size={24} className="spin" /> : 'Enviar Expediente a Revisión'}
            </button>
            <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '1rem' }}>
              Al enviar esta solicitud, declaro bajo juramento que toda la información y documentos adjuntos son verdaderos.
            </p>
          </div>

        </form>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .card > form > div { grid-template-columns: 1fr !important; gap: 2rem !important; }
        }
      `}} />
    </div>
  );
}
