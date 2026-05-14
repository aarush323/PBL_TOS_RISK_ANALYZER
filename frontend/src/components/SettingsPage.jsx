import React from 'react';
import { Settings, Database } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from './theme-context.js';

export default function SettingsPage({ settings, setSettings, user }) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';

  const s = {
    font: 'Anthropic Sans, sans-serif', mono: 'Anthropic Mono, monospace', serif: 'Anthropic Serif, serif',
    border: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)',
    surface: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
    surfaceCard: 'var(--bg-surface)',
    textPrimary: 'var(--text-primary)',
    textSecondary: 'var(--text-secondary)',
    textTertiary: 'var(--text-tertiary)',
  };

  const toggleSetting = (key) => setSettings(p => ({ ...p, [key]: !p[key] }));

  const sections = [
    {
      id: 'profile', title: 'Profile', icon: <Settings size={16} />,
      items: [{ label: 'Email', value: user?.email || 'N/A', type: 'text', readonly: true }]
    },
    {
      id: 'preferences', title: 'Preferences', icon: <Database size={16} />,
      items: [
        { id: 'autoOpenResults', label: 'Auto-open Results', desc: 'Navigate to the summary automatically when analysis completes.', type: 'toggle' },
        { id: 'compactRiskCards', label: 'Compact Cards', desc: 'Reduce spacing in risk cards for denser reading.', type: 'toggle' },
      ]
    }
  ];

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: s.serif, fontSize: '32px', fontWeight: '400', color: s.textPrimary, margin: '0 0 8px', letterSpacing: '-0.02em' }}>Settings</h1>
        <p style={{ fontFamily: s.font, fontSize: '14px', color: s.textSecondary, fontWeight: '300', margin: 0 }}>Manage your preferences and account details.</p>
      </motion.div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {sections.map((sec, idx) => (
          <motion.div key={sec.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }}
            style={{ background: s.surfaceCard, borderRadius: '16px', border: `1px solid ${s.border}`, padding: '24px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '16px', marginBottom: '24px', borderBottom: `1px solid ${s.border}` }}>
              <div style={{ color: s.textTertiary }}>{sec.icon}</div>
              <h2 style={{ fontFamily: s.mono, fontSize: '11px', fontWeight: '500', color: s.textSecondary, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>{sec.title}</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {sec.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ maxWidth: '70%' }}>
                    <p style={{ fontFamily: s.font, fontSize: '14px', fontWeight: '500', color: s.textPrimary, margin: '0 0 4px' }}>{item.label}</p>
                    {item.desc && <p style={{ fontFamily: s.font, fontSize: '13px', color: s.textTertiary, fontWeight: '300', margin: 0, lineHeight: '1.5' }}>{item.desc}</p>}
                  </div>
                  {item.type === 'toggle' ? (
                    <button onClick={() => toggleSetting(item.id)} style={{
                      width: '44px', height: '24px', borderRadius: '12px', position: 'relative', cursor: 'pointer', border: 'none',
                      background: settings[item.id] ? (isDark ? '#fff' : '#000') : s.surface, transition: 'all 0.2s'
                    }}>
                      <motion.div animate={{ x: settings[item.id] ? 22 : 2 }} style={{
                        width: '20px', height: '20px', borderRadius: '50%', position: 'absolute', top: '2px',
                        background: settings[item.id] ? (isDark ? '#000' : '#fff') : s.textTertiary,
                      }} />
                    </button>
                  ) : (
                    <div style={{ padding: '6px 12px', background: s.surface, border: `1px solid ${s.border}`, borderRadius: '6px',
                      fontFamily: s.mono, fontSize: '12px', color: s.textSecondary }}>{item.value}</div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
