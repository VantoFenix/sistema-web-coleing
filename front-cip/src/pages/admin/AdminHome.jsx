import { useState, useEffect } from 'react';
import { Settings, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AdminHome() {
  const [monto, setMonto]                 = useState('');
  const [montoGuardado, setMontoGuardado] = useState('');
  const [guardando, setGuardando]         = useState(false);
  const [msgConfig, setMsgConfig]         = useState({ tipo: '', texto: '' });

  useEffect(() => {
    fetch('/api/admin/configuracion/')
      .then(r => r.json())
      .then(d => {
        setMonto(d.monto_mensualidad || '20.00');
        setMontoGuardado(d.monto_mensualidad || '20.00');
      })
      .catch(() => {});
  }, []);

  const handleGuardar = async () => {
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      <p style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: '500', letterSpacing: '0.3px' }}>
        Configuración del sistema
      </p>

      <div style={{
        background: 'white', borderRadius: '14px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
        overflow: 'hidden',
      }}>
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

        <div style={{ padding: '1.5rem' }}>
          <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: '1.25rem' }}>
            Define el monto que se cobrará por cada mensualidad. Este valor se aplica a todos los pagos del portal y caja.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '0.4rem' }}>
                Precio por mensualidad (S/)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #D1D5DB', borderRadius: '8px', overflow: 'hidden', background: 'white' }}>
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
                  onKeyDown={e => e.key === 'Enter' && handleGuardar()}
                  placeholder="20.00"
                  style={{
                    flex: 1, padding: '0.65rem 0.85rem', border: 'none', outline: 'none',
                    fontSize: '1.1rem', fontWeight: '700', color: '#0F172A', fontFamily: 'monospace',
                  }}
                />
              </div>
            </div>

            <button
              onClick={handleGuardar}
              disabled={guardando}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.45rem',
                padding: '0.65rem 1.25rem', borderRadius: '8px', border: 'none',
                background: guardando ? '#94A3B8' : 'linear-gradient(135deg, #0F172A, #1E3A5F)',
                color: 'white', fontWeight: '700', fontSize: '0.875rem',
                cursor: guardando ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(15,23,42,0.2)', whiteSpace: 'nowrap',
              }}
            >
              {guardando ? <><Loader2 size={15} className="spin" /> Guardando…</> : <><Save size={15} /> Guardar precio</>}
            </button>
          </div>

          {msgConfig.texto && (
            <div style={{
              marginTop: '0.85rem', padding: '0.65rem 1rem', borderRadius: '8px',
              display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: '600',
              background: msgConfig.tipo === 'ok' ? '#D1FAE5' : '#FEE2E2',
              color:      msgConfig.tipo === 'ok' ? '#065F46' : '#991B1B',
              border:     `1px solid ${msgConfig.tipo === 'ok' ? '#6EE7B7' : '#FCA5A5'}`,
            }}>
              {msgConfig.tipo === 'ok' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
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
