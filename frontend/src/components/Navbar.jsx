import React from 'react';
import { Link2, Cpu, Database, Activity, User, LogOut, Award, Code2 } from 'lucide-react';

export default function Navbar({ user, onOpenAuth, onLogout, onOpenResumeModal }) {
  return (
    <nav className="glass-panel" style={{ borderRadius: '0 0 24px 24px', padding: '18px 36px', marginBottom: '36px' }}>
      <div style={{ maxWidth: '1300px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        
        {/* Brand & Author */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #00f2fe 0%, #3b82f6 100%)',
            padding: '12px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(0, 242, 254, 0.4)'
          }}>
            <Link2 size={28} color="#050811" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 className="gradient-text" style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '-0.5px' }}>
                SwiftURL Enterprise
              </h1>
              <span className="badge-pill badge-cyan" style={{ fontSize: '10px' }}>v2.4 Production</span>
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Award size={13} color="#f59e0b" /> Designed & Engineered by <strong style={{ color: '#f8fafc' }}>Koushik Bobba</strong>
            </p>
          </div>
        </div>

        {/* System Architecture Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="badge-pill badge-cyan">
            <Cpu size={14} /> C++ Crow Engine
          </span>
          <span className="badge-pill badge-purple">
            <Database size={14} /> Redis + Postgres
          </span>
          <span className="badge-pill badge-green">
            <Activity size={14} /> RabbitMQ Queue
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          
          {/* Resume / System Design Deep Dive Button */}
          <button
            className="gradient-btn-purple"
            onClick={onOpenResumeModal}
            style={{ padding: '10px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Code2 size={16} /> Resume Highlights & Arch
          </button>

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.06)', padding: '8px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <User size={16} color="#00f2fe" />
                <span style={{ fontSize: '14px', fontWeight: '700' }}>{user.username}</span>
              </div>
              <button 
                onClick={onLogout}
                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px' }}
              >
                <LogOut size={16} /> Exit
              </button>
            </div>
          ) : (
            <button 
              className="gradient-btn"
              onClick={onOpenAuth}
              style={{ padding: '10px 20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              Sign In / Register
            </button>
          )}
        </div>

      </div>
    </nav>
  );
}
