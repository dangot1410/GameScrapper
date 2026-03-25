/// <reference types="vite/client" />

import type { DetailScrapeResult, LibraryGame } from './types'

type StoreProgressEvent =
  | { phase: 'fetch' }
  | { phase: 'parse'; count: number }
  | { phase: 'covers'; current: number; total: number }
  | { phase: 'save' }
  | { phase: 'done' }

type InstallProgressEvent = {
  phase: string
  received?: number
  total?: number
  message?: string
  speedBytesPerSec?: number
  etaSeconds?: number
}

declare global {
  interface Window {
    launcher: {
      libraryGet: () => Promise<{ games: LibraryGame[] }>
      libraryAddGame: (payload: {
        name: string
        storePageUrl: string
        detailPageUrl: string
        coverImageUrl?: string | null
      }) => Promise<LibraryGame>
      storeClear: () => Promise<boolean>
      storeCachedGet: () => Promise<{
        pageUrl: string
        items: {
          id: string
          name: string
          detailPageUrl: string
          coverImageUrl: string | null
        }[]
        updatedAt: string
      } | null>
      storeFetchDashboard: () => Promise<{
        topSellers: any[]
        newReleases: any[]
        specials: any[]
        comingSoon: any[]
        featured: any[]
      }>
      storeSearchSteam: (query: string) => Promise<{
        id: number
        name: string
        header_image: string
      }[]>
      steamAppDetails: (appId: number) => Promise<{
        id: number
        name: string
        short_description: string
        about_the_game: string
        header_image: string
        release_date: string
        developers: string[]
        publishers: string[]
        genres: string[]
        screenshots: string[]
      } | null>
      storeScrape: (pageUrl: string) => Promise<{
        pageUrl: string
        items: {
          id: string
          name: string
          detailPageUrl: string
          coverImageUrl: string | null
        }[]
      }>
      storeScrapePaginated: (urlTemplate: string, pageCount: number) => Promise<{
        pageUrl: string
        isPaginatedMode?: boolean
        items: {
          id: string
          name: string
          detailPageUrl: string
          coverImageUrl: string | null
          description?: string
          screenshots?: string[]
          genres?: string[]
          developers?: string[]
          publishers?: string[]
          releaseDate?: string
          steamData?: {
            coverImageUrl: string
            description: string
            screenshots: string[]
            genres: string[]
            developers: string[]
            publishers: string[]
            releaseDate: string
          }
        }[]
      }>
      storeScrapeDetail: (detailPageUrl: string) => Promise<DetailScrapeResult>
      gameInstall: (payload: {
        id: string
        name: string
        storePageUrl: string
        detailPageUrl: string
        downloadUrl: string
        coverImageUrl?: string | null
      }) => Promise<LibraryGame>
      gameLaunch: (gameId: string) => Promise<boolean>
      gameUninstall: (gameId: string) => Promise<boolean>
      gameUninstallFiles: (gameId: string) => Promise<LibraryGame>
      gameInstallCancel: () => Promise<void>
      gameInstallPause: () => Promise<boolean>
      gameInstallResume: () => Promise<boolean>
      
      // Settings
      settingsGet: () => Promise<{ gamesFolderPath?: string | null; sources?: any[]; activeSourceId?: string | null }>
      settingsSetGamesFolder: (folderPath: string | null) => Promise<{ gamesFolderPath?: string | null }>
      settingsSelectGamesFolder: () => Promise<string | null>
      
      // Source management
      sourcesGetAll: () => Promise<{ id: string; name: string; url: string; type: 'single' | 'paginated'; pageCount?: number; createdAt: string; gameCount?: number; lastUpdated?: string }[]>
      sourcesAdd: (source: { name: string; url: string; type: 'single' | 'paginated'; pageCount?: number }) => Promise<{ id: string; name: string; url: string; type: 'single' | 'paginated'; pageCount?: number; createdAt: string; gameCount?: number; lastUpdated?: string }>
      sourcesRemove: (sourceId: string) => Promise<boolean>
      sourcesSetActive: (sourceId: string) => Promise<boolean>
      sourcesUpdateMeta: (sourceId: string, gameCount: number) => Promise<boolean>
      sourcesClearCache: () => Promise<{ success: boolean; error?: string }>
      
      // Store data per source
      storeGetSourceData: (sourceId: string) => Promise<{ sourceId: string; items: any[]; updatedAt: string; gameCount: number } | null>
      storeGetAllSourcesData: () => Promise<{ sourceId: string; items: any[]; updatedAt: string; gameCount: number }[]>
      
      // App uninstall
      appUninstall: () => Promise<{ success: boolean }>
      
      onStoreProgress: (cb: (p: StoreProgressEvent) => void) => () => void
      onInstallProgress: (cb: (p: InstallProgressEvent) => void) => () => void
      onLibraryUpdated: (cb: (p: { games: LibraryGame[] }) => void) => () => void
    }
  }
}

export {}
