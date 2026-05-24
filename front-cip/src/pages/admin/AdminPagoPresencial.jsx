import { useState, useRef } from 'react';
import {
  Search, User, CheckCircle2, XCircle, ChevronRight, Loader2,
  Calendar, CreditCard, Hash, ArrowLeft, AlertCircle, BadgeCheck,
  Banknote, Smartphone, Building2, Wallet,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────
const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

function fmtPeriodo(p) {
  const [año, mes] = p.split('-');
  return `${MESES[parseInt(mes, 10) - 1]} ${año}`;
}

function fmtFecha(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const METODOS = [
  { valor: 'YAPE',          label: 'Yape',          icono: <Smartphone size={18} /> },
  { valor: 'PLIN',          label: 'Plin',          icono: <Smartphone size={18} /> },
  { valor: 'EFECTIVO',      label: 'Efectivo',      icono: <Banknote size={18} /> },
  { valor: 'TRANSFERENCIA', label: 'Transferencia', icono: <Building2 size={18} /> },
];

// ── Badge habilitación ─────────────────────────────────────────────────────
function BadgeHabilitado({ habilitado }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem',
      fontWeight: '700', letterSpacing: '0.3px',
      background: habilitado ? '#D1FAE5' : '#FEE2E2',
      color: habilitado ? '#065F46' : '#991B1B',
    }}>
      {habilitado ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
      {habilitado ? 'Habilitado' : 'Inhabilitado'}
    </span>
  );
}

// ── Tarjeta de colegiado seleccionado ──────────────────────────────────────
function TarjetaColegiado({ col, onCambiar }) {
  return (
    <div style={{
      background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px',
      padding: '1rem 1.25rem', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <div style={{ background: 'var(--cip-blue)', color: 'white', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <User size={20} />
        </div>
        <div>
          <p style={{ fontWeight: '700', color: 'var(--cip-blue)', marginBottom: '0.15rem' }}>
            {col.nombres}
          </p>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            DNI {col.dni} · CIP {col.nro_colegiado} · {col.carrera}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
            Colegiado desde {fmtFecha(col.colegiado_desde)}
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
        <BadgeHabilitado habilitado={col.habilitado} />
        <button
          onClick={onCambiar}
          style={{ fontSize: '0.75rem', color: 'var(--cip-blue)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
        >
          Cambiar
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function AdminPagoPresencial() {
  // ── Paso 1: Búsqueda ──────────────────────────────────────────────────────
  const [query, setQuery]           = useState('');
  const [buscando, setBuscando]     = useState(false);
  const [resultados, setResultados] = useState(null); // null = sin buscar, [] = sin resultados
  const [errBusqueda, setErrBusqueda] = useState('');

  // ── Colegiado seleccionado ─────────────────────────────────────────────────
  const [colegiado, setColegiado]   = useState(null); // objeto completo
  const [deuda, setDeuda]           = useState(null); // { periodos_pendientes, total_deuda }
  const [cargandoDeuda, setCargandoDeuda] = useState(false);

  // ── Paso 2: Formulario de pago ─────────────────────────────────────────────
  const [periodosSeleccionados, setPeriodosSeleccionados] = useState(new Set());
  const [metodo, setMetodo]         = useState('');
  const [monto, setMonto]           = useState('');
  const [nroOp, setNroOp]           = useState('');
  const [fechaPago, setFechaPago]   = useState(() => new Date().toISOString().slice(0, 10));
  const [errForm, setErrForm]       = useState('');

  // ── Paso 3: Resultado ─────────────────────────────────────────────────────
  const [enviando, setEnviando]     = useState(false);
  const [resultado, setResultado]   = useState(null); // { success, ... }

  const searchRef = useRef(null);

  // ── Buscar colegiado ───────────────────────────────────────────────────────
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
    } catch (e) {
      setErrBusqueda('Error de conexión con el servidor.');
    } finally {
      setBuscando(false);
    }
  };

  // ── Seleccionar colegiado → cargar deuda ──────────────────────────────────
  const handleSeleccionarColegiado = async (col) => {
    setColegiado(col);
    setResultados(null);
    setQuery('');
    setPeriodosSeleccionados(new Set());
    setMetodo('');
    setMonto('');
    setNroOp('');
    setFechaPago(new Date().toISOString().slice(0, 10));
    setErrForm('');
    setResultado(null);
    setCargandoDeuda(true);
    try {
      const res = await fetch(`/api/admin/colegiados/${col.id}/deuda/`);
      const data = await res.json();
      setDeuda(data);
      // Pre-seleccionar todos los periodos pendientes
      setPeriodosSeleccionados(new Set(data.periodos_pendientes.map(p => p.periodo)));
    } catch (e) {
      setDeuda({ periodos_pendientes: [], total_deuda: 0 });
    } finally {
      setCargandoDeuda(false);
    }
  };

  // ── Toggle periodo ─────────────────────────────────────────────────────────
  const togglePeriodo = (periodo) => {
    setPeriodosSeleccionados(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(periodo)) nuevo.delete(periodo);
      else nuevo.add(periodo);
      return nuevo;
    });
  };

  const seleccionarTodos = () =>
    setPeriodosSeleccionados(new Set(deuda.periodos_pendientes.map(p => p.periodo)));

  const deseleccionarTodos = () =>
    setPeriodosSeleccionados(new Set());

  // ── Registrar pago ─────────────────────────────────────────────────────────
  const handleRegistrar = async () => {
    setErrForm('');
    if (periodosSeleccionados.size === 0) { setErrForm('Seleccione al menos un periodo.'); return; }
    if (!metodo)  { setErrForm('Seleccione el método de pago.'); return; }
    if (!monto || isNaN(parseFloat(monto)) || parseFloat(monto) <= 0) {
      setErrForm('Ingrese un monto válido mayor a 0.'); return;
    }
    if (!fechaPago) { setErrForm('Ingrese la fecha del pago.'); return; }

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
          nro_operacion: nroOp || null,
          fecha_pago: fechaPago,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResultado({ ok: true, ...data });
      } else {
        setErrForm(data.error || 'Error al registrar el pago.');
      }
    } catch (e) {
      setErrForm('Error de conexión con el servidor.');
    } finally {
      setEnviando(false);
    }
  };

  // ── Reiniciar todo ─────────────────────────────────────────────────────────
  const handleNuevoPago = () => {
    setColegiado(null);
    setDeuda(null);
    setResultado(null);
    setQuery('');
    setResultados(null);
    setErrBusqueda('');
    setErrForm('');
    setTimeout(() => searchRef.current?.focus(), 100);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RESULTADO EXITOSO
  // ═══════════════════════════════════════════════════════════════════════════
  if (resultado?.ok) {
    return (
      <div>
        <h1 style={{ fontSize: '1.875rem', fontWeight: '800', color: 'var(--cip-blue)', marginBottom: '0.5rem' }}>
          Pago Presencial Registrado
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Los periodos han sido marcados como pagados.
        </p>

        <div className="card" style={{ maxWidth: '640px', borderLeft: '4px solid #10B981' }}>
          {/* Icono + cabecera */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#D1FAE5', padding: '0.85rem', borderRadius: '50%', color: '#059669' }}>
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#065F46' }}>
                Pago registrado con éxito
              </h2>
              <p style={{ color: '#047857', fontSize: '0.875rem' }}>
                {resultado.total_registrado} periodo{resultado.total_registrado !== 1 ? 's' : ''} abonado{resultado.total_registrado !== 1 ? 's' : ''} para{' '}
                <strong>{resultado.colegiado}</strong>
              </p>
            </div>
          </div>

          {/* Periodos registrados */}
          <div style={{ marginBottom: '1.25rem' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem' }}>
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

          {/* Ya existían */}
          {resultado.ya_existian?.length > 0 && (
            <div style={{ marginBottom: '1rem', background: '#FEF3C7', borderRadius: '8px', padding: '0.75rem', fontSize: '0.8rem', color: '#92400E' }}>
              <strong>⚠️ Ya tenían pago registrado:</strong>{' '}
              {resultado.ya_existian.map(p => fmtPeriodo(p)).join(', ')}
            </div>
          )}

          {/* Nueva habilitación */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: resultado.habilitado_nuevo ? '#D1FAE5' : '#FEF3C7', borderRadius: '8px', marginBottom: '1.5rem' }}>
            {resultado.habilitado_nuevo
              ? <BadgeCheck size={20} color="#059669" />
              : <AlertCircle size={20} color="#D97706" />
            }
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: resultado.habilitado_nuevo ? '#065F46' : '#92400E' }}>
              {resultado.habilitado_nuevo
                ? 'El colegiado ahora está HABILITADO'
                : 'El colegiado aún tiene meses pendientes (sigue inhabilitado)'
              }
            </span>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={handleNuevoPago}
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              Registrar otro pago
            </button>
            <button
              onClick={() => { setColegiado(deuda?.colegiado || colegiado); setResultado(null); setCargandoDeuda(true);
                fetch(`/api/admin/colegiados/${colegiado.id}/deuda/`)
                  .then(r => r.json()).then(d => { setDeuda(d); setPeriodosSeleccionados(new Set(d.periodos_pendientes.map(p => p.periodo))); })
                  .finally(() => setCargandoDeuda(false));
              }}
              className="btn btn-outline"
              style={{ flex: 1, borderColor: 'var(--cip-blue)', color: 'var(--cip-blue)' }}
            >
              Ver deuda restante
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FORMULARIO PRINCIPAL
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div>
      {/* Cabecera */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: '800', color: 'var(--cip-blue)', marginBottom: '0.5rem' }}>
          Registrar Pago Presencial
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Registre pagos realizados por Yape, Plin, efectivo o transferencia. Puede cubrir varios meses en un solo registro.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* ═══ COLUMNA IZQUIERDA: Buscar colegiado ══════════════════════════ */}
        <div className="card" style={{ position: 'sticky', top: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--cip-blue)', marginBottom: '1.25rem', borderBottom: '2px solid var(--cip-red)', paddingBottom: '0.4rem', display: 'inline-block' }}>
            1. Buscar Colegiado
          </h2>

          {/* Input de búsqueda */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <input
              ref={searchRef}
              type="text"
              className="form-input"
              placeholder="DNI, nombre o N° CIP…"
              value={query}
              onChange={e => { setQuery(e.target.value); setErrBusqueda(''); }}
              onKeyDown={e => e.key === 'Enter' && handleBuscar()}
              style={{ flex: 1 }}
            />
            <button
              onClick={handleBuscar}
              disabled={buscando}
              className="btn btn-primary"
              style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}
            >
              {buscando
                ? <Loader2 size={16} className="spin" />
                : <Search size={16} />}
              Buscar
            </button>
          </div>

          {errBusqueda && (
            <p style={{ color: '#DC2626', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{errBusqueda}</p>
          )}

          {/* Resultados */}
          {resultados !== null && (
            resultados.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                <User size={32} style={{ margin: '0 auto 0.5rem auto', display: 'block', opacity: 0.3 }} />
                <p style={{ fontSize: '0.875rem' }}>No se encontraron colegiados.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                {resultados.map(col => (
                  <button
                    key={col.id}
                    onClick={() => handleSeleccionarColegiado(col)}
                    style={{
                      background: 'white', border: '1px solid var(--border-color)', borderRadius: '8px',
                      padding: '0.75rem 1rem', textAlign: 'left', cursor: 'pointer',
                      transition: 'all 0.15s', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cip-blue)'; e.currentTarget.style.background = '#EFF6FF'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'white'; }}
                  >
                    <div>
                      <p style={{ fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.2rem', fontSize: '0.875rem' }}>
                        {col.nombres}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        DNI {col.dni} · CIP {col.nro_colegiado} · {col.carrera}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                      <BadgeHabilitado habilitado={col.habilitado} />
                      <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </button>
                ))}
              </div>
            )
          )}

          {/* Colegiado actualmente seleccionado (mini resumen) */}
          {colegiado && !resultados && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} color="#16A34A" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.8rem' }}>
                <strong style={{ color: '#15803D' }}>{colegiado.nombres}</strong>
                <p style={{ color: '#166534', margin: 0 }}>DNI {colegiado.dni} · CIP {colegiado.nro_colegiado}</p>
              </div>
            </div>
          )}
        </div>

        {/* ═══ COLUMNA DERECHA: Periodos + formulario ═══════════════════════ */}
        {!colegiado ? (
          /* Placeholder cuando no hay colegiado seleccionado */
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)', border: '2px dashed var(--border-color)', background: '#FAFAFA', boxShadow: 'none' }}>
            <Wallet size={48} style={{ margin: '0 auto 1rem auto', display: 'block', opacity: 0.25 }} />
            <p style={{ fontWeight: '600', marginBottom: '0.4rem' }}>Seleccione un colegiado</p>
            <p style={{ fontSize: '0.875rem' }}>Busque por DNI, nombre o número CIP para continuar.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Tarjeta colegiado */}
            <TarjetaColegiado col={colegiado} onCambiar={() => { setColegiado(null); setDeuda(null); setResultado(null); }} />

            {/* Periodos pendientes */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--cip-blue)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Calendar size={18} /> Periodos Adeudados
                </h3>
                {deuda && deuda.periodos_pendientes.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={seleccionarTodos} style={{ fontSize: '0.75rem', color: 'var(--cip-blue)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                      Seleccionar todos
                    </button>
                    <span style={{ color: 'var(--border-color)' }}>|</span>
                    <button onClick={deseleccionarTodos} style={{ fontSize: '0.75rem', color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                      Limpiar
                    </button>
                  </div>
                )}
              </div>

              {cargandoDeuda ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <Loader2 size={28} className="spin" style={{ color: 'var(--text-muted)', margin: '0 auto', display: 'block' }} />
                  <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.875rem' }}>Calculando deuda…</p>
                </div>
              ) : deuda?.periodos_pendientes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', background: '#F0FDF4', borderRadius: '8px', color: '#15803D' }}>
                  <CheckCircle2 size={28} style={{ margin: '0 auto 0.5rem auto', display: 'block' }} />
                  <p style={{ fontWeight: '700' }}>¡Sin deuda pendiente!</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: '#166534' }}>
                    El colegiado está al día con todos sus pagos.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem', maxHeight: '260px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                  {deuda.periodos_pendientes.map(p => {
                    const sel = periodosSeleccionados.has(p.periodo);
                    return (
                      <label
                        key={p.periodo}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.55rem 0.75rem', borderRadius: '8px', cursor: 'pointer',
                          border: `1px solid ${sel ? 'var(--cip-blue)' : 'var(--border-color)'}`,
                          background: sel ? '#EFF6FF' : 'white',
                          transition: 'all 0.15s', fontSize: '0.82rem', fontWeight: sel ? '700' : '400',
                          color: sel ? 'var(--cip-blue)' : 'var(--text-main)',
                          userSelect: 'none',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={() => togglePeriodo(p.periodo)}
                          style={{ accentColor: 'var(--cip-blue)', width: 15, height: 15, flexShrink: 0 }}
                        />
                        {fmtPeriodo(p.periodo)}
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Contador de seleccionados */}
              {periodosSeleccionados.size > 0 && (
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.75rem', textAlign: 'right' }}>
                  {periodosSeleccionados.size} periodo{periodosSeleccionados.size !== 1 ? 's' : ''} seleccionado{periodosSeleccionados.size !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* Detalles del pago */}
            {deuda && deuda.periodos_pendientes.length > 0 && (
              <div className="card">
                <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--cip-blue)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CreditCard size={18} /> Detalle del Pago
                </h3>

                {/* Método de pago */}
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label">Método de Pago</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                    {METODOS.map(m => (
                      <button
                        key={m.valor}
                        type="button"
                        onClick={() => setMetodo(m.valor)}
                        style={{
                          padding: '0.65rem 0.5rem', borderRadius: '8px', cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem',
                          border: `2px solid ${metodo === m.valor ? 'var(--cip-blue)' : 'var(--border-color)'}`,
                          background: metodo === m.valor ? '#EFF6FF' : 'white',
                          color: metodo === m.valor ? 'var(--cip-blue)' : 'var(--text-main)',
                          fontWeight: metodo === m.valor ? '700' : '400',
                          fontSize: '0.78rem', transition: 'all 0.15s',
                        }}
                      >
                        {m.icono}
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Monto + Fecha en fila */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">
                      Monto Total (S/.)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: '600' }}>S/</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-input"
                        value={monto}
                        onChange={e => setMonto(e.target.value)}
                        style={{ paddingLeft: '2rem' }}
                        placeholder="0.00"
                      />
                    </div>
                    {monto && periodosSeleccionados.size > 1 && (
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                        ≈ S/ {(parseFloat(monto) / periodosSeleccionados.size).toFixed(2)} por mes
                      </p>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Calendar size={13} /> Fecha del Pago
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={fechaPago}
                      onChange={e => setFechaPago(e.target.value)}
                      max={new Date().toISOString().slice(0, 10)}
                    />
                  </div>
                </div>

                {/* N° operación */}
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Hash size={13} /> N° Operación / Voucher{' '}
                    <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>(opcional)</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={nroOp}
                    onChange={e => setNroOp(e.target.value)}
                    placeholder="Ej. 12345678"
                  />
                </div>

                {/* Error */}
                {errForm && (
                  <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    {errForm}
                  </div>
                )}

                {/* Resumen antes de confirmar */}
                {periodosSeleccionados.size > 0 && monto && metodo && (
                  <div style={{ background: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <span>Periodos a pagar:</span>
                      <strong style={{ color: 'var(--text-main)' }}>{periodosSeleccionados.size}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <span>Monto total:</span>
                      <strong style={{ color: 'var(--text-main)' }}>S/ {parseFloat(monto).toFixed(2)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Método:</span>
                      <strong style={{ color: 'var(--text-main)' }}>{METODOS.find(m => m.valor === metodo)?.label}</strong>
                    </div>
                  </div>
                )}

                {/* Botón registrar */}
                <button
                  onClick={handleRegistrar}
                  disabled={enviando || periodosSeleccionados.size === 0}
                  className="btn btn-primary btn-block"
                  style={{
                    padding: '0.875rem', fontSize: '1rem', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    background: '#10B981', borderColor: '#10B981',
                    opacity: (enviando || periodosSeleccionados.size === 0) ? 0.6 : 1,
                    cursor: (enviando || periodosSeleccionados.size === 0) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {enviando
                    ? <><Loader2 size={20} className="spin" /> Registrando…</>
                    : <><CheckCircle2 size={20} /> Confirmar y Registrar Pago</>
                  }
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
