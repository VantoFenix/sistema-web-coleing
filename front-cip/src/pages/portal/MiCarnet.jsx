import { useState, useEffect } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function MiCarnet() {
  const [colegiado, setColegiado] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetchPerfil();
  }, []);

  const fetchPerfil = async () => {
    try {
      const token = localStorage.getItem('colToken');
      const res = await fetch('/api/portal/yo/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setColegiado(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  if (cargando) return <div style={{ textAlign: 'center', padding: '3rem' }}><Loader2 className="spin" /></div>;
  if (!colegiado) return <div style={{ textAlign: 'center', padding: '3rem' }}>Error al cargar datos.</div>;

  const tieneDeuda = !colegiado.habilitado;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
      
      {/* Nota sobre el estado real */}
      <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>El estado de habilitación se actualiza automáticamente con sus pagos.</p>
      </div>

      {tieneDeuda && (
        <div className="alert alert-danger" style={{ maxWidth: '400px', width: '100%' }}>
          <AlertCircle size={24} />
          <div>
            <strong>Estado: Inhabilitado</strong>
            <p style={{ fontSize: '0.875rem' }}>Usted mantiene cuotas pendientes. Por favor, regularice su situación para volver a estar habilitado.</p>
          </div>
        </div>
      )}

      {/* Tarjeta del Carnet */}
      <div className="carnet-wrapper" style={{ width: '100%' }}>
        <div className="carnet-card">
          
          <div className="carnet-header">
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '1px' }}>COLEGIO DE INGENIEROS DEL PERÚ</h2>
            <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '0.25rem' }}>CONSEJO NACIONAL</div>
          </div>

          <div className="carnet-body">
            {/* Foto Placeholder */}
            <div className="carnet-photo">
              <svg viewBox="0 0 100 120" style={{ width: '100%', height: '100%', fill: 'white', opacity: 0.5, padding: '10px' }}>
                <path d="M50,60 C63.807,60 75,48.807 75,35 C75,21.193 63.807,10 50,10 C36.193,10 25,21.193 25,35 C25,48.807 36.193,60 50,60 Z M50,65 C33.333,65 0,73.333 0,90 L0,110 L100,110 L100,90 C100,73.333 66.667,65 50,65 Z"></path>
              </svg>
            </div>
            
            <div className="carnet-info">
              <h3>{colegiado.nombres}</h3>
              
              <div style={{ margin: '1rem 0', width: '30px', height: '2px', background: 'var(--cip-red)' }}></div>
              
              <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '600', color: 'var(--text-main)' }}>
                {colegiado.carrera?.nombre}
              </p>
              
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>CIP N°</span>
                <span className="carnet-cip">{colegiado.nro_colegiado}</span>
              </div>
            </div>
          </div>

          {/* Watermark INHABILITADO */}
          {tieneDeuda && (
            <div className="carnet-watermark">
              INHABILITADO
            </div>
          )}

          <div style={{ background: 'var(--cip-blue)', color: 'white', padding: '0.5rem', textAlign: 'center', fontSize: '0.75rem' }}>
            {colegiado.sede?.nombre}
          </div>

        </div>
      </div>
      
    </div>
  );
}
