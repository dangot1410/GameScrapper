import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { LibraryGame } from '../types'

function storeSourceLabel(url: string): string {
  try {
    const u = new URL(url)
    let host = u.hostname.replace(/^www\./, '')
    if (host === 'store.steampowered.com') return 'Steam'
    if (host.includes('steam')) return 'Steam'
    return host
  } catch {
    return ''
  }
}

function formatPlayTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h <= 0) return `${m} min`
  if (m <= 0) return `${h} h`
  return `${h} h ${m} min`
}

export function LibraryPage() {
  const [games, setGames] = useState<LibraryGame[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const lib = await window.launcher.libraryGet()
      setGames(lib.games)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    return window.launcher.onLibraryUpdated((p) => {
      setGames(p.games)
    })
  }, [])

  useEffect(() => {
    const hasRunning = games.some((g) => !!g.currentSessionStartedAt)
    if (!hasRunning) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [games])

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-white">Bibliothèque</h2>
          <p className="mt-1 text-sm text-steam-muted">
            Lance tes jeux installés et garde un historique du temps de jeu.
          </p>
        </div>
        <Link
          to="/store"
          className="inline-flex items-center justify-center rounded-lg bg-steam-accent px-4 py-2 text-sm font-semibold text-steam-bg transition hover:brightness-110"
        >
          Découvrir des jeux
        </Link>
      </div>

      {loading && <p className="text-steam-muted">Chargement…</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!loading && games.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-12 text-center backdrop-blur">
          <p className="text-steam-muted">Aucun jeu dans ta bibliothèque.</p>
          <Link to="/store" className="mt-4 inline-block text-steam-accent hover:underline">
            Ouvrir le magasin
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {games.map((g) => {
          const installed = !!(g.exePath && g.installedAt)
          const basePlay = g.playTimeSeconds || 0
          const runningExtra = g.currentSessionStartedAt
            ? Math.max(0, Math.floor((now - new Date(g.currentSessionStartedAt).getTime()) / 1000))
            : 0
          const totalPlay = basePlay + runningExtra
          async function uninstallFiles(e: React.MouseEvent) {
            e.preventDefault()
            e.stopPropagation()
            if (!confirm('Supprimer les fichiers ? Le jeu restera dans la bibliothèque.')) return
            try {
              await window.launcher.gameUninstallFiles(g.id)
              await refresh()
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Erreur')
            }
          }
          async function removeFromLibrary(e: React.MouseEvent) {
            e.preventDefault()
            e.stopPropagation()
            if (!confirm(`Retirer « ${g.name} » de la bibliothèque ?${installed ? '\n\nLes fichiers seront supprimés.' : ''}`)) return
            try {
              await window.launcher.gameUninstall(g.id)
              await refresh()
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Erreur')
            }
          }
          return (
            <Link
              key={g.id}
              to={`/game/${g.id}`}
              state={{ fromLibrary: true, game: g }}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-white/10 bg-black/20 backdrop-blur transition hover:border-steam-accent/50 hover:shadow-lg hover:shadow-black/40"
            >
              <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition group-hover:opacity-100">
                {installed && (
                  <button
                    type="button"
                    onClick={uninstallFiles}
                    className="rounded bg-black/60 p-1.5 text-steam-muted hover:bg-amber-900/80 hover:text-amber-200"
                    title="Désinstaller (garder dans la bibliothèque)"
                    aria-label="Désinstaller"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={removeFromLibrary}
                  className="rounded bg-black/60 p-1.5 text-steam-muted hover:bg-red-900/80 hover:text-white"
                  title="Retirer de la bibliothèque"
                  aria-label="Retirer de la bibliothèque"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="relative aspect-[460/215] w-full overflow-hidden bg-black/40">
                {g.coverImageUrl ? (
                  <img
                    src={g.coverImageUrl}
                    alt=""
                    className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-steam-muted">
                    {g.name.slice(0, 1)}
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 to-transparent px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={
                        installed
                          ? 'text-xs font-semibold text-green-300'
                          : 'text-xs font-semibold text-amber-200'
                      }
                    >
                      {installed ? 'Installé' : 'À télécharger'}
                    </span>
                    {g.currentSessionStartedAt ? (
                      <>
                        <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                          En jeu • {formatPlayTime(runningExtra)}
                        </span>
                        <button
                          onClick={async (e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (!confirm(`Fermer ${g.name} ?`)) return
                            try {
                              await window.launcher.gameUninstall(g.id)
                              await refresh()
                            } catch (err) {
                              setError(err instanceof Error ? err.message : 'Erreur')
                            }
                          }}
                          className="rounded bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-red-700 transition-all"
                        >
                          FERMER
                        </button>
                      </>
                    ) : (
                      <span className="text-xs font-semibold text-amber-200">
                        Installé
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-3">
                <h3 className="line-clamp-2 font-medium text-white group-hover:text-steam-accent">
                  {g.name}
                </h3>
                {(g.storePageUrl || g.detailPageUrl) && (
                  <p className="mt-1 text-[11px] text-steam-muted" title={g.storePageUrl || g.detailPageUrl}>
                    {storeSourceLabel(g.storePageUrl || g.detailPageUrl)}
                  </p>
                )}
                <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-steam-muted">
                  <span>Temps de jeu : {formatPlayTime(totalPlay)}</span>
                  {g.lastPlayedAt && (
                    <span className="shrink-0" title={new Date(g.lastPlayedAt).toLocaleString('fr-FR')}>
                      Dernière fois
                    </span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
