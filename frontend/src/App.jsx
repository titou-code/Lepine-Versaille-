import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './components/ui/Toast'
import Sidebar from './components/layout/Sidebar'
import Spinner from './components/ui/Spinner'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Saisie from './pages/Saisie'
import Inventaire from './pages/Inventaire'
import Recherche from './pages/Recherche'
import ADetruire from './pages/ADetruire'
import Referentiel from './pages/Referentiel'
import Admin from './pages/Admin'
import ACompleter from './pages/ACompleter'
import InvitationAccept from './pages/InvitationAccept'
import ChangePassword from './pages/ChangePassword'
import ResetPassword from './pages/ResetPassword'

function ProtectedRoute({ children, roles }) {
  const { user, role, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  )

  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(role)) return <Navigate to={getDefaultRoute(role)} replace />

  return children
}

function getDefaultRoute(role) {
  switch (role) {
    case 'super_admin':
    case 'admin': return '/dashboard'
    case 'archiviste': return '/saisie'
    case 'consultation': return '/inventaire'
    default: return '/login'
  }
}

function AppRoutes() {
  const { user, role, loading, mustChangePassword } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <Spinner size="lg" />
    </div>
  )

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/invitation" element={<InvitationAccept />} />
        <Route path="/reinitialisation" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  if (mustChangePassword) {
    return <ChangePassword />
  }

  return (
    <>
      <Sidebar />
      <Routes>
        <Route path="/dashboard" element={
          <ProtectedRoute roles={['super_admin', 'admin']}><Dashboard /></ProtectedRoute>
        } />
        <Route path="/saisie" element={
          <ProtectedRoute roles={['super_admin', 'admin', 'archiviste']}><Saisie /></ProtectedRoute>
        } />
        <Route path="/inventaire" element={
          <ProtectedRoute roles={['super_admin', 'admin', 'archiviste', 'consultation']}><Inventaire /></ProtectedRoute>
        } />
        <Route path="/recherche" element={
          <ProtectedRoute roles={['super_admin', 'admin', 'archiviste', 'consultation']}><Recherche /></ProtectedRoute>
        } />
        <Route path="/a-completer" element={
          <ProtectedRoute roles={['super_admin', 'admin', 'archiviste']}><ACompleter /></ProtectedRoute>
        } />
        <Route path="/a-detruire" element={
          <ProtectedRoute roles={['super_admin', 'admin', 'archiviste']}><ADetruire /></ProtectedRoute>
        } />
        <Route path="/referentiel" element={
          <ProtectedRoute roles={['super_admin', 'admin', 'archiviste', 'consultation']}><Referentiel /></ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute roles={['super_admin', 'admin']}><Admin /></ProtectedRoute>
        } />
        <Route path="/login" element={<Navigate to={getDefaultRoute(role)} replace />} />
        <Route path="*" element={<Navigate to={getDefaultRoute(role)} replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </AuthProvider>
  )
}
