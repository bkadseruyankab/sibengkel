'use client'

import dynamic from 'next/dynamic'

// Lazy load Recharts to reduce initial compilation memory
const LazyBarChart = dynamic(() => import('./charts/bar-chart-wrapper').then(m => ({ default: m.BarChartWrapper })), {
  loading: () => <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">Memuat grafik...</div>,
  ssr: false,
})

const LazyHorizontalBarChart = dynamic(() => import('./charts/hbar-chart-wrapper').then(m => ({ default: m.HorizontalBarChartWrapper })), {
  loading: () => <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">Memuat grafik...</div>,
  ssr: false,
})

export { LazyBarChart, LazyHorizontalBarChart }
