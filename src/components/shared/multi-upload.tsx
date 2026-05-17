'use client'

import React, { useState, useCallback, useRef } from 'react'
import { Upload, FileText, ImageIcon, X, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface FilePreview {
  file: File
  id: string
  preview?: string
}

interface MultiUploadProps {
  onUpload: (files: File[], jenisDokumen: string) => Promise<void>
  maxFiles?: number
  maxSize?: number // in bytes
  isUploading?: boolean
  progress?: number
}

const JENIS_DOKUMEN_OPTIONS = [
  { value: 'NOTA', label: 'Nota' },
  { value: 'KWITANSI', label: 'Kwitansi' },
  { value: 'FAKTUR', label: 'Faktur' },
  { value: 'LAINNYA', label: 'Lainnya' },
]

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(file: File) {
  if (file.type.startsWith('image/')) {
    return <ImageIcon className="h-5 w-5 text-green-500" />
  }
  return <FileText className="h-5 w-5 text-red-500" />
}

export function MultiUpload({
  onUpload,
  maxFiles = 10,
  maxSize = 5 * 1024 * 1024,
  isUploading = false,
  progress = 0,
}: MultiUploadProps) {
  const [files, setFiles] = useState<FilePreview[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [jenisDokumen, setJenisDokumen] = useState('NOTA')
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      setError(null)
      const fileArray = Array.from(newFiles)
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']

      const validFiles: FilePreview[] = []
      for (const file of fileArray) {
        if (!allowedTypes.includes(file.type)) {
          setError(`File "${file.name}" tidak didukung. Gunakan JPG, PNG, atau PDF.`)
          continue
        }
        if (file.size > maxSize) {
          setError(`File "${file.name}" melebihi batas ${formatFileSize(maxSize)}.`)
          continue
        }
        validFiles.push({
          file,
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        })
      }

      setFiles((prev) => {
        const combined = [...prev, ...validFiles]
        if (combined.length > maxFiles) {
          setError(`Maksimal ${maxFiles} file per upload.`)
          return combined.slice(0, maxFiles)
        }
        return combined
      })
    },
    [maxSize, maxFiles]
  )

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id)
      if (file?.preview) URL.revokeObjectURL(file.preview)
      return prev.filter((f) => f.id !== id)
    })
    setError(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
      if (e.dataTransfer.files) {
        addFiles(e.dataTransfer.files)
      }
    },
    [addFiles]
  )

  const handleBrowseClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files)
      e.target.value = ''
    }
  }

  const handleUpload = async () => {
    if (files.length === 0) return
    try {
      await onUpload(
        files.map((f) => f.file),
        jenisDokumen
      )
      // Clean up previews
      files.forEach((f) => {
        if (f.preview) URL.revokeObjectURL(f.preview)
      })
      setFiles([])
      setError(null)
    } catch {
      setError('Gagal mengupload file. Silakan coba lagi.')
    }
  }

  const totalSize = files.reduce((sum, f) => sum + f.file.size, 0)

  return (
    <div className="space-y-4">
      {/* Jenis Dokumen Selection */}
      <div>
        <label className="text-sm font-medium mb-2 block">Jenis Dokumen</label>
        <div className="flex flex-wrap gap-2">
          {JENIS_DOKUMEN_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setJenisDokumen(opt.value)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium border transition-colors',
                jenisDokumen === opt.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-all cursor-pointer',
          isDragOver
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30',
          isUploading && 'pointer-events-none opacity-60'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={handleFileInput}
          className="hidden"
        />
        <div className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full mb-3 transition-colors',
          isDragOver ? 'bg-primary/10' : 'bg-muted'
        )}>
          <Upload className={cn(
            'h-6 w-6 transition-colors',
            isDragOver ? 'text-primary' : 'text-muted-foreground'
          )} />
        </div>
        <p className="text-sm font-medium">
          {isDragOver ? 'Lepaskan file di sini' : 'Seret & lepas file, atau klik untuk memilih'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          JPG, PNG, atau PDF (maks. {formatFileSize(maxSize)} per file, maks. {maxFiles} file)
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* File Previews */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{files.length} file dipilih</span>
            <span className="text-muted-foreground">Total: {formatFileSize(totalSize)}</span>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {files.map((fp) => (
              <div
                key={fp.id}
                className="flex items-center gap-3 rounded-lg border p-2.5 bg-background"
              >
                {/* Thumbnail/Icon */}
                <div className="h-10 w-10 shrink-0 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                  {fp.preview ? (
                    <img
                      src={fp.preview}
                      alt={fp.file.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getFileIcon(fp.file)
                  )}
                </div>
                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{fp.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(fp.file.size)} • {fp.file.type.split('/')[1]?.toUpperCase()}
                  </p>
                </div>
                {/* Remove Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(fp.id)
                  }}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Mengupload... {progress}%
              </p>
            </div>
          )}

          {/* Upload Button */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                files.forEach((f) => {
                  if (f.preview) URL.revokeObjectURL(f.preview)
                })
                setFiles([])
                setError(null)
              }}
              disabled={isUploading}
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleUpload}
              disabled={isUploading || files.length === 0}
              className="gap-2"
            >
              {isUploading ? (
                <>Mengupload...</>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload {files.length} File
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
