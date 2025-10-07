import { useEffect } from 'react';
import { getTokens, setTokens } from '../../state/authStore';
import { logoutGoogle } from '../../lib/auth';

export default function Settings() {
  const tokens = getTokens();

  // If not authenticated, redirect to login
  useEffect(() => {
    if (!tokens.accessToken) {
      window.location.hash = '#/login';
    }
  }, []);

  const handleLogout = async () => {
    await logoutGoogle();
    localStorage.removeItem('googleTokens');
    window.location.hash = '#/login';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F9FAFB',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Header */}
      <header style={{
        background: 'white',
        borderBottom: '1px solid #E5E7EB',
        padding: '16px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h1 style={{
            fontSize: '20px',
            fontWeight: 600,
            color: '#111827',
            margin: 0,
          }}>
            Settings
          </h1>
          <button
            onClick={() => window.location.hash = '#/home'}
            style={{
              background: '#F3F4F6',
              color: '#374151',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#E5E7EB'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#F3F4F6'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to Home
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '32px 24px',
      }}>
        {/* Account Section */}
        <section style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#111827',
            marginBottom: '20px',
          }}>
            Account Information
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Profile Picture */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                fontWeight: 600,
                color: 'white',
              }}>
                {tokens?.username ? tokens.username[0].toUpperCase() : 'U'}
              </div>
              <div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#111827',
                  marginBottom: '4px',
                }}>
                  {tokens?.username || 'User Name'}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#6B7280',
                }}>
                  {tokens?.email || 'user@email.com'}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Preferences Section */}
        <section style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#111827',
            marginBottom: '20px',
          }}>
            Preferences
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: '1px solid #F3F4F6',
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#111827', marginBottom: '4px' }}>
                  Storage Provider
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                  Google Drive
                </div>
              </div>
              <div style={{
                padding: '6px 12px',
                background: '#DBEAFE',
                color: '#1E40AF',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 500,
              }}>
                Connected
              </div>
            </div>
          </div>
        </section>

        {/* Legal Section */}
        <section style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#111827',
            marginBottom: '20px',
          }}>
            Legal
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => window.location.hash = '#/privacy-policy'}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#374151',
                borderRadius: '8px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              Privacy Policy
            </button>
            <button
              onClick={() => window.location.hash = '#/terms-and-conditions'}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#374151',
                borderRadius: '8px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              Terms & Conditions
            </button>
          </div>
        </section>

        {/* Danger Zone */}
        <section style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #FEE2E2',
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#DC2626',
            marginBottom: '12px',
          }}>
            Danger Zone
          </h2>
          <p style={{
            fontSize: '14px',
            color: '#6B7280',
            marginBottom: '16px',
          }}>
            Logging out will remove your session. You'll need to sign in again.
          </p>
          
          <button
            onClick={handleLogout}
            style={{
              background: '#DC2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#B91C1C'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#DC2626'}
          >
            Logout
          </button>
        </section>
      </main>
    </div>
  );
}
