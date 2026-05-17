'use client'

import React, { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SignaturePad } from '@/components/shared/signature-pad'
import { PenLine, AlertCircle, Stamp } from 'lucide-react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface ESignatureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  userName?: string
  onSaveSuccess?: () => void
  /** Whether to show "Save as TTE" toggle (for pengaturan page) */
  showTTEOption?: boolean
}

export function ESignatureDialog({
  open,
  onOpenChange,
  userId,
  userName,
  onSaveSuccess,
  showTTEOption = false,
}: ESignatureDialogProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [saveAsTTE, setSaveAsTTE] = useState(true)

  const handleSave = useCallback(async (imageData: string) => {
    if (!userId) {
      toast.error('User ID tidak ditemukan')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          imageData,
          saveAsTTE: showTTEOption && saveAsTTE,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal menyimpan tanda tangan')
      }

      const data = await res.json()

      if (data.savedAsTTE) {
        toast.success('Tanda tangan berhasil disimpan dan dijadikan TTE')
      } else {
        toast.success('Tanda tangan berhasil disimpan')
      }

      onSaveSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan tanda tangan')
    } finally {
      setIsSaving(false)
    }
  }, [userId, onSaveSuccess, onOpenChange, showTTEOption, saveAsTTE])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
              <PenLine className="h-4 w-4" />
            </div>
            Tanda Tangan Elektronik (TTE)
          </DialogTitle>
          <DialogDescription>
            {userName
              ? `Buat tanda tangan elektronik untuk ${userName}`
              : 'Buat tanda tangan elektronik Anda'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p className="text-xs">
              Tanda tangan ini akan digunakan pada dokumen cetak resmi. Pastikan tanda tangan Anda jelas dan sesuai.
              Hanya satu tanda tangan aktif yang dapat digunakan per pengguna.
            </p>
          </div>

          {showTTEOption && (
            <div className="flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 p-3 dark:border-teal-800 dark:bg-teal-950/30">
              <Stamp className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <div className="flex-1">
                <Label className="text-xs font-medium text-teal-800 dark:text-teal-300">
                  Gunakan sebagai TTE (Tanda Tangan Elektronik)
                </Label>
                <p className="text-[10px] text-teal-600 dark:text-teal-400 mt-0.5">
                  Tanda tangan akan otomatis ditampilkan di semua dokumen cetak resmi
                </p>
              </div>
              <Switch
                checked={saveAsTTE}
                onCheckedChange={setSaveAsTTE}
              />
            </div>
          )}

          <SignaturePad
            onSave={handleSave}
            onCancel={() => onOpenChange(false)}
            height={200}
          />

          {isSaving && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              Menyimpan tanda tangan...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
