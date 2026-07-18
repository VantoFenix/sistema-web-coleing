import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Clock, ArrowRight, Loader2, XCircle } from 'lucide-react';

export default function AdminDeudores() {
  const [colegiados, setColegiados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorFetch, setErrorFetch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS'); // 'TODOS', 'ACTIVO', 'INHABILITADO'
  const navigate = useNavigate();

  useEffect(() => {
    fetchColegiados();
  }, []);

  const fetchColegiados = async () => {
    setCargando(true);
    setErrorFetch('');
    try {
      const token = localStorage.getItem('adminToken');
      // Aprovechamos el endpoint refactorizado
      const res = await fetch('/api/admin/deudores/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setColegiados(data.results || data);
      } else {
        let txt = '';
        try { txt = await res.text(); } catch (_) {}
        setErrorFetch(`Error ${res.status}: ${txt.substring(0, 150)}`);
      }
    } catch (e) {
      setErrorFetch(`Sin conexión al servidor: ${e.message}`);
    } finally {
      setCargando(false);
    }
  };

  const colegiadosFiltrados = colegiados.filter(c => 
    filtroEstado === 'TODOS' || c.estado === filtroEstado
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '800', color: 'var(--cip-blue)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Wallet size={32} /> Pagos Mensuales
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Gestión de colegiados e historial de pagos.</p>
        </div>
        <button
          onClick={fetchColegiados}
          disabled={cargando}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: cargando ? 'not-allowed' : 'pointer' }}
        >
          <Clock size={15} className={cargando ? 'spin' : ''} /> Actualizar
        </button>
      </div>

      {errorFetch && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', color: '#B91C1C' }}>
          <XCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontWeight: '600' }}>{errorFetch}</p>
        </div>
      )}

      {/* Tabs de Filtro */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        {['TODOS', 'ACTIVO', 'INHABILITADO'].map((estado) => (
          <button
            key={estado}
            onClick={() => setFiltroEstado(estado)}
            style={{
              padding: '0.5rem 1rem',
              background: filtroEstado === estado ? 'var(--cip-blue)' : 'transparent',
              color: filtroEstado === estado ? 'white' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {estado === 'TODOS' ? 'Todos' : estado === 'ACTIVO' ? 'Activos' : 'Inhabilitados'}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '1rem 1.5rem', color: 'var(--cip-blue)', fontWeight: '700' }}>DNI</th>
              <th style={{ padding: '1rem 1.5rem', color: 'var(--cip-blue)', fontWeight: '700' }}>Apellidos y Nombres</th>
              <th style={{ padding: '1rem 1.5rem', color: 'var(--cip-blue)', fontWeight: '700' }}>Estado</th>
              <th style={{ padding: '1rem 1.5rem', color: 'var(--cip-blue)', fontWeight: '700', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center' }}><Loader2 className="spin" style={{margin:'0 auto'}}/></td></tr>
            ) : colegiadosFiltrados.length === 0 ? (
              <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron colegiados.</td></tr>
            ) : (
              colegiadosFiltrados.map((colegiado) => (
                <tr key={colegiado.dni} style={{ borderBottom: '1px solid var(--border-color)', background: 'white' }}>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: '600' }}>{colegiado.dni}</td>
                  <td style={{ padding: '1rem 1.5rem' }}>{colegiado.nombres || colegiado.nombre}</td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    {colegiado.estado === 'ACTIVO' ? (
                      <span style={{ background: '#ecfdf5', color: '#059669', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '700', border: '1px solid #a7f3d0' }}>
                        ACTIVO
                      </span>
                    ) : (
                      <span style={{ background: '#FEF2F2', color: '#DC2626', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '700', border: '1px solid #FCA5A5' }}>
                        INHABILITADO
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                    <button 
                      className="btn" 
                      style={{ 
                        background: colegiado.estado === 'ACTIVO' ? 'var(--cip-blue)' : '#DC2626', 
                        color: 'white', 
                        padding: '0.5rem 1rem', 
                        borderRadius: '6px', 
                        fontSize: '0.875rem', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        cursor: 'pointer', 
                        border: 'none' 
                      }}
                      onClick={() => navigate('/admin/pagos-presencial', { state: { dni: colegiado.dni } })}
                    >
                      {colegiado.estado === 'ACTIVO' ? 'Adelantar Pago' : 'Cobrar Deuda'} <ArrowRight size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
