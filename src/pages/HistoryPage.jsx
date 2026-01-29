import React, { useState } from 'react';
import { useRecording } from '../hooks/useRecording';
import { Calendar, Clock, Trash2, Copy, Search, FileText, Check } from 'lucide-react';

function HistoryPage() {
  const { transcriptions, deleteTranscription, clearHistory, copyToClipboard } = useRecording();
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const filtered = transcriptions.filter(t => 
    t.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopy = (id, text) => {
    copyToClipboard(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: 'numeric',
    }).format(date);
  };

  return (
    <div style={{ paddingBottom: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">History</h1>
          <p className="page-subtitle">Manage your past transcriptions</p>
        </div>
        
        {transcriptions.length > 0 && (
          <button 
            onClick={() => {
              if(confirm('Clear all history?')) clearHistory();
            }}
            className="btn btn-secondary"
            style={{ fontSize: '13px', padding: '8px 12px', color: 'var(--error)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
          >
            <Trash2 size={14} /> Clear All
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: '24px' }}>
        <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input 
          type="text" 
          className="input" 
          placeholder="Search transcriptions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ paddingLeft: '42px', height: '48px', fontSize: '15px' }}
        />
      </div>

      {/* List */}
      <div className="history-list">
        {filtered.length > 0 ? (
          filtered.map(item => (
            <div key={item.id} className="history-card">
              <div className="history-card-header">
                <div className="history-meta">
                  <Clock size={12} />
                  <span>{formatDate(item.timestamp)}</span>
                </div>
                <div className="history-actions">
                  <button 
                    className="action-icon-btn"
                    onClick={() => handleCopy(item.id, item.text)}
                    title="Copy to clipboard"
                  >
                    {copiedId === item.id ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                  </button>
                  <button 
                    className="action-icon-btn delete"
                    onClick={() => deleteTranscription(item.id)}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              
              <div className="history-content">
                {item.text}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <div style={{ 
              width: '80px', height: '80px', 
              background: 'var(--bg-tertiary)', 
              borderRadius: '50%', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '24px'
            }}>
              <FileText size={32} color="var(--text-muted)" />
            </div>
            <h3>No transcriptions found</h3>
            <p>
              {searchTerm ? 'Try a different search term' : 'Start recording to see your transcriptions here'}
            </p>
          </div>
        )}
      </div>

      <style>{`
        .history-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 20px;
          transition: all 0.2s;
        }

        .history-card:hover {
          border-color: var(--border-light);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .history-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
        }

        .history-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 500;
          background: var(--bg-tertiary);
          padding: 4px 10px;
          border-radius: 20px;
        }

        .history-actions {
          display: flex;
          gap: 4px;
        }

        .action-icon-btn {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          color: var(--text-muted);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .action-icon-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .action-icon-btn.delete:hover {
          background: rgba(239, 68, 68, 0.1);
          color: var(--error);
        }

        .history-content {
          font-size: 15px;
          line-height: 1.6;
          color: var(--text-secondary);
          white-space: pre-wrap;
        }
      `}</style>
    </div>
  );
}

export default HistoryPage;
