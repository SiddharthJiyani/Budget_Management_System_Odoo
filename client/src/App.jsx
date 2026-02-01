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
import PurchaseOrderList from './pages/PurchaseOrderList'
import PurchaseOrderForm from './pages/PurchaseOrderForm'
import PurchaseBill from './pages/PurchaseBill'
import PurchasePayment from './pages/PurchasePayment'
import VendorBillList from './pages/VendorBillList'
import VendorBillForm from './pages/VendorBillForm'
import PaymentModal from './pages/PaymentModal'
import SaleOrder from './pages/SaleOrder'
import SaleInvoice from './pages/SaleInvoice'
import SaleReceipt from './pages/SaleReceipt'
import CustomerInvoicePortal from './pages/CustomerInvoicePortal'
import MyInvoices from './pages/portal/MyInvoices'
import PortalDashboard from './pages/portal/PortalDashboard'

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
            {/* Purchase Flow */}
            <Route path="/purchase/orders" element={<ProtectedRoute><PurchaseOrderList /></ProtectedRoute>} />
            <Route path="/purchase/orders/new" element={<ProtectedRoute><PurchaseOrderForm /></ProtectedRoute>} />
            <Route path="/purchase/orders/:id" element={<ProtectedRoute><PurchaseOrderForm /></ProtectedRoute>} />
            <Route path="/purchase/bill" element={<ProtectedRoute><PurchaseBill /></ProtectedRoute>} />
            <Route path="/purchase/payment" element={<ProtectedRoute><PurchasePayment /></ProtectedRoute>} />
            {/* Vendor Bills */}
            <Route path="/vendor-bills" element={<ProtectedRoute><VendorBillList /></ProtectedRoute>} />
            <Route path="/vendor-bills/new" element={<ProtectedRoute><VendorBillForm /></ProtectedRoute>} />
            <Route path="/vendor-bills/:id" element={<ProtectedRoute><VendorBillForm /></ProtectedRoute>} />
            <Route path="/vendor-bills/:id/payment" element={<ProtectedRoute><PaymentModal /></ProtectedRoute>} />
            {/* Sale Flow */}
            <Route path="/sale/order" element={<ProtectedRoute><SaleOrder /></ProtectedRoute>} />
            <Route path="/sale/invoice" element={<ProtectedRoute><SaleInvoice /></ProtectedRoute>} />
            <Route path="/sale/receipt" element={<ProtectedRoute><SaleReceipt /></ProtectedRoute>} />
            {/* Portal - for customers and vendors */}
            <Route path="/portal" element={<ProtectedRoute><PortalDashboard /></ProtectedRoute>} />
            <Route path="/portal/invoices" element={<ProtectedRoute><MyInvoices /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App

