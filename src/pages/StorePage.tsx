import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { StoreItem } from '../types'

export function StorePage() {
  const [allGames, setAllGames] = useState<StoreItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Categories based on Steam genres
  const categories = [
    { id: 'action', name: 'Action', icon: '🎯' },
    { id: 'adventure', name: 'Aventure', icon: '🗺️' },
    { id: 'rpg', name: 'RPG', icon: '⚔️' },
    { id: 'strategy', name: 'Stratégie', icon: '🧠' },
    { id: 'simulation', name: 'Simulation', icon: '🎮' },
    { id: 'sport', name: 'Sport', icon: '⚽' },
    { id: 'racing', name: 'Course', icon: '🏎️' },
    { id: 'indie', name: 'Indé', icon: '🎨' },
  ]

  // Load games from all sources
  useEffect(() => {
    void (async () => {
      try {
        const allSourcesData = await window.launcher.storeGetAllSourcesData()
        const allItems: StoreItem[] = []
        for (const sourceData of allSourcesData) {
          allItems.push(...sourceData.items)
        }
        setAllGames(allItems)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // Filter games by search and category
  const filteredGames = useMemo(() => {
    let filtered = allGames
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(game => 
        game.name.toLowerCase().includes(query) ||
        game.description?.toLowerCase().includes(query)
      )
    }
    
    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(game => {
        const genres = game.genres || []
        return genres.some(genre => 
          genre.toLowerCase().includes(selectedCategory.toLowerCase())
        )
      })
    }
    
    return filtered
  }, [allGames, searchQuery, selectedCategory])

  // Get latest games (most recently added)
  const latestGames = useMemo(() => {
    return [...allGames].slice(0, 12)
  }, [allGames])

  // Get games by category
  const getGamesByCategory = (categoryId: string, limit = 8) => {
    const categoryGames = allGames.filter(game => {
      const genres = game.genres || []
      return genres.some(genre => 
        genre.toLowerCase().includes(categoryId.toLowerCase())
      )
    })
    return categoryGames.slice(0, limit)
  }

  // Featured game (random game with good cover)
  const featuredGame = useMemo(() => {
    const gamesWithCovers = allGames.filter(g => g.coverImageUrl)
    if (gamesWithCovers.length === 0) return null
    return gamesWithCovers[Math.floor(Math.random() * gamesWithCovers.length)]
  }, [allGames])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-steam-accent animate-pulse text-xl font-bold">Chargement du magasin...</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl pb-20">
      {/* Hero Section - Featured Game */}
      {featuredGame && !searchQuery && !selectedCategory && (
        <div className="mb-12 relative rounded-2xl overflow-hidden bg-gradient-to-r from-steam-panel to-black/40 border border-steam-border">
          <div className="absolute inset-0">
            {featuredGame.coverImageUrl && (
              <img
                src={featuredGame.coverImageUrl}
                alt={featuredGame.name}
                className="w-full h-full object-cover opacity-20"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#1b2838] via-transparent to-transparent" />
          </div>
          
          <div className="relative z-10 p-8 md:p-12">
            <div className="max-w-2xl">
              <span className="inline-block px-3 py-1 bg-steam-accent text-steam-bg text-xs font-bold rounded mb-4">
                À LA UNE
              </span>
              <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
                {featuredGame.name}
              </h1>
              {featuredGame.description && (
                <p className="text-steam-muted text-lg mb-6 line-clamp-3">
                  {featuredGame.description}
                </p>
              )}
              <Link
                to={`/game/${featuredGame.id}`}
                state={{ storeItem: featuredGame }}
                className="inline-block bg-steam-accent hover:bg-steam-accent/90 text-steam-bg font-bold px-8 py-3 rounded-lg transition-all transform hover:scale-105"
              >
                Voir le jeu
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-8 sticky top-4 z-30">
        <div className="relative max-w-2xl mx-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un jeu..."
            className="w-full rounded-xl bg-steam-panel border border-steam-border px-6 py-4 pl-14 text-white outline-none focus:border-steam-accent focus:ring-2 focus:ring-steam-accent/20 transition-all shadow-lg"
          />
          <svg
            className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-steam-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-steam-muted hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Category Pills */}
      {!searchQuery && (
        <div className="mb-10 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-5 py-2.5 rounded-full font-medium whitespace-nowrap transition-all ${
              !selectedCategory
                ? 'bg-steam-accent text-steam-bg'
                : 'bg-steam-panel border border-steam-border text-steam-muted hover:text-white hover:border-steam-accent'
            }`}
          >
            🎮 Tous les jeux
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-5 py-2.5 rounded-full font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-steam-accent text-steam-bg'
                  : 'bg-steam-panel border border-steam-border text-steam-muted hover:text-white hover:border-steam-accent'
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Search Results or Browse Mode */}
      {searchQuery || selectedCategory ? (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">
              {searchQuery
                ? `Résultats pour "${searchQuery}"`
                : `${categories.find(c => c.id === selectedCategory)?.name || 'Jeux'}`
              }
            </h2>
            <span className="text-steam-muted text-sm">
              {filteredGames.length} jeu{filteredGames.length > 1 ? 'x' : ''}
            </span>
          </div>
          
          {filteredGames.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredGames.map((item) => (
                <GameCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center border border-dashed border-steam-border rounded-2xl">
              <p className="text-steam-muted text-lg">Aucun jeu trouvé</p>
            </div>
          )}
        </div>
      ) : (
        /* Browse Mode - Show sections */
        <>
          {/* Latest Games */}
          {latestGames.length > 0 && (
            <section className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  🔥 Derniers ajouts
                </h2>
                <button
                  onClick={() => setSelectedCategory('all')}
                  className="text-steam-accent hover:text-steam-accent/80 text-sm font-medium"
                >
                  Voir tout →
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {latestGames.map((item) => (
                  <GameCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          )}

          {/* Category Sections */}
          {categories.map(category => {
            const categoryGames = getGamesByCategory(category.id)
            if (categoryGames.length === 0) return null
            
            return (
              <section key={category.id} className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    {category.icon} {category.name}
                  </h2>
                  <button
                    onClick={() => setSelectedCategory(category.id)}
                    className="text-steam-accent hover:text-steam-accent/80 text-sm font-medium"
                  >
                    Voir tout →
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {categoryGames.map((item) => (
                    <GameCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            )
          })}
        </>
      )}
    </div>
  )
}

// Game Card Component
function GameCard({ item }: { item: StoreItem }) {
  return (
    <Link
      to={`/game/${item.id}`}
      state={{ storeItem: item }}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-white/5 bg-steam-panel transition-all hover:border-steam-accent/50 hover:shadow-lg hover:shadow-steam-accent/10 hover:-translate-y-1"
    >
      <div className="aspect-[3/4] overflow-hidden bg-black/40 relative">
        {item.coverImageUrl ? (
          <img
            src={item.coverImageUrl}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-4 text-center bg-gradient-to-br from-steam-panel to-black/40">
            <span className="text-[10px] font-medium uppercase tracking-wider text-steam-muted">{item.name}</span>
          </div>
        )}
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      
      <div className="p-3">
        <h3
          className="truncate text-xs font-bold text-white group-hover:text-steam-accent transition-colors"
          title={item.name}
        >
          {item.name}
        </h3>
        
        {/* Genres tags */}
        {item.genres && item.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.genres.slice(0, 2).map((genre, idx) => (
              <span
                key={idx}
                className="text-[9px] px-1.5 py-0.5 rounded bg-black/40 text-steam-muted"
              >
                {genre}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
