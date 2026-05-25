import { useState, useEffect } from 'react';
import {
  CheckCircle2, XCircle, Calendar, Loader2, CreditCard,
  ShieldCheck, ArrowLeft, AlertCircle, Clock, Receipt,
} from 'lucide-react';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';

// ── Helpers ────────────────────────────────────────────────────────────────
const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];
const fmtPeriodo = (p) => {
  const [y, m] = p.split('-');
  return `${MESES[parseInt(m, 10) - 1]} ${y}`;
};
const fmtFecha = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

// Formatear número de tarjeta con espacios
const fmtCard = (v) =>
  v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

// Detectar marca por primer dígito
const detectBrand = (n) => {
  const d = n.replace(/\D/g, '');
  if (d.startsWith('4')) return 'VISA';
  if (/^5[1-5]/.test(d)) return 'MASTERCARD';
  if (/^3[47]/.test(d)) return 'AMEX';
  return null;
};

// ── Componente tarjeta animada ─────────────────────────────────────────────
function CardVisual({ numero, nombre, expiry, cvv, flip }) {
  const brand = detectBrand(numero);
  const masked = numero || '•••• •••• •••• ••••';
  const displayName = nombre || 'NOMBRE EN TARJETA';
  const displayExp = expiry || 'MM/AA';

  return (
    <div style={{ perspective: '1000px', marginBottom: '1.5rem' }}>
      <div style={{
        width: '100%', maxWidth: '340px', height: '195px', margin: '0 auto',
        position: 'relative', transformStyle: 'preserve-3d',
        transition: 'transform 0.6s', transform: flip ? 'rotateY(180deg)' : 'rotateY(0)',
      }}>
        {/* Frente */}
        <div style={{
          position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
          borderRadius: '16px', background: 'linear-gradient(135deg, #1E3A5F 0%, #0F2444 60%, #C41E3A 100%)',
          padding: '1.5rem', color: 'white', boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: 44, height: 34, background: 'linear-gradient(135deg, #FFD700, #FFA500)', borderRadius: '4px' }} />
            <span style={{ fontWeight: '800', fontSize: '1rem', letterSpacing: '2px', opacity: 0.9 }}>
              {brand || 'CARD'}
            </span>
          </div>
          <div>
            <p style={{ fontFamily: 'monospace', fontSize: '1.2rem', letterSpacing: '3px', marginBottom: '1rem', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
              {masked}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <div>
                <p style={{ opacity: 0.6, marginBottom: '0.1rem', textTransform: 'uppercase', fontSize: '0.65rem' }}>Titular</p>
                <p style={{ fontWeight: '600', letterSpacing: '0.5px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayName}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ opacity: 0.6, marginBottom: '0.1rem', textTransform: 'uppercase', fontSize: '0.65rem' }}>Vence</p>
                <p style={{ fontWeight: '600' }}>{displayExp}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Reverso */}
        <div style={{
          position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
          borderRadius: '16px', background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          transform: 'rotateY(180deg)', overflow: 'hidden',
        }}>
          <div style={{ height: '46px', background: '#111', margin: '1.5rem 0 0.75rem 0' }} />
          <div style={{ padding: '0 1.5rem' }}>
            <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>CVV</p>
            <div style={{ background: 'white', borderRadius: '4px', padding: '0.4rem 0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
              <span style={{ fontFamily: 'monospace', letterSpacing: '4px', color: '#333', fontWeight: '700' }}>
                {cvv ? cvv.replace(/\d/g, '•') : '•••'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Paso: Selección de periodos ────────────────────────────────────────────
function StepPeriodos({ pendientes, seleccionados, onToggle, onSelAll, onDeselAll, montoUnit, onContinuar }) {
  const total = seleccionados.size * parseFloat(montoUnit);

  if (pendientes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <CheckCircle2 size={52} color="#16A34A" style={{ margin: '0 auto 1rem auto', display: 'block' }} />
        <h3 style={{ color: 'var(--cip-blue)', fontWeight: '800', marginBottom: '0.5rem' }}>¡Estás al día!</h3>
        <p style={{ color: 'var(--text-muted)' }}>No tienes cuotas pendientes de pago.</p>
      </div>
    );
  }

  return (
    <div>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
        Selecciona los meses que deseas pagar. Puedes cubrir varios a la vez.
      </p>

      {/* Controles */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
          {pendientes.length} mes{pendientes.length !== 1 ? 'es' : ''} adeudado{pendientes.length !== 1 ? 's' : ''}
        </span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={onSelAll} style={{ fontSize: '0.75rem', color: 'var(--cip-blue)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Todos
          </button>
          <span style={{ color: '#CBD5E1' }}>|</span>
          <button onClick={onDeselAll} style={{ fontSize: '0.75rem', color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Ninguno
          </button>
        </div>
      </div>

      {/* Grid periodos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem', maxHeight: '230px', overflowY: 'auto', marginBottom: '1.5rem' }}>
        {pendientes.map(p => {
          const sel = seleccionados.has(p.periodo);
          return (
            <label key={p.periodo} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.55rem 0.75rem', borderRadius: '8px', cursor: 'pointer',
              border: `1.5px solid ${sel ? 'var(--cip-blue)' : 'var(--border-color)'}`,
              background: sel ? '#EFF6FF' : 'white', transition: 'all 0.15s',
              fontSize: '0.82rem', fontWeight: sel ? '700' : '400',
              color: sel ? 'var(--cip-blue)' : 'var(--text-main)', userSelect: 'none',
            }}>
              <input type="checkbox" checked={sel} onChange={() => onToggle(p.periodo)}
                style={{ accentColor: 'var(--cip-blue)', width: 14, height: 14, flexShrink: 0 }} />
              {fmtPeriodo(p.periodo)}
            </label>
          );
        })}
      </div>

      {/* Resumen monto */}
      {seleccionados.size > 0 && (
        <div style={{ background: '#F1F5F9', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {seleccionados.size} mes{seleccionados.size !== 1 ? 'es' : ''} × S/ {parseFloat(montoUnit).toFixed(2)}
          </div>
          <div style={{ fontSize: '1.375rem', fontWeight: '800', color: 'var(--cip-blue)' }}>
            S/ {total.toFixed(2)}
          </div>
        </div>
      )}

      <button
        onClick={onContinuar}
        disabled={seleccionados.size === 0}
        className="btn btn-primary btn-block"
        style={{
          padding: '0.875rem', fontSize: '1rem', display: 'flex',
          alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          opacity: seleccionados.size === 0 ? 0.5 : 1,
          cursor: seleccionados.size === 0 ? 'not-allowed' : 'pointer',
        }}
      >
        <CreditCard size={18} /> Continuar al pago →
      </button>
    </div>
  );
}

// ── Paso: Selección de método de pago ─────────────────────────────────────
function StepMetodo({ total, onVolver, onSeleccionar }) {
  const metodos = [
    {
      id: 'EFECTIVO',
      label: 'PagoEfectivo',
      desc: 'Yape, Plin, Tunki y más billeteras',
      bg: 'linear-gradient(135deg, #F5C400 0%, #D4A800 100%)',
      emoji: '🅿️',
    },
    {
      id: 'TARJETA',
      label: 'Tarjeta',
      desc: 'Visa, Mastercard o American Express',
      bg: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
      emoji: '💳',
    },
  ];

  return (
    <div>
      <button onClick={onVolver} style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        color: 'var(--text-muted)', background: 'none', border: 'none',
        cursor: 'pointer', marginBottom: '1.5rem', fontSize: '0.875rem',
      }}>
        <ArrowLeft size={15} /> Cambiar periodos
      </button>

      <h3 style={{ fontWeight: '800', color: 'var(--cip-blue)', marginBottom: '0.25rem', fontSize: '1.1rem' }}>
        ¿Cómo deseas pagar?
      </h3>
      <div style={{
        background: '#EFF6FF', borderRadius: '8px', padding: '0.6rem 1rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '1.5rem', marginTop: '0.75rem',
      }}>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total a pagar</span>
        <span style={{ fontSize: '1.375rem', fontWeight: '800', color: 'var(--cip-blue)' }}>
          S/ {total.toFixed(2)}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {metodos.map(m => (
          <button
            key={m.id}
            onClick={() => onSeleccionar(m.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '1rem',
              padding: '1.1rem 1.25rem', borderRadius: '12px', border: 'none',
              background: m.bg, color: 'white', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              transition: 'transform 0.15s, box-shadow 0.15s',
              textAlign: 'left',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
          >
            <span style={{ fontSize: '2.2rem', flexShrink: 0 }}>{m.emoji}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: '800', fontSize: '1.05rem', margin: 0, letterSpacing: '0.3px' }}>{m.label}</p>
              <p style={{ fontSize: '0.78rem', margin: '0.15rem 0 0', opacity: 0.85 }}>{m.desc}</p>
            </div>
            <span style={{ fontSize: '1.4rem', opacity: 0.8 }}>›</span>
          </button>
        ))}
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
        <ShieldCheck size={12} /> Pago seguro simulado — datos no reales
      </p>
    </div>
  );
}

// ── Paso: PagoEfectivo ────────────────────────────────────────────────────
function StepEfectivo({ total, onVolver, onPagar, procesando, errPago }) {
  // Generar CIP simulado una sola vez al montar
  const [cip] = useState(() => String(Math.floor(100000000 + Math.random() * 900000000)));
  const [copiado, setCopiado] = useState(false);
  const [celular, setCelular] = useState('');

  // Fecha límite: 24 horas desde ahora
  const vence = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const diasSemana = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const mesesCortos = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const fechaStr = `${diasSemana[vence.getDay()]} ${vence.getDate()}/${mesesCortos[vence.getMonth()]}/${vence.getFullYear()} - ${String(vence.getHours()).padStart(2,'0')}:${String(vence.getMinutes()).padStart(2,'0')} PM`;

  const copiarCIP = () => {
    navigator.clipboard?.writeText(cip).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  // QR simulado
  const qrPattern = [
    [1,1,1,1,1,1,1,0,1,0,1],[1,0,0,0,0,0,1,0,0,1,0],[1,0,1,1,1,0,1,0,1,0,1],
    [1,0,1,1,1,0,1,1,0,1,0],[1,0,0,0,0,0,1,0,1,0,1],[1,1,1,1,1,1,1,0,0,1,0],
    [0,0,1,0,0,0,0,1,1,0,1],[1,0,0,1,0,1,0,0,1,1,0],[0,1,1,0,1,0,1,0,0,1,1],
    [1,0,0,1,0,0,0,1,0,0,1],[1,1,1,1,1,1,1,0,1,1,0],
  ];

  const wallets = ['Yape','Plin','Tunki','BanBif','Interbank'];

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <button onClick={onVolver} style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        color: 'var(--text-muted)', background: 'none', border: 'none',
        cursor: 'pointer', marginBottom: '0.75rem', fontSize: '0.875rem',
      }}>
        <ArrowLeft size={15} /> Cambiar método
      </button>

      {/* ── Header PagoEfectivo ── */}
      <div style={{
        background: '#F5C400', borderRadius: '10px 10px 0 0',
        padding: '0.75rem 1.25rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: '#1a1a1a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#F5C400', fontWeight: '900', fontSize: '1rem',
          }}>P</div>
          <span style={{ fontWeight: '800', fontSize: '1rem', color: '#1a1a1a' }}>PagoEfectivo</span>
        </div>
        <span style={{ fontWeight: '700', fontSize: '0.82rem', color: '#1a1a1a' }}>
          Información para tu pago
        </span>
      </div>

      {/* ── Cuerpo ── */}
      <div style={{
        border: '1px solid #E2E8F0', borderTop: 'none',
        borderRadius: '0 0 10px 10px', overflow: 'hidden',
      }}>
        <div style={{ padding: '1rem 1.25rem', background: '#FAFAFA', borderBottom: '1px solid #E2E8F0', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#555' }}>
            <strong>¡Estás a punto de completar tu pago de cuotas CIP!</strong>
          </p>
          <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: '#777' }}>
            Empresa: <strong>Colegio de Ingenieros del Perú</strong> · Servicio: <strong>Cuotas mensuales</strong>
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 0 }}>
          {/* Columna izquierda */}
          <div style={{ padding: '1rem 1.25rem', borderRight: '1px solid #E2E8F0' }}>

            {/* CIP */}
            <div style={{ background: '#F5C400', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '0.75rem' }}>
              <p style={{ margin: '0 0 0.15rem', fontSize: '0.7rem', fontWeight: '700', color: '#78350F', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Código de pago (CIP)
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: '900', fontSize: '1.4rem', letterSpacing: '2px', color: '#1a1a1a' }}>
                  {cip}
                </span>
              </div>
              <button onClick={copiarCIP} style={{
                marginTop: '0.4rem', background: 'rgba(0,0,0,0.12)', border: 'none',
                borderRadius: '4px', padding: '0.2rem 0.6rem', cursor: 'pointer',
                fontSize: '0.7rem', fontWeight: '600', color: '#1a1a1a',
                display: 'flex', alignItems: 'center', gap: '0.3rem',
              }}>
                {copiado ? '✓ Copiado' : '📋 Copiar'}
              </button>
            </div>

            {/* Monto */}
            <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '0.6rem 1rem', marginBottom: '0.75rem', textAlign: 'center' }}>
              <p style={{ margin: '0 0 0.1rem', fontSize: '0.65rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Monto a pagar</p>
              <p style={{ margin: 0, fontWeight: '900', fontSize: '1.5rem', color: '#F5C400', fontFamily: 'monospace' }}>
                S/. {total.toFixed(2)}
              </p>
            </div>

            {/* Vencimiento */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.9rem', fontSize: '0.75rem', color: '#555' }}>
              <Clock size={13} style={{ flexShrink: 0, color: '#F59E0B' }} />
              <span>Págalo antes del <strong>{fechaStr}</strong></span>
            </div>

            {/* SMS */}
            <p style={{ margin: '0 0 0.4rem', fontSize: '0.72rem', color: '#666' }}>
              Compartir código CIP por SMS:
            </p>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <input
                type="text" inputMode="numeric" placeholder="Ingresar celular"
                value={celular}
                onChange={e => setCelular(e.target.value.replace(/\D/g, '').slice(0, 9))}
                style={{
                  flex: 1, padding: '0.4rem 0.65rem', border: '1px solid #CBD5E1',
                  borderRadius: '6px', fontSize: '0.8rem', fontFamily: 'monospace',
                }}
              />
              <button style={{
                background: '#1a1a1a', color: 'white', border: 'none',
                borderRadius: '6px', padding: '0.4rem 0.75rem',
                fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer',
              }}>
                Enviar
              </button>
            </div>
          </div>

          {/* Columna derecha: QR + wallets */}
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', minWidth: '130px' }}>
            <p style={{ margin: 0, fontSize: '0.68rem', fontWeight: '700', color: '#333', textAlign: 'center', lineHeight: 1.3 }}>
              Escanea el QR y<br/>págalo desde tu<br/>billetera favorita*
            </p>
            {/* QR simulado */}
            <div style={{ padding: '6px', background: 'white', border: '2px solid #1a1a1a', borderRadius: '6px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 7px)', gap: '1px' }}>
                {qrPattern.flat().map((cell, i) => (
                  <div key={i} style={{ width: 7, height: 7, borderRadius: '1px', background: cell ? '#1a1a1a' : 'transparent' }} />
                ))}
              </div>
            </div>
            {/* Logos wallets */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3px' }}>
              {wallets.map(w => (
                <div key={w} style={{
                  background: '#F1F5F9', borderRadius: '4px',
                  padding: '2px 4px', fontSize: '0.5rem', fontWeight: '700',
                  color: '#334155', textAlign: 'center', whiteSpace: 'nowrap',
                }}>
                  {w}
                </div>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: '0.55rem', color: '#999', textAlign: 'center', lineHeight: 1.2 }}>
              *Recuerda habilitar tu<br/>tarjeta para compras
            </p>
          </div>
        </div>
      </div>

      {errPago && (
        <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} /> {errPago}
        </div>
      )}

      {/* Botón confirmar */}
      <button
        onClick={onPagar}
        disabled={procesando}
        className="btn btn-block"
        style={{
          marginTop: '1.25rem', padding: '0.9rem', fontSize: '1rem', border: 'none',
          background: '#F5C400', color: '#1a1a1a', borderRadius: '8px', fontWeight: '800',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          cursor: procesando ? 'not-allowed' : 'pointer', opacity: procesando ? 0.7 : 1,
          boxShadow: '0 4px 12px rgba(245,196,0,0.4)',
        }}
      >
        {procesando
          ? <><Loader2 size={20} className="spin" /> Procesando…</>
          : <><ShieldCheck size={20} /> Confirmar pago con PagoEfectivo</>
        }
      </button>

      <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
        <ShieldCheck size={12} /> Simulación — datos no reales
      </p>
    </div>
  );
}

// ── Paso: Formulario de tarjeta — MercadoPago Bricks ─────────────────────
function StepTarjeta({ total, periodos, onVolver, onExito, onError }) {
  const [mpListo, setMpListo]     = useState(false);
  const [cargandoMP, setCargandoMP] = useState(true);
  const [errLocal, setErrLocal]   = useState('');

  useEffect(() => {
    fetch('/api/pagos/mp-config/')
      .then(r => r.json())
      .then(d => {
        initMercadoPago(d.public_key, { locale: 'es-PE' });
        setMpListo(true);
      })
      .catch(() => setErrLocal('No se pudo cargar la pasarela de pago.'))
      .finally(() => setCargandoMP(false));
  }, []);

  const handleSubmit = async (formData) => {
    setErrLocal('');
    try {
      const token = localStorage.getItem('colToken');
      const res = await fetch('/api/pagos/online/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          token:             formData.token,
          payment_method_id: formData.payment_method_id,
          installments:      formData.installments,
          issuer_id:         formData.issuer_id,
          periodos,
          email:             formData.payer?.email,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onExito(data);
      } else {
        const msg = data.error || 'No se pudo procesar el pago.';
        setErrLocal(msg);
        onError(msg);
      }
    } catch {
      const msg = 'Error de conexión. Intente de nuevo.';
      setErrLocal(msg);
      onError(msg);
    }
  };

  return (
    <div>
      <button onClick={onVolver} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
        <ArrowLeft size={15} /> Cambiar método
      </button>

      {/* Total */}
      <div style={{ background: '#EFF6FF', borderRadius: '8px', padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total a cobrar</span>
        <span style={{ fontSize: '1.375rem', fontWeight: '800', color: 'var(--cip-blue)' }}>S/ {total.toFixed(2)}</span>
      </div>

      {/* Cargando SDK */}
      {cargandoMP && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <Loader2 size={28} className="spin" style={{ margin: '0 auto', display: 'block', color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.875rem' }}>Cargando pasarela de pago…</p>
        </div>
      )}

      {/* Error */}
      {errLocal && (
        <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} /> {errLocal}
        </div>
      )}

      {/* Brick de MercadoPago */}
      {mpListo && (
        <CardPayment
          initialization={{ amount: total }}
          customization={{ paymentMethods: { minInstallments: 1, maxInstallments: 1 } }}
          onSubmit={handleSubmit}
          onError={(err) => setErrLocal(err.message || 'Error en la pasarela de pago.')}
        />
      )}

      <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
        <ShieldCheck size={12} /> Pago procesado por MercadoPago · Datos cifrados
      </p>
    </div>
  );
}

// ── Paso: Éxito ────────────────────────────────────────────────────────────
function StepExito({ resultado, onNuevoPago }) {
  return (
    <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
        <CheckCircle2 size={38} color="#059669" />
      </div>
      <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--cip-blue)', marginBottom: '0.5rem' }}>
        ¡Pago exitoso!
      </h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Se procesó el pago de{' '}
        <strong style={{ color: 'var(--cip-blue)' }}>
          {resultado.periodos_pagados.length} mes{resultado.periodos_pagados.length !== 1 ? 'es' : ''}
        </strong>
        {' '}por un total de{' '}
        <strong style={{ color: 'var(--cip-blue)' }}>S/ {parseFloat(resultado.monto_cobrado).toFixed(2)}</strong>.
      </p>

      {/* Meses pagados */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.4rem', marginBottom: '1.25rem' }}>
        {resultado.periodos_pagados.map(p => (
          <span key={p} style={{ background: '#D1FAE5', color: '#065F46', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '600' }}>
            {fmtPeriodo(p)}
          </span>
        ))}
      </div>

      {/* Nro operación */}
      <div style={{ background: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Receipt size={14} /> N° operación
        </span>
        <span style={{ fontFamily: 'monospace', fontWeight: '700', color: 'var(--text-main)' }}>
          {resultado.nro_operacion}
        </span>
      </div>

      {/* Nueva habilitación */}
      <div style={{
        padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem',
        background: resultado.habilitado_nuevo ? '#D1FAE5' : '#FEF3C7',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
      }}>
        {resultado.habilitado_nuevo
          ? <CheckCircle2 size={18} color="#059669" />
          : <AlertCircle size={18} color="#D97706" />
        }
        <span style={{ fontWeight: '700', fontSize: '0.875rem', color: resultado.habilitado_nuevo ? '#065F46' : '#92400E' }}>
          {resultado.habilitado_nuevo
            ? 'Tu cuenta está HABILITADA ✓'
            : 'Aún tienes meses pendientes'}
        </span>
      </div>

      <button onClick={onNuevoPago} className="btn btn-primary btn-block" style={{ padding: '0.8rem' }}>
        Ver historial de pagos
      </button>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function MisPagos() {
  const [tab, setTab]                   = useState('pagar');   // 'pagar' | 'historial'
  const [cargando, setCargando]         = useState(true);
  const [error, setError]               = useState('');

  // Datos del servidor
  const [pendientes, setPendientes]     = useState([]);
  const [historial, setHistorial]       = useState([]);
  const [habilitado, setHabilitado]     = useState(null);
  const [montoUnit, setMontoUnit]       = useState('30.00');

  // Paso gateway: 'periodos' | 'metodo' | 'tarjeta' | 'yapeplin' | 'exito'
  const [paso, setPaso]                 = useState('periodos');
  const [metodoPago, setMetodoPago]     = useState('TARJETA');
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [procesando, setProcesando]     = useState(false);
  const [errPago, setErrPago]           = useState('');
  const [resultadoPago, setResultadoPago] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    setError('');
    try {
      const token = localStorage.getItem('colToken');
      const res = await fetch('/api/portal/mis-pagos/', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        // Token expirado → redirigir al login
        localStorage.removeItem('colToken');
        localStorage.removeItem('colUser');
        window.location.href = '/login';
        return;
      }

      if (!res.ok) {
        let detalle = '';
        try { const d = await res.json(); detalle = d.error || ''; } catch (_) {}
        throw new Error(detalle || `Error ${res.status}`);
      }

      const data = await res.json();
      setPendientes(data.periodos_pendientes || []);
      setHistorial(data.historial || []);
      setHabilitado(data.habilitado ?? null);
      setMontoUnit(data.monto_mensualidad || '30.00');
      // Pre-seleccionar todos los pendientes
      setSeleccionados(new Set((data.periodos_pendientes || []).map(p => p.periodo)));
    } catch (e) {
      setError(`No se pudo cargar la información de pagos: ${e.message}`);
    } finally {
      setCargando(false);
    }
  };

  const handlePagar = async () => {
    setProcesando(true);
    setErrPago('');

    // Simular delay de procesamiento (realismo)
    await new Promise(r => setTimeout(r, 1800));

    try {
      const token = localStorage.getItem('colToken');
      const total = seleccionados.size * parseFloat(montoUnit);
      const res = await fetch('/api/portal/mis-pagos/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          periodos: [...seleccionados].sort(),
          monto: total.toFixed(2),
          metodo: metodoPago,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResultadoPago(data);
        setPaso('exito');
      } else {
        setErrPago(data.error || 'No se pudo procesar el pago. Intente de nuevo.');
      }
    } catch (e) {
      setErrPago('Error de conexión. Intente de nuevo.');
    } finally {
      setProcesando(false);
    }
  };

  const handleNuevoPago = () => {
    cargarDatos();
    setPaso('periodos');
    setMetodoPago('TARJETA');
    setResultadoPago(null);
    setErrPago('');
    setTab('historial');
  };

  if (cargando) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
        <Loader2 size={36} className="spin" style={{ margin: '0 auto 1rem auto', display: 'block' }} />
        <p>Cargando información de pagos…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '3rem' }}>
        <AlertCircle size={40} color="#DC2626" style={{ margin: '0 auto 1rem auto', display: 'block' }} />
        <p style={{ color: '#991B1B', fontWeight: '600' }}>{error}</p>
        <button onClick={cargarDatos} className="btn btn-outline" style={{ marginTop: '1.5rem', borderColor: 'var(--cip-blue)', color: 'var(--cip-blue)' }}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>

      {/* ── Estado de cuenta ── */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: habilitado === false ? '#FEF2F2' : habilitado ? '#F0FDF4' : 'white', border: `1px solid ${habilitado === false ? '#FECACA' : habilitado ? '#86EFAC' : 'var(--border-color)'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {habilitado === false
            ? <XCircle size={26} color="#DC2626" />
            : habilitado
              ? <CheckCircle2 size={26} color="#16A34A" />
              : <Clock size={26} color="var(--text-muted)" />
          }
          <div>
            <p style={{ fontWeight: '700', color: 'var(--cip-blue)', marginBottom: '0.1rem' }}>
              Estado de cuenta
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {pendientes.length > 0
                ? `${pendientes.length} mes${pendientes.length !== 1 ? 'es' : ''} pendiente${pendientes.length !== 1 ? 's' : ''} de pago`
                : 'Pagos al día'
              }
            </p>
          </div>
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
          padding: '0.3rem 0.8rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '800',
          background: habilitado === false ? '#FEE2E2' : habilitado ? '#D1FAE5' : '#F1F5F9',
          color: habilitado === false ? '#991B1B' : habilitado ? '#065F46' : 'var(--text-muted)',
        }}>
          {habilitado === false ? <XCircle size={13} /> : habilitado ? <CheckCircle2 size={13} /> : null}
          {habilitado === false ? 'Inhabilitado' : habilitado ? 'Habilitado' : '—'}
        </span>
      </div>

      {/* ── Tabs ── */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: '#f8fafc', borderRadius: '12px 12px 0 0' }}>
          {[
            { id: 'pagar',    label: 'Pagar Mensualidades', icon: <CreditCard size={15} /> },
            { id: 'historial',label: 'Historial',           icon: <Receipt size={15} /> },
          ].map(t => (
            <button key={t.id}
              onClick={() => { setTab(t.id); if (t.id === 'pagar' && paso === 'exito') { setPaso('periodos'); setMetodoPago('EFECTIVO'); } }}
              style={{
                flex: 1, padding: '1rem', border: 'none', background: 'transparent',
                fontWeight: tab === t.id ? '700' : '500',
                color: tab === t.id ? 'var(--cip-blue)' : 'var(--text-muted)',
                borderBottom: tab === t.id ? '3px solid var(--cip-blue)' : '3px solid transparent',
                cursor: 'pointer', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                fontSize: '0.9rem',
              }}
            >
              {t.icon} {t.label}
              {t.id === 'pagar' && pendientes.length > 0 && (
                <span style={{ background: 'var(--cip-red)', color: 'white', borderRadius: '999px', fontSize: '0.65rem', padding: '0.1rem 0.45rem', fontWeight: '800' }}>
                  {pendientes.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={{ padding: '1.75rem' }}>

          {/* ── Tab: Pagar ── */}
          {tab === 'pagar' && (
            <>
              {paso === 'periodos' && (
                <StepPeriodos
                  pendientes={pendientes}
                  seleccionados={seleccionados}
                  onToggle={p => {
                    setSeleccionados(prev => {
                      const s = new Set(prev);
                      s.has(p) ? s.delete(p) : s.add(p);
                      return s;
                    });
                  }}
                  onSelAll={() => setSeleccionados(new Set(pendientes.map(p => p.periodo)))}
                  onDeselAll={() => setSeleccionados(new Set())}
                  montoUnit={montoUnit}
                  onContinuar={() => { setErrPago(''); setPaso('metodo'); }}
                />
              )}
              {paso === 'metodo' && (
                <StepMetodo
                  total={seleccionados.size * parseFloat(montoUnit)}
                  onVolver={() => setPaso('periodos')}
                  onSeleccionar={(m) => {
                    setMetodoPago(m);
                    setErrPago('');
                    setPaso(m === 'TARJETA' ? 'tarjeta' : 'efectivo');
                  }}
                />
              )}
              {paso === 'efectivo' && (
                <StepEfectivo
                  total={seleccionados.size * parseFloat(montoUnit)}
                  onVolver={() => setPaso('metodo')}
                  onPagar={handlePagar}
                  procesando={procesando}
                  errPago={errPago}
                />
              )}
              {paso === 'tarjeta' && (
                <StepTarjeta
                  total={seleccionados.size * parseFloat(montoUnit)}
                  periodos={[...seleccionados].sort()}
                  onVolver={() => setPaso('metodo')}
                  onExito={(data) => { setResultadoPago(data); setPaso('exito'); }}
                  onError={(msg) => setErrPago(msg)}
                />
              )}
              {paso === 'exito' && (
                <StepExito resultado={resultadoPago} onNuevoPago={handleNuevoPago} />
              )}
            </>
          )}

          {/* ── Tab: Historial ── */}
          {tab === 'historial' && (
            historial.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                <Calendar size={40} style={{ margin: '0 auto 0.75rem auto', display: 'block', opacity: 0.3 }} />
                <p style={{ fontWeight: '600' }}>Sin pagos registrados aún.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: '600' }}>Periodo</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: '600' }}>Fecha</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: '600' }}>Canal</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: '600', textAlign: 'right' }}>Monto</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: '600', textAlign: 'center' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map(h => (
                      <tr key={h.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.875rem 1rem', fontWeight: '600', color: 'var(--cip-blue)' }}>
                          {fmtPeriodo(h.periodo)}
                        </td>
                        <td style={{ padding: '0.875rem 1rem', color: 'var(--text-muted)' }}>
                          {fmtFecha(h.fecha_pago)}
                        </td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <span style={{
                            background: h.canal === 'PORTAL' ? '#EDE9FE' : '#F0F9FF',
                            color: h.canal === 'PORTAL' ? '#5B21B6' : '#0369A1',
                            padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '600',
                          }}>
                            {h.canal === 'PORTAL'
                              ? h.metodo === 'EFECTIVO' ? '🅿️ PagoEfectivo'
                              : '💳 Tarjeta'
                            : h.canal === 'CAJA' ? `🏢 ${h.metodo || 'Caja'}`
                            : h.canal}
                          </span>
                        </td>
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontWeight: '700' }}>
                          S/ {parseFloat(h.monto).toFixed(2)}
                        </td>
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                          <span style={{ background: '#D1FAE5', color: '#065F46', padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '700' }}>
                            PAGADO
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
