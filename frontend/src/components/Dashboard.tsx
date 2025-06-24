import { useState, useEffect } from 'react'

interface DashboardStats {
  totalUploads: number
  pendingJobs: number
  piiDetections: number
  queueStatus: {
    archiveQueue: { waiting: number; active: number }
    fileQueue: { waiting: number; active: number }
  }
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUploads: 0,
    pendingJobs: 0,
    piiDetections: 0,
    queueStatus: {
      archiveQueue: { waiting: 0, active: 0 },
      fileQueue: { waiting: 0, active: 0 }
    }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const API_URL = import.meta.env.VITE_API_URL || window.location.origin

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch queue status
      const queueResponse = await fetch(`${API_URL}/api/queue/status`)
      if (!queueResponse.ok) throw new Error('Failed to fetch queue status')
      const queueData = await queueResponse.json()

      // Calculate stats from queue data
      const pendingJobs = queueData.queues.archiveQueue.waiting + queueData.queues.fileQueue.waiting
      
      setStats({
        totalUploads: 12, // This would come from database in real implementation
        pendingJobs,
        piiDetections: 45, // This would come from database in real implementation
        queueStatus: queueData.queues
      })

      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
    
    // Refresh data every 5 seconds
    const interval = setInterval(fetchDashboardData, 5000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return <div className="loading">Loading dashboard...</div>
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="error">Error: {error}</div>
        <button onClick={fetchDashboardData} className="upload-button">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <h2>Dashboard</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalUploads}</div>
          <div className="stat-label">Total Uploads</div>
        </div>
        
        <div className={`stat-card ${stats.pendingJobs > 0 ? 'warning' : 'success'}`}>
          <div className="stat-value">{stats.pendingJobs}</div>
          <div className="stat-label">Pending Jobs</div>
        </div>
        
        <div className="stat-card danger">
          <div className="stat-value">{stats.piiDetections}</div>
          <div className="stat-label">PII Detections</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">
            {stats.queueStatus.archiveQueue.active + stats.queueStatus.fileQueue.active}
          </div>
          <div className="stat-label">Active Jobs</div>
        </div>
      </div>

      <div className="queue-details">
        <h3>Queue Status</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.queueStatus.archiveQueue.waiting}</div>
            <div className="stat-label">Archive Queue (Waiting)</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{stats.queueStatus.archiveQueue.active}</div>
            <div className="stat-label">Archive Queue (Active)</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{stats.queueStatus.fileQueue.waiting}</div>
            <div className="stat-label">File Queue (Waiting)</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{stats.queueStatus.fileQueue.active}</div>
            <div className="stat-label">File Queue (Active)</div>
          </div>
        </div>
      </div>

      <div className="recent-activity">
        <h3>System Status</h3>
        <div className="success">
          System is operational and processing files with AI validation
        </div>
      </div>
    </div>
  )
}

export default Dashboard