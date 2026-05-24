import { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function MisPagos() {
  const [tab, setTab] = useState('historial'); // 'deudas' | 'historial'
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Deudas (En el MVP solo mostramos historial)
  const deudas = [];

  useEffect(() => {
    fetchPagos();
  }, []);

  const fetchPagos = async () => {
    try {
      const token = localStorage.getItem('colToken');
      const res = await fetch('/api/portal/mis-pagos/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setHistorial(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '900px', margin: '0 auto', padding: '0' }}>
      
      {/* Custom Tabs Header */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: '#f8fafc', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}>
        <button 
          style={{ flex: 1, padding: '1.25rem', border: 'none', background: 'transparent', fontSize: '1.125rem', fontWeight: tab === 'deudas' ? '600' : '500', color: tab === 'deudas' ? 'var(--cip-red)' : 'var(--text-muted)', borderBottom: tab === 'deudas' ? '3px solid var(--cip-red)' : '3px solid transparent', cursor: 'pointer', transition: 'all 0.2s' }}
          onClick={() => setTab('deudas')}
        >
          Deudas Pendientes
        </button>
        <button 
          style={{ flex: 1, padding: '1.25rem', border: 'none', background: 'transparent', fontSize: '1.125rem', fontWeight: tab === 'historial' ? '600' : '500', color: tab === 'historial' ? 'var(--success)' : 'var(--text-muted)', borderBottom: tab === 'historial' ? '3px solid var(--success)' : '3px solid transparent', cursor: 'pointer', transition: 'all 0.2s' }}
          onClick={() => setTab('historial')}
        >
          Historial de Pagos
        </button>
      </div>

      <div style={{ padding: '2rem' }}>
        {tab === 'deudas' && (
          <div>
            <div className="alert alert-warning" style={{ marginBottom: '2rem' }}>
              <AlertCircle size={24} />
              <div>
                <strong>Importante</strong>
                <p style={{ fontSize: '0.875rem' }}>Esta pantalla es únicamente para consulta. Los pagos deben realizarse presencialmente en caja o mediante transferencia a las cuentas oficiales del Colegio de Ingenieros indicando su CIP.</p>
              </div>
            </div>

            {deudas.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {deudas.map(d => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', border: '1px solid var(--danger-bg)', borderRadius: 'var(--radius-md)', background: '#fef2f2' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ background: 'var(--danger)', color: 'white', padding: '0.75rem', borderRadius: '50%' }}>
                        <Calendar size={20} />
                      </div>
                      <div>
                        <h4 style={{ color: 'var(--cip-blue)', fontSize: '1.125rem', marginBottom: '0.25rem' }}>Cuota {d.periodo}</h4>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Venció el: {d.vencimiento}</p>
                      </div>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--danger)' }}>
                      S/ {d.monto.toFixed(2)}
                    </div>
                  </div>
                ))}
                
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '2px dashed var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ color: 'var(--cip-blue)' }}>Deuda Total</h3>
                  <h2 style={{ color: 'var(--danger)', fontSize: '2rem' }}>
                    S/ {(deudas.reduce((sum, d) => sum + d.monto, 0)).toFixed(2)}
                  </h2>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={48} color="var(--success)" style={{ margin: '0 auto 1rem auto' }} />
                <h3>¡Al día!</h3>
                <p>No tiene cuotas pendientes de pago.</p>
              </div>
            )}
          </div>
        )}

        {tab === 'historial' && (
          <div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-main)', borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Periodo</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Fecha de Pago</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>N° Recibo</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'right' }}>Monto</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {cargando ? (
                    <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center' }}><Loader2 className="spin" /> Cargando pagos...</td></tr>
                  ) : historial.length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center' }}>No hay pagos registrados.</td></tr>
                  ) : (
                    historial.map(h => (
                      <tr key={h.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '1.25rem 1rem', fontWeight: '500' }}>{h.periodo}</td>
                        <td style={{ padding: '1.25rem 1rem' }}>{h.fecha_pago}</td>
                        <td style={{ padding: '1.25rem 1rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{h.nro_operacion || 'Caja'}</td>
                        <td style={{ padding: '1.25rem 1rem', textAlign: 'right', fontWeight: '600' }}>S/ {parseFloat(h.monto).toFixed(2)}</td>
                        <td style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>
                          <span style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.875rem', fontWeight: '600' }}>
                            PAGADO
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
