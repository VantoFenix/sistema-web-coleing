import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, UserPlus, LogOut, Wallet, ShieldCheck } from 'lucide-react';

export default function AdminLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/admin/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
      {/* SIDEBAR */}
      <aside style={{ width: '280px', background: 'var(--cip-blue)', color: 'white', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
          <div style={{ background: 'white', padding: '0.5rem', borderRadius: '8px', display: 'inline-block', marginBottom: '1rem' }}>
            <img src="/webp-logo-cip.webp" alt="CIP" style={{ height: '64px', width: 'auto', display: 'block' }} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Admin CIP</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>Portal de Gestión</p>
        </div>

        <nav style={{ flex: 1, padding: '1.5rem 0' }}>
          <NavLink 
            to="/admin/home" 
            className={({isActive}) => isActive ? "admin-nav active" : "admin-nav"}
            style={({isActive}) => ({
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.5rem', color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
              background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent', textDecoration: 'none', borderLeft: isActive ? '4px solid var(--cip-red)' : '4px solid transparent', transition: 'all 0.2s'
            })}
          >
            <LayoutDashboard size={20} />
            <span>Inicio</span>
          </NavLink>

          <NavLink 
            to="/admin/postulaciones" 
            className={({isActive}) => isActive ? "admin-nav active" : "admin-nav"}
            style={({isActive}) => ({
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.5rem', color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
              background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent', textDecoration: 'none', borderLeft: isActive ? '4px solid var(--cip-red)' : '4px solid transparent', transition: 'all 0.2s'
            })}
          >
            <FileText size={20} />
            <span>Postulaciones</span>
          </NavLink>

          <NavLink
            to="/admin/pagos-presencial"
            className={({isActive}) => isActive ? "admin-nav active" : "admin-nav"}
            style={({isActive}) => ({
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.5rem', color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
              background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent', textDecoration: 'none', borderLeft: isActive ? '4px solid var(--cip-red)' : '4px solid transparent', transition: 'all 0.2s'
            })}
          >
            <Wallet size={20} />
            <span>Pagos Presenciales</span>
          </NavLink>


          <NavLink
            to="/admin/presencial"
            className={({isActive}) => isActive ? "admin-nav active" : "admin-nav"}
            style={({isActive}) => ({
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.5rem', color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
              background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent', textDecoration: 'none', borderLeft: isActive ? '4px solid var(--cip-red)' : '4px solid transparent', transition: 'all 0.2s'
            })}
          >
            <UserPlus size={20} />
            <span>Registro Presencial</span>
          </NavLink>

          <NavLink
            to="/admin/vouchers"
            className={({isActive}) => isActive ? "admin-nav active" : "admin-nav"}
            style={({isActive}) => ({
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.5rem', color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
              background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent', textDecoration: 'none', borderLeft: isActive ? '4px solid var(--cip-red)' : '4px solid transparent', transition: 'all 0.2s'
            })}
          >
            <ShieldCheck size={20} />
            <span>Verificar Vouchers</span>
          </NavLink>
        </nav>

        <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button 
            onClick={handleLogout}
            style={{ width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--cip-red)'; e.currentTarget.style.borderColor = 'var(--cip-red)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
          >
            <LogOut size={18} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main style={{ flex: 1, padding: '2rem', height: '100vh', overflowY: 'auto' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
