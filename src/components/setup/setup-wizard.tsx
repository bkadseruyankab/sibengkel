'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Shield,
  Building2,
  User,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Upload,
  Loader2,
  Settings,
  Image as ImageIcon,
  Mail,
  Lock,
  Phone,
  MapPin,
  UserCircle,
  Rocket,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SetupWizardProps {
  onComplete: () => void
}

interface AppSettingsForm {
  app_name: string
  app_short_name: string
  app_description: string
  app_instansi: string
  app_address: string
  app_phone: string
  app_email: string
  app_kop_line1: string
  app_kop_line2: string
  app_kop_line3: string
}

interface AdminForm {
  name: string
  email: string
  password: string
  confirmPassword: string
}

interface BengkelForm {
  namaBengkel: string
  alamat: string
  noTelepon: string
  picBengkel: string
}

type Step = 'welcome' | 'identity' | 'admin' | 'bengkel' | 'complete'

const STEPS: { key: Step; label: string; icon: React.ElementType }[] = [
  { key: 'welcome', label: 'Selamat Datang', icon: Rocket },
  { key: 'identity', label: 'Identitas', icon: Settings },
  { key: 'admin', label: 'Admin', icon: User },
  { key: 'bengkel', label: 'Bengkel', icon: Building2 },
  { key: 'complete', label: 'Selesai', icon: CheckCircle2 },
]

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const currentIndex = STEPS.findIndex(s => s.key === currentStep)

  return (
    <div className="flex items-center justify-center gap-0 mb-8 sm:mb-10">
      {STEPS.map((step, idx) => {
        const isCompleted = idx < currentIndex
        const isCurrent = idx === currentIndex
        const Icon = step.icon

        return (
          <div key={step.key} className="flex items-center">
            {/* Pill-shaped step */}
            <div className="flex items-center">
              <div
                className={cn(
                  'flex items-center gap-1.5 rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
                  isCurrent
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-3 py-1.5 shadow-lg shadow-emerald-500/25'
                    : isCompleted
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-1.5'
                      : 'bg-white/10 text-white/40 px-2 py-1.5'
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
                <span className={cn(
                  'text-xs font-semibold whitespace-nowrap',
                  isCurrent ? 'inline' : 'hidden sm:inline'
                )}>
                  {step.label}
                </span>
              </div>
            </div>

            {/* Connector line */}
            {idx < STEPS.length - 1 && (
              <div className="relative mx-1 h-0.5 w-4 sm:w-8 overflow-hidden rounded-full bg-white/10">
                <div
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out',
                    idx < currentIndex
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 w-full'
                      : idx === currentIndex
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-500/30 w-1/2'
                        : 'w-0'
                  )}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Animated Background ──────────────────────────────────────────────────────

function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950" />

      {/* Animated mesh gradient blobs - CSS only animations */}
      <div
        className="absolute -top-1/4 -left-1/4 h-[600px] w-[600px] rounded-full opacity-30"
        style={{
          background: 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%)',
          animation: 'meshFloat1 8s ease-in-out infinite',
        }}
      />
      <div
        className="absolute -bottom-1/4 -right-1/4 h-[500px] w-[500px] rounded-full opacity-25"
        style={{
          background: 'radial-gradient(circle, rgba(20,184,166,0.3) 0%, transparent 70%)',
          animation: 'meshFloat2 10s ease-in-out infinite',
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(52,211,153,0.2) 0%, transparent 70%)',
          animation: 'meshFloat3 12s ease-in-out infinite',
        }}
      />

      {/* Subtle grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  )
}

// ─── Decorative Elements ──────────────────────────────────────────────────────

function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-emerald-400/10"
          style={{
            width: `${4 + i * 2}px`,
            height: `${4 + i * 2}px`,
            left: `${15 + i * 15}%`,
            top: `${20 + (i % 3) * 25}%`,
            animation: `particleFloat ${6 + i * 1.5}s ease-in-out infinite`,
            animationDelay: `${i * 0.8}s`,
          }}
        />
      ))}
    </div>
  )
}

// ─── Welcome Step ─────────────────────────────────────────────────────────────

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-8 relative">
      <FloatingParticles />

      <div className="flex justify-center animate-[heroEnter_0.7s_ease-[cubic-bezier(0.34,1.56,0.64,1)]_both]">
        <div className="relative">
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-3xl bg-emerald-500/20 blur-2xl scale-150" />
          <div className="relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-2xl shadow-emerald-500/30 ring-1 ring-white/10">
            <Shield className="h-12 w-12 sm:h-14 sm:w-14 text-white drop-shadow-lg" />
          </div>
          {/* Sparkle accent */}
          <div className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 shadow-lg shadow-amber-400/30">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
        </div>
      </div>

      <div className="space-y-3 animate-[fadeUp_0.7s_ease-out_0.2s_both]">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Selamat Datang!
        </h1>
        <p className="text-emerald-200/70 text-base sm:text-lg max-w-md mx-auto leading-relaxed">
          Sistem Informasi Service Kendaraan Operasional Dinas
        </p>
      </div>

      <div className="animate-[fadeUp_0.7s_ease-out_0.4s_both]">
        <Card className="text-left max-w-md mx-auto bg-white/[0.07] border-white/10 backdrop-blur-xl shadow-xl">
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm font-semibold text-white/90">Setup wizard akan membantu Anda:</p>
            <div className="space-y-3">
              {[
                { icon: Settings, text: 'Mengatur identitas dan branding aplikasi' },
                { icon: User, text: 'Membuat akun Super Admin pertama' },
                { icon: Building2, text: 'Menambahkan bengkel pertama' },
              ].map((item, i) => {
                const Icon = item.icon
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3.5 text-sm animate-[slideRight_0.5s_ease-out_both]"
                    style={{ animationDelay: `${0.5 + i * 0.1}s` }}
                  >
                    <span className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
                      <Icon className="h-4 w-4 text-emerald-400" />
                    </span>
                    <span className="text-white/70">{item.text}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="animate-[scaleIn_0.7s_ease-[cubic-bezier(0.34,1.56,0.64,1)]_0.6s_both]">
        <Button
          onClick={onNext}
          size="lg"
          className="gap-2 min-h-[48px] px-8 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 transition-all duration-300 active:scale-95 border-0"
        >
          Mulai Setup
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}

// ─── Identity Step ────────────────────────────────────────────────────────────

function IdentityStep({
  data,
  onChange,
  onNext,
  onPrev,
}: {
  data: AppSettingsForm
  onChange: (data: Partial<AppSettingsForm>) => void
  onNext: () => void
  onPrev: () => void
}) {
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran logo maksimal 2MB')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'logo')

    fetch('/api/pengaturan/upload', { method: 'POST', body: formData })
      .then(res => {
        if (!res.ok) throw new Error('Upload failed')
        return res.json()
      })
      .then(result => {
        if (result.path) {
          // Add cache-busting so the browser fetches the fresh image
          const cacheBustedPath = result.path + '?t=' + Date.now()
          onChange({ app_logo: result.path } as any)
          setLogoPreview(cacheBustedPath)
          toast.success('Logo berhasil diupload')
        }
      })
      .catch(() => toast.error('Gagal mengupload logo'))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran logo maksimal 2MB')
      return
    }
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'logo')
    fetch('/api/pengaturan/upload', { method: 'POST', body: formData })
      .then(res => {
        if (!res.ok) throw new Error('Upload failed')
        return res.json()
      })
      .then(result => {
        if (result.path) {
          // Add cache-busting so the browser fetches the fresh image
          const cacheBustedPath = result.path + '?t=' + Date.now()
          onChange({ app_logo: result.path } as any)
          setLogoPreview(cacheBustedPath)
          toast.success('Logo berhasil diupload')
        }
      })
      .catch(() => toast.error('Gagal mengupload logo'))
  }

  const canContinue = data.app_name.trim() && data.app_short_name.trim()

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/15 ring-1 ring-emerald-500/20">
            <Settings className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          Identitas Aplikasi
        </h2>
        <p className="text-sm text-muted-foreground">Atur nama, deskripsi, dan branding aplikasi</p>
      </div>

      <div className="space-y-5 max-w-lg mx-auto">
        {/* Logo Upload with drag-drop feel */}
        <div
          className={cn(
            'flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-dashed transition-all duration-300',
            dragOver
              ? 'border-emerald-500 bg-emerald-500/5 scale-[1.02]'
              : 'border-border/60 hover:border-emerald-500/40'
          )}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 ring-1 ring-emerald-500/20 shadow-inner overflow-hidden flex items-center justify-center transition-all duration-300 hover:shadow-md">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="h-full w-full object-contain p-1.5" />
            ) : (
              <ImageIcon className="h-8 w-8 text-emerald-500/40" />
            )}
          </div>
          <Label htmlFor="logo-upload" className="cursor-pointer">
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-semibold transition-colors">
              <Upload className="h-4 w-4" />
              Upload Logo
            </div>
            <input
              id="logo-upload"
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </Label>
          <p className="text-xs text-muted-foreground">PNG/SVG, maks. 2MB — atau drag & drop</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="app_name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nama Aplikasi *</Label>
            <Input
              id="app_name"
              value={data.app_name}
              onChange={e => onChange({ app_name: e.target.value })}
              placeholder="SIService BKAD"
              className="min-h-[44px] bg-background/50 border-border/60 focus:border-emerald-500/50 focus:ring-emerald-500/20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="app_short_name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nama Singkat *</Label>
            <Input
              id="app_short_name"
              value={data.app_short_name}
              onChange={e => onChange({ app_short_name: e.target.value })}
              placeholder="BKAD"
              maxLength={10}
              className="min-h-[44px] bg-background/50 border-border/60 focus:border-emerald-500/50 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="app_description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Deskripsi Singkat</Label>
          <Input
            id="app_description"
            value={data.app_description}
            onChange={e => onChange({ app_description: e.target.value })}
            placeholder="Sistem Informasi Service Kendaraan Operasional Dinas"
            className="min-h-[44px] bg-background/50 border-border/60 focus:border-emerald-500/50 focus:ring-emerald-500/20"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="app_instansi" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nama Instansi</Label>
          <Input
            id="app_instansi"
            value={data.app_instansi}
            onChange={e => onChange({ app_instansi: e.target.value })}
            placeholder="Badan Keuangan dan Aset Daerah"
            className="min-h-[44px] bg-background/50 border-border/60 focus:border-emerald-500/50 focus:ring-emerald-500/20"
          />
        </div>

        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
          <p className="pt-4 text-xs font-bold uppercase tracking-[0.15em] text-emerald-600/70 dark:text-emerald-400/70">Kop Surat</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="app_kop_line1" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Baris 1</Label>
          <Input
            id="app_kop_line1"
            value={data.app_kop_line1}
            onChange={e => onChange({ app_kop_line1: e.target.value })}
            placeholder="PEMERINTAH KABUPATEN/KOTA"
            className="min-h-[44px] bg-background/50 border-border/60 focus:border-emerald-500/50 focus:ring-emerald-500/20"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="app_kop_line2" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Baris 2</Label>
          <Input
            id="app_kop_line2"
            value={data.app_kop_line2}
            onChange={e => onChange({ app_kop_line2: e.target.value })}
            placeholder="BADAN KEUANGAN DAN ASET DAERAH"
            className="min-h-[44px] bg-background/50 border-border/60 focus:border-emerald-500/50 focus:ring-emerald-500/20"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="app_kop_line3" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Baris 3</Label>
          <Input
            id="app_kop_line3"
            value={data.app_kop_line3}
            onChange={e => onChange({ app_kop_line3: e.target.value })}
            placeholder="UNIT LAYANAN PENGADAAN"
            className="min-h-[44px] bg-background/50 border-border/60 focus:border-emerald-500/50 focus:ring-emerald-500/20"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="app_address" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Alamat</Label>
            <Input
              id="app_address"
              value={data.app_address}
              onChange={e => onChange({ app_address: e.target.value })}
              placeholder="Jl. ..."
              className="min-h-[44px] bg-background/50 border-border/60 focus:border-emerald-500/50 focus:ring-emerald-500/20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="app_phone" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Telepon</Label>
            <Input
              id="app_phone"
              value={data.app_phone}
              onChange={e => onChange({ app_phone: e.target.value })}
              placeholder="(021) ..."
              className="min-h-[44px] bg-background/50 border-border/60 focus:border-emerald-500/50 focus:ring-emerald-500/20"
            />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev} className="gap-2 min-h-[44px] border-border/60 hover:bg-muted/50">
          <ChevronLeft className="h-4 w-4" />
          Kembali
        </Button>
        <Button
          onClick={onNext}
          disabled={!canContinue}
          className="gap-2 min-h-[44px] bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-500/20 transition-all duration-300 active:scale-95 border-0 disabled:opacity-50"
        >
          Lanjut
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ─── Admin Step ───────────────────────────────────────────────────────────────

function AdminStep({
  data,
  onChange,
  onNext,
  onPrev,
}: {
  data: AdminForm
  onChange: (data: Partial<AdminForm>) => void
  onNext: () => void
  onPrev: () => void
}) {
  const passwordMatch = data.password === data.confirmPassword
  const passwordLength = data.password.length >= 6
  const canContinue = data.name.trim() && data.email.trim() && passwordMatch && passwordLength
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/15 ring-1 ring-emerald-500/20">
            <User className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          Akun Super Admin
        </h2>
        <p className="text-sm text-muted-foreground">Buat akun administrator utama untuk mengelola sistem</p>
      </div>

      <Card className="max-w-md mx-auto border-border/60 bg-gradient-to-b from-card to-card/80 shadow-lg overflow-hidden">
        {/* Gradient accent top */}
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-md shadow-emerald-500/20">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Super Admin</CardTitle>
              <CardDescription className="text-xs">Akses penuh ke semua fitur sistem</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin_name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nama Lengkap *</Label>
            <div className="relative">
              <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <Input
                id="admin_name"
                value={data.name}
                onChange={e => onChange({ name: e.target.value })}
                placeholder="Administrator"
                className="pl-9 min-h-[44px] bg-background/50 border-border/60 focus:border-emerald-500/50 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin_email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <Input
                id="admin_email"
                type="email"
                value={data.email}
                onChange={e => onChange({ email: e.target.value })}
                placeholder="admin@bkad.go.id"
                className="pl-9 min-h-[44px] bg-background/50 border-border/60 focus:border-emerald-500/50 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin_password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <Input
                id="admin_password"
                type={showPassword ? 'text' : 'password'}
                value={data.password}
                onChange={e => onChange({ password: e.target.value })}
                placeholder="Min. 6 karakter"
                className="pl-9 pr-10 min-h-[44px] bg-background/50 border-border/60 focus:border-emerald-500/50 focus:ring-emerald-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {data.password && !passwordLength && (
              <p className="text-xs text-red-500 font-medium">Password minimal 6 karakter</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin_confirm" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Konfirmasi Password *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <Input
                id="admin_confirm"
                type={showPassword ? 'text' : 'password'}
                value={data.confirmPassword}
                onChange={e => onChange({ confirmPassword: e.target.value })}
                placeholder="Ulangi password"
                className="pl-9 min-h-[44px] bg-background/50 border-border/60 focus:border-emerald-500/50 focus:ring-emerald-500/20"
              />
            </div>
            {data.confirmPassword && !passwordMatch && (
              <p className="text-xs text-red-500 font-medium">Password tidak cocok</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev} className="gap-2 min-h-[44px] border-border/60 hover:bg-muted/50">
          <ChevronLeft className="h-4 w-4" />
          Kembali
        </Button>
        <Button
          onClick={onNext}
          disabled={!canContinue}
          className="gap-2 min-h-[44px] bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-500/20 transition-all duration-300 active:scale-95 border-0 disabled:opacity-50"
        >
          Lanjut
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ─── Bengkel Step ─────────────────────────────────────────────────────────────

function BengkelStep({
  data,
  onChange,
  onPrev,
  onSubmit,
  isSubmitting,
}: {
  data: BengkelForm
  onChange: (data: Partial<BengkelForm>) => void
  onPrev: () => void
  onSubmit: () => void
  isSubmitting: boolean
}) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/15 ring-1 ring-emerald-500/20">
            <Building2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          Bengkel Pertama
        </h2>
        <p className="text-sm text-muted-foreground">Tambahkan bengkel mitra pertama Anda (opsional)</p>
      </div>

      <Card className="max-w-md mx-auto border-border/60 shadow-lg overflow-hidden">
        {/* Gradient accent top */}
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bengkel_name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nama Bengkel</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <Input
                id="bengkel_name"
                value={data.namaBengkel}
                onChange={e => onChange({ namaBengkel: e.target.value })}
                placeholder="Contoh: Bengkel Jaya Makmur"
                className="pl-9 min-h-[44px] bg-background/50 border-border/60 focus:border-emerald-500/50 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bengkel_alamat" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Alamat</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/50" />
              <Input
                id="bengkel_alamat"
                value={data.alamat}
                onChange={e => onChange({ alamat: e.target.value })}
                placeholder="Jl. Raya No. 123"
                className="pl-9 min-h-[44px] bg-background/50 border-border/60 focus:border-emerald-500/50 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bengkel_telp" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">No. Telepon</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input
                  id="bengkel_telp"
                  value={data.noTelepon}
                  onChange={e => onChange({ noTelepon: e.target.value })}
                  placeholder="08xx-xxxx-xxxx"
                  className="pl-9 min-h-[44px] bg-background/50 border-border/60 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bengkel_pic" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PIC Bengkel</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input
                  id="bengkel_pic"
                  value={data.picBengkel}
                  onChange={e => onChange({ picBengkel: e.target.value })}
                  placeholder="Nama penanggung jawab"
                  className="pl-9 min-h-[44px] bg-background/50 border-border/60 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
            <Sparkles className="h-4 w-4 text-emerald-500 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Anda dapat menambahkan bengkel lain nanti melalui menu Manajemen Bengkel
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev} className="gap-2 min-h-[44px] border-border/60 hover:bg-muted/50" disabled={isSubmitting}>
          <ChevronLeft className="h-4 w-4" />
          Kembali
        </Button>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="min-h-[44px] text-muted-foreground hover:text-foreground"
          >
            Lewati
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="gap-2 min-h-[44px] bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-500/20 transition-all duration-300 active:scale-95 border-0"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                Simpan & Selesai
                <CheckCircle2 className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Complete Step ────────────────────────────────────────────────────────────

function CompleteStep({ onGoToLogin }: { onGoToLogin: () => void }) {
  return (
    <div className="text-center space-y-8 relative">
      <FloatingParticles />

      <div className="flex justify-center animate-[heroEnter_0.7s_ease-[cubic-bezier(0.34,1.56,0.64,1)]_both]">
        <div className="relative">
          {/* Animated glow rings */}
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute inset-[-8px] rounded-full bg-emerald-500/10" style={{ animation: 'completeGlow 3s ease-in-out infinite' }} />
          <div className="relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-2xl shadow-emerald-500/30 ring-4 ring-emerald-500/20">
            <CheckCircle2 className="h-12 w-12 sm:h-14 sm:w-14 text-white drop-shadow-lg" />
          </div>
        </div>
      </div>

      <div className="animate-[fadeUp_0.7s_ease-out_0.2s_both]">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          Setup Selesai!
        </h2>
        <p className="text-muted-foreground mt-3 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
          Sistem berhasil dikonfigurasi. Anda dapat masuk menggunakan akun Super Admin yang telah dibuat.
        </p>
      </div>

      <div className="animate-[fadeUp_0.7s_ease-out_0.4s_both]">
        <Card className="max-w-sm mx-auto text-left border-border/60 shadow-lg overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />
          <CardContent className="pt-5 space-y-3">
            {[
              { icon: Settings, title: 'Identitas Aplikasi', desc: 'Nama, logo, dan kop surat', delay: '0.5s' },
              { icon: Shield, title: 'Akun Super Admin', desc: 'Akses penuh ke semua fitur', delay: '0.6s' },
              { icon: Building2, title: 'Bengkel Mitra', desc: 'Siap menerima service kendaraan', delay: '0.7s' },
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <div
                  key={i}
                  className="flex items-center gap-3.5 p-2 rounded-xl animate-[slideRight_0.5s_ease-out_both]"
                  style={{ animationDelay: item.delay }}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/15 shrink-0">
                    <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-auto shrink-0" />
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <div className="animate-[scaleIn_0.7s_ease-[cubic-bezier(0.34,1.56,0.64,1)]_0.8s_both]">
        <Button
          onClick={onGoToLogin}
          size="lg"
          className="gap-2 min-h-[48px] px-8 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 transition-all duration-300 active:scale-95 border-0"
        >
          Masuk ke Aplikasi
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}

// ─── Main Setup Wizard ───────────────────────────────────────────────────────

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>('welcome')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [appSettings, setAppSettings] = useState<AppSettingsForm>({
    app_name: 'SIService BKAD',
    app_short_name: 'BKAD',
    app_description: 'Sistem Informasi Service Kendaraan Operasional Dinas',
    app_instansi: 'Badan Keuangan dan Aset Daerah',
    app_address: '',
    app_phone: '',
    app_email: '',
    app_kop_line1: 'PEMERINTAH KABUPATEN/KOTA',
    app_kop_line2: 'BADAN KEUANGAN DAN ASET DAERAH',
    app_kop_line3: 'UNIT LAYANAN PENGADAAN',
  })

  const [admin, setAdmin] = useState<AdminForm>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const [bengkel, setBengkel] = useState<BengkelForm>({
    namaBengkel: '',
    alamat: '',
    noTelepon: '',
    picBengkel: '',
  })

  const updateAppSettings = useCallback((partial: Partial<AppSettingsForm>) => {
    setAppSettings(prev => ({ ...prev, ...partial }))
  }, [])

  const updateAdmin = useCallback((partial: Partial<AdminForm>) => {
    setAdmin(prev => ({ ...prev, ...partial }))
  }, [])

  const updateBengkel = useCallback((partial: Partial<BengkelForm>) => {
    setBengkel(prev => ({ ...prev, ...partial }))
  }, [])

  async function handleSubmit() {
    setIsSubmitting(true)
    try {
      // Prepare settings (exclude logo from appSettings if not uploaded)
      const settingsToSend: Record<string, string> = {}
      for (const [key, value] of Object.entries(appSettings)) {
        if (value) settingsToSend[key] = value
      }

      const response = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appSettings: settingsToSend,
          admin: {
            name: admin.name,
            email: admin.email,
            password: admin.password,
          },
          bengkel: bengkel.namaBengkel
            ? {
                namaBengkel: bengkel.namaBengkel,
                alamat: bengkel.alamat || undefined,
                noTelepon: bengkel.noTelepon || undefined,
                picBengkel: bengkel.picBengkel || undefined,
              }
            : undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Gagal menyimpan setup')
        return
      }

      setCurrentStep('complete')
      toast.success('Setup berhasil disimpan!')
    } catch (error) {
      toast.error('Terjadi kesalahan saat menyimpan setup')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleGoToLogin() {
    onComplete()
  }

  function goNext() {
    const idx = STEPS.findIndex(s => s.key === currentStep)
    if (idx < STEPS.length - 1) {
      setCurrentStep(STEPS[idx + 1].key)
    }
  }

  function goPrev() {
    const idx = STEPS.findIndex(s => s.key === currentStep)
    if (idx > 0) {
      setCurrentStep(STEPS[idx - 1].key)
    }
  }

  // Determine if current step uses dark background (welcome/complete) or light card
  const isDarkStep = currentStep === 'welcome' || currentStep === 'complete'

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <AnimatedBackground />

      <div className="w-full max-w-2xl relative z-10">
        {/* Step indicator */}
        <StepIndicator currentStep={currentStep} />

        {/* Content card */}
        <Card className={cn(
          'border-0 shadow-2xl transition-all duration-500',
          isDarkStep
            ? 'bg-white/[0.06] border-white/10 backdrop-blur-xl shadow-black/20'
            : 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-black/10'
        )}>
          <CardContent className="p-5 sm:p-8">
            <div
              key={currentStep}
              className="animate-[stepEnter_0.5s_ease-[cubic-bezier(0.34,1.56,0.64,1)]]"
            >
              {currentStep === 'welcome' && (
                <WelcomeStep onNext={goNext} />
              )}
              {currentStep === 'identity' && (
                <IdentityStep
                  data={appSettings}
                  onChange={updateAppSettings}
                  onNext={goNext}
                  onPrev={goPrev}
                />
              )}
              {currentStep === 'admin' && (
                <AdminStep
                  data={admin}
                  onChange={updateAdmin}
                  onNext={goNext}
                  onPrev={goPrev}
                />
              )}
              {currentStep === 'bengkel' && (
                <BengkelStep
                  data={bengkel}
                  onChange={updateBengkel}
                  onPrev={goPrev}
                  onSubmit={handleSubmit}
                  isSubmitting={isSubmitting}
                />
              )}
              {currentStep === 'complete' && (
                <CompleteStep onGoToLogin={handleGoToLogin} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-white/30 mt-6">
          SIService BKAD — Setup Wizard v1.0
        </p>
      </div>

      {/* Custom keyframes */}
      <style jsx global>{`
        @keyframes meshFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 15px) scale(0.95); }
        }
        @keyframes meshFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-25px, 20px) scale(1.08); }
          66% { transform: translate(15px, -25px) scale(0.92); }
        }
        @keyframes meshFloat3 {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.15); }
        }
        @keyframes particleFloat {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
          50% { transform: translateY(-20px) scale(1.3); opacity: 0.8; }
        }
        @keyframes stepEnter {
          0% { opacity: 0; transform: translateY(12px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes completeGlow {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.15); opacity: 0.15; }
        }
        @keyframes heroEnter {
          0% { opacity: 0; transform: scale(0.75) translateY(6px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes fadeUp {
          0% { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          0% { opacity: 0; transform: scale(0.9) translateY(4px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes slideRight {
          0% { opacity: 0; transform: translateX(-16px); }
          100% { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
