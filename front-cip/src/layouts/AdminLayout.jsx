import { NavLink, Outlet, useNavigate, Navigate } from 'react-router-dom';
import { LayoutDashboard, FileText, UserPlus, LogOut, Wallet, ShieldCheck, MapPin, BookOpen, Users, AlertTriangle } from 'lucide-react';

export default function AdminLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminRole');
    localStorage.removeItem('adminSede');
    navigate('/admin/login');
  };

  const adminRole = localStorage.getItem('adminRole') || 'ADMIN';
  const adminSede = localStorage.getItem('adminSede') || 'Sede Global';

  const NavItem = ({ to, icon: Icon, label }) => (
    <NavLink
      to={to}
      className={({isActive}) => isActive ? "admin-nav active" : "admin-nav"}
      style={({isActive}) => ({
        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.5rem', color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
        background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent', textDecoration: 'none', borderLeft: isActive ? '4px solid var(--cip-red)' : '4px solid transparent', transition: 'all 0.2s'
      })}
    >
      <Icon size={20} />
      <span>{label}</span>
    </NavLink>
  );

  if (!localStorage.getItem('adminToken')) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
      {/* SIDEBAR */}
      <aside style={{ width: '280px', background: 'var(--cip-blue)', color: 'white', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
          <div style={{ background: 'white', padding: '0.5rem', borderRadius: '8px', display: 'inline-block', marginBottom: '1rem' }}>
            <img src="/webp-logo-cip.webp" alt="CIP" style={{ height: '64px', width: 'auto', display: 'block' }} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>{adminUser?.usuario || 'Admin CIP'}</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Rol: {adminRole}</p>
        </div>

        <nav style={{ flex: 1, padding: '1.5rem 0' }}>
          {/* Vistas de MASTER_ADMIN */}
          {adminRole === 'MASTER_ADMIN' && (
            <>
              <NavItem to="/admin/sedes" icon={MapPin} label="Sedes" />
              <NavItem to="/admin/carreras" icon={BookOpen} label="Carreras" />
              <NavItem to="/admin/usuarios" icon={Users} label="Usuarios" />
              <NavItem to="/admin/home" icon={LayoutDashboard} label="Configuración" />
            </>
          )}

          {/* Vistas de ADMIN */}
          {adminRole === 'ADMIN' && (
            <>
              <NavItem to="/admin/postulaciones" icon={FileText} label="Postulaciones" />
              <NavItem to="/admin/cajeros" icon={Users} label="Gestión de Cajeros" />
            </>
          )}

          {/* Vistas de CAJERO */}
          {adminRole === 'CAJERO' && (
            <>
              <NavItem to="/admin/deudores" icon={AlertTriangle} label="Panel de Deudores" />
              <NavItem to="/admin/presencial" icon={UserPlus} label="Registro Presencial" />
              <NavItem to="/admin/pagos-presencial" icon={Wallet} label="Pagos Presenciales" />
            </>
          )}
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
      <main style={{ flex: 1, height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <header style={{ background: 'white', padding: '1rem 2rem', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--cip-blue)' }}>Sistema de Gestión CIP</h1>
          <div style={{ background: '#EFF6FF', color: 'var(--cip-blue)', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.875rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={16} />
            <span>Sede Activa: {adminSede}</span>
          </div>
        </header>
        <div style={{ padding: '2rem', flex: 1, maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
