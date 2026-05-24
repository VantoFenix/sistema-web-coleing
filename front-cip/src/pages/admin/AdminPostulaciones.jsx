import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Search, Eye, ArrowLeft, MinusSquare, XSquare, Image as ImageIcon, FileText, FileSpreadsheet, Loader2, X, Download, ExternalLink } from 'lucide-react';

export default function AdminPostulaciones() {
  const [postulaciones, setPostulaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorFetch, setErrorFetch] = useState('');

  // View State
  const [vista, setVista] = useState('tabla'); // 'tabla' | 'detalle'
  const [expediente, setExpediente] = useState(null);
  const [procesando, setProcesando] = useState(false);

  // Panel State
  const [showRechazoPanel, setShowRechazoPanel] = useState(false);
  const [panelMinimized, setPanelMinimized] = useState(false);

  // Visor de archivos
  const [visorArchivo, setVisorArchivo] = useState(null); // { url, tipo: 'imagen'|'pdf', titulo }

  // Observaciones State
  const [obsFoto, setObsFoto] = useState({ checked: false, text: '' });
  const [obsTitulo, setObsTitulo] = useState({ checked: false, text: '' });
  const [obsRecibo, setObsRecibo] = useState({ checked: false, text: '' });
  const [obsDatos, setObsDatos] = useState({ checked: false, text: '' });

  useEffect(() => {
    fetchPostulaciones();
  }, []);

  const fetchPostulaciones = async () => {
    setCargando(true);
    setErrorFetch('');
    try {
      const res = await fetch('/api/admin/postulaciones/');
      if (res.ok) {
        const data = await res.json();
        setPostulaciones(data);
      } else {
        let txt = '';
        try { txt = await res.text(); } catch (_) {}
        setErrorFetch(`Error ${res.status}: ${txt.slice(0, 200)}`);
      }
    } catch (e) {
      setErrorFetch(`Sin conexión con el servidor: ${e.message}`);
    } finally {
      setCargando(false);
    }
  };

  const resetPanelState = () => {
    setShowRechazoPanel(false);
    setPanelMinimized(false);
    setObsFoto({ checked: false, text: '' });
    setObsTitulo({ checked: false, text: '' });
    setObsRecibo({ checked: false, text: '' });
    setObsDatos({ checked: false, text: '' });
  };

  const handleRevisar = (exp) => {
    setExpediente(exp);
    setVista('detalle');
    resetPanelState();
  };

  const handleBackToTable = () => {
    setVista('tabla');
    setExpediente(null);
    resetPanelState();
  };

  const handleAprobar = async () => {
    setProcesando(true);
    try {
      const res = await fetch(`/api/admin/postulaciones/${expediente.id}/resolver/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'APROBAR' })
      });
      if (res.ok) {
        setPostulaciones(postulaciones.filter(p => p.id !== expediente.id));
        handleBackToTable();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProcesando(false);
    }
  };

  const handleConfirmarRechazo = async () => {
    setProcesando(true);
    const observaciones = [
      obsFoto.checked ? `Foto: ${obsFoto.text}` : '',
      obsTitulo.checked ? `Título: ${obsTitulo.text}` : '',
      obsRecibo.checked ? `Recibo: ${obsRecibo.text}` : '',
      obsDatos.checked ? `Datos: ${obsDatos.text}` : ''
    ].filter(Boolean).join(' | ');

    try {
      const res = await fetch(`/api/admin/postulaciones/${expediente.id}/resolver/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'RECHAZAR', comentarios: observaciones })
      });
      if (res.ok) {
        setPostulaciones(postulaciones.filter(p => p.id !== expediente.id));
        handleBackToTable();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProcesando(false);
    }
  };

  const abrirArchivo = (url, titulo) => {
    if (!url) return;
    const ext = url.split('?')[0].split('.').pop().toLowerCase();
    const tipo = ext === 'pdf' ? 'pdf' : 'imagen';
    setVisorArchivo({ url, tipo, titulo });
  };

  // VISTA TABLA
  if (vista === 'tabla') {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: '800', color: 'var(--cip-blue)', marginBottom: '0.5rem' }}>Cola de Postulaciones</h1>
            <p style={{ color: 'var(--text-muted)' }}>Procese los expedientes en orden de llegada.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" className="form-input" placeholder="Buscar por DNI o ID..." style={{ paddingLeft: '2.5rem' }} />
            </div>
            <button
              onClick={fetchPostulaciones}
              disabled={cargando}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: cargando ? 'not-allowed' : 'pointer', color: 'var(--text-muted)', fontSize: '0.875rem', whiteSpace: 'nowrap' }}
            >
              <Clock size={15} className={cargando ? 'spin' : ''} /> Actualizar
            </button>
          </div>
        </div>

        {/* Error de carga */}
        {errorFetch && (
          <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', color: '#B91C1C' }}>
            <XCircle size={20} style={{ flexShrink: 0, marginTop: '1px' }} />
            <div>
              <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>No se pudo cargar la lista de postulaciones</p>
              <p style={{ fontSize: '0.8rem' }}>{errorFetch}</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.8 }}>
                Asegúrate de que el servidor backend esté corriendo (<code>python manage.py runserver</code>) y recarga la página.
              </p>
            </div>
          </div>
        )}

        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--cip-blue)', fontWeight: '600' }}>Expediente</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--cip-blue)', fontWeight: '600' }}>Fecha Ingreso</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--cip-blue)', fontWeight: '600' }}>DNI</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--cip-blue)', fontWeight: '600' }}>Apellidos y Nombres</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--cip-blue)', fontWeight: '600' }}>Estado</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--cip-blue)', fontWeight: '600', textAlign: 'center' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}><Loader2 className="spin" style={{margin: '0 auto'}}/> Cargando postulaciones...</td></tr>
              ) : postulaciones.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No hay postulaciones pendientes.</td></tr>
              ) : (
                postulaciones.map((p, index) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)', background: index === 0 ? '#FEF2F2' : 'white', cursor: 'pointer', transition: 'background 0.2s' }} onClick={() => handleRevisar(p)} onMouseOver={(e) => e.currentTarget.style.background = '#EFF6FF'} onMouseOut={(e) => e.currentTarget.style.background = index === 0 ? '#FEF2F2' : 'white'}>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-main)' }}>EXP-{p.id}</td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={16} /> {new Date(p.creado_en).toLocaleString()}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>{p.dni}</td>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: '500' }}>{p.nombres}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ background: '#FEF3C7', color: '#D97706', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '700' }}>
                        {p.estado}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                      <button className="btn btn-outline" style={{ padding: '0.5rem', borderColor: 'var(--border-color)' }} onClick={(e) => { e.stopPropagation(); handleRevisar(p); }}>
                        <Eye size={18} color="var(--cip-blue)" /> Revisar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div style={{ padding: '1rem 1.5rem', background: '#F8FAFC', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Mostrando {postulaciones.length} expedientes en cola. (El expediente resaltado es el más antiguo).
          </div>
        </div>
        <VisorModal visor={visorArchivo} onClose={() => setVisorArchivo(null)} />
      </div>
    );
  }

  // VISTA DETALLE
  return (
    <div style={{ position: 'relative', paddingBottom: showRechazoPanel && !panelMinimized ? '400px' : '0', transition: 'padding-bottom 0.3s' }}>
      
      {/* Cabecera Detalle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={handleBackToTable}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '800', color: 'var(--cip-blue)', marginBottom: '0.25rem' }}>Revisión de Expediente: {expediente.id}</h1>
          <p className="text-muted">Fecha de Ingreso: {expediente.creado_en ? new Date(expediente.creado_en).toLocaleString('es-PE') : '—'}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>

        {/* Lado Izquierdo: Datos */}
        <div className="card" style={{ alignSelf: 'start' }}>
          <h3 style={{ color: 'var(--cip-blue)', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem' }}>Datos del Postulante</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div><p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>Apellidos y Nombres</p><p style={{ fontWeight: '600', color: 'var(--text-main)' }}>{expediente.nombres}</p></div>
            <div><p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>DNI</p><p style={{ fontWeight: '600', color: 'var(--text-main)' }}>{expediente.dni}</p></div>
            <div><p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>Celular</p><p style={{ fontWeight: '600', color: 'var(--text-main)' }}>{expediente.celular}</p></div>
            <div><p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>Correo Electrónico</p><p style={{ fontWeight: '600', color: 'var(--text-main)' }}>{expediente.correo}</p></div>
            <div><p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>Especialidad / Carrera</p><p style={{ fontWeight: '600', color: 'var(--text-main)' }}>{expediente.carrera?.nombre}</p></div>
            <div><p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>Sede</p><p style={{ fontWeight: '600', color: 'var(--text-main)' }}>{expediente.sede?.nombre || '—'}</p></div>
          </div>
        </div>

        {/* Lado Derecho: Documentos + Acciones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Documentos */}
          <div className="card" style={{ alignSelf: 'start' }}>
            <h3 style={{ color: 'var(--cip-blue)', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem' }}>Documentación Adjunta</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
              {/* Box Foto */}
              <DocBox
                icono={<ImageIcon size={32} color="var(--cip-blue)" />}
                titulo="1. Fotografía"
                url={expediente.foto_url}
                btnLabel="Ver Imagen"
                btnIcono={<ImageIcon size={14} />}
                onVer={() => abrirArchivo(expediente.foto_url, 'Fotografía — ' + expediente.nombres)}
              />

              {/* Box Título */}
              <DocBox
                icono={<FileText size={32} color="var(--cip-blue)" />}
                titulo="2. Título Profesional"
                url={expediente.titulo_pdf_url}
                btnLabel="Ver PDF"
                btnIcono={<FileText size={14} />}
                onVer={() => abrirArchivo(expediente.titulo_pdf_url, 'Título Profesional — ' + expediente.nombres)}
              />

              {/* Box Recibo */}
              <DocBox
                icono={<FileSpreadsheet size={32} color="var(--cip-blue)" />}
                titulo="3. Recibo S/1500"
                url={expediente.recibo_pago_url}
                btnLabel="Ver Recibo"
                btnIcono={<FileSpreadsheet size={14} />}
                onVer={() => abrirArchivo(expediente.recibo_pago_url, 'Recibo de Pago — ' + expediente.nombres)}
              />
            </div>
          </div>

          {/* Botones de Acción */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              className="btn btn-outline"
              style={{ flex: 1, borderColor: '#EF4444', color: '#B91C1C', padding: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              onClick={() => { setShowRechazoPanel(true); setPanelMinimized(false); }}
              disabled={procesando}
            >
              <XCircle size={20} /> Expediente Incorrecto (Observar)
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 1, background: '#10B981', borderColor: '#10B981', padding: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              onClick={handleAprobar}
              disabled={procesando}
            >
              {procesando ? <Loader2 className="spin" size={20} /> : <><CheckCircle size={20} /> Todo Conforme (Aprobar)</>}
            </button>
          </div>

        </div>
      </div>

      {/* PANEL FLOTANTE DE RECHAZO / OBSERVACIONES */}
      {showRechazoPanel && (
        <div style={{
          position: 'fixed',
          bottom: panelMinimized ? '20px' : '0',
          right: panelMinimized ? '20px' : '0',
          width: panelMinimized ? '300px' : '600px',
          height: panelMinimized ? 'auto' : '100vh',
          maxHeight: panelMinimized ? '60px' : 'calc(100vh - 40px)',
          background: 'white',
          boxShadow: '-5px 0 25px rgba(0,0,0,0.15)',
          borderTopLeftRadius: panelMinimized ? '12px' : '24px',
          borderBottomLeftRadius: panelMinimized ? '12px' : '24px',
          borderTopRightRadius: panelMinimized ? '12px' : '0',
          borderBottomRightRadius: panelMinimized ? '12px' : '0',
          border: panelMinimized ? '1px solid var(--border-color)' : 'none',
          borderLeft: panelMinimized ? '1px solid var(--border-color)' : '4px solid var(--cip-red)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 1000,
          cursor: panelMinimized ? 'pointer' : 'default',
          overflow: panelMinimized ? 'hidden' : 'visible'
        }}
        onClick={() => { if(panelMinimized) setPanelMinimized(false); }}
        >
          {/* Cabecera del Panel */}
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', borderTopLeftRadius: 'inherit', borderTopRightRadius: panelMinimized ? '12px' : '0' }}>
            <h3 style={{ fontSize: panelMinimized ? '1rem' : '1.25rem', fontWeight: '700', color: 'var(--cip-red)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <XCircle size={panelMinimized ? 18 : 24} /> {panelMinimized ? 'Observaciones en curso...' : 'Observar Expediente'}
            </h3>
            
            {!panelMinimized && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-outline" style={{ padding: '0.5rem', border: 'none' }} onClick={() => setPanelMinimized(true)} title="Minimizar">
                  <MinusSquare size={24} color="var(--text-muted)" />
                </button>
                <button className="btn btn-outline" style={{ padding: '0.5rem', border: 'none' }} onClick={() => setShowRechazoPanel(false)} title="Cerrar sin guardar">
                  <XSquare size={24} color="var(--text-muted)" />
                </button>
              </div>
            )}
          </div>

          {/* Cuerpo del Panel (Solo visible si no está minimizado) */}
          {!panelMinimized && (
            <>
              <div style={{ padding: '2rem 1.5rem', overflowY: 'auto', flex: 1 }}>
                <p className="text-muted" style={{ marginBottom: '2rem' }}>Seleccione qué secciones del expediente tienen errores y especifique el motivo. Esta información será enviada al postulante.</p>

                {/* ZONA 1: Foto */}
                <div style={{ marginBottom: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', background: obsFoto.checked ? '#EFF6FF' : 'white' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: '600', cursor: 'pointer', margin: 0 }}>
                    <input type="checkbox" style={{ width: '20px', height: '20px' }} checked={obsFoto.checked} onChange={(e) => setObsFoto({...obsFoto, checked: e.target.checked})} />
                    1. Fotografía Tamaño Pasaporte
                  </label>
                  {obsFoto.checked && (
                    <textarea className="form-input" placeholder="Especifique el error (Ej. El fondo no es blanco)..." style={{ marginTop: '1rem', minHeight: '80px', resize: 'vertical' }} value={obsFoto.text} onChange={(e) => setObsFoto({...obsFoto, text: e.target.value})} />
                  )}
                </div>

                {/* ZONA 2: Título */}
                <div style={{ marginBottom: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', background: obsTitulo.checked ? '#EFF6FF' : 'white' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: '600', cursor: 'pointer', margin: 0 }}>
                    <input type="checkbox" style={{ width: '20px', height: '20px' }} checked={obsTitulo.checked} onChange={(e) => setObsTitulo({...obsTitulo, checked: e.target.checked})} />
                    2. Título Profesional
                  </label>
                  {obsTitulo.checked && (
                    <textarea className="form-input" placeholder="Especifique el error (Ej. Documento ilegible o falta firma)..." style={{ marginTop: '1rem', minHeight: '80px', resize: 'vertical' }} value={obsTitulo.text} onChange={(e) => setObsTitulo({...obsTitulo, text: e.target.value})} />
                  )}
                </div>

                {/* ZONA 3: Recibo */}
                <div style={{ marginBottom: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', background: obsRecibo.checked ? '#EFF6FF' : 'white' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: '600', cursor: 'pointer', margin: 0 }}>
                    <input type="checkbox" style={{ width: '20px', height: '20px' }} checked={obsRecibo.checked} onChange={(e) => setObsRecibo({...obsRecibo, checked: e.target.checked})} />
                    3. Recibo de Pago (S/ 1500)
                  </label>
                  {obsRecibo.checked && (
                    <textarea className="form-input" placeholder="Especifique el error (Ej. Monto incorrecto)..." style={{ marginTop: '1rem', minHeight: '80px', resize: 'vertical' }} value={obsRecibo.text} onChange={(e) => setObsRecibo({...obsRecibo, text: e.target.value})} />
                  )}
                </div>

                {/* ZONA 4: Datos Generales */}
                <div style={{ marginBottom: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', background: obsDatos.checked ? '#EFF6FF' : 'white' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: '600', cursor: 'pointer', margin: 0 }}>
                    <input type="checkbox" style={{ width: '20px', height: '20px' }} checked={obsDatos.checked} onChange={(e) => setObsDatos({...obsDatos, checked: e.target.checked})} />
                    4. Datos Personales / Carrera
                  </label>
                  {obsDatos.checked && (
                    <textarea className="form-input" placeholder="Especifique el error (Ej. Los nombres no coinciden con el DNI)..." style={{ marginTop: '1rem', minHeight: '80px', resize: 'vertical' }} value={obsDatos.text} onChange={(e) => setObsDatos({...obsDatos, text: e.target.value})} />
                  )}
                </div>
              </div>

              {/* Footer del Panel */}
              <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', background: 'white' }}>
                <button 
                  className="btn btn-primary btn-block" 
                  style={{ padding: '1rem', fontSize: '1.125rem', background: 'var(--cip-red)', borderColor: 'var(--cip-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  onClick={handleConfirmarRechazo}
                  disabled={!(obsFoto.checked || obsTitulo.checked || obsRecibo.checked || obsDatos.checked) || procesando}
                >
                  {procesando ? <Loader2 className="spin" size={20} /> : <><XCircle size={20} /> Confirmar Rechazo y Notificar</>}
                </button>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.75rem' }}>Al confirmar, el expediente saldrá de la cola y se enviará un correo al postulante.</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal visor de archivos */}
      <VisorModal visor={visorArchivo} onClose={() => setVisorArchivo(null)} />
    </div>
  );
}

// ── Componente auxiliar: tarjeta de documento ────────────────────────────────
function DocBox({ icono, titulo, url, btnLabel, btnIcono, onVer }) {
  return (
    <div style={{
      border: '1px solid var(--border-color)', borderRadius: '8px',
      padding: '1rem', textAlign: 'center', background: '#F8FAFC',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      <div style={{ margin: '0 auto 0.5rem auto', display: 'block' }}>{icono}</div>
      <p style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-main)' }}>
        {titulo}
      </p>
      {url ? (
        <button
          onClick={onVer}
          style={{
            width: '100%', fontSize: '0.8rem', padding: '0.5rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            background: 'white', border: '1px solid var(--border-color)',
            borderRadius: '6px', color: 'var(--cip-blue)', cursor: 'pointer',
            fontWeight: '600', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.borderColor = 'var(--cip-blue)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
        >
          {btnIcono} {btnLabel}
        </button>
      ) : (
        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Sin archivo</span>
      )}
    </div>
  );
}

// ── Visor de archivos — componente de módulo (ESTABLE, no se destruye en cada render) ────
function VisorModal({ visor, onClose }) {
  const [imgError, setImgError] = useState(false);
  const [cargandoPdf, setCargandoPdf] = useState(false);

  // Resetear error al cambiar de archivo
  useState(() => { setImgError(false); setCargandoPdf(false); }, [visor?.url]);

  if (!visor) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.88)',
        zIndex: 2000, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}
      onClick={onClose}
    >
      {/* ── Barra superior ── */}
      <div
        style={{
          width: '100%', maxWidth: '960px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.75rem 1rem', background: 'var(--cip-blue)',
          borderRadius: '12px 12px 0 0', color: 'white', flexShrink: 0,
        }}
        onClick={e => e.stopPropagation()}
      >
        <span style={{ fontWeight: '600', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
          {visor.tipo === 'pdf' ? '📄' : '🖼️'} {visor.titulo}
        </span>
        <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
          <a
            href={visor.url} target="_blank" rel="noopener noreferrer"
            style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderRadius: '6px', padding: '0.35rem 0.65rem', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}
          >
            <ExternalLink size={13} /> Nueva pestaña
          </a>
          <a
            href={visor.url} download
            style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderRadius: '6px', padding: '0.35rem 0.65rem', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}
          >
            <Download size={13} /> Descargar
          </a>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: '6px', padding: '0.35rem 0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── Área de contenido ── */}
      <div
        style={{
          width: '100%', maxWidth: '960px', background: '#111827',
          borderRadius: '0 0 12px 12px', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '520px', position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {visor.tipo === 'imagen' ? (
          imgError ? (
            /* ─ Error de imagen ─ */
            <div style={{ textAlign: 'center', color: '#94A3B8', padding: '3rem' }}>
              <ImageIcon size={52} style={{ marginBottom: '1rem', opacity: 0.35 }} />
              <p style={{ fontWeight: '600', marginBottom: '0.5rem' }}>No se pudo cargar la imagen</p>
              <p style={{ fontSize: '0.75rem', opacity: 0.6, wordBreak: 'break-all', maxWidth: '500px' }}>{visor.url}</p>
              <a href={visor.url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-block', marginTop: '1.25rem', color: '#60A5FA', fontSize: '0.85rem', textDecoration: 'underline' }}>
                Abrir URL directamente →
              </a>
            </div>
          ) : (
            /* ─ Imagen ─ */
            <img
              key={visor.url}
              src={visor.url}
              alt={visor.titulo}
              onError={() => setImgError(true)}
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', display: 'block' }}
            />
          )
        ) : (
          /* ─ PDF con <embed> (más compatible que <iframe>) ─ */
          <div style={{ width: '100%', height: '80vh', position: 'relative' }}>
            {cargandoPdf && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111827', zIndex: 1 }}>
                <Loader2 size={32} className="spin" style={{ color: '#94A3B8' }} />
              </div>
            )}
            <embed
              key={visor.url}
              src={visor.url}
              type="application/pdf"
              width="100%"
              height="100%"
              onLoad={() => setCargandoPdf(false)}
              style={{ display: 'block', background: 'white' }}
            />
            {/* Fallback si el browser no soporta embed PDF */}
            <noscript>
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>
                <a href={visor.url} target="_blank" rel="noopener noreferrer" style={{ color: '#60A5FA' }}>
                  Abrir PDF en nueva pestaña →
                </a>
              </div>
            </noscript>
          </div>
        )}
      </div>

      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', marginTop: '0.6rem' }}>
        Clic fuera del visor para cerrar
      </p>
    </div>
  );
}
