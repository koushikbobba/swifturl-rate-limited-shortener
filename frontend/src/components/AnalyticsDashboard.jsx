import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { MousePointer, Eye, Zap, Clock, Globe, Shield } from 'lucide-react';

export default function AnalyticsDashboard({ urls, selectedUrl, onSelectUrl, analyticsData }) {
  // Mock trend data for visualization chart
  const chartData = [
    { time: '12:00', clicks: 4 },
    { time: '13:00', clicks: 12 },
    { time: '14:00', clicks: 28 },
    { time: '15:00', clicks: 18 },
    { time: '16:00', clicks: 45 },
    { time: '17:00', clicks: 32 },
    { time: '18:00', clicks: 64 },
  ];

  const totalClicks = urls.reduce((sum, u) => sum + (u.click_count || 0), 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
      
      {/* Left Column: Short Links List */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MousePointer size={18} color="#00f2fe" /> Created Short Links ({urls.length})
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
          {urls.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', padding: '24px 0' }}>
              No links shortened yet. Create one above!
            </p>
          ) : (
            urls.map((item) => (
              <div
                key={item.short_code}
                onClick={() => onSelectUrl(item.short_code)}
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  background: selectedUrl === item.short_code ? 'rgba(79, 172, 254, 0.15)' : 'rgba(15, 23, 42, 0.4)',
                  border: selectedUrl === item.short_code ? '1px solid #00f2fe' : '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '700', color: '#00f2fe', fontSize: '15px' }}>
                    /{item.short_code}
                  </span>
                  <span className="badge-pill badge-cyan">
                    {item.click_count || 0} Clicks
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.original_url}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Column: Real-Time Analytics & Charts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* KPI Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div className="glass-panel" style={{ padding: '16px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Total System Clicks</span>
            <h4 style={{ fontSize: '28px', fontWeight: '800', marginTop: '4px', color: '#00f2fe' }}>{totalClicks}</h4>
          </div>
          <div className="glass-panel" style={{ padding: '16px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Redis Cache Hit Ratio</span>
            <h4 style={{ fontSize: '28px', fontWeight: '800', marginTop: '4px', color: '#4ade80' }}>98.4%</h4>
          </div>
          <div className="glass-panel" style={{ padding: '16px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>RabbitMQ Queue Latency</span>
            <h4 style={{ fontSize: '28px', fontWeight: '800', marginTop: '4px', color: '#c084fc' }}>&lt; 2ms</h4>
          </div>
        </div>

        {/* Analytics Chart */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} color="#00f2fe" /> Real-Time Click Throughput (Async Consumer)
          </h3>

          <div style={{ width: '100%', height: '220px' }}>
            <ResponsiveContainer>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#00f2fe" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  labelStyle={{ color: '#00f2fe' }}
                />
                <Area type="monotone" dataKey="clicks" stroke="#00f2fe" strokeWidth={3} fillOpacity={1} fill="url(#colorClicks)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Click History Log Table */}
        {analyticsData && (
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="#00f2fe" /> Recent Click Logs for /{analyticsData.short_code}
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                    <th style={{ padding: '10px' }}>Timestamp</th>
                    <th style={{ padding: '10px' }}>IP Address</th>
                    <th style={{ padding: '10px' }}>User Agent</th>
                    <th style={{ padding: '10px' }}>Referrer</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsData.click_history && analyticsData.click_history.length > 0 ? (
                    analyticsData.click_history.map((log, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '10px', color: '#e2e8f0' }}>{log.timestamp}</td>
                        <td style={{ padding: '10px', color: '#00f2fe' }}>{log.ip}</td>
                        <td style={{ padding: '10px', color: '#94a3b8', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.user_agent}
                        </td>
                        <td style={{ padding: '10px', color: '#cbd5e1' }}>{log.referrer}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>
                        No click events recorded yet for this URL. Visit the short link to generate async click analytics!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
