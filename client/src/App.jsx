import './App.css'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import NotFound from './components/NotFound'
import RazorpayPayment from './components/RazorpayPayment'
import { ThemeProvider } from './context/ThemeProvider'
import { AuthProvider } from './context/AuthProvider'
import { ThemeToggle } from './components/ThemeToggle'
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute'
import Login from './pages/Login'
import Signup from './pages/Signup'
import AuthCallback from './pages/AuthCallback'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import CreateUser from './pages/CreateUser'
import MasterData from './pages/MasterData'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-center" />
          <ThemeToggle />
          <Routes>
            <Route path="/" element={<Navigate to="/signup" replace />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/payment" element={<RazorpayPayment />} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/create-user" element={<ProtectedRoute><CreateUser /></ProtectedRoute>} />
            <Route path="/master-data" element={<ProtectedRoute><MasterData /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
