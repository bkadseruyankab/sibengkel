'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

export function DynamicFavicon() {
  const { data: settings, dataUpdatedAt } = useQuery({
    queryKey: ['app-favicon'],
    queryFn: async () => {
      const res = await fetch('/api/pengaturan')
      return res.json()
    },
    staleTime: 60000,
  })

  useEffect(() => {
    if (settings?.app_favicon) {
      // Update favicon dynamically
      // Add cache-busting so browser fetches fresh favicon after upload
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null
      if (!link) {
        link = document.createElement('link')
        link.rel = 'icon'
        document.head.appendChild(link)
      }
      const faviconUrl = settings.app_favicon.includes('?')
        ? settings.app_favicon
        : settings.app_favicon + '?t=' + dataUpdatedAt
      link.href = faviconUrl
    }

    if (settings?.app_name) {
      document.title = settings.app_name
    }
  }, [settings?.app_favicon, settings?.app_name, dataUpdatedAt])

  return null
}
