import './App.css'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import NotFound from './components/NotFound'
import RazorpayPayment from './components/RazorpayPayment'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeProvider'
import { AuthProvider, useAuth } from './context/AuthProvider'
import { ThemeToggle } from './components/ThemeToggle'
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute'
import Login from './pages/Login'
import Signup from './pages/Signup'
import AuthCallback from './pages/AuthCallback'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import CreateUser from './pages/CreateUser'
import { LogIn, User, Upload as UploadIcon } from 'lucide-react'


function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  return (
    <div className='w-full min-h-screen bg-background text-foreground p-8'>
      <div className='max-w-4xl mx-auto'>
        {/* Auth buttons */}
        <div className="flex justify-end gap-3 mb-8">
          {isAuthenticated ? (
            <Link to="/dashboard" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
              <User size={18} />
              {user?.firstName || 'Dashboard'}
            </Link>
          ) : (
            <>
              <Link to="/login" className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
                <LogIn size={18} />
                Login
              </Link>
              <Link to="/signup" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className='text-4xl font-bold mb-4'>Hello world!</h1>
          <p className='text-muted-foreground text-lg'>
            Welcome to your starter pack!
          </p>
        </div>

        {/* Buttons */}
        <div className='flex flex-wrap gap-4 mb-12'>
          <button
            className='bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity'
            onClick={() => toast.success('Success!')}
          >
            Test Toast
          </button>

          <button
            className='bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity'
            onClick={() => navigate("/not-found")}
          >
            Go to 404 page
          </button>

          <Link to="/payment">
            <button className='bg-success text-success-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity'>
              Test Payment
            </button>
          </Link>

          <Link to="/upload">
            <button className='bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:opacity-90 transition-all hover:scale-105 flex items-center gap-2 shadow-lg shadow-primary/30'>
              <UploadIcon size={18} />
              Upload Files
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-center" />
          <ThemeToggle />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/payment" element={<RazorpayPayment />} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/create-user" element={<ProtectedRoute><CreateUser /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
