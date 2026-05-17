'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Eraser, Save, RotateCcw, Pen, Palette } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SignaturePadProps {
  onSave: (imageData: string) => void
  onCancel?: () => void
  penColor?: string
  penWidth?: number
  width?: number
  height?: number
  className?: string
}

export function SignaturePad({
  onSave,
  onCancel,
  penColor: initialPenColor = '#1a1a1a',
  penWidth: initialPenWidth = 2,
  width,
  height = 200,
  className,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [penColor, setPenColor] = useState(initialPenColor)
  const [penWidth, setPenWidth] = useState(initialPenWidth)
  const [isEmpty, setIsEmpty] = useState(true)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  const PEN_COLORS = [
    { value: '#1a1a1a', label: 'Hitam' },
    { value: '#1e40af', label: 'Biru' },
    { value: '#dc2626', label: 'Merah' },
  ]

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas dimensions
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    // Set default styles
    ctx.strokeStyle = penColor
    ctx.lineWidth = penWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.imageSmoothingEnabled = true

    // Clear canvas with transparent background
    ctx.clearRect(0, 0, rect.width, rect.height)
    // isEmpty is already true by default
  }, [])

  // Update pen color on canvas context
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = penColor
  }, [penColor])

  // Update pen width on canvas context
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.lineWidth = penWidth
  }, [penWidth])

  const getCanvasPoint = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()

    let clientX: number, clientY: number
    if ('touches' in e) {
      if (e.touches.length === 0) return null
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }, [])

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const point = getCanvasPoint(e)
    if (!point) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setIsDrawing(true)
    lastPointRef.current = point
    setIsEmpty(false)

    // Draw a dot for single click
    ctx.beginPath()
    ctx.arc(point.x, point.y, penWidth / 2, 0, Math.PI * 2)
    ctx.fillStyle = penColor
    ctx.fill()
  }, [getCanvasPoint, penColor, penWidth])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!isDrawing) return

    const point = getCanvasPoint(e)
    if (!point || !lastPointRef.current) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.beginPath()
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()

    lastPointRef.current = point
  }, [isDrawing, getCanvasPoint])

  const stopDrawing = useCallback(() => {
    setIsDrawing(false)
    lastPointRef.current = null
  }, [])

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    ctx.clearRect(0, 0, rect.width, rect.height)
    setIsEmpty(true)
  }, [])

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || isEmpty) return

    // Get the original size of the canvas content
    const dpr = window.devicePixelRatio || 1
    const originalWidth = canvas.width / dpr
    const originalHeight = canvas.height / dpr

    // Create a temporary canvas for optimized output (max 200px width)
    const maxWidth = 200
    const scale = Math.min(1, maxWidth / originalWidth)
    const outputWidth = Math.round(originalWidth * scale)
    const outputHeight = Math.round(originalHeight * scale)

    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = outputWidth
    tempCanvas.height = outputHeight
    const tempCtx = tempCanvas.getContext('2d')
    if (!tempCtx) return

    // Draw the original canvas content onto the temp canvas, scaled
    tempCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, outputWidth, outputHeight)

    // Get base64 PNG with transparent background
    const imageData = tempCanvas.toDataURL('image/png')
    onSave(imageData)
  }, [isEmpty, onSave])

  return (
    <div className={cn('space-y-3', className)}>
      {/* Canvas area */}
      <div className="relative rounded-xl border-2 border-dashed border-muted-foreground/25 bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          style={{ width: width || '100%', height: `${height}px`, touchAction: 'none' }}
          className="cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-muted-foreground/30 text-sm select-none">
              Tanda tangan di sini...
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-3">
        {/* Pen Color */}
        <div className="flex items-center gap-3">
          <Palette className="h-4 w-4 text-muted-foreground shrink-0" />
          <Label className="text-xs text-muted-foreground shrink-0">Warna:</Label>
          <div className="flex gap-2">
            {PEN_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => setPenColor(color.value)}
                className={cn(
                  'h-7 w-7 rounded-full border-2 transition-all duration-200 hover:scale-110',
                  penColor === color.value
                    ? 'border-primary ring-2 ring-primary/30 scale-110'
                    : 'border-muted-foreground/25'
                )}
                style={{ backgroundColor: color.value }}
                title={color.label}
              />
            ))}
          </div>
        </div>

        {/* Pen Width */}
        <div className="flex items-center gap-3">
          <Pen className="h-4 w-4 text-muted-foreground shrink-0" />
          <Label className="text-xs text-muted-foreground shrink-0">Ketebalan:</Label>
          <Slider
            value={[penWidth]}
            onValueChange={(v) => setPenWidth(v[0])}
            min={1}
            max={5}
            step={0.5}
            className="flex-1 max-w-[200px]"
          />
          <span className="text-xs text-muted-foreground w-6">{penWidth}</span>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={clearCanvas}
            disabled={isEmpty}
            className="gap-1.5 rounded-xl"
          >
            <Eraser className="h-3.5 w-3.5" />
            Hapus
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              clearCanvas()
              setPenColor(initialPenColor)
              setPenWidth(initialPenWidth)
            }}
            className="gap-1.5 rounded-xl"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
          <div className="flex-1" />
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="rounded-xl"
            >
              Batal
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isEmpty}
            className="gap-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-lg shadow-teal-500/20"
          >
            <Save className="h-3.5 w-3.5" />
            Simpan Tanda Tangan
          </Button>
        </div>
      </div>
    </div>
  )
}
