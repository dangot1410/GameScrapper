import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import type { DetailScrapeResult, LibraryGame, StoreItem } from '../types'

const STORE_KEY = 'launcher:store-cache'

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

type LocationState = {
  fromLibrary?: boolean
  game?: LibraryGame
  storeItem?: StoreItem
  pageUrl?: string
  searchMode?: boolean
  appId?: number
  gameName?: string
  coverImageUrl?: string
}

export function GamePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | undefined

  const [libraryGame, setLibraryGame] = useState<LibraryGame | null>(state?.game ?? null)
  const [storeItem, setStoreItem] = useState<StoreItem | null>(state?.storeItem ?? null)
  const [pageUrl, setPageUrl] = useState(state?.pageUrl ?? '')
  const [detail, setDetail] = useState<DetailScrapeResult | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [selectedDownload, setSelectedDownload] = useState('')
  const [busy, setBusy] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [activeMediaIndex, setActiveMediaIndex] = useState(0)
  const [steamDetail, setSteamDetail] = useState<DetailScrapeResult | null>(null)
  const [installProgress, setInstallProgress] = useState<{
    phase: string
    received?: number
    total?: number
    message?: string
    speedBytesPerSec?: number
    etaSeconds?: number
  } | null>(null)

  useEffect(() => {
    if (state?.searchMode && state.gameName) {
      setDetailLoading(true)
      setMsg("Recherche du jeu dans le magasin local...")
      
      void (async () => {
        try {
          if (state.appId) {
            const steam = await window.launcher.steamAppDetails(state.appId)
            if (steam?.name) {
              const sd = {
                detailPageUrl: `https://store.steampowered.com/app/${steam.id}/`,
                title: steam.name,
                coverImageUrl: steam.header_image || state.coverImageUrl || null,
                description: steam.about_the_game || steam.short_description || null,
                releaseDate: steam.release_date || null,
                developer: steam.developers?.[0] || null,
                publisher: steam.publishers?.[0] || null,
                genres: steam.genres?.length ? steam.genres : null,
                screenshots: steam.screenshots?.length ? steam.screenshots : null,
                systemRequirements: null,
                downloadCandidates: [],
              }
              setSteamDetail(sd)
              setDetail(sd)
            }
          }

          const cached = await window.launcher.storeCachedGet()
          if (cached?.items?.length) {
            const cleanSearch = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '')
            const searchQ = cleanSearch(state.gameName!)
            
            // Recherche exacte d'abord pour éviter les faux positifs comme "Eclipse" vs "Eclipse 2"
            let foundItem = cached.items.find(i => cleanSearch(i.name) === searchQ)
            
            // Si pas trouvé, recherche plus large mais avec vérification de mots entiers
            if (!foundItem) {
              const searchWords = state.gameName!.toLowerCase().split(/\s+/)
              foundItem = cached.items.find(i => {
                const itemWords = i.name.toLowerCase().split(/\s+/)
                // Vérifie si TOUS les mots de la recherche sont présents comme mots entiers dans le nom de l'item
                return searchWords.every(sw => itemWords.includes(sw))
              })
            }
            
            if (foundItem) {
              setStoreItem(foundItem)
              setPageUrl(cached.pageUrl)
              setMsg(null)
            } else {
              setMsg(`Ce jeu n'est pas dans le site fourni.`)
            }
          } else {
             setMsg("Aucune source locale configurée. Allez dans 'Magasin' pour en configurer une.")
          }
        } catch (e) {
          setMsg("Erreur lors de la recherche du jeu.")
        } finally {
          setDetailLoading(false)
        }
      })()
    }
  }, [state?.searchMode, state?.gameName, state?.appId])

  useEffect(() => {
    const unsub = window.launcher.onInstallProgress((p) => {
      setInstallProgress(p)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (state?.searchMode) return
    if (state?.storeItem && state.pageUrl) return
    if (state?.game) return
    if (!id) return
    void (async () => {
      try {
        const raw = sessionStorage.getItem(STORE_KEY)
        if (raw) {
          const data = JSON.parse(raw) as { pageUrl: string; items: StoreItem[] }
          const item = data.items.find((i) => i.id === id)
          if (item) {
            setStoreItem(item)
            setPageUrl(data.pageUrl)
            return
          }
        }
      } catch {
        /* ignore */
      }
      const cached = await window.launcher.storeCachedGet()
      if (cached?.items?.length) {
        const item = cached.items.find((i) => i.id === id)
        if (item) {
          setStoreItem(item)
          setPageUrl(cached.pageUrl)
          sessionStorage.setItem(
            STORE_KEY,
            JSON.stringify({ pageUrl: cached.pageUrl, items: cached.items }),
          )
        }
      }
    })()
  }, [id, state?.storeItem, state?.pageUrl, state?.game])

  useEffect(() => {
    if (!id) return
    void (async () => {
      const lib = await window.launcher.libraryGet()
      const g = lib.games.find((x) => x.id === id)
      if (g) setLibraryGame(g)
      
      // Check for existing download state to show progress
      try {
        const downloadState = await window.launcher.gameDownloadState(id)
        if (downloadState && downloadState.isActive && downloadState.phase === 'download') {
          setBusy(true)
          setInstallProgress({
            phase: 'download',
            received: downloadState.received,
            total: downloadState.total,
            message: 'Téléchargement en cours...',
          })
          // Resume listening to progress
          void window.launcher.gameResumeDownload(id)
        }
      } catch {
        // Ignore errors
      }
    })()
    
    // Listen for library updates to refresh game status (e.g., when launching/closing)
    const unsub = window.launcher.onLibraryUpdated((p) => {
      const updatedGame = p.games.find((x) => x.id === id)
      if (updatedGame) setLibraryGame(updatedGame)
    })
    
    return () => unsub()
  }, [id])

  const detailPageUrl = libraryGame?.detailPageUrl ?? storeItem?.detailPageUrl ?? ''

  useEffect(() => {
    if (!detailPageUrl) return
    setDetailLoading(true)
    setMsg(null)
    setDetail(null) // Reset detail to trigger loading overlay
    void (async () => {
      try {
        // Check if we have pre-fetched Steam data from paginated mode
        const hasPrefetchData = storeItem?.description || storeItem?.screenshots?.length
        
        if (hasPrefetchData) {
          // Use pre-fetched data from pagination mode
          const prefetchedDetail: DetailScrapeResult = {
            detailPageUrl: storeItem!.detailPageUrl,
            title: storeItem!.name,
            coverImageUrl: storeItem!.coverImageUrl,
            description: storeItem!.description || null,
            screenshots: storeItem!.screenshots || null,
            genres: storeItem!.genres || null,
            releaseDate: storeItem!.releaseDate || null,
            developer: storeItem!.developers?.[0] || null,
            publisher: storeItem!.publishers?.[0] || null,
            systemRequirements: null,
            downloadCandidates: [],
          }
          
          // Still try to get download links from the actual page
          try {
            const d = await window.launcher.storeScrapeDetail(detailPageUrl)
            prefetchedDetail.downloadCandidates = d.downloadCandidates
            
            // Auto-select first download if available
            if (d.downloadCandidates.length > 0 && !selectedDownload) {
              setSelectedDownload(d.downloadCandidates[0].url)
            }
          } catch {
            // Ignore errors, we'll just have no download candidates
          }
          
          setDetail(prefetchedDetail)
        } else {
          // Normal flow - scrape the detail page
          const d = await window.launcher.storeScrapeDetail(detailPageUrl)
          
          // Auto-select first download if available
          if (d.downloadCandidates.length > 0 && !selectedDownload) {
            setSelectedDownload(d.downloadCandidates[0].url)
          }
          
          // If we have storeItem, use it directly without Steam enrichment to avoid wrong game matches
          if (storeItem) {
            setDetail({
              ...d,
              title: storeItem.name,
              coverImageUrl: storeItem.coverImageUrl || d.coverImageUrl,
              description: storeItem.description || d.description,
              screenshots: storeItem.screenshots || d.screenshots,
              genres: storeItem.genres || d.genres,
              releaseDate: storeItem.releaseDate || d.releaseDate,
              developer: storeItem.developers?.[0] || d.developer,
              publisher: storeItem.publishers?.[0] || d.publisher,
            })
          } else if (steamDetail) {
            // Si on a des données Steam stockées ET qu'on n'a pas de storeItem (pour éviter les confusions de jeux)
            setDetail({
              ...d,
              title: steamDetail.title,
              description: steamDetail.description || d.description,
              coverImageUrl: steamDetail.coverImageUrl || d.coverImageUrl,
              screenshots: steamDetail.screenshots || d.screenshots,
              releaseDate: steamDetail.releaseDate || d.releaseDate,
              developer: steamDetail.developer || d.developer,
              publisher: steamDetail.publisher || d.publisher,
              genres: steamDetail.genres || d.genres,
            })
          } else {
            setDetail(d)
          }
        }
        
        // Download candidates are handled in the try blocks above
      } catch (e) {
        setMsg(e instanceof Error ? e.message : 'Impossible de charger la fiche')
      } finally {
        setDetailLoading(false)
      }
    })()
  }, [detailPageUrl, storeItem])

  const title =
    detail?.title ||
    libraryGame?.name ||
    storeItem?.name ||
    (id ? `Jeu ${id.slice(0, 8)}…` : 'Jeu')

  const effectiveStorePage = pageUrl || libraryGame?.storePageUrl || ''

  const heroImage =
    detail?.coverImageUrl ||
    libraryGame?.coverImageUrl ||
    storeItem?.coverImageUrl ||
    null

  const inLibrary = !!libraryGame?.addedToLibraryAt
  const installed = !!(libraryGame?.exePath && libraryGame.installedAt)

  async function addToLibrary() {
    if (!storeItem || !pageUrl) {
      setMsg('Données manquantes : ouvre ce jeu depuis le magasin.')
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const g = await window.launcher.libraryAddGame({
        name: storeItem.name,
        storePageUrl: pageUrl,
        detailPageUrl: storeItem.detailPageUrl,
        coverImageUrl: storeItem.coverImageUrl,
      })
      setLibraryGame(g)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Impossible d’ajouter')
    } finally {
      setBusy(false)
    }
  }

  async function downloadAndInstall() {
    if (!libraryGame || !effectiveStorePage || !selectedDownload) {
      setMsg('Choisis un lien de téléchargement ou ajoute le jeu à la bibliothèque.')
      return
    }
    setBusy(true)
    setMsg(null)
    setIsPaused(false)
    setInstallProgress(null)
    try {
      const g = await window.launcher.gameInstall({
        id: libraryGame.id,
        name: title,
        storePageUrl: effectiveStorePage,
        detailPageUrl: libraryGame.detailPageUrl,
        downloadUrl: selectedDownload,
        coverImageUrl: heroImage,
      })
      setLibraryGame(g)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Téléchargement impossible')
    } finally {
      setBusy(false)
      setIsPaused(false)
      setInstallProgress(null)
    }
  }

  async function togglePause() {
    if (isPaused) {
      await window.launcher.gameInstallResume()
      setIsPaused(false)
    } else {
      await window.launcher.gameInstallPause()
      setIsPaused(true)
    }
  }

  async function cancelDownload() {
    if (confirm('Arrêter le téléchargement en cours ?')) {
      await window.launcher.gameInstallCancel()
    }
  }

  async function launch() {
    if (!id) return
    setBusy(true)
    setMsg(null)
    try {
      await window.launcher.gameLaunch(id)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Lancement impossible')
    } finally {
      setBusy(false)
    }
  }

  async function uninstallFiles() {
    if (!id) return
    if (!confirm('Supprimer les fichiers installés ? Le jeu restera dans ta bibliothèque, tu pourras le retélécharger plus tard.')) return
    setBusy(true)
    setMsg(null)
    try {
      const g = await window.launcher.gameUninstallFiles(id)
      setLibraryGame(g)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setBusy(false)
    }
  }

  async function removeFromLibrary() {
    if (!id) return
    const confirmMsg = installed
      ? 'Retirer ce jeu de la bibliothèque ? Les fichiers installés seront supprimés définitivement.'
      : 'Retirer ce jeu de la bibliothèque ?'
    if (!confirm(confirmMsg)) return
    setBusy(true)
    setMsg(null)
    try {
      await window.launcher.gameUninstall(id)
      setLibraryGame(null)
      navigate('/library')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setBusy(false)
    }
  }

  if (!id) {
    return (
      <div className="p-8">
        <p className="text-steam-muted">Identifiant manquant.</p>
        <Link to="/store" className="mt-4 inline-block text-steam-accent">
          Magasin
        </Link>
      </div>
    )
  }

  const showAddButton = !inLibrary && !!storeItem && !!effectiveStorePage
  const showDownloadBlock = inLibrary && !installed
  const candidates = detail?.downloadCandidates ?? []

  function formatSpeed(bytesPerSec?: number) {
    if (!bytesPerSec) return ''
    if (bytesPerSec > 1024 * 1024) return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} Mo/s`
    return `${(bytesPerSec / 1024).toFixed(1)} Ko/s`
  }

  function formatEta(seconds?: number) {
    if (!seconds) return ''
    if (seconds > 3600) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
    if (seconds > 60) return `${Math.floor(seconds / 60)} min ${Math.floor(seconds % 60)}s`
    return `${Math.floor(seconds)}s`
  }

  return (
    <div className="min-h-full bg-steam-bg">
      {/* Background Hero Blur */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-20 blur-3xl"
        style={{
          backgroundImage: heroImage ? `url(${heroImage})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* Loading Overlay */}
        {detailLoading && !detail && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-steam-bg/80 backdrop-blur-sm">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-steam-accent border-t-transparent" />
            <p className="mt-4 text-sm font-bold uppercase tracking-widest text-white">Recherche des informations...</p>
          </div>
        )}

        {/* Breadcrumbs */}
        <div className="mb-4 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-steam-muted">
          <Link to="/store" className="hover:text-white transition">Magasin</Link>
          <span>{'>'}</span>
          <span className="text-steam-fg truncate">{title}</span>
        </div>

        {/* Game Title */}
        <h1 className="mb-6 text-2xl font-semibold text-white sm:text-3xl">{title}</h1>

        {/* Hero Section (Steam Style) */}
        {detail ? (
          <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
            {/* Left: Gallery */}
            <div className="flex flex-col gap-2 min-w-0">
              <div className="relative aspect-video w-full overflow-hidden bg-black/60 shadow-xl border border-white/5 rounded-sm">
                {detail.screenshots && detail.screenshots.length > 0 ? (
                  <img 
                    src={detail.screenshots[activeMediaIndex] || heroImage || ''} 
                    alt="Game Media" 
                    className="h-full w-full object-contain"
                  />
                ) : heroImage ? (
                  <img src={heroImage} alt={title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-steam-muted">Pas d'images</div>
                )}
              </div>
              
              {/* Gallery Thumbnails */}
              {detail.screenshots && detail.screenshots.length > 0 && (
                <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-steam-border h-16">
                  {detail.screenshots.map((src, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveMediaIndex(i)}
                      className={`flex-none w-28 h-full rounded-sm overflow-hidden border-2 transition ${
                        activeMediaIndex === i ? 'border-steam-accent' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={src} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Quick Info Panel */}
            <div className="flex flex-col gap-4 bg-black/30 p-4 border border-white/5 rounded-sm h-full overflow-hidden">
              <div className="flex-shrink-0">
                <img 
                  src={heroImage || ''} 
                  alt="Main Cover" 
                  className="w-full aspect-[460/215] object-cover rounded-sm shadow-md"
                />
              </div>
              
              <div className="flex flex-col gap-3 text-xs overflow-hidden">
                <p className="line-clamp-6 text-steam-fg leading-relaxed opacity-90 overflow-hidden">
                  {detail.description ? detail.description.replace(/<[^>]*>/g, '').slice(0, 300) : 'Aucune description disponible.'}...
                </p>

                <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
                  {detail.releaseDate && (
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-steam-muted whitespace-nowrap">DATE DE PARUTION :</span>
                      <span className="text-steam-fg truncate">{detail.releaseDate}</span>
                    </div>
                  )}
                  {detail.developer && (
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-steam-muted whitespace-nowrap">DÉVELOPPEMENT :</span>
                      <span className="text-steam-accent hover:underline cursor-pointer truncate">{detail.developer}</span>
                    </div>
                  )}
                  {detail.publisher && (
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-steam-muted whitespace-nowrap">ÉDITION :</span>
                      <span className="text-steam-accent hover:underline cursor-pointer truncate">{detail.publisher}</span>
                    </div>
                  )}
                </div>

                {detail.genres && detail.genres.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {detail.genres.slice(0, 4).map(g => (
                      <span key={g} className="bg-steam-accent/10 text-steam-accent px-2 py-0.5 rounded-sm hover:bg-steam-accent/20 transition cursor-default text-[10px] whitespace-nowrap">
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : !detailLoading && (
          <div className="mb-8 flex flex-col items-center justify-center py-20 rounded-sm bg-black/20 border border-white/5 text-steam-muted">
            <p className="text-lg font-medium text-white/40 uppercase tracking-widest">Informations non disponibles</p>
            <p className="text-xs mt-2 opacity-60">Le serveur distant n'a pas répondu ou la page est protégée.</p>
          </div>
        )}

        {/* Notifications */}
        {msg && (
          <div className="mb-6 rounded-sm border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-100">
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              <div>
                <p className="font-bold">Erreur de chargement</p>
                <p className="opacity-80">{msg}</p>
              </div>
              <button 
                onClick={() => window.location.reload()}
                className="ml-auto rounded-sm bg-red-500/20 px-3 py-1 text-xs font-bold hover:bg-red-500/40 transition"
              >
                Réessayer
              </button>
            </div>
          </div>
        )}

        {detailLoading && (
          <div className="mb-8 flex items-center gap-2 text-steam-muted">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-steam-accent border-t-transparent" />
            <span className="text-[11px] uppercase tracking-widest font-bold">Mise à jour des informations...</span>
          </div>
        )}

        {/* Download & Actions Section */}
        <div className="mb-10 rounded-sm bg-gradient-to-r from-steam-panel/80 to-steam-panel/40 p-6 border border-white/5">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex-1 min-w-[300px]">
              <h2 className="text-xl font-medium text-white mb-2">Jouer à {title}</h2>
              {showDownloadBlock ? (
                <p className="text-xs text-steam-muted">
                  Sélectionnez un serveur de téléchargement ci-dessous pour commencer l'installation.
                </p>
              ) : (
                <p className="text-xs text-steam-muted">
                  Ce jeu est déjà présent dans votre bibliothèque locale.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {showAddButton && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void addToLibrary()}
                  className="rounded-sm bg-steam-accent px-8 py-2.5 text-sm font-semibold text-steam-bg transition hover:brightness-110 disabled:opacity-50 shadow-lg"
                >
                  {busy ? 'Traitement...' : 'Ajouter à la bibliothèque'}
                </button>
              )}

              {showDownloadBlock && candidates.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <select
                      value={selectedDownload}
                      onChange={(e) => setSelectedDownload(e.target.value)}
                      className="rounded-sm border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-steam-accent focus:outline-none"
                    >
                      {candidates.map((c) => {
                         let hostname = ''
                         try {
                           hostname = new URL(c.url).hostname
                         } catch {
                           hostname = 'Serveur'
                         }
                         return (
                           <option key={c.url} value={c.url}>
                             {c.label} ({hostname})
                           </option>
                         )
                       })}
                    </select>
                    <button
                      type="button"
                      disabled={busy || !selectedDownload}
                      onClick={() => void downloadAndInstall()}
                      className="rounded-sm bg-[#5c7e10] px-8 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50 shadow-lg"
                    >
                      {busy ? 'Installation...' : 'Installer'}
                    </button>
                  </div>
                </div>
              )}

              {installed && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void launch()}
                  className="rounded-sm bg-[#5c7e10] px-12 py-3 text-sm font-bold text-white transition hover:brightness-110 shadow-lg uppercase tracking-wider"
                >
                  Jouer
                </button>
              )}
            </div>
          </div>

          {/* Detailed Progress UI */}
          {busy && installProgress && (
            <div className="mt-6 border-t border-white/10 pt-6">
              <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-steam-accent">
                <div className="flex items-center gap-2">
                  <span>
                    {isPaused ? 'EN PAUSE' : (
                      <>
                        {installProgress.phase === 'resolve' && 'Résolution des liens'}
                        {installProgress.phase === 'download' && 'Téléchargement en cours'}
                        {installProgress.phase === 'hosted' && 'En attente du site'}
                        {installProgress.phase === 'extract' && 'Extraction des fichiers'}
                      </>
                    )}
                  </span>
                </div>
                {installProgress.phase === 'download' && !isPaused && installProgress.received && installProgress.total && (
                  <span className="text-white">
                    {formatSpeed(installProgress.speedBytesPerSec)} • {formatEta(installProgress.etaSeconds)} restant
                  </span>
                )}
              </div>
              
              <div className="h-2 w-full overflow-hidden rounded-full bg-black/60 p-[1px]">
                <div
                  className={`h-full transition-all duration-300 ${isPaused ? 'bg-amber-500' : 'bg-gradient-to-r from-steam-accent to-blue-400'}`}
                  style={{ 
                    width: installProgress.phase === 'download' && installProgress.received && installProgress.total 
                      ? `${(installProgress.received / installProgress.total) * 100}%` 
                      : '5%' 
                  }}
                />
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-[10px] text-steam-muted italic truncate max-w-[60%]">
                  {isPaused ? 'Le téléchargement est en pause.' : (installProgress.message || 'Préparation...')}
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => void togglePause()}
                    className="flex items-center gap-1 rounded-sm border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold text-white hover:bg-white/10 transition uppercase"
                  >
                    {isPaused ? (
                      <><svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> Reprendre</>
                    ) : (
                      <><svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> Pause</>
                    )}
                  </button>
                  <button 
                    onClick={() => void cancelDownload()}
                    className="flex items-center gap-1 rounded-sm border border-red-900/30 bg-red-950/20 px-3 py-1 text-[10px] font-bold text-red-400 hover:bg-red-950/40 transition uppercase"
                  >
                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg> Arrêter
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content Tabs Style Section */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_300px]">
          {/* Main Content: Description & Requirements */}
          <div>
            {detail?.description && (
              <div className="mb-10">
                <h3 className="mb-4 text-xs font-bold text-white uppercase tracking-widest border-b border-white/10 pb-2">À propos de ce jeu</h3>
                {detail.description.includes('<') ? (
                  <div 
                    className="text-sm leading-relaxed text-steam-muted prose prose-invert max-w-none prose-p:mb-4 prose-img:rounded-sm prose-a:text-steam-accent"
                    dangerouslySetInnerHTML={{ __html: detail.description }}
                  />
                ) : (
                  <div className="text-sm leading-relaxed text-steam-muted whitespace-pre-wrap">
                    {detail.description}
                  </div>
                )}
              </div>
            )}

            {detail?.systemRequirements && (
              <div className="mb-10">
                <h3 className="mb-4 text-xs font-bold text-white uppercase tracking-widest border-b border-white/10 pb-2">Configuration requise</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-[11px] text-steam-muted leading-relaxed">
                  {detail.systemRequirements.minimum && (
                    <div>
                      <h4 className="font-bold text-steam-fg mb-3 opacity-60">MINIMALE :</h4>
                      <div className="whitespace-pre-wrap">{detail.systemRequirements.minimum}</div>
                    </div>
                  )}
                  {detail.systemRequirements.recommended && (
                    <div>
                      <h4 className="font-bold text-steam-fg mb-3 opacity-60">RECOMMANDÉE :</h4>
                      <div className="whitespace-pre-wrap">{detail.systemRequirements.recommended}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar: Library Actions & Secondary Info */}
          <div className="flex flex-col gap-6">
            {inLibrary && (
              <div className="flex flex-col gap-2 rounded-sm bg-black/20 p-4 border border-white/5">
                <h4 className="text-[10px] font-bold text-steam-muted uppercase tracking-wider mb-2">Gestion bibliothèque</h4>
                
                {installed && (
                  <button
                    onClick={() => void uninstallFiles()}
                    className="w-full rounded-sm border border-white/10 px-3 py-2 text-left text-[11px] text-steam-fg hover:bg-white/5 transition"
                  >
                    Libérer de l'espace disque
                  </button>
                )}
                
                <button
                  onClick={() => void removeFromLibrary()}
                  className="w-full rounded-sm border border-red-900/30 px-3 py-2 text-left text-[11px] text-red-400 hover:bg-red-950/20 transition"
                >
                  Supprimer de la collection
                </button>
              </div>
            )}

            <div className="rounded-sm bg-black/20 p-4 border border-white/5">
              <h4 className="text-[10px] font-bold text-steam-muted uppercase tracking-wider mb-2">Détails de la source</h4>
              <div className="flex flex-col gap-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-steam-muted">Type :</span>
                  <span className="text-steam-fg">Application</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-steam-muted">Éditeur original :</span>
                  <span className="text-steam-accent truncate ml-2">
                    {storeSourceLabel(detailPageUrl)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {!storeItem && !libraryGame && !detailLoading && (
          <p className="mt-12 text-center text-sm text-steam-muted border-t border-white/5 pt-8">
            Aucune donnée disponible. <Link className="text-steam-accent hover:underline" to="/store">Retourner au magasin</Link>
          </p>
        )}
      </div>
    </div>
  )
}
