import { useState, useEffect } from 'react';
import { Building2, Plus, Loader2, Edit, Power, PowerOff } from 'lucide-react';

export default function AdminSedes() {
  const [sedes, setSedes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorFetch, setErrorFetch] = useState('');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [sedeEditando, setSedeEditando] = useState(null); // null = Crear, object = Editar
  const [nombreSede, setNombreSede] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState('');

  useEffect(() => {
    fetchSedes();
  }, []);

  const fetchSedes = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/master/sedes/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSedes(data.results ? data.results : data);
      } else {
        setErrorFetch('Error al cargar las sedes.');
      }
    } catch (e) {
      setErrorFetch('Error de conexión.');
    } finally {
      setCargando(false);
    }
  };

  const handleOpenModal = (sede = null) => {
    setSedeEditando(sede);
    setNombreSede(sede ? sede.nombre : '');
    setErrorGuardar('');
    setShowModal(true);
  };

  const handleGuardarSede = async (e) => {
    e.preventDefault();
    if (!nombreSede.trim()) return;

    setGuardando(true);
    setErrorGuardar('');

    try {
      const token = localStorage.getItem('adminToken');
      const url = sedeEditando ? `/api/master/sedes/${sedeEditando.id}/` : '/api/master/sedes/';
      const method = sedeEditando ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nombre: nombreSede.trim() })
      });

      if (res.ok) {
        setShowModal(false);
        fetchSedes();
      } else {
        setErrorGuardar(sedeEditando ? 'Error al actualizar la sede.' : 'Error al crear la sede.');
      }
    } catch (e) {
      setErrorGuardar('Error de conexión.');
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleEstado = async (sede) => {
    if (!window.confirm(`¿Seguro que deseas ${sede.activo ? 'deshabilitar' : 'habilitar'} la sede "${sede.nombre}"?`)) return;
    
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`/api/master/sedes/${sede.id}/`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ activo: !sede.activo })
      });

      if (res.ok) {
        fetchSedes();
      } else {
        alert('Error al cambiar el estado de la sede.');
      }
    } catch (e) {
      alert('Error de conexión.');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--cip-blue)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Building2 size={32} />
            Gestión de Sedes
          </h1>
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>
            Administra las sedes institucionales del Colegio de Ingenieros.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={20} />
          Nueva Sede
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
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--cip-blue)' }}>Nombre de Sede</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--cip-blue)' }}>Estado</th>
                <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', color: 'var(--cip-blue)' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sedes.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
                    No hay sedes registradas.
                  </td>
                </tr>
              ) : (
                sedes.map(sede => (
                  <tr key={sede.id} style={{ borderBottom: '1px solid #E2E8F0', opacity: sede.activo ? 1 : 0.6 }}>
                    <td style={{ padding: '1rem', color: '#64748B' }}>#{sede.id}</td>
                    <td style={{ padding: '1rem', fontWeight: '500' }}>{sede.nombre}</td>
                    <td style={{ padding: '1rem' }}>
                      {sede.activo ? (
                        <span style={{ background: '#D1FAE5', color: '#065F46', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' }}>ACTIVA</span>
                      ) : (
                        <span style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' }}>INACTIVA</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => handleOpenModal(sede)}
                          style={{ background: '#E0F2FE', color: '#0369A1', border: 'none', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleToggleEstado(sede)}
                          style={{ background: sede.activo ? '#FEE2E2' : '#D1FAE5', color: sede.activo ? '#991B1B' : '#065F46', border: 'none', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          title={sede.activo ? 'Deshabilitar' : 'Habilitar'}
                        >
                          {sede.activo ? <PowerOff size={16} /> : <Power size={16} />}
                        </button>
                      </div>
                    </td>
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
              {sedeEditando ? 'Editar Sede' : 'Registrar Nueva Sede'}
            </h2>
            
            {errorGuardar && (
              <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {errorGuardar}
              </div>
            )}

            <form onSubmit={handleGuardarSede}>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Nombre de la Sede</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ej: La Libertad"
                  value={nombreSede}
                  onChange={(e) => setNombreSede(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" style={{ background: '#E2E8F0', color: '#475569' }} onClick={() => setShowModal(false)} disabled={guardando}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>
                  {guardando ? 'Guardando...' : (sedeEditando ? 'Actualizar' : 'Guardar Sede')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
