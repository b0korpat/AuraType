import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Loader2, Mic, Check } from 'lucide-react';
import './styles/overlay.css';

function Overlay() {
  const [state, setState] = useState('hidden'); // hidden, recording, processing, success
  const [volume, setVolume] = useState(0);

  useEffect(() => {
    // Listen for overlay state changes
    const cleanup = window.electronAPI?.onOverlayState((data) => {
      setState(data.state);
    });

    // Mock volume visualization
    const volInterval = setInterval(() => {
      if (state === 'recording') {
        setVolume(Math.random() * 0.5 + 0.3); // Random volume between 0.3 and 0.8
      } else {
        setVolume(0);
      }
    }, 100);

    return () => {
      cleanup?.();
      clearInterval(volInterval);
    };
  }, [state]);

  if (state === 'hidden') return null;

  return (
    <div className={`overlay-container ${state !== 'hidden' ? 'visible' : ''}`}>
      <div className={`overlay-pill ${state}`}>
        
        {state === 'recording' && (
          <>
            <div className="icon-wrapper recording">
              <div className="mic-icon">
                <Mic size={18} color="white" />
              </div>
              <div className="pulse-ring"></div>
            </div>
            <div className="status-text">Listening...</div>
            <div className="visualizer">
              {[...Array(8)].map((_, i) => (
                <div 
                  key={i} 
                  className="vis-bar" 
                  style={{ 
                    height: `${Math.max(4, Math.random() * 16 + (volume * 10))}px`,
                    animationDelay: `${i * 0.05}s`
                  }}
                ></div>
              ))}
            </div>
          </>
        )}

        {state === 'processing' && (
          <>
            <div className="icon-wrapper processing">
              <Loader2 size={18} className="spin" color="var(--accent)" />
            </div>
            <div className="status-text">Processing...</div>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="icon-wrapper success">
              <Check size={18} color="white" />
            </div>
            <div className="status-text">Done</div>
          </>
        )}

      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('overlay-root')).render(
  <React.StrictMode>
    <Overlay />
  </React.StrictMode>
);
