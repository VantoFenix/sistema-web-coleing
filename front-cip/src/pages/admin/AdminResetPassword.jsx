import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck } from 'lucide-react';

export default function AdminResetPassword() {
  const { uidb64, token } = useParams();
  const navigate = useNavigate();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg({ text: '', type: '' });

    if (newPassword !== confirmPassword) {
      setMsg({ text: 'Las contraseñas no coinciden.', type: 'error' });
      return;
    }

    if (newPassword.length < 6) {
      setMsg({ text: 'La contraseña debe tener al menos 6 caracteres.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/auth/password-reset/confirm/${uidb64}/${token}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: newPassword })
      });
      
      const data = await response.json();

      if (response.ok) {
        setMsg({ text: 'Contraseña actualizada con éxito. Redirigiendo...', type: 'success' });
        setTimeout(() => {
          navigate('/admin/login');
        }, 2500);
      } else {
        setMsg({ text: data.error || 'El enlace es inválido o ha expirado.', type: 'error' });
      }
    } catch (error) {
      setMsg({ text: 'Error de conexión con el servidor.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '400px', background: 'white', padding: '3rem', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
        
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: '#EFF6FF', color: 'var(--cip-blue)', marginBottom: '1rem' }}>
            <ShieldCheck size={28} />
          </div>
          <h2 style={{ color: 'var(--cip-blue)', fontSize: '1.75rem', fontWeight: '800' }}>Nueva Contraseña</h2>
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>Configure su nueva contraseña de acceso</p>
        </div>

        {msg.text && (
          <div style={{ background: msg.type === 'error' ? '#FEE2E2' : '#D1FAE5', color: msg.type === 'error' ? '#991B1B' : '#065F46', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: '500', textAlign: 'center' }}>
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" style={{ fontWeight: '600' }}>Nueva Contraseña</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Lock size={18} />
              </div>
              <input 
                type="password" 
                className="form-input" 
                style={{ paddingLeft: '2.75rem', width: '100%' }}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '2.5rem' }}>
            <label className="form-label" style={{ fontWeight: '600' }}>Confirmar Contraseña</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Lock size={18} />
              </div>
              <input 
                type="password" 
                className="form-input" 
                style={{ paddingLeft: '2.75rem', width: '100%' }}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" style={{ padding: '0.875rem', fontSize: '1.125rem' }} disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Restablecer Contraseña'}
          </button>
        </form>

      </div>
    </div>
  );
}
