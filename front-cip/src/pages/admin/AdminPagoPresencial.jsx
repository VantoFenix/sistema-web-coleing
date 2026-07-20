import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search, User, CheckCircle2, XCircle, Loader2,
  Calendar, AlertCircle, BadgeCheck, CreditCard,
  Banknote, Smartphone, Building2, Wallet, ChevronRight,
} from 'lucide-react';
import ComprobanteModal from '../../components/UI/ComprobanteModal';

// ── Helpers ────────────────────────────────────────────────────────────────
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MESES_CORTO = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
  'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC',
];

function fmtPeriodo(p) {
  const [año, mes] = p.split('-');
  return `${MESES[parseInt(mes, 10) - 1]} ${año}`;
}
function fmtPeriodoCorto(p) {
  const mes = parseInt(p.split('-')[1], 10) - 1;
  return MESES_CORTO[mes];
}

function fmtFecha(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const METODOS = [
  { valor: 'YAPE_PLIN', label: 'QR (Yape/Plin)', icono: <Smartphone size={16} /> },
  { valor: 'EFECTIVO', label: 'Efectivo', icono: <Banknote size={16} /> },
];

function BadgeHabilitado({ habilitado }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: '0.25rem 0.7rem', borderRadius: '999px', fontSize: '0.72rem',
      fontWeight: '700',
      background: habilitado ? '#D1FAE5' : '#FEE2E2',
      color: habilitado ? '#065F46' : '#991B1B',
    }}>
      {habilitado ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
      {habilitado ? 'Habilitado' : 'Inhabilitado'}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function AdminPagoPresencial() {
  const location = useLocation();
  const navigate = useNavigate();

  const [cameFromDeudores, setCameFromDeudores] = useState(false);

  const [query, setQuery] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState(null);
  const [errBusqueda, setErrBusqueda] = useState('');
  const [qrPagadoMixto, setQrPagadoMixto] = useState(false);

  const [cargandoQr, setCargandoQr] = useState(false);
  const [qrError, setQrError] = useState('');

  const generarQrMixto = async (montoQr) => {
    setCargandoQr(true); setQrError('');
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/flow/generar-qr/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount: montoQr, subject: 'Pago Mixto - CIP' })
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setFlowInitPoint(`${data.url}?token=${data.token}`);
        setFlowToken(data.token);
        setFlowModoMixto(true);
      } else {
        setQrError(data.error || 'Error al generar QR');
      }
    } catch {
      setQrError('Error de red al generar QR');
    } finally {
      setCargandoQr(false);
    }
  };

  const [comprobanteParaMostrar, setComprobanteParaMostrar] = useState(null);
  const [comprobanteDescargando, setComprobanteDescargando] = useState(false);

  const [colegiado, setColegiado] = useState(null);
  const [deuda, setDeuda] = useState(null);
  const [cargandoDeuda, setCargandoDeuda] = useState(false);

  const [periodosSeleccionados, setPeriodosSeleccionados] = useState(new Set());
  const [metodo, setMetodo] = useState('');
  const [monto, setMonto] = useState('');
  const [esMixto, setEsMixto] = useState(false);
  const [metodo1, setMetodo1] = useState('');
  const [monto1, setMonto1] = useState('');
  const [metodo2, setMetodo2] = useState('');
  const [monto2, setMonto2] = useState('');
  const [montoMensual, setMontoMensual] = useState(0);

  const [enviando, setEnviando] = useState(false);
  const [errForm, setErrForm] = useState('');
  const [resultado, setResultado] = useState(null);

  const [flowInitPoint, setFlowInitPoint] = useState(null);
  const [flowToken, setFlowToken] = useState(null);
  const [flowModoMixto, setFlowModoMixto] = useState(false);

  const handleRegistrarRef = useRef();

  const hoy = new Date();
  const [maxVisibleYear, setMaxVisibleYear] = useState(hoy.getFullYear());

  const searchRef = useRef(null);

  // Cargar precio configurado + public key MP
  useEffect(() => {
    fetch('/api/admin/configuracion/')
      .then(r => r.json())
      .then(d => { if (d.monto_mensualidad) setMontoMensual(parseFloat(d.monto_mensualidad)); })
      .catch(() => { });

    if (location.state && location.state.dni) {
      if (location.state.fromDeudores) setCameFromDeudores(true);
      setQuery(location.state.dni);
      handleBuscar(location.state.dni);
      // Limpiar el state para no buscar siempre que se refresque
      navigate(location.pathname, { replace: true, state: {} });
    } else {
      // Restaurar sesión de admin pago si existe
      const savedCol = sessionStorage.getItem('admin_pago_colegiado');
      if (savedCol) {
        try {
          const colParsed = JSON.parse(savedCol);
          handleSeleccionarColegiado(colParsed, true);
        } catch (e) {
          sessionStorage.removeItem('admin_pago_colegiado');
        }
      }
    }
  }, []);

  // Guardar periodos seleccionados en session storage
  useEffect(() => {
    if (colegiado) {
      sessionStorage.setItem('admin_pago_periodos', JSON.stringify([...periodosSeleccionados]));
    }
  }, [periodosSeleccionados, colegiado]);

  // Guardar ref para el polling
  useEffect(() => {
    handleRegistrarRef.current = handleRegistrar;
  });

  // Polling de Flow
  useEffect(() => {
    let intervalId = null;
    if (flowInitPoint && flowToken) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch('/api/flow/confirmar-generico/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
            },
            body: JSON.stringify({ token: flowToken })
          });
          const data = await res.json();
          if (data.status === 2) {
            setFlowInitPoint(null);
            setFlowToken(null);
            
            if (flowModoMixto) {
              setFlowModoMixto(false);
              setQrPagadoMixto(true);
            } else {
              setFlowModoMixto(false);
              // Registrar automáticamente pasando flowSuccess = true
              if (handleRegistrarRef.current) handleRegistrarRef.current(true);
            }
          } else if (data.error) {
            setFlowInitPoint(null);
            setFlowToken(null);
            setFlowModoMixto(false);
            setErrForm(data.error);
          }
        } catch (e) { }
      }, 3500);
    }
    return () => clearInterval(intervalId);
  }, [flowInitPoint, flowToken]);

  // Auto-calcular monto
  useEffect(() => {
    if (periodosSeleccionados.size > 0) {
      setMonto((periodosSeleccionados.size * montoMensual).toFixed(2));
    } else {
      setMonto('');
    }
  }, [periodosSeleccionados, montoMensual]);

  const handleBuscar = async (overrideQuery = null) => {
    const q = (typeof overrideQuery === 'string' ? overrideQuery : query).trim();
    if (q.length < 2) { setErrBusqueda('Ingrese al menos 2 caracteres'); return; }
    setErrBusqueda('');
    setBuscando(true);
    setResultados(null);
    try {
      const res = await fetch(`/api/admin/colegiados/buscar/?q=${encodeURIComponent(q)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}` }
      });
      const data = await res.json();
      setResultados(Array.isArray(data) ? data : []);
      // Si fue una búsqueda directa por DNI y hay exactamente 1 resultado, seleccionarlo
      if (typeof overrideQuery === 'string' && Array.isArray(data) && data.length === 1) {
        handleSeleccionarColegiado(data[0]);
      }
    } catch {
      setErrBusqueda('Error de conexión con el servidor.');
    } finally {
      setBuscando(false);
    }
  };

  const handleSeleccionarColegiado = async (col, isRestore = false) => {
    setColegiado(col);
    if (!isRestore) {
      sessionStorage.setItem('admin_pago_colegiado', JSON.stringify(col));
      sessionStorage.removeItem('admin_pago_periodos');
    }

    setResultados(null);
    setPeriodosSeleccionados(new Set());
    setMetodo('');
    setEsMixto(false);
    setMetodo1(''); setMonto1(''); setMetodo2(''); setMonto2('');
    setMonto('');
    setErrForm('');
    setFlowInitPoint(null);
    setFlowToken(null);
    setFlowModoMixto(false);
    setQrPagadoMixto(false);
    setResultado(null);
    setCargandoDeuda(true);
    try {
      const res = await fetch(`/api/admin/colegiados/${col.id}/deuda/`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}` }
      });
      const data = await res.json();
      setDeuda(data);
      const periodos = data.periodos || data.periodos_pendientes || [];

      let toSelect = [];
      if (isRestore) {
        const savedPer = sessionStorage.getItem('admin_pago_periodos');
        if (savedPer) {
          try {
            toSelect = JSON.parse(savedPer);
          } catch (e) { }
        }
      }

      if (!isRestore || toSelect.length === 0) {
        toSelect = periodos.filter(p => p.estado === 'PENDIENTE').map(p => p.periodo);
      }

      setPeriodosSeleccionados(new Set(toSelect));
      setMaxVisibleYear(hoy.getFullYear());
    } catch {
      setDeuda({ periodos: [], periodos_pendientes: [], total_deuda: 0 });
    } finally {
      setCargandoDeuda(false);
    }
  };

  const getPeriodos = () => deuda?.periodos || [];
  const getPendientes = () => getPeriodos().filter(p => p.estado === 'PENDIENTE').map(p => p.periodo);
  const hayDeudaSinPagar = () => getPendientes().some(p => !periodosSeleccionados.has(p));

  const togglePeriodo = (periodo, estado) => {
    const pendientes = getPendientes();
    const allPeriodos = getPeriodos();
    setPeriodosSeleccionados(prev => {
      const s = new Set(prev);
      if (estado === 'PENDIENTE') {
        const todasSel = pendientes.every(p => s.has(p));
        if (todasSel) return new Set();
        pendientes.forEach(p => s.add(p));
        return s;
      }
      if (estado === 'ADELANTO') {
        if (s.has(periodo)) {
          const idx = allPeriodos.findIndex(p => p.periodo === periodo);
          allPeriodos.slice(idx).forEach(p => { if (p.estado !== 'PAGADO') s.delete(p.periodo); });
          return s;
        } else {
          for (const p of allPeriodos) {
            if (p.periodo === periodo) break;
            if (p.estado !== 'PAGADO') s.add(p.periodo);
          }
          s.add(periodo);
          return s;
        }
      }
      return s;
    });
  };

  const seleccionarTodos = () => setPeriodosSeleccionados(new Set(getPeriodos().filter(p => p.estado !== 'PAGADO').map(p => p.periodo)));
  const seleccionarSoloDeuda = () => setPeriodosSeleccionados(new Set(getPendientes()));
  const deseleccionarTodos = () => setPeriodosSeleccionados(new Set());

  const handleRegistrar = async (flowSuccess = false) => {
    setErrForm('');
    if (periodosSeleccionados.size === 0) { setErrForm('Seleccione al menos un periodo.'); return; }
    
    if (!monto || isNaN(parseFloat(monto)) || parseFloat(monto) <= 0) {
      setErrForm('Ingrese un monto válido mayor a 0.'); return;
    }

    let payload = {
      colegiado_id: colegiado.id,
      periodos: [...periodosSeleccionados].sort(),
      monto: parseFloat(monto),
      fecha_pago: new Date().toISOString().slice(0, 10),
    };

    if (esMixto) {
      if (!metodo1 || !monto1 || !metodo2 || !monto2) {
        setErrForm('Debe completar ambos métodos y montos en el pago mixto.'); return;
      }
      if (Math.abs(parseFloat(monto1) + parseFloat(monto2) - parseFloat(monto)) > 0.01) {
        setErrForm(`La suma de los montos (S/ ${(parseFloat(monto1) || 0) + (parseFloat(monto2) || 0)}) no coincide con el total (S/ ${parseFloat(monto).toFixed(2)}).`); return;
      }
      if (metodo1 === metodo2) {
        setErrForm('Seleccione métodos diferentes para el pago mixto.'); return;
      }
      if ((metodo1 === 'YAPE_PLIN' || metodo2 === 'YAPE_PLIN') && !qrPagadoMixto) {
        if (metodo1 === 'YAPE_PLIN') generarQrMixto(monto1);
        else if (metodo2 === 'YAPE_PLIN') generarQrMixto(monto2);
        return;
      }
      payload.metodo = 'MIXTO';
      payload.pagos_parciales = [
        { metodo: metodo1, monto: parseFloat(monto1) },
        { metodo: metodo2, monto: parseFloat(monto2) }
      ];
    } else {
      if (!metodo) { setErrForm('Seleccione el método de pago.'); return; }
      payload.metodo = metodo;
    }

    setEnviando(true);

    if (!esMixto && metodo === 'YAPE_PLIN' && !flowSuccess) {
      try {
        const token = localStorage.getItem('adminToken') || '';
        const res = await fetch('/api/pagos/flow/crear/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            colegiado_id: colegiado.id,
            periodos: [...periodosSeleccionados].sort(),
            monto: parseFloat(monto).toFixed(2)
          })
        });
        const data = await res.json();
        if (data.init_point) {
          setFlowToken(data.token);
          setFlowInitPoint(data.init_point);
        } else {
          setErrForm(data.error || 'Error al generar link de Flow.');
        }
      } catch {
        setErrForm('Error de conexión con Flow.');
      } finally {
        setEnviando(false);
      }
      return;
    }

    try {
      const res = await fetch('/api/admin/pagos/presencial/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setResultado({ ok: true, ...data });
      } else if (data.ya_pagados) {
        // Periodos ya registrados — refrescar calendario para sincronizar
        setErrForm('Estos períodos ya estaban pagados. Actualizando calendario...');
        recargarDeuda();
      } else {
        setErrForm(data.error || 'Error al registrar el pago.');
      }
    } catch {
      setErrForm('Error de conexión con el servidor.');
    } finally {
      setEnviando(false);
    }
  };

  const generarComprobante = () => {
    const r = resultado;
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Comprobante ${r.boleta_numero || ''}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #000; background: #fff; width: 80mm; margin: 0 auto; padding: 5mm; }
    .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
    .org-name { font-weight: bold; font-size: 14px; margin-bottom: 4px; line-height: 1.2; }
    .org-detail { font-size: 11px; line-height: 1.3; }
    .boleta-box { margin-top: 10px; }
    .boleta-box .tipo { font-weight: bold; font-size: 13px; line-height: 1.2; }
    .boleta-box .numero { font-weight: bold; font-size: 14px; margin-top: 2px; }
    .section { margin-bottom: 10px; }
    .adquirente-row { font-size: 11px; margin-bottom: 2px; }
    .meta-row { font-size: 11px; margin-bottom: 10px; display: flex; justify-content: space-between; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    thead tr { border-bottom: 1px dashed #000; border-top: 1px dashed #000; }
    thead th { padding: 4px 0; text-align: left; font-size: 11px; font-weight: bold; }
    thead th:last-child { text-align: right; }
    tbody tr { border-bottom: none; }
    tbody td { padding: 4px 0; font-size: 11px; vertical-align: top; }
    tbody td:last-child { text-align: right; }
    .totales { border-top: 1px dashed #000; padding-top: 6px; margin-bottom: 15px; }
    .totales-table { width: 100%; margin-bottom: 0; }
    .totales-table tr td { padding: 2px 0; font-size: 11px; }
    .totales-table tr td:last-child { text-align: right; }
    .totales-table tr.total-final td { font-weight: bold; font-size: 14px; padding-top: 4px; }
    .footer { font-size: 10px; text-align: center; margin-top: 15px; border-top: 1px dashed #000; padding-top: 10px; line-height: 1.4; }
    @media print {
      body { width: 80mm; padding: 0; margin: 0; }
      @page { margin: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="org-name">COLEGIO DE INGENIEROS DEL PERU<br/>CONSEJO NACIONAL</div>
    <div class="org-detail">RUC 20138086438</div>
    <div class="org-detail">AV. AREQUIPA 4947 MIRAFLORES - LIMA</div>
    <div class="boleta-box">
      <div class="tipo">BOLETA DE VENTA<br/>ELECTRONICA</div>
      <div class="numero">${r.boleta_numero || 'B001-00000000'}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">DATOS DEL ADQUIRENTE</div>
    <div class="adquirente-row">DNI: ${r.colegiado_dni || ''}</div>
    <div class="adquirente-row">Nombre: ${r.colegiado_nombres || r.colegiado || ''}</div>
  </div>

  <div class="meta-row">
    <span>Emision: ${r.emision || r.fecha_pago || ''}</span>
    <span>Moneda: PEN</span>
  </div>

  <table>
    <thead>
      <tr>
        <th>Cant.</th>
        <th>Descripcion</th>
        <th>P. Unit.</th>
        <th>Importe</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td>
          <div style="margin-bottom:2px">Mensualidad CIP</div>
          <div style="font-size:10px;color:#333;">${r.periodos_label || ''}</div>
        </td>
        <td>${parseFloat(r.monto_total || 0).toFixed(2)}</td>
        <td>${parseFloat(r.monto_total || 0).toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  ${r.pagos_parciales && r.pagos_parciales.length > 0 ? `
  <div class="totales" style="border-top: none; padding-top: 0; margin-bottom: 10px;">
    <div style="font-weight: bold; font-size: 11px; margin-bottom: 4px;">Detalle de Pago:</div>
    <table class="totales-table">
      ${r.pagos_parciales.map(p => `<tr><td>${p.metodo === 'YAPE_PLIN' ? 'Yape/Plin/Online' : p.metodo}</td><td>S/ ${parseFloat(p.monto).toFixed(2)}</td></tr>`).join('')}
    </table>
  </div>
  ` : `
  <div class="totales" style="border-top: none; padding-top: 0; margin-bottom: 10px;">
    <table class="totales-table">
      <tr><td>Forma de pago</td><td>${r.metodo}</td></tr>
    </table>
  </div>
  `}

  <div class="totales">
    <table class="totales-table">
      <tr><td>Op. inafecta</td><td>S/ ${parseFloat(r.monto_total || 0).toFixed(2)}</td></tr>
      <tr><td>IGV</td><td>S/ 0.00</td></tr>
      <tr class="total-final"><td>Importe total</td><td>S/ ${parseFloat(r.monto_total || 0).toFixed(2)}</td></tr>
    </table>
  </div>

  <div class="footer">Comprobante generado por el sistema de colegiacion digital.</div>

  <div class="no-print" style="margin-top:30px; text-align:center;">
    <button onclick="window.print()" style="padding:10px 28px;background:#1e3a5f;color:white;border:none;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;margin-right:10px;">
      🖨️ Imprimir
    </button>
    <button onclick="window.close()" style="padding:10px 28px;background:#64748b;color:white;border:none;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;">
      Cerrar
    </button>
  </div>
</body>
</html>`;
    const win = window.open('', '_blank', 'width=800,height=700');
    win.document.write(html);
    win.document.close();
    // Auto-trigger print dialog after a short delay
    setTimeout(() => win.print(), 600);
  };

  const handleNuevoPago = () => {
    setColegiado(null); setDeuda(null); setResultado(null);
    setQuery(''); setResultados(null); setErrBusqueda(''); setErrForm('');
    sessionStorage.removeItem('admin_pago_colegiado');
    sessionStorage.removeItem('admin_pago_periodos');
    setTimeout(() => searchRef.current?.focus(), 100);
  };

  const recargarDeuda = () => {
    setCargandoDeuda(true);
    setResultado(null);
    fetch(`/api/admin/colegiados/${colegiado.id}/deuda/`)
      .then(r => r.json())
      .then(d => {
        setDeuda(d);
        const pp = d.periodos || d.periodos_pendientes || [];
        setPeriodosSeleccionados(new Set(pp.filter(p => (p.estado ?? 'PENDIENTE') === 'PENDIENTE').map(p => p.periodo)));
      })
      .finally(() => setCargandoDeuda(false));
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RESULTADO EXITOSO
  // ═══════════════════════════════════════════════════════════════════════════
  if (resultado?.ok) {
    return (
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--cip-blue)', marginBottom: '0.25rem' }}>
            ✅ Pago Registrado
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Los periodos han sido marcados como pagados correctamente.</p>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #10B981', padding: '2rem' }}>
          {/* Encabezado éxito */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#D1FAE5', padding: '1rem', borderRadius: '50%', color: '#059669', flexShrink: 0 }}>
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#065F46' }}>Pago registrado con éxito</h2>
              <p style={{ color: '#047857', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                {resultado.total_registrado} periodo{resultado.total_registrado !== 1 ? 's' : ''} abonado{resultado.total_registrado !== 1 ? 's' : ''} para{' '}
                <strong>{resultado.colegiado_nombres || resultado.colegiado}</strong>
              </p>
            </div>
          </div>

          {/* Resumen comprobante */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Boleta N°</span>
              <strong style={{ fontFamily: 'monospace', color: 'var(--cip-blue)' }}>{resultado.boleta_numero || '—'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>DNI</span>
              <strong>{resultado.colegiado_dni || '—'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Periodos</span>
              <strong style={{ textAlign: 'right', maxWidth: '60%' }}>{resultado.periodos_label || resultado.periodos_registrados?.join(', ')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Método</span>
              <strong>{resultado.metodo || '—'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Importe total</span>
              <strong style={{ fontSize: '1.1rem', color: '#059669' }}>S/ {parseFloat(resultado.monto_total || 0).toFixed(2)}</strong>
            </div>
          </div>

          {resultado.ya_existian?.length > 0 && (
            <div style={{ marginBottom: '1rem', background: '#FEF3C7', borderRadius: '8px', padding: '0.75rem', fontSize: '0.8rem', color: '#92400E' }}>
              <strong>⚠️ Ya tenían pago registrado:</strong>{' '}
              {resultado.ya_existian.map(p => fmtPeriodo(p)).join(', ')}
            </div>
          )}

          {/* Estado habilitación */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: resultado.habilitado_nuevo ? '#D1FAE5' : '#FEF3C7', borderRadius: '8px', marginBottom: '1.5rem' }}>
            {resultado.habilitado_nuevo ? <BadgeCheck size={20} color="#059669" /> : <AlertCircle size={20} color="#D97706" />}
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: resultado.habilitado_nuevo ? '#065F46' : '#92400E' }}>
              {resultado.habilitado_nuevo ? 'El colegiado ahora está HABILITADO' : 'El colegiado aún tiene meses pendientes (sigue inhabilitado)'}
            </span>
          </div>

          {/* Botones comprobante */}
          <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
            <button
              onClick={generarComprobante}
              className="btn btn-primary"
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                width: '100%',
                padding: '0.9rem',
                border: 'none', borderRadius: '10px',
                fontWeight: '800', fontSize: '1rem', cursor: 'pointer'
              }}
            >
              📥 Imprimir en PDF
            </button>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={handleNuevoPago} className="btn btn-primary" style={{ flex: 1 }}>
                Registrar otro pago
              </button>
              <button onClick={recargarDeuda} className="btn btn-outline" style={{ flex: 1, borderColor: 'var(--cip-blue)', color: 'var(--cip-blue)' }}>
                Ver deuda restante
              </button>
            </div>
          </div>
        </div>

        {/* NUEVO: MODAL DE COMPROBANTE */}
        {comprobanteParaMostrar && (
          <ComprobanteModal
            comprobante={comprobanteParaMostrar}
            colegiado={colegiado}
            onClose={() => setComprobanteParaMostrar(null)}
            onDescargar={(comp) => {
              console.log('Comprobante descargado:', comp.numero_comprobante);
            }}
          />
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADO INICIAL: sin colegiado seleccionado
  // ═══════════════════════════════════════════════════════════════════════════
  if (!colegiado) {
    return (
      <div>
        {/* Cabecera */}
        <div style={{ marginBottom: '2rem' }}>
          {cameFromDeudores && (
            <button onClick={() => navigate('/admin/deudores')} className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderColor: '#CBD5E1', color: 'var(--text-main)', fontSize: '0.85rem' }}>
              <ChevronRight style={{ transform: 'rotate(180deg)' }} size={16} /> Volver al Panel de Deudores
            </button>
          )}
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--cip-blue)', marginBottom: '0.25rem' }}>
            Registrar Pago Presencial
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Yape, Plin, efectivo o transferencia. Busque el colegiado para comenzar.
          </p>
        </div>

        {/* Panel de búsqueda centrado y amplio */}
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div className="card" style={{ padding: '2rem' }}>
            {/* Icono + título */}
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div style={{ display: 'inline-flex', background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)', borderRadius: '50%', padding: '1.25rem', marginBottom: '1rem' }}>
                <Wallet size={32} color="white" />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--cip-blue)', marginBottom: '0.3rem' }}>
                Buscar Colegiado
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Ingrese DNI, nombre completo o número CIP
              </p>
            </div>

            {/* Input */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: errBusqueda ? '0.5rem' : '0' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  ref={searchRef}
                  type="text"
                  className="form-input"
                  placeholder="Ej. 71234567 · Juan Pérez · 12345"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setErrBusqueda(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleBuscar()}
                  style={{ paddingLeft: '2.5rem', fontSize: '1rem', height: '48px' }}
                  autoFocus
                />
              </div>
              <button
                onClick={handleBuscar}
                disabled={buscando}
                className="btn btn-primary"
                style={{ height: '48px', padding: '0 1.5rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
              >
                {buscando ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
                Buscar
              </button>
            </div>

            {errBusqueda && (
              <p style={{ color: '#DC2626', fontSize: '0.82rem', marginTop: '0.5rem' }}>{errBusqueda}</p>
            )}

            {/* Resultados */}
            {resultados !== null && (
              <div style={{ marginTop: '1.25rem' }}>
                {resultados.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', background: '#F8FAFC', borderRadius: '10px', border: '1px dashed var(--border-color)' }}>
                    <User size={36} style={{ margin: '0 auto 0.6rem auto', display: 'block', opacity: 0.25 }} />
                    <p style={{ fontWeight: '600', marginBottom: '0.2rem' }}>Sin resultados</p>
                    <p style={{ fontSize: '0.82rem' }}>No se encontraron colegiados con ese criterio.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.1rem' }}>
                      {resultados.length} resultado{resultados.length !== 1 ? 's' : ''} encontrado{resultados.length !== 1 ? 's' : ''}
                    </p>
                    {resultados.map(col => (
                      <button
                        key={col.id}
                        onClick={() => handleSeleccionarColegiado(col)}
                        style={{
                          background: 'white', border: '1.5px solid var(--border-color)', borderRadius: '10px',
                          padding: '0.9rem 1.1rem', textAlign: 'left', cursor: 'pointer',
                          transition: 'all 0.15s', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cip-blue)'; e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.transform = 'translateX(2px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'white'; e.currentTarget.style.transform = 'none'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div style={{ background: 'var(--cip-blue)', color: 'white', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.85rem', fontWeight: '700' }}>
                            {col.nombres.charAt(0)}
                          </div>
                          <div>
                            <p style={{ fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.2rem' }}>{col.nombres}</p>
                            <p style={{ fontSize: '0.77rem', color: 'var(--text-muted)' }}>DNI {col.dni} · CIP {col.nro_colegiado} · {col.carrera}</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem', flexShrink: 0 }}>
                          <BadgeHabilitado habilitado={col.habilitado} />
                          <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADO PRINCIPAL: colegiado seleccionado — layout full screen
  // ═══════════════════════════════════════════════════════════════════════════

  const todosLosPeriodos = getPeriodos();
  const hayPeriodosNoPagados = todosLosPeriodos.some(p => p.estado !== 'PAGADO');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>

      {cameFromDeudores && (
        <button onClick={() => navigate('/admin/deudores')} className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderColor: '#CBD5E1', color: 'var(--text-main)', fontSize: '0.85rem', alignSelf: 'flex-start' }}>
          <ChevronRight style={{ transform: 'rotate(180deg)' }} size={16} /> Volver al Panel de Deudores
        </button>
      )}

      {/* ── BANNER SUPERIOR: info del colegiado ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)',
        borderRadius: '12px', padding: '1.25rem 1.75rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '1.5rem', gap: '1rem',
      }}>
        {/* Info colegiado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', borderRadius: '50%', width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.25rem', fontWeight: '800', color: 'white' }}>
            {colegiado.nombres.charAt(0)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.2rem' }}>
              <p style={{ fontWeight: '800', color: 'white', fontSize: '1.1rem', margin: 0 }}>{colegiado.nombres}</p>
              <BadgeHabilitado habilitado={colegiado.habilitado} />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem', margin: 0 }}>
              DNI {colegiado.dni} &nbsp;·&nbsp; CIP {colegiado.nro_colegiado} &nbsp;·&nbsp; {colegiado.carrera}
              {colegiado.colegiado_desde && <span> &nbsp;·&nbsp; Colegiado desde {fmtFecha(colegiado.colegiado_desde)}</span>}
            </p>
          </div>
        </div>

        {/* Acciones + resumen deuda */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexShrink: 0 }}>
          {deuda && deuda.total_deuda > 0 && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#F59E0B', fontSize: '1.5rem', fontWeight: '800', margin: 0, lineHeight: 1 }}>{deuda.total_deuda}</p>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem', margin: 0, marginTop: '0.15rem' }}>mes{deuda.total_deuda !== 1 ? 'es' : ''} de deuda</p>
            </div>
          )}
          {deuda && deuda.total_deuda > 0 && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#F87171', fontSize: '1.5rem', fontWeight: '800', margin: 0, lineHeight: 1 }}>S/ {(deuda.total_deuda * montoMensual).toFixed(0)}</p>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem', margin: 0, marginTop: '0.15rem' }}>total adeudado</p>
            </div>
          )}
          <button
            onClick={() => {
              setColegiado(null); setDeuda(null); setResultado(null);
              sessionStorage.removeItem('admin_pago_colegiado');
              sessionStorage.removeItem('admin_pago_periodos');
            }}
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600', transition: 'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
          >
            ← Cambiar
          </button>
        </div>
      </div>

      {/* ── CUERPO PRINCIPAL: 2 columnas ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem', alignItems: 'start' }}>

        {/* ═══ COLUMNA IZQUIERDA: Calendario de periodos ═══════════════════ */}
        <div className="card" style={{ padding: '1.5rem' }}>
          {/* Cabecera del calendario */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--cip-blue)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Calendar size={18} /> Periodos del Año
              </h3>
              {periodosSeleccionados.size > 0 && (
                <p style={{ fontSize: '0.78rem', color: '#059669', fontWeight: '600', marginTop: '0.25rem', margin: '0.25rem 0 0 0' }}>
                  {periodosSeleccionados.size} periodo{periodosSeleccionados.size !== 1 ? 's' : ''} seleccionado{periodosSeleccionados.size !== 1 ? 's' : ''} · S/ {(periodosSeleccionados.size * montoMensual).toFixed(2)}
                </p>
              )}
            </div>

            {/* Botones de selección rápida */}
            {deuda && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={seleccionarSoloDeuda}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1.5px solid #FCA5A5', background: '#FEF2F2', color: '#B91C1C', cursor: 'pointer', fontWeight: '600', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#FEF2F2'; }}
                >
                  Solo deudas
                </button>
                <button
                  onClick={seleccionarTodos}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1.5px solid #BFDBFE', background: '#EFF6FF', color: '#1D4ED8', cursor: 'pointer', fontWeight: '600', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#DBEAFE'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#EFF6FF'; }}
                >
                  Todos
                </button>
                <button
                  onClick={deseleccionarTodos}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', cursor: 'pointer', fontWeight: '600', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; }}
                >
                  Ninguno
                </button>
              </div>
            )}
          </div>

          {/* Grilla de meses */}
          {cargandoDeuda ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <Loader2 size={32} className="spin" style={{ color: 'var(--text-muted)', margin: '0 auto', display: 'block' }} />
              <p style={{ color: 'var(--text-muted)', marginTop: '0.75rem', fontSize: '0.9rem' }}>Cargando periodos…</p>
            </div>
          ) : todosLosPeriodos.every(p => p.estado === 'PAGADO') ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', background: '#F0FDF4', borderRadius: '10px', color: '#15803D' }}>
              <CheckCircle2 size={36} style={{ margin: '0 auto 0.75rem auto', display: 'block' }} />
              <p style={{ fontWeight: '800', fontSize: '1.1rem', marginBottom: '0.25rem' }}>¡Sin deuda pendiente!</p>
              <p style={{ fontSize: '0.85rem', color: '#166534' }}>Todos los meses están al día.</p>
            </div>
          ) : (
            /* Agrupado por año — solo meses no pagados */
            (() => {
              // Excluir meses ya pagados y agrupar por año
              const porAño = {};
              todosLosPeriodos
                .filter(p => p.estado !== 'PAGADO')
                .forEach(p => {
                  const año = p.periodo.split('-')[0];
                  if (!porAño[año]) porAño[año] = [];
                  porAño[año].push(p);
                });
              const años = Object.keys(porAño).sort();

              const añosMostrados = años.filter(a => parseInt(a) <= maxVisibleYear);
              const añosOcultos = años.filter(a => parseInt(a) > maxVisibleYear);

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {añosMostrados.map(año => {
                    const mesesDelAño = porAño[año];

                    return (
                      <div key={año}>
                        {/* Separador de año */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
                          <span style={{
                            background: 'var(--cip-blue)', color: 'white',
                            fontSize: '0.75rem', fontWeight: '800', padding: '0.2rem 0.65rem',
                            borderRadius: '6px', letterSpacing: '0.5px',
                          }}>{año}</span>
                          <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
                        </div>

                        {/* Meses del año: 6 por fila */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.4rem' }}>
                          {mesesDelAño.map(p => {
                            const estado = p.estado || 'PENDIENTE';
                            const pagado = estado === 'PAGADO';
                            const esPendiente = estado === 'PENDIENTE';
                            const esAdelanto = estado === 'ADELANTO';
                            const sel = periodosSeleccionados.has(p.periodo);
                            const bloqueado = esAdelanto && hayDeudaSinPagar();

                            let paleta;
                            if (pagado) {
                              paleta = { bg: '#F0FDF4', border: '#86EFAC', txt: '#15803D', accent: '#16A34A', tagBg: '#DCFCE7', tagTxt: '#15803D', tag: 'PAGADO' };
                            } else if (esPendiente) {
                              paleta = sel
                                ? { bg: '#FFF1F2', border: '#F87171', txt: '#991B1B', accent: '#DC2626', tagBg: '#FEE2E2', tagTxt: '#991B1B', tag: 'DEUDA' }
                                : { bg: '#FEF2F2', border: '#FCA5A5', txt: '#B91C1C', accent: '#DC2626', tagBg: '#FEE2E2', tagTxt: '#991B1B', tag: 'DEUDA' };
                            } else {
                              paleta = sel
                                ? { bg: '#EFF6FF', border: '#3B82F6', txt: '#1E40AF', accent: '#2563EB', tagBg: '#DBEAFE', tagTxt: '#1D4ED8', tag: 'ADELANTO' }
                                : { bg: '#F8FAFF', border: '#BFDBFE', txt: '#3B82F6', accent: '#2563EB', tagBg: '#DBEAFE', tagTxt: '#1D4ED8', tag: 'ADELANTO' };
                            }

                            return (
                              <div
                                key={p.periodo}
                                title={
                                  pagado ? 'Ya pagado' :
                                    esPendiente ? 'Deuda — se paga en bloque con todos los meses adeudados' :
                                      bloqueado ? 'Primero paga las deudas atrasadas' :
                                        'Pago anticipado'
                                }
                                onClick={() => { if (!pagado && !bloqueado) togglePeriodo(p.periodo, estado); }}
                                style={{
                                  background: paleta.bg,
                                  border: `2px solid ${sel && !pagado ? paleta.accent : paleta.border}`,
                                  borderRadius: '7px',
                                  padding: '0.45rem 0.3rem',
                                  cursor: pagado ? 'default' : bloqueado ? 'not-allowed' : 'pointer',
                                  transition: 'all 0.15s',
                                  opacity: pagado ? 0.7 : bloqueado ? 0.4 : 1,
                                  userSelect: 'none',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '0.22rem',
                                  boxShadow: sel && !pagado ? `0 0 0 2px ${paleta.accent}40` : 'none',
                                  transform: sel && !pagado ? 'scale(1.03)' : 'scale(1)',
                                }}
                              >
                                <p style={{ fontSize: '0.78rem', fontWeight: '800', color: paleta.txt, margin: 0, letterSpacing: '0.3px' }}>
                                  {fmtPeriodoCorto(p.periodo)}
                                </p>
                                {pagado ? (
                                  <CheckCircle2 size={12} color={paleta.accent} />
                                ) : (
                                  <input
                                    type="checkbox"
                                    checked={sel}
                                    readOnly
                                    style={{ accentColor: paleta.accent, width: 12, height: 12, pointerEvents: 'none' }}
                                  />
                                )}
                                <span style={{
                                  fontSize: '0.55rem', fontWeight: '800', padding: '0.15rem 0.3rem',
                                  borderRadius: '999px', background: paleta.tagBg, color: paleta.tagTxt,
                                  textTransform: 'uppercase', letterSpacing: '0.2px', whiteSpace: 'nowrap',
                                }}>
                                  {paleta.tag}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {(añosOcultos.length > 0 || maxVisibleYear > hoy.getFullYear()) && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem', gap: '1rem' }}>
                      {maxVisibleYear > hoy.getFullYear() && (
                        <button
                          onClick={() => setMaxVisibleYear(hoy.getFullYear())}
                          style={{
                            background: '#FFF1F2',
                            border: '1.5px dashed #FDA4AF',
                            color: '#BE123C',
                            padding: '0.5rem 1.5rem',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#FFE4E6'; e.currentTarget.style.borderColor = '#FB7185'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#FFF1F2'; e.currentTarget.style.borderColor = '#FDA4AF'; }}
                        >
                          - Mostrar menos
                        </button>
                      )}
                      {añosOcultos.length > 0 && (
                        <button
                          onClick={() => setMaxVisibleYear(prev => prev + 1)}
                          style={{
                            background: '#F8FAFC',
                            border: '1.5px dashed #CBD5E1',
                            color: '#475569',
                            padding: '0.5rem 1.5rem',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.borderColor = '#94A3B8'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
                        >
                          + Mostrar año {Math.min(...añosOcultos.map(a => parseInt(a)))}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </div>

        {/* ═══ COLUMNA DERECHA: Formulario de pago (sticky) ════════════════ */}
        <div style={{ position: 'sticky', top: '1rem' }}>
          {!hayPeriodosNoPagados ? (
            /* Todo pagado */
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem', background: '#F0FDF4', border: '2px solid #86EFAC' }}>
              <CheckCircle2 size={48} style={{ margin: '0 auto 1rem auto', display: 'block', color: '#16A34A' }} />
              <p style={{ fontWeight: '800', color: '#065F46', fontSize: '1.1rem', marginBottom: '0.4rem' }}>¡Al día!</p>
              <p style={{ fontSize: '0.85rem', color: '#166534' }}>Este colegiado no tiene pendientes.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--cip-blue)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.45rem', borderBottom: '2px solid var(--cip-red)', paddingBottom: '0.5rem' }}>
                <CreditCard size={18} /> Detalle del Pago
              </h3>

              {/* Resumen de selección */}
              {periodosSeleccionados.size > 0 ? (
                <div style={{ background: 'linear-gradient(135deg, #059669, #10B981)', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.25rem', color: 'white' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.82rem', opacity: 0.9 }}>{periodosSeleccionados.size} mes{periodosSeleccionados.size !== 1 ? 'es' : ''} × S/ {montoMensual.toFixed(2)}</span>
                    <strong style={{ fontSize: '1.4rem', fontWeight: '800' }}>S/ {(periodosSeleccionados.size * montoMensual).toFixed(2)}</strong>
                  </div>
                  <p style={{ fontSize: '0.72rem', opacity: 0.75, margin: 0 }}>Total calculado automáticamente</p>
                </div>
              ) : (
                <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem', textAlign: 'center', border: '1.5px dashed #CBD5E1' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Seleccione meses del calendario</p>
                </div>
              )}

              {/* Tipo de Pago (Normal o Mixto) */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--cip-blue)' }}>Modo de Pago</label>
                <div style={{ display: 'flex', gap: '0.5rem', background: '#F8FAFC', padding: '0.2rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <button onClick={() => setEsMixto(false)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', fontWeight: '600', borderRadius: '6px', border: 'none', background: !esMixto ? '#10B981' : 'transparent', color: !esMixto ? 'white' : '#64748B', cursor: 'pointer' }}>Único</button>
                  <button onClick={() => setEsMixto(true)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', fontWeight: '600', borderRadius: '6px', border: 'none', background: esMixto ? '#3B82F6' : 'transparent', color: esMixto ? 'white' : '#64748B', cursor: 'pointer' }}>Mixto</button>
                </div>
              </div>

              {/* Método de pago */}
              {!esMixto ? (
                <div className="form-group" style={{ marginBottom: '1.1rem' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Método de Pago</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                    {METODOS.map(m => (
                      <button
                        key={m.valor}
                        type="button"
                        onClick={() => { setMetodo(m.valor); setErrForm(''); }}
                        style={{
                          padding: '0.55rem 0.3rem', borderRadius: '8px', cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.22rem',
                          border: `2px solid ${metodo === m.valor ? 'var(--cip-blue)' : 'var(--border-color)'}`,
                          background: metodo === m.valor ? '#EFF6FF' : 'white',
                          color: metodo === m.valor ? 'var(--cip-blue)' : 'var(--text-main)',
                          fontWeight: metodo === m.valor ? '700' : '400',
                          fontSize: '0.72rem', transition: 'all 0.15s',
                        }}
                      >
                        {m.icono}
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ background: '#F8FAFF', padding: '1rem', borderRadius: '8px', border: '1px solid #BFDBFE', marginBottom: '1.1rem' }}>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ fontSize: '0.75rem', color: '#1E40AF', fontWeight: '600', marginBottom: '0.25rem', display: 'block' }}>Parte 1</label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <select value={metodo1} onChange={e => { setMetodo1(e.target.value); setQrPagadoMixto(false); }} style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #93C5FD', fontSize: '0.8rem' }}>
                        <option value="">Seleccione...</option>
                        {METODOS.map(m => <option key={m.valor} value={m.valor}>{m.label}</option>)}
                      </select>
                      <input type="number" step="0.01" min="0" placeholder="Monto S/" value={monto1} onChange={e => { setMonto1(e.target.value); setQrPagadoMixto(false); }} style={{ width: '80px', padding: '0.5rem', borderRadius: '6px', border: '1px solid #93C5FD', fontSize: '0.8rem' }} />
                      {metodo1 === 'YAPE_PLIN' && monto1 && parseFloat(monto1) > 0 && !qrPagadoMixto && (
                        <button type="button" onClick={() => generarQrMixto(monto1)} disabled={cargandoQr} style={{ padding: '0.4rem 0.6rem', background: '#3B82F6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>QR</button>
                      )}
                      {metodo1 === 'YAPE_PLIN' && qrPagadoMixto && (
                        <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle2 size={14} /> Pagado</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#1E40AF', fontWeight: '600', marginBottom: '0.25rem', display: 'block' }}>Parte 2</label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <select value={metodo2} onChange={e => { setMetodo2(e.target.value); setQrPagadoMixto(false); }} style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #93C5FD', fontSize: '0.8rem' }}>
                        <option value="">Seleccione...</option>
                        {METODOS.map(m => <option key={m.valor} value={m.valor}>{m.label}</option>)}
                      </select>
                      <input type="number" step="0.01" min="0" placeholder="Monto S/" value={monto2} onChange={e => { setMonto2(e.target.value); setQrPagadoMixto(false); }} style={{ width: '80px', padding: '0.5rem', borderRadius: '6px', border: '1px solid #93C5FD', fontSize: '0.8rem' }} />
                      {metodo2 === 'YAPE_PLIN' && monto2 && parseFloat(monto2) > 0 && !qrPagadoMixto && (
                        <button type="button" onClick={() => generarQrMixto(monto2)} disabled={cargandoQr} style={{ padding: '0.4rem 0.6rem', background: '#3B82F6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>QR</button>
                      )}
                      {metodo2 === 'YAPE_PLIN' && qrPagadoMixto && (
                        <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle2 size={14} /> Pagado</span>
                      )}
                    </div>
                  </div>
                  {qrError && (
                    <div style={{ marginTop: '0.5rem', color: '#DC2626', fontSize: '0.75rem', fontWeight: '600' }}>{qrError}</div>
                  )}
                  {monto1 && monto2 && monto && (
                    <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', textAlign: 'right', fontWeight: '600', color: Math.abs(parseFloat(monto1) + parseFloat(monto2) - parseFloat(monto)) < 0.01 ? '#059669' : '#DC2626' }}>
                      Suma: S/ {(parseFloat(monto1) + parseFloat(monto2)).toFixed(2)} / S/ {parseFloat(monto).toFixed(2)}
                    </div>
                  )}
                </div>
              )}

              {/* Monto editable (solo si NO es tarjeta, que lo calcula MP) */}
              {metodo !== 'TARJETA' && (
                <div className="form-group" style={{ marginBottom: '1.1rem' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Monto Total (S/.)</span>
                    {periodosSeleccionados.size > 0 && (
                      <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: '600', background: '#D1FAE5', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Auto</span>
                    )}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.9rem' }}>S/</span>
                    <input
                      type="number" step="0.01" min="0"
                      className="form-input"
                      value={monto}
                      onChange={e => setMonto(e.target.value)}
                      style={{ paddingLeft: '2.2rem', borderColor: periodosSeleccionados.size > 0 ? '#86EFAC' : undefined }}
                      placeholder="0.00"
                    />
                  </div>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Ajustable para Pruebas</p>
                </div>
              )}

              {/* Resumen rápido */}
              {periodosSeleccionados.size > 0 && monto && (!esMixto ? metodo : (metodo1 && metodo2)) && (
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', color: 'var(--text-muted)' }}>
                    <span>Periodos:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{periodosSeleccionados.size}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', color: 'var(--text-muted)' }}>
                    <span>Total:</span>
                    <strong style={{ color: '#059669', fontSize: '0.9rem' }}>S/ {parseFloat(monto).toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                    <span>Vía:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{!esMixto ? METODOS.find(m => m.valor === metodo)?.label : 'MIXTO'}</strong>
                  </div>
                </div>
              )}

              {/* Error */}
              {errForm && (
                <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.65rem 0.85rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.82rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  {errForm}
                </div>
              )}

              <button
                onClick={() => handleRegistrar(false)}
                disabled={enviando || periodosSeleccionados.size === 0}
                className="btn btn-block"
                style={{
                  padding: '0.9rem', fontSize: '0.95rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  background: (enviando || periodosSeleccionados.size === 0) ? '#94A3B8' : '#10B981',
                  border: 'none', borderRadius: '10px', color: 'white',
                  fontWeight: '700', cursor: (enviando || periodosSeleccionados.size === 0) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!enviando && periodosSeleccionados.size > 0) e.currentTarget.style.background = '#059669'; }}
                onMouseLeave={e => { if (!enviando && periodosSeleccionados.size > 0) e.currentTarget.style.background = '#10B981'; }}
              >
                {enviando
                  ? <><Loader2 size={18} className="spin" /> Registrando…</>
                  : <><CheckCircle2 size={18} /> Confirmar y Registrar</>
                }
              </button>
            </div>
          )}
        </div>

      </div>{/* fin grid */}

      {/* MODAL FLOW QR (Solo en la vista de cobro) */}
      {flowInitPoint && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: '1rem', borderRadius: '12px', width: '90%', maxWidth: '420px', height: '80vh', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <button
              onClick={() => { setFlowInitPoint(null); setFlowToken(null); setFlowModoMixto(false); }}
              style={{ position: 'absolute', top: '-15px', right: '-15px', background: '#EF4444', color: '#fff', border: '2px solid #fff', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
            >✕</button>
            <h3 style={{ textAlign: 'center', marginBottom: '0.2rem', fontSize: '1.2rem', color: '#111', fontWeight: '800' }}>
              {flowModoMixto ? 'Pagar Mixto con Yape/Plin' : 'Pagar con Yape/Plin'}
            </h3>
            <p style={{ textAlign: 'center', color: '#666', fontSize: '0.85rem', marginBottom: '0.8rem' }}>Pídele al colegiado que escanee este código desde la pantalla.</p>
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
              <iframe
                src={flowInitPoint}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Flow Pago"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
