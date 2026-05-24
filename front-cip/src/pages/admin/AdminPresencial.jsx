import { useState } from 'react';
import { UploadCloud, CheckCircle, CheckCircle2 } from 'lucide-react';

export default function AdminPresencial() {
  const [dni, setDni] = useState('');
  const [nombres, setNombres] = useState('');
  const [celular, setCelular] = useState('');
  const [correo, setCorreo] = useState('');
  const [carrera, setCarrera] = useState('');
  
  const [foto, setFoto] = useState(null);
  const [titulo, setTitulo] = useState(null);
  const [recibo, setRecibo] = useState(null);

  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleValidarDNI = () => {
    if (dni.length !== 8) {
      setErrorMsg("El DNI debe tener 8 dígitos.");
      return;
    }
    setErrorMsg('');
    setNombres('PÉREZ GARCÍA, JUAN CARLOS'); // Simulación rápida
  };

  const handleFileChange = (e, setter) => {
    if (e.target.files && e.target.files[0]) {
      setter(e.target.files[0].name);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nombres || !celular || !correo || !carrera || !foto || !titulo || !recibo) {
      setErrorMsg("Complete todos los campos y adjunte los documentos.");
      return;
    }
    setErrorMsg('');
    
    // Al ser presencial, se aprueba automáticamente
    setTimeout(() => {
      setSuccess(true);
    }, 1000);
  };

  if (success) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '50%', background: '#D1FAE5', color: '#059669', marginBottom: '1.5rem' }}>
          <CheckCircle2 size={40} />
        </div>
        <h2 style={{ fontSize: '1.875rem', fontWeight: '800', color: 'var(--cip-blue)', marginBottom: '1rem' }}>Inscripción Exitosa y Aprobada</h2>
        <p className="text-muted" style={{ marginBottom: '2rem' }}>
          El expediente presencial para <strong>{nombres}</strong> ha sido procesado e ingresado al padrón oficial de manera inmediata.
        </p>
        <button className="btn btn-primary" onClick={() => { setSuccess(false); setDni(''); setNombres(''); setCelular(''); setCorreo(''); setFoto(null); setTitulo(null); setRecibo(null); }}>
          Registrar Nuevo Expediente
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: '800', color: 'var(--cip-blue)', marginBottom: '0.5rem' }}>Inscripción Presencial (Aprobación Rápida)</h1>
        <p className="text-muted">Utilice este módulo para registrar colegiados que asisten físicamente. El trámite se aprueba automáticamente.</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          
          <h3 style={{ color: 'var(--cip-blue)', marginBottom: '1.5rem', borderBottom: '2px solid var(--cip-red)', paddingBottom: '0.5rem', display: 'inline-block' }}>Datos del Postulante</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div className="form-group">
              <label className="form-label">DNI</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="text" className="form-input" placeholder="Ej. 70123456" value={dni} onChange={(e) => setDni(e.target.value)} maxLength={8} />
                <button type="button" className="btn btn-outline" style={{ borderColor: 'var(--cip-blue)', color: 'var(--cip-blue)' }} onClick={handleValidarDNI}>Validar</button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Apellidos y Nombres</label>
              <input type="text" className="form-input" value={nombres} disabled style={{ background: '#f8fafc' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Celular</label>
              <input type="text" className="form-input" value={celular} onChange={(e) => setCelular(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Correo Electrónico</label>
              <input type="email" className="form-input" value={correo} onChange={(e) => setCorreo(e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Especialidad / Carrera</label>
              <select className="form-select" value={carrera} onChange={(e) => setCarrera(e.target.value)}>
                <option value="">Seleccione una especialidad</option>
                <option value="Ingeniería de Sistemas">Ingeniería de Sistemas</option>
                <option value="Ingeniería Civil">Ingeniería Civil</option>
                <option value="Ingeniería Industrial">Ingeniería Industrial</option>
              </select>
            </div>
          </div>

          <h3 style={{ color: 'var(--cip-blue)', marginBottom: '1.5rem', borderBottom: '2px solid var(--cip-red)', paddingBottom: '0.5rem', display: 'inline-block' }}>Documentación Física Verificada</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Foto Subida por Admin</label>
              <div style={{ border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '1rem', textAlign: 'center', background: '#f8fafc', cursor: 'pointer', position: 'relative' }}>
                <input type="file" onChange={(e) => handleFileChange(e, setFoto)} style={{ opacity: 0, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', cursor: 'pointer' }} />
                <UploadCloud size={24} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem auto' }} />
                <p style={{ fontSize: '0.875rem', color: 'var(--cip-blue)', fontWeight: '500' }}>{foto ? foto : "Subir Foto"}</p>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Título Profesional</label>
              <div style={{ border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '1rem', textAlign: 'center', background: '#f8fafc', cursor: 'pointer', position: 'relative' }}>
                <input type="file" accept=".pdf" onChange={(e) => handleFileChange(e, setTitulo)} style={{ opacity: 0, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', cursor: 'pointer' }} />
                <UploadCloud size={24} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem auto' }} />
                <p style={{ fontSize: '0.875rem', color: 'var(--cip-blue)', fontWeight: '500' }}>{titulo ? titulo : "Subir PDF"}</p>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Recibo en Caja</label>
              <div style={{ border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '1rem', textAlign: 'center', background: '#f8fafc', cursor: 'pointer', position: 'relative' }}>
                <input type="file" onChange={(e) => handleFileChange(e, setRecibo)} style={{ opacity: 0, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', cursor: 'pointer' }} />
                <UploadCloud size={24} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem auto' }} />
                <p style={{ fontSize: '0.875rem', color: 'var(--cip-blue)', fontWeight: '500' }}>{recibo ? recibo : "Subir Recibo"}</p>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: '8px', marginTop: '1.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              {errorMsg}
            </div>
          )}

          <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.125rem', background: '#10B981', borderColor: '#10B981' }}>
              Registrar y Aprobar Colegiado
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
