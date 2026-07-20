import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, User } from 'lucide-react';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMsg, setResetMsg] = useState({ text: '', type: '' });
  const [isResetting, setIsResetting] = useState(false);

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!resetEmail) return;
    setIsResetting(true);
    setResetMsg({ text: '', type: '' });
    try {
      const res = await fetch('/api/auth/password-reset/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: resetEmail })
      });
      const data = await res.json();
      if (res.ok) {
        setResetMsg({ text: 'Si el correo existe, se ha enviado un enlace de recuperación', type: 'success' });
        setTimeout(() => {
          setShowResetModal(false);
          setResetMsg({ text: '', type: '' });
          setResetEmail('');
        }, 3000);
      } else {
        setResetMsg({ text: data.error || 'Error al procesar la solicitud.', type: 'error' });
      }
    } catch (e) {
      setResetMsg({ text: 'Error de conexión.', type: 'error' });
    } finally {
      setIsResetting(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (usuario && password) {
      try {
        const response = await fetch('/api/auth/login/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: usuario, password: password, role: 'ADMIN' })
        });
        const data = await response.json();
        
        if (response.ok) {
          localStorage.setItem('adminToken', data.token);
          localStorage.setItem('adminUser', JSON.stringify(data.user));
          localStorage.setItem('adminRole', data.role);
          localStorage.setItem('adminSede', data.sede_nombre);
          localStorage.setItem('adminSedeId', data.sede_id || '');
          
          if (data.role === 'MASTER_ADMIN') {
            navigate('/admin/home');
          } else if (data.role === 'ADMIN') {
            navigate('/admin/postulaciones');
          } else if (data.role === 'CAJERO') {
            navigate('/admin/deudores');
          } else {
            navigate('/admin/home');
          }
        } else {
          setErrorMsg('Credenciales inválidas o cuenta inhabilitada. Contacte al administrador.');
        }
      } catch (err) {
        setErrorMsg('Error al conectar con el servidor.');
      }
    } else {
      setErrorMsg('Por favor, ingrese su usuario y contraseña.');
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
              <label className="form-label" style={{ fontWeight: '600' }}>Número de DNI</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                  <User size={18} />
                </div>
                <input 
                  type="text" 
                  maxLength="8"
                  pattern="[0-9]{8}"
                  title="El DNI debe tener 8 dígitos numéricos"
                  className="form-input" 
                  style={{ paddingLeft: '2.75rem', width: '100%' }}
                  placeholder="12345678"
                  value={usuario}
                  onChange={(e) => { setUsuario(e.target.value); setErrorMsg(''); }}
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
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <button 
                type="button" 
                onClick={() => setShowResetModal(true)}
                style={{ background: 'none', border: 'none', color: 'var(--cip-blue)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </form>

        </div>
      </div>

      {/* Reset Password Modal */}
      {showResetModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--cip-blue)' }}>Recuperar Contraseña</h2>
            {resetMsg.text && (
              <div style={{ background: resetMsg.type === 'error' ? '#FEE2E2' : '#D1FAE5', color: resetMsg.type === 'error' ? '#991B1B' : '#065F46', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {resetMsg.text}
              </div>
            )}
            <form onSubmit={handlePasswordReset}>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Correo Electrónico</label>
                <input 
                  type="email" 
                  className="form-input" 
                  value={resetEmail} 
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" style={{ background: '#E2E8F0', color: '#475569' }} onClick={() => setShowResetModal(false)} disabled={isResetting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isResetting}>
                  {isResetting ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
