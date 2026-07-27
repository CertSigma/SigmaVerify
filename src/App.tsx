import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

const Login = lazy(() => import('./pages/auth/Login'))
const Register = lazy(() => import('./pages/auth/Register'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const HRDashboard = lazy(() => import('./pages/hr/Dashboard'))
const AddEmployee = lazy(() => import('./pages/hr/AddEmployee'))
const EmployeeDetail = lazy(() => import('./pages/hr/EmployeeDetail'))
const PublicForm = lazy(() => import('./pages/employee/PublicForm'))
const ReviewQueue = lazy(() => import('./pages/bgv/ReviewQueue'))
const EmployeeReview = lazy(() => import('./pages/bgv/EmployeeReview'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const UserManagement = lazy(() => import('./pages/admin/UserManagement'))
const Organizations = lazy(() => import('./pages/admin/Organizations'))
const ReportsPage = lazy(() => import('./pages/admin/ReportsPage'))
const AllEmployees = lazy(() => import('./pages/admin/AllEmployees'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
})

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-[#063840]" />
    </div>
  )
}

function PendingApproval() {
  const { signOut } = useAuth()
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#063840] to-[#0a5060] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-14 h-14 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <img src="/relynt_logo.svg" alt="Relynt" className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold mb-2">Awaiting Approval</h1>
        <p className="text-sm text-muted-foreground">
          Your account is pending admin approval. You'll receive access once your account is activated.
          This usually takes 1 business day.
        </p>
        <button onClick={signOut} className="mt-6 text-sm text-[#063840] hover:underline font-medium">
          Sign out
        </button>
      </div>
    </div>
  )
}

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader />
  if (!session) return <Navigate to="/auth/login" state={{ from: location }} replace />
  if (!profile) return <PageLoader />

  if (profile.subscription_status === 'pending') return <PendingApproval />
  if (profile.subscription_status === 'suspended') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-red-600">Account Suspended</h1>
          <p className="text-sm text-muted-foreground mt-2">Contact support for assistance.</p>
        </div>
      </div>
    )
  }

  if (roles && !roles.includes(profile.role)) {
    return <Navigate to={getDefaultRoute(profile.role)} replace />
  }

  return <>{children}</>
}

function getDefaultRoute(role: string) {
  switch (role) {
    case 'hr': return '/hr/dashboard'
    case 'bgv_team': return '/bgv/queue'
    case 'admin': return '/admin'
    default: return '/auth/login'
  }
}

function RootRedirect() {
  const { session, profile, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!session || !profile) return <Navigate to="/auth/login" replace />
  return <Navigate to={getDefaultRoute(profile.role)} replace />
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/pending" element={<PendingApproval />} />

        {/* Employee public form — no auth required */}
        <Route path="/verify/:token" element={<PublicForm />} />

        {/* HR routes */}
        <Route path="/hr/dashboard" element={<ProtectedRoute roles={['hr']}><HRDashboard /></ProtectedRoute>} />
        <Route path="/hr/employees" element={<ProtectedRoute roles={['hr']}><HRDashboard /></ProtectedRoute>} />
        <Route path="/hr/employees/add" element={<ProtectedRoute roles={['hr']}><AddEmployee /></ProtectedRoute>} />
        <Route path="/hr/employees/:id" element={<ProtectedRoute roles={['hr']}><EmployeeDetail /></ProtectedRoute>} />

        {/* BGV team + Admin routes */}
        <Route path="/bgv/queue" element={<ProtectedRoute roles={['bgv_team', 'admin']}><ReviewQueue /></ProtectedRoute>} />
        <Route path="/bgv/review/:id" element={<ProtectedRoute roles={['bgv_team', 'admin']}><EmployeeReview /></ProtectedRoute>} />

        {/* Admin routes */}
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/orgs" element={<ProtectedRoute roles={['admin']}><Organizations /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><UserManagement /></ProtectedRoute>} />
        <Route path="/admin/reports" element={<ProtectedRoute roles={['admin']}><ReportsPage /></ProtectedRoute>} />
        <Route path="/admin/employees" element={<ProtectedRoute roles={['admin']}><AllEmployees /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
