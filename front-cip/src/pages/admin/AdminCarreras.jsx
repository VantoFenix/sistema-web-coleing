import { useState, useEffect } from 'react';
import { BookOpen, Plus, Loader2 } from 'lucide-react';

export default function AdminCarreras() {
  const [carreras, setCarreras] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorFetch, setErrorFetch] = useState('');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [nombreCarrera, setNombreCarrera] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState('');

  useEffect(() => {
    fetchCarreras();
  }, []);

  const fetchCarreras = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/master/carreras/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCarreras(data);
      } else {
        setErrorFetch('Error al cargar las carreras.');
      }
    } catch (e) {
      setErrorFetch('Error de conexión.');
    } finally {
      setCargando(false);
    }
  };

  const handleCrearCarrera = async (e) => {
    e.preventDefault();
    if (!nombreCarrera.trim()) return;

    setGuardando(true);
    setErrorGuardar('');

    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/master/carreras/', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nombre: nombreCarrera.trim() })
      });

      if (res.ok) {
        setNombreCarrera('');
        setShowModal(false);
        fetchCarreras();
      } else {
        setErrorGuardar('Error al crear la carrera.');
      }
    } catch (e) {
      setErrorGuardar('Error de conexión.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--cip-blue)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BookOpen size={32} />
            Gestión de Carreras
          </h1>
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>
            Administra las ingenierías y especialidades registradas.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={20} />
          Nueva Carrera
        </button>
      </div>

      {cargando ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
          <Loader2 className="animate-spin" size={40} color="var(--cip-blue)" />
        </div>
      ) : errorFetch ? (
        <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
          {errorFetch}
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--cip-blue)' }}>ID</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--cip-blue)' }}>Nombre de Carrera</th>
              </tr>
            </thead>
            <tbody>
              {carreras.length === 0 ? (
                <tr>
                  <td colSpan="2" style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
                    No hay carreras registradas.
                  </td>
                </tr>
              ) : (
                carreras.map(carrera => (
                  <tr key={carrera.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '1rem', color: '#64748B' }}>#{carrera.id}</td>
                    <td style={{ padding: '1rem', fontWeight: '500' }}>{carrera.nombre}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--cip-blue)' }}>
              Registrar Nueva Carrera
            </h2>
            
            {errorGuardar && (
              <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {errorGuardar}
              </div>
            )}

            <form onSubmit={handleCrearCarrera}>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Nombre de la Carrera</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ej: Ingeniería Civil"
                  value={nombreCarrera}
                  onChange={(e) => setNombreCarrera(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" style={{ background: '#E2E8F0', color: '#475569' }} onClick={() => setShowModal(false)} disabled={guardando}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Guardar Carrera'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
