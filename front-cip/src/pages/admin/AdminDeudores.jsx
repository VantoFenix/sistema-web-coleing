import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Clock, ArrowRight, Loader2 } from 'lucide-react';

export default function AdminDeudores() {
  const [colegiados, setColegiados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorFetch, setErrorFetch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const navigate = useNavigate();

  useEffect(() => {
    fetchColegiados();
  }, []);

  const fetchColegiados = async () => {
    setCargando(true);
    setErrorFetch('');
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/admin/deudores/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setColegiados(data.results || data);
      } else {
        setErrorFetch(`Error al cargar datos`);
      }
    } catch (e) {
      setErrorFetch(`Sin conexión al servidor`);
    } finally {
      setCargando(false);
    }
  };

  const colegiadosFiltrados = colegiados.filter(c => 
    filtroEstado === 'TODOS' || c.estado === filtroEstado
  );

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* 1. Encabezado del Módulo (Header Section) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ marginTop: '2px' }}>
            <Wallet size={28} color="#0F172A" strokeWidth={2} />
          </div>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0F172A', margin: '0 0 4px 0' }}>
              Pagos Mensuales
            </h2>
            <p style={{ color: '#64748B', fontSize: '13px', margin: 0, fontWeight: 'normal' }}>
              Gestión de colegiados e historial de pagos.
            </p>
          </div>
        </div>
        
        <button
          onClick={fetchColegiados}
          disabled={cargando}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            padding: '10px 16px', background: '#FFFFFF', color: '#334155',
            border: '1px solid #E2E8F0', borderRadius: '8px', cursor: cargando ? 'not-allowed' : 'pointer',
            fontSize: '14px', fontWeight: '500', outline: 'none'
          }}
        >
          {cargando ? <Loader2 size={18} className="spin" /> : <Clock size={18} />} 
          Actualizar
        </button>
      </div>

      {errorFetch && (
        <div style={{ padding: '12px 16px', background: '#FEF2F2', color: '#DC2626', borderRadius: '8px', fontSize: '14px', marginBottom: '16px', border: '1px solid #FECACA' }}>
          {errorFetch}
        </div>
      )}

      {/* 2. Filtros / Pestañas (Tabs) */}
      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px', marginBottom: '24px' }}>
        {['TODOS', 'ACTIVO', 'INHABILITADO'].map((estado) => {
          const isActive = filtroEstado === estado;
          const label = estado === 'TODOS' ? 'Todos' : estado === 'ACTIVO' ? 'Activos' : 'Inhabilitados';
          
          if (isActive) {
            return (
              <button
                key={estado}
                style={{
                  background: '#0F172A',
                  color: '#FFFFFF',
                  padding: '6px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'default'
                }}
              >
                {label}
              </button>
            );
          } else {
            return (
              <button
                key={estado}
                onClick={() => setFiltroEstado(estado)}
                style={{
                  background: 'transparent',
                  color: '#64748B',
                  padding: '6px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {label}
              </button>
            );
          }
        })}
      </div>

      {/* 3. Tabla de Datos (Data Table) */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr>
              <th style={{ padding: '16px 24px', color: '#334155', fontSize: '13px', fontWeight: 'bold', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>DNI</th>
              <th style={{ padding: '16px 24px', color: '#334155', fontSize: '13px', fontWeight: 'bold', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>Apellidos y Nombres</th>
              <th style={{ padding: '16px 24px', color: '#334155', fontSize: '13px', fontWeight: 'bold', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>Estado</th>
              <th style={{ padding: '16px 24px', color: '#334155', fontSize: '13px', fontWeight: 'bold', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center' }}><Loader2 size={32} color="#94A3B8" className="spin" style={{margin:'0 auto'}}/></td></tr>
            ) : colegiadosFiltrados.length === 0 ? (
              <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>No hay registros disponibles.</td></tr>
            ) : (
              colegiadosFiltrados.map((colegiado, index) => {
                const nombreCompleto = (colegiado.nombres || colegiado.nombre || '').toUpperCase();
                return (
                  <tr key={colegiado.dni} style={{ borderBottom: index === colegiadosFiltrados.length - 1 ? 'none' : '1px solid #F1F5F9' }}>
                    <td style={{ padding: '16px 24px', fontSize: '14px', color: '#334155', fontFamily: 'sans-serif' }}>
                      {colegiado.dni}
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '14px', color: '#334155', fontFamily: 'sans-serif' }}>
                      {nombreCompleto}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      {colegiado.estado === 'ACTIVO' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', background: '#ECFDF5', color: '#059669', padding: '4px 12px', borderRadius: '9999px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #10B981' }}>
                          ACTIVO
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', background: '#FEF2F2', color: '#DC2626', padding: '4px 12px', borderRadius: '9999px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #EF4444' }}>
                          INHABILITADO
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <button 
                        onClick={() => navigate('/admin/pagos-presencial', { state: { dni: colegiado.dni } })}
                        style={{ 
                          background: '#0F172A', 
                          color: '#FFFFFF', 
                          padding: '8px 16px', 
                          borderRadius: '6px', 
                          fontSize: '13px', 
                          fontWeight: '500',
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          cursor: 'pointer', 
                          border: 'none',
                          outline: 'none'
                        }}
                      >
                        {colegiado.estado === 'ACTIVO' ? 'Adelantar Pago' : 'Cobrar Deuda'} <ArrowRight size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}

