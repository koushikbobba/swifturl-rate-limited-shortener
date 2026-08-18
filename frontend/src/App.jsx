import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ShortenerCard from './components/ShortenerCard';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import AuthModal from './components/AuthModal';
import ResumeModal from './components/ResumeModal';
import { Heart, Award, Code2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user_info');
    return saved ? JSON.parse(saved) : null;
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [resumeModalOpen, setResumeModalOpen] = useState(false);
  const [urls, setUrls] = useState([
    {
      short_code: 'demo123',
      short_url: 'http://localhost:8080/r/demo123',
      original_url: 'https://github.com/CrowCpp/Crow',
      click_count: 42,
      created_at: 'Wed Aug 12 20:00:00 2026'
    }
  ]);
  const [selectedUrl, setSelectedUrl] = useState('demo123');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [rateLimitRemaining, setRateLimitRemaining] = useState(10);

  const fetchUserUrls = async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      const response = await fetch('http://localhost:8080/api/user/urls', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.urls && data.urls.length > 0) {
          setUrls(data.urls);
        }
      }
    } catch (err) {
      console.log('Backend sync offline fallback');
    }
  };

  const fetchAnalytics = async (code) => {
    try {
      const token = localStorage.getItem('jwt_token');
      const response = await fetch(`http://localhost:8080/api/analytics/${code}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      }
    } catch (err) {
      setAnalyticsData({
        short_code: code,
        original_url: 'https://github.com/CrowCpp/Crow',
        total_clicks: 42,
        click_history: [
          { timestamp: '2026-08-12 20:10:00', ip: '192.168.1.45', user_agent: 'Mozilla/5.0 (Windows NT 10.0)', referrer: 'Direct' },
          { timestamp: '2026-08-12 20:12:30', ip: '10.0.0.12', user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)', referrer: 'https://google.com' }
        ]
      });
    }
  };

  useEffect(() => {
    fetchUserUrls();
  }, []);

  useEffect(() => {
    if (selectedUrl) {
      fetchAnalytics(selectedUrl);
    }
  }, [selectedUrl]);

  const handleUrlCreated = (newUrlData) => {
    setUrls((prev) => [newUrlData, ...prev]);
    setSelectedUrl(newUrlData.short_code);
    if (newUrlData.rate_limit_remaining !== undefined) {
      setRateLimitRemaining(newUrlData.rate_limit_remaining);
    }
  };

  const handleAuthSuccess = (authData) => {
    const userInfo = { username: authData.username };
    setUser(userInfo);
    localStorage.setItem('jwt_token', authData.token);
    localStorage.setItem('user_info', JSON.stringify(userInfo));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_info');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <Navbar
          user={user}
          onOpenAuth={() => setAuthModalOpen(true)}
          onLogout={handleLogout}
          onOpenResumeModal={() => setResumeModalOpen(true)}
        />

        <main style={{ maxWidth: '1300px', margin: '0 auto', padding: '0 24px' }}>
          <ShortenerCard
            onUrlCreated={handleUrlCreated}
            rateLimitRemaining={rateLimitRemaining}
          />

          <AnalyticsDashboard
            urls={urls}
            selectedUrl={selectedUrl}
            onSelectUrl={setSelectedUrl}
            analyticsData={analyticsData}
          />
        </main>
      </div>

      <footer style={{
        marginTop: '64px',
        padding: '32px 0',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(5, 8, 17, 0.95)',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '13px', color: '#94a3b8' }}>
            SwiftURL System Architecture © 2026. Designed & Developed by <strong style={{ color: '#00f2fe' }}>Koushik Bobba</strong>.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => setResumeModalOpen(true)}
              style={{ background: 'transparent', border: 'none', color: '#c084fc', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}
            >
              Resume Bullet Points & System Design
            </button>
          </div>
        </div>
      </footer>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      <ResumeModal
        isOpen={resumeModalOpen}
        onClose={() => setResumeModalOpen(false)}
      />
    </div>
  );
}
