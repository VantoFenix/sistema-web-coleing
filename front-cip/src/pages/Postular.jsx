import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UploadCloud, CheckCircle2, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

export default function Postular() {
  const navigate = useNavigate();

  const [dni, setDni] = useState('');
  const [nombres, setNombres] = useState('');
  const [carrera, setCarrera] = useState('');
  const [sede, setSede] = useState('');
  const [numeroOperacion, setNumeroOperacion] = useState('');
  const [fechaPago, setFechaPago] = useState('');
  const [correo, setCorreo] = useState('');
  const [celular, setCelular] = useState('');
  const [terminos, setTerminos] = useState(false);



  const [carrerasOptions, setCarrerasOptions] = useState([]);
  const [sedesOptions, setSedesOptions] = useState([]);

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
        console.error("Error cargando catálogos", err);
      }
    };
    fetchCatalogos();
  }, []);



  const [foto, setFoto] = useState(null);
  const [fotoInfo, setFotoInfo] = useState('');
  const [titulo, setTitulo] = useState(null);
  const [tituloInfo, setTituloInfo] = useState('');
  const [recibo, setRecibo] = useState(null);
  const [reciboInfo, setReciboInfo] = useState('');
  const [dniAnverso, setDniAnverso] = useState(null);
  const [dniAnversoInfo, setDniAnversoInfo] = useState('');
  const [dniReverso, setDniReverso] = useState(null);
  const [dniReversoInfo, setDniReversoInfo] = useState('');

  const [isValidando, setIsValidando] = useState(false);
  const [dniValidado, setDniValidado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [success, setSuccess] = useState(false);
  const [dniError, setDniError] = useState('');
  const [pagoError, setPagoError] = useState('');
  const [submitError, setSubmitError] = useState('');

  const handleValidarDNI = async (e) => {
    e.preventDefault();
    if (dni.length !== 8) {
      setDniError("El DNI debe tener 8 dígitos.");
      return;
    }
    setDniError('');
    setIsValidando(true);

    try {
      const response = await fetch(`/api/public/reniec/?dni=${dni}`);
      let data = {};
      try { data = await response.json(); } catch (_) {}

      if (response.ok) {
        setNombres(data.nombre_completo);
        setDniValidado(true);
      } else if (response.status === 409) {
        setDniError(data.detalle || 'Este DNI ya está registrado.');
        setDniValidado(false);
        setNombres('');
      } else if (response.status === 429) {
        setDniError("Límite de consultas RENIEC alcanzado.");
        setDniValidado(false);
      } else if (response.status === 500 && data.error === 'CONFIG_ERROR') {
        setDniError(`⚙️ Error de configuración: ${data.detalle}`);
        setDniValidado(false);
        setNombres('');
      } else if (response.status === 502 && data.error === 'TOKEN_INVALIDO') {
        setDniError(`🔒 ${data.detalle}`);
        setDniValidado(false);
        setNombres('');
      } else if (response.status === 503) {
        setDniError(`📡 ${data.detalle || 'No se pudo contactar RENIEC'}`);
        setDniValidado(false);
        setNombres('');
      } else {
        setDniError("DNI no encontrado en RENIEC.");
        setDniValidado(false);
        setNombres('');
      }
    } catch {
      setDniError("Error conectando con el servidor.");
      setDniValidado(false);
    } finally {
      setIsValidando(false);
    }
  };

  const handleFileChange = (e, setFile, setInfo, maxSizeMB = 5, allowedTypes = ['application/pdf', 'image/']) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setInfo('');
    setSubmitError('');

    if (allowedTypes && !allowedTypes.some(type => file.type.startsWith(type))) {
      setInfo('Formato de archivo no permitido.');
      setFile(null);
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setInfo(`El archivo supera el límite de ${maxSizeMB} MB.`);
      setFile(null);
      return;
    }

    setFile(file);
    setInfo(`✓ ${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`);
  };

  const handleFotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoInfo('');
    setSubmitError('');

    if (file.size > 2 * 1024 * 1024) {
      setFotoInfo('La imagen supera el límite de 2 MB.');
      setFoto(null);
      return;
    }

    setFoto(file);
    setFotoInfo(`✓ ${file.name} · ${(file.size / 1024).toFixed(0)} KB`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setPagoError('');

    if (dni.length !== 8) {
      setSubmitError("El DNI debe tener 8 dígitos.");
      return;
    }
    if (!nombres.trim()) {
      setSubmitError("Debe validar su DNI para obtener los nombres.");
      return;
    }
    if (!carrera || !sede) {
      setSubmitError("Complete la sede y carrera académica.");
      return;
    }
    if (!correo || !celular) {
      setSubmitError("Debe ingresar un correo electrónico y celular de contacto.");
      return;
    }
    if (!foto || !titulo || !recibo || !dniAnverso || !dniReverso) {
      setSubmitError("Debe adjuntar todos los documentos requeridos: Foto, Título Profesional, Recibo de Pago y DNI (Anverso y Reverso).");
      return;
    }
    if (titulo && titulo.type !== 'application/pdf') {
      setSubmitError("El Título Profesional debe ser un archivo PDF.");
      return;
    }
    if (recibo && !recibo.type.startsWith('image/') && recibo.type !== 'application/pdf') {
      setSubmitError("El Recibo de Caja debe ser un PDF o una imagen.");
      return;
    }
    if (dniAnverso && !dniAnverso.type.startsWith('image/') && dniAnverso.type !== 'application/pdf') {
      setSubmitError("El DNI Anverso debe ser un PDF o una imagen.");
      return;
    }
    if (dniReverso && !dniReverso.type.startsWith('image/') && dniReverso.type !== 'application/pdf') {
      setSubmitError("El DNI Reverso debe ser un PDF o una imagen.");
      return;
    }
    if (!numeroOperacion.trim() || !fechaPago) {
      setSubmitError("Debe ingresar el número de operación y la fecha de pago del voucher.");
      return;
    }
    if (!terminos) {
      setSubmitError("Debe aceptar la Declaración Jurada para poder enviar su solicitud.");
      return;
    }

    setEnviando(true);

    const formData = new FormData();
      formData.append('dni', dni);
      formData.append('nombres', nombres);
      formData.append('carrera', carrera);
      formData.append('sede', sede);
      formData.append('correo', correo);
      formData.append('celular', celular);
      formData.append('numero_operacion', numeroOperacion);
      formData.append('fecha_pago', fechaPago);
    
    if (foto) formData.append('foto', foto);
    if (titulo) formData.append('titulo', titulo);
    if (recibo) formData.append('voucher', recibo); // Make sure this is voucher? wait, the server expects voucher? In Postular.jsx it was sending 'recibo'. Wait, the serializer expects 'voucher' (or is the field 'voucher' in models mapped to 'recibo' in views?)
    if (recibo) formData.append('recibo', recibo); // I'll keep recibo to not break it.
    if (dniAnverso) formData.append('dni_anverso', dniAnverso);
    if (dniReverso) formData.append('dni_reverso', dniReverso);
    formData.append('banco', 'BN');

    try {
      const url = '/api/postulaciones/';
      
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setSuccess(true);
      } else {
        let errorMsg = "Hubo un error al enviar la solicitud.";
        try {
          const errData = await response.json();
          if (errData.error && (errData.error.includes("número de operación NO figura") || errData.error.includes("ya ha sido registrado"))) {
            setPagoError(errData.error);
            setSubmitError("Por favor revise los datos de su comprobante de pago.");
            return;
          }
          errorMsg = errData.error || errorMsg;
        } catch {
          errorMsg = `Error del servidor (código ${response.status}). Intente nuevamente.`;
        }
        setSubmitError(errorMsg);
      }
    } catch {
      setSubmitError("No se pudo conectar con el servidor. Verifique que el backend esté corriendo.");
    } finally {
      setEnviando(false);
    }
  };

  if (success) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ textAlign: 'center', maxWidth: '500px', padding: '3rem 2rem' }}>
          <CheckCircle2 size={64} color="var(--success)" style={{ margin: '0 auto 1rem auto' }} />
          <h2 style={{ color: 'var(--cip-blue)', marginBottom: '1rem' }}>¡Solicitud Enviada!</h2>
          <p className="text-muted" style={{ marginBottom: '2rem' }}>
            Su expediente ha ingresado a estado de <strong>revisión</strong>. Recibirá una respuesta en los próximos días hábiles.
          </p>
          <button className="btn btn-primary btn-block" onClick={() => navigate('/')}>
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  const shadedStyle = {
    background: '#f8fafc',
    padding: '2rem',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
  };

  const fileNameStyle = {
    fontSize: '0.875rem',
    color: 'var(--cip-blue)',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '200px',
    margin: '0 auto',
  };

  const btnFileStyle = {
    marginTop: '0.75rem',
    borderColor: 'var(--border-color)',
    color: 'var(--text-main)',
    fontSize: '0.75rem',
    padding: '0.25rem 0.75rem',
  };

  return (
    <div className="app-container" style={{ padding: '4rem 2rem 2rem 2rem', position: 'relative' }}>

      <button
        className="btn btn-outline"
        style={{ position: 'absolute', top: '2rem', left: '2rem', color: 'var(--text-muted)', borderColor: 'var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        onClick={() => navigate('/')}
      >
        <ArrowLeft size={18} /> Volver
      </button>

      <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ color: 'var(--cip-blue)', fontSize: '2.25rem', fontWeight: '800' }}>
          Formulario de Colegiatura
        </h1>
        <p className="text-muted" style={{ fontSize: '1.125rem', marginTop: '0.5rem' }}>
          Inicie su trámite de inscripción adjuntando los documentos requeridos.
        </p>
      </div>

      <div className="card" style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'start' }}>

            {/* COLUMNA IZQUIERDA: DOCS 1-3 */}
            <div style={{ ...shadedStyle, margin: '0' }}>
              <h3 style={{ color: 'var(--cip-blue)', marginBottom: '1.5rem', borderBottom: '2px solid var(--cip-red)', paddingBottom: '0.5rem', display: 'inline-block' }}>Documentos Adjuntos</h3>

              {/* 1. Foto */}
              <div className="form-group" style={{ marginTop: '0.5rem' }}>
                <label className="form-label">1. Fotografía Tamaño Pasaporte</label>
                <div className="upload-box">
                  <UploadCloud size={32} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem auto' }} />
                  <p style={fileNameStyle}>{foto ? foto.name : 'Seleccione su foto (máx. 2 MB)'}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Imagen de identificación · máx. 2 MB
                  </p>
                  {fotoInfo && (
                    <p style={{ fontSize: '0.72rem', color: fotoInfo.startsWith('✓') ? '#059669' : '#DC2626', marginTop: '0.3rem', fontWeight: '600' }}>
                      {fotoInfo}
                    </p>
                  )}
                  <input type="file" accept="image/*" style={{ opacity: 0, position: 'absolute', width: '0' }} id="file-foto" onChange={handleFotoChange} />
                  <label htmlFor="file-foto" className="btn btn-outline" style={btnFileStyle}>Seleccionar archivo</label>
                </div>
              </div>

              {/* 2. Título Profesional */}
              <div className="form-group" style={{ marginTop: '1.5rem' }}>
                <label className="form-label">2. Título Profesional</label>
                <div className="upload-box">
                  <UploadCloud size={32} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem auto' }} />
                  <p style={fileNameStyle}>{titulo ? titulo.name : 'Clic para subir documento (PDF)'}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Solo formato PDF · máx. 5 MB</p>
                  {tituloInfo && (
                    <p style={{ fontSize: '0.72rem', color: tituloInfo.startsWith('✓') ? '#059669' : '#DC2626', marginTop: '0.3rem', fontWeight: '600' }}>
                      {tituloInfo}
                    </p>
                  )}
                  <input type="file" accept=".pdf" style={{ opacity: 0, position: 'absolute', width: '0' }} id="file-titulo" onChange={(e) => handleFileChange(e, setTitulo, setTituloInfo, 5, ['application/pdf'], 'Título Profesional')} />
                  <label htmlFor="file-titulo" className="btn btn-outline" style={btnFileStyle}>Seleccionar archivo</label>
                </div>
              </div>

              {/* 3. Recibo y Datos de Pago */}
              <div className="form-group" style={{ marginTop: '1.5rem' }}>
                <label className="form-label">3. Recibo de Pago (S/ 1500.00)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                  {/* Izquierda: Subir archivo */}
                  <div className="upload-box" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <UploadCloud size={32} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem auto' }} />
                    <p style={fileNameStyle}>{recibo ? recibo.name : 'Clic para subir comprobante'}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>PDF o Imagen · máx. 5 MB</p>
                    {reciboInfo && (
                      <p style={{ fontSize: '0.72rem', color: reciboInfo.startsWith('✓') ? '#059669' : '#DC2626', marginTop: '0.3rem', fontWeight: '600' }}>
                        {reciboInfo}
                      </p>
                    )}
                    <input type="file" accept=".pdf,image/*" style={{ opacity: 0, position: 'absolute', width: '0' }} id="file-recibo" onChange={(e) => handleFileChange(e, setRecibo, setReciboInfo, 5, ['application/pdf', 'image/'], 'Recibo de Pago')} />
                    <label htmlFor="file-recibo" className="btn btn-outline" style={{...btnFileStyle, marginTop: 'auto'}}>Seleccionar</label>
                  </div>
                  
                  {/* Derecha: Inputs N° Operación y Fecha */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'white', padding: '1.25rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', height: '100%', justifyContent: 'center' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.4rem' }}>N° Operación</label>
                      <input type="text" className="form-input" style={{ padding: '0.4rem', fontSize: '0.9rem', borderColor: pagoError ? '#DC2626' : '' }} placeholder="Ej: 111111 o 2226AA4" maxLength={15} value={numeroOperacion} onChange={e => { setNumeroOperacion(e.target.value.toUpperCase()); setPagoError(''); }} />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.4rem' }}>Fecha de Pago</label>
                      <input type="date" className="form-input" style={{ padding: '0.4rem', fontSize: '0.9rem', borderColor: pagoError ? '#DC2626' : '' }} value={fechaPago} onChange={e => { setFechaPago(e.target.value); setPagoError(''); }} />
                    </div>
                  </div>
                </div>
                {pagoError && (
                  <div style={{ color: '#DC2626', fontSize: '0.8rem', marginTop: '0.75rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={14} /> {pagoError}
                  </div>
                )}
              </div>

              {/* 4 y 5. DNI */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
                {/* 4. DNI Anverso */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">4. DNI Anverso</label>
                  <div className="upload-box" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <UploadCloud size={32} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem auto' }} />
                    <p style={fileNameStyle}>{dniAnverso ? dniAnverso.name : 'Subir Anverso'}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>PDF o Imagen</p>
                    {dniAnversoInfo && (
                      <p style={{ fontSize: '0.72rem', color: dniAnversoInfo.startsWith('✓') ? '#059669' : '#DC2626', marginTop: '0.3rem', fontWeight: '600' }}>
                        {dniAnversoInfo}
                      </p>
                    )}
                    <input type="file" accept=".pdf,image/*" style={{ opacity: 0, position: 'absolute', width: '0' }} id="file-dni-anverso" onChange={(e) => handleFileChange(e, setDniAnverso, setDniAnversoInfo, 5, ['application/pdf', 'image/'], 'DNI Anverso')} />
                    <label htmlFor="file-dni-anverso" className="btn btn-outline" style={{...btnFileStyle, marginTop: 'auto'}}>Examinar</label>
                  </div>
                </div>

                {/* 5. DNI Reverso */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">5. DNI Reverso</label>
                  <div className="upload-box" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <UploadCloud size={32} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem auto' }} />
                    <p style={fileNameStyle}>{dniReverso ? dniReverso.name : 'Subir Reverso'}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>PDF o Imagen</p>
                    {dniReversoInfo && (
                      <p style={{ fontSize: '0.72rem', color: dniReversoInfo.startsWith('✓') ? '#059669' : '#DC2626', marginTop: '0.3rem', fontWeight: '600' }}>
                        {dniReversoInfo}
                      </p>
                    )}
                    <input type="file" accept=".pdf,image/*" style={{ opacity: 0, position: 'absolute', width: '0' }} id="file-dni-reverso" onChange={(e) => handleFileChange(e, setDniReverso, setDniReversoInfo, 5, ['application/pdf', 'image/'], 'DNI Reverso')} />
                    <label htmlFor="file-dni-reverso" className="btn btn-outline" style={{...btnFileStyle, marginTop: 'auto'}}>Examinar</label>
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA: DATOS PERSONALES */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

              {/* Datos personales */}
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
                      onChange={(e) => { setDni(e.target.value); setDniError(''); setDniValidado(false); setNombres(''); }}
                    />
                    <button type="button" className="btn btn-outline" style={{ borderColor: 'var(--cip-blue)', color: 'var(--cip-blue)' }} onClick={handleValidarDNI} disabled={isValidando || dniValidado}>
                      {isValidando ? <Loader2 size={18} className="spin" /> : <><CheckCircle size={18} style={{ marginRight: '5px' }} /> Validar</>}
                    </button>
                  </div>
                  {dniError && <span style={{ color: 'var(--cip-red)', fontSize: '0.875rem', marginTop: '0.5rem', display: 'block' }}>{dniError}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Nombres y Apellidos Completos</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ background: '#f1f5f9', color: 'var(--cip-blue)', fontWeight: '600', cursor: 'not-allowed' }}
                    placeholder="Se autocompletará tras validar el DNI"
                    value={nombres}
                    readOnly
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Carrera Profesional</label>
                  <select className="form-select" value={carrera} onChange={(e) => setCarrera(e.target.value)}>
                    <option value="">Seleccione una carrera...</option>
                    {carrerasOptions.map(c => (
                      <option key={c.id} value={c.nombre}>{c.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                  <label className="form-label">Sede Departamental</label>
                  <select className="form-select" value={sede} onChange={(e) => setSede(e.target.value)}>
                    <option value="">Seleccione una sede...</option>
                    {sedesOptions.map(s => (
                      <option key={s.id} value={s.nombre}>{s.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                  <label className="form-label">Correo Electrónico</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="ejemplo@correo.com"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Teléfono / Celular</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. 999888777"
                    maxLength={15}
                    value={celular}
                    onChange={(e) => setCelular(e.target.value.replace(/\D/g, ''))}
                  />
                </div>

                {submitError && (
                  <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: '8px', marginTop: '1.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    {submitError}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto 2rem auto', textAlign: 'left', background: '#F8FAFC', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', margin: 0 }}>
                <input 
                  type="checkbox" 
                  style={{ width: '24px', height: '24px', marginTop: '0.1rem' }} 
                  checked={terminos} 
                  onChange={(e) => setTerminos(e.target.checked)} 
                />
                <span style={{ fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                  Declaro bajo juramento que los datos y documentos proporcionados son verdaderos. 
                  Autorizo el tratamiento de mis datos personales según la <strong>Ley N° 29733 (Ley de Protección de Datos Personales)</strong> para los fines inherentes a mi trámite de colegiatura.
                </span>
              </label>
            </div>
            
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '1rem 3rem', fontSize: '1.25rem' }}
              disabled={enviando}
            >
              {enviando ? <Loader2 size={24} className="spin" /> : 'Enviar Expediente a Revisión'}
            </button>
          </div>

        </form>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .upload-box {
          border: 2px dashed var(--cip-red);
          border-radius: 8px;
          padding: 1.5rem;
          text-align: center;
          background: white;
          transition: box-shadow 0.18s, border-color 0.18s;
          cursor: pointer;
        }
        .upload-box:hover {
          border-color: #991b1b;
          box-shadow: 0 0 0 3px rgba(185, 28, 28, 0.18);
        }
        @media (max-width: 768px) {
          .card > form > div:first-child { grid-template-columns: 1fr !important; gap: 2rem !important; }
        }
      ` }} />
    </div>
  );
}
