import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import logoUrl from '../../Images/gslogo.png'

function formatBytes(n: number): string {
  if (n < 1024) return `${n} o`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`
  return `${(n / 1024 / 1024).toFixed(1)} Mo`
}

function formatSpeed(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec)}/s`
}

function formatEta(seconds: number): string {
  if (seconds < 60) return `~${Math.ceil(seconds)} s`
  const m = Math.floor(seconds / 60)
  const s = Math.ceil(seconds % 60)
  return s > 0 ? `~${m} min ${s} s` : `~${m} min`
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded px-4 py-2 text-sm font-semibold tracking-wide transition-colors uppercase',
    isActive
      ? 'text-white'
      : 'text-steam-muted hover:text-white',
  ].join(' ')

export function Layout({ children }: { children: ReactNode }) {
  const [logoOk, setLogoOk] = useState(true)
  const [storeProgress, setStoreProgress] = useState<{
    percent: number
    label: string
  } | null>(null)
  const [installProgress, setInstallProgress] = useState<{
    percent: number
    label: string
    received?: number
    total?: number
    speedBytesPerSec?: number
    etaSeconds?: number
    indeterminate?: boolean
  } | null>(null)
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [isDownloadOpen, setIsDownloadOpen] = useState(false)

  useEffect(() => {
    return window.launcher.onStoreProgress((p) => {
      if (p.phase === 'fetch') {
        setStoreProgress({ percent: 5, label: 'Téléchargement de la page liste…' })
      } else if (p.phase === 'parse') {
        setStoreProgress({ percent: 15, label: `${p.count} lien(s) détecté(s), analyse…` })
      } else if (p.phase === 'covers') {
        const pct = 15 + (p.total ? Math.round((p.current / p.total) * 78) : 0)
        setStoreProgress({
          percent: Math.min(93, pct),
          label: `Jaquettes : ${p.current} / ${p.total}`,
        })
      } else if (p.phase === 'save') {
        setStoreProgress({ percent: 96, label: 'Enregistrement sur le disque…' })
      } else {
        setStoreProgress(null)
      }
    })
  }, [])

  useEffect(() => {
    return window.launcher.onInstallProgress((p) => {
      if (p.phase === 'done') {
        setInstallProgress(null)
        return
      }
      if (p.phase === 'hosted') {
        setInstallProgress({
          percent: 0,
          indeterminate: true,
          label: p.message || 'En attente du site…',
        })
        return
      }
      if (p.phase === 'resolve') {
        setInstallProgress({ percent: 8, label: p.message || 'Résolution du lien…' })
        return
      }
      if (p.phase === 'download' && p.received !== undefined) {
        const t = p.total && p.total > 0 ? p.total : p.received
        const pct = Math.min(88, 10 + Math.round((p.received / t) * 78))
        setInstallProgress({
          percent: pct,
          label: p.message || 'Téléchargement…',
          received: p.received,
          total: p.total,
          speedBytesPerSec: p.speedBytesPerSec,
          etaSeconds: p.etaSeconds,
        })
        return
      }
      if (p.phase === 'extract') {
        setInstallProgress({ percent: 94, label: p.message || 'Extraction…' })
      }
    })
  }, [])

  // Check for active downloads on mount (for persistence across page changes)
  useEffect(() => {
    const checkActiveDownloads = async () => {
      try {
        const activeDownloads = await window.launcher.gameActiveDownloads()
        if (activeDownloads && activeDownloads.length > 0) {
          // Show the most recent active download
          const download = activeDownloads[0]
          if (download.phase === 'download') {
            const pct = Math.min(88, 10 + Math.round((download.received / download.total) * 78))
            setInstallProgress({
              percent: pct,
              label: 'Téléchargement…',
              received: download.received,
              total: download.total,
            })
          }
        }
      } catch {
        // Ignore errors
      }
    }
    void checkActiveDownloads()
  }, [])

  return (
    <div className="relative min-h-screen flex text-steam-fg">
      <div className="app-bg" />
      
      <aside className="relative z-20 w-64 border-r border-white/10 bg-black/40 backdrop-blur-md flex flex-col">
        <div className="p-2 flex flex-col items-center">
          <NavLink to="/library" className="flex items-center justify-center -mt-4">
            {logoOk ? (
              <div className="h-28 w-28 flex items-center justify-center">
                <img
                  src={logoUrl}
                  alt=""
                  className="max-h-full max-w-full object-contain select-none"
                  draggable={false}
                  onError={() => setLogoOk(false)}
                />
              </div>
            ) : (
              <div className="h-28 w-28 rounded bg-gradient-to-br from-steam-accent to-blue-500" />
            )}
          </NavLink>
        </div>

        <nav className="flex-1 flex flex-col gap-2 px-4 py-2">
          <div className="text-xs font-bold uppercase tracking-wider text-steam-muted mb-2 px-2">Menu</div>
          
          <NavLink to="/library" className={({ isActive }) => `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${isActive ? 'bg-steam-card text-white shadow-lg' : 'text-steam-muted hover:bg-white/5 hover:text-white'}`}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Bibliothèque
          </NavLink>

          <NavLink to="/store" className={({ isActive }) => `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${isActive ? 'bg-steam-card text-white shadow-lg' : 'text-steam-muted hover:bg-white/5 hover:text-white'}`}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Magasin
          </NavLink>

          <NavLink to="/sources" className={({ isActive }) => `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${isActive ? 'bg-steam-card text-white shadow-lg' : 'text-steam-muted hover:bg-white/5 hover:text-white'}`}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            Sources
          </NavLink>
        </nav>

        {(storeProgress || installProgress) && (
          <div className="px-4 pb-3">
            <div className="rounded-xl border border-white/10 bg-black/25 p-3">
              {storeProgress && (
                <div className="mb-3">
                  <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                    <span className="truncate text-steam-fg">{storeProgress.label}</span>
                    <span className="shrink-0 text-steam-muted">{storeProgress.percent}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-steam-bg">
                    <div
                      className="h-full rounded-full bg-steam-accent transition-[width] duration-300"
                      style={{ width: `${storeProgress.percent}%` }}
                    />
                  </div>
                </div>
              )}

              {installProgress && (
                <div>
                  <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                    <span className="truncate text-steam-fg">{installProgress.label || 'Téléchargement…'}</span>
                    {!installProgress.indeterminate && (
                      <span className="shrink-0 text-steam-muted">{installProgress.percent}%</span>
                    )}
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-steam-bg">
                    <div
                      className={`h-full rounded-full bg-steam-accent ${
                        installProgress.indeterminate ? 'animate-pulse' : 'transition-[width] duration-300'
                      }`}
                      style={{
                        width: installProgress.indeterminate ? '30%' : `${installProgress.percent}%`,
                      }}
                    />
                  </div>
                  {!installProgress.indeterminate &&
                    installProgress.received != null &&
                    installProgress.total != null &&
                    installProgress.total > 0 && (
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-steam-muted">
                        <span>
                          {formatBytes(installProgress.received)} / {formatBytes(installProgress.total)}
                        </span>
                        {installProgress.speedBytesPerSec != null && installProgress.speedBytesPerSec > 0 && (
                          <span>{formatSpeed(installProgress.speedBytesPerSec)}</span>
                        )}
                        {installProgress.etaSeconds != null &&
                          installProgress.etaSeconds > 0 &&
                          installProgress.etaSeconds < 86400 && <span>{formatEta(installProgress.etaSeconds)} restantes</span>}
                      </div>
                    )}
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => void window.launcher.gameInstallCancel()}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-steam-muted transition hover:bg-white/10 hover:text-white"
                    >
                      Annuler le téléchargement
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-auto p-4 border-t border-white/10">
          <NavLink to="/settings" className={({ isActive }) => `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${isActive ? 'bg-steam-card text-white shadow-lg' : 'text-steam-muted hover:bg-white/5 hover:text-white'}`}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Paramètres
          </NavLink>
        </div>
      </aside>

      <div className="relative z-10 flex flex-1 flex-col h-screen overflow-hidden">
        <header className="relative z-30 flex items-center justify-end px-8 py-4 bg-black/20 backdrop-blur-sm border-b border-white/5">
          <div className="flex items-center gap-6">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsDownloadOpen((v) => !v)
                  setIsNotifOpen(false)
                }}
                className={`flex items-center gap-3 bg-steam-panel/50 border rounded-full px-4 py-1.5 transition-all hover:bg-steam-panel ${
                  installProgress ? 'border-steam-accent' : 'border-steam-border opacity-80 hover:opacity-100'
                }`}
              >
                <div className="relative h-6 w-6">
                  <svg
                    className={`h-full w-full ${installProgress ? 'text-steam-accent animate-pulse' : 'text-steam-muted'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  {installProgress && !installProgress.indeterminate && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-[8px] font-bold text-white">{installProgress.percent}%</div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider leading-none">
                    Téléchargements
                  </span>
                  {installProgress?.speedBytesPerSec && (
                    <span className="text-[9px] text-steam-muted leading-none mt-0.5">
                      {formatSpeed(installProgress.speedBytesPerSec)}
                    </span>
                  )}
                </div>
              </button>

              {isDownloadOpen && (
                <div className="absolute right-0 mt-3 w-80 rounded-xl bg-steam-panel border border-steam-border shadow-2xl animate-in fade-in z-50 overflow-hidden">
                  <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest">Téléchargements</h3>
                    <button
                      type="button"
                      onClick={() => setIsDownloadOpen(false)}
                      className="text-steam-muted hover:text-white"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="p-4 max-h-96 overflow-y-auto">
                    {installProgress ? (
                      <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-white font-bold truncate">{installProgress.label}</span>
                            {!installProgress.indeterminate && (
                              <span className="text-steam-accent font-bold">{installProgress.percent}%</span>
                            )}
                          </div>
                          <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-steam-accent ${installProgress.indeterminate ? 'animate-pulse' : 'transition-[width] duration-300'}`}
                              style={{
                                width: installProgress.indeterminate ? '30%' : `${installProgress.percent}%`,
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-steam-muted">
                            <span>
                              {installProgress.speedBytesPerSec ? formatSpeed(installProgress.speedBytesPerSec) : '--'}
                            </span>
                            <span>{installProgress.etaSeconds ? `${formatEta(installProgress.etaSeconds)} restant` : ''}</span>
                          </div>
                        </div>
                        <div className="pt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => void window.launcher.gameInstallCancel()}
                            className="flex-1 py-1.5 rounded bg-red-500/10 text-red-400 text-[10px] font-bold uppercase hover:bg-red-500/20 transition"
                          >
                            Arrêter
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <svg className="w-10 h-10 text-steam-muted mx-auto mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <p className="text-xs text-steam-muted">Aucun téléchargement en cours</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsNotifOpen((v) => !v)
                  setIsDownloadOpen(false)
                }}
                className={`text-steam-muted hover:text-white transition-colors relative group p-1 ${isNotifOpen ? 'text-white' : ''}`}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-3 w-72 rounded-xl bg-steam-panel border border-steam-border shadow-2xl animate-in fade-in z-50 overflow-hidden">
                  <div className="p-4 border-b border-white/10 bg-black/20 flex justify-between items-center">
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest">Notifications</h3>
                    <button
                      type="button"
                      onClick={() => setIsNotifOpen(false)}
                      className="text-steam-muted hover:text-white"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="p-6 text-center">
                    <p className="text-xs text-steam-muted italic">Vous n'avez aucune notification</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  )
}
