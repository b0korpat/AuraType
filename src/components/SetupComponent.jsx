import React, { useState, useEffect } from 'react';
import { Download, FolderOpen, CheckCircle, AlertCircle, Loader2, Trash2, ExternalLink, ChevronRight, Check } from 'lucide-react';

function SetupComponent({ onModelChange, activeModel }) {
  const [whisperStatus, setWhisperStatus] = useState(null);
  const [installedModels, setInstalledModels] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [selectedDownload, setSelectedDownload] = useState('large-v3-turbo');
  const [downloadError, setDownloadError] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const models = [
    { id: 'tiny', name: 'Tiny', size: '75 MB', description: 'Fastest, low accuracy' },
    { id: 'base', name: 'Base', size: '142 MB', description: 'Balanced speed' },
    { id: 'small', name: 'Small', size: '466 MB', description: 'Better accuracy' },
    { id: 'medium', name: 'Medium', size: '1.5 GB', description: 'High accuracy, multilingual' },
    { id: 'large-v3-turbo', name: 'Large v3 Turbo ⚡', size: '1.6 GB', description: 'Best choice! Fast & Accurate' },
    { id: 'large-v3', name: 'Large v3', size: '3 GB', description: 'Maximum accuracy, slow' },
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
    } catch (e) { console.error(e); }
  };

  const loadInstalledModels = async () => {
    try {
      const models = await window.electronAPI?.listModels();
      setInstalledModels(models || []);
    } catch (e) { console.error(e); }
  };

  const handleDownloadModel = async () => {
    setDownloading(true);
    setDownloadProgress(0);
    setDownloadError(null);
    try {
      await window.electronAPI?.downloadModel(selectedDownload);
      await loadStatus();
      await loadInstalledModels();
    } catch (error) {
      setDownloadError('Download failed: ' + error.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleDeleteModel = async (modelId) => {
    if (!confirm(`Delete ${modelId}?`)) return;
    setDeleting(modelId);
    try {
      await window.electronAPI?.deleteModel(modelId);
      await loadInstalledModels();
    } catch (e) { alert(e.message); } 
    finally { setDeleting(null); }
  };

  const isModelInstalled = (id) => installedModels.some(m => m.id === id);

  return (
    <div className="setup-wizard" style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Step 1: Engine Setup */}
      <div className="step-card">
        <div className="step-header">
          <div className="step-number">1</div>
          <h3>Install Whisper Engine</h3>
          {whisperStatus?.ready ? (
            <div className="status-badge success"><Check size={12} /> Ready</div>
          ) : (
            <div className="status-badge error">Missing</div>
          )}
        </div>

        <div className="step-content">
          <p className="instruction-text">
            To run locally, you need the <b>whisper.cpp</b> binary.
          </p>
          
          <div className="instruction-list">
            <div className="instruction-item">
              <span className="bullet">1</span>
              <span>
                Download <b>whisper-bin-x64.zip</b> from GitHub:
                <button 
                  onClick={() => window.electronAPI?.openExternal('https://github.com/ggerganov/whisper.cpp/releases')} 
                  className="link-btn" 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <ExternalLink size={12} /> ggerganov/whisper.cpp
                </button>
              </span>
            </div>
            <div className="instruction-item">
              <span className="bullet">2</span>
              <span>Extract <b>main.exe</b> (or whisper-cli.exe) to this folder:</span>
            </div>
            
            <div className="path-box">
              {whisperStatus?.whisperDir ? `${whisperStatus.whisperDir}\\bin\\` : 'Loading...'}
              <button className="icon-btn" onClick={() => window.electronAPI?.openWhisperFolder()} title="Open Folder">
                <FolderOpen size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Step 2: Model Management */}
      <div className="step-card">
        <div className="step-header">
          <div className="step-number">2</div>
          <h3>Manage AI Models</h3>
        </div>

        <div className="step-content">
          
          {/* Active Model Selector */}
          <div className="section-label">Selected Active Model</div>
          <select 
            className="input model-select" 
            value={activeModel} 
            onChange={(e) => onModelChange && onModelChange(e.target.value)}
          >
            {models.map(m => (
              <option key={m.id} value={m.id} disabled={!isModelInstalled(m.id)}>
                {m.name} {!isModelInstalled(m.id) ? '(Not Installed)' : ''}
              </option>
            ))}
          </select>

          {/* Download Section */}
          <div className="download-section">
            <div className="section-label">Download New Model</div>
            <div className="download-row">
              <select 
                className="input" 
                value={selectedDownload} 
                onChange={(e) => setSelectedDownload(e.target.value)}
              >
                {models.map(m => (
                  <option key={m.id} value={m.id} disabled={isModelInstalled(m.id)}>
                    {m.name} ({m.size}) {isModelInstalled(m.id) ? '- Installed' : ''}
                  </option>
                ))}
              </select>
              <button 
                className="btn btn-primary" 
                onClick={handleDownloadModel}
                disabled={downloading || isModelInstalled(selectedDownload)}
              >
                {downloading ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
                Download
              </button>
            </div>
            
            {downloading && (
              <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${downloadProgress}%` }} />
              </div>
            )}
            {downloadError && <div className="error-msg">{downloadError}</div>}
          </div>

          {/* Installed Models List */}
          {installedModels.length > 0 && (
            <div className="installed-section">
              <div className="section-label">Installed Models</div>
              <div className="installed-list">
                {installedModels.map(model => (
                  <div key={model.id} className="installed-item">
                    <div className="model-info">
                      <span className="model-name">{model.id}</span>
                      <span className="model-size">{model.sizeFormatted}</span>
                    </div>
                    <button 
                      className="delete-btn" 
                      onClick={() => handleDeleteModel(model.id)}
                      disabled={deleting === model.id}
                    >
                      {deleting === model.id ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .step-card {
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        .step-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: rgba(255,255,255,0.03);
          border-bottom: 1px solid var(--border);
        }
        .step-number {
          width: 28px;
          height: 28px;
          background: var(--accent);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
        }
        .step-header h3 {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
          flex: 1;
        }
        .step-content {
          padding: 20px;
        }
        .status-badge {
          font-size: 12px;
          padding: 4px 10px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 500;
        }
        .status-badge.success { background: rgba(34, 197, 94, 0.2); color: var(--success); }
        .status-badge.error { background: rgba(239, 68, 68, 0.2); color: var(--error); }
        
        .instruction-text {
          font-size: 14px;
          color: var(--text-secondary);
          margin-bottom: 16px;
        }
        .instruction-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .instruction-item {
          display: flex;
          gap: 12px;
          font-size: 14px;
          color: var(--text-secondary);
        }
        .bullet {
          min-width: 20px;
          height: 20px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
        }
        .link-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: var(--accent);
          text-decoration: none;
          margin-left: 6px;
          font-weight: 500;
        }
        .link-btn:hover { text-decoration: underline; }
        
        .path-box {
          background: var(--bg-primary);
          border: 1px solid var(--border);
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          font-family: monospace;
          font-size: 12px;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 4px;
          margin-left: 32px;
        }
        .icon-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
        }
        .icon-btn:hover { color: var(--text-primary); }

        .section-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        .model-select {
          margin-bottom: 24px;
          font-weight: 500;
        }
        .download-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
          margin-bottom: 8px;
        }
        .progress-bar-container {
          height: 4px;
          background: var(--bg-secondary);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 8px;
        }
        .progress-bar {
          height: 100%;
          background: var(--accent);
          transition: width 0.3s;
        }
        .error-msg {
          color: var(--error);
          font-size: 12px;
        }

        .installed-list {
          display: grid;
          gap: 8px;
        }
        .installed-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
        }
        .model-info {
          display: flex;
          flex-direction: column;
        }
        .model-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
        .model-size { font-size: 11px; color: var(--text-muted); }
        .delete-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 6px;
          border-radius: 4px;
        }
        .delete-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          color: var(--error);
        }
      `}</style>
    </div>
  );
}

export default SetupComponent;
