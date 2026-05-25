import { useState, useEffect } from 'react';
import { AlertCircle, Loader2, CheckCircle } from 'lucide-react';

export default function MiCarnet() {
  const [colegiado, setColegiado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const [fotoError, setFotoError] = useState(false);

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

  if (cargando) return (
    <div style={{ textAlign: 'center', padding: '5rem' }}>
      <Loader2 size={40} className="spin" style={{ color: 'var(--cip-red)', margin: '0 auto' }} />
      <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Cargando su carnet digital...</p>
    </div>
  );
  if (!colegiado) return <div style={{ textAlign: 'center', padding: '3rem' }}>Error al cargar datos.</div>;

  const habilitado = colegiado.habilitado;
  const fechaEmision = colegiado.colegiado_desde
    ? new Date(colegiado.colegiado_desde + 'T00:00:00').toLocaleDateString('es-PE', { year: 'numeric', month: '2-digit', day: '2-digit' })
    : '—';

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

      {/* Contenedor de Flip */}
      <div
        style={{ perspective: '1200px', width: '100%', maxWidth: '440px', cursor: 'pointer' }}
        onClick={() => setFlipped(f => !f)}
        title="Clic para ver el reverso"
      >
        <div style={{
          position: 'relative',
          width: '100%', height: '270px',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}>

          {/* ===== CARA DELANTERA ===== */}
          <div style={{
            position: 'absolute', width: '100%', height: '100%',
            backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
            borderRadius: '14px', overflow: 'hidden', background: '#FFFFFF',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.1)',
            fontFamily: 'system-ui, sans-serif'
          }}>
            {/* Watermark Logo (Simulated faint background) */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              opacity: 0.08, zIndex: 0
            }}>
              <img src="/webp-logo-cip.webp" alt="" style={{ width: '200px' }} />
            </div>

            {/* Header: Logo + institución */}
            <div style={{
              position: 'absolute', top: '15px', left: '15px', right: '15px',
              display: 'flex', alignItems: 'center', gap: '0.6rem', zIndex: 1
            }}>
              <img src="/webp-logo-cip.webp" alt="CIP" style={{ height: '40px', width: 'auto', flexShrink: 0 }} />
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ color: '#333', fontWeight: '800', fontSize: '1rem', letterSpacing: '0.5px', lineHeight: 1.1 }}>
                  COLEGIO DE INGENIEROS<br/>DEL PERÚ
                </div>
              </div>
            </div>

            {/* Cuerpo del carnet */}
            <div style={{
              position: 'absolute', top: '70px', left: '15px', right: '15px', bottom: '15px',
              display: 'flex', gap: '1rem', alignItems: 'flex-start', zIndex: 1
            }}>
              {/* Foto */}
              <div style={{
                width: '95px', height: '125px', flexShrink: 0,
                borderRadius: '4px', overflow: 'hidden',
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
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Dividir Nombres y Apellidos (Aproximación simple, el último o 2 últimos nombres como nombres y primeros como apellidos, pero acá mostramos todo) */}
                <div style={{ color: '#222', fontWeight: '800', fontSize: '0.9rem', lineHeight: 1.2, marginBottom: '0.2rem' }}>
                  {colegiado.nombres}
                </div>

                <div style={{ color: '#444', fontWeight: '600', fontSize: '0.75rem', marginTop: '0.8rem', lineHeight: 1.2 }}>
                  Ing. {colegiado.carrera?.nombre?.toUpperCase()}
                </div>

                <div style={{ color: '#444', fontWeight: '600', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                  DNI: <span style={{ fontWeight: '400' }}>{colegiado.dni}</span>
                </div>

                <div style={{ marginTop: 'auto', textAlign: 'right' }}>
                  <div style={{ color: '#222', fontWeight: '800', fontSize: '1.2rem', letterSpacing: '1px' }}>
                    CIP {colegiado.nro_colegiado}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer — solo aparece cuando está INHABILITADO (cuotas atrasadas) */}
            {habilitado === false && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: '40px',
                background: 'rgba(220,38,38,0.3)',
                borderTop: '1px solid rgba(220,38,38,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
              }}>
                <AlertCircle size={14} color="#EF4444" />
                <span style={{ color: '#EF4444', fontWeight: '700', fontSize: '0.7rem', letterSpacing: '1px' }}>
                  INHABILITADO — CUOTAS PENDIENTES
                </span>
              </div>
            )}

            {/* Sello diagonal — solo cuando está INHABILITADO */}
            {habilitado === false && (
              <div style={{
                position: 'absolute', top: '50%', left: '55%',
                transform: 'translate(-50%, -50%) rotate(-30deg)',
                fontSize: '2.2rem', fontWeight: '900', color: 'rgba(220,38,38,0.35)',
                border: '4px solid rgba(220,38,38,0.35)',
                padding: '0.3rem 0.8rem', borderRadius: '8px',
                letterSpacing: '3px', pointerEvents: 'none', zIndex: 10,
              }}>
                INHABILITADO
              </div>
            )}
          </div>

          {/* ===== CARA TRASERA ===== */}
          <div style={{
            position: 'absolute', width: '100%', height: '100%',
            backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: '14px', overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            background: '#FFFFFF',
            fontFamily: 'system-ui, sans-serif',
            display: 'flex', flexDirection: 'column'
          }}>
            {/* Header: logos ICO_BLACK + texto membresía */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 10px 7px'
            }}>
              <img src="/ICO_BLACK.webp" alt="CIP" style={{ height: '54px', width: 'auto', flexShrink: 0 }} />
              <div style={{
                flex: 1, textAlign: 'center', padding: '0 8px',
                fontSize: '0.62rem', fontWeight: '700', color: '#111', lineHeight: 1.4,
                borderBottom: '1px solid #9ca3af', paddingBottom: '6px'
              }}>
                El titular de este carné es miembro del<br/>
                <span style={{ fontSize: '0.67rem' }}>Colegio de Ingenieros del Perú</span>
              </div>
              <img src="/ICO_BLACK.webp" alt="CIP" style={{ height: '54px', width: 'auto', flexShrink: 0 }} />
            </div>

            {/* Firma del titular */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '5px 0 2px' }}>
              <div style={{
                width: '155px', height: '38px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderBottom: '1px solid #6b7280'
              }}>
                {colegiado.firma_url ? (
                  <img src={colegiado.firma_url} alt="Firma"
                    style={{ maxHeight: '34px', maxWidth: '150px', objectFit: 'contain' }} />
                ) : (
                  <span style={{ color: '#d1d5db', fontSize: '0.5rem' }}>—</span>
                )}
              </div>
              <div style={{ fontSize: '0.46rem', color: '#6b7280', marginTop: '1px', letterSpacing: '0.8px' }}>
                Firma del Titular
              </div>
            </div>

            {/* Autoridades — layout asimétrico */}
            <div style={{ display: 'flex', alignItems: 'flex-end', padding: '3px 10px 0', gap: '6px', flex: 1 }}>

              {/* Director — izquierda, más estrecho */}
              <div style={{ textAlign: 'center', width: '44%' }}>
                <svg viewBox="0 0 120 38" style={{ width: '96px', height: '30px', display: 'block', margin: '0 auto' }}>
                  <path d="M8,28 C16,11 28,9 38,20 C44,26 50,13 60,15 C70,17 75,24 85,19 C93,15 103,20 112,17"
                    fill="none" stroke="#1a1a1a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22,33 C48,30 74,32 96,30"
                    fill="none" stroke="#1a1a1a" strokeWidth="1" strokeLinecap="round"/>
                </svg>
                <div style={{ fontSize: '0.48rem', fontWeight: '700', color: '#111', lineHeight: 1.3 }}>
                  Ing. Marco Antonio<br/>Cabrera Huamán
                </div>
                <div style={{ fontSize: '0.41rem', color: '#4b5563', lineHeight: 1.3, marginTop: '1px' }}>
                  DIRECTOR SECRETARIO<br/>NACIONAL
                </div>
              </div>

              {/* Decana — derecha, más ancha y grande */}
              <div style={{ textAlign: 'center', width: '56%' }}>
                <svg viewBox="0 0 130 44" style={{ width: '112px', height: '38px', display: 'block', margin: '0 auto' }}>
                  <path d="M6,22 C14,8 26,5 36,16 C43,22 50,10 62,13 C74,16 80,7 92,12 C102,16 114,23 124,19"
                    fill="none" stroke="#1a1a1a" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M20,30 C44,27 68,30 92,26 C100,25 110,28 120,26"
                    fill="none" stroke="#1a1a1a" strokeWidth="1.2" strokeLinecap="round"/>
                  <path d="M30,37 C50,35 70,37 88,35"
                    fill="none" stroke="#1a1a1a" strokeWidth="0.7" strokeLinecap="round" strokeDasharray="2,2"/>
                </svg>
                <div style={{ fontSize: '0.55rem', fontWeight: '700', color: '#111', lineHeight: 1.3 }}>
                  Ing. María del Carmen<br/>Ponce Mejía
                </div>
                <div style={{ fontSize: '0.46rem', color: '#4b5563', lineHeight: 1.3, marginTop: '1px' }}>
                  DECANA NACIONAL
                </div>
              </div>
            </div>

            {/* Footer: aviso izquierda + Fecha Emisión derecha, al fondo */}
            <div style={{
              borderTop: '1px solid #e5e7eb', marginTop: 'auto',
              padding: '4px 12px 6px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end'
            }}>
              <div style={{ fontSize: '0.38rem', color: '#9ca3af', maxWidth: '52%', lineHeight: 1.3 }}>
                En caso de encontrarlo sírvase entregarlo a la institución
              </div>
              <div style={{ fontSize: '0.52rem', color: '#1a1a1a', fontWeight: '700', whiteSpace: 'nowrap' }}>
                Fecha Emisión: {fechaEmision}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Indicador flip */}
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span>👆</span> Clic en el carnet para ver el reverso
      </p>

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
