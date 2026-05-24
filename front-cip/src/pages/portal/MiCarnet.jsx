import { useState, useEffect } from 'react';
import { AlertCircle, Loader2, CheckCircle, Shield, Download } from 'lucide-react';

export default function MiCarnet() {
  const [colegiado, setColegiado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [flipped, setFlipped] = useState(false);

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
  const hoy = new Date();
  const vencimiento = new Date(hoy.getFullYear() + 1, hoy.getMonth(), hoy.getDate());
  const vencimientoStr = vencimiento.toLocaleDateString('es-PE', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const fechaDesde = colegiado.colegiado_desde
    ? new Date(colegiado.colegiado_desde).toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', padding: '1rem 0' }}>

      {/* Estado Banner */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.6rem 1.5rem', borderRadius: '9999px', fontWeight: '700', fontSize: '0.9rem',
        background: habilitado ? '#D1FAE5' : '#FEE2E2',
        color: habilitado ? '#065F46' : '#991B1B',
        border: `2px solid ${habilitado ? '#6EE7B7' : '#FCA5A5'}`
      }}>
        {habilitado ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
        Estado Colegiado: {habilitado ? 'HABILITADO' : 'INHABILITADO'}
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
            borderRadius: '14px', overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)'
          }}>
            {/* Fondo con gradiente */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 60%, #0F172A 100%)',
            }} />
            {/* Pattern decorativo */}
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.04,
              backgroundImage: 'repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)',
              backgroundSize: '8px 8px'
            }} />

            {/* Banda roja izquierda */}
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px',
              background: 'linear-gradient(180deg, #B91C1C, #991B1B)',
            }} />

            {/* Header: Logo + institución */}
            <div style={{
              position: 'absolute', top: 0, left: '8px', right: 0, padding: '0.9rem 1rem 0.6rem 1rem',
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
              <img src="/webp-logo-cip.webp" alt="CIP" style={{ height: '32px', width: 'auto', flexShrink: 0 }} />
              <div>
                <div style={{ color: 'white', fontWeight: '800', fontSize: '0.7rem', letterSpacing: '1.5px', lineHeight: 1.2 }}>
                  COLEGIO DE INGENIEROS DEL PERÚ
                </div>
                <div style={{ color: '#94A3B8', fontSize: '0.6rem', letterSpacing: '1px' }}>
                  CONSEJO NACIONAL • {colegiado.sede?.nombre?.toUpperCase()}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ color: '#94A3B8', fontSize: '0.55rem', letterSpacing: '0.5px' }}>TIPO</div>
                <div style={{ color: 'white', fontWeight: '700', fontSize: '0.65rem' }}>ORDINARIO</div>
              </div>
            </div>

            {/* Cuerpo del carnet */}
            <div style={{
              position: 'absolute', top: '68px', left: '8px', right: 0, bottom: '44px',
              padding: '0.8rem 1rem', display: 'flex', gap: '1rem', alignItems: 'flex-start'
            }}>
              {/* Foto */}
              <div style={{
                width: '80px', height: '100px', flexShrink: 0,
                borderRadius: '6px', overflow: 'hidden',
                border: '2px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {colegiado.foto_url && !colegiado.foto_url.includes('placeholder') ? (
                  <img src={colegiado.foto_url} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <svg viewBox="0 0 100 120" style={{ width: '70%', fill: 'rgba(255,255,255,0.4)' }}>
                    <path d="M50,55 C61,55 70,46 70,35 C70,24 61,15 50,15 C39,15 30,24 30,35 C30,46 39,55 50,55 Z M15,105 L85,105 C85,82 70,70 50,70 C30,70 15,82 15,105 Z"/>
                  </svg>
                )}
              </div>

              {/* Datos */}
              <div style={{ flex: 1 }}>
                <div style={{ color: '#94A3B8', fontSize: '0.55rem', letterSpacing: '1px', marginBottom: '0.2rem' }}>APELLIDOS Y NOMBRES</div>
                <div style={{ color: 'white', fontWeight: '700', fontSize: '0.85rem', lineHeight: 1.3, marginBottom: '0.7rem' }}>
                  {colegiado.nombres}
                </div>

                <div style={{ color: '#94A3B8', fontSize: '0.55rem', letterSpacing: '1px', marginBottom: '0.2rem' }}>ESPECIALIDAD</div>
                <div style={{ color: '#CBD5E1', fontWeight: '600', fontSize: '0.68rem', marginBottom: '0.7rem', lineHeight: 1.3 }}>
                  {colegiado.carrera?.nombre?.toUpperCase()}
                </div>

                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  <div>
                    <div style={{ color: '#94A3B8', fontSize: '0.55rem', letterSpacing: '1px', marginBottom: '0.2rem' }}>REG. CIP</div>
                    <div style={{ color: '#FCA5A5', fontWeight: '800', fontSize: '1.1rem', letterSpacing: '1px' }}>
                      {colegiado.nro_colegiado}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#94A3B8', fontSize: '0.55rem', letterSpacing: '1px', marginBottom: '0.2rem' }}>VIGENCIA</div>
                    <div style={{ color: '#CBD5E1', fontWeight: '600', fontSize: '0.72rem' }}>{vencimientoStr}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              position: 'absolute', bottom: 0, left: '8px', right: 0, height: '40px',
              background: habilitado ? 'rgba(16,185,129,0.2)' : 'rgba(220,38,38,0.3)',
              borderTop: `1px solid ${habilitado ? 'rgba(16,185,129,0.4)' : 'rgba(220,38,38,0.4)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
            }}>
              {habilitado ? (
                <>
                  <CheckCircle size={14} color="#10B981" />
                  <span style={{ color: '#10B981', fontWeight: '700', fontSize: '0.7rem', letterSpacing: '1px' }}>HABILITADO</span>
                </>
              ) : (
                <>
                  <AlertCircle size={14} color="#EF4444" />
                  <span style={{ color: '#EF4444', fontWeight: '700', fontSize: '0.7rem', letterSpacing: '1px' }}>INHABILITADO — CUOTAS PENDIENTES</span>
                </>
              )}
            </div>

            {/* Watermark INHABILITADO */}
            {!habilitado && (
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
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)' }} />
            {/* Banda */}
            <div style={{ position: 'absolute', top: '40px', left: 0, right: 0, height: '40px', background: '#000', opacity: 0.8 }} />
            {/* Contenido reverso */}
            <div style={{ position: 'absolute', inset: 0, padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ color: '#94A3B8', fontSize: '0.65rem', fontWeight: '700', letterSpacing: '1px' }}>INFORMACIÓN DEL COLEGIADO</div>
              <div style={{ marginTop: '2.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                {[
                  { label: 'DNI', val: colegiado.dni },
                  { label: 'SEDE', val: colegiado.sede?.nombre },
                  { label: 'COLEGIADO DESDE', val: fechaDesde },
                  { label: 'CORREO', val: colegiado.correo },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <div style={{ color: '#64748B', fontSize: '0.55rem', letterSpacing: '1px' }}>{label}</div>
                    <div style={{ color: '#E2E8F0', fontWeight: '600', fontSize: '0.7rem', marginTop: '0.1rem' }}>{val || '—'}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={14} color="#64748B" />
                <span style={{ color: '#475569', fontSize: '0.58rem' }}>
                  Este carnet es de uso personal e intransferible. Cualquier falsificación será sancionada.
                </span>
              </div>
              <div style={{ textAlign: 'center', color: '#334155', fontSize: '0.6rem', marginTop: '0.3rem' }}>
                www.cip.org.pe
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
      {!habilitado && (
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
