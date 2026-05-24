import { Mail, GraduationCap, UserCircle, Briefcase, MapPin } from 'lucide-react';

export default function PerfilYo() {
  // Datos mockeados del colegiado
  const colegiado = {
    dni: '70123456',
    nombres: 'JUAN CARLOS',
    apellidos: 'PÉREZ GARCÍA',
    carrera: 'INGENIERÍA DE SISTEMAS E INTELIGENCIA ARTIFICIAL',
    correo: 'juan.perez@ingenieros.pe',
    titulo: 'Ingeniero de Sistemas',
    sede: 'Consejo Departamental Lima',
    fechaColegiatura: '15/03/2020'
  };

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
          <label className="text-muted" style={{ fontSize: '0.875rem' }}>Fecha de Colegiatura</label>
          <div style={{ fontSize: '1.125rem', fontWeight: '500' }}>{colegiado.fechaColegiatura}</div>
        </div>

        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="text-muted" style={{ fontSize: '0.875rem' }}>Apellidos y Nombres</label>
          <div style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--cip-blue)' }}>
            {colegiado.apellidos}, {colegiado.nombres}
          </div>
        </div>

        <div className="form-group">
          <label className="text-muted" style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Briefcase size={14} /> Título Profesional
          </label>
          <div style={{ fontSize: '1rem', fontWeight: '500' }}>{colegiado.titulo}</div>
        </div>

        <div className="form-group">
          <label className="text-muted" style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <GraduationCap size={14} /> Carrera
          </label>
          <div style={{ fontSize: '1rem', fontWeight: '500' }}>{colegiado.carrera}</div>
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
          <div style={{ fontSize: '1rem', fontWeight: '500' }}>{colegiado.sede}</div>
        </div>
      </div>
    </div>
  );
}
