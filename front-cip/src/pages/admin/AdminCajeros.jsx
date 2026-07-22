import { useState, useEffect } from 'react';
import { Users, Plus, Loader2, Edit, Power, PowerOff, Trash2, Search } from 'lucide-react';

export default function AdminCajeros() {
  const [cajeros, setCajeros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorFetch, setErrorFetch] = useState('');
  const adminSedeNombre = localStorage.getItem('adminSede') || 'Mi Sede';
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [formData, setFormData] = useState({
    dni: '',
    usuario: '',
    nombres: '',
    correo: ''
  });
  const [guardando, setGuardando] = useState(false);
  const [buscandoReniec, setBuscandoReniec] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setCargando(true);
    setErrorFetch('');
    try {
      const token = localStorage.getItem('adminToken');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const res = await fetch('/api/admin/cajeros/', { headers });

      if (res.ok) {
        const data = await res.json();
        setCajeros(data.results ? data.results : data);
      } else {
        setErrorFetch('Error al cargar la lista de cajeros.');
      }
    } catch (e) {
      setErrorFetch('Error de conexión.');
    } finally {
      setCargando(false);
    }
  };

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

  const handleOpenModal = (user = null) => {
    setUsuarioEditando(user);
    if (user) {
      setFormData({
        dni: user.dni || user.usuario || '',
        usuario: user.usuario,
        nombres: user.nombres,
        correo: user.correo
      });
    } else {
      setFormData({ dni: '', usuario: '', nombres: '', correo: '' });
    }
    setErrorGuardar('');
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGuardarUsuario = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setErrorGuardar('');

    const payload = {
      usuario: formData.usuario.trim(),
      nombres: formData.nombres.trim(),
      correo: formData.correo.trim()
    };

    try {
      const token = localStorage.getItem('adminToken');
      const url = usuarioEditando ? `/api/admin/cajeros/${usuarioEditando.id}/` : '/api/admin/cajeros/';
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
        if (errData.detail || errData.error) {
          setErrorGuardar(errData.detail || errData.error);
        } else if (typeof errData === 'object') {
          const firstKey = Object.keys(errData)[0];
          const msg = Array.isArray(errData[firstKey]) ? errData[firstKey][0] : errData[firstKey];
          setErrorGuardar(`${firstKey}: ${msg}`);
        } else {
          setErrorGuardar('Error al guardar el cajero. Verifique los datos.');
        }
      }
    } catch (e) {
      setErrorGuardar('Error de conexión.');
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleEstado = async (user) => {
    if (!window.confirm(`¿Seguro que deseas ${user.activo ? 'deshabilitar' : 'habilitar'} al cajero "${user.usuario}"?`)) return;
    
    try {
      const token = localStorage.getItem('adminToken');
      const nuevoEstado = !user.activo;
      const res = await fetch(`/api/admin/cajeros/${user.id}/`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ activo: nuevoEstado })
      });

      if (res.ok) {
        setCajeros(prev => prev.map(u => {
          if (u.id === user.id) {
            return {
              ...u,
              activo: nuevoEstado,
              estado_display: nuevoEstado ? 'ACTIVO' : 'INHABILITADO'
            };
          }
          return u;
        }));
      } else {
        alert('Error al cambiar el estado del cajero.');
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
    if (!window.confirm(`¿Seguro que deseas ELIMINAR permanentemente al cajero "${user.usuario}"?`)) return;
    
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`/api/admin/cajeros/${user.id}/`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setCajeros(prev => prev.filter(u => u.id !== user.id));
      } else {
        alert('Error al eliminar el cajero.');
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
            <Users size={32} />
            Gestión de Cajeros ({adminSedeNombre})
          </h1>
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>
            Crea y administra al personal de atención y cobros de tu sede.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={20} />
          Nuevo Cajero
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
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--cip-blue)' }}>DNI / Usuario</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--cip-blue)' }}>Nombres</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--cip-blue)' }}>Rol</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--cip-blue)' }}>Sede</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--cip-blue)' }}>Estado</th>
                <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', color: 'var(--cip-blue)' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cajeros.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
                    No hay cajeros registrados para esta sede.
                  </td>
                </tr>
              ) : (
                cajeros.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #E2E8F0', opacity: user.activo ? 1 : 0.6 }}>
                    <td style={{ padding: '1rem', fontWeight: '500' }}>{user.usuario}</td>
                    <td style={{ padding: '1rem' }}>{user.nombres}<br/><span style={{fontSize: '0.875rem', color: '#64748B'}}>{user.correo}</span></td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold',
                        background: '#D1FAE5', color: '#065F46'
                      }}>
                        CAJERO
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: '#64748B' }}>{adminSedeNombre}</td>
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
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        {user.estado_display === 'PENDIENTE' ? (
                          esExpirado(user.fecha_creacion) ? (
                            <button 
                              onClick={() => handleEliminarUsuario(user)}
                              title="Eliminar invitación expirada"
                              style={{ background: '#FEE2E2', color: '#EF4444', border: 'none', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          ) : null
                        ) : (
                          <>
                            <button 
                              onClick={() => handleOpenModal(user)}
                              title="Editar usuario"
                              style={{ background: '#F1F5F9', color: '#475569', border: 'none', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer' }}
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => handleToggleEstado(user)}
                              title={user.activo ? "Deshabilitar" : "Habilitar"}
                              style={{ 
                                background: user.activo ? '#FEE2E2' : '#D1FAE5', 
                                color: user.activo ? '#EF4444' : '#10B981', 
                                border: 'none', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer' 
                              }}
                            >
                              {user.activo ? <PowerOff size={16} /> : <Power size={16} />}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL CREAR / EDITAR */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '500px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--cip-blue)', marginBottom: '1.5rem' }}>
              {usuarioEditando ? 'Editar Cajero' : 'Nuevo Cajero (Atención Sede)'}
            </h2>

            {errorGuardar && (
              <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {errorGuardar}
              </div>
            )}

            <form onSubmit={handleGuardarUsuario} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {!usuarioEditando && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' }}>Buscar por DNI (RENIEC)</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      name="dni"
                      maxLength="8"
                      value={formData.dni} 
                      onChange={handleChange}
                      placeholder="Ingrese DNI..."
                      style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px' }}
                    />
                    <button 
                      type="button"
                      onClick={handleBuscarReniec}
                      disabled={buscandoReniec}
                      style={{ background: 'var(--cip-blue)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      {buscandoReniec ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                      Buscar
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' }}>Usuario (DNI)</label>
                <input 
                  type="text" 
                  name="usuario" 
                  value={formData.usuario} 
                  onChange={handleChange} 
                  required 
                  placeholder="DNI de acceso"
                  disabled={!!usuarioEditando}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' }}>Nombres Completos</label>
                <input 
                  type="text" 
                  name="nombres" 
                  value={formData.nombres} 
                  onChange={handleChange} 
                  required 
                  placeholder="Nombres y Apellidos"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' }}>Correo Electrónico</label>
                <input 
                  type="email" 
                  name="correo" 
                  value={formData.correo} 
                  onChange={handleChange} 
                  required 
                  placeholder="correo@ejemplo.com"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px' }}
                />
              </div>

              {/* CAMPOS BLOQUEADOS / INFORMATIVOS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#F8FAFC', padding: '0.75rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748B', marginBottom: '0.25rem' }}>Rol Asignado</label>
                  <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--cip-blue)' }}>CAJERO (Atención Sede)</span>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748B', marginBottom: '0.25rem' }}>Sede Heredada</label>
                  <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--cip-blue)' }}>{adminSedeNombre}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  style={{ background: '#F1F5F9', color: '#475569', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={guardando}
                  style={{ background: 'var(--cip-blue)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {guardando && <Loader2 className="animate-spin" size={16} />}
                  {usuarioEditando ? 'Guardar Cambios' : 'Crear Cajero'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
