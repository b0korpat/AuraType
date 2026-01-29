import React, { useState, Component } from 'react';
import Titlebar from './components/Titlebar';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import SetupPage from './pages/SetupPage';
import { RecordingProvider } from './hooks/useRecording';

// Error boundary to catch React errors
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '40px', 
          color: 'white', 
          background: '#0a0a0a',
          minHeight: '100vh'
        }}>
          <h1 style={{ color: '#ef4444', marginBottom: '16px' }}>Something went wrong</h1>
          <p style={{ color: '#a0a0a0', marginBottom: '16px' }}>
            The app encountered an error. Please try restarting.
          </p>
          <pre style={{ 
            background: '#1a1a1a', 
            padding: '16px', 
            borderRadius: '8px',
            overflow: 'auto',
            fontSize: '12px',
            color: '#ef4444'
          }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '16px',
              padding: '10px 20px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const [currentPage, setCurrentPage] = useState('home');

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'history':
        return <HistoryPage />;
      case 'settings':
        return <SettingsPage />;
      case 'setup':
        return <SetupPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <ErrorBoundary>
      <RecordingProvider>
        <div className="app">
          <Titlebar />
          <div className="app-container">
            <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
            <main className="main-content">
              {renderPage()}
            </main>
          </div>
        </div>
      </RecordingProvider>
    </ErrorBoundary>
  );
}

export default App;
