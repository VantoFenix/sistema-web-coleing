import { useState, useEffect } from 'react';
import { AlertCircle, Loader2, CheckCircle } from 'lucide-react';

export default function MiCarnet() {
  const [colegiado, setColegiado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [fotoError, setFotoError] = useState(false);

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPerfil();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (cargando) return (
    <div style={{ textAlign: 'center', padding: '5rem' }}>
      <Loader2 size={40} className="spin" style={{ color: 'var(--cip-red)', margin: '0 auto' }} />
      <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Cargando su carnet digital...</p>
    </div>
  );
  if (!colegiado) return <div style={{ textAlign: 'center', padding: '3rem' }}>Error al cargar datos.</div>;

  const habilitado = colegiado.habilitado;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', padding: '1rem 0' }}>

      {/* Estado Banner */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.6rem 1.5rem', borderRadius: '9999px', fontWeight: '700', fontSize: '0.9rem',
        background: habilitado === false ? '#FEE2E2' : '#D1FAE5',
        color: habilitado === false ? '#991B1B' : '#065F46',
        border: `2px solid ${habilitado === false ? '#FCA5A5' : '#6EE7B7'}`
      }}>
        {habilitado === false ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
        Estado Colegiado: {habilitado === false ? 'INHABILITADO' : 'HABILITADO'}
      </div>

      {/* Carnet — solo cara delantera */}
      <div style={{ width: '100%', maxWidth: '484px' }}>
        <div style={{
          position: 'relative',
          width: '100%', height: '297px',
        }}>

          {/* ===== CARA DELANTERA ===== */}
          <div style={{
            position: 'absolute', width: '100%', height: '100%',
            borderRadius: '14px', overflow: 'hidden', background: '#FFFFFF',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.1)',
            fontFamily: 'system-ui, sans-serif'
          }}>
            {/* Watermark Logo (Simulated faint background) */}
            <div style={{
              position: 'absolute', top: '50%', right: '-15%',
              transform: 'translateY(-50%)',
              opacity: 0.35, zIndex: 0
            }}>
              <img src="/webp-logo-cip.webp" alt="" style={{ width: '380px' }} />
            </div>

            {/* Header: Logo + institución */}
            <div style={{
              position: 'absolute', top: '20px', left: '20px', right: '20px',
              display: 'flex', alignItems: 'center', gap: '0.8rem', zIndex: 1
            }}>
              <img src="/webp-logo-cip.webp" alt="CIP" style={{ height: '70px', width: 'auto', flexShrink: 0 }} />
              <div style={{ flex: 1, textAlign: 'center', paddingTop: '4px' }}>
                <div style={{ color: '#000', fontWeight: '800', fontSize: '1.45rem', letterSpacing: '0.5px', lineHeight: 1.1 }}>
                  COLEGIO DE INGENIEROS<br/>DEL PERU
                </div>
              </div>
            </div>

            {/* Cuerpo del carnet */}
            <div style={{
              position: 'absolute', top: '105px', left: '20px', right: '20px', bottom: '16px',
              display: 'flex', gap: '1.5rem', alignItems: 'flex-start', zIndex: 1
            }}>
              {/* Foto */}
              <div style={{
                width: '120px', height: '156px', flexShrink: 0,
                borderRadius: '6px', overflow: 'hidden',
                background: '#eee',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {colegiado.foto_url && !colegiado.foto_url.includes('placeholder') && !fotoError ? (
                  <img
                    src={colegiado.foto_url}
                    alt="Foto"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={() => setFotoError(true)}
                  />
                ) : (
                  <svg viewBox="0 0 100 120" style={{ width: '70%', fill: 'rgba(0,0,0,0.2)' }}>
                    <path d="M50,55 C61,55 70,46 70,35 C70,24 61,15 50,15 C39,15 30,24 30,35 C30,46 39,55 50,55 Z M15,105 L85,105 C85,82 70,70 50,70 C30,70 15,82 15,105 Z"/>
                  </svg>
                )}
              </div>

              {/* Datos */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', paddingTop: '5px' }}>
                {/* Dividir Nombres y Apellidos */}
                <div style={{ color: '#000', fontWeight: '900', fontSize: '1.3rem', lineHeight: 1.35, marginBottom: '0.5rem' }}>
                  {(() => {
                    const parts = (colegiado.nombres || '').toUpperCase().trim().split(/\s+/);
                    let p = '', m = '', n = '';
                    if (parts.length === 1) p = parts[0];
                    else if (parts.length === 2) { p = parts[0]; n = parts[1]; }
                    else if (parts.length === 3) { p = parts[0]; m = parts[1]; n = parts[2]; }
                    else if (parts.length >= 4) { p = parts[0]; m = parts[1]; n = parts.slice(2).join(' '); }
                    
                    return (
                      <>
                        {p}<br/>
                        {m}{m && <br/>}
                        {n}
                      </>
                    );
                  })()}
                </div>

                <div style={{ color: '#000', fontWeight: '600', fontSize: '1.05rem', marginTop: '0.5rem', lineHeight: 1.2 }}>
                  Ing. {colegiado.carrera?.nombre?.toUpperCase()}
                </div>

                <div style={{ color: '#000', fontWeight: '600', fontSize: '1.05rem', marginTop: '0.2rem' }}>
                  DNI: {colegiado.dni}
                </div>

                <div style={{ marginTop: 'auto', textAlign: 'right' }}>
                  <div style={{ color: '#000', fontWeight: '800', fontSize: '1.4rem', letterSpacing: '0.5px' }}>
                    Nº Reg. CIP: {colegiado.nro_colegiado}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer — solo aparece cuando está INHABILITADO (cuotas atrasadas) */}
            {habilitado === false && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: '44px',
                background: 'rgba(220,38,38,0.3)',
                borderTop: '1px solid rgba(220,38,38,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
              }}>
                <AlertCircle size={18} color="#991B1B" />
                <span style={{ color: '#991B1B', fontWeight: '800', fontSize: '0.95rem', letterSpacing: '0.5px' }}>
                  INHABILITADO
                </span>
              </div>
            )}

            {/* Sello diagonal — solo cuando está INHABILITADO */}
            {habilitado === false && (
              <div style={{
                position: 'absolute', top: '50%', left: '55%',
                transform: 'translate(-50%, -50%) rotate(-30deg)',
                fontSize: '2.4rem', fontWeight: '900', color: 'rgba(220,38,38,0.35)',
                border: '4.5px solid rgba(220,38,38,0.35)',
                padding: '0.3rem 0.8rem', borderRadius: '8px',
                letterSpacing: '3px', pointerEvents: 'none', zIndex: 10,
              }}>
                INHABILITADO
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Mensaje de estado */}
      {habilitado === false && (
        <div className="alert alert-danger" style={{ maxWidth: '440px', width: '100%' }}>
          <AlertCircle size={20} />
          <div>
            <strong>Cuotas Pendientes</strong>
            <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Regularice sus pagos mensuales para volver a ser habilitado. Contacte a su sede departamental.
            </p>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
