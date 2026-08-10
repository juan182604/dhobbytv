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
  active: boolean
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
            <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer">
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
  if (ad.imageUrl) {
    return (
      <div className="overflow-hidden rounded-lg">
        <img src={ad.imageUrl} alt={ad.title} className="w-full h-auto object-contain max-h-24" loading="lazy" />
      </div>
    )
  }
  if (ad.htmlContent) {
    return (
      <div className="p-2 bg-gray-800/50 rounded-lg text-xs text-gray-300" dangerouslySetInnerHTML={{ __html: ad.htmlContent }} />
    )
  }
  return (
    <div className="p-3 bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-lg text-center">
      <p className="text-purple-300 text-sm font-medium">{ad.title}</p>
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
              {!ad.imageUrl && <div className="p-6 text-center"><p className="text-white font-medium">{ad.title}</p></div>}
            </a>
          ) : (
            <>
              {ad.imageUrl ? <img src={ad.imageUrl} alt={ad.title} className="w-full rounded-lg" /> : null}
              {!ad.imageUrl && <div className="p-6 text-center"><p className="text-white font-medium">{ad.title}</p></div>}
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
