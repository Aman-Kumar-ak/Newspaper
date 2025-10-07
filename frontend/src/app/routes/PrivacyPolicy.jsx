export default function PrivacyPolicy() {
  const handleBack = () => {
    window.history.back();
  };

  const ArrowLeft = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"></line>
      <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
  );

  return (
    <div style={{
      minHeight: '100vh',
      height: '100vh',
      background: '#FFFFFF',
      width: '100%',
      overflowY: 'auto',
      overflowX: 'hidden',
    }}>
      <div style={{
        width: '100%',
        background: '#FFFFFF',
      }}>
        {/* Header */}
        <div style={{
          background: '#FFFFFF',
          padding: '40px',
          borderBottom: '1px solid #E5E7EB',
        }}>
          <button
            onClick={handleBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#F3F4F6',
              border: '1px solid #E5E7EB',
              color: '#374151',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              marginBottom: '20px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#E5E7EB'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#F3F4F6'}
          >
            <ArrowLeft />
            Back
          </button>
          <h1 style={{ fontSize: '36px', fontWeight: 700, margin: 0, color: '#111827' }}>Privacy Policy</h1>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: '8px 0 0' }}>
            Last updated: October 7, 2025
          </p>
        </div>

        {/* Content */}
        <div style={{
          padding: '40px',
          lineHeight: '1.8',
          color: '#374151',
          background: '#FFFFFF',
          width: '100%',
        }}>
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>
              Introduction
            </h2>
            <p style={{ marginBottom: '16px' }}>
              Welcome to Cloud Newspaper. We respect your privacy and are committed to protecting your personal data. 
              This privacy policy will inform you about how we look after your personal data when you visit our 
              application and tell you about your privacy rights and how the law protects you.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>
              Information We Collect
            </h2>
            <p style={{ marginBottom: '12px' }}>We collect the following types of information:</p>
            <ul style={{ paddingLeft: '24px', marginBottom: '16px' }}>
              <li style={{ marginBottom: '8px' }}>
                <strong>Google Account Information:</strong> When you sign in with Google, we receive your name, 
                email address, and profile picture from your Google account.
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>Google Drive Access:</strong> We access your Google Drive files only to display and manage 
                PDF newspapers that you choose to upload or view through our application.
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>Usage Data:</strong> We may collect information about how you use our application, 
                including access times, pages viewed, and the features you use.
              </li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>
              How We Use Your Information
            </h2>
            <p style={{ marginBottom: '12px' }}>We use your information to:</p>
            <ul style={{ paddingLeft: '24px', marginBottom: '16px' }}>
              <li style={{ marginBottom: '8px' }}>Provide and maintain our service</li>
              <li style={{ marginBottom: '8px' }}>Allow you to access and manage your PDF newspapers from Google Drive</li>
              <li style={{ marginBottom: '8px' }}>Authenticate your identity and provide secure access</li>
              <li style={{ marginBottom: '8px' }}>Improve and optimize our application</li>
              <li style={{ marginBottom: '8px' }}>Communicate with you about updates or changes to our service</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>
              Data Storage and Security
            </h2>
            <p style={{ marginBottom: '16px' }}>
              We do not store your PDF files on our servers. All your newspaper files remain in your Google Drive. 
              We only store authentication tokens securely to maintain your session and access your Google Drive 
              on your behalf.
            </p>
            <p style={{ marginBottom: '16px' }}>
              We implement appropriate technical and organizational security measures to protect your personal 
              information against unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>
              Third-Party Services
            </h2>
            <p style={{ marginBottom: '16px' }}>
              We use Google OAuth 2.0 for authentication and Google Drive API for file management. Your use of 
              these services is subject to Google's Privacy Policy. We do not share your personal information 
              with any other third parties without your consent.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>
              Your Rights
            </h2>
            <p style={{ marginBottom: '12px' }}>You have the right to:</p>
            <ul style={{ paddingLeft: '24px', marginBottom: '16px' }}>
              <li style={{ marginBottom: '8px' }}>Access your personal data</li>
              <li style={{ marginBottom: '8px' }}>Request correction of your personal data</li>
              <li style={{ marginBottom: '8px' }}>Request deletion of your personal data</li>
              <li style={{ marginBottom: '8px' }}>Revoke access to your Google Drive at any time through Google account settings</li>
              <li style={{ marginBottom: '8px' }}>Object to processing of your personal data</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>
              Cookies and Tracking
            </h2>
            <p style={{ marginBottom: '16px' }}>
              We use local storage to maintain your session and remember your preferences. We do not use cookies 
              for tracking or advertising purposes.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>
              Changes to This Privacy Policy
            </h2>
            <p style={{ marginBottom: '16px' }}>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting 
              the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>
              Contact Us
            </h2>
            <p style={{ marginBottom: '16px' }}>
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p style={{ 
              background: '#F3F4F6', 
              padding: '16px', 
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '14px',
            }}>
              Email: explorelikeme1@gmail.com
            </p>
          </section>

          <div style={{
            marginTop: '40px',
            paddingTop: '24px',
            borderTop: '2px solid #E5E7EB',
            textAlign: 'center',
            color: '#6B7280',
            fontSize: '14px',
          }}>
            <p>© 2025 Cloud Newspaper. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
