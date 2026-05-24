import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { User, CreditCard, Receipt, LogOut } from 'lucide-react';

export default function PortalLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/');
  };

  return (
    <div className="app-container">
      {/* Header Privado */}
      <nav className="navbar">
        <div className="logo-container">
          <div className="logo-placeholder" style={{ fontSize: '1rem', padding: '0.25rem 0.75rem' }}>CIP</div>
          <span className="nav-title">Portal del Colegiado</span>
        </div>
        <div className="nav-links">
          <NavLink to="/portal/carnet" className={({isActive}) => isActive ? "nav-link active" : "nav-link"} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CreditCard size={18} /> MI CARNET
          </NavLink>
          <NavLink to="/portal/yo" className={({isActive}) => isActive ? "nav-link active" : "nav-link"} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} /> YO
          </NavLink>
          <NavLink to="/portal/pagos" className={({isActive}) => isActive ? "nav-link active" : "nav-link"} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Receipt size={18} /> MIS PAGOS
          </NavLink>
          <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.2)', margin: '0 0.5rem' }}></div>
          <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}>
            <LogOut size={16} /> Salir
          </button>
        </div>
      </nav>

      {/* Contenido Principal de las Pestañas */}
      <main className="main-container" style={{ marginTop: '2rem' }}>
        <Outlet />
      </main>
    </div>
  );
}
