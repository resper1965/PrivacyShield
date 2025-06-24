import { useState, useEffect } from 'react'

interface Detection {
  id: number
  tipo: string
  valor: string
  titular: string
  arquivo: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  sensitivityScore: number
  aiConfidence: number
  recommendations: string[]
  reasoning: string
  timestamp: string
  isFalsePositive?: boolean
}

const Detections = () => {
  const [detections, setDetections] = useState<Detection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  
  const API_URL = import.meta.env.VITE_API_URL || window.location.origin

  const fetchDetections = async () => {
    try {
      setLoading(true)
      
      // Mock detections data - in real implementation, this would come from API
      const mockDetections: Detection[] = [
        {
          id: 1,
          tipo: 'CPF',
          valor: '123.456.789-01',
          titular: 'João Silva',
          arquivo: 'documento1.txt',
          riskLevel: 'high',
          sensitivityScore: 8,
          aiConfidence: 0.92,
          recommendations: ['Mask CPF numbers in logs', 'Implement access controls'],
          reasoning: 'Valid Brazilian CPF detected in document context. High sensitivity due to personal identification data.',
          timestamp: '2025-06-24T00:30:00Z'
        },
        {
          id: 2,
          tipo: 'Email',
          valor: 'joao@empresa.com',
          titular: 'João Silva',
          arquivo: 'documento1.txt',
          riskLevel: 'medium',
          sensitivityScore: 6,
          aiConfidence: 0.87,
          recommendations: ['Validate email collection consent', 'Implement email encryption'],
          reasoning: 'Corporate email detected. Medium risk due to business context.',
          timestamp: '2025-06-24T00:30:00Z'
        },
        {
          id: 3,
          tipo: 'Telefone',
          valor: '(11) 99999-9999',
          titular: 'João Silva',
          arquivo: 'documento1.txt',
          riskLevel: 'medium',
          sensitivityScore: 6,
          aiConfidence: 0.89,
          recommendations: ['Mask phone numbers in logs', 'Validate collection purpose'],
          reasoning: 'Brazilian mobile phone number. Medium risk for contact data.',
          timestamp: '2025-06-24T00:30:00Z'
        },
        {
          id: 4,
          tipo: 'CNPJ',
          valor: '12.345.678/0001-90',
          titular: 'Empresa ABC Ltda',
          arquivo: 'contratos.txt',
          riskLevel: 'low',
          sensitivityScore: 4,
          aiConfidence: 0.95,
          recommendations: ['Standard business data handling', 'Audit trail recommended'],
          reasoning: 'Valid CNPJ in business context. Low risk for corporate identifier.',
          timestamp: '2025-06-24T00:31:00Z'
        }
      ]

      setDetections(mockDetections)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch detections')
    } finally {
      setLoading(false)
    }
  }

  const markAsFalsePositive = async (detectionId: number) => {
    try {
      // In real implementation, this would call PATCH /detections/:id/flag
      const response = await fetch(`${API_URL}/api/detections/${detectionId}/flag`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isFalsePositive: true })
      })

      if (response.ok) {
        // Update local state
        setDetections(prev => 
          prev.map(detection => 
            detection.id === detectionId 
              ? { ...detection, isFalsePositive: true }
              : detection
          )
        )
      } else {
        // For demo purposes, just update locally
        setDetections(prev => 
          prev.map(detection => 
            detection.id === detectionId 
              ? { ...detection, isFalsePositive: true }
              : detection
          )
        )
      }
    } catch (err) {
      console.error('Failed to mark as false positive:', err)
      // For demo purposes, still update locally
      setDetections(prev => 
        prev.map(detection => 
          detection.id === detectionId 
            ? { ...detection, isFalsePositive: true }
            : detection
        )
      )
    }
  }

  const getRiskBadgeClass = (riskLevel: string) => {
    return `risk-badge risk-${riskLevel}`
  }

  const filteredDetections = detections.filter(detection => {
    if (filter === 'all') return true
    if (filter === 'false-positive') return detection.isFalsePositive
    return detection.riskLevel === filter
  })

  useEffect(() => {
    fetchDetections()
  }, [])

  if (loading) {
    return <div className="loading">Loading detections...</div>
  }

  if (error) {
    return (
      <div className="detections-container">
        <div className="error">Error: {error}</div>
        <button onClick={fetchDetections} className="upload-button">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="detections-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>PII Detections</h2>
        
        <div>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="all">All Detections</option>
            <option value="critical">Critical Risk</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
            <option value="false-positive">False Positives</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <p>Total detections: {detections.length} | Filtered: {filteredDetections.length}</p>
      </div>

      {filteredDetections.length === 0 ? (
        <div className="loading">No detections found for the selected filter.</div>
      ) : (
        <table className="detections-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Value</th>
              <th>Context</th>
              <th>Risk</th>
              <th>AI Confidence</th>
              <th>Files</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDetections.map((detection) => (
              <tr 
                key={detection.id}
                style={{ 
                  opacity: detection.isFalsePositive ? 0.5 : 1,
                  textDecoration: detection.isFalsePositive ? 'line-through' : 'none'
                }}
              >
                <td>
                  <strong>{detection.tipo}</strong>
                  <br />
                  <small>Score: {detection.sensitivityScore}/10</small>
                </td>
                
                <td>
                  <code>{detection.valor}</code>
                  <br />
                  <small>Subject: {detection.titular}</small>
                </td>
                
                <td>
                  <div style={{ maxWidth: '300px' }}>
                    <p style={{ fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>
                      {detection.reasoning}
                    </p>
                    <details>
                      <summary style={{ cursor: 'pointer', color: '#3498db' }}>
                        Recommendations ({detection.recommendations.length})
                      </summary>
                      <ul style={{ margin: '0.5rem 0', paddingLeft: '1rem' }}>
                        {detection.recommendations.map((rec, index) => (
                          <li key={index} style={{ fontSize: '0.8rem' }}>{rec}</li>
                        ))}
                      </ul>
                    </details>
                  </div>
                </td>
                
                <td>
                  <span className={getRiskBadgeClass(detection.riskLevel)}>
                    {detection.riskLevel}
                  </span>
                </td>
                
                <td>
                  <strong>{Math.round(detection.aiConfidence * 100)}%</strong>
                  <br />
                  <small>AI Validated</small>
                </td>
                
                <td>
                  <div>
                    <strong>{detection.arquivo}</strong>
                    <br />
                    <small>{new Date(detection.timestamp).toLocaleString()}</small>
                  </div>
                </td>
                
                <td>
                  {detection.isFalsePositive ? (
                    <span style={{ color: '#6c757d', fontSize: '0.8rem' }}>
                      Marked as False Positive
                    </span>
                  ) : (
                    <button
                      className="action-button false-positive"
                      onClick={() => markAsFalsePositive(detection.id)}
                      title="Mark as false positive"
                    >
                      Mark False Positive
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <h4>Detection Summary</h4>
        <div className="stats-grid">
          <div className="stat-card danger">
            <div className="stat-value">
              {detections.filter(d => d.riskLevel === 'critical').length}
            </div>
            <div className="stat-label">Critical Risk</div>
          </div>
          
          <div className="stat-card warning">
            <div className="stat-value">
              {detections.filter(d => d.riskLevel === 'high').length}
            </div>
            <div className="stat-label">High Risk</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">
              {detections.filter(d => d.riskLevel === 'medium').length}
            </div>
            <div className="stat-label">Medium Risk</div>
          </div>
          
          <div className="stat-card success">
            <div className="stat-value">
              {detections.filter(d => d.riskLevel === 'low').length}
            </div>
            <div className="stat-label">Low Risk</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Detections