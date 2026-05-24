import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, User } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    // Simulando login exitoso
    if (identificador && password) {
      navigate('/portal/yo');
    } else {
      alert("Ingrese sus credenciales.");
    }
  };

  return (
    <div className="app-container" style={{ background: 'var(--cip-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      
      {/* Botón de retroceso arriba a la izquierda */}
      <button 
        className="btn btn-outline" 
        style={{ position: 'absolute', top: '2rem', left: '2rem', border: 'none', padding: '0.5rem' }}
        onClick={() => navigate('/')}
      >
        <ArrowLeft size={24} /> Volver al inicio
      </button>

      <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '3rem 2rem', textAlign: 'center' }}>
        
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ 
            width: '80px', height: '80px', background: 'var(--cip-red)', color: 'white', 
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem auto', fontSize: '2rem', fontWeight: 'bold'
          }}>
            CIP
          </div>
          <h2 style={{ color: 'var(--cip-blue)', fontSize: '1.75rem' }}>Portal del Colegiado</h2>
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>Ingrese sus credenciales para acceder</p>
        </div>

        <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
          <div className="form-group">
            <label className="form-label">DNI o Correo Electrónico</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <User size={18} />
              </div>
              <input 
                type="text" 
                className="form-input" 
                style={{ width: '100%', paddingLeft: '2.5rem' }}
                placeholder="Ej. 70123456"
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <KeyRound size={18} />
              </div>
              <input 
                type="password" 
                className="form-input" 
                style={{ width: '100%', paddingLeft: '2.5rem' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '1rem', padding: '0.875rem' }}>
            Ingresar de forma segura
          </button>
        </form>

        <p style={{ marginTop: '2rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          ¿Olvidó su contraseña? Acérquese a su sede departamental.
        </p>

      </div>
    </div>
  );
}
