import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Mail } from 'lucide-react';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (correo && password) {
      try {
        const response = await fetch('http://localhost:8000/api/auth/login/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: correo, password: password, role: 'ADMIN' })
        });
        const data = await response.json();
        
        if (response.ok) {
          localStorage.setItem('adminToken', data.token);
          localStorage.setItem('adminUser', JSON.stringify(data.user));
          navigate('/admin/home');
        } else {
          setErrorMsg(data.error || 'Credenciales inválidas');
        }
      } catch (err) {
        setErrorMsg('Error al conectar con el servidor.');
      }
    } else {
      setErrorMsg('Por favor, ingrese su correo y contraseña.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'row' }}>
      
      {/* LADO IZQUIERDO: Branding Admin */}
      <div style={{ 
        flex: 1, 
        background: 'var(--cip-blue)', 
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '4rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Patrón de fondo opcional */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '30px 30px', opacity: 0.5, pointerEvents: 'none' }}></div>

        <div style={{ background: 'white', padding: '0.75rem', borderRadius: '12px', display: 'inline-block', alignSelf: 'flex-start', marginBottom: '2rem', zIndex: 1 }}>
          <img src="/webp-logo-cip.webp" alt="CIP Logo" style={{ height: '80px', width: 'auto', display: 'block' }} />
        </div>
        
        <h1 style={{ fontSize: '3rem', fontWeight: '800', lineHeight: 1.1, marginBottom: '1.5rem', zIndex: 1 }}>
          Portal <br/><span style={{ color: '#93C5FD' }}>Administrativo</span>
        </h1>
        
        <p style={{ fontSize: '1.125rem', opacity: 0.9, maxWidth: '400px', lineHeight: 1.6, zIndex: 1 }}>
          Acceso exclusivo para el personal gestor del Colegio de Ingenieros del Perú. Gestione expedientes, pagos y padrones desde una única plataforma segura.
        </p>
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
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: '#EFF6FF', color: 'var(--cip-blue)', marginBottom: '1rem' }}>
              <ShieldCheck size={28} />
            </div>
            <h2 style={{ color: 'var(--cip-blue)', fontSize: '2rem', fontWeight: '800' }}>Acceso Autorizado</h2>
            <p className="text-muted" style={{ marginTop: '0.5rem' }}>Ingrese sus credenciales corporativas</p>
          </div>

          {errorMsg && (
            <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: '500', textAlign: 'center' }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontWeight: '600' }}>Correo Electrónico</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                  <Mail size={18} />
                </div>
                <input 
                  type="email" 
                  className="form-input" 
                  style={{ paddingLeft: '2.75rem', width: '100%' }}
                  placeholder="admin@cip.org.pe"
                  value={correo}
                  onChange={(e) => { setCorreo(e.target.value); setErrorMsg(''); }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '2.5rem' }}>
              <label className="form-label" style={{ fontWeight: '600' }}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                  <Lock size={18} />
                </div>
                <input 
                  type="password" 
                  className="form-input" 
                  style={{ paddingLeft: '2.75rem', width: '100%' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrorMsg(''); }}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block" style={{ padding: '0.875rem', fontSize: '1.125rem' }}>
              Ingresar al Sistema
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
