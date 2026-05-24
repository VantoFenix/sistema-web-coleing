import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, CheckCircle, Clock, Loader2, RefreshCw, AlertCircle, ArrowRight } from 'lucide-react';

export default function AdminHome() {
  const [stats, setStats] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchDashboard = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const res = await fetch('/api/admin/dashboard/');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else if (res.status === 401 || res.status === 403) {
        // Sesión expirada → redirigir al login
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

  const tarjetas = [
    {
      label: 'Postulaciones Pendientes',
      valor: stats?.postulaciones_nuevas,
      icono: <FileText size={24} />,
      bg: '#FEE2E2', color: 'var(--cip-red)', borde: 'var(--cip-red)',
      ruta: '/admin/postulaciones',
    },
    {
      label: 'Colegiados Activos',
      valor: stats?.colegiados_activos != null
        ? stats.colegiados_activos.toLocaleString('es-PE')
        : undefined,
      icono: <Users size={24} />,
      bg: '#E0E7FF', color: 'var(--cip-blue)', borde: 'var(--cip-blue)',
      ruta: '/admin/presencial',
    },
    {
      label: 'Pagos Procesados (Mes)',
      valor: stats?.pagos_mes != null
        ? stats.pagos_mes.toLocaleString('es-PE')
        : undefined,
      icono: <CheckCircle size={24} />,
      bg: '#D1FAE5', color: '#059669', borde: '#10B981',
      ruta: '/admin/pagos',
    },
    {
      label: 'Trámites Atrasados',
      valor: stats?.tramites_atrasados,
      icono: <Clock size={24} />,
      bg: '#FEF3C7', color: '#D97706', borde: '#F59E0B',
      ruta: '/admin/postulaciones',
    },
  ];

  return (
    <div>
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '800', color: 'var(--cip-blue)', marginBottom: '0.5rem' }}>
            Dashboard Administrativo
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Resumen de operaciones y estado del colegio.</p>
        </div>
        <button
          onClick={fetchDashboard}
          disabled={cargando}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 1rem', background: 'white',
            border: '1px solid var(--border-color)', borderRadius: '8px',
            cursor: cargando ? 'not-allowed' : 'pointer',
            color: 'var(--text-muted)', fontSize: '0.875rem',
            opacity: cargando ? 0.6 : 1,
          }}
        >
          <RefreshCw size={16} className={cargando ? 'spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px',
          padding: '1rem', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#B91C1C',
        }}>
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <p style={{ fontSize: '0.875rem', fontWeight: '500' }}>{error}</p>
        </div>
      )}

      {/* Tarjetas de métricas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem',
      }}>
        {tarjetas.map((t, i) => (
          <div
            key={i}
            onClick={() => t.ruta && navigate(t.ruta)}
            style={{
              background: 'white', padding: '1.5rem', borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
              display: 'flex', alignItems: 'center', gap: '1rem',
              borderLeft: `4px solid ${t.borde}`,
              cursor: t.ruta ? 'pointer' : 'default',
              transition: 'box-shadow 0.15s, transform 0.15s',
            }}
            onMouseEnter={e => { if (t.ruta) { e.currentTarget.style.boxShadow = '0 8px 16px -2px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'none'; }}
          >
            <div style={{
              padding: '0.875rem', background: t.bg,
              borderRadius: '8px', color: t.color, flexShrink: 0,
            }}>
              {t.icono}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{
                fontSize: '0.8rem', fontWeight: '600',
                color: 'var(--text-muted)', marginBottom: '0.35rem',
                textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>
                {t.label}
              </p>
              {cargando ? (
                <Loader2 size={22} className="spin" style={{ color: 'var(--text-muted)' }} />
              ) : (
                <h3 style={{
                  fontSize: '2rem', fontWeight: '800',
                  color: 'var(--text-main)', lineHeight: 1,
                }}>
                  {t.valor != null ? t.valor : '—'}
                </h3>
              )}
            </div>
            {t.ruta && (
              <ArrowRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0, opacity: 0.5 }} />
            )}
          </div>
        ))}
      </div>

      {/* Actividad Reciente */}
      <div className="card">
        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--cip-blue)', marginBottom: '1.5rem' }}>
          Actividad Reciente
        </h2>

        {cargando ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Loader2 size={28} className="spin" style={{ color: 'var(--text-muted)', margin: '0 auto', display: 'block' }} />
          </div>
        ) : stats?.actividad_reciente?.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {stats.actividad_reciente.map((a, i) => (
              <div
                key={i}
                style={{
                  padding: '0.875rem 1rem', background: '#F8FAFC',
                  borderRadius: '8px', border: '1px solid var(--border-color)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <div>
                  <p style={{ fontWeight: '600', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                    {a.estado === 'APROBADA' ? '✅' : '❌'} {a.nombres}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Inscripción {a.estado === 'APROBADA' ? 'Aprobada' : 'Rechazada'}
                  </p>
                </div>
                <span style={{
                  fontSize: '0.8rem', color: 'var(--text-muted)',
                  whiteSpace: 'nowrap', marginLeft: '1rem',
                  background: 'white', border: '1px solid var(--border-color)',
                  padding: '0.25rem 0.6rem', borderRadius: '6px',
                }}>
                  {a.tiempo}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            <Clock size={32} style={{ margin: '0 auto 0.75rem auto', display: 'block', opacity: 0.4 }} />
            <p style={{ fontWeight: '500' }}>No hay actividad reciente aún.</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Aparecerá aquí cuando se aprueben o rechacen expedientes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
