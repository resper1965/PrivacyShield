import { useState, useRef, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'

interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

interface UploadResponse {
  message: string
  jobId: string
  sessionId: string
  scanResult: {
    isClean: boolean
    scannedFile: string
  }
}

const Upload = () => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({ loaded: 0, total: 0, percentage: 0 })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [uploadStatus, setUploadStatus] = useState<string>('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const API_URL = import.meta.env.VITE_API_URL || window.location.origin

  useEffect(() => {
    // Initialize WebSocket connection
    const socketInstance = io(API_URL, {
      path: '/socket.io'
    })

    socketInstance.on('connect', () => {
      console.log('Connected to WebSocket')
      setUploadStatus('WebSocket connected')
    })

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from WebSocket')
      setUploadStatus('WebSocket disconnected')
    })

    socketInstance.on('upload-progress', (data: { percentage: number; status: string }) => {
      setUploadProgress(prev => ({
        ...prev,
        percentage: data.percentage
      }))
      setUploadStatus(data.status)
    })

    socketInstance.on('processing-update', (data: { status: string; details?: any }) => {
      setUploadStatus(data.status)
      if (data.details) {
        console.log('Processing details:', data.details)
      }
    })

    socketInstance.on('processing-complete', (data: { sessionId: string; results: any }) => {
      setUploadStatus('Processing complete')
      setMessage(`Processing completed! Session: ${data.sessionId}`)
      setIsUploading(false)
      setUploadProgress({ loaded: 0, total: 0, percentage: 0 })
    })

    socketInstance.on('processing-error', (data: { error: string }) => {
      setError(`Processing error: ${data.error}`)
      setIsUploading(false)
      setUploadProgress({ loaded: 0, total: 0, percentage: 0 })
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [API_URL])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    const zipFile = files.find(file => 
      file.name.toLowerCase().endsWith('.zip') || 
      file.type === 'application/zip' ||
      file.type === 'application/x-zip-compressed'
    )
    
    if (zipFile) {
      setSelectedFile(zipFile)
      setError(null)
    } else {
      setError('Please select a valid ZIP file')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.name.toLowerCase().endsWith('.zip') || 
          file.type === 'application/zip' ||
          file.type === 'application/x-zip-compressed') {
        setSelectedFile(file)
        setError(null)
      } else {
        setError('Please select a valid ZIP file')
      }
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setError(null)
    setMessage(null)
    setUploadProgress({ loaded: 0, total: selectedFile.size, percentage: 0 })
    setUploadStatus('Starting upload...')

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const xhr = new XMLHttpRequest()

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentage = Math.round((event.loaded / event.total) * 100)
          setUploadProgress({
            loaded: event.loaded,
            total: event.total,
            percentage
          })
          setUploadStatus(`Uploading: ${percentage}%`)
        }
      }

      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const response: UploadResponse = JSON.parse(xhr.responseText)
            setMessage(`Upload successful! Job ID: ${response.jobId}`)
            setUploadStatus('Upload complete, processing started...')
            
            // Emit to socket for real-time updates
            if (socket) {
              socket.emit('track-job', { jobId: response.jobId, sessionId: response.sessionId })
            }
          } catch (e) {
            setError('Invalid response from server')
            setIsUploading(false)
          }
        } else {
          try {
            const errorResponse = JSON.parse(xhr.responseText)
            setError(errorResponse.message || `Upload failed: ${xhr.status}`)
          } catch (e) {
            setError(`Upload failed: ${xhr.status}`)
          }
          setIsUploading(false)
        }
      }

      xhr.onerror = () => {
        setError('Upload failed - network error')
        setIsUploading(false)
      }

      xhr.open('POST', `${API_URL}/api/zip`)
      xhr.send(formData)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setIsUploading(false)
    }
  }

  const resetUpload = () => {
    setSelectedFile(null)
    setMessage(null)
    setError(null)
    setUploadProgress({ loaded: 0, total: 0, percentage: 0 })
    setUploadStatus('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="upload-container">
      <h2>Upload ZIP File</h2>
      
      <div 
        className={`upload-area ${isDragOver ? 'dragover' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        
        {selectedFile ? (
          <div>
            <p>Selected file: <strong>{selectedFile.name}</strong></p>
            <p>Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        ) : (
          <div>
            <p>Drag and drop a ZIP file here, or click to select</p>
            <p>Supported formats: .zip</p>
          </div>
        )}
      </div>

      {selectedFile && (
        <div style={{ marginBottom: '1rem' }}>
          <button
            className="upload-button"
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? 'Processing...' : 'Upload & Process'}
          </button>
          
          <button
            className="upload-button"
            onClick={resetUpload}
            disabled={isUploading}
            style={{ marginLeft: '1rem', backgroundColor: '#6c757d' }}
          >
            Clear
          </button>
        </div>
      )}

      {isUploading && uploadProgress.total > 0 && (
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${uploadProgress.percentage}%` }}
          />
        </div>
      )}

      {uploadStatus && (
        <div style={{ margin: '1rem 0', padding: '0.5rem', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
          Status: {uploadStatus}
        </div>
      )}

      {message && (
        <div className="success">
          {message}
        </div>
      )}

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <h3>How it works:</h3>
        <ol>
          <li>Select or drag a ZIP file containing documents</li>
          <li>The system will scan for viruses using ClamAV</li>
          <li>Files are extracted securely with compression ratio limits</li>
          <li>PII detection runs using Brazilian validation algorithms</li>
          <li>OpenAI GPT-4o analyzes each detection for risk assessment</li>
          <li>Results are stored with risk levels and recommendations</li>
        </ol>
      </div>
    </div>
  )
}

export default Upload