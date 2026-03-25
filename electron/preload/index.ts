import { contextBridge, ipcRenderer } from 'electron'

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

contextBridge.exposeInMainWorld('launcher', {
  libraryGet: () => ipcRenderer.invoke('library:get'),
  libraryAddGame: (payload: {
    name: string
    storePageUrl: string
    detailPageUrl: string
    coverImageUrl?: string | null
  }) => ipcRenderer.invoke('library:addGame', payload),
  storeCachedGet: () => ipcRenderer.invoke('store:cached'),
  storeFetchDashboard: () => ipcRenderer.invoke('store:fetchDashboard'),
  storeSearchSteam: (query: string) => ipcRenderer.invoke('store:searchSteam', query),
  steamAppDetails: (appId: number) => ipcRenderer.invoke('steam:appDetails', appId),
  storeClear: () => ipcRenderer.invoke('store:clear'),
  storeScrape: (pageUrl: string, sourceId?: string) => ipcRenderer.invoke('store:scrape', pageUrl, sourceId),
  storeScrapePaginated: (urlTemplate: string, pageCount: number, sourceId?: string) =>
    ipcRenderer.invoke('store:scrapePaginated', urlTemplate, pageCount, sourceId),
  storeScrapeDetail: (detailPageUrl: string) =>
    ipcRenderer.invoke('store:scrapeDetail', detailPageUrl),
  gameInstall: (payload: {
    id: string
    name: string
    storePageUrl: string
    detailPageUrl: string
    downloadUrl: string
    coverImageUrl?: string | null
  }) => ipcRenderer.invoke('game:install', payload),
  gameLaunch: (gameId: string) => ipcRenderer.invoke('game:launch', gameId),
  gameUninstall: (gameId: string) => ipcRenderer.invoke('game:uninstall', gameId),
  gameUninstallFiles: (gameId: string) => ipcRenderer.invoke('game:uninstallFiles', gameId),
  gameInstallCancel: () => ipcRenderer.invoke('game:installCancel'),
  gameInstallPause: () => ipcRenderer.invoke('game:installPause'),
  gameInstallResume: () => ipcRenderer.invoke('game:installResume'),
  
  // Settings
  settingsGet: () => ipcRenderer.invoke('settings:get'),
  settingsSetGamesFolder: (folderPath: string | null) => ipcRenderer.invoke('settings:setGamesFolder', folderPath),
  settingsSelectGamesFolder: () => ipcRenderer.invoke('settings:selectGamesFolder'),
  
  // Source management
  sourcesGetAll: () => ipcRenderer.invoke('sources:getAll'),
  sourcesAdd: (source: { name: string; url: string; type: 'single' | 'paginated'; pageCount?: number }) =>
    ipcRenderer.invoke('sources:add', source),
  sourcesRemove: (sourceId: string) => ipcRenderer.invoke('sources:remove', sourceId),
  sourcesSetActive: (sourceId: string) => ipcRenderer.invoke('sources:setActive', sourceId),
  sourcesUpdateMeta: (sourceId: string, gameCount: number) => ipcRenderer.invoke('sources:updateMeta', sourceId, gameCount),
  sourcesClearCache: () => ipcRenderer.invoke('sources:clearCache'),
  
  // Store data per source
  storeGetSourceData: (sourceId: string) => ipcRenderer.invoke('store:getSourceData', sourceId),
  storeGetAllSourcesData: () => ipcRenderer.invoke('store:getAllSourcesData'),
  
  // App uninstall
  appUninstall: () => ipcRenderer.invoke('app:uninstall'),
  onStoreProgress: (cb: (p: StoreProgressEvent) => void) => {
    const handler = (_: unknown, p: StoreProgressEvent) => cb(p)
    ipcRenderer.on('store-progress', handler)
    return () => ipcRenderer.removeListener('store-progress', handler)
  },
  onInstallProgress: (cb: (p: InstallProgressEvent) => void) => {
    const handler = (_: unknown, p: InstallProgressEvent) => cb(p)
    ipcRenderer.on('install-progress', handler)
    return () => ipcRenderer.removeListener('install-progress', handler)
  },
  onLibraryUpdated: (cb: (p: { games: any[] }) => void) => {
    const handler = (_: unknown, p: { games: any[] }) => cb(p)
    ipcRenderer.on('library-updated', handler)
    return () => ipcRenderer.removeListener('library-updated', handler)
  },
})
