import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { User, CreditCard, Receipt, LogOut } from 'lucide-react';

export default function PortalLayout() {
  const navigate = useNavigate();

  // Auth guard: redirigir si no hay token
  useEffect(() => {
    const token = localStorage.getItem('colToken');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('colToken');
    localStorage.removeItem('colUser');
    navigate('/');
  };


  return (
    <div className="app-container">
      {/* Header Privado */}
      <nav className="navbar">
        {/* Lado Izquierdo: Logo y Título */}
        <div className="logo-container" style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <img src="/webp-logo-cip.webp" alt="CIP" style={{ height: '48px', width: 'auto' }} />
          <span className="nav-title" style={{ fontWeight: '600', color: 'var(--cip-blue)', marginLeft: '0.5rem' }}>Portal del Colegiado</span>
        </div>

        {/* CENTRO: Enlaces del portal */}
        <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', justifySelf: 'center' }}>
          <NavLink to="/portal/carnet" className={({isActive}) => isActive ? "nav-link active" : "nav-link"} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CreditCard size={18} /> MI CARNET
          </NavLink>
          <NavLink to="/portal/yo" className={({isActive}) => isActive ? "nav-link active" : "nav-link"} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} /> YO
          </NavLink>
          <NavLink to="/portal/pagos" className={({isActive}) => isActive ? "nav-link active" : "nav-link"} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Receipt size={18} /> MIS PAGOS
          </NavLink>
        </div>

        {/* DERECHA: Botón Salir */}
        <div style={{ justifySelf: 'end' }}>
          <button 
            onClick={handleLogout} 
            className="btn btn-outline" 
            style={{ 
              padding: '0.5rem 1rem', 
              fontSize: '0.875rem', 
              borderColor: 'var(--cip-red)', 
              color: 'var(--cip-red)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: '600'
            }}
          >
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
