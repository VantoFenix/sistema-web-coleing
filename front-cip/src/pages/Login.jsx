import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, User } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (identificador && password) {
      setErrorMsg('');
      navigate('/portal/yo');
    } else {
      setErrorMsg('Por favor, ingrese su DNI y contraseña.');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      
      {/* LADO IZQUIERDO: Branding */}
      <div style={{ 
        flex: 1, 
        background: 'linear-gradient(135deg, #7F1D1D 0%, #450A0A 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Efecto de fondo */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.5, pointerEvents: 'none' }}></div>
        
        <img 
          src="/webp-logo-cip.webp" 
          alt="Logo CIP" 
          style={{ width: '180px', height: 'auto', marginBottom: '2rem', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.2))', zIndex: 1 }} 
        />
        
        <h2 style={{ fontSize: '2.5rem', fontWeight: '800', textAlign: 'center', marginBottom: '1rem', letterSpacing: '-0.5px', zIndex: 1 }}>
          Colegio de Ingenieros del Perú
        </h2>
        <p style={{ fontSize: '1.25rem', textAlign: 'center', opacity: 0.9, maxWidth: '400px', zIndex: 1 }}>
          Portal Oficial del Colegiado. Consulte su estado, pagos y credenciales digitales en un solo lugar.
        </p>

        {/* Botón Volver (En el lado izquierdo arriba) */}
        <button 
          className="btn btn-outline" 
          style={{ position: 'absolute', top: '2rem', left: '2rem', borderColor: 'rgba(255,255,255,0.3)', color: 'white', zIndex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={18} /> Volver
        </button>

      </div>

      {/* LADO DERECHO: Formulario */}
      <div style={{ 
        flex: 1, 
        background: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
        position: 'relative'
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          
          <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
            <h2 style={{ color: 'var(--cip-blue)', fontSize: '2rem', fontWeight: '800' }}>Bienvenido de nuevo</h2>
            <p className="text-muted" style={{ marginTop: '0.5rem' }}>Ingrese sus credenciales para acceder a su portal</p>
          </div>

          {errorMsg && (
            <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: '500', textAlign: 'center' }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontWeight: '600' }}>DNI o Correo Electrónico</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                  <User size={18} />
                </div>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)' }}
                  placeholder="Ej. 70123456"
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="form-label" style={{ fontWeight: '600' }}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                  <KeyRound size={18} />
                </div>
                <input 
                  type="password" 
                  className="form-input" 
                  style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block" style={{ padding: '1rem', fontSize: '1.125rem', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)' }}>
              Ingresar de forma segura
            </button>
          </form>

        </div>
      </div>

      {/* Responsive Fixes */}
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 768px) {
          body > div > div { flex-direction: column !important; }
          body > div > div > div:first-child { min-height: 400px; }
        }
      `}} />
    </div>
  );
}
