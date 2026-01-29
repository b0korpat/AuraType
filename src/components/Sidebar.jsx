import React, { useState, useEffect } from 'react';
import { Home, History, Settings, Keyboard, Download, Zap, Server, Heart, ExternalLink } from 'lucide-react';

function Sidebar({ currentPage, onNavigate }) {
  const [whisperReady, setWhisperReady] = useState(false);
  const [transcriptionMode, setTranscriptionMode] = useState('local');

  useEffect(() => {
    const checkStatus = async () => {
      // Check Whisper status
      const status = await window.electronAPI?.getWhisperStatus();
      setWhisperReady(status?.ready || false);
      
      // Check settings for mode
      const settings = await window.electronAPI?.getSettings();
      setTranscriptionMode(settings?.transcriptionMode || 'local');
    };
    
    checkStatus();
    
    // Periodically check status (e.g. after settings change)
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, [currentPage]);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'history', label: 'History', icon: History },
  ];

  // Only show Setup if in local mode
  if (transcriptionMode === 'local') {
    navItems.push({ id: 'setup', label: 'Setup', icon: Download });
  }

  navItems.push({ id: 'settings', label: 'Settings', icon: Settings });

  return (
    <nav className="sidebar">
      {navItems.map(item => (
        <button
          key={item.id}
          className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
          onClick={() => onNavigate(item.id)}
        >
          <item.icon />
          <span>{item.label}</span>
        </button>
      ))}
      
      <div className="sidebar-footer">
        {/* Support Button */}
        <button 
          onClick={() => window.electronAPI?.openExternal('https://buymeacoffee.com/kopa21')}
          className="support-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            marginBottom: '16px',
            background: 'linear-gradient(135deg, #FFDD00 0%, #FBB03B 100%)',
            color: '#000',
            textDecoration: 'none',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            fontWeight: '600',
            transition: 'transform 0.2s',
            border: 'none',
            width: '100%',
            cursor: 'pointer'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <Heart size={16} fill="black" />
          <span>Support Project</span>
        </button>

        <div className="status-indicator" style={{ background: 'transparent', padding: '0 0 16px 0' }}>
          {transcriptionMode === 'local' ? (
            <>
              <div className={`status-dot ${whisperReady ? '' : 'inactive'}`} />
              <span>{whisperReady ? 'Local Ready' : 'Setup Required'}</span>
            </>
          ) : (
            <>
              <div className="status-dot" style={{ background: '#f55036' }} />
              <span>Groq Cloud</span>
            </>
          )}
        </div>

        <div className="sidebar-divider" style={{ margin: '0 0 16px 0' }} />

        <div style={{ padding: '0 4px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Keyboard size={14} />
            <span>Shortcut</span>
          </div>
          <div className="shortcut-display">
            <span className="key">Ctrl</span>
            <span className="key">Alt</span>
            <span className="key">R</span>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Sidebar;
