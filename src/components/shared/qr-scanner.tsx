'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Camera, X, SwitchCamera, Upload, Flashlight,
  ScanLine, AlertCircle, Loader2, Image as ImageIcon
} from 'lucide-react'
import { toast } from 'sonner'
import { QrScanResult } from './qr-scan-result'

interface QrScannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ScannerState = 'idle' | 'initializing' | 'scanning' | 'found' | 'error'

export function QrScanner({ open, onOpenChange }: QrScannerProps) {
  const [scannerState, setScannerState] = useState<ScannerState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [currentCameraIdx, setCurrentCameraIdx] = useState(0)
  const [scanResult, setScanResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const scannerRef = useRef<HTMLDivElement>(null)
  const html5QrCodeRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isScanningRef = useRef(false)

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      stopScanner()
      setScannerState('idle')
      setErrorMessage('')
      setScanResult(null)
      setLoading(false)
    }
  }, [open])

  // Start scanner when dialog opens
  useEffect(() => {
    if (open && scannerState === 'idle') {
      startScanner()
    }
    return () => {
      if (!open) {
        stopScanner()
      }
    }
  }, [open])

  const stopScanner = useCallback(async () => {
    try {
      if (html5QrCodeRef.current && isScanningRef.current) {
        await html5QrCodeRef.current.stop()
        isScanningRef.current = false
      }
    } catch {
      // Ignore stop errors
    }
  }, [])

  const startScanner = useCallback(async () => {
    if (!open || isScanningRef.current) return

    setScannerState('initializing')
    setErrorMessage('')

    try {
      // Dynamically import html5-qrcode
      const { Html5Qrcode } = await import('html5-qrcode')
      const html5QrCode = new Html5Qrcode('qr-reader-element')
      html5QrCodeRef.current = html5QrCode

      // Get available cameras
      const devices = await Html5Qrcode.getCameras()
      if (!devices || devices.length === 0) {
        setScannerState('error')
        setErrorMessage('Tidak ada kamera yang ditemukan. Pastikan kamera tersedia dan izin kamera diberikan.')
        return
      }
      setCameras(devices)

      // Prefer back camera
      const backCamera = devices.find(d =>
        d.label.toLowerCase().includes('back') ||
        d.label.toLowerCase().includes('rear') ||
        d.label.toLowerCase().includes('environment')
      )
      const initialCamera = backCamera || devices[0]
      setCurrentCameraIdx(devices.indexOf(initialCamera))

      // Start scanning
      await html5QrCode.start(
        initialCamera.id,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        onScanSuccess,
        undefined, // Don't call on failure for each frame
      )

      isScanningRef.current = true
      setScannerState('scanning')
    } catch (err: any) {
      console.error('Scanner init error:', err)
      setScannerState('error')
      if (err?.toString?.().includes('Permission') || err?.toString?.().includes('denied')) {
        setErrorMessage('Izin kamera ditolak. Berikan izin kamera di pengaturan browser Anda.')
      } else if (err?.toString?.().includes('NotFound') || err?.toString?.().includes('Requested device not found')) {
        setErrorMessage('Kamera tidak ditemukan. Pastikan perangkat memiliki kamera.')
      } else if (err?.toString?.().includes('secure context')) {
        setErrorMessage('Kamera memerlukan koneksi HTTPS. Gunakan HTTPS atau localhost.')
      } else {
        setErrorMessage('Gagal memulai kamera. Coba gunakan fitur upload gambar sebagai alternatif.')
      }
    }
  }, [open])

  const onScanSuccess = useCallback(async (decodedText: string) => {
    if (!isScanningRef.current || loading) return

    // Stop scanning after successful scan
    await stopScanner()

    // Check if it's our app's QR code URL
    const qrPath = '/api/kendaraan/qr/'
    let hash: string | null = null

    if (decodedText.includes(qrPath)) {
      // Extract hash from URL
      const parts = decodedText.split(qrPath)
      if (parts[1]) {
        hash = parts[1].split(/[?#]/)[0] // Remove query params or hash
      }
    }

    if (!hash) {
      // Not a valid vehicle QR code
      toast.error('QR code bukan merupakan QR kendaraan yang valid')
      setScannerState('scanning')
      startScanner()
      return
    }

    // Fetch vehicle info
    setLoading(true)
    setScannerState('found')
    try {
      const res = await fetch(`/api/kendaraan/qr/${hash}`)
      const data = await res.json()
      if (data.found && data.vehicle) {
        setScanResult(data)
        // Play a success sound / vibration
        if (navigator.vibrate) navigator.vibrate(100)
      } else {
        toast.error(data.error || 'Kendaraan tidak ditemukan')
        setScanResult(null)
        setScannerState('scanning')
        startScanner()
      }
    } catch {
      toast.error('Gagal mengambil data kendaraan')
      setScanResult(null)
      setScannerState('scanning')
      startScanner()
    } finally {
      setLoading(false)
    }
  }, [loading, stopScanner, startScanner])

  const switchCamera = useCallback(async () => {
    if (cameras.length <= 1) return
    await stopScanner()
    const nextIdx = (currentCameraIdx + 1) % cameras.length
    setCurrentCameraIdx(nextIdx)

    try {
      const nextCamera = cameras[nextIdx]
      await html5QrCodeRef.current?.start(
        nextCamera.id,
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        onScanSuccess,
        undefined,
      )
      isScanningRef.current = true
    } catch (err) {
      console.error('Switch camera error:', err)
      toast.error('Gagal mengganti kamera')
    }
  }, [cameras, currentCameraIdx, stopScanner, onScanSuccess])

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    await stopScanner()
    setScannerState('initializing')

    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const html5QrCode = new Html5Qrcode('qr-reader-element')
      html5QrCodeRef.current = html5QrCode

      const decodedText = await html5QrCode.scanFile(file, true)
      // Process the decoded text same as camera scan
      await onScanSuccess(decodedText)
    } catch (err: any) {
      console.error('File scan error:', err)
      toast.error('Tidak dapat membaca QR code dari gambar. Pastikan gambar jelas dan mengandung QR code.')
      setScannerState('scanning')
      // Try to restart camera
      if (cameras.length > 0) {
        startScanner()
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [stopScanner, onScanSuccess, cameras, startScanner])

  const handleRescan = useCallback(() => {
    setScanResult(null)
    setScannerState('scanning')
    startScanner()
  }, [startScanner])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Scan QR Code Kendaraan</DialogTitle>
          <DialogDescription>Scan QR code pada kendaraan untuk melihat informasi</DialogDescription>
        </DialogHeader>

        {/* Header */}
        <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-teal-900 px-5 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                <ScanLine className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold">Scan QR Kendaraan</h2>
                <p className="text-[11px] text-slate-300">Arahkan kamera ke QR code kendaraan</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scanner Area */}
        <div className="relative">
          {/* Camera preview */}
          <div
            id="qr-reader-element"
            ref={scannerRef}
            className="w-full"
            style={{ minHeight: scanResult ? 0 : 280 }}
          />

          {/* Loading overlay */}
          {scannerState === 'initializing' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 z-10 min-h-[280px]">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Memulai kamera...</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Berikan izin kamera jika diminta</p>
            </div>
          )}

          {/* Error overlay */}
          {scannerState === 'error' && (
            <div className="flex flex-col items-center justify-center p-8 min-h-[280px]">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/20 mb-4">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <p className="text-sm font-medium text-center mb-2">{errorMessage}</p>
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg text-xs"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
                  Upload Gambar
                </Button>
                <Button
                  size="sm"
                  className="rounded-lg text-xs"
                  onClick={() => {
                    setScannerState('idle')
                    startScanner()
                  }}
                >
                  Coba Lagi
                </Button>
              </div>
            </div>
          )}

          {/* Scan result */}
          {scanResult && scannerState === 'found' && (
            <QrScanResult
              data={scanResult}
              onRescan={handleRescan}
              onClose={() => onOpenChange(false)}
              loading={loading}
            />
          )}
        </div>

        {/* Bottom Controls */}
        {!scanResult && scannerState !== 'error' && (
          <div className="border-t border-border/50 bg-muted/30 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Camera switch */}
                {cameras.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg text-xs gap-1.5"
                    onClick={switchCamera}
                    disabled={scannerState === 'initializing'}
                  >
                    <SwitchCamera className="h-3.5 w-3.5" />
                    Ganti Kamera
                  </Button>
                )}
              </div>

              {/* Upload button */}
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-lg text-xs gap-1.5"
                onClick={() => fileInputRef.current?.click()}
                disabled={scannerState === 'initializing'}
              >
                <Upload className="h-3.5 w-3.5" />
                Upload Gambar QR
              </Button>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            {/* Camera info */}
            {cameras.length > 0 && (
              <div className="mt-2 text-center">
                <span className="text-[10px] text-muted-foreground">
                  <Camera className="h-3 w-3 inline mr-1" />
                  {cameras[currentCameraIdx]?.label || `Kamera ${currentCameraIdx + 1}`}
                </span>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
