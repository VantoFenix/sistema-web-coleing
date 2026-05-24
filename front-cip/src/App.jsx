import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PublicHome from './pages/PublicHome';
import Postular from './pages/Postular';
import Login from './pages/Login';
import PortalLayout from './layouts/PortalLayout';
import PerfilYo from './pages/portal/PerfilYo';
import MiCarnet from './pages/portal/MiCarnet';
import MisPagos from './pages/portal/MisPagos';

import AdminLayout from './layouts/AdminLayout';
import AdminLogin from './pages/admin/AdminLogin';
import AdminHome from './pages/admin/AdminHome';
import AdminPostulaciones from './pages/admin/AdminPostulaciones';
import AdminPresencial from './pages/admin/AdminPresencial';
import AdminPagoPresencial from './pages/admin/AdminPagoPresencial';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/" element={<PublicHome />} />
        <Route path="/postular" element={<Postular />} />
        <Route path="/login" element={<Login />} />
        
        {/* Rutas Protegidas (Portal del Colegiado) */}
        <Route path="/portal" element={<PortalLayout />}>
          <Route path="yo" element={<PerfilYo />} />
          <Route path="carnet" element={<MiCarnet />} />
          <Route path="pagos" element={<MisPagos />} />
        </Route>

        {/* Rutas del Portal Administrativo */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="home" element={<AdminHome />} />
          <Route path="postulaciones" element={<AdminPostulaciones />} />
          <Route path="pagos-presencial" element={<AdminPagoPresencial />} />
          <Route path="presencial" element={<AdminPresencial />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
