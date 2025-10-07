// Helper function for navigation
const navigateTo = (path) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

export default function TermsAndConditions() {
  const handleBack = () => {
    const authed = !!(localStorage.getItem('googleTokens'));
    navigateTo(authed ? '/home' : '/login');
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
          <h1 style={{ fontSize: '36px', fontWeight: 700, margin: 0, color: '#111827' }}>Terms and Conditions</h1>
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
              1. Agreement to Terms
            </h2>
            <p style={{ marginBottom: '16px' }}>
              By accessing and using Cloud Newspaper ("the Service"), you accept and agree to be bound by the 
              terms and provision of this agreement. If you do not agree to these Terms and Conditions, please 
              do not use the Service.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>
              2. Use License
            </h2>
            <p style={{ marginBottom: '12px' }}>
              Permission is granted to temporarily access and use Cloud Newspaper for personal, non-commercial 
              use only. This license shall automatically terminate if you violate any of these restrictions.
            </p>
            <p style={{ marginBottom: '12px' }}>Under this license, you may not:</p>
            <ul style={{ paddingLeft: '24px', marginBottom: '16px' }}>
              <li style={{ marginBottom: '8px' }}>Modify or copy the materials</li>
              <li style={{ marginBottom: '8px' }}>Use the materials for any commercial purpose</li>
              <li style={{ marginBottom: '8px' }}>Attempt to reverse engineer any software contained in the Service</li>
              <li style={{ marginBottom: '8px' }}>Remove any copyright or proprietary notations from the materials</li>
              <li style={{ marginBottom: '8px' }}>Transfer the materials to another person or "mirror" the materials on any other server</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>
              3. User Account and Google Integration
            </h2>
            <p style={{ marginBottom: '12px' }}>
              To use Cloud Newspaper, you must:
            </p>
            <ul style={{ paddingLeft: '24px', marginBottom: '16px' }}>
              <li style={{ marginBottom: '8px' }}>Have a valid Google account</li>
              <li style={{ marginBottom: '8px' }}>Grant necessary permissions to access your Google Drive</li>
              <li style={{ marginBottom: '8px' }}>Maintain the confidentiality of your account credentials</li>
              <li style={{ marginBottom: '8px' }}>Accept responsibility for all activities that occur under your account</li>
            </ul>
            <p style={{ marginBottom: '16px' }}>
              You may revoke access to your Google Drive at any time through your Google account settings.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>
              4. User Content and Conduct
            </h2>
            <p style={{ marginBottom: '12px' }}>You are responsible for:</p>
            <ul style={{ paddingLeft: '24px', marginBottom: '16px' }}>
              <li style={{ marginBottom: '8px' }}>All content you upload or store through the Service</li>
              <li style={{ marginBottom: '8px' }}>Ensuring you have the right to upload and share any content</li>
              <li style={{ marginBottom: '8px' }}>Complying with all applicable laws and regulations</li>
              <li style={{ marginBottom: '8px' }}>Not uploading any illegal, harmful, threatening, abusive, or offensive content</li>
            </ul>
            <p style={{ marginBottom: '16px' }}>
              We reserve the right to remove any content that violates these terms or is deemed inappropriate.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>
              5. Service Availability
            </h2>
            <p style={{ marginBottom: '16px' }}>
              We strive to provide reliable service, but we do not guarantee that:
            </p>
            <ul style={{ paddingLeft: '24px', marginBottom: '16px' }}>
              <li style={{ marginBottom: '8px' }}>The Service will be uninterrupted, timely, secure, or error-free</li>
              <li style={{ marginBottom: '8px' }}>The results obtained from the use of the Service will be accurate or reliable</li>
              <li style={{ marginBottom: '8px' }}>Any errors in the Service will be corrected</li>
            </ul>
            <p style={{ marginBottom: '16px' }}>
              We reserve the right to modify or discontinue the Service at any time without notice.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>
              6. Data and Privacy
            </h2>
            <p style={{ marginBottom: '16px' }}>
              Your use of the Service is also governed by our Privacy Policy. We do not store your PDF files 
              on our servers; they remain in your Google Drive. We only maintain authentication tokens to 
              access your Google Drive on your behalf.
            </p>
            <p style={{ marginBottom: '16px' }}>
              You acknowledge and agree that:
            </p>
            <ul style={{ paddingLeft: '24px', marginBottom: '16px' }}>
              <li style={{ marginBottom: '8px' }}>We are not responsible for the security of your Google account</li>
              <li style={{ marginBottom: '8px' }}>You are responsible for backing up your data</li>
              <li style={{ marginBottom: '8px' }}>We may access your content to provide technical support or enforce these terms</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>
              7. Intellectual Property
            </h2>
            <p style={{ marginBottom: '16px' }}>
              The Service and its original content, features, and functionality are owned by Cloud Newspaper 
              and are protected by international copyright, trademark, patent, trade secret, and other 
              intellectual property laws.
            </p>
            <p style={{ marginBottom: '16px' }}>
              You retain all rights to your content stored in Google Drive. By using the Service, you grant 
              us a limited license to access and display your content solely for the purpose of providing the Service.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>
              8. Limitation of Liability
            </h2>
            <p style={{ marginBottom: '16px' }}>
              In no event shall Cloud Newspaper, nor its directors, employees, partners, agents, suppliers, 
              or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, 
              including without limitation, loss of profits, data, use, goodwill, or other intangible losses, 
              resulting from:
            </p>
            <ul style={{ paddingLeft: '24px', marginBottom: '16px' }}>
              <li style={{ marginBottom: '8px' }}>Your access to or use of or inability to access or use the Service</li>
              <li style={{ marginBottom: '8px' }}>Any conduct or content of any third party on the Service</li>
              <li style={{ marginBottom: '8px' }}>Any content obtained from the Service</li>
              <li style={{ marginBottom: '8px' }}>Unauthorized access, use, or alteration of your transmissions or content</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>
              9. Disclaimer
            </h2>
            <p style={{ marginBottom: '16px' }}>
              The Service is provided on an "AS IS" and "AS AVAILABLE" basis. The Service is provided without 
              warranties of any kind, whether express or implied, including, but not limited to, implied warranties 
              of merchantability, fitness for a particular purpose, non-infringement, or course of performance.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>
              10. Termination
            </h2>
            <p style={{ marginBottom: '16px' }}>
              We may terminate or suspend your access to the Service immediately, without prior notice or 
              liability, for any reason whatsoever, including without limitation if you breach the Terms.
            </p>
            <p style={{ marginBottom: '16px' }}>
              Upon termination, your right to use the Service will immediately cease. You may terminate your 
              use of the Service at any time by revoking access through your Google account settings.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>
              11. Changes to Terms
            </h2>
            <p style={{ marginBottom: '16px' }}>
              We reserve the right to modify or replace these Terms at any time. If a revision is material, 
              we will try to provide at least 30 days' notice prior to any new terms taking effect. What 
              constitutes a material change will be determined at our sole discretion.
            </p>
            <p style={{ marginBottom: '16px' }}>
              By continuing to access or use our Service after those revisions become effective, you agree 
              to be bound by the revised terms.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>
              12. Governing Law
            </h2>
            <p style={{ marginBottom: '16px' }}>
              These Terms shall be governed and construed in accordance with the laws of your jurisdiction, 
              without regard to its conflict of law provisions.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>
              13. Contact Information
            </h2>
            <p style={{ marginBottom: '16px' }}>
              If you have any questions about these Terms and Conditions, please contact us at:
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
            <p style={{ marginTop: '8px' }}>
              By using this service, you acknowledge that you have read and understood these Terms and Conditions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
