import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { LibraryPage } from './pages/LibraryPage'
import { StorePage } from './pages/StorePage'
import { MagasinPage } from './pages/MagasinPage'
import { GamePage } from './pages/GamePage'
import { DashboardPage } from './pages/DashboardPage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/store" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/store" element={<MagasinPage />} />
        <Route path="/sources" element={<StorePage />} />
        <Route path="/game/:id" element={<GamePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Layout>
  )
}
