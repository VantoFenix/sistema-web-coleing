import { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function AdminPresencial() {
  const [dni, setDni] = useState('');
  const [nombres, setNombres] = useState('');
  const [celular, setCelular] = useState('');
  const [correo, setCorreo] = useState('');
  const [carrera, setCarrera] = useState('');
  const [sede, setSede] = useState('');
  
  const [carrerasOptions, setCarrerasOptions] = useState([]);
  const [sedesOptions, setSedesOptions] = useState([]);

  const [foto, setFoto] = useState(null);
  const [titulo, setTitulo] = useState(null);
  const [recibo, setRecibo] = useState(null);

  const [isValidando, setIsValidando] = useState(false);
  const [dniValidado, setDniValidado] = useState(false);
  const [success, setSuccess] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchCatalogos = async () => {
      try {
        const res = await fetch('/api/catalogos/');
        if (res.ok) {
          const data = await res.json();
          setCarrerasOptions(data.carreras || []);
          setSedesOptions(data.sedes || []);
        }
      } catch (err) {}
    };
    fetchCatalogos();
  }, []);

  const handleValidarDNI = async () => {
    if (dni.length !== 8) {
      setErrorMsg("El DNI debe tener 8 dígitos.");
      return;
    }
    setErrorMsg('');
    setIsValidando(true);
    try {
      const response = await fetch(`/api/public/reniec/?dni=${dni}`);
      if (response.ok) {
        const data = await response.json();
        setNombres(data.nombre_completo);
        setDniValidado(true);
      } else if (response.status === 429) {
        setErrorMsg("El servicio de RENIEC ha superado su límite de consultas. Ingrese el nombre manualmente.");
        setDniValidado(false);
      } else {
        setErrorMsg("DNI no encontrado en RENIEC. Puede ingresar el nombre manualmente.");
        setDniValidado(false);
      }
    } catch (error) {
      setErrorMsg("Error conectando con RENIEC. Ingrese el nombre manualmente.");
      setDniValidado(false);
    } finally {
      setIsValidando(false);
    }
  };

  const handleFileChange = (e, setter) => {
    if (e.target.files && e.target.files[0]) {
      setter(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombres || !celular || !correo || !carrera || !sede || !foto || !titulo || !recibo) {
      setErrorMsg("Complete todos los campos y adjunte los documentos.");
      return;
    }
    if (dni.length !== 8) {
      setErrorMsg("El DNI debe tener 8 dígitos.");
      return;
    }

    // Validación de formatos de archivo
    if (!foto.type.startsWith('image/')) {
      setErrorMsg("La foto debe ser un archivo de imagen válido (JPG, PNG).");
      return;
    }
    if (titulo.type !== 'application/pdf') {
      setErrorMsg("El Título Profesional debe ser un archivo PDF.");
      return;
    }
    if (!recibo.type.startsWith('image/') && recibo.type !== 'application/pdf') {
      setErrorMsg("El Recibo de Caja debe ser un PDF o una imagen.");
      return;
    }
    setErrorMsg('');
    setEnviando(true);

    try {
      // 1. Crear la solicitud
      const formData = new FormData();
      formData.append('dni', dni);
      formData.append('nombres', nombres);
      formData.append('celular', celular);
      formData.append('correo', correo);
      formData.append('carrera', carrera);
      formData.append('sede', sede);
      formData.append('foto', foto);
      formData.append('titulo', titulo);
      formData.append('recibo', recibo);

      const resPost = await fetch('/api/postulaciones/', { method: 'POST', body: formData });
      if (!resPost.ok) {
        const errData = await resPost.json();
        setErrorMsg(errData.error || "Error al crear la solicitud.");
        setEnviando(false);
        return;
      }
      const postData = await resPost.json();
      const solicitudId = postData.solicitud_id;

      // 2. Auto-aprobar inmediatamente (flujo presencial)
      const resAprob = await fetch(`/api/admin/postulaciones/${solicitudId}/resolver/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'APROBAR' })
      });

      if (resAprob.ok) {
        setSuccess(true);
      } else {
        setErrorMsg("La solicitud fue creada pero no se pudo aprobar automáticamente. Apruébela desde el panel de Postulaciones.");
      }
    } catch (err) {
      setErrorMsg("Error de conexión con el servidor.");
    } finally {
      setEnviando(false);
    }
  };

  const resetForm = () => {
    setSuccess(false); setDni(''); setNombres(''); setCelular('');
    setCorreo(''); setCarrera(''); setSede('');
    setFoto(null); setTitulo(null); setRecibo(null);
    setDniValidado(false); setErrorMsg('');
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
        <button className="btn btn-primary" onClick={resetForm}>
          Registrar Nuevo Expediente
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: '800', color: 'var(--cip-blue)', marginBottom: '0.5rem' }}>Inscripción Presencial (Aprobación Rápida)</h1>
        <p className="text-muted">Use este módulo para registrar colegiados que asisten físicamente. El trámite se aprueba automáticamente al instante.</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          
          <h3 style={{ color: 'var(--cip-blue)', marginBottom: '1.5rem', borderBottom: '2px solid var(--cip-red)', paddingBottom: '0.5rem', display: 'inline-block' }}>Datos del Postulante</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div className="form-group">
              <label className="form-label">DNI</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="text" className="form-input" placeholder="Ej. 70123456" value={dni}
                  onChange={(e) => { setDni(e.target.value.replace(/\D/g, '')); setDniValidado(false); setNombres(''); }}
                  maxLength={8} disabled={dniValidado} />
                <button type="button" className="btn btn-outline" style={{ borderColor: 'var(--cip-blue)', color: 'var(--cip-blue)', whiteSpace: 'nowrap' }}
                  onClick={handleValidarDNI} disabled={isValidando || dniValidado}>
                  {isValidando ? <Loader2 size={18} className="spin" /> : <><CheckCircle size={18} style={{marginRight:'4px'}}/>Validar</>}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Apellidos y Nombres</label>
              <input type="text" className="form-input" value={nombres}
                onChange={(e) => setNombres(e.target.value.toUpperCase())}
                readOnly={dniValidado}
                placeholder="Autocompletado con DNI o ingrese manualmente"
                style={{ background: dniValidado ? '#f1f5f9' : 'white', fontWeight: dniValidado ? '600' : '400' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Celular</label>
              <input type="text" className="form-input" value={celular} onChange={(e) => setCelular(e.target.value)} maxLength={9} />
            </div>
            <div className="form-group">
              <label className="form-label">Correo Electrónico</label>
              <input type="email" className="form-input" value={correo} onChange={(e) => setCorreo(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Especialidad / Carrera</label>
              <select className="form-select" value={carrera} onChange={(e) => setCarrera(e.target.value)}>
                <option value="">Seleccione una especialidad</option>
                {carrerasOptions.map(c => (
                  <option key={c.id} value={c.nombre}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Sede Departamental</label>
              <select className="form-select" value={sede} onChange={(e) => setSede(e.target.value)}>
                <option value="">Seleccione una sede</option>
                {sedesOptions.map(s => (
                  <option key={s.id} value={s.nombre}>{s.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <h3 style={{ color: 'var(--cip-blue)', marginBottom: '1.5rem', borderBottom: '2px solid var(--cip-red)', paddingBottom: '0.5rem', display: 'inline-block' }}>Documentación Física Verificada</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            {[
              { label: 'Foto Tamaño Pasaporte', accept: 'image/*', state: foto, setter: setFoto },
              { label: 'Título Profesional', accept: '.pdf', state: titulo, setter: setTitulo },
              { label: 'Recibo en Caja', accept: '.pdf,image/*', state: recibo, setter: setRecibo },
            ].map(({ label, accept, state, setter }) => (
              <div className="form-group" key={label}>
                <label className="form-label">{label}</label>
                <div style={{ border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '1rem', textAlign: 'center', background: '#f8fafc', cursor: 'pointer', position: 'relative' }}>
                  <input type="file" accept={accept} onChange={(e) => handleFileChange(e, setter)} style={{ opacity: 0, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', cursor: 'pointer' }} />
                  <UploadCloud size={24} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem auto' }} />
                  <p style={{ fontSize: '0.875rem', color: 'var(--cip-blue)', fontWeight: '500' }}>{state ? state.name : 'Subir archivo'}</p>
                </div>
              </div>
            ))}
          </div>

          {errorMsg && (
            <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: '8px', marginTop: '1.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              {errorMsg}
            </div>
          )}

          <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={enviando}
              style={{ padding: '1rem 2.5rem', fontSize: '1.125rem', background: '#10B981', borderColor: '#10B981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {enviando ? <><Loader2 size={20} className="spin" /> Procesando...</> : 'Registrar y Aprobar Colegiado'}
            </button>
          </div>

        </form>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
