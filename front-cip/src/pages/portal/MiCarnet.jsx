import { useState } from 'react';
import { AlertCircle } from 'lucide-react';

export default function MiCarnet() {
  // Simulador de estado para probar el diseño
  const [tieneDeuda, setTieneDeuda] = useState(false);

  const colegiado = {
    cip: '45892',
    nombres: 'JUAN CARLOS',
    apellidos: 'PÉREZ GARCÍA',
    carrera: 'INGENIERÍA DE SISTEMAS',
    sede: 'CD LIMA'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
      
      {/* Botón para probar dinámicamente (solo para desarrollo) */}
      <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontWeight: '500' }}>Simulador de Estado:</span>
        <button 
          className={`btn ${tieneDeuda ? 'btn-outline' : 'btn-primary'}`} 
          style={tieneDeuda ? { color: 'var(--cip-blue)', borderColor: 'var(--cip-blue)' } : {}}
          onClick={() => setTieneDeuda(false)}
        >
          Habilitado
        </button>
        <button 
          className={`btn ${!tieneDeuda ? 'btn-outline' : 'btn-primary'}`} 
          style={!tieneDeuda ? { color: 'var(--danger)', borderColor: 'var(--danger)' } : { background: 'var(--danger)', color: 'white' }}
          onClick={() => setTieneDeuda(true)}
        >
          Inhabilitado
        </button>
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
              <h3>{colegiado.apellidos}</h3>
              <p style={{ color: 'var(--cip-blue)', fontWeight: '500' }}>{colegiado.nombres}</p>
              
              <div style={{ margin: '1rem 0', width: '30px', height: '2px', background: 'var(--cip-red)' }}></div>
              
              <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '600', color: 'var(--text-main)' }}>
                {colegiado.carrera}
              </p>
              
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>CIP N°</span>
                <span className="carnet-cip">{colegiado.cip}</span>
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
            {colegiado.sede}
          </div>

        </div>
      </div>
      
    </div>
  );
}
