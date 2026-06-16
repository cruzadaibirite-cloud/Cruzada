import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import CadastroVoluntario from './pages/CadastroVoluntario'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/cruzada" replace />} />
        <Route path="/cruzada" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro-voluntario" element={<CadastroVoluntario />} />
        <Route path="/sistema" element={<ProtectedRoute><Navigate to="/sistema/voluntario" replace /></ProtectedRoute>} />
        <Route path="/sistema/voluntario" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/sistema/usuarios" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/sistema/usuarios/:usuarioId" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/sistema/locais" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/sistema/agenda" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/sistema/evangelismo" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/sistema/evangelismo/nova-abordagem" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/sistema/pessoas" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/sistema/pessoas/:pessoaId" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/sistema/mapa" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/sistema/treinamento" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/sistema/grupos" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/sistema/grupos/:grupoId" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/sistema/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
