import { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle, CheckCircle2, Loader2, Smartphone, Banknote } from 'lucide-react';
import ComprobanteModal from '../../components/UI/ComprobanteModal';
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
  const [esMixto, setEsMixto] = useState(false);
  const [montoEfectivo, setMontoEfectivo] = useState('');
  const [metodo1, setMetodo1] = useState('');
  const [monto1, setMonto1] = useState('');
  const [metodo2, setMetodo2] = useState('');
  const [monto2, setMonto2] = useState('');

  const [cargandoQr, setCargandoQr] = useState(false);
  const [qrError, setQrError] = useState('');
  const [flowInitPoint, setFlowInitPoint] = useState(null);
  const [flowToken, setFlowToken] = useState(null);
  const [flowModoMixto, setFlowModoMixto] = useState(false);
  const [qrPagado, setQrPagado] = useState(false);

  const METODOS = [
    { valor: 'YAPE_PLIN', label: 'QR (Yape/Plin)', icono: <Smartphone size={16} /> },
    { valor: 'EFECTIVO', label: 'Efectivo', icono: <Banknote size={16} /> },
  ];

  const [isValidando, setIsValidando] = useState(false);
  const [dniValidado, setDniValidado] = useState(false);
  const [success, setSuccess] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const generarQrMixto = async (monto) => {
    if (cargandoQr) return;
    setCargandoQr(true);
    setQrError('');
    setFlowModoMixto(true);
    setQrPagado(false);

    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/flow/generar-qr/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ email: correo || 'vantofortnite@gmail.com', amount: monto }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setFlowInitPoint(data.url + "?token=" + data.token);
        setFlowToken(data.token);
      } else {
        setQrError(data.error || 'No se pudo generar el QR.');
      }
    } catch (err) {
      setQrError('Error de conexión.');
    } finally {
      setCargandoQr(false);
    }
  };

  const generarQrFlow = async () => {
    if (cargandoQr) return;
    setCargandoQr(true);
    setQrError('');
    setFlowModoMixto(false);
    setQrPagado(false);

    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/flow/generar-qr/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ email: correo || 'vantofortnite@gmail.com', amount: '5' }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setFlowInitPoint(data.url + "?token=" + data.token);
        setFlowToken(data.token);
      } else {
        setQrError(data.error || 'No se pudo generar el QR.');
      }
    } catch (err) {
      setQrError('Error de conexión.');
    } finally {
      setCargandoQr(false);
    }
  };

  // Polling de Flow
  useEffect(() => {
    let intervalId = null;
    if (flowInitPoint && flowToken) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch('/api/flow/confirmar-generico/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
            },
            body: JSON.stringify({ token: flowToken })
          });
          const data = await res.json();
          if (data.status === 2) {
            setFlowInitPoint(null);
            setFlowToken(null);
            setQrPagado(true);
            // In AdminPresencial we don't auto-register because the user must upload files and click register
          } else if (data.error) {
            setFlowInitPoint(null);
            setFlowToken(null);
            setQrError('Error en el pago: ' + data.error);
          }
        } catch (e) {
          console.error('Error polling flow:', e);
        }
      }, 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [flowInitPoint, flowToken]);

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

  const generarComprobante = () => {
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Comprobante de Inscripción</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #000; background: #fff; width: 80mm; margin: 0 auto; padding: 5mm; }
    .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
    .org-name { font-weight: bold; font-size: 14px; margin-bottom: 4px; line-height: 1.2; }
    .org-detail { font-size: 11px; line-height: 1.3; }
    .boleta-box { margin-top: 10px; }
    .boleta-box .tipo { font-weight: bold; font-size: 13px; line-height: 1.2; }
    .boleta-box .numero { font-weight: bold; font-size: 14px; margin-top: 2px; }
    .section { margin-bottom: 10px; }
    .adquirente-row { font-size: 11px; margin-bottom: 2px; }
    .meta-row { font-size: 11px; margin-bottom: 10px; display: flex; justify-content: space-between; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    thead tr { border-bottom: 1px dashed #000; border-top: 1px dashed #000; }
    thead th { padding: 4px 0; text-align: left; font-size: 11px; font-weight: bold; }
    thead th:last-child { text-align: right; }
    tbody tr { border-bottom: none; }
    tbody td { padding: 4px 0; font-size: 11px; vertical-align: top; }
    tbody td:last-child { text-align: right; }
    .totales { border-top: 1px dashed #000; padding-top: 6px; margin-bottom: 15px; }
    .totales-table { width: 100%; margin-bottom: 0; }
    .totales-table tr td { padding: 2px 0; font-size: 11px; }
    .totales-table tr td:last-child { text-align: right; }
    .totales-table tr.total-final td { font-weight: bold; font-size: 14px; padding-top: 4px; }
    .footer { font-size: 10px; text-align: center; margin-top: 15px; border-top: 1px dashed #000; padding-top: 10px; line-height: 1.4; }
    @media print {
      body { width: 80mm; padding: 0; margin: 0; }
      @page { margin: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="org-name">COLEGIO DE INGENIEROS DEL PERU<br/>CONSEJO NACIONAL</div>
    <div class="org-detail">RUC 20138086438</div>
    <div class="org-detail">AV. AREQUIPA 4947 MIRAFLORES - LIMA</div>
    <div class="boleta-box">
      <div class="tipo">BOLETA DE VENTA<br/>ELECTRONICA</div>
      <div class="numero">B001-${Date.now().toString().slice(-8)}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">DATOS DEL ADQUIRENTE</div>
    <div class="adquirente-row">DNI: ${dni || ''}</div>
    <div class="adquirente-row">Nombre: ${nombres || ''}</div>
  </div>

  <div class="meta-row">
    <span>Emision: ${new Date().toISOString().split('T')[0]}</span>
    <span>Moneda: PEN</span>
  </div>

  <table>
    <thead>
      <tr>
        <th>Cant.</th>
        <th>Descripcion</th>
        <th>P. Unit.</th>
        <th>Importe</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td>
          <div style="margin-bottom:2px">Inscripción CIP</div>
        </td>
        <td>5.00</td>
        <td>5.00</td>
      </tr>
    </tbody>
  </table>

  ${esMixto ? `
  <div style="font-size:10px; margin-bottom:10px; border-top: 1px dashed #ccc; padding-top:5px;">
    <strong>Pagos Parciales:</strong><br/>
    - ${metodo1}: S/ ${(parseFloat(monto1)||0).toFixed(2)}<br/>
    - ${metodo2}: S/ ${(parseFloat(monto2)||0).toFixed(2)}
  </div>
  ` : `
  <div style="font-size:10px; margin-bottom:10px; border-top: 1px dashed #ccc; padding-top:5px;">
    <strong>Método de Pago:</strong> ${metodoPago}
  </div>
  `}

  <div class="totales">
    <table class="totales-table">
      <tr><td>Subtotal:</td><td>S/ 5.00</td></tr>
      <tr><td>IGV (18%):</td><td>S/ 0.00</td></tr>
      <tr class="total-final"><td>TOTAL:</td><td>S/ 5.00</td></tr>
    </table>
  </div>

  <div class="footer">
    ¡Gracias por colegiarse en el CIP!<br/>
    Este documento es una representacion impresa de la Boleta de Venta Electronica.
    <br/><br/>
    <button class="no-print" onclick="window.print()" style="padding:10px 20px; font-weight:bold; cursor:pointer; background:#10B981; color:white; border:none; border-radius:5px;">IMPRIMIR BOLETA</button>
  </div>
  
  <script>
    setTimeout(() => { window.print(); }, 500);
  </script>
</body>
</html>`;
    const win = window.open('', '_blank', 'width=400,height=600');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombres || !carrera || !sede || !celular || !foto || !titulo || !dniAnverso || !dniReverso) {
      setErrorMsg("Complete todos los campos requeridos y adjunte los documentos (incluyendo DNI).");
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
    // Validación de Pago
    if (esMixto) {
      if (!metodo1 || !monto1 || !metodo2 || !monto2) {
        setErrorMsg('Debe completar ambos métodos y montos en el pago mixto.'); return;
      }
      if (Math.abs(parseFloat(monto1) + parseFloat(monto2) - 5) > 0.01) {
        setErrorMsg(`La suma de los montos (S/ ${(parseFloat(monto1) || 0) + (parseFloat(monto2) || 0)}) no coincide con el total de inscripción (S/ 5.00).`); return;
      }
      if (metodo1 === metodo2) {
        setErrorMsg('Seleccione métodos diferentes para el pago mixto.'); return;
      }
    } else {
      if (!metodoPago) { setErrorMsg('Seleccione el método de pago.'); return; }
      if (metodoPago === 'EFECTIVO') {
        if (!montoEfectivo || parseFloat(montoEfectivo) !== 5) {
          setErrorMsg('Debe ingresar el monto exacto (S/ 5.00).'); return;
        }
      }
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
      formData.append('correo', correo || `no-reply-${dni}@cip.org.pe`);
      formData.append('celular', celular);
      const metodoFinal = esMixto ? 'MIXTO' : metodoPago;
      formData.append('numero_operacion', `${metodoFinal}-${Date.now()}`); // Use prefix to pass method to backend
      formData.append('fecha_pago', new Date().toISOString().split('T')[0]); // Today's date
      formData.append('banco', metodoFinal);
      if (esMixto) {
        formData.append('pago_parcial_1_metodo', metodo1);
        formData.append('pago_parcial_1_monto', monto1);
        formData.append('pago_parcial_2_metodo', metodo2);
        formData.append('pago_parcial_2_monto', monto2);
      }
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
        // Generar comprobante
        setTimeout(() => generarComprobante(), 500);
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

            <div className="form-group">
              <label className="form-label" style={{ display: 'block', marginBottom: '0.75rem' }}>Método de Pago (S/ 5.00)</label>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Seleccione cómo pagará el colegiado</span>
                <div style={{ display: 'flex', gap: '0.5rem', background: '#F8FAFC', padding: '0.2rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <button type="button" onClick={() => setEsMixto(false)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', fontWeight: '600', borderRadius: '6px', border: 'none', background: !esMixto ? '#10B981' : 'transparent', color: !esMixto ? 'white' : '#64748B', cursor: 'pointer' }}>Único</button>
                  <button type="button" onClick={() => setEsMixto(true)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', fontWeight: '600', borderRadius: '6px', border: 'none', background: esMixto ? '#3B82F6' : 'transparent', color: esMixto ? 'white' : '#64748B', cursor: 'pointer' }}>Mixto</button>
                </div>
              </div>

              {!esMixto ? (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    {METODOS.map(m => (
                      <button 
                        key={m.valor}
                        type="button"
                        className={`btn ${metodoPago === m.valor ? 'btn-primary' : 'btn-outline-dark'}`}
                        onClick={() => setMetodoPago(m.valor)}
                        style={{ flex: 1, padding: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                      >
                        <CheckCircle2 size={18} style={{ opacity: metodoPago === m.valor ? 1 : 0 }} />
                        {m.label}
                      </button>
                    ))}
                  </div>
                  {metodoPago === 'YAPE_PLIN' && !qrPagado && (
                    <div style={{ marginTop: '1rem' }}>
                      <button
                        type="button"
                        onClick={generarQrFlow}
                        disabled={cargandoQr}
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}
                      >
                        {cargandoQr ? <><Loader2 size={20} className="spin" /> Generando QR...</> : <><Smartphone size={20} /> Generar QR de Yape/Plin</>}
                      </button>
                      {qrError && <div style={{ color: '#EF4444', marginTop: '0.5rem', fontSize: '0.875rem', textAlign: 'center' }}>{qrError}</div>}
                    </div>
                  )}
                  {metodoPago === 'YAPE_PLIN' && qrPagado && (
                    <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#D1FAE5', border: '1px solid #10B981', borderRadius: '0.5rem', color: '#065F46', textAlign: 'center', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <CheckCircle2 size={20} />
                      QR Pagado Correctamente
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ background: '#F8FAFF', padding: '1rem', borderRadius: '8px', border: '1px solid #BFDBFE', marginBottom: '1.1rem' }}>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ fontSize: '0.75rem', color: '#1E40AF', fontWeight: '600', marginBottom: '0.25rem', display: 'block' }}>Parte 1</label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <select value={metodo1} onChange={e => { setMetodo1(e.target.value); setQrPagado(false); }} style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #93C5FD', fontSize: '0.8rem' }}>
                        <option value="">Seleccione...</option>
                        {METODOS.map(m => <option key={m.valor} value={m.valor}>{m.label}</option>)}
                      </select>
                      <input type="number" step="0.01" min="0" placeholder="Monto S/" value={monto1} onChange={e => { setMonto1(e.target.value); setQrPagado(false); }} style={{ width: '80px', padding: '0.5rem', borderRadius: '6px', border: '1px solid #93C5FD', fontSize: '0.8rem' }} />
                      {metodo1 === 'YAPE_PLIN' && monto1 && parseFloat(monto1) > 0 && !qrPagado && (
                        <button type="button" onClick={() => generarQrMixto(monto1)} disabled={cargandoQr} style={{ padding: '0.4rem 0.6rem', background: '#3B82F6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>QR</button>
                      )}
                      {metodo1 === 'YAPE_PLIN' && qrPagado && (
                        <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle2 size={14} /> Pagado</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#1E40AF', fontWeight: '600', marginBottom: '0.25rem', display: 'block' }}>Parte 2</label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <select value={metodo2} onChange={e => { setMetodo2(e.target.value); setQrPagado(false); }} style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #93C5FD', fontSize: '0.8rem' }}>
                        <option value="">Seleccione...</option>
                        {METODOS.map(m => <option key={m.valor} value={m.valor}>{m.label}</option>)}
                      </select>
                      <input type="number" step="0.01" min="0" placeholder="Monto S/" value={monto2} onChange={e => { setMonto2(e.target.value); setQrPagado(false); }} style={{ width: '80px', padding: '0.5rem', borderRadius: '6px', border: '1px solid #93C5FD', fontSize: '0.8rem' }} />
                      {metodo2 === 'YAPE_PLIN' && monto2 && parseFloat(monto2) > 0 && !qrPagado && (
                        <button type="button" onClick={() => generarQrMixto(monto2)} disabled={cargandoQr} style={{ padding: '0.4rem 0.6rem', background: '#3B82F6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>QR</button>
                      )}
                      {metodo2 === 'YAPE_PLIN' && qrPagado && (
                        <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle2 size={14} /> Pagado</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!esMixto && metodoPago === 'EFECTIVO' && (
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

            </div>
          </div>

          {errorMsg && (
            <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: '8px', marginTop: '1.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              {errorMsg}
            </div>
          )}

          <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ 
                padding: '1rem 2rem', 
                fontSize: '1.1rem', 
                width: '100%', 
                background: (enviando || !dniValidado || (!esMixto && !metodoPago) || (!esMixto && metodoPago === 'EFECTIVO' && parseFloat(montoEfectivo) !== 5) || (!esMixto && metodoPago === 'YAPE_PLIN' && !qrPagado) || (esMixto && (!metodo1 || !metodo2 || !monto1 || !monto2)) || (esMixto && (metodo1 === 'YAPE_PLIN' || metodo2 === 'YAPE_PLIN') && !qrPagado)) ? '#94a3b8' : '#10B981',
                alignItems: 'center', 
                gap: '0.5rem',
                cursor: (enviando || !dniValidado || (!esMixto && !metodoPago) || (!esMixto && metodoPago === 'EFECTIVO' && parseFloat(montoEfectivo) !== 5) || (!esMixto && metodoPago === 'YAPE_PLIN' && !qrPagado) || (esMixto && (!metodo1 || !metodo2 || !monto1 || !monto2)) || (esMixto && (metodo1 === 'YAPE_PLIN' || metodo2 === 'YAPE_PLIN') && !qrPagado)) ? 'not-allowed' : 'pointer'
              }}
              disabled={
                enviando || !dniValidado ||
                (!esMixto && !metodoPago) ||
                (!esMixto && metodoPago === 'EFECTIVO' && parseFloat(montoEfectivo) !== 5) ||
                (!esMixto && metodoPago === 'YAPE_PLIN' && !qrPagado) ||
                (esMixto && (!metodo1 || !metodo2 || !monto1 || !monto2)) ||
                (esMixto && (metodo1 === 'YAPE_PLIN' || metodo2 === 'YAPE_PLIN') && !qrPagado)
              }
            >
              {enviando ? <><Loader2 size={20} className="spin" /> Procesando...</> : 'Enviar Solicitud a Revisión'}
            </button>
          </div>

        </form>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
      {/* Modal Modal Flow */}
      {flowInitPoint && (
        <ComprobanteModal isOpen={!!flowInitPoint} onClose={() => setFlowInitPoint(null)}>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', width: '100%', maxWidth: '450px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#1E3A8A' }}>Escanea el QR</h3>
            <div style={{ width: '100%', height: '550px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
              <iframe
                src={flowInitPoint}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Pasarela Flow"
              />
            </div>
            <p style={{ marginTop: '1rem', color: '#475569', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
              <Loader2 size={16} className="spin" /> Esperando confirmación de pago...
            </p>
          </div>
        </ComprobanteModal>
      )}

    </div>
  );
}
