import React, { useState } from 'react';
import { X, Download, Loader2, CheckCircle2, AlertCircle, Mail, Send } from 'lucide-react';

/**
 * ComprobanteModal - Modal para mostrar y descargar comprobante de pago
 * 
 * Props:
 * - comprobante: Objeto con datos del comprobante (numero_comprobante, monto, fecha_hora_pago, etc.)
 * - colegiado: Objeto con datos del colegiado (nombre_completo, cip, etc.)
 * - onClose: Callback cuando se cierra el modal
 * - onDescargar: Callback cuando se inicia la descarga
 */
export default function ComprobanteModal({ comprobante, colegiado, onClose, onDescargar }) {
  const [descargando, setDescargando] = useState(false);
  const [errorDescarga, setErrorDescarga] = useState(null);

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [targetEmail, setTargetEmail] = useState(colegiado?.correo || '');
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState(false);
  const [errorEmail, setErrorEmail] = useState(null);

  if (!comprobante || !colegiado) {
    return null;
  }

  const handleDescargar = async () => {
    setDescargando(true);
    setErrorDescarga(null);

    try {
      // Obtener el ID del comprobante desde la respuesta del API
      const comprobanteId = comprobante.id;
      
      const response = await fetch(`/api/finanzas/comprobantes/${comprobanteId}/descargar_pdf/`);
      
      if (!response.ok) {
        throw new Error('Error al descargar el comprobante');
      }

      // Crear un blob de la respuesta y descargarlo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprobante_${comprobante.numero_comprobante}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Llamar callback si existe
      if (onDescargar) {
        onDescargar(comprobante);
      }
    } catch (error) {
      console.error('Error descargando PDF:', error);
      setErrorDescarga('Error al descargar el PDF. Por favor, intente nuevamente.');
    } finally {
      setDescargando(false);
    }
  };

  const handleEnviarEmail = async () => {
    if (!targetEmail || !targetEmail.includes('@')) {
      setErrorEmail('Por favor ingrese un correo electrónico válido.');
      return;
    }
    setEnviandoEmail(true);
    setErrorEmail(null);

    try {
      const response = await fetch(`/api/finanzas/comprobantes/${comprobante.id}/enviar_email/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar comprobante por correo');
      }
      setEmailEnviado(true);
      setShowEmailForm(false);
    } catch (err) {
      console.error('Error enviando email:', err);
      setErrorEmail(err.message || 'Error al enviar el correo');
    } finally {
      setEnviandoEmail(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(2px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
      >
        {/* Modal */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            maxWidth: '500px',
            width: '90vw',
            maxHeight: '85vh',
            overflow: 'auto',
            animation: 'slideUp 0.3s ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.5rem',
              borderBottom: '1px solid #E5E7EB',
              background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)',
              borderRadius: '16px 16px 0 0',
            }}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'white', margin: 0 }}>
              Comprobante de Pago
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                borderRadius: '8px',
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '2rem' }}>
            {/* Icono de éxito */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div
                style={{
                  background: '#D1FAE5',
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                }}
              >
                <CheckCircle2 size={48} color="#059669" />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#065F46', margin: 0, marginBottom: '0.25rem' }}>
                ¡Pago Registrado!
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                Tu comprobante está listo para descargar
              </p>
            </div>

            {/* Información del comprobante */}
            <div
              style={{
                background: '#F3F4F6',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Colegiado */}
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.4rem' }}>
                    ID Colegiado
                  </p>
                  <p style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--cip-blue)', margin: 0 }}>
                    {colegiado.cip || colegiado.nro_colegiado}
                  </p>
                </div>

                {/* Monto */}
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.4rem' }}>
                    Monto Pagado
                  </p>
                  <p style={{ fontSize: '1rem', fontWeight: '700', color: '#059669', margin: 0 }}>
                    S/ {parseFloat(comprobante.monto).toFixed(2)}
                  </p>
                </div>

                {/* Nombre */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.4rem' }}>
                    Colegiado
                  </p>
                  <p style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-main)', margin: 0 }}>
                    {colegiado.nombre_completo || colegiado.nombres}
                  </p>
                </div>

                {/* Fecha y Hora */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.4rem' }}>
                    Fecha y Hora
                  </p>
                  <p style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-main)', margin: 0 }}>
                    {formatearFechaHora(comprobante.fecha_hora_pago)}
                  </p>
                </div>

                {/* Número de Comprobante */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.4rem' }}>
                    Número de Comprobante
                  </p>
                  <p style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--cip-blue)', margin: 0, fontFamily: 'monospace' }}>
                    {comprobante.numero_comprobante}
                  </p>
                </div>

                {/* Método de Pago */}
                {comprobante.metodo_pago && (
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.4rem' }}>
                      Método
                    </p>
                    <p style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-main)', margin: 0 }}>
                      {comprobante.metodo_pago}
                    </p>
                  </div>
                )}

                {/* Canal */}
                {comprobante.canal && (
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.4rem' }}>
                      Canal
                    </p>
                    <p style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-main)', margin: 0 }}>
                      {comprobante.canal}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Error de descarga / email */}
            {(errorDescarga || errorEmail) && (
              <div
                style={{
                  background: '#FEE2E2',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                }}
              >
                <AlertCircle size={20} color="#DC2626" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                <p style={{ color: '#DC2626', fontSize: '0.9rem', margin: 0 }}>
                  {errorDescarga || errorEmail}
                </p>
              </div>
            )}

            {/* Banner de Correo Enviado Exitosamente */}
            {emailEnviado && (
              <div
                style={{
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <CheckCircle2 size={20} color="#059669" style={{ flexShrink: 0 }} />
                <p style={{ color: '#065F46', fontSize: '0.9rem', margin: 0, fontWeight: '600' }}>
                  ✓ Comprobante enviado exitosamente a {targetEmail}
                </p>
              </div>
            )}

            {/* Formulario de Enviar por Correo */}
            {showEmailForm && (
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                  Correo electrónico de destino:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="email"
                    value={targetEmail}
                    onChange={e => setTargetEmail(e.target.value)}
                    placeholder="ejemplo@correo.com"
                    style={{ flex: 1, padding: '0.6rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}
                  />
                  <button
                    onClick={handleEnviarEmail}
                    disabled={enviandoEmail}
                    style={{
                      background: 'var(--cip-blue)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0 1rem',
                      fontWeight: '700',
                      cursor: enviandoEmail ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    {enviandoEmail ? <Loader2 size={16} className="spin" /> : <><Send size={16} /> Enviar</>}
                  </button>
                </div>
              </div>
            )}

            {/* Botones principales */}
            <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={handleDescargar}
                  disabled={descargando}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.875rem',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: descargando ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    opacity: descargando ? 0.7 : 1,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => !descargando && (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  {descargando ? (
                    <>
                      <Loader2 size={18} className="spin" />
                      Descargando...
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      Descargar PDF
                    </>
                  )}
                </button>

                <button
                  onClick={() => { setShowEmailForm(!showEmailForm); setEmailEnviado(false); setErrorEmail(null); }}
                  style={{
                    flex: 1,
                    background: '#F1F5F9',
                    color: 'var(--cip-blue)',
                    border: '1.5px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '0.875rem',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#E2E8F0')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#F1F5F9')}
                >
                  <Mail size={18} />
                  Enviar a correo
                </button>
              </div>

              <button
                onClick={onClose}
                style={{
                  width: '100%',
                  background: '#F3F4F6',
                  color: '#475569',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#E5E7EB';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#F3F4F6';
                }}
              >
                Cerrar
              </button>
            </div>

            {/* Nota informativa */}
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem', margin: '1rem 0 0 0' }}>
              Este comprobante contiene todos tus datos personales y del pago realizado.
            </p>
          </div>
        </div>
      </div>

      {/* CSS para animación */}
      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

/**
 * Helper para formatear fecha y hora
 */
function formatearFechaHora(fechaIso) {
  if (!fechaIso) return 'N/A';
  
  try {
    const fecha = new Date(fechaIso);
    const opciones = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    };
    return fecha.toLocaleString('es-PE', opciones);
  } catch {
    return fechaIso;
  }
}
