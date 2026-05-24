import { useState } from 'react';
import { UploadCloud, CheckCircle, Database } from 'lucide-react';

export default function AdminPagos() {
  const [file, setFile] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [resultados, setResultados] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResultados(null);
    }
  };

  const handleProcesarCSV = async () => {
    if (!file) return;
    setProcesando(true);
    setResultados(null);

    const formData = new FormData();
    formData.append('archivo', file);

    try {
      const response = await fetch('/api/admin/recaudacion/', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setResultados({
          success: true,
          total: data.total,
          procesados: data.ok,
          errores: data.error,
          detalles: data.errores
        });
      } else {
        setResultados({
          success: false,
          mensaje: data.error || "Ocurrió un error al procesar el archivo."
        });
      }
    } catch (err) {
      setResultados({
        success: false,
        mensaje: "Error de conexión con el servidor."
      });
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: '800', color: 'var(--cip-blue)', marginBottom: '0.5rem' }}>Registro Masivo de Pagos</h1>
        <p className="text-muted">Cargue un archivo CSV proporcionado por el banco para subsanar deudas de los colegiados automáticamente.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--cip-blue)', marginBottom: '1.5rem', borderBottom: '2px solid var(--cip-red)', paddingBottom: '0.5rem', display: 'inline-block' }}>Cargar Archivo (.csv)</h2>
          
          <div style={{ border: '2px dashed var(--border-color)', borderRadius: '12px', padding: '3rem 2rem', textAlign: 'center', background: '#F8FAFC', cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}>
            <input type="file" accept=".csv" onChange={handleFileChange} style={{ opacity: 0, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', cursor: 'pointer' }} />
            <UploadCloud size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto' }} />
            {file ? (
              <div>
                <p style={{ fontWeight: '600', color: 'var(--cip-blue)', fontSize: '1.125rem' }}>{file.name}</p>
                <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>{(file.size / 1024).toFixed(2)} KB - Listo para procesar</p>
              </div>
            ) : (
              <div>
                <p style={{ fontWeight: '600', color: 'var(--text-main)' }}>Arrastre su archivo aquí o haga clic para buscar</p>
                <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>El CSV debe contener columnas: DNI, Monto, FechaPago</p>
              </div>
            )}
          </div>

          <button 
            className="btn btn-primary btn-block" 
            style={{ marginTop: '1.5rem', padding: '1rem', fontSize: '1.125rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
            onClick={handleProcesarCSV}
            disabled={!file || procesando}
          >
            {procesando ? 'Procesando archivo...' : <><Database size={20} /> Procesar Pagos y Subsanar Deudas</>}
          </button>
        </div>

        <div>
          {resultados && resultados.success && (
            <div className="card" style={{ borderLeft: '4px solid #10B981' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <CheckCircle size={32} color="#059669" />
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#065F46' }}>Procesamiento Exitoso</h3>
                  <p style={{ color: '#047857', fontSize: '0.875rem' }}>Los saldos han sido actualizados en la base de datos.</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: '#F8FAFC', borderRadius: '8px' }}>
                  <span className="text-muted">Total registros leídos:</span>
                  <span style={{ fontWeight: '700' }}>{resultados.total}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: '#D1FAE5', borderRadius: '8px' }}>
                  <span style={{ color: '#065F46' }}>Pagos procesados y conciliados:</span>
                  <span style={{ fontWeight: '700', color: '#065F46' }}>{resultados.procesados}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: '#FEE2E2', borderRadius: '8px' }}>
                  <span style={{ color: '#991B1B' }}>Errores o Ingenieros no encontrados:</span>
                  <span style={{ fontWeight: '700', color: '#991B1B' }}>{resultados.errores}</span>
                </div>
              </div>
              
              {resultados.detalles && resultados.detalles.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#991B1B', marginBottom: '0.5rem' }}>Detalle de errores (Máx 10):</p>
                  <ul style={{ fontSize: '0.75rem', color: '#B91C1C', paddingLeft: '1rem', margin: 0 }}>
                    {resultados.detalles.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {resultados && !resultados.success && (
             <div className="card" style={{ borderLeft: '4px solid #EF4444' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Database size={32} color="#DC2626" />
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#991B1B' }}>Error de Archivo</h3>
                  <p style={{ color: '#B91C1C', fontSize: '0.875rem' }}>{resultados.mensaje}</p>
                </div>
              </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
