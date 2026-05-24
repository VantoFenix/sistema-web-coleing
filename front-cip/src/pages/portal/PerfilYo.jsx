import { useState, useEffect } from 'react';
import { Mail, GraduationCap, UserCircle, Briefcase, MapPin, Loader2, CheckCircle2, AlertCircle, User } from 'lucide-react';

export default function PerfilYo() {
  const [colegiado, setColegiado] = useState(null);
  const [cargando, setCargando]   = useState(true);
  const [fotoError, setFotoError] = useState(false);

  useEffect(() => { fetchPerfil(); }, []);

  const fetchPerfil = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem('colToken');
      const res = await fetch('/api/portal/yo/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setColegiado(data);
        setFotoError(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  if (cargando) return (
    <div style={{ textAlign: 'center', padding: '3rem' }}>
      <Loader2 size={32} className="spin" style={{ color: 'var(--cip-blue)', margin: '0 auto', display: 'block' }} />
    </div>
  );
  if (!colegiado) return (
    <div style={{ textAlign: 'center', padding: '3rem', color: '#DC2626' }}>
      Error al cargar datos.
    </div>
  );

  const fotoActual = (colegiado.foto_url && !colegiado.foto_url.includes('placeholder') && !fotoError)
    ? colegiado.foto_url : null;

  return (
    <div className="card" style={{ maxWidth: '820px', margin: '0 auto' }}>

      {/* ── Cabecera con foto ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' }}>

        {/* Foto circular */}
        <div style={{
          width: 110, height: 110, borderRadius: '50%', overflow: 'hidden',
          border: '3px solid var(--cip-blue)',
          background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {fotoActual ? (
            <img
              src={fotoActual}
              alt="Foto de perfil"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={() => setFotoError(true)}
            />
          ) : (
            <User size={52} color="#94A3B8" />
          )}
        </div>

        {/* Info principal */}
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
            <UserCircle size={22} color="var(--cip-blue)" />
            <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--cip-blue)', margin: 0 }}>
              Mis Datos Personales
            </h2>
          </div>
          <p style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.3rem' }}>
            {colegiado.nombres}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Briefcase size={14} color="var(--text-muted)" />
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              CIP {colegiado.nro_colegiado}
            </span>
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '700',
            background: colegiado.habilitado ? '#D1FAE5' : '#FEE2E2',
            color: colegiado.habilitado ? '#065F46' : '#991B1B',
            marginTop: '0.2rem',
          }}>
            {colegiado.habilitado ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
            {colegiado.habilitado ? 'HABILITADO' : 'INHABILITADO'}
          </div>
        </div>
      </div>

      {/* ── Datos detallados ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem',
        paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)',
      }}>
        {[
          { label: 'DNI',              value: colegiado.dni,                icon: <Briefcase size={14} /> },
          { label: 'N° Colegiatura',   value: `CIP ${colegiado.nro_colegiado}`, icon: <Briefcase size={14} /> },
          { label: 'Correo Electrónico', value: colegiado.correo,           icon: <Mail size={14} /> },
          { label: 'Especialidad',     value: colegiado.carrera?.nombre,    icon: <GraduationCap size={14} /> },
          { label: 'Sede Departamental', value: colegiado.sede?.nombre || '—', icon: <MapPin size={14} /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="form-group" style={{ margin: 0 }}>
            <label style={{
              fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.4px',
              display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem',
            }}>
              {icon} {label}
            </label>
            <div style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--text-main)' }}>
              {value || '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
