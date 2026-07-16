import { useState, useEffect } from 'react';
import { Users, Plus, Loader2 } from 'lucide-react';

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorFetch, setErrorFetch] = useState('');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    usuario: '',
    password: '',
    nombres: '',
    correo: '',
    rol: 'ADMIN',
    sede: ''
  });
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem('adminToken');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [resUsuarios, resSedes] = await Promise.all([
        fetch('/api/master/usuarios/', { headers }),
        fetch('/api/master/sedes/', { headers })
      ]);

      if (resUsuarios.ok && resSedes.ok) {
        const dataUsuarios = await resUsuarios.json();
        const dataSedes = await resSedes.json();
        setUsuarios(dataUsuarios.results ? dataUsuarios.results : dataUsuarios);
        setSedes(dataSedes.results ? dataSedes.results : dataSedes);
      } else {
        setErrorFetch('Error al cargar los datos.');
      }
    } catch (e) {
      setErrorFetch('Error de conexión.');
    } finally {
      setCargando(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setErrorGuardar('');

    // Preparamos payload (sede puede ser nula)
    const payload = {
      usuario: formData.usuario.trim(),
      password: formData.password,
      nombres: formData.nombres.trim(),
      correo: formData.correo.trim(),
      rol: formData.rol,
      sede: formData.sede ? parseInt(formData.sede) : null,
      activo: true
    };

    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/master/usuarios/', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowModal(false);
        setFormData({ usuario: '', password: '', nombres: '', correo: '', rol: 'ADMIN', sede: '' });
        fetchData(); // Recargamos para ver el nuevo usuario
      } else {
        const errData = await res.json();
        setErrorGuardar(JSON.stringify(errData) || 'Error al crear el usuario.');
      }
    } catch (e) {
      setErrorGuardar('Error de conexión.');
    } finally {
      setGuardando(false);
    }
  };

  // Helper para buscar nombre de sede
  const getSedeNombre = (sedeId) => {
    if (!sedeId) return 'Global (Sin Sede)';
    const s = sedes.find(x => x.id === sedeId);
    return s ? s.nombre : `Sede #${sedeId}`;
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--cip-blue)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Users size={32} />
            Gestión de Usuarios
          </h1>
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>
            Administra a los jefes de sede y cajeros del sistema.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={20} />
          Nuevo Usuario
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
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--cip-blue)' }}>Usuario</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--cip-blue)' }}>Nombres</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--cip-blue)' }}>Rol</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--cip-blue)' }}>Sede</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--cip-blue)' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
                    No hay usuarios registrados.
                  </td>
                </tr>
              ) : (
                usuarios.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '1rem', fontWeight: '500' }}>{user.usuario}</td>
                    <td style={{ padding: '1rem' }}>{user.nombres}<br/><span style={{fontSize: '0.875rem', color: '#64748B'}}>{user.correo}</span></td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold',
                        background: user.rol === 'MASTER_ADMIN' ? '#FEF3C7' : (user.rol === 'ADMIN' ? '#DBEAFE' : '#D1FAE5'),
                        color: user.rol === 'MASTER_ADMIN' ? '#92400E' : (user.rol === 'ADMIN' ? '#1E40AF' : '#065F46')
                      }}>
                        {user.rol}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: '#64748B' }}>{getSedeNombre(user.sede)}</td>
                    <td style={{ padding: '1rem' }}>
                      {user.activo ? 
                        <span style={{ color: '#10B981', fontWeight: '500' }}>Activo</span> : 
                        <span style={{ color: '#EF4444', fontWeight: '500' }}>Inactivo</span>
                      }
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
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--cip-blue)' }}>
              Registrar Nuevo Usuario
            </h2>
            
            {errorGuardar && (
              <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {errorGuardar}
              </div>
            )}

            <form onSubmit={handleCrearUsuario}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Usuario</label>
                  <input type="text" name="usuario" className="form-input" value={formData.usuario} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Contraseña</label>
                  <input type="password" name="password" className="form-input" value={formData.password} onChange={handleChange} required />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Nombres Completos</label>
                <input type="text" name="nombres" className="form-input" value={formData.nombres} onChange={handleChange} required />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Correo Electrónico</label>
                <input type="email" name="correo" className="form-input" value={formData.correo} onChange={handleChange} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Rol</label>
                  <select name="rol" className="form-input" value={formData.rol} onChange={handleChange} required>
                    <option value="ADMIN">ADMIN (Jefe de Sede)</option>
                    <option value="CAJERO">CAJERO (Atención Sede)</option>
                    <option value="MASTER_ADMIN">MASTER_ADMIN</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Sede Asignada</label>
                  <select name="sede" className="form-input" value={formData.sede} onChange={handleChange}>
                    <option value="">-- Global / Sin Sede --</option>
                    {sedes.map(s => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" style={{ background: '#E2E8F0', color: '#475569' }} onClick={() => setShowModal(false)} disabled={guardando}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
