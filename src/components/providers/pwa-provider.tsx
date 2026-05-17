'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        setRegistration(reg);

        // Check for updates periodically
        setInterval(() => {
          reg.update().catch(() => {});
        }, 60 * 60 * 1000); // Every hour

        // Listen for waiting (new version available)
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New update available
                setUpdateAvailable(true);
                toast({
                  title: 'Pembaruan Tersedia',
                  description: 'Versi baru SIService BKAD tersedia. Klik untuk memperbarui.',
                  duration: 10000,
                  action: (
                    <button
                      onClick={() => {
                        if (newWorker.state === 'installed') {
                          newWorker.postMessage({ type: 'SKIP_WAITING' });
                        }
                      }}
                      className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Perbarui
                    </button>
                  ),
                });
              }
            }
          });
        });
      } catch (error) {
        console.warn('[PWA] Service worker registration failed:', error);
      }
    };

    registerSW();

    // Listen for controller change (new SW activated)
    const handleControllerChange = () => {
      // New service worker has taken control, reload to get latest content
      if (updateAvailable) {
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [toast, updateAvailable]);

  return <>{children}</>;
}
