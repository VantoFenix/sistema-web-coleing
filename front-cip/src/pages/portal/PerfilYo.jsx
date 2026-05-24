import { useState, useEffect } from 'react';
import { Mail, GraduationCap, UserCircle, Briefcase, MapPin, Loader2 } from 'lucide-react';

export default function PerfilYo() {
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

  return (
    <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <UserCircle size={32} color="var(--cip-blue)" />
        <h2 style={{ marginBottom: 0 }}>Mis Datos Personales</h2>
      </div>

      <div className="form-row" style={{ marginTop: '2rem' }}>
        <div className="form-group">
          <label className="text-muted" style={{ fontSize: '0.875rem' }}>DNI</label>
          <div style={{ fontSize: '1.125rem', fontWeight: '500' }}>{colegiado.dni}</div>
        </div>
        <div className="form-group">
          <label className="text-muted" style={{ fontSize: '0.875rem' }}>Condición</label>
          <div style={{ fontSize: '1.125rem', fontWeight: '500', color: colegiado.habilitado ? 'var(--success)' : 'var(--danger)' }}>
            {colegiado.habilitado ? 'HABILITADO' : 'INHABILITADO'}
          </div>
        </div>

        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="text-muted" style={{ fontSize: '0.875rem' }}>Nombres Completos</label>
          <div style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--cip-blue)' }}>
            {colegiado.nombres}
          </div>
        </div>

        <div className="form-group">
          <label className="text-muted" style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Briefcase size={14} /> Nro Colegiatura
          </label>
          <div style={{ fontSize: '1rem', fontWeight: '500' }}>CIP {colegiado.nro_colegiado}</div>
        </div>

        <div className="form-group">
          <label className="text-muted" style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <GraduationCap size={14} /> Carrera
          </label>
          <div style={{ fontSize: '1rem', fontWeight: '500' }}>{colegiado.carrera?.nombre}</div>
        </div>

        <div className="form-group">
          <label className="text-muted" style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Mail size={14} /> Correo Electrónico
          </label>
          <div style={{ fontSize: '1rem', fontWeight: '500' }}>{colegiado.correo}</div>
        </div>

        <div className="form-group">
          <label className="text-muted" style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <MapPin size={14} /> Sede Departamental
          </label>
          <div style={{ fontSize: '1rem', fontWeight: '500' }}>{colegiado.sede?.nombre}</div>
        </div>
      </div>
    </div>
  );
}
