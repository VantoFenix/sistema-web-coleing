import { useState, useEffect } from 'react';
import { Users, Plus, Loader2, Edit, Power, PowerOff, Trash2 } from 'lucide-react';

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorFetch, setErrorFetch] = useState('');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [formData, setFormData] = useState({
    dni: '',
    usuario: '',
    nombres: '',
    correo: '',
    rol: 'ADMIN',
    sede: ''
  });
  const [guardando, setGuardando] = useState(false);
  const [buscandoReniec, setBuscandoReniec] = useState(false);

  const handleBuscarReniec = async () => {
    if (!formData.dni || formData.dni.length !== 8) {
      setErrorGuardar("Ingrese un DNI válido de 8 dígitos.");
      return;
    }
    setErrorGuardar('');
    setBuscandoReniec(true);
    try {
      // 1. Verificación proactiva contra la BD (tipo usuario)
      const checkRes = await fetch(`/api/check-dni/?dni=${formData.dni}&tipo=usuario`);
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.exists) {
          setErrorGuardar(checkData.mensaje || "Este DNI ya se encuentra registrado.");
          return; // Detiene la llamada a RENIEC
        }
      }

      // 2. Consulta normal a RENIEC
      const res = await fetch(`/api/public/reniec/?dni=${formData.dni}`);
      const data = await res.json();
      if (res.ok && data.nombre_completo) {
        setFormData(prev => ({
          ...prev,
          nombres: data.nombre_completo,
          usuario: prev.dni
        }));
      } else {
        setErrorGuardar(data.detalle || data.error || "No se encontró el DNI");
      }
    } catch (e) {
      setErrorGuardar("Error al conectar con RENIEC");
    } finally {
      setBuscandoReniec(false);
    }
  };
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

  const handleOpenModal = (user = null) => {
    setUsuarioEditando(user);
    if (user) {
      setFormData({
        dni: user.dni || '',
        usuario: user.usuario,
        nombres: user.nombres,
        correo: user.correo,
        rol: user.rol,
        sede: user.sede || ''
      });
    } else {
      setFormData({ dni: '', usuario: '', nombres: '', correo: '', rol: 'ADMIN', sede: '' });
    }
    setErrorGuardar('');
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'rol' && value === 'MASTER_ADMIN') {
      setFormData(prev => ({ ...prev, [name]: value, sede: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleGuardarUsuario = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setErrorGuardar('');

    const payload = {
      usuario: formData.usuario.trim(),
      nombres: formData.nombres.trim(),
      correo: formData.correo.trim(),
      rol: formData.rol,
      sede: formData.sede ? parseInt(formData.sede) : null,
    };

    try {
      const token = localStorage.getItem('adminToken');
      const url = usuarioEditando ? `/api/master/usuarios/${usuarioEditando.id}/` : '/api/master/usuarios/';
      const method = usuarioEditando ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowModal(false);
        fetchData();
      } else {
        const errData = await res.json();
        if (errData.sede) {
          setErrorGuardar(Array.isArray(errData.sede) ? errData.sede[0] : errData.sede);
        } else if (errData.detail || errData.error) {
          setErrorGuardar(errData.detail || errData.error);
        } else {
          setErrorGuardar('Error al guardar el usuario. Verifique los datos.');
        }
      }
    } catch (e) {
      setErrorGuardar('Error de conexión.');
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleEstado = async (user) => {
    if (!window.confirm(`¿Seguro que deseas ${user.activo ? 'deshabilitar' : 'habilitar'} al usuario "${user.usuario}"?`)) return;
    
    try {
      const token = localStorage.getItem('adminToken');
      const nuevoEstado = !user.activo;
      const res = await fetch(`/api/master/usuarios/${user.id}/`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ activo: nuevoEstado })
      });

      if (res.ok) {
        setUsuarios(prev => prev.map(u => {
          if (u.id === user.id) {
            return {
              ...u,
              activo: nuevoEstado,
              sede: nuevoEstado ? u.sede : null,
              estado_display: nuevoEstado ? 'ACTIVO' : 'INHABILITADO'
            };
          }
          return u;
        }));
      } else {
        alert('Error al cambiar el estado del usuario.');
      }
    } catch (e) {
      alert('Error de conexión.');
    }
  };

  const esExpirado = (fecha_creacion) => {
    if (!fecha_creacion) return false;
    const past = new Date(fecha_creacion).getTime();
    const now = Date.now();
    return (now - past) > 10 * 60 * 1000;
  };

  const handleEliminarUsuario = async (user) => {
    if (!window.confirm(`¿Seguro que deseas ELIMINAR permanentemente la invitación expirada de "${user.usuario}"?`)) return;
    
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`/api/master/usuarios/${user.id}/`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setUsuarios(prev => prev.filter(u => u.id !== user.id));
      } else {
        alert('Error al eliminar el usuario.');
      }
    } catch (e) {
      alert('Error de conexión.');
    }
  };

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
        <button className="btn btn-primary" onClick={() => handleOpenModal()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--cip-blue)' }}>DNI</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--cip-blue)' }}>Nombres</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--cip-blue)' }}>Rol</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--cip-blue)' }}>Sede</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--cip-blue)' }}>Estado</th>
                <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', color: 'var(--cip-blue)' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
                    No hay usuarios registrados.
                  </td>
                </tr>
              ) : (
                usuarios.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #E2E8F0', opacity: user.activo ? 1 : 0.6 }}>
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
                      {user.estado_display === 'PENDIENTE' && (
                        <span style={{ 
                          background: esExpirado(user.fecha_creacion) ? '#FEE2E2' : '#FEF3C7', 
                          color: esExpirado(user.fecha_creacion) ? '#991B1B' : '#92400E', 
                          padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold' 
                        }}>
                          {esExpirado(user.fecha_creacion) ? 'EXPIRADO' : 'PENDIENTE'}
                        </span>
                      )}
                      {user.estado_display === 'ACTIVO' && <span style={{ color: '#10B981', fontWeight: '500', fontSize: '0.875rem' }}>ACTIVO</span>}
                      {user.estado_display === 'INHABILITADO' && <span style={{ color: '#EF4444', fontWeight: '500', fontSize: '0.875rem' }}>INHABILITADO</span>}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      {user.rol !== 'MASTER_ADMIN' && (
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          {user.estado_display !== 'PENDIENTE' && (
                            <>
                              <button 
                                onClick={() => handleOpenModal(user)}
                                style={{ background: '#E0F2FE', color: '#0369A1', border: 'none', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                title="Editar"
                              >
                                <Edit size={16} />
                              </button>
                              <button 
                                onClick={() => handleToggleEstado(user)}
                                style={{ background: user.activo ? '#FEE2E2' : '#D1FAE5', color: user.activo ? '#991B1B' : '#065F46', border: 'none', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                title={user.activo ? 'Deshabilitar' : 'Habilitar'}
                              >
                                {user.activo ? <PowerOff size={16} /> : <Power size={16} />}
                              </button>
                            </>
                          )}
                          {user.estado_display === 'PENDIENTE' && esExpirado(user.fecha_creacion) && (
                            <button 
                              onClick={() => handleEliminarUsuario(user)}
                              style={{ background: '#FEE2E2', color: '#991B1B', border: 'none', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                              title="Eliminar expirado"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      )}
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
              {usuarioEditando ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}
            </h2>
            
            {errorGuardar && (
              <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {errorGuardar}
              </div>
            )}

            <form onSubmit={handleGuardarUsuario}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">DNI</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    name="dni" 
                    className="form-input" 
                    value={formData.dni} 
                    onChange={handleChange} 
                    maxLength="8"
                    disabled={!!usuarioEditando}
                  />
                  {!usuarioEditando && (
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      onClick={handleBuscarReniec}
                      disabled={buscandoReniec}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {buscandoReniec ? 'Buscando...' : 'Buscar'}
                    </button>
                  )}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Usuario</label>
                <input type="text" name="usuario" className="form-input" value={formData.usuario} onChange={handleChange} required disabled={true} />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Nombres Completos</label>
                <input type="text" name="nombres" className="form-input" value={formData.nombres} onChange={handleChange} required disabled={true} />
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
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Sede Asignada</label>
                  <select name="sede" className="form-input" value={formData.sede} onChange={handleChange} disabled={formData.rol === 'MASTER_ADMIN'}>
                    <option value="">-- Global / Sin Sede --</option>
                    {sedes.filter(s => s.activo).map(s => (
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
                  {guardando ? 'Guardando...' : (usuarioEditando ? 'Actualizar' : 'Crear Usuario')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
