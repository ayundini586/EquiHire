import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'

// Auth
import UserLogin from './pages/auth/UserLogin'
import UserRegister from './pages/auth/UserRegister'
import CompanyLogin from './pages/auth/CompanyLogin'
import CompanyRegister from './pages/auth/CompanyRegister'

// User
import Home from './pages/user/Home'
import Status from './pages/user/Status'
import CV from './pages/user/CV'
import Profile from './pages/user/Profile'
import UserJobDetail from './pages/user/JobDetail'

// Company
import Dashboard from './pages/company/Dashboard'
import Jobs from './pages/company/Jobs'
import JobDetail from './pages/company/JobDetail'
import CompanyProfile from './pages/company/CompanyProfile'

// Admin
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Default */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Auth */}
          <Route path="/login" element={<UserLogin />} />
          <Route path="/register" element={<UserRegister />} />
          <Route path="/company/login" element={<CompanyLogin />} />
          <Route path="/company/register" element={<CompanyRegister />} />

          {/* User */}
          <Route path="/home" element={<Home />} />
          <Route path="/status" element={<Status />} />
          <Route path="/cv" element={<CV />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/jobs/:id" element={<UserJobDetail />} />

          {/* Company */}
          <Route path="/company/dashboard" element={<Dashboard />} />
          <Route path="/company/jobs" element={<Jobs />} />
          <Route path="/company/jobs/:id" element={<JobDetail />} />
          <Route path="/company/profile" element={<CompanyProfile />} />

          {/* Admin */}
          <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}