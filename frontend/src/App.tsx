import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import Upload from './components/Upload'
import Detections from './components/Detections'
import './App.css'

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="nav-brand">
            <h1>PrivacyDetective</h1>
          </div>
          <div className="nav-links">
            <Link to="/" className="nav-link">Dashboard</Link>
            <Link to="/upload" className="nav-link">Upload</Link>
            <Link to="/detections" className="nav-link">Detections</Link>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/detections" element={<Detections />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App