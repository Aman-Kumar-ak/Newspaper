import { useState, useEffect } from 'react';
import { startGoogleLogin } from '../../lib/auth';

export default function Login() {
  const [currentImage, setCurrentImage] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const images = [
    '/images/1.jpg',
    '/images/2.jpg',
    '/images/3.jpg',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentImage((prev) => (prev + 1) % images.length);
        setIsTransitioning(false);
      }, 1000); // Match transition duration
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Animated Background Images */}
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
      }}>
        {images.map((img, index) => (
          <div
            key={img}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${img})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              opacity: index === currentImage ? 1 : 0,
              transform: isTransitioning && index === currentImage 
                ? 'translateX(0%) scale(1.05)' 
                : index === currentImage 
                ? 'translateX(0%) scale(1)' 
                : 'translateX(-100%)',
              transition: 'all 1s cubic-bezier(0.645, 0.045, 0.355, 1)',
              willChange: 'transform, opacity',
            }}
          />
        ))}
        
        {/* Overlay for better text readability */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.6) 100%)',
          backdropFilter: 'blur(2px)',
          }} />
      </div>

      {/* Login Card - Centered */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        padding: '48px 40px',
        borderRadius: '24px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 100px rgba(255, 255, 255, 0.1)',
        minWidth: '400px',
        maxWidth: '90%',
        textAlign: 'center',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        animation: 'fadeInUp 0.8s ease-out',
      }}>
        {/* Logo/Title Section */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 20px',
            background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 30px rgba(6, 182, 212, 0.3)',
            padding: '12px',
          }}>
            <img 
              src="/logo.png" 
              alt="Cloud Newspaper Logo" 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          </div>
          
          <h1 style={{ 
            fontSize: '32px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '12px',
            letterSpacing: '-0.5px',
          }}>
            Cloud Newspaper
          </h1>
          
          <p style={{ 
            fontSize: '16px',
            color: '#6B7280',
            fontWeight: '500',
            margin: 0,
          }}>
            Your Digital News Library
          </p>
        </div>

        <div style={{
          marginBottom: '24px',
          paddingBottom: '24px',
          borderBottom: '1px solid #E5E7EB',
        }}>
          <h2 style={{ 
            fontSize: '24px',
            fontWeight: '600',
            color: '#1F2937',
            marginBottom: '8px',
          }}>
            Sign in
          </h2>
          <p style={{ 
            fontSize: '14px',
            color: '#6B7280',
            margin: 0,
          }}>
            Please sign in with Google to continue
          </p>
        </div>

        <button 
          onClick={startGoogleLogin}
          style={{
            width: '100%',
            padding: '14px 24px',
            background: 'white',
            border: '2px solid #E5E7EB',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: '600',
            color: '#1F2937',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            outline: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#F9FAFB';
            e.currentTarget.style.borderColor = '#06b6d4';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 16px rgba(6, 182, 212, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white';
            e.currentTarget.style.borderColor = '#E5E7EB';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}



