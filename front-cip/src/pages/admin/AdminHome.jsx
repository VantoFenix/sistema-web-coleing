import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, CreditCard, Loader2, RefreshCw, AlertCircle,
  Clock, CheckCircle2, XCircle, ChevronRight, Settings, Save,
} from 'lucide-react';

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

export default function AdminHome() {
  const [stats, setStats]         = useState(null);
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState('');
  const navigate = useNavigate();

  // ── Configuración de precio mensualidad ──
  const [monto, setMonto]             = useState('');
  const [montoGuardado, setMontoGuardado] = useState('');
  const [guardando, setGuardando]     = useState(false);
  const [msgConfig, setMsgConfig]     = useState({ tipo: '', texto: '' });

  const fetchDashboard = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const res = await fetch('/api/admin/dashboard/');
      if (res.ok) {
        setStats(await res.json());
      } else if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        navigate('/admin/login');
      } else {
        let txt = '';
        try { txt = await res.text(); } catch (_) {}
        setError(`Error ${res.status}: ${txt.slice(0, 160)}`);
      }
    } catch (e) {
      setError(`Sin conexión con el servidor: ${e.message}`);
    } finally {
      setCargando(false);
    }
  }, [navigate]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // Cargar precio actual al montar
  useEffect(() => {
    fetch('/api/admin/configuracion/')
      .then(r => r.json())
      .then(d => {
        setMonto(d.monto_mensualidad || '20.00');
        setMontoGuardado(d.monto_mensualidad || '20.00');
      })
      .catch(() => {});
  }, []);

  const handleGuardarConfig = async () => {
    const valor = parseFloat(monto);
    if (isNaN(valor) || valor <= 0) {
      setMsgConfig({ tipo: 'error', texto: 'Ingresa un monto válido mayor a 0.' });
      return;
    }
    setGuardando(true);
    setMsgConfig({ tipo: '', texto: '' });
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/admin/configuracion/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ monto_mensualidad: valor.toFixed(2) }),
      });
      const data = await res.json();
      if (data.success) {
        setMontoGuardado(data.monto_mensualidad);
        setMonto(data.monto_mensualidad);
        setMsgConfig({ tipo: 'ok', texto: `Precio actualizado a S/ ${data.monto_mensualidad}` });
        setTimeout(() => setMsgConfig({ tipo: '', texto: '' }), 3000);
      } else {
        setMsgConfig({ tipo: 'error', texto: data.error || 'No se pudo guardar.' });
      }
    } catch {
      setMsgConfig({ tipo: 'error', texto: 'Error de conexión.' });
    } finally {
      setGuardando(false);
    }
  };

  const ahora    = new Date();
  const mesLabel = `${MESES[ahora.getMonth()]} ${ahora.getFullYear()}`;
  const diaLabel = ahora.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* ══════════════════════════════════════
          CABECERA
      ══════════════════════════════════════ */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #1a2744 100%)',
        borderRadius: '16px',
        padding: '1.75rem 2rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 8px 32px rgba(15,23,42,0.25)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decoración: línea dorada lateral */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: '5px',
          background: 'linear-gradient(180deg, #F59E0B, #B91C1C)',
          borderRadius: '16px 0 0 16px',
        }} />
        {/* Decoración: círculo difuminado */}
        <div style={{
          position: 'absolute', right: -60, top: -60, width: 200, height: 200,
          borderRadius: '50%', background: 'rgba(185,28,28,0.12)',
          pointerEvents: 'none',
        }} />

        <div style={{ paddingLeft: '0.5rem' }}>
          <p style={{ color: '#F59E0B', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.3rem' }}>
            Portal Administrativo · CIP
          </p>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '900', color: 'white', lineHeight: 1.15, marginBottom: '0.3rem' }}>
            Dashboard Administrativo
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', textTransform: 'capitalize' }}>
            {diaLabel}
          </p>
        </div>

        <button
          onClick={fetchDashboard}
          disabled={cargando}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.55rem 1.1rem',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: '8px', cursor: cargando ? 'not-allowed' : 'pointer',
            color: 'rgba(255,255,255,0.8)', fontSize: '0.82rem', fontWeight: '600',
            opacity: cargando ? 0.5 : 1, transition: 'all 0.15s', zIndex: 1,
          }}
          onMouseEnter={e => { if (!cargando) e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
        >
          <RefreshCw size={14} className={cargando ? 'spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* ══════════════════════════════════════
          ERROR
      ══════════════════════════════════════ */}
      {error && (
        <div style={{
          background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '10px',
          padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#B91C1C',
        }}>
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <p style={{ fontSize: '0.875rem', fontWeight: '500' }}>{error}</p>
        </div>
      )}

      {/* ══════════════════════════════════════
          TARJETAS MÉTRICAS
      ══════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

        {/* ── Tarjeta 1: Postulaciones Pendientes ── */}
        <div
          onClick={() => navigate('/admin/postulaciones')}
          style={{
            borderRadius: '14px', overflow: 'hidden', cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(15,23,42,0.12)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            border: '1px solid rgba(15,23,42,0.08)',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 36px rgba(15,23,42,0.2)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(15,23,42,0.12)'; }}
        >
          {/* Zona superior — azul marino */}
          <div style={{
            background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)',
            padding: '1.6rem 1.75rem 1.2rem',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Acento dorado izquierdo */}
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: '#F59E0B' }} />
            {/* Círculo decorativo */}
            <div style={{ position: 'absolute', right: -30, top: -30, width: 110, height: 110, borderRadius: '50%', background: 'rgba(245,158,11,0.1)', pointerEvents: 'none' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ color: '#F59E0B', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>
                  Postulaciones Pendientes
                </p>
                {cargando ? (
                  <Loader2 size={30} className="spin" style={{ color: 'rgba(255,255,255,0.6)' }} />
                ) : (
                  <h2 style={{
                    fontSize: '3.5rem', fontWeight: '900', color: 'white',
                    lineHeight: 1, letterSpacing: '-1px',
                    textShadow: '0 2px 12px rgba(0,0,0,0.3)',
                  }}>
                    {stats?.postulaciones_nuevas ?? '—'}
                  </h2>
                )}
              </div>
              <div style={{
                background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: '12px', padding: '0.75rem',
              }}>
                <FileText size={26} color="#F59E0B" />
              </div>
            </div>
          </div>

          {/* Zona inferior — blanca */}
          <div style={{
            background: 'white', padding: '0.85rem 1.75rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderTop: '1px solid #E2E8F0',
          }}>
            <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: '500' }}>
              Expedientes en espera de revisión
            </span>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.25rem',
              color: '#0F172A', fontWeight: '700', fontSize: '0.78rem',
            }}>
              Revisar <ChevronRight size={14} />
            </div>
          </div>
        </div>

        {/* ── Tarjeta 2: Pagos del Mes ── */}
        <div
          onClick={() => navigate('/admin/pagos-presencial')}
          style={{
            borderRadius: '14px', overflow: 'hidden', cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(185,28,28,0.15)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            border: '1px solid rgba(185,28,28,0.1)',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 36px rgba(185,28,28,0.25)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(185,28,28,0.15)'; }}
        >
          {/* Zona superior — rojo CIP */}
          <div style={{
            background: 'linear-gradient(135deg, #991B1B 0%, #B91C1C 60%, #DC2626 100%)',
            padding: '1.6rem 1.75rem 1.2rem',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Acento dorado izquierdo */}
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: '#F59E0B' }} />
            {/* Círculo decorativo */}
            <div style={{ position: 'absolute', right: -30, top: -30, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>
                  Pagos Procesados
                </p>
                {cargando ? (
                  <Loader2 size={30} className="spin" style={{ color: 'rgba(255,255,255,0.6)' }} />
                ) : (
                  <h2 style={{
                    fontSize: '3.5rem', fontWeight: '900', color: 'white',
                    lineHeight: 1, letterSpacing: '-1px',
                    textShadow: '0 2px 12px rgba(0,0,0,0.3)',
                  }}>
                    {stats?.pagos_mes != null ? stats.pagos_mes.toLocaleString('es-PE') : '—'}
                  </h2>
                )}
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: '12px', padding: '0.75rem',
              }}>
                <CreditCard size={26} color="white" />
              </div>
            </div>
          </div>

          {/* Zona inferior — blanca */}
          <div style={{
            background: 'white', padding: '0.85rem 1.75rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderTop: '1px solid #E2E8F0',
          }}>
            <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: '500' }}>
              Durante {mesLabel}
            </span>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.25rem',
              color: '#B91C1C', fontWeight: '700', fontSize: '0.78rem',
            }}>
              Gestionar <ChevronRight size={14} />
            </div>
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════
          ACTIVIDAD RECIENTE
      ══════════════════════════════════════ */}
      <div style={{
        background: 'white', borderRadius: '14px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
        overflow: 'hidden',
      }}>
        {/* Header de sección */}
        <div style={{
          padding: '1.1rem 1.5rem',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#FAFAFA',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: 3, height: 18, background: 'linear-gradient(180deg, #F59E0B, #B91C1C)', borderRadius: '2px' }} />
            <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#0F172A' }}>
              Actividad Reciente
            </h2>
          </div>
          {!cargando && stats?.actividad_reciente?.length > 0 && (
            <span style={{
              background: '#0F172A', color: '#F59E0B',
              padding: '0.2rem 0.65rem', borderRadius: '999px',
              fontSize: '0.68rem', fontWeight: '800', letterSpacing: '0.3px',
            }}>
              {stats.actividad_reciente.length} registros
            </span>
          )}
        </div>

        {/* Cuerpo */}
        <div style={{ padding: '1.25rem 1.5rem' }}>
          {cargando ? (
            <div style={{ textAlign: 'center', padding: '2.5rem' }}>
              <Loader2 size={28} className="spin" style={{ color: '#64748B', margin: '0 auto', display: 'block' }} />
              <p style={{ marginTop: '0.75rem', color: '#64748B', fontSize: '0.85rem' }}>Cargando actividad…</p>
            </div>
          ) : stats?.actividad_reciente?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {stats.actividad_reciente.map((a, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem',
                  padding: '0.85rem 1rem', borderRadius: '10px',
                  background: a.estado === 'APROBADA' ? '#F0FDF4' : '#FFF5F5',
                  border: `1px solid ${a.estado === 'APROBADA' ? '#BBF7D0' : '#FECACA'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* Icono estado */}
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                      background: a.estado === 'APROBADA' ? '#D1FAE5' : '#FEE2E2',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `2px solid ${a.estado === 'APROBADA' ? '#6EE7B7' : '#FCA5A5'}`,
                    }}>
                      {a.estado === 'APROBADA'
                        ? <CheckCircle2 size={18} color="#059669" />
                        : <XCircle size={18} color="#DC2626" />
                      }
                    </div>
                    <div>
                      <p style={{ fontWeight: '700', color: '#0F172A', fontSize: '0.88rem', marginBottom: '0.1rem' }}>
                        {a.nombres}
                      </p>
                      <p style={{
                        fontSize: '0.72rem', fontWeight: '600',
                        color: a.estado === 'APROBADA' ? '#15803D' : '#B91C1C',
                      }}>
                        Inscripción {a.estado === 'APROBADA' ? 'Aprobada' : 'Rechazada'}
                      </p>
                    </div>
                  </div>

                  {/* Tiempo */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                    background: 'white', border: '1px solid #E2E8F0',
                    padding: '0.3rem 0.65rem', borderRadius: '8px',
                    fontSize: '0.72rem', color: '#64748B', whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    <Clock size={11} />
                    {a.tiempo}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              {/* Ícono vacío con los colores CIP */}
              <div style={{
                width: 60, height: 60, borderRadius: '50%', margin: '0 auto 1rem auto',
                background: 'linear-gradient(135deg, #0F172A, #1E3A5F)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0.25,
              }}>
                <Clock size={28} color="white" />
              </div>
              <p style={{ fontWeight: '600', color: '#0F172A', marginBottom: '0.3rem' }}>Sin actividad reciente</p>
              <p style={{ fontSize: '0.82rem', color: '#64748B' }}>
                Aparecerá aquí cuando se aprueben o rechacen expedientes.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════
          CONFIGURACIÓN DE PRECIO
      ══════════════════════════════════════ */}
      <div style={{
        background: 'white', borderRadius: '14px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.1rem 1.5rem', borderBottom: '1px solid #E2E8F0',
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          background: '#FAFAFA',
        }}>
          <div style={{ width: 3, height: 18, background: 'linear-gradient(180deg, #F59E0B, #B91C1C)', borderRadius: '2px' }} />
          <Settings size={16} color="#0F172A" />
          <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#0F172A' }}>
            Configuración de Mensualidad
          </h2>
          {montoGuardado && (
            <span style={{
              marginLeft: 'auto', background: '#F1F5F9', border: '1px solid #E2E8F0',
              borderRadius: '999px', padding: '0.15rem 0.65rem',
              fontSize: '0.72rem', fontWeight: '700', color: '#475569',
            }}>
              Actual: S/ {montoGuardado}
            </span>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem' }}>
          <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: '1.25rem' }}>
            Define el monto que se cobrará por cada mensualidad. Este valor se aplica a todos los pagos del portal y caja.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {/* Input */}
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '0.4rem' }}>
                Precio por mensualidad (S/)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0', border: '1.5px solid #D1D5DB', borderRadius: '8px', overflow: 'hidden', background: 'white' }}>
                <span style={{
                  padding: '0.65rem 0.85rem', background: '#F9FAFB',
                  borderRight: '1px solid #D1D5DB',
                  fontSize: '0.9rem', fontWeight: '700', color: '#374151', flexShrink: 0,
                }}>
                  S/
                </span>
                <input
                  type="number"
                  min="1"
                  step="0.50"
                  value={monto}
                  onChange={e => setMonto(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleGuardarConfig()}
                  placeholder="20.00"
                  style={{
                    flex: 1, padding: '0.65rem 0.85rem', border: 'none', outline: 'none',
                    fontSize: '1.1rem', fontWeight: '700', color: '#0F172A',
                    fontFamily: 'monospace',
                  }}
                />
              </div>
            </div>

            {/* Botón guardar */}
            <button
              onClick={handleGuardarConfig}
              disabled={guardando}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.45rem',
                padding: '0.65rem 1.25rem', borderRadius: '8px', border: 'none',
                background: guardando ? '#94A3B8' : 'linear-gradient(135deg, #0F172A, #1E3A5F)',
                color: 'white', fontWeight: '700', fontSize: '0.875rem',
                cursor: guardando ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s', whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(15,23,42,0.2)',
              }}
            >
              {guardando
                ? <><Loader2 size={15} className="spin" /> Guardando…</>
                : <><Save size={15} /> Guardar precio</>
              }
            </button>
          </div>

          {/* Feedback */}
          {msgConfig.texto && (
            <div style={{
              marginTop: '0.85rem', padding: '0.65rem 1rem', borderRadius: '8px',
              display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: '600',
              background: msgConfig.tipo === 'ok' ? '#D1FAE5' : '#FEE2E2',
              color:      msgConfig.tipo === 'ok' ? '#065F46' : '#991B1B',
              border:     `1px solid ${msgConfig.tipo === 'ok' ? '#6EE7B7' : '#FCA5A5'}`,
            }}>
              {msgConfig.tipo === 'ok'
                ? <CheckCircle2 size={15} />
                : <AlertCircle size={15} />
              }
              {msgConfig.texto}
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
