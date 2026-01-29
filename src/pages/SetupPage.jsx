import React, { useState, useEffect } from 'react';
import { Download, FolderOpen, CheckCircle, AlertCircle, Loader2, Trash2, Copy } from 'lucide-react';

function SetupPage() {
  const [whisperStatus, setWhisperStatus] = useState(null);
  const [installedModels, setInstalledModels] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [selectedModel, setSelectedModel] = useState('large-v3-turbo');
  const [downloadError, setDownloadError] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const models = [
    { id: 'tiny', name: 'Tiny', size: '75 MB', description: 'Fastest, least accurate' },
    { id: 'base', name: 'Base', size: '142 MB', description: 'Good balance of speed and accuracy' },
    { id: 'small', name: 'Small', size: '466 MB', description: 'Better accuracy, slower' },
    { id: 'medium', name: 'Medium', size: '1.5 GB', description: 'High accuracy, good for multilingual' },
    { id: 'large-v3-turbo', name: 'Large v3 Turbo ⚡', size: '1.6 GB', description: '8x faster than Large, near-same accuracy, best for Hungarian!' },
    { id: 'large-v3', name: 'Large v3', size: '3 GB', description: 'Best accuracy, slowest' },
  ];

  useEffect(() => {
    loadStatus();
    loadInstalledModels();

    const cleanup = window.electronAPI?.onDownloadProgress((data) => {
      setDownloadProgress(data.percent);
    });

    return () => cleanup?.();
  }, []);

  const loadStatus = async () => {
    try {
      const status = await window.electronAPI?.getWhisperStatus();
      setWhisperStatus(status);
    } catch (e) {
      console.error('Failed to load status:', e);
    }
  };

  const loadInstalledModels = async () => {
    try {
      const models = await window.electronAPI?.listModels();
      setInstalledModels(models || []);
    } catch (e) {
      console.error('Failed to list models:', e);
    }
  };

  const handleDownloadModel = async () => {
    setDownloading(true);
    setDownloadProgress(0);
    setDownloadError(null);
    try {
      const result = await window.electronAPI?.downloadModel(selectedModel);
      console.log('Download result:', result);
      await loadStatus();
      await loadInstalledModels();
    } catch (error) {
      console.error('Download failed:', error);
      setDownloadError('Download failed: ' + error.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleDeleteModel = async (modelId) => {
    if (!confirm(`Delete the ${modelId} model? You'll need to re-download it to use it again.`)) {
      return;
    }
    
    setDeleting(modelId);
    try {
      const result = await window.electronAPI?.deleteModel(modelId);
      if (result?.success) {
        await loadStatus();
        await loadInstalledModels();
      } else {
        alert('Failed to delete model: ' + (result?.error || 'Unknown error'));
      }
    } catch (e) {
      console.error('Delete failed:', e);
      alert('Failed to delete model: ' + e.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleOpenFolder = () => {
    window.electronAPI?.openWhisperFolder();
  };

  const copyPath = async (path) => {
    try {
      await navigator.clipboard.writeText(path);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  const isModelInstalled = (modelId) => {
    return installedModels.some(m => m.id === modelId);
  };

  return (
    <div style={{ paddingBottom: '40px' }}>
      <div className="page-header">
        <h1 className="page-title">Setup</h1>
        <p className="page-subtitle">Configure Whisper for local voice transcription</p>
      </div>

      {/* Status Card */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Whisper Status</h3>
          {whisperStatus?.ready ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)' }}>
              <CheckCircle size={18} />
              <span>Ready</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--warning)' }}>
              <AlertCircle size={18} />
              <span>Setup Required</span>
            </div>
          )}
        </div>

        <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          {whisperStatus?.ready ? (
            <p>Whisper is configured and ready to use. Active model: <strong>{whisperStatus?.model}</strong></p>
          ) : (
            <p>Whisper needs to be set up before you can use voice transcription.</p>
          )}
        </div>

        {whisperStatus?.whisperDir && (
          <div style={{ 
            fontSize: '12px', 
            color: 'var(--text-muted)', 
            marginBottom: '16px',
            padding: '8px 12px',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            wordBreak: 'break-all'
          }}>
            <span style={{ flex: 1 }}>{whisperStatus.whisperDir}</span>
            <button 
              onClick={() => copyPath(whisperStatus.whisperDir)}
              style={{ 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer', 
                color: 'var(--text-muted)',
                padding: '4px'
              }}
              title="Copy path"
            >
              <Copy size={14} />
            </button>
          </div>
        )}

        <button className="btn btn-secondary" onClick={handleOpenFolder}>
          <FolderOpen size={16} />
          Open Whisper Folder
        </button>
      </div>

      {/* Installed Models */}
      {installedModels.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Installed Models</h3>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {installedModels.length} model{installedModels.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div style={{ display: 'grid', gap: '8px' }}>
            {installedModels.map(model => (
              <div
                key={model.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-sm)',
                  border: whisperStatus?.model === model.id ? '1px solid var(--accent)' : '1px solid transparent'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {model.id}
                      {whisperStatus?.model === model.id && (
                        <span style={{ 
                          fontSize: '11px', 
                          background: 'var(--accent)', 
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          Active
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {model.sizeFormatted}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteModel(model.id)}
                  disabled={deleting === model.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--error)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    transition: 'all 0.15s'
                  }}
                  title="Delete model"
                >
                  {deleting === model.id ? (
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Download Whisper.cpp */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Step 1: Download Whisper.cpp Binary</h3>
        </div>

        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Download the pre-built whisper.cpp binary for Windows.
        </p>

        <div style={{ 
          padding: '16px', 
          background: 'var(--bg-tertiary)', 
          borderRadius: 'var(--radius-sm)',
          marginBottom: '16px'
        }}>
          <ol style={{ paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.8 }}>
            <li>
              Go to: <a 
                href="https://github.com/ggerganov/whisper.cpp/releases" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: 'var(--accent)' }}
              >
                github.com/ggerganov/whisper.cpp/releases
              </a>
            </li>
            <li>Download <code style={{ background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: '4px' }}>whisper-bin-x64.zip</code></li>
            <li>Extract all files to the <code style={{ background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: '4px' }}>bin</code> folder:</li>
          </ol>
          <div style={{ 
            marginTop: '8px',
            marginLeft: '20px',
            padding: '8px 12px', 
            background: 'var(--bg-hover)', 
            borderRadius: '4px',
            fontSize: '13px',
            fontFamily: 'monospace',
            wordBreak: 'break-all'
          }}>
            {whisperStatus?.whisperDir ? `${whisperStatus.whisperDir}\\bin\\` : 'Loading...'}
          </div>
        </div>
      </div>

      {/* Step 2: Download Model */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Step 2: Download AI Model</h3>
        </div>

        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Select and download a Whisper model. Larger models are more accurate but slower.
        </p>

        <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
          {models.map(model => {
            const installed = isModelInstalled(model.id);
            return (
              <label
                key={model.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: selectedModel === model.id ? 'var(--accent-dim)' : 'var(--bg-tertiary)',
                  border: `1px solid ${selectedModel === model.id ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  opacity: installed ? 0.6 : 1
                }}
              >
                <input
                  type="radio"
                  name="model"
                  value={model.id}
                  checked={selectedModel === model.id}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  style={{ accentColor: 'var(--accent)' }}
                  disabled={installed}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {model.name} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({model.size})</span>
                    {installed && (
                      <span style={{ 
                        fontSize: '11px', 
                        background: 'var(--success)', 
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>
                        Installed
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{model.description}</div>
                </div>
              </label>
            );
          })}
        </div>

        {downloading && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
              <span>Downloading model...</span>
              <span>{downloadProgress}%</span>
            </div>
            <div style={{ 
              height: '8px', 
              background: 'var(--bg-tertiary)', 
              borderRadius: '4px', 
              overflow: 'hidden' 
            }}>
              <div 
                style={{ 
                  width: `${downloadProgress}%`, 
                  height: '100%', 
                  background: 'var(--accent)',
                  transition: 'width 0.3s'
                }} 
              />
            </div>
          </div>
        )}

        {downloadError && (
          <div style={{ 
            marginBottom: '16px', 
            padding: '12px', 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--error)',
            fontSize: '14px'
          }}>
            {downloadError}
          </div>
        )}

        <button 
          className="btn btn-primary" 
          onClick={handleDownloadModel}
          disabled={downloading || isModelInstalled(selectedModel)}
        >
          {downloading ? (
            <>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              Downloading...
            </>
          ) : isModelInstalled(selectedModel) ? (
            <>
              <CheckCircle size={16} />
              Already Installed
            </>
          ) : (
            <>
              <Download size={16} />
              Download {models.find(m => m.id === selectedModel)?.name} Model
            </>
          )}
        </button>
      </div>

      {/* That's it! */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">That's It!</h3>
        </div>

        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Once you have the whisper binary and model, you're ready to go! 
        </p>

        <div style={{ 
          padding: '16px', 
          background: 'var(--accent-dim)', 
          borderRadius: 'var(--radius-sm)',
          fontSize: '13px',
          color: 'var(--accent)'
        }}>
          <strong>How to use:</strong> Press <strong>Ctrl+Alt+R</strong> to start recording. Press again to stop and transcribe.
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default SetupPage;
