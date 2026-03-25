import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { StoreItem } from '../types'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type SourceConfig = {
  id: string
  name: string
  url: string
  type: 'single' | 'paginated'
  pageCount?: number
  createdAt: string
  gameCount?: number
  lastUpdated?: string
}

// Store items per source in memory (session only)
const sourceItemsMap = new Map<string, StoreItem[]>()

// Sortable source item component
function SortableSourceItem({ source, isActive, isDragging, onRefresh, onDelete, onSelect }: { 
  source: SourceConfig
  isActive: boolean
  isDragging: boolean
  onRefresh: (source: SourceConfig) => void
  onDelete: (sourceId: string) => void
  onSelect: (sourceId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: source.id })
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  
  const formatSourceInfo = (source: SourceConfig) => {
    if (source.type === 'paginated' && source.pageCount) {
      return `(${source.pageCount} pages)`
    }
    return '(page unique)'
  }
  
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Jamais'
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  
  const sourceItemCount = sourceItemsMap.get(source.id)?.length || source.gameCount || 0
  
  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 rounded-xl border ${
        isActive ? 'bg-steam-accent/10 border-steam-accent/50' : 'bg-black/20 border-steam-border'
      }`}
    >
      <div 
        className="flex-1 cursor-pointer flex items-center gap-2"
        onClick={() => onSelect(source.id)}
      >
        {/* Drag handle */}
        <div 
          {...attributes} 
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-steam-muted hover:text-steam-accent"
          title="Faire glisser pour réorganiser"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"/>
          </svg>
        </div>
        
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-medium text-white">{source.name}</span>
            <span className="text-xs text-steam-muted">{formatSourceInfo(source)}</span>
            <span className="text-xs text-steam-accent">{sourceItemCount} jeux</span>
            <span className="text-xs text-steam-muted">Actualisé: {formatDate(source.lastUpdated)}</span>
          </div>
          <div className="text-xs text-steam-muted truncate max-w-md mt-1">{source.url}</div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => onRefresh(source)}
          disabled={isDragging}
          className="p-2 rounded-lg bg-black/40 text-steam-muted hover:text-steam-accent hover:bg-black/60 transition-all"
          title="Actualiser"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        
        <button
          onClick={() => onDelete(source.id)}
          disabled={isDragging}
          className="p-2 rounded-lg bg-black/40 text-steam-muted hover:text-red-400 hover:bg-black/60 transition-all"
          title="Supprimer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export function StorePage() {
  const [localItems, setLocalItems] = useState<StoreItem[]>([])
  const [localSearch, setLocalSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [isScraping, setIsScraping] = useState(false)
  
  // Sources management
  const [sources, setSources] = useState<SourceConfig[]>([])
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null)
  const [showAllSources, setShowAllSources] = useState(true)
  
  // Add source form
  const [newSourceName, setNewSourceName] = useState('')
  const [newSourceUrl, setNewSourceUrl] = useState('')
  const [isPaginatedMode, setIsPaginatedMode] = useState(false)
  const [pageCount, setPageCount] = useState(3)
  
  // Progress
  const [progressPhase, setProgressPhase] = useState<string>('')
  const [progressCurrent, setProgressCurrent] = useState(0)
  const [progressTotal, setProgressTotal] = useState(0)
  
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Load sources
  useEffect(() => {
    void (async () => {
      try {
        // Load sources
        const loadedSources = await window.launcher.sourcesGetAll()
        setSources(loadedSources)
        
        // Load settings to get active source
        const settings = await window.launcher.settingsGet()
        if (settings.activeSourceId) {
          setActiveSourceId(settings.activeSourceId)
          
          // Load items for active source from backend
          const sourceData = await window.launcher.storeGetSourceData(settings.activeSourceId)
          if (sourceData) {
            sourceItemsMap.set(settings.activeSourceId, sourceData.items)
            setLocalItems(sourceData.items)
            setShowAllSources(false)
          }
        } else {
          // Load all items
          const allSourcesData = await window.launcher.storeGetAllSourcesData()
          const allItems: StoreItem[] = []
          for (const sourceData of allSourcesData) {
            sourceItemsMap.set(sourceData.sourceId, sourceData.items)
            allItems.push(...sourceData.items)
          }
          setLocalItems(allItems)
          setShowAllSources(true)
        }
      } finally {
        setLoading(false)
      }
    })()
    
    // Subscribe to progress updates
    const unsub = window.launcher.onStoreProgress((p) => {
      if (p.phase === 'fetch') {
        setProgressPhase('Récupération des pages...')
      } else if (p.phase === 'parse') {
        setProgressPhase(`Analyse... ${(p as any).count || 0} jeux trouvés`)
      } else if (p.phase === 'covers') {
        setProgressPhase('Enrichissement avec Steam...')
        setProgressCurrent((p as any).current || 0)
        setProgressTotal((p as any).total || 0)
      } else if (p.phase === 'save') {
        setProgressPhase('Sauvegarde...')
      } else if (p.phase === 'done') {
        setProgressPhase('')
        setProgressCurrent(0)
        setProgressTotal(0)
      }
    })
    
    return () => unsub()
  }, [])

  // Get active source
  const activeSource = useMemo(() => {
    return sources.find(s => s.id === activeSourceId)
  }, [sources, activeSourceId])

  // Get display items based on view mode
  const displayItems = useMemo(() => {
    if (showAllSources) {
      // Combine all items from all sources
      const allItems: StoreItem[] = []
      sourceItemsMap.forEach(items => allItems.push(...items))
      return allItems
    }
    // Return items for active source only
    if (activeSourceId) {
      return sourceItemsMap.get(activeSourceId) || []
    }
    return []
  }, [showAllSources, activeSourceId])

  const filteredLocalItems = useMemo(() => {
    const q = localSearch.trim().toLowerCase()
    if (!q) return displayItems
    return displayItems.filter((it) => it.name.toLowerCase().includes(q))
  }, [displayItems, localSearch])

  // Total game count
  const totalGameCount = useMemo(() => {
    let count = 0
    sourceItemsMap.forEach(items => count += items.length)
    return count
  }, [sources, localItems])

  // Active source game count
  const activeSourceGameCount = useMemo(() => {
    if (activeSourceId) {
      return sourceItemsMap.get(activeSourceId)?.length || 0
    }
    return 0
  }, [activeSourceId])

  const handleAddSource = async (e: FormEvent) => {
    e.preventDefault()
    if (!newSourceUrl.trim() || !newSourceName.trim()) return

    setIsScraping(true)
    try {
      // Save the new source first to get an ID
      const newSource = await window.launcher.sourcesAdd({
        name: newSourceName,
        url: newSourceUrl,
        type: isPaginatedMode ? 'paginated' : 'single',
        pageCount: isPaginatedMode ? pageCount : undefined,
      })
      
      // Scrape with the sourceId
      let res
      if (isPaginatedMode) {
        res = await window.launcher.storeScrapePaginated(newSourceUrl, pageCount, newSource.id)
      } else {
        res = await window.launcher.storeScrape(newSourceUrl, newSource.id)
      }
      
      // Save items for this source in memory
      sourceItemsMap.set(newSource.id, res.items)
      
      // Update meta
      await window.launcher.sourcesUpdateMeta(newSource.id, res.items.length)
      
      // Reload sources to get updated counts
      const updatedSources = await window.launcher.sourcesGetAll()
      setSources(updatedSources)
      
      setActiveSourceId(newSource.id)
      setShowAllSources(false)
      setLocalItems(res.items)
      
      // Reset form
      setNewSourceName('')
      setNewSourceUrl('')
      
      alert(`Source "${newSourceName}" ajoutée avec succès ! ${res.items.length} jeux trouvés.`)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur lors de la configuration')
    } finally {
      setIsScraping(false)
    }
  }

  const handleRefreshSource = async (source: SourceConfig) => {
    setIsScraping(true)
    setActiveSourceId(source.id)
    await window.launcher.sourcesSetActive(source.id)
    
    try {
      let res
      if (source.type === 'paginated' && source.pageCount) {
        res = await window.launcher.storeScrapePaginated(source.url, source.pageCount, source.id)
      } else {
        res = await window.launcher.storeScrape(source.url, source.id)
      }
      
      // Store items for this source
      sourceItemsMap.set(source.id, res.items)
      
      // Update meta
      await window.launcher.sourcesUpdateMeta(source.id, res.items.length)
      
      // Reload sources
      const updatedSources = await window.launcher.sourcesGetAll()
      setSources(updatedSources)
      
      // Show this source's items
      setShowAllSources(false)
      setLocalItems(res.items)
      
      alert(`Source "${source.name}" actualisée ! ${res.items.length} jeux trouvés.`)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur lors de l\'actualisation')
    } finally {
      setIsScraping(false)
    }
  }

  const handleDeleteSource = async (sourceId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette source ?')) return
    
    try {
      await window.launcher.sourcesRemove(sourceId)
      setSources(prev => prev.filter(s => s.id !== sourceId))
      
      // Remove items for this source
      sourceItemsMap.delete(sourceId)
      
      if (activeSourceId === sourceId) {
        setActiveSourceId(null)
        setShowAllSources(true)
        // Recalculate all items
        const allItems: StoreItem[] = []
        sourceItemsMap.forEach(items => allItems.push(...items))
        setLocalItems(allItems)
      }
    } catch (e) {
      alert('Erreur lors de la suppression')
    }
  }

  const handleSelectSource = async (sourceId: string) => {
    setActiveSourceId(sourceId)
    setShowAllSources(false)
    await window.launcher.sourcesSetActive(sourceId)
    
    // Check if we have items for this source in memory
    let items = sourceItemsMap.get(sourceId)
    
    // If not, try to load from backend
    if (!items) {
      const sourceData = await window.launcher.storeGetSourceData(sourceId)
      if (sourceData) {
        items = sourceData.items
        sourceItemsMap.set(sourceId, items)
      }
    }
    
    setLocalItems(items || [])
  }

  const handleShowAll = async () => {
    setShowAllSources(true)
    setActiveSourceId(null)
    await window.launcher.sourcesSetActive('')
    
    // Combine all items
    const allItems: StoreItem[] = []
    sourceItemsMap.forEach(items => allItems.push(...items))
    setLocalItems(allItems)
  }

  const handleClearCache = async () => {
    if (!confirm('Êtes-vous sûr de vouloir vider le cache ? Cela supprimera toutes les données scrapées.')) return
    
    try {
      const result = await window.launcher.sourcesClearCache()
      if (result.success) {
        sourceItemsMap.clear()
        setLocalItems([])
        // Reset source counts
        setSources(prev => prev.map(s => ({ ...s, gameCount: 0, lastUpdated: undefined })))
        alert('Cache vidé avec succès')
      } else {
        alert('Erreur lors du vidage du cache')
      }
    } catch (e) {
      alert('Erreur lors du vidage du cache')
    }
  }
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (over && active.id !== over.id) {
      setSources((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id)
        const newIndex = items.findIndex(item => item.id === over.id)
        const newItems = arrayMove(items, oldIndex, newIndex)
        
        // Save the new order to settings
        void window.launcher.settingsGet().then(settings => {
          if (settings.sources) {
            settings.sources = newItems
            void window.launcher.settingsSetGamesFolder(settings.gamesFolderPath || null).then(() => {})
          }
        })
        
        return newItems
      })
    }
  }

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Jamais'
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Format source label
  const formatSourceInfo = (source: SourceConfig) => {
    if (source.type === 'paginated' && source.pageCount) {
      return `(${source.pageCount} pages)`
    }
    return '(page unique)'
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-steam-accent animate-pulse text-xl font-bold">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl pb-20">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Source</h1>
        <p className="text-steam-muted mt-1">Gérez vos sources de téléchargement</p>
      </div>

      {/* Total games count */}
      <div className="mb-6 flex items-center gap-4">
        <div className="px-4 py-2 rounded-xl bg-steam-panel border border-steam-border">
          <span className="text-steam-muted text-sm">
            {showAllSources ? 'Total jeux: ' : 'Jeux dans cette source: '}
          </span>
          <span className="text-white font-bold">
            {showAllSources ? totalGameCount : activeSourceGameCount}
          </span>
        </div>
        {showAllSources ? (
          <span className="text-steam-accent text-sm">Affichage: Toutes les sources</span>
        ) : activeSource ? (
          <span className="text-steam-accent text-sm">Affichage: {activeSource.name}</span>
        ) : null}
      </div>

      {/* Add source form */}
      <div className="mb-6 rounded-2xl bg-steam-panel border border-steam-border p-6">
        <h3 className="text-lg font-bold text-white mb-4">Ajouter une source</h3>
        
        {/* Mode toggle */}
        <div className="flex gap-4 mb-4">
          <button
            type="button"
            onClick={() => setIsPaginatedMode(false)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              !isPaginatedMode 
                ? 'bg-steam-accent text-steam-bg' 
                : 'bg-black/40 text-steam-muted hover:text-white'
            }`}
          >
            Page unique
          </button>
          <button
            type="button"
            onClick={() => setIsPaginatedMode(true)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              isPaginatedMode 
                ? 'bg-steam-accent text-steam-bg' 
                : 'bg-black/40 text-steam-muted hover:text-white'
            }`}
          >
            Multi-pages (Steam)
          </button>
        </div>
        
        {isPaginatedMode && (
          <div className="mb-4 p-4 rounded-xl bg-blue-900/20 border border-blue-500/30">
            <p className="text-sm text-blue-300 mb-2">
              Mode pagination avec enrichissement Steam
            </p>
            <p className="text-xs text-steam-muted mb-2">
              Collez l'URL d'une page quelconque (ex: ?lcp_page1=3). Le système détectera automatiquement 
              le numéro de page et scrapera toutes les pages de 1 à N.
            </p>
            <p className="text-xs text-steam-muted">
              Les images et métadonnées seront récupérées automatiquement depuis Steam.
            </p>
          </div>
        )}
        
        <form onSubmit={handleAddSource} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={newSourceName}
              onChange={(e) => setNewSourceName(e.target.value)}
              placeholder="Nom de la source"
              className="rounded-xl bg-black/40 border border-steam-border px-4 py-3 text-white outline-none focus:border-steam-accent"
              required
            />
            <div className="flex gap-2">
              <input
                type="url"
                value={newSourceUrl}
                onChange={(e) => setNewSourceUrl(e.target.value)}
                placeholder={isPaginatedMode ? "https://site.com/jeux/?lcp_page1=3" : "https://exemple.com/jeux"}
                className="flex-1 rounded-xl bg-black/40 border border-steam-border px-4 py-3 text-white outline-none focus:border-steam-accent"
                required
              />
              {isPaginatedMode && (
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={pageCount}
                  onChange={(e) => setPageCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                  className="w-20 rounded-xl bg-black/40 border border-steam-border px-3 py-3 text-white outline-none focus:border-steam-accent"
                  title="Nombre de pages"
                />
              )}
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isScraping}
              className="rounded-xl bg-steam-accent px-6 py-3 text-steam-bg font-bold hover:brightness-110 disabled:opacity-50 transition-all"
            >
              {isScraping ? 'Analyse...' : 'Ajouter la source'}
            </button>
            <button
              type="button"
              onClick={handleClearCache}
              className="rounded-xl bg-red-600/80 px-6 py-3 text-white font-medium hover:bg-red-600 transition-all"
            >
              Vider cache
            </button>
          </div>
          
          {/* Progress bar */}
          {isScraping && progressPhase && (
            <div className="space-y-2 mt-4">
              <div className="flex justify-between text-xs text-steam-muted">
                <span>{progressPhase}</span>
                {progressTotal > 0 && (
                  <span>{progressCurrent} / {progressTotal}</span>
                )}
              </div>
              {progressTotal > 0 && (
                <div className="h-2 rounded-full bg-black/40 overflow-hidden">
                  <div 
                    className="h-full bg-steam-accent transition-all duration-300"
                    style={{ width: `${Math.round((progressCurrent / progressTotal) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Sources list */}
      {sources.length > 0 && (
        <div className="mb-8 rounded-2xl bg-steam-panel border border-steam-border p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-white">Sources enregistrées</h3>
            <button
              onClick={handleShowAll}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                showAllSources 
                  ? 'bg-steam-accent text-steam-bg' 
                  : 'bg-black/40 text-steam-muted hover:text-white'
              }`}
            >
              Voir tout
            </button>
          </div>
          
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sources.map(s => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {sources.map(source => (
                  <SortableSourceItem
                    key={source.id}
                    source={source}
                    isActive={activeSourceId === source.id && !showAllSources}
                    isDragging={false}
                    onRefresh={handleRefreshSource}
                    onDelete={handleDeleteSource}
                    onSelect={handleSelectSource}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Search and items */}
      <div className="mb-8">
        <div className="relative w-full max-w-md">
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Rechercher dans les jeux..."
            className="w-full rounded-xl bg-steam-panel border border-steam-border px-5 py-3 text-white outline-none focus:border-steam-accent transition-all pl-12"
          />
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-steam-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {filteredLocalItems.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {filteredLocalItems.map((item) => (
            <Link
              key={item.id}
              to={`/game/${item.id}`}
              state={{ storeItem: item, pageUrl: activeSource?.url || '', sourceId: activeSource?.id }}
              className="group relative flex flex-col overflow-hidden rounded-lg border border-white/5 bg-black/20 transition-all hover:border-steam-accent/50 hover:bg-black/40"
            >
              <div className="aspect-[3/4] overflow-hidden bg-black/40">
                {item.coverImageUrl ? (
                  <img
                    src={item.coverImageUrl}
                    alt={item.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center p-4 text-center">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-steam-muted">{item.name}</span>
                  </div>
                )}
              </div>
              <div className="p-2.5">
                <h3
                  className="truncate text-xs font-bold text-white group-hover:text-steam-accent"
                  title={item.name}
                >
                  {item.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center border border-dashed border-steam-border rounded-2xl">
          <p className="text-steam-muted">
            {sources.length === 0 
              ? "Aucune source configurée. Ajoutez une source pour commencer." 
              : "Aucun jeu trouvé dans cette source."}
          </p>
        </div>
      )}
    </div>
  )
}
