'use client'

import { useState, useCallback } from 'react'
import { Shield, Eye, EyeOff, Loader2, Car, Wrench, Settings2, CircleDot } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

function getRememberedEmail(): { email: string; remember: boolean } {
  if (typeof window === 'undefined') return { email: '', remember: false }
  try {
    const saved = localStorage.getItem('bkad_remember_email')
    if (saved) return { email: saved, remember: true }
  } catch {
    // ignore
  }
  return { email: '', remember: false }
}

export function LoginPage() {
  const { login, isLoading } = useAuthStore()
  const [email, setEmail] = useState(() => getRememberedEmail().email)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(() => getRememberedEmail().remember)
  const [error, setError] = useState('')

  // Fetch app settings for logo and identity
  const { data: appSettings } = useQuery({
    queryKey: ['app-settings-login'],
    queryFn: async () => {
      const res = await fetch('/api/pengaturan')
      return res.json()
    },
    staleTime: 60000,
  })

  const appLogo = appSettings?.app_logo
  const appName = appSettings?.app_name
  const appInstansi = appSettings?.app_instansi

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Email harus diisi')
      return
    }
    if (!password.trim()) {
      setError('Password harus diisi')
      return
    }

    try {
      await login(email, password)
      if (rememberMe) {
        try {
          localStorage.setItem('bkad_remember_email', email)
        } catch {
          // ignore
        }
      } else {
        try {
          localStorage.removeItem('bkad_remember_email')
        } catch {
          // ignore
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal. Silakan coba lagi.')
    }
  }, [email, password, rememberMe, login])

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative overflow-hidden">
      {/* Left Panel - Branding (Desktop) */}
      <div className="hidden md:flex md:w-[52%] lg:w-[55%] relative bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 flex-col justify-between p-10 lg:p-14 overflow-hidden">
        {/* Decorative background shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/3 -left-20 w-72 h-72 bg-teal-400/8 rounded-full blur-2xl" />
          <div className="absolute -bottom-32 right-1/4 w-80 h-80 bg-slate-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/3 w-48 h-48 bg-teal-300/5 rounded-full blur-2xl" />
          {/* Decorative circles */}
          <div className="absolute top-16 right-20 w-3 h-3 bg-teal-400/30 rounded-full" />
          <div className="absolute top-32 left-24 w-2 h-2 bg-white/20 rounded-full" />
          <div className="absolute bottom-40 right-32 w-2.5 h-2.5 bg-teal-300/20 rounded-full" />
          <div className="absolute bottom-56 left-16 w-1.5 h-1.5 bg-white/15 rounded-full" />
          <div className="absolute top-1/2 right-16 w-2 h-2 bg-teal-400/25 rounded-full" />
          {/* Abstract vehicle/service shapes */}
          <svg className="absolute bottom-8 right-8 w-64 h-64 text-white/[0.03]" viewBox="0 0 256 256" fill="none">
            <circle cx="128" cy="128" r="120" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="128" cy="128" r="90" stroke="currentColor" strokeWidth="1" />
            <circle cx="128" cy="128" r="60" stroke="currentColor" strokeWidth="0.8" />
            <path d="M128 8 L128 248" stroke="currentColor" strokeWidth="0.5" />
            <path d="M8 128 L248 128" stroke="currentColor" strokeWidth="0.5" />
          </svg>
          <svg className="absolute top-12 left-12 w-32 h-32 text-teal-400/[0.08]" viewBox="0 0 128 128" fill="none">
            <path d="M64 16 L112 56 L96 108 L32 108 L16 56 Z" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>

        {/* Top: Logo & Brand */}
        <div className="relative z-10 animate-[fadeInUp_0.8s_ease-out_both]">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 overflow-hidden">
              {appLogo ? (
                <img src={appLogo} alt="Logo" className="h-9 w-9 object-contain" />
              ) : (
                <Shield className="h-6 w-6 text-teal-300" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {appName || 'SIService'}
              </h2>
              <p className="text-xs text-white/50 font-medium">
                {appInstansi || 'BKAD'}
              </p>
            </div>
          </div>
        </div>

        {/* Center: Tagline & Illustration */}
        <div className="relative z-10 space-y-8 animate-[fadeInUp_0.8s_ease-out_0.2s_both]">
          <div className="space-y-4">
            <h1 className="text-3xl lg:text-4xl font-bold text-white leading-tight tracking-tight">
              Sistem Informasi<br />
              Service Kendaraan<br />
              <span className="text-teal-400">Operasional</span>
            </h1>
            <p className="text-base text-white/60 max-w-md leading-relaxed">
              Kelola service kendaraan operasional secara terintegrasi. Dari pemesanan hingga laporan, semua dalam satu platform.
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg">
            <div className="flex items-center gap-3 bg-white/[0.06] backdrop-blur-sm rounded-xl px-4 py-3 border border-white/[0.06]">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20">
                <Wrench className="h-4 w-4 text-teal-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white/90">Service</p>
                <p className="text-[10px] text-white/40">Terintegrasi</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/[0.06] backdrop-blur-sm rounded-xl px-4 py-3 border border-white/[0.06]">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20">
                <Car className="h-4 w-4 text-teal-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white/90">Kendaraan</p>
                <p className="text-[10px] text-white/40">Terlacak</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/[0.06] backdrop-blur-sm rounded-xl px-4 py-3 border border-white/[0.06]">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20">
                <Settings2 className="h-4 w-4 text-teal-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white/90">Laporan</p>
                <p className="text-[10px] text-white/40">Real-time</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Copyright */}
        <div className="relative z-10 animate-[fadeInUp_0.8s_ease-out_0.4s_both]">
          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} {appInstansi || 'Badan Keuangan dan Aset Daerah'}. Hak cipta dilindungi.
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-white p-4 sm:p-6 md:p-10 relative">
        {/* Subtle background decoration for right panel */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-slate-100/60 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-teal-50/40 rounded-full blur-2xl" />
        </div>

        <div className="w-full max-w-[420px] relative z-10 animate-[fadeInUp_0.6s_ease-out_both]">
          {/* Mobile Header */}
          <div className="md:hidden text-center mb-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 shadow-lg overflow-hidden">
              {appLogo ? (
                <img src={appLogo} alt="Logo" className="h-11 w-11 object-contain" />
              ) : (
                <Shield className="h-7 w-7 text-teal-400" />
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {appName || 'Sistem Informasi Service Kendaraan'}
            </h1>
            <p className="mt-1 text-sm text-slate-500 font-medium">
              {appInstansi || 'Badan Keuangan dan Aset Daerah'}
            </p>
          </div>

          {/* Desktop: Welcome text */}
          <div className="hidden md:block mb-8">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Selamat Datang
            </h2>
            <p className="mt-1.5 text-sm text-slate-500">
              Masuk ke akun Anda untuk melanjutkan
            </p>
          </div>

          {/* Login Form Card */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200/80 px-4 py-3 text-sm text-red-700 animate-[fadeIn_0.3s_ease-out]">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email
              </Label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <CircleDot className="h-4 w-4 text-slate-400" />
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@bkad.go.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 bg-slate-50/60 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 focus:bg-white placeholder:text-slate-400 pl-10 rounded-xl transition-all duration-200"
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </Label>
              </div>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-slate-50/60 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 focus:bg-white placeholder:text-slate-400 pl-10 pr-11 rounded-xl transition-all duration-200"
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                className="data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
              />
              <Label htmlFor="remember" className="text-sm text-slate-600 cursor-pointer select-none">
                Ingat email saya
              </Label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white shadow-lg shadow-slate-900/20 hover:shadow-xl hover:shadow-slate-900/30 transition-all duration-300 font-semibold text-sm rounded-xl active:scale-[0.98]"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Memproses...</span>
                </div>
              ) : (
                'Masuk'
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-center text-xs text-slate-400">
              &copy; {new Date().getFullYear()} {appInstansi || 'BKAD'}. Hak cipta dilindungi.
            </p>
          </div>
        </div>
      </div>

      {/* Keyframe styles */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
