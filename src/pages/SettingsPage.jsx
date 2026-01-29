import React, { useState, useEffect } from 'react';
import { Keyboard, Volume2, Globe, Info, Zap, Server, Key, Save, Check, Download } from 'lucide-react';
import SetupComponent from '../components/SetupComponent';

function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    transcriptionMode: 'local', // 'local' or 'groq'
    groqApiKey: '',
    language: 'auto',
    whisperModel: 'large-v3-turbo' // Default local model
  });
  const [saveStatus, setSaveStatus] = useState(null);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await window.electronAPI?.getSettings();
      if (data) {
        setSettings(prev => ({
          ...prev,
          transcriptionMode: data.transcriptionMode || 'local',
          groqApiKey: data.groqApiKey || '',
          language: data.language || 'auto',
          whisperModel: data.whisperModel || 'large-v3-turbo'
        }));
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaveStatus('saving');
      await window.electronAPI?.saveSettings(settings);
      setSaveStatus('saved');
      // Dispatch event for sidebar to pick up
      window.dispatchEvent(new Event('settings-changed'));
    } catch (e) {
      console.error('Failed to save:', e);
      setSaveStatus('error');
    }
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaveStatus(null);
  };

  if (loading) {
    return <div className="loading-spinner"></div>;
  }

  return (
    <div style={{ paddingBottom: '40px' }}>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure AuraType</p>
      </div>

      {/* Transcription Mode */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={18} />
            Transcription Engine
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div 
            className={`mode-card ${settings.transcriptionMode === 'local' ? 'active' : ''}`}
            onClick={() => handleChange('transcriptionMode', 'local')}
            style={{
              padding: '20px',
              borderRadius: 'var(--radius-sm)',
              border: `2px solid ${settings.transcriptionMode === 'local' ? 'var(--accent)' : 'var(--border)'}`,
              background: settings.transcriptionMode === 'local' ? 'var(--accent-dim)' : 'var(--bg-tertiary)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <Server size={22} color={settings.transcriptionMode === 'local' ? 'var(--accent)' : 'var(--text-muted)'} />
              <div style={{ fontWeight: 600, fontSize: '15px' }}>Local Whisper</div>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Runs entirely on your device. Private & offline.
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '11px', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-muted)' }}>Privacy: High</span>
              <span style={{ fontSize: '11px', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-muted)' }}>Offline</span>
            </div>
          </div>

          <div 
            className={`mode-card ${settings.transcriptionMode === 'groq' ? 'active' : ''}`}
            onClick={() => handleChange('transcriptionMode', 'groq')}
            style={{
              padding: '20px',
              borderRadius: 'var(--radius-sm)',
              border: `2px solid ${settings.transcriptionMode === 'groq' ? '#f55036' : 'var(--border)'}`,
              background: settings.transcriptionMode === 'groq' ? 'rgba(245, 80, 54, 0.1)' : 'var(--bg-tertiary)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <Zap size={22} color={settings.transcriptionMode === 'groq' ? '#f55036' : 'var(--text-muted)'} />
              <div style={{ fontWeight: 600, fontSize: '15px' }}>Groq Cloud API</div>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Ultra-fast cloud transcription.
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '11px', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px', color: '#f55036' }}>Speed: Instant</span>
              <span style={{ fontSize: '11px', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-muted)' }}>Hungarian: Best</span>
            </div>
          </div>
        </div>

        {settings.transcriptionMode === 'groq' && (
          <div className="setting-section" style={{ animation: 'fadeIn 0.3s' }}>
            <div className="setting-row" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: '12px' }}>
              <div className="setting-info" style={{ width: '100%' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Key size={14} /> Groq API Key
                </h4>
                <p style={{ marginBottom: '8px' }}>
                  Get a free key at <a href="https://console.groq.com/keys" target="_blank" style={{ color: 'var(--accent)' }}>console.groq.com</a>
                </p>
              </div>
              <div style={{ position: 'relative', width: '100%' }}>
                <input 
                  type="password" 
                  className="input" 
                  style={{ width: '100%', fontFamily: 'monospace', paddingRight: '30px' }}
                  placeholder="gsk_..."
                  value={settings.groqApiKey}
                  onChange={(e) => handleChange('groqApiKey', e.target.value)}
                />
                {settings.groqApiKey && (
                  <Check size={16} color="var(--success)" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Language */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={18} />
            Language
          </h3>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <h4>Transcription Language</h4>
            <p>Auto-detect works best for most users</p>
          </div>
          <select 
            className="input" 
            style={{ width: '180px' }}
            value={settings.language}
            onChange={(e) => handleChange('language', e.target.value)}
          >
            <option value="auto">Auto-detect</option>
            <option value="en">English</option>
            <option value="hu">Hungarian</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="it">Italian</option>
            <option value="pt">Portuguese</option>
            <option value="zh">Chinese</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
            <option value="ru">Russian</option>
          </select>
        </div>
      </div>

      {/* Local Whisper Model Configuration */}
      {settings.transcriptionMode === 'local' && (
        <div className="card" style={{ animation: 'fadeIn 0.3s' }}>
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Download size={18} />
              Local Model
            </h3>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <h4>Active Model</h4>
              <p>Select which downloaded model to use</p>
            </div>
            <select 
              className="input" 
              style={{ width: '180px' }}
              value={settings.whisperModel}
              onChange={(e) => handleChange('whisperModel', e.target.value)}
            >
              <option value="large-v3-turbo">Large v3 Turbo</option>
              <option value="medium">Medium</option>
              <option value="base">Base</option>
              <option value="small">Small</option>
              <option value="large-v3">Large v3</option>
              <option value="tiny">Tiny</option>
            </select>
          </div>
          
          {/* Toggle Setup View */}
          <div style={{ marginTop: '16px' }}>
             <button 
               className="btn btn-secondary" 
               style={{ width: '100%', justifyContent: 'space-between' }}
               onClick={() => setShowSetup(!showSetup)}
             >
               <span>Manage Models</span>
               {showSetup ? 'Hide' : 'Show'}
             </button>
             
             {showSetup && (
               <SetupComponent 
                 activeModel={settings.whisperModel}
                 onModelChange={(model) => handleChange('whisperModel', model)}
               />
             )}
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Keyboard size={18} />
            Shortcuts
          </h3>
        </div>
        
        <div className="setting-row">
          <div className="setting-info">
            <h4>Toggle Recording</h4>
            <p>Global shortcut (works in any app)</p>
          </div>
          <div>
            <div className="shortcut-display">
              <span className="key">Ctrl</span>
              <span className="key">Alt</span>
              <span className="key">R</span>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ position: 'sticky', bottom: '20px', display: 'flex', justifyContent: 'flex-end', pointerEvents: 'none' }}>
        <button 
          className="btn btn-primary" 
          onClick={handleSave}
          style={{ 
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            padding: '12px 28px',
            fontSize: '15px',
            pointerEvents: 'auto'
          }}
        >
          {saveStatus === 'saved' ? (
            <>
              <Check size={18} /> Saved
            </>
          ) : (
            <>
              <Save size={18} /> Save Changes
            </>
          )}
        </button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default SettingsPage;
