import { Users, FileText, CheckCircle, Clock } from 'lucide-react';

export default function AdminHome() {
  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: '800', color: 'var(--cip-blue)', marginBottom: '0.5rem' }}>Dashboard Administrativo</h1>
        <p className="text-muted">Resumen de operaciones y estado del colegio.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Metric Card 1 */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--cip-red)' }}>
          <div style={{ padding: '1rem', background: '#FEE2E2', borderRadius: '8px', color: 'var(--cip-red)' }}>
            <FileText size={24} />
          </div>
          <div>
            <p className="text-muted" style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' }}>Postulaciones Nuevas</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-main)' }}>124</h3>
          </div>
        </div>

        {/* Metric Card 2 */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--cip-blue)' }}>
          <div style={{ padding: '1rem', background: '#E0E7FF', borderRadius: '8px', color: 'var(--cip-blue)' }}>
            <Users size={24} />
          </div>
          <div>
            <p className="text-muted" style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' }}>Colegiados Activos</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-main)' }}>85,432</h3>
          </div>
        </div>

        {/* Metric Card 3 */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #10B981' }}>
          <div style={{ padding: '1rem', background: '#D1FAE5', borderRadius: '8px', color: '#059669' }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-muted" style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' }}>Pagos Procesados (Mes)</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-main)' }}>12,845</h3>
          </div>
        </div>

        {/* Metric Card 4 */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #F59E0B' }}>
          <div style={{ padding: '1rem', background: '#FEF3C7', borderRadius: '8px', color: '#D97706' }}>
            <Clock size={24} />
          </div>
          <div>
            <p className="text-muted" style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' }}>Trámites Atrasados</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-main)' }}>3</h3>
          </div>
        </div>
      </div>

      {/* Actividad Reciente */}
      <div className="card">
        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--cip-blue)', marginBottom: '1.5rem' }}>Actividad Reciente</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: '#F8FAFC', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontWeight: '600', color: 'var(--text-main)' }}>Inscripción Aprobada: María Gonzales</p>
              <p className="text-muted" style={{ fontSize: '0.875rem' }}>Vía Inscripción Presencial</p>
            </div>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Hace 10 min</span>
          </div>
          <div style={{ padding: '1rem', background: '#F8FAFC', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontWeight: '600', color: 'var(--text-main)' }}>Lote CSV Procesado: pagos_noviembre.csv</p>
              <p className="text-muted" style={{ fontSize: '0.875rem' }}>Se actualizaron 120 deudas</p>
            </div>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Hace 2 horas</span>
          </div>
        </div>
      </div>
    </div>
  );
}
