import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, ArrowRight, Loader2, XCircle } from 'lucide-react';

export default function AdminDeudores() {
  const [deudores, setDeudores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorFetch, setErrorFetch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchDeudores();
  }, []);

  const fetchDeudores = async () => {
    setCargando(true);
    setErrorFetch('');
    try {
      const token = localStorage.getItem('adminToken');
      // Aseguramos que la ruta coincida con el backend
      const res = await fetch('/api/admin/deudores/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDeudores(data.results || data);
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '800', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={32} /> Panel de Deudores
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Gestión de colegiados morosos (Cajero).</p>
        </div>
        <button
          onClick={fetchDeudores}
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

      <div className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid #FCA5A5', borderTop: '4px solid #DC2626' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#FEF2F2', borderBottom: '2px solid #FCA5A5' }}>
              <th style={{ padding: '1rem 1.5rem', color: '#991B1B', fontWeight: '700' }}>DNI</th>
              <th style={{ padding: '1rem 1.5rem', color: '#991B1B', fontWeight: '700' }}>Apellidos y Nombres</th>
              <th style={{ padding: '1rem 1.5rem', color: '#991B1B', fontWeight: '700' }}>Estado</th>
              <th style={{ padding: '1rem 1.5rem', color: '#991B1B', fontWeight: '700', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center' }}><Loader2 className="spin" style={{margin:'0 auto'}}/></td></tr>
            ) : deudores.length === 0 ? (
              <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#991B1B' }}>No hay deudores registrados.</td></tr>
            ) : (
              deudores.map((deudor) => (
                <tr key={deudor.dni} style={{ borderBottom: '1px solid #FCA5A5', background: 'white' }}>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: '600' }}>{deudor.dni}</td>
                  <td style={{ padding: '1rem 1.5rem' }}>{deudor.nombre}</td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{ background: '#FEF2F2', color: '#DC2626', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '700', border: '1px solid #FCA5A5' }}>
                      INHABILITADO
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                    <button 
                      className="btn" 
                      style={{ background: '#DC2626', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', border: 'none' }}
                      onClick={() => navigate('/admin/pagos-presencial', { state: { dni: deudor.dni } })}
                    >
                      Cobrar Deuda <ArrowRight size={16} />
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
