import re

filepath = 'MisPagos.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the QR rendering with a button that opens MP in a new tab
old_qr_block = r"  if \(qrUrl\) \{.*?return \("
new_qr_block = """  if (qrUrl) {
    return (
      <div style={{ animation: 'fadeIn 0.3s ease-out', textAlign: 'center', padding: '2rem 1rem' }}>
        <CheckCircle2 size={48} color="#059669" style={{ marginBottom: '1rem' }} />
        <h3 style={{ color: 'var(--cip-blue)', fontWeight: '800', marginBottom: '0.5rem', fontSize: '1.4rem' }}>
          ¡Conexión Segura Lista!
        </h3>
        <p style={{ fontSize: '0.95rem', color: '#475569', marginBottom: '1.5rem', lineHeight: '1.4' }}>
          Haz clic en el botón de abajo. Se abrirá una nueva pestaña con la <strong>pasarela oficial de MercadoPago</strong>. <br/><br/>
          Allí verás el <strong>Código QR Oficial</strong> gigante a la derecha. <br/>Solo <strong>abre tu app de Yape o Plin</strong>, escanea la pantalla de tu computadora y listo. ¡Sin iniciar sesión!
        </p>

        <button
          onClick={() => window.open(qrUrl, '_blank')}
          style={{ width: '100%', padding: '1.1rem', background: 'linear-gradient(135deg, #7C3AED 0%, #059669 100%)', color: 'white', fontWeight: '800', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '1.1rem', marginBottom: '1.5rem', boxShadow: '0 8px 20px rgba(5,150,105,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          Abrir Pasarela y Mostrar QR
        </button>

        <button
          onClick={() => window.location.reload()}
          style={{ width: '100%', padding: '1.1rem', background: 'white', color: '#334155', fontWeight: '800', borderRadius: '12px', border: '2px solid #CBD5E1', cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s' }}
        >
          Ya escaneé el QR y pagué
        </button>
      </div>
    );
  }

  return ("""
content = re.sub(old_qr_block, new_qr_block, content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
