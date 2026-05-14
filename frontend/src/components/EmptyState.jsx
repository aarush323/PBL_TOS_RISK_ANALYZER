import React from 'react';
import { FileSearch, Zap, Plus, ArrowRight } from 'lucide-react';
import { useTheme } from './theme-context.js';

export default function EmptyState({ view, onNewAnalysis }) {
    const { theme } = useTheme();
    const isDark = theme !== 'light';

    const configs = {
        overview: {
            icon: <FileSearch size={36} style={{ color: 'var(--text-secondary)' }} />,
            title: 'No analysis yet',
            description: 'Run an analysis to see the summary, score, and flagged clauses here.',
        },
        clauses: {
            icon: <Zap size={36} style={{ color: 'var(--text-secondary)' }} />,
            title: 'No clause view yet',
            description: 'Run an analysis to review flagged clauses and the model explanation for each one.',
        },
        reports: {
            icon: <FileSearch size={36} style={{ color: 'var(--text-secondary)' }} />,
            title: 'No report yet',
            description: 'Run an analysis first. Then you can generate a longer report from the current results.',
        },
        compare: {
            icon: <FileSearch size={36} style={{ color: 'var(--text-secondary)' }} />,
            title: 'No comparison yet',
            description: 'Analyze at least two documents, then compare their scores and flagged clauses here.',
        }
    };

    const { icon, title, description } = configs[view] || configs.overview;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            padding: '48px 24px',
            textAlign: 'center',
        }}>
            <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px',
            }}>
                {icon}
            </div>

            <h2 style={{
                fontFamily: 'DM Serif Display, serif',
                fontSize: '28px',
                fontWeight: '400',
                color: 'var(--text-primary)',
                margin: '0 0 8px',
                letterSpacing: '-0.02em',
            }}>{title}</h2>

            <p style={{
                fontFamily: 'Geist, system-ui, sans-serif',
                fontWeight: '300',
                fontSize: '14px',
                color: 'var(--text-secondary)',
                lineHeight: '1.6',
                maxWidth: '400px',
                margin: '0 0 32px',
            }}>
                {description}
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
                <button
                    onClick={onNewAnalysis}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        borderRadius: '10px',
                        background: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)',
                        border: 'none',
                        color: isDark ? '#000' : '#fff',
                        fontFamily: 'Geist, system-ui, sans-serif',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                    }}
                >
                    <Plus size={16} />
                    New Analysis
                </button>

                <button
                    onClick={() => window.location.reload()}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        borderRadius: '10px',
                        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                        color: 'var(--text-secondary)',
                        fontFamily: 'Geist, system-ui, sans-serif',
                        fontSize: '13px',
                        fontWeight: '400',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                    }}
                >
                    Refresh Page
                </button>
            </div>

            <div style={{
                marginTop: '56px',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                width: '100%',
                maxWidth: '600px',
            }}>
                {[
                    { label: 'Step 1', text: 'Upload a PDF, paste text, or add a URL' },
                    { label: 'Step 2', text: 'The app extracts clauses and scores risk' },
                    { label: 'Step 3', text: 'Review the summary and flagged clauses' },
                ].map((step, i) => (
                    <div key={i} style={{
                        padding: '16px',
                        borderRadius: '12px',
                        background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                        textAlign: 'left',
                    }}>
                        <span style={{
                            fontFamily: 'DM Mono, monospace',
                            fontSize: '10px',
                            color: 'var(--text-tertiary)',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                        }}>{step.label}</span>
                        <p style={{
                            fontFamily: 'Geist, system-ui, sans-serif',
                            fontWeight: '300',
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            margin: '6px 0 0',
                            lineHeight: '1.5',
                        }}>{step.text}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
