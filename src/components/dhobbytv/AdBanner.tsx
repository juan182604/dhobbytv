'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface Ad {
  id: string
  title: string
  imageUrl: string | null
  linkUrl: string | null
  htmlContent: string | null
  position: string
  displayStyle: string
  bgColor: string
  textColor: string
  fontSize: string
  borderRadius: string
  active: boolean
}

const fontSizeMap: Record<string, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
}

const radiusMap: Record<string, string> = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
}

export function AdBanner({ position, context = 'main', className = '' }: { position: string; context?: string; className?: string }) {
  const [ads, setAds] = useState<Ad[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch(`/api/ads?position=${position}&context=${context}`)
      .then(r => r.json()).then(d => setAds(d.ads || [])).catch(() => {})
  }, [position, context])

  const visible = ads.filter(a => !dismissed.has(a.id))
  if (visible.length === 0) return null

  return (
    <div className={className}>
      {visible.map(ad => (
        <div key={ad.id} className="relative group">
          {ad.linkUrl ? (
            <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="block">
              <AdContent ad={ad} />
            </a>
          ) : (
            <AdContent ad={ad} />
          )}
          <button
            onClick={() => setDismissed(prev => new Set(prev).add(ad.id))}
            className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </div>
      ))}
    </div>
  )
}

function AdContent({ ad }: { ad: Ad }) {
  const textStyle = fontSizeMap[ad.fontSize] || 'text-sm'
  const radiusStyle = radiusMap[ad.borderRadius] || 'rounded-lg'

  // Image-based ad
  if (ad.imageUrl) {
    if (ad.displayStyle === 'wide') {
      return (
        <div className={`overflow-hidden ${radiusStyle}`} style={{ backgroundColor: ad.bgColor }}>
          <div className="flex items-center gap-3 px-4 py-2">
            <img src={ad.imageUrl} alt={ad.title} className="h-12 w-12 rounded object-cover shrink-0" loading="lazy" />
            <p className={`${textStyle} font-medium truncate`} style={{ color: ad.textColor }}>{ad.title}</p>
          </div>
        </div>
      )
    }
    return (
      <div className={`overflow-hidden ${radiusStyle}`} style={{ backgroundColor: ad.bgColor }}>
        <img src={ad.imageUrl} alt={ad.title} className="w-full h-auto object-contain max-h-24" loading="lazy" />
      </div>
    )
  }

  // HTML content ad
  if (ad.htmlContent) {
    return (
      <div className={`p-2 ${radiusStyle} text-xs`} style={{ backgroundColor: ad.bgColor + '80', color: ad.textColor }} dangerouslySetInnerHTML={{ __html: ad.htmlContent }} />
    )
  }

  // Gradient/styled text ad
  if (ad.displayStyle === 'minimal') {
    return (
      <div className={`px-3 py-1.5 ${radiusStyle} border border-white/10`} style={{ backgroundColor: ad.bgColor }}>
        <p className={`${textStyle} font-medium text-center`} style={{ color: ad.textColor }}>{ad.title}</p>
      </div>
    )
  }

  if (ad.displayStyle === 'neon') {
    return (
      <div className={`px-4 py-2 ${radiusStyle} border`} style={{ backgroundColor: ad.bgColor, borderColor: ad.textColor + '60', boxShadow: `0 0 10px ${ad.bgColor}80, 0 0 20px ${ad.bgColor}40` }}>
        <p className={`${textStyle} font-bold text-center`} style={{ color: ad.textColor, textShadow: `0 0 8px ${ad.textColor}60` }}>{ad.title}</p>
      </div>
    )
  }

  // Default banner style
  return (
    <div className={`p-3 bg-gradient-to-r from-purple-900/50 to-blue-900/50 ${radiusStyle} text-center`} style={{ backgroundColor: ad.bgColor }}>
      <p className={`${textStyle} font-medium`} style={{ color: ad.textColor }}>{ad.title}</p>
    </div>
  )
}

export function AdPopup({ context = 'main' }: { context?: string }) {
  const [ads, setAds] = useState<Ad[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    fetch(`/api/ads?position=popup&context=${context}`)
      .then(r => r.json()).then(d => {
        setAds(d.ads || [])
      }).catch(() => {})
  }, [context])

  useEffect(() => {
    if (ads.length === 0) return
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % ads.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [ads.length])

  if (ads.length === 0 || closed) return null
  const ad = ads[currentIndex]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-gray-900 border border-gray-700 rounded-xl max-w-md w-full mx-4 overflow-hidden">
        <button onClick={() => setClosed(true)} className="absolute top-2 right-2 z-10 w-8 h-8 bg-black/60 hover:bg-black rounded-full flex items-center justify-center">
          <X className="w-4 h-4 text-white" />
        </button>
        <div className="p-1">
          {ad.linkUrl ? (
            <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer">
              {ad.imageUrl ? <img src={ad.imageUrl} alt={ad.title} className="w-full rounded-lg" /> : null}
              {!ad.imageUrl && <div className="p-6 text-center"><p className="text-white font-medium" style={{ color: ad.textColor || '#fff' }}>{ad.title}</p></div>}
            </a>
          ) : (
            <>
              {ad.imageUrl ? <img src={ad.imageUrl} alt={ad.title} className="w-full rounded-lg" /> : null}
              {!ad.imageUrl && <div className="p-6 text-center" style={{ backgroundColor: ad.bgColor }}><p className="font-medium" style={{ color: ad.textColor || '#fff' }}>{ad.title}</p></div>}
            </>
          )}
        </div>
        {ads.length > 1 && (
          <div className="flex justify-center gap-1 pb-2">
            {ads.map((_, i) => (
              <button key={i} onClick={() => setCurrentIndex(i)} className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-purple-500 w-4' : 'bg-gray-600'}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function AdInterstitial({ context = 'main', onClose }: { context?: string; onClose: () => void }) {
  const [ads, setAds] = useState<Ad[]>([])
  const [timer, setTimer] = useState(5)

  useEffect(() => {
    fetch(`/api/ads?position=interstitial&context=${context}`)
      .then(r => r.json()).then(d => setAds(d.ads || [])).catch(() => {})
  }, [context])

  useEffect(() => {
    if (ads.length === 0) { onClose(); return }
    const interval = setInterval(() => setTimer(prev => { if (prev <= 1) { clearInterval(interval); onClose(); return 0 } return prev - 1 }), 1000)
    return () => clearInterval(interval)
  }, [ads.length, onClose])

  if (ads.length === 0) return null
  const ad = ads[0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="relative max-w-lg w-full mx-4">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 px-3 py-1 rounded-full text-sm text-gray-300">
          Cerrando en {timer}s
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
          {ad.linkUrl ? (
            <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="block">
              {ad.imageUrl ? <img src={ad.imageUrl} alt={ad.title} className="w-full" /> : <div className="p-10 text-center"><p className="text-white text-xl font-bold">{ad.title}</p></div>}
            </a>
          ) : (
            <>
              {ad.imageUrl ? <img src={ad.imageUrl} alt={ad.title} className="w-full" /> : <div className="p-10 text-center"><p className="text-white text-xl font-bold">{ad.title}</p></div>}
            </>
          )}
          <button onClick={onClose} className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors">
            Saltar anuncio
          </button>
        </div>
      </div>
    </div>
  )
}
