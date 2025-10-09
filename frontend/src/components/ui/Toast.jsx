export default function Toast({ message, visible, type = 'success' }) {
  if (!visible) return null;
  
  const getToastStyles = () => {
    const baseStyles = {
      success: {
        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        color: '#FFFFFF',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        boxShadow: '0 8px 32px rgba(16, 185, 129, 0.25), 0 2px 8px rgba(0, 0, 0, 0.1)',
      },
      error: {
        background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
        color: '#FFFFFF',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        boxShadow: '0 8px 32px rgba(239, 68, 68, 0.25), 0 2px 8px rgba(0, 0, 0, 0.1)',
      },
      info: {
        background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
        color: '#FFFFFF',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        boxShadow: '0 8px 32px rgba(59, 130, 246, 0.25), 0 2px 8px rgba(0, 0, 0, 0.1)',
      },
      warning: {
        background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        color: '#FFFFFF',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        boxShadow: '0 8px 32px rgba(245, 158, 11, 0.25), 0 2px 8px rgba(0, 0, 0, 0.1)',
      }
    };
    return baseStyles[type] || baseStyles.success;
  };

  const toastStyles = getToastStyles();

  return (
    <div 
      className="toast-notification" 
      data-type={type}
      style={{ 
        position: 'fixed',
        left: '50%',
        bottom: '24px',
        transform: 'translateX(-50%)',
        ...toastStyles,
        padding: '14px 20px',
        borderRadius: '12px',
        zIndex: 1000,
        minWidth: '280px',
        maxWidth: '500px',
        backdropFilter: 'blur(12px)',
        fontSize: '15px',
        fontWeight: '600',
        lineHeight: '1.3',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        textAlign: 'center',
        animation: 'toastSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        userSelect: 'none',
        letterSpacing: '0.01em',
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
      }}
    >
      {message}
      <style>{`
        @keyframes toastSlideUp {
          0% {
            transform: translate(-50%, 100%);
            opacity: 0;
          }
          100% {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
        
        @keyframes toastSlideDown {
          0% {
            transform: translate(-50%, 0);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, 100%);
            opacity: 0;
          }
        }
        
        .toast-notification {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .toast-notification {
            left: 16px !important;
            right: 16px !important;
            transform: translateX(0) !important;
            width: calc(100vw - 32px) !important;
            min-width: unset !important;
            max-width: unset !important;
            bottom: 96px !important; /* Position above floating action buttons */
            font-size: 15px !important;
            font-weight: 600 !important;
            padding: 18px 20px !important;
            border-radius: 14px !important;
            backdrop-filter: blur(16px) !important;
            -webkit-backdrop-filter: blur(16px) !important;
            text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2) !important;
            letter-spacing: 0.02em !important;
          }
          
          /* Animation adjustments for mobile */
          @keyframes toastSlideUp {
            0% {
              transform: translateX(0) translateY(100%);
              opacity: 0;
            }
            100% {
              transform: translateX(0) translateY(0);
              opacity: 1;
            }
          }
        }
        
        /* Smaller phones (iPhone SE, etc.) */
        @media (max-width: 480px) {
          .toast-notification {
            left: 12px !important;
            right: 12px !important;
            width: calc(100vw - 24px) !important;
            bottom: 88px !important;
            font-size: 14px !important;
            font-weight: 600 !important;
            padding: 16px 18px !important;
            line-height: 1.3 !important;
            border-radius: 12px !important;
          }
        }
        
        /* Landscape phones */
        @media (max-width: 768px) and (orientation: landscape) {
          .toast-notification {
            bottom: 24px !important;
            font-size: 13px !important;
            padding: 12px 16px !important;
          }
        }
        
        /* Safe area support for phones with notches/home indicators */
        @supports (bottom: env(safe-area-inset-bottom)) {
          @media (max-width: 768px) {
            .toast-notification {
              bottom: calc(96px + env(safe-area-inset-bottom)) !important;
            }
          }
          
          @media (max-width: 480px) {
            .toast-notification {
              bottom: calc(88px + env(safe-area-inset-bottom)) !important;
            }
          }
          
          @media (max-width: 768px) and (orientation: landscape) {
            .toast-notification {
              bottom: calc(24px + env(safe-area-inset-bottom)) !important;
            }
          }
        }
        
        /* Ensure it appears above upload tray and other elements */
        .toast-notification {
          z-index: 1000 !important;
        }
        
        /* High-priority notifications that need to appear above modals */
        .toast-notification.toast-high-priority {
          z-index: 10001 !important;
        }
        
        /* Ensure proper rendering on mobile Safari */
        @supports (-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px)) {
          @media (max-width: 768px) {
            .toast-notification[data-type="success"] {
              background: linear-gradient(135deg, rgba(16, 185, 129, 0.98) 0%, rgba(5, 150, 105, 0.98) 100%) !important;
              box-shadow: 0 12px 40px rgba(16, 185, 129, 0.35), 0 4px 12px rgba(0, 0, 0, 0.15) !important;
            }
            .toast-notification[data-type="error"] {
              background: linear-gradient(135deg, rgba(239, 68, 68, 0.98) 0%, rgba(220, 38, 38, 0.98) 100%) !important;
              box-shadow: 0 12px 40px rgba(239, 68, 68, 0.35), 0 4px 12px rgba(0, 0, 0, 0.15) !important;
            }
            .toast-notification[data-type="info"] {
              background: linear-gradient(135deg, rgba(59, 130, 246, 0.98) 0%, rgba(37, 99, 235, 0.98) 100%) !important;
              box-shadow: 0 12px 40px rgba(59, 130, 246, 0.35), 0 4px 12px rgba(0, 0, 0, 0.15) !important;
            }
            .toast-notification[data-type="warning"] {
              background: linear-gradient(135deg, rgba(245, 158, 11, 0.98) 0%, rgba(217, 119, 6, 0.98) 100%) !important;
              box-shadow: 0 12px 40px rgba(245, 158, 11, 0.35), 0 4px 12px rgba(0, 0, 0, 0.15) !important;
            }
          }
        }
      `}</style>
    </div>
  );
}

