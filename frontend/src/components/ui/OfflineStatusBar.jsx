import { useEffect, useState } from 'react';

export default function OfflineStatusBar() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '40px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
      color: 'white',
      padding: '12px 24px',
      borderRadius: '50px',
      zIndex: 2000,
      fontWeight: 500,
      fontSize: '14px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      boxShadow: '0 8px 32px rgba(6, 182, 212, 0.4), 0 2px 8px rgba(0, 0, 0, 0.15)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      maxWidth: 'fit-content',
      whiteSpace: 'nowrap',
      animation: 'slideUp 0.4s ease-out'
    }}>
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: '#fbbf24',
        animation: 'pulse 2s infinite',
        boxShadow: '0 0 8px rgba(251, 191, 36, 0.6)'
      }}></div>
      <span>You're offline</span>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.1); }
          }
          @keyframes slideUp {
            0% { 
              opacity: 0; 
              transform: translateX(-50%) translateY(20px); 
            }
            100% { 
              opacity: 1; 
              transform: translateX(-50%) translateY(0); 
            }
          }
        `
      }} />
    </div>
  );
}
