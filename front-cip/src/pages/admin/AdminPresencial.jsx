import { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { procesarFotoCarnet } from '../../utils/fotoCarnet';

export default function AdminPresencial() {
  const [dni, setDni] = useState('');
  const [nombres, setNombres] = useState('');
  const [carrera, setCarrera] = useState('');
  const [sede, setSede] = useState('');
  const [correo, setCorreo] = useState('');
  const [celular, setCelular] = useState('');
  
  const [carrerasOptions, setCarrerasOptions] = useState([]);
  const [sedesOptions, setSedesOptions] = useState([]);
  const [isSedeLocked, setIsSedeLocked] = useState(false);

  const [foto, setFoto] = useState(null);
  const [fotoInfo, setFotoInfo] = useState('');
  const [titulo, setTitulo] = useState(null);
  const [dniAnverso, setDniAnverso] = useState(null);
  const [dniReverso, setDniReverso] = useState(null);
  const [metodoPago, setMetodoPago] = useState(''); // '' | 'CAJA' | 'YAPE_PLIN'
  const [montoEfectivo, setMontoEfectivo] = useState('');
  const [qrUrl, setQrUrl] = useState(null);
  const [cargandoQr, setCargandoQr] = useState(false);
  const [qrError, setQrError] = useState('');

  const [isValidando, setIsValidando] = useState(false);
  const [dniValidado, setDniValidado] = useState(false);
  const [success, setSuccess] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const generarQrFlow = async () => {
    if (qrUrl || cargandoQr) return; // evitar dobles peticiones
    setCargandoQr(true);
    setQrError('');
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/flow/generar-qr/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ email: 'vantofortnite@gmail.com' }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setQrUrl(data.url);
      } else {
        setQrError(data.error || 'No se pudo generar el QR. Intente de nuevo.');
      }
    } catch (err) {
      setQrError('Error de conexión al generar el QR.');
      console.error(err);
    } finally {
      setCargandoQr(false);
    }
  };

  useEffect(() => {
    const fetchCatalogos = async () => {
      try {
        const res = await fetch('/api/catalogos/');
        if (res.ok) {
          const data = await res.json();
          setCarrerasOptions(data.carreras || []);
          setSedesOptions(data.sedes || []);
        }
      } catch (err) {
        // Ignorar error si no hay catálogos
        console.error(err);
      }
    };
    fetchCatalogos();

    const storedSede = localStorage.getItem('adminSede');
    if (storedSede && storedSede !== 'Sede Global') {
      setSede(storedSede);
      setIsSedeLocked(true);
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
    } catch (err) {
      setErrorMsg("Error conectando con RENIEC. Ingrese el nombre manualmente.");
      setDniValidado(false);
      console.error(err);
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
    } catch (error) {
      setFotoInfo('');
      setErrorMsg(typeof error === 'string' ? error : 'Error al procesar la imagen.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombres || !carrera || !sede || !correo || !celular || !foto || !titulo || !dniAnverso || !dniReverso) {
      setErrorMsg("Complete todos los campos de datos, de contacto, y adjunte los documentos requeridos (incluyendo DNI).");
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
    if (dniAnverso && !dniAnverso.type.startsWith('image/') && dniAnverso.type !== 'application/pdf') {
      setErrorMsg("El DNI Anverso debe ser un PDF o una imagen.");
      return;
    }
    if (dniReverso && !dniReverso.type.startsWith('image/') && dniReverso.type !== 'application/pdf') {
      setErrorMsg("El DNI Reverso debe ser un PDF o una imagen.");
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
      formData.append('correo', correo);
      formData.append('celular', celular);
      formData.append('numero_operacion', `CAJA-${Date.now()}`); // Dummy flag for presencial
      formData.append('fecha_pago', new Date().toISOString().split('T')[0]); // Today's date
      formData.append('banco', 'CAJA');
      formData.append('foto', foto);
      formData.append('titulo', titulo);
      formData.append('dni_anverso', dniAnverso);
      formData.append('dni_reverso', dniReverso);

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
      const adminToken = localStorage.getItem('adminToken');
      const resAprob = await fetch(`/api/admin/postulaciones/${solicitudId}/resolver/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ accion: 'APROBAR' })
      });

      if (resAprob.ok) {
        setSuccess(true);
      } else {
        setErrorMsg("La solicitud fue creada pero no se pudo aprobar automáticamente. Apruébela desde el panel de Postulaciones.");
      }
    } catch (err) {
      setErrorMsg("Error de conexión con el servidor.");
      console.error(err);
    } finally {
      setEnviando(false);
    }
  };

  const resetForm = () => {
    setSuccess(false); setDni(''); setNombres(''); setCarrera(''); 
    if (!isSedeLocked) setSede('');
    setFoto(null); setFotoInfo(''); setTitulo(null); setDniAnverso(null); setDniReverso(null);
    setCorreo(''); setCelular('');
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
              <select 
                className="form-select" 
                value={sede} 
                onChange={(e) => setSede(e.target.value)}
                disabled={isSedeLocked}
                style={isSedeLocked ? { background: '#f1f5f9', cursor: 'not-allowed' } : {}}
              >
                <option value="">Seleccione una sede</option>
                {sedesOptions.map(s => (
                  <option key={s.id} value={s.nombre}>{s.nombre}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Correo Electrónico</label>
              <input type="email" className="form-input" value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="ejemplo@correo.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono / Celular</label>
              <input type="text" className="form-input" value={celular}
                onChange={(e) => setCelular(e.target.value.replace(/\D/g, ''))}
                maxLength={15}
                placeholder="Ej. 999888777" />
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

            {/* ── DNI Anverso ── */}
            <div className="form-group">
              <label className="form-label">DNI Anverso</label>
              <div style={{ border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '1rem', textAlign: 'center', background: '#f8fafc', cursor: 'pointer', position: 'relative' }}>
                <input type="file" accept=".pdf,image/*" onChange={(e) => handleFileChange(e, setDniAnverso)} style={{ opacity: 0, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', cursor: 'pointer' }} />
                <UploadCloud size={24} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem auto' }} />
                <p style={{ fontSize: '0.875rem', color: 'var(--cip-blue)', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px', margin: '0 auto' }}>{dniAnverso ? dniAnverso.name : 'Subir Anverso'}</p>
              </div>
            </div>

            {/* ── DNI Reverso ── */}
            <div className="form-group">
              <label className="form-label">DNI Reverso</label>
              <div style={{ border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '1rem', textAlign: 'center', background: '#f8fafc', cursor: 'pointer', position: 'relative' }}>
                <input type="file" accept=".pdf,image/*" onChange={(e) => handleFileChange(e, setDniReverso)} style={{ opacity: 0, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', cursor: 'pointer' }} />
                <UploadCloud size={24} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem auto' }} />
                <p style={{ fontSize: '0.875rem', color: 'var(--cip-blue)', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px', margin: '0 auto' }}>{dniReverso ? dniReverso.name : 'Subir Reverso'}</p>
              </div>
            </div>

            {/* ── Método de Pago ── */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'block', marginBottom: '0.75rem' }}>Método de Pago (S/ 5.00)</label>
              
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <button 
                  type="button"
                  className={`btn ${metodoPago === 'CAJA' ? 'btn-primary' : 'btn-outline-dark'}`}
                  onClick={() => setMetodoPago('CAJA')}
                  style={{ flex: 1, padding: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                >
                  <CheckCircle2 size={18} style={{ opacity: metodoPago === 'CAJA' ? 1 : 0 }} />
                  Efectivo en Caja
                </button>
                <button 
                  type="button"
                  className={`btn ${metodoPago === 'YAPE_PLIN' ? 'btn-primary' : 'btn-outline-dark'}`}
                  onClick={() => { setMetodoPago('YAPE_PLIN'); generarQrFlow(); }}
                  style={{ flex: 1, padding: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                >
                  <CheckCircle2 size={18} style={{ opacity: metodoPago === 'YAPE_PLIN' ? 1 : 0 }} />
                  📱 QR Yape / Plin
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
                <div style={{ padding: '1.25rem', border: '2px dashed #a78bfa', borderRadius: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '120px', background: '#faf5ff', gap: '0.75rem' }}>
                  {cargandoQr && (
                    <>
                      <Loader2 size={28} className="spin" style={{ color: '#7c3aed' }} />
                      <p style={{ color: '#6d28d9', fontWeight: '600', margin: 0 }}>⏳ Generando QR de pago...</p>
                    </>
                  )}
                  {!cargandoQr && qrError && (
                    <>
                      <p style={{ color: '#dc2626', fontWeight: '500', margin: 0, textAlign: 'center' }}>❌ {qrError}</p>
                      <button
                        type="button"
                        onClick={generarQrFlow}
                        style={{ padding: '0.4rem 1rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
                      >
                        Reintentar
                      </button>
                    </>
                  )}
                  {!cargandoQr && qrUrl && (
                    <>
                      <p style={{ color: '#6d28d9', fontWeight: '600', margin: 0, fontSize: '0.875rem' }}>✅ QR listo — pida al cliente que escanee</p>
                      <button
                        type="button"
                        onClick={() => window.open(qrUrl, '_blank', 'width=500,height=700')}
                        style={{
                          padding: '0.6rem 1.5rem',
                          background: 'linear-gradient(135deg, #7c3aed, #a21caf)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: '700',
                          fontSize: '1rem',
                          boxShadow: '0 4px 12px rgba(124,58,237,0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        📲 Abrir QR de Pago
                      </button>
                    </>
                  )}
                  {!cargandoQr && !qrUrl && !qrError && (
                    <p style={{ color: '#94a3b8', fontWeight: '500', margin: 0 }}>Generando enlace de pago QR...</p>
                  )}
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
                !(metodoPago === 'YAPE_PLIN' || (metodoPago === 'CAJA' && Number(montoEfectivo) === 5))
              }
              style={{ 
                padding: '1rem 2.5rem', 
                fontSize: '1.125rem', 
                background: !(metodoPago === 'YAPE_PLIN' || (metodoPago === 'CAJA' && Number(montoEfectivo) === 5)) ? '#94a3b8' : '#10B981', 
                borderColor: !(metodoPago === 'YAPE_PLIN' || (metodoPago === 'CAJA' && Number(montoEfectivo) === 5)) ? '#94a3b8' : '#10B981', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                cursor: !(metodoPago === 'YAPE_PLIN' || (metodoPago === 'CAJA' && Number(montoEfectivo) === 5)) ? 'not-allowed' : 'pointer'
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
