import React from 'react';
import { Settings, Database } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SettingsPage({ settings, setSettings, user }) {
  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const sections = [
    {
      id: 'profile',
      title: 'Profile',
      icon: <Settings size={18} />,
      items: [
        { label: 'Email', value: user?.email || 'N/A', type: 'text', readonly: true },
      ]
    },
    {
      id: 'preferences',
      title: 'Preferences',
      icon: <Database size={18} />,
      items: [
        {
          id: 'autoOpenResults',
          label: 'Auto-open Results',
          desc: 'Navigate to the summary automatically when analysis completes.',
          type: 'toggle'
        },
        {
          id: 'compactRiskCards',
          label: 'Compact Cards',
          desc: 'Reduce spacing in risk cards for denser reading.',
          type: 'toggle'
        },
      ]
    }
  ];

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Settings</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Manage your preferences.</p>
      </motion.div>

      <div className="space-y-6">
        {sections.map((section, idx) => (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={section.id}
            className="glass-card p-6"
          >
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--color-border)]">
              <div className="text-[var(--color-text-subtle)]">{section.icon}</div>
              <h2 className="text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider">{section.title}</h2>
            </div>

            <div className="space-y-5">
              {section.items.map((item, i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="max-w-[70%]">
                    <p className="text-sm font-medium text-[var(--color-text)]">{item.label}</p>
                    {item.desc && (
                      <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">{item.desc}</p>
                    )}
                  </div>
                  {item.type === 'toggle' ? (
                    <button
                      onClick={() => toggleSetting(item.id)}
                      className={`w-11 h-6 rounded-full transition-all relative ${settings[item.id] ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-surface-3)]'}`}
                    >
                      <motion.div
                        animate={{ x: settings[item.id] ? 22 : 3 }}
                        className="w-4 h-4 rounded-full bg-white absolute top-1 shadow-sm"
                      />
                    </button>
                  ) : (
                    <div className="px-3 py-1.5 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded text-xs text-[var(--color-text-muted)]">
                      {item.value}
                    </div>
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
