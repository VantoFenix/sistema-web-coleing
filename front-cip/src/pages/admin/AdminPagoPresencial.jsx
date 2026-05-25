import { useState, useRef, useEffect } from 'react';
import {
  Search, User, CheckCircle2, XCircle, Loader2,
  Calendar, CreditCard, AlertCircle, BadgeCheck,
  Banknote, Smartphone, Building2, Wallet, ChevronRight,
} from 'lucide-react';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';

// ── Helpers ────────────────────────────────────────────────────────────────
const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];
const MESES_CORTO = [
  'ENE','FEB','MAR','ABR','MAY','JUN',
  'JUL','AGO','SEP','OCT','NOV','DIC',
];

function fmtPeriodo(p) {
  const [año, mes] = p.split('-');
  return `${MESES[parseInt(mes, 10) - 1]} ${año}`;
}
function fmtPeriodoCorto(p) {
  const mes = parseInt(p.split('-')[1], 10) - 1;
  return MESES_CORTO[mes];
}

function fmtFecha(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const METODOS = [
  { valor: 'TARJETA',       label: 'Tarjeta',       icono: <CreditCard size={16} /> },
  { valor: 'YAPE',          label: 'Yape',          icono: <Smartphone size={16} /> },
  { valor: 'PLIN',          label: 'Plin',          icono: <Smartphone size={16} /> },
  { valor: 'EFECTIVO',      label: 'Efectivo',      icono: <Banknote size={16} /> },
  { valor: 'TRANSFERENCIA', label: 'Transferencia', icono: <Building2 size={16} /> },
];

function BadgeHabilitado({ habilitado }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: '0.25rem 0.7rem', borderRadius: '999px', fontSize: '0.72rem',
      fontWeight: '700',
      background: habilitado ? '#D1FAE5' : '#FEE2E2',
      color: habilitado ? '#065F46' : '#991B1B',
    }}>
      {habilitado ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
      {habilitado ? 'Habilitado' : 'Inhabilitado'}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function AdminPagoPresencial() {
  const [query, setQuery]           = useState('');
  const [buscando, setBuscando]     = useState(false);
  const [resultados, setResultados] = useState(null);
  const [errBusqueda, setErrBusqueda] = useState('');

  const [colegiado, setColegiado]   = useState(null);
  const [deuda, setDeuda]           = useState(null);
  const [cargandoDeuda, setCargandoDeuda] = useState(false);

  const [periodosSeleccionados, setPeriodosSeleccionados] = useState(new Set());
  const [metodo, setMetodo]         = useState('');
  const [monto, setMonto]           = useState('');
  const [errForm, setErrForm]       = useState('');

  const [enviando, setEnviando]     = useState(false);
  const [resultado, setResultado]   = useState(null);
  const [montoMensual, setMontoMensual] = useState(20.00);
  const [mpListo, setMpListo]       = useState(false);

  const searchRef = useRef(null);

  // Cargar precio configurado + public key MP
  useEffect(() => {
    fetch('/api/admin/configuracion/')
      .then(r => r.json())
      .then(d => { if (d.monto_mensualidad) setMontoMensual(parseFloat(d.monto_mensualidad)); })
      .catch(() => {});
    fetch('/api/pagos/mp-config/')
      .then(r => r.json())
      .then(d => { if (d.public_key) { initMercadoPago(d.public_key, { locale: 'es-PE' }); setMpListo(true); } })
      .catch(() => {});
  }, []);

  // Auto-calcular monto
  useEffect(() => {
    if (periodosSeleccionados.size > 0) {
      setMonto((periodosSeleccionados.size * montoMensual).toFixed(2));
    } else {
      setMonto('');
    }
  }, [periodosSeleccionados, montoMensual]);

  const handleBuscar = async () => {
    const q = query.trim();
    if (q.length < 2) { setErrBusqueda('Ingrese al menos 2 caracteres'); return; }
    setErrBusqueda('');
    setBuscando(true);
    setResultados(null);
    try {
      const res = await fetch(`/api/admin/colegiados/buscar/?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResultados(Array.isArray(data) ? data : []);
    } catch {
      setErrBusqueda('Error de conexión con el servidor.');
    } finally {
      setBuscando(false);
    }
  };

  const handleSeleccionarColegiado = async (col) => {
    setColegiado(col);
    setResultados(null);
    setQuery('');
    setPeriodosSeleccionados(new Set());
    setMetodo('');
    setMonto('');
    setErrForm('');
    setResultado(null);
    setCargandoDeuda(true);
    try {
      const res = await fetch(`/api/admin/colegiados/${col.id}/deuda/`);
      const data = await res.json();
      setDeuda(data);
      const periodos = data.periodos || data.periodos_pendientes || [];
      const soloDeuda = periodos.filter(p => p.estado === 'PENDIENTE').map(p => p.periodo);
      setPeriodosSeleccionados(new Set(soloDeuda));
    } catch {
      setDeuda({ periodos: [], periodos_pendientes: [], total_deuda: 0 });
    } finally {
      setCargandoDeuda(false);
    }
  };

  const getPeriodos     = () => deuda?.periodos || [];
  const getPendientes   = () => getPeriodos().filter(p => p.estado === 'PENDIENTE').map(p => p.periodo);
  const hayDeudaSinPagar = () => getPendientes().some(p => !periodosSeleccionados.has(p));

  const togglePeriodo = (periodo, estado) => {
    const pendientes  = getPendientes();
    const allPeriodos = getPeriodos();
    setPeriodosSeleccionados(prev => {
      const s = new Set(prev);
      if (estado === 'PENDIENTE') {
        const todasSel = pendientes.every(p => s.has(p));
        if (todasSel) return new Set();
        pendientes.forEach(p => s.add(p));
        return s;
      }
      if (estado === 'MES_ACTUAL' || estado === 'ADELANTO') {
        if (s.has(periodo)) {
          const idx = allPeriodos.findIndex(p => p.periodo === periodo);
          allPeriodos.slice(idx).forEach(p => { if (p.estado !== 'PAGADO') s.delete(p.periodo); });
          return s;
        } else {
          for (const p of allPeriodos) {
            if (p.periodo === periodo) break;
            if (p.estado !== 'PAGADO') s.add(p.periodo);
          }
          s.add(periodo);
          return s;
        }
      }
      return s;
    });
  };

  const seleccionarTodos     = () => setPeriodosSeleccionados(new Set(getPeriodos().filter(p => p.estado !== 'PAGADO').map(p => p.periodo)));
  const seleccionarSoloDeuda = () => setPeriodosSeleccionados(new Set(getPendientes()));
  const deseleccionarTodos   = () => setPeriodosSeleccionados(new Set());

  const handleRegistrar = async () => {
    setErrForm('');
    if (periodosSeleccionados.size === 0) { setErrForm('Seleccione al menos un periodo.'); return; }
    if (!metodo)  { setErrForm('Seleccione el método de pago.'); return; }
    if (metodo === 'TARJETA') return; // la tarjeta tiene su propio submit via CardPayment Brick
    if (!monto || isNaN(parseFloat(monto)) || parseFloat(monto) <= 0) {
      setErrForm('Ingrese un monto válido mayor a 0.'); return;
    }
    setEnviando(true);
    try {
      const res = await fetch('/api/admin/pagos/presencial/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          colegiado_id: colegiado.id,
          periodos: [...periodosSeleccionados].sort(),
          monto: parseFloat(monto),
          metodo,
          fecha_pago: new Date().toISOString().slice(0, 10),
        }),
      });
      const data = await res.json();
      if (res.ok) setResultado({ ok: true, ...data });
      else setErrForm(data.error || 'Error al registrar el pago.');
    } catch {
      setErrForm('Error de conexión con el servidor.');
    } finally {
      setEnviando(false);
    }
  };

  const handleTarjetaSubmit = async (formData) => {
    setErrForm('');
    setEnviando(true);
    try {
      const res = await fetch('/api/admin/pagos/tarjeta/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          colegiado_id:      colegiado.id,
          token:             formData.token,
          payment_method_id: formData.payment_method_id,
          installments:      formData.installments,
          issuer_id:         formData.issuer_id,
          periodos:          [...periodosSeleccionados].sort(),
          monto:             parseFloat(monto),
          email:             formData.payer?.email || 'pagador@cip.org.pe',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) setResultado({ ok: true, ...data });
      else setErrForm(data.error || 'No se pudo procesar el pago con tarjeta.');
    } catch {
      setErrForm('Error de conexión con el servidor.');
    } finally {
      setEnviando(false);
    }
  };

  const handleNuevoPago = () => {
    setColegiado(null); setDeuda(null); setResultado(null);
    setQuery(''); setResultados(null); setErrBusqueda(''); setErrForm('');
    setTimeout(() => searchRef.current?.focus(), 100);
  };

  const recargarDeuda = () => {
    setCargandoDeuda(true);
    setResultado(null);
    fetch(`/api/admin/colegiados/${colegiado.id}/deuda/`)
      .then(r => r.json())
      .then(d => {
        setDeuda(d);
        const pp = d.periodos || d.periodos_pendientes || [];
        setPeriodosSeleccionados(new Set(pp.filter(p => (p.estado ?? 'PENDIENTE') === 'PENDIENTE').map(p => p.periodo)));
      })
      .finally(() => setCargandoDeuda(false));
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RESULTADO EXITOSO
  // ═══════════════════════════════════════════════════════════════════════════
  if (resultado?.ok) {
    return (
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        {/* Cabecera */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--cip-blue)', marginBottom: '0.25rem' }}>
            ✅ Pago Registrado
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Los periodos han sido marcados como pagados correctamente.</p>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #10B981', padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.75rem' }}>
            <div style={{ background: '#D1FAE5', padding: '1rem', borderRadius: '50%', color: '#059669', flexShrink: 0 }}>
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#065F46' }}>Pago registrado con éxito</h2>
              <p style={{ color: '#047857', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                {resultado.total_registrado} periodo{resultado.total_registrado !== 1 ? 's' : ''} abonado{resultado.total_registrado !== 1 ? 's' : ''} para{' '}
                <strong>{resultado.colegiado}</strong>
              </p>
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem' }}>
              Periodos pagados
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {resultado.periodos_registrados.map(p => (
                <span key={p} style={{ background: '#D1FAE5', color: '#065F46', padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.82rem', fontWeight: '600' }}>
                  {fmtPeriodo(p)}
                </span>
              ))}
            </div>
          </div>

          {resultado.ya_existian?.length > 0 && (
            <div style={{ marginBottom: '1rem', background: '#FEF3C7', borderRadius: '8px', padding: '0.75rem', fontSize: '0.8rem', color: '#92400E' }}>
              <strong>⚠️ Ya tenían pago registrado:</strong>{' '}
              {resultado.ya_existian.map(p => fmtPeriodo(p)).join(', ')}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: resultado.habilitado_nuevo ? '#D1FAE5' : '#FEF3C7', borderRadius: '8px', marginBottom: '1.75rem' }}>
            {resultado.habilitado_nuevo ? <BadgeCheck size={20} color="#059669" /> : <AlertCircle size={20} color="#D97706" />}
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: resultado.habilitado_nuevo ? '#065F46' : '#92400E' }}>
              {resultado.habilitado_nuevo
                ? 'El colegiado ahora está HABILITADO'
                : 'El colegiado aún tiene meses pendientes (sigue inhabilitado)'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={handleNuevoPago} className="btn btn-primary" style={{ flex: 1 }}>
              Registrar otro pago
            </button>
            <button onClick={recargarDeuda} className="btn btn-outline" style={{ flex: 1, borderColor: 'var(--cip-blue)', color: 'var(--cip-blue)' }}>
              Ver deuda restante
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADO INICIAL: sin colegiado seleccionado
  // ═══════════════════════════════════════════════════════════════════════════
  if (!colegiado) {
    return (
      <div>
        {/* Cabecera */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--cip-blue)', marginBottom: '0.25rem' }}>
            Registrar Pago Presencial
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Yape, Plin, efectivo o transferencia. Busque el colegiado para comenzar.
          </p>
        </div>

        {/* Panel de búsqueda centrado y amplio */}
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div className="card" style={{ padding: '2rem' }}>
            {/* Icono + título */}
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div style={{ display: 'inline-flex', background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)', borderRadius: '50%', padding: '1.25rem', marginBottom: '1rem' }}>
                <Wallet size={32} color="white" />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--cip-blue)', marginBottom: '0.3rem' }}>
                Buscar Colegiado
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Ingrese DNI, nombre completo o número CIP
              </p>
            </div>

            {/* Input */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: errBusqueda ? '0.5rem' : '0' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  ref={searchRef}
                  type="text"
                  className="form-input"
                  placeholder="Ej. 71234567 · Juan Pérez · 12345"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setErrBusqueda(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleBuscar()}
                  style={{ paddingLeft: '2.5rem', fontSize: '1rem', height: '48px' }}
                  autoFocus
                />
              </div>
              <button
                onClick={handleBuscar}
                disabled={buscando}
                className="btn btn-primary"
                style={{ height: '48px', padding: '0 1.5rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
              >
                {buscando ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
                Buscar
              </button>
            </div>

            {errBusqueda && (
              <p style={{ color: '#DC2626', fontSize: '0.82rem', marginTop: '0.5rem' }}>{errBusqueda}</p>
            )}

            {/* Resultados */}
            {resultados !== null && (
              <div style={{ marginTop: '1.25rem' }}>
                {resultados.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', background: '#F8FAFC', borderRadius: '10px', border: '1px dashed var(--border-color)' }}>
                    <User size={36} style={{ margin: '0 auto 0.6rem auto', display: 'block', opacity: 0.25 }} />
                    <p style={{ fontWeight: '600', marginBottom: '0.2rem' }}>Sin resultados</p>
                    <p style={{ fontSize: '0.82rem' }}>No se encontraron colegiados con ese criterio.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.1rem' }}>
                      {resultados.length} resultado{resultados.length !== 1 ? 's' : ''} encontrado{resultados.length !== 1 ? 's' : ''}
                    </p>
                    {resultados.map(col => (
                      <button
                        key={col.id}
                        onClick={() => handleSeleccionarColegiado(col)}
                        style={{
                          background: 'white', border: '1.5px solid var(--border-color)', borderRadius: '10px',
                          padding: '0.9rem 1.1rem', textAlign: 'left', cursor: 'pointer',
                          transition: 'all 0.15s', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cip-blue)'; e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.transform = 'translateX(2px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'white'; e.currentTarget.style.transform = 'none'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div style={{ background: 'var(--cip-blue)', color: 'white', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.85rem', fontWeight: '700' }}>
                            {col.nombres.charAt(0)}
                          </div>
                          <div>
                            <p style={{ fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.2rem' }}>{col.nombres}</p>
                            <p style={{ fontSize: '0.77rem', color: 'var(--text-muted)' }}>DNI {col.dni} · CIP {col.nro_colegiado} · {col.carrera}</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem', flexShrink: 0 }}>
                          <BadgeHabilitado habilitado={col.habilitado} />
                          <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADO PRINCIPAL: colegiado seleccionado — layout full screen
  // ═══════════════════════════════════════════════════════════════════════════

  const todosLosPeriodos = getPeriodos();
  const hayPeriodosNoPagados = todosLosPeriodos.some(p => p.estado !== 'PAGADO');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>

      {/* ── BANNER SUPERIOR: info del colegiado ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)',
        borderRadius: '12px', padding: '1.25rem 1.75rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '1.5rem', gap: '1rem',
      }}>
        {/* Info colegiado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', borderRadius: '50%', width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.25rem', fontWeight: '800', color: 'white' }}>
            {colegiado.nombres.charAt(0)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.2rem' }}>
              <p style={{ fontWeight: '800', color: 'white', fontSize: '1.1rem', margin: 0 }}>{colegiado.nombres}</p>
              <BadgeHabilitado habilitado={colegiado.habilitado} />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem', margin: 0 }}>
              DNI {colegiado.dni} &nbsp;·&nbsp; CIP {colegiado.nro_colegiado} &nbsp;·&nbsp; {colegiado.carrera}
              {colegiado.colegiado_desde && <span> &nbsp;·&nbsp; Colegiado desde {fmtFecha(colegiado.colegiado_desde)}</span>}
            </p>
          </div>
        </div>

        {/* Acciones + resumen deuda */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexShrink: 0 }}>
          {deuda && deuda.total_deuda > 0 && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#F59E0B', fontSize: '1.5rem', fontWeight: '800', margin: 0, lineHeight: 1 }}>{deuda.total_deuda}</p>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem', margin: 0, marginTop: '0.15rem' }}>mes{deuda.total_deuda !== 1 ? 'es' : ''} de deuda</p>
            </div>
          )}
          {deuda && deuda.total_deuda > 0 && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#F87171', fontSize: '1.5rem', fontWeight: '800', margin: 0, lineHeight: 1 }}>S/ {(deuda.total_deuda * montoMensual).toFixed(0)}</p>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem', margin: 0, marginTop: '0.15rem' }}>total adeudado</p>
            </div>
          )}
          <button
            onClick={() => { setColegiado(null); setDeuda(null); setResultado(null); }}
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600', transition: 'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
          >
            ← Cambiar
          </button>
        </div>
      </div>

      {/* ── CUERPO PRINCIPAL: 2 columnas ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem', alignItems: 'start' }}>

        {/* ═══ COLUMNA IZQUIERDA: Calendario de periodos ═══════════════════ */}
        <div className="card" style={{ padding: '1.5rem' }}>
          {/* Cabecera del calendario */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--cip-blue)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Calendar size={18} /> Periodos del Año {new Date().getFullYear()}
              </h3>
              {periodosSeleccionados.size > 0 && (
                <p style={{ fontSize: '0.78rem', color: '#059669', fontWeight: '600', marginTop: '0.25rem', margin: '0.25rem 0 0 0' }}>
                  {periodosSeleccionados.size} periodo{periodosSeleccionados.size !== 1 ? 's' : ''} seleccionado{periodosSeleccionados.size !== 1 ? 's' : ''} · S/ {(periodosSeleccionados.size * montoMensual).toFixed(2)}
                </p>
              )}
            </div>

            {/* Botones de selección rápida */}
            {deuda && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={seleccionarSoloDeuda}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1.5px solid #FCA5A5', background: '#FEF2F2', color: '#B91C1C', cursor: 'pointer', fontWeight: '600', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#FEF2F2'; }}
                >
                  Solo deudas
                </button>
                <button
                  onClick={seleccionarTodos}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1.5px solid #BFDBFE', background: '#EFF6FF', color: '#1D4ED8', cursor: 'pointer', fontWeight: '600', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#DBEAFE'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#EFF6FF'; }}
                >
                  Todos
                </button>
                <button
                  onClick={deseleccionarTodos}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', cursor: 'pointer', fontWeight: '600', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; }}
                >
                  Ninguno
                </button>
              </div>
            )}
          </div>

          {/* Grilla de meses */}
          {cargandoDeuda ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <Loader2 size={32} className="spin" style={{ color: 'var(--text-muted)', margin: '0 auto', display: 'block' }} />
              <p style={{ color: 'var(--text-muted)', marginTop: '0.75rem', fontSize: '0.9rem' }}>Cargando periodos…</p>
            </div>
          ) : todosLosPeriodos.every(p => p.estado === 'PAGADO') ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', background: '#F0FDF4', borderRadius: '10px', color: '#15803D' }}>
              <CheckCircle2 size={36} style={{ margin: '0 auto 0.75rem auto', display: 'block' }} />
              <p style={{ fontWeight: '800', fontSize: '1.1rem', marginBottom: '0.25rem' }}>¡Sin deuda pendiente!</p>
              <p style={{ fontSize: '0.85rem', color: '#166534' }}>Todos los meses están al día.</p>
            </div>
          ) : (
            /* Agrupado por año — solo meses no pagados */
            (() => {
              // Excluir meses ya pagados y agrupar por año
              const porAño = {};
              todosLosPeriodos
                .filter(p => p.estado !== 'PAGADO')
                .forEach(p => {
                  const año = p.periodo.split('-')[0];
                  if (!porAño[año]) porAño[año] = [];
                  porAño[año].push(p);
                });
              const años = Object.keys(porAño).sort();

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {años.map(año => {
                    const mesesDelAño = porAño[año];

                    return (
                      <div key={año}>
                        {/* Separador de año */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
                          <span style={{
                            background: 'var(--cip-blue)', color: 'white',
                            fontSize: '0.75rem', fontWeight: '800', padding: '0.2rem 0.65rem',
                            borderRadius: '6px', letterSpacing: '0.5px',
                          }}>{año}</span>
                          <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
                        </div>

                        {/* Meses del año: 6 por fila */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.4rem' }}>
                          {mesesDelAño.map(p => {
                            const estado      = p.estado || 'PENDIENTE';
                            const pagado      = estado === 'PAGADO';
                            const esPendiente = estado === 'PENDIENTE';
                            const esMesActual = estado === 'MES_ACTUAL';
                            const esAdelanto  = estado === 'ADELANTO';
                            const sel         = periodosSeleccionados.has(p.periodo);
                            const bloqueado   = esAdelanto && hayDeudaSinPagar();

                            let paleta;
                            if (pagado) {
                              paleta = { bg: '#F0FDF4', border: '#86EFAC', txt: '#15803D', accent: '#16A34A', tagBg: '#DCFCE7', tagTxt: '#15803D' };
                            } else if (esPendiente) {
                              paleta = sel
                                ? { bg: '#FFF1F2', border: '#F87171', txt: '#991B1B', accent: '#DC2626', tagBg: '#FEE2E2', tagTxt: '#991B1B' }
                                : { bg: '#FEF2F2', border: '#FCA5A5', txt: '#B91C1C', accent: '#DC2626', tagBg: '#FEE2E2', tagTxt: '#991B1B' };
                            } else if (esMesActual) {
                              paleta = sel
                                ? { bg: '#FFFBEB', border: '#F59E0B', txt: '#78350F', accent: '#D97706', tagBg: '#FEF3C7', tagTxt: '#92400E' }
                                : { bg: '#FFFDF5', border: '#FCD34D', txt: '#92400E', accent: '#D97706', tagBg: '#FEF3C7', tagTxt: '#92400E' };
                            } else {
                              paleta = sel
                                ? { bg: '#EFF6FF', border: '#3B82F6', txt: '#1E40AF', accent: '#2563EB', tagBg: '#DBEAFE', tagTxt: '#1D4ED8' }
                                : { bg: '#F8FAFF', border: '#BFDBFE', txt: '#3B82F6', accent: '#2563EB', tagBg: '#DBEAFE', tagTxt: '#1D4ED8' };
                            }

                            return (
                              <div
                                key={p.periodo}
                                title={
                                  pagado      ? 'Ya pagado' :
                                  esPendiente ? 'Deuda — se paga en bloque con todos los meses adeudados' :
                                  esMesActual ? 'Mes en curso — plazo hasta fin de mes para pagar' :
                                  bloqueado   ? 'Primero paga las deudas atrasadas' :
                                  'Pago anticipado'
                                }
                                onClick={() => { if (!pagado) togglePeriodo(p.periodo, estado); }}
                                style={{
                                  background: paleta.bg,
                                  border: `2px solid ${sel && !pagado ? paleta.accent : paleta.border}`,
                                  borderRadius: '7px',
                                  padding: '0.45rem 0.3rem',
                                  cursor: pagado ? 'default' : bloqueado ? 'not-allowed' : 'pointer',
                                  transition: 'all 0.15s',
                                  opacity: pagado ? 0.7 : bloqueado ? 0.4 : 1,
                                  userSelect: 'none',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '0.22rem',
                                  boxShadow: sel && !pagado ? `0 0 0 2px ${paleta.accent}40` : 'none',
                                  transform: sel && !pagado ? 'scale(1.03)' : 'scale(1)',
                                }}
                              >
                                <p style={{ fontSize: '0.78rem', fontWeight: '800', color: paleta.txt, margin: 0, letterSpacing: '0.3px' }}>
                                  {fmtPeriodoCorto(p.periodo)}
                                </p>
                                {pagado ? (
                                  <CheckCircle2 size={12} color={paleta.accent} />
                                ) : (
                                  <input
                                    type="checkbox"
                                    checked={sel}
                                    readOnly
                                    style={{ accentColor: paleta.accent, width: 12, height: 12, pointerEvents: 'none' }}
                                  />
                                )}
                                <span style={{
                                  fontSize: '0.56rem', fontWeight: '700', padding: '0.08rem 0.3rem',
                                  borderRadius: '999px', background: paleta.tagBg, color: paleta.tagTxt,
                                  textTransform: 'uppercase', letterSpacing: '0.2px', whiteSpace: 'nowrap',
                                }}>
                                  {pagado ? 'pagado' : esPendiente ? 'deuda' : esMesActual ? 'pagar' : 'adelanto'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}
        </div>

        {/* ═══ COLUMNA DERECHA: Formulario de pago (sticky) ════════════════ */}
        <div style={{ position: 'sticky', top: '1rem' }}>
          {!hayPeriodosNoPagados ? (
            /* Todo pagado */
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem', background: '#F0FDF4', border: '2px solid #86EFAC' }}>
              <CheckCircle2 size={48} style={{ margin: '0 auto 1rem auto', display: 'block', color: '#16A34A' }} />
              <p style={{ fontWeight: '800', color: '#065F46', fontSize: '1.1rem', marginBottom: '0.4rem' }}>¡Al día!</p>
              <p style={{ fontSize: '0.85rem', color: '#166534' }}>Este colegiado no tiene pendientes.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--cip-blue)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.45rem', borderBottom: '2px solid var(--cip-red)', paddingBottom: '0.5rem' }}>
                <CreditCard size={18} /> Detalle del Pago
              </h3>

              {/* Resumen de selección */}
              {periodosSeleccionados.size > 0 ? (
                <div style={{ background: 'linear-gradient(135deg, #059669, #10B981)', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.25rem', color: 'white' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.82rem', opacity: 0.9 }}>{periodosSeleccionados.size} mes{periodosSeleccionados.size !== 1 ? 'es' : ''} × S/ {montoMensual.toFixed(2)}</span>
                    <strong style={{ fontSize: '1.4rem', fontWeight: '800' }}>S/ {(periodosSeleccionados.size * montoMensual).toFixed(2)}</strong>
                  </div>
                  <p style={{ fontSize: '0.72rem', opacity: 0.75, margin: 0 }}>Total calculado automáticamente</p>
                </div>
              ) : (
                <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem', textAlign: 'center', border: '1.5px dashed #CBD5E1' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Seleccione meses del calendario</p>
                </div>
              )}

              {/* Método de pago */}
              <div className="form-group" style={{ marginBottom: '1.1rem' }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Método de Pago</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                  {METODOS.map(m => (
                    <button
                      key={m.valor}
                      type="button"
                      onClick={() => { setMetodo(m.valor); setErrForm(''); }}
                      style={{
                        padding: '0.55rem 0.3rem', borderRadius: '8px', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.22rem',
                        border: `2px solid ${metodo === m.valor ? (m.valor === 'TARJETA' ? '#2563EB' : 'var(--cip-blue)') : 'var(--border-color)'}`,
                        background: metodo === m.valor ? (m.valor === 'TARJETA' ? '#EFF6FF' : '#EFF6FF') : 'white',
                        color: metodo === m.valor ? (m.valor === 'TARJETA' ? '#1D4ED8' : 'var(--cip-blue)') : 'var(--text-main)',
                        fontWeight: metodo === m.valor ? '700' : '400',
                        fontSize: '0.72rem', transition: 'all 0.15s',
                      }}
                    >
                      {m.icono}
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Monto editable (solo si NO es tarjeta, que lo calcula MP) */}
              {metodo !== 'TARJETA' && (
                <div className="form-group" style={{ marginBottom: '1.1rem' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Monto Total (S/.)</span>
                    {periodosSeleccionados.size > 0 && (
                      <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: '600', background: '#D1FAE5', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Auto</span>
                    )}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.9rem' }}>S/</span>
                    <input
                      type="number" step="0.01" min="0"
                      className="form-input"
                      value={monto}
                      onChange={e => setMonto(e.target.value)}
                      style={{ paddingLeft: '2.2rem', borderColor: periodosSeleccionados.size > 0 ? '#86EFAC' : undefined }}
                      placeholder="0.00"
                    />
                  </div>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Ajustable si es necesario</p>
                </div>
              )}

              {/* ── CardPayment Brick (solo cuando metodo === TARJETA) ── */}
              {metodo === 'TARJETA' && periodosSeleccionados.size > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  {/* Monto destacado */}
                  <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '0.65rem 1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: '#3B82F6', fontWeight: '600' }}>
                      {periodosSeleccionados.size} mes{periodosSeleccionados.size !== 1 ? 'es' : ''} × S/ {montoMensual.toFixed(2)}
                    </span>
                    <strong style={{ fontSize: '1.2rem', color: '#1D4ED8' }}>S/ {monto || '0.00'}</strong>
                  </div>

                  {mpListo ? (
                    <CardPayment
                      initialization={{ amount: parseFloat(monto) || 0 }}
                      customization={{ paymentMethods: { minInstallments: 1, maxInstallments: 1 } }}
                      onSubmit={handleTarjetaSubmit}
                      onError={(err) => setErrForm(err.message || 'Error en la pasarela de pago.')}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                      <Loader2 size={24} className="spin" style={{ margin: '0 auto', display: 'block', color: 'var(--text-muted)' }} />
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Cargando pasarela…</p>
                    </div>
                  )}
                </div>
              )}

              {/* Resumen rápido (solo metodos no-tarjeta) */}
              {metodo !== 'TARJETA' && periodosSeleccionados.size > 0 && monto && metodo && (
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', color: 'var(--text-muted)' }}>
                    <span>Periodos:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{periodosSeleccionados.size}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', color: 'var(--text-muted)' }}>
                    <span>Total:</span>
                    <strong style={{ color: '#059669', fontSize: '0.9rem' }}>S/ {parseFloat(monto).toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                    <span>Vía:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{METODOS.find(m => m.valor === metodo)?.label}</strong>
                  </div>
                </div>
              )}

              {/* Error */}
              {errForm && (
                <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.65rem 0.85rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.82rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  {errForm}
                </div>
              )}

              {/* Botón confirmar (solo metodos no-tarjeta) */}
              {metodo !== 'TARJETA' && (
                <button
                  onClick={handleRegistrar}
                  disabled={enviando || periodosSeleccionados.size === 0}
                  className="btn btn-block"
                  style={{
                    padding: '0.9rem', fontSize: '0.95rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    background: (enviando || periodosSeleccionados.size === 0) ? '#94A3B8' : '#10B981',
                    border: 'none', borderRadius: '10px', color: 'white',
                    fontWeight: '700', cursor: (enviando || periodosSeleccionados.size === 0) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!enviando && periodosSeleccionados.size > 0) e.currentTarget.style.background = '#059669'; }}
                  onMouseLeave={e => { if (!enviando && periodosSeleccionados.size > 0) e.currentTarget.style.background = '#10B981'; }}
                >
                  {enviando
                    ? <><Loader2 size={18} className="spin" /> Registrando…</>
                    : <><CheckCircle2 size={18} /> Confirmar y Registrar</>
                  }
                </button>
              )}
            </div>
          )}
        </div>

      </div>{/* fin grid */}
    </div>
  );
}
