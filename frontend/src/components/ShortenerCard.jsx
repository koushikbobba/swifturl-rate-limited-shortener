import React, { useState } from 'react';
import { Link, Sparkles, Copy, Check, QrCode, AlertTriangle, Zap, ShieldAlert } from 'lucide-react';

export default function ShortenerCard({ onUrlCreated, rateLimitRemaining }) {
  const [originalUrl, setOriginalUrl] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdUrl, setCreatedUrl] = useState(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!originalUrl.trim()) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const token = localStorage.getItem('jwt_token');
      const response = await fetch('http://localhost:8080/api/shorten', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          original_url: originalUrl,
          custom_slug: customSlug || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('⚠️ Rate limit exceeded! You have exceeded 10 requests / 60 seconds.');
        } else {
          throw new Error(data.error || 'Failed to shorten URL');
        }
      }

      setCreatedUrl(data);
      onUrlCreated(data);
      setOriginalUrl('');
      setCustomSlug('');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!createdUrl) return;
    navigator.clipboard.writeText(createdUrl.short_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px' }}>
      
      {/* Header Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '6px' }}>Shorten Long URL</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>
            Generates high-speed Base62 short links with sliding-window rate protection.
          </p>
        </div>

        {/* Rate Limiter Status Indicator */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '8px 16px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Zap size={16} color={rateLimitRemaining <= 2 ? '#ef4444' : '#00f2fe'} />
          <span style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: '600' }}>
            Rate Limit: <strong style={{ color: rateLimitRemaining <= 2 ? '#ef4444' : '#00f2fe' }}>{rateLimitRemaining}</strong> / 10 left (60s window)
          </span>
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ position: 'relative' }}>
            <Link size={18} color="#64748b" style={{ position: 'absolute', left: '16px', top: '16px' }} />
            <input
              type="url"
              className="glass-input"
              style={{ paddingLeft: '48px' }}
              placeholder="Paste your long destination URL (e.g. https://github.com/drogonframework/drogon)..."
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <input
              type="text"
              className="glass-input"
              style={{ flex: 1 }}
              placeholder="Custom Short Slug (Optional, e.g., cpp-fast-link)"
              value={customSlug}
              onChange={(e) => setCustomSlug(e.target.value)}
            />

            <button
              type="submit"
              className="gradient-btn"
              disabled={loading}
              style={{ padding: '0 32px', height: '50px', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? <Sparkles size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {loading ? 'Shortening...' : 'Create Short Link'}
            </button>
          </div>

        </div>
      </form>

      {/* Error Alert */}
      {errorMsg && (
        <div style={{
          marginTop: '20px',
          padding: '14px 18px',
          borderRadius: '12px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#f87171',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '14px'
        }}>
          <ShieldAlert size={20} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Generated Result Card */}
      {createdUrl && (
        <div style={{
          marginTop: '24px',
          padding: '20px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.08) 0%, rgba(79, 172, 254, 0.04) 100%)',
          border: '1px solid rgba(0, 242, 254, 0.3)'
        }}>
          <p style={{ fontSize: '12px', color: '#00f2fe', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
            🎉 Short Link Generated Successfully!
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <a
                href={createdUrl.short_url}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '20px', fontWeight: '800', color: '#ffffff', textDecoration: 'none' }}
              >
                {createdUrl.short_url}
              </a>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px', maxWidth: '500px', wordBreak: 'break-all' }}>
                Redirects to: {createdUrl.original_url}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleCopy}
                className="gradient-btn"
                style={{ padding: '10px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {copied ? <Check size={16} color="#4ade80" /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
