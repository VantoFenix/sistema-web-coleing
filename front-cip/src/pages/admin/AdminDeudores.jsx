import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, ArrowRight, Loader2, XCircle, Mail, Send, CheckCircle2 } from 'lucide-react';

export default function AdminDeudores() {
  const [deudores, setDeudores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorFetch, setErrorFetch] = useState('');
  const [notificandoId, setNotificandoId] = useState(null);
  const [notificandoAll, setNotificandoAll] = useState(false);
  const [avisoNotif, setAvisoNotif] = useState(null); // {tipo:'ok'|'err', texto}
  const navigate = useNavigate();

  useEffect(() => {
    fetchDeudores();
  }, []);

  const fetchDeudores = async () => {
    setCargando(true);
    setErrorFetch('');
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/admin/deudores/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDeudores(data);
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

  const notificar = async ({ ids = [], masivo = false }) => {
    setAvisoNotif(null);
    if (masivo) setNotificandoAll(true);
    else setNotificandoId(ids[0]);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/admin/deudores/notificar/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAvisoNotif({ tipo: 'err', texto: data.error || `Error ${res.status}` });
      } else {
        const partes = [`Enviados: ${data.enviados}`];
        if (data.sin_correo) partes.push(`sin correo: ${data.sin_correo}`);
        if (data.fallidos)   partes.push(`fallidos: ${data.fallidos}`);
        setAvisoNotif({ tipo: 'ok', texto: partes.join(' · ') });
      }
    } catch (e) {
      setAvisoNotif({ tipo: 'err', texto: `Sin conexión: ${e.message}` });
    } finally {
      setNotificandoId(null);
      setNotificandoAll(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '800', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={32} /> Panel de Deudores
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Colegiados con mensualidades vencidas. Desaparecen al pagar.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => notificar({ ids: [], masivo: true })}
            disabled={notificandoAll || cargando || deudores.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: '#DC2626', color: 'white', border: 'none', borderRadius: '8px', cursor: (notificandoAll || deudores.length === 0) ? 'not-allowed' : 'pointer', opacity: (notificandoAll || deudores.length === 0) ? 0.6 : 1 }}
          >
            {notificandoAll ? <Loader2 size={15} className="spin" /> : <Send size={15} />} Notificar a todos
          </button>
          <button
            onClick={fetchDeudores}
            disabled={cargando}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: cargando ? 'not-allowed' : 'pointer' }}
          >
            <Clock size={15} className={cargando ? 'spin' : ''} /> Actualizar
          </button>
        </div>
      </div>

      {errorFetch && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', color: '#B91C1C' }}>
          <XCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontWeight: '600' }}>{errorFetch}</p>
        </div>
      )}

      {avisoNotif && (
        <div style={{
          background: avisoNotif.tipo === 'ok' ? '#ECFDF5' : '#FEE2E2',
          border: `1px solid ${avisoNotif.tipo === 'ok' ? '#6EE7B7' : '#FCA5A5'}`,
          color: avisoNotif.tipo === 'ok' ? '#065F46' : '#B91C1C',
          borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          {avisoNotif.tipo === 'ok' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          <span style={{ fontWeight: '600' }}>{avisoNotif.texto}</span>
        </div>
      )}

      <div className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid #FCA5A5', borderTop: '4px solid #DC2626' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#FEF2F2', borderBottom: '2px solid #FCA5A5' }}>
              <th style={{ padding: '1rem 1.5rem', color: '#991B1B', fontWeight: '700' }}>DNI</th>
              <th style={{ padding: '1rem 1.5rem', color: '#991B1B', fontWeight: '700' }}>Colegiado</th>
              <th style={{ padding: '1rem 1.5rem', color: '#991B1B', fontWeight: '700', textAlign: 'center' }}>Meses</th>
              <th style={{ padding: '1rem 1.5rem', color: '#991B1B', fontWeight: '700', textAlign: 'right' }}>Deuda</th>
              <th style={{ padding: '1rem 1.5rem', color: '#991B1B', fontWeight: '700' }}>Estado</th>
              <th style={{ padding: '1rem 1.5rem', color: '#991B1B', fontWeight: '700', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center' }}><Loader2 className="spin" style={{margin:'0 auto'}}/></td></tr>
            ) : deudores.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#065F46' }}>
                <CheckCircle2 size={20} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                No hay deudores. Todos los colegiados están al día.
              </td></tr>
            ) : (
              deudores.map((d) => (
                <tr key={d.id} style={{ borderBottom: '1px solid #FCA5A5', background: 'white' }}>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: '600' }}>{d.dni}</td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ fontWeight: '600' }}>{d.nombre}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      CIP {d.nro_colegiado} · {d.carrera}{d.sede ? ` · ${d.sede}` : ''}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'center', fontWeight: '700', color: '#DC2626' }}>{d.meses_adeudados}</td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '700' }}>S/ {d.deuda_total.toFixed(2)}</td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{ background: '#FEF2F2', color: '#DC2626', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '700', border: '1px solid #FCA5A5' }}>
                      INHABILITADO
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => notificar({ ids: [d.id] })}
                        disabled={notificandoId === d.id || notificandoAll || !d.correo}
                        title={d.correo ? `Enviar recordatorio a ${d.correo}` : 'Colegiado sin correo registrado'}
                        style={{ background: 'white', color: '#DC2626', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: d.correo ? 'pointer' : 'not-allowed', border: '1px solid #FCA5A5', opacity: d.correo ? 1 : 0.4 }}
                      >
                        {notificandoId === d.id ? <Loader2 size={13} className="spin" /> : <Mail size={13} />} Notificar
                      </button>
                      <button
                        style={{ background: '#DC2626', color: 'white', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', border: 'none' }}
                        onClick={() => navigate('/admin/pagos-presencial', { state: { dni: d.dni } })}
                      >
                        Cobrar <ArrowRight size={13} />
                      </button>
                    </div>
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
