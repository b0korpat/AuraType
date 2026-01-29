import React from 'react';
import { Minus, Square, X, Mic } from 'lucide-react';

function Titlebar() {
  const handleMinimize = () => window.electronAPI?.minimize();
  const handleMaximize = () => window.electronAPI?.maximize();
  const handleClose = () => window.electronAPI?.close();

  return (
    <div className="titlebar">
      <div className="titlebar-title">
        <Mic />
        <span>AuraType</span>
      </div>
      <div className="titlebar-buttons">
        <button className="titlebar-btn" onClick={handleMinimize}>
          <Minus size={14} />
        </button>
        <button className="titlebar-btn" onClick={handleMaximize}>
          <Square size={12} />
        </button>
        <button className="titlebar-btn close" onClick={handleClose}>
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

export default Titlebar;
