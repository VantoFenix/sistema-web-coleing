import re
import sys

filepath = 'MisPagos.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update handleGenerarQR in StepPeriodos
old_handle = """  const handleGenerarQR = async () => {
    setGenerando(true);
    try {
      const token = localStorage.getItem('colToken');
      const periodosArray = Array.from(seleccionados);
      const res = await fetch('/api/pagos/preferencia/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ periodos: periodosArray })
      });
      const data = await res.json();
      if (data.init_point) {
        setQrUrl(data.init_point);
      } else {
        onError(data.error || 'No se pudo generar el código QR.');
        setGenerando(false);
      }
    } catch {
      onError('Error de conexión al generar el QR.');
      setGenerando(false);
    }
  };"""

new_handle = """  const handleGenerarQR = async () => {
    setGenerando(true);
    try {
      const token = localStorage.getItem('colToken');
      const periodosArray = Array.from(seleccionados);
      const res = await fetch('/api/pagos/preferencia/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ periodos: periodosArray })
      });
      const data = await res.json();
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        onError(data.error || 'No se pudo contactar a MercadoPago.');
        setGenerando(false);
      }
    } catch {
      onError('Error de conexión al procesar el pago.');
      setGenerando(false);
    }
  };"""

content = content.replace(old_handle, new_handle)

# 2. Remove the if (qrUrl) block from StepPeriodos entirely
qr_block_regex = r"  // ── Si ya se generó el link de pago.*?Ya pague / Volver\n        </button>\n      </div>\n    \);\n  }"
content = re.sub(qr_block_regex, "", content, flags=re.DOTALL)

# Also remove const [qrUrl, setQrUrl] = useState(null);
content = content.replace("  const [qrUrl, setQrUrl] = useState(null);\n", "")

# 3. Add success check to main MisPagos component
old_mispagos_top = """export default function MisPagos() {
  const [activos, setActivos] = useState([]);
  const [pendientes, setPendientes] = useState([]);
  const [historial, setHistorial] = useState([]);"""

new_mispagos_top = """export default function MisPagos() {
  const [activos, setActivos] = useState([]);
  const [pendientes, setPendientes] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [pagoExitoso, setPagoExitoso] = useState(false);
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('status') === 'approved') {
      setPagoExitoso(true);
      // Limpiar URL para que al recargar no vuelva a salir
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);"""

content = content.replace(old_mispagos_top, new_mispagos_top)

# 4. In MisPagos render, if pagoExitoso is true, show success screen
old_render_start = """  if (cargando) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <Loader2 className="spin" size={32} color="var(--cip-blue)" />
      </div>
    );
  }"""

new_render_start = """  if (cargando) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <Loader2 className="spin" size={32} color="var(--cip-blue)" />
      </div>
    );
  }

  if (pagoExitoso) {
    return (
      <div className="card" style={{ maxWidth: 600, margin: '2rem auto', textAlign: 'center', padding: '3rem 2rem' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
          <CheckCircle2 size={46} color="#059669" />
        </div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--cip-blue)', marginBottom: '1rem' }}>
          ¡Pago Procesado Exitosamente!
        </h2>
        <p style={{ color: '#475569', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '2.5rem' }}>
          Tu pago a través de MercadoPago (Yape/Plin/Tarjeta) ha sido confirmado y procesado con éxito. Tu historial se actualizará en breve.
        </p>
        <button 
          onClick={() => { setPagoExitoso(false); window.location.reload(); }}
          style={{ padding: '1rem 2.5rem', background: 'var(--cip-blue)', color: 'white', fontWeight: '700', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '1.05rem' }}
        >
          Volver a Mis Pagos
        </button>
      </div>
    );
  }"""

content = content.replace(old_render_start, new_render_start)

# 5. Add "Método de Pago" UI box right above the button
old_btn = """      <button
        onClick={handleGenerarQR}"""
        
new_btn = """      <div style={{ background: 'white', borderRadius: '10px', border: '2px solid #E2E8F0', padding: '1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: 48, height: 48, background: '#EFF6FF', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Smartphone size={24} color="#2563EB" />
        </div>
        <div>
          <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--cip-blue)', fontSize: '1rem', fontWeight: '800' }}>Medio de Pago</h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>Yape, Plin o Tarjetas (Vía MercadoPago)</p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <CheckCircle2 size={24} color="#059669" />
        </div>
      </div>
      
      <button
        onClick={handleGenerarQR}"""
        
content = content.replace(old_btn, new_btn)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
