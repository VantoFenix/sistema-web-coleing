import { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { procesarFotoCarnet } from '../../utils/fotoCarnet';

export default function AdminPresencial() {
  const [dni, setDni] = useState('');
  const [nombres, setNombres] = useState('');
  const [carrera, setCarrera] = useState('');
  const [sede, setSede] = useState('');
  
  const [carrerasOptions, setCarrerasOptions] = useState([]);
  const [sedesOptions, setSedesOptions] = useState([]);
  const [adminUser, setAdminUser] = useState(null);

  const [foto, setFoto] = useState(null);
  const [fotoInfo, setFotoInfo] = useState('');
  const [titulo, setTitulo] = useState(null);
  const [metodoPago, setMetodoPago] = useState(''); // '' | 'CAJA' | 'YAPE_PLIN'
  const [montoEfectivo, setMontoEfectivo] = useState('');

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

    const userStr = localStorage.getItem('adminUser');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setAdminUser(u);
        // Usar sede_id (número) que coincide con el value del <option>
        if (u.sede_id) {
          setSede(String(u.sede_id));
        } else if (u.sede) {
          setSede(String(u.sede));
        }
      } catch(e){}
    }
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

  const handleFotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');
    setFotoInfo('Procesando imagen…');
    setFoto(null);
    try {
      const procesada = await procesarFotoCarnet(file);
      setFoto(procesada);
      setFotoInfo(`✓ 413 × 531 px · ${(procesada.size / 1024).toFixed(0)} KB`);
    } catch (err) {
      setFotoInfo('');
      setErrorMsg(typeof err === 'string' ? err : 'Error al procesar la imagen.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombres || !carrera || !sede || !foto || !titulo) {
      setErrorMsg("Complete todos los campos y adjunte los documentos requeridos.");
      return;
    }
    if (!metodoPago) {
      setErrorMsg("Debe seleccionar un método de pago.");
      return;
    }
    if (metodoPago === 'CAJA' && Number(montoEfectivo) !== 5) {
      setErrorMsg("El monto en efectivo debe ser exactamente S/ 5.00.");
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
      setErrorMsg("El título debe ser un archivo PDF.");
      return;
    }

    setErrorMsg('');
    setEnviando(true);

    try {
      // 1. Crear la solicitud
      const formData = new FormData();
      formData.append('dni', dni);
      formData.append('nombres', nombres);
      formData.append('carrera', carrera);
      formData.append('sede', sede);
      formData.append('foto', foto);
      formData.append('titulo', titulo);
      formData.append('metodo_pago', metodoPago);
      formData.append('origen', 'PRESENCIAL');

      const resPost = await fetch('/api/postulaciones/', { method: 'POST', body: formData });
      if (!resPost.ok) {
        const errData = await resPost.json();
        console.error("Error 400 payload:", errData);
        alert("Error del servidor:\n" + JSON.stringify(errData, null, 2));
        setErrorMsg(errData.error || errData.detail || "Error al crear la solicitud.");
        setEnviando(false);
        return;
      }
      setSuccess(true);
    } catch (err) {
      setErrorMsg("Error de conexión con el servidor.");
    } finally {
      setEnviando(false);
    }
  };

  const resetForm = () => {
    setSuccess(false); setDni(''); setNombres(''); setCarrera(''); setSede('');
    setFoto(null); setFotoInfo(''); setTitulo(null); setRecibo(null);
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
              <select className="form-select" value={sede} onChange={(e) => setSede(e.target.value)} disabled={!!(adminUser && (adminUser.sede_id || adminUser.sede))}>
                <option value="">Seleccione una sede</option>
                {sedesOptions.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <h3 style={{ color: 'var(--cip-blue)', marginBottom: '1.5rem', borderBottom: '2px solid var(--cip-red)', paddingBottom: '0.5rem', display: 'inline-block' }}>Documentación Física Verificada</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>

            {/* ── Foto Tamaño Pasaporte (procesada a 413×531 px) ── */}
            <div className="form-group">
              <label className="form-label">
                Foto Tamaño Pasaporte
                <span style={{ fontSize: '0.7rem', fontWeight: '400', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                  3.5 × 4.5 cm · máx. 2 MB
                </span>
              </label>
              <div style={{ border: `2px dashed ${foto ? 'var(--cip-blue)' : 'var(--border-color)'}`, borderRadius: '8px', padding: '1rem', textAlign: 'center', background: '#f8fafc', cursor: 'pointer', position: 'relative' }}>
                <input type="file" accept="image/*" onChange={handleFotoChange}
                  style={{ opacity: 0, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', cursor: 'pointer' }} />
                <UploadCloud size={24} color={foto ? 'var(--cip-blue)' : 'var(--text-muted)'} style={{ margin: '0 auto 0.5rem auto' }} />
                <p style={{ fontSize: '0.875rem', color: 'var(--cip-blue)', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px', margin: '0 auto' }}>
                  {fotoInfo === 'Procesando imagen…' ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
                      <Loader2 size={14} className="spin" /> Procesando…
                    </span>
                  ) : foto ? foto.name : 'Subir imagen'}
                </p>
                {fotoInfo && fotoInfo !== 'Procesando imagen…' && (
                  <p style={{ fontSize: '0.7rem', color: '#059669', fontWeight: '600', margin: '0.25rem 0 0' }}>{fotoInfo}</p>
                )}
              </div>
            </div>

            {/* ── Título (sin procesamiento especial) ── */}
            <div className="form-group">
              <label className="form-label">Título Profesional</label>
              <div style={{ border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '1rem', textAlign: 'center', background: '#f8fafc', cursor: 'pointer', position: 'relative' }}>
                <input type="file" accept=".pdf" onChange={(e) => handleFileChange(e, setTitulo)} style={{ opacity: 0, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', cursor: 'pointer' }} />
                <UploadCloud size={24} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem auto' }} />
                <p style={{ fontSize: '0.875rem', color: 'var(--cip-blue)', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px', margin: '0 auto' }}>{titulo ? titulo.name : 'Subir archivo'}</p>
              </div>
            </div>

            {/* ── Método de Pago ── */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'block', marginBottom: '0.75rem' }}>Método de Pago (S/ 5.00)</label>
              
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <button 
                  type="button"
                  className={`btn ${metodoPago === 'CAJA' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setMetodoPago('CAJA')}
                  style={{ flex: 1, padding: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                >
                  <CheckCircle2 size={18} style={{ opacity: metodoPago === 'CAJA' ? 1 : 0 }} />
                  Efectivo en Caja
                </button>
                <button 
                  type="button"
                  className={`btn ${metodoPago === 'YAPE_PLIN' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setMetodoPago('YAPE_PLIN')}
                  style={{ flex: 1, padding: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                >
                  <CheckCircle2 size={18} style={{ opacity: metodoPago === 'YAPE_PLIN' ? 1 : 0 }} />
                  QR Yape / Plin
                </button>
              </div>

              {metodoPago === 'CAJA' && (
                <div style={{ padding: '1.5rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Ingrese el monto recibido</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="S/ 5.00" 
                    value={montoEfectivo} 
                    onChange={(e) => setMontoEfectivo(e.target.value)} 
                  />
                  {montoEfectivo === '5' ? (
                    <p style={{ color: '#166534', fontWeight: '500', fontSize: '0.875rem', margin: 0 }}>✅ Monto validado</p>
                  ) : (
                    <p style={{ color: '#dc2626', fontWeight: '500', fontSize: '0.875rem', margin: 0 }}>❌ Debe ingresar S/ 5.00 exactos</p>
                  )}
                </div>
              )}
              {metodoPago === 'YAPE_PLIN' && (
                <div style={{ padding: '1rem', border: '2px dashed #cbd5e1', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100px', background: '#f8fafc', color: '#64748b', textAlign: 'center', fontWeight: '500' }}>
                  Espacio reservado para QR de Yape/Plin (S/ 5.00)
                </div>
              )}
            </div>
          </div>

          {errorMsg && (
            <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: '8px', marginTop: '1.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              {errorMsg}
            </div>
          )}

          <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" 
              disabled={
                enviando || 
                (metodoPago !== 'YAPE_PLIN' && !(metodoPago === 'CAJA' && Number(montoEfectivo) === 5))
              }
              style={{ 
                padding: '1rem 2.5rem', 
                fontSize: '1.125rem', 
                background: (metodoPago !== 'YAPE_PLIN' && !(metodoPago === 'CAJA' && Number(montoEfectivo) === 5)) ? '#94a3b8' : '#10B981', 
                borderColor: (metodoPago !== 'YAPE_PLIN' && !(metodoPago === 'CAJA' && Number(montoEfectivo) === 5)) ? '#94a3b8' : '#10B981', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                cursor: (metodoPago !== 'YAPE_PLIN' && !(metodoPago === 'CAJA' && Number(montoEfectivo) === 5)) ? 'not-allowed' : 'pointer'
              }}>
              {enviando ? <><Loader2 size={20} className="spin" /> Procesando...</> : 'Enviar Solicitud a Revisión'}
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
