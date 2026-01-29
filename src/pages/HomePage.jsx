import React, { useEffect, useState } from 'react';
import { Mic, Square, Loader2, Zap, Clock, FileText, AlertCircle, Server, Check, Copy } from 'lucide-react';
import { useRecording } from '../hooks/useRecording';

function HomePage() {
  const { 
    isRecording, 
    isProcessing, 
    transcriptions, 
    currentTranscription,
    error,
    startRecording, 
    stopRecording,
    copyToClipboard
  } = useRecording();

  const [mode, setMode] = useState('local');
  const [model, setModel] = useState('unknown');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadInfo = async () => {
      const settings = await window.electronAPI?.getSettings();
      if (settings) {
        setMode(settings.transcriptionMode || 'local');
        setModel(settings.whisperModel || 'large-v3-turbo');
      }
    };
    loadInfo();
    window.addEventListener('focus', loadInfo);
    return () => window.removeEventListener('focus', loadInfo);
  }, []);

  const handleRecordClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleCopy = () => {
    copyToClipboard(currentTranscription);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ paddingBottom: '40px', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Hero Section */}
      <div style={{ textAlign: 'center', marginBottom: '40px', marginTop: '20px' }}>
        <div style={{ 
          display: 'inline-flex', alignItems: 'center', gap: '6px', 
          padding: '6px 12px', borderRadius: '20px', 
          background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
          marginBottom: '24px', fontSize: '12px', color: 'var(--text-muted)'
        }}>
          {mode === 'local' ? (
            <><Server size={12} color="var(--accent)" /> Local Mode ({model})</>
          ) : (
            <><Zap size={12} color="#f55036" /> Groq Cloud API</>
          )}
        </div>

        <h1 className="page-title" style={{ fontSize: '32px', marginBottom: '8px' }}>AuraType</h1>
        <p className="page-subtitle" style={{ fontSize: '16px' }}>
          {isRecording ? 'Listening...' : isProcessing ? 'Processing audio...' : 'Ready to transcribe'}
        </p>
      </div>

      {/* Recording Button */}
      <div className="record-btn-container">
        <button 
          className={`record-btn ${isRecording ? 'recording' : ''}`}
          onClick={handleRecordClick}
          disabled={isProcessing}
          title={isRecording ? "Stop Recording" : "Start Recording"}
        >
          {isProcessing ? (
            <Loader2 className="spin" />
          ) : isRecording ? (
            <Square fill="white" />
          ) : (
            <Mic />
          )}
        </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '40px', color: 'var(--text-muted)', fontSize: '14px' }}>
        Press <span className="key">Ctrl</span> + <span className="key">Alt</span> + <span className="key">R</span>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '16px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '24px',
          display: 'flex', alignItems: 'center', gap: '12px'
        }}>
          <AlertCircle size={20} style={{ color: 'var(--error)' }} />
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{error}</div>
        </div>
      )}

      {/* Last Transcription */}
      {currentTranscription && !isRecording && !isProcessing && (
        <div className="card" style={{ animation: 'fadeIn 0.5s' }}>
          <div className="card-header" style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--success)' }}>
              <Check size={16} /> Transcription Complete
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Auto-pasted</span>
              <button 
                onClick={handleCopy}
                style={{ 
                  background: 'transparent', border: 'none', cursor: 'pointer', 
                  color: copied ? 'var(--success)' : 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', gap: '4px',
                  fontSize: '12px', padding: '4px 8px', borderRadius: '4px',
                  transition: 'all 0.2s'
                }}
                className="btn-copy"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
          <div style={{ 
            padding: '16px', 
            background: 'var(--bg-tertiary)', 
            borderRadius: 'var(--radius-sm)',
            fontSize: '16px',
            lineHeight: '1.6',
            color: 'var(--text-primary)'
          }}>
            {currentTranscription}
          </div>
        </div>
      )}

      {/* Stats Mini Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '40px' }}>
        <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
            {transcriptions.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total</div>
        </div>
        <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
            {transcriptions.filter(t => new Date(t.timestamp).toDateString() === new Date().toDateString()).length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Today</div>
        </div>
        <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
            {transcriptions.reduce((acc, t) => acc + t.text.split(' ').length, 0)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Words</div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .btn-copy:hover {
          background: var(--bg-hover) !important;
          color: var(--text-primary) !important;
        }
      `}</style>
    </div>
  );
}

export default HomePage;
