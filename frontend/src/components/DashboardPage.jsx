import React, { useState, useEffect, useRef } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '@/context/app-context.js';
import { useTheme } from './theme-context.js';

export default function DashboardPage() {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  
  const {
    inputMode, setInputMode, urlInput, setUrlInput,
    textInput, setTextInput, uploadedFile, setUploadedFile, fileInputRef,
    isProcessing, startAnalysis, stopAnalysis,
  } = useAppContext();

  const [isDragging, setIsDragging] = useState(false);
  const [isCardFocused, setIsCardFocused] = useState(false);
  const [isCardHovered, setIsCardHovered] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    if (!document.querySelector('link[href*="DM+Serif+Display"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=Geist:wght@300;400;500;600&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const handleFocusIn = () => setIsCardFocused(true);
    const handleFocusOut = (e) => {
      if (!el.contains(e.relatedTarget)) setIsCardFocused(false);
    };
    el.addEventListener('focusin', handleFocusIn);
    el.addEventListener('focusout', handleFocusOut);
    return () => {
      el.removeEventListener('focusin', handleFocusIn);
      el.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  const hasInput =
    (inputMode === 'url' && urlInput.trim()) ||
    (inputMode === 'text' && textInput.trim().length > 80) ||
    (inputMode === 'upload' && uploadedFile);

  const isCardActive = isCardFocused || isCardHovered;

  const wordCount = textInput.trim()
    ? textInput.trim().split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      backgroundImage: `radial-gradient(circle at 50% -20%, ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'} 0%, transparent 60%)`,
    }}>
      <div style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '80px 24px',
      }}>
        <header style={{ marginBottom: '56px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '16px',
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--accent)',
              boxShadow: '0 0 8px var(--accent)',
            }} />
            <span style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: '11px',
              color: 'var(--text-tertiary)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}>
              Jurist AI — Document Review
            </span>
          </div>
          <h1 style={{
            fontFamily: 'DM Serif Display, serif',
            fontSize: '48px',
            fontWeight: '400',
            color: 'var(--text-primary)',
            lineHeight: '1.05',
            letterSpacing: '-0.03em',
            margin: '0 0 16px',
          }}>
            What are you<br />
            <em style={{ color: 'var(--text-secondary)', fontStyle: 'italic', opacity: 0.9 }}>
              reviewing today?
            </em>
          </h1>
          <p style={{
            fontFamily: 'Geist, system-ui, sans-serif',
            fontWeight: '300',
            fontSize: '15px',
            color: 'var(--text-secondary)',
            lineHeight: '1.6',
            maxWidth: '480px',
            margin: '0',
          }}>
            Paste a policy, drop a PDF, or link a URL. We surface what matters — buried clauses, binding arbitration, data sales, auto-renewals.
          </p>
        </header>

        <div
          ref={cardRef}
          onMouseEnter={() => setIsCardHovered(true)}
          onMouseLeave={() => setIsCardHovered(false)}
          style={{
            position: 'relative',
            background: 'var(--bg-surface)',
            border: '1px solid',
            borderColor: isCardActive 
              ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)') 
              : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'),
            borderRadius: '16px',
            overflow: 'hidden',
            transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
            boxShadow: isCardActive 
              ? (isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.15)') 
              : (isDark ? '0 4px 20px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0,0,0,0.05)'),
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px',
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)'}`,
            gap: '4px',
          }}>
            {[
              { id: 'upload', icon: '\u2191', label: 'Upload PDF' },
              { id: 'url', icon: '\u2192', label: 'Link' },
              { id: 'text', icon: '\u00B6', label: 'Paste text' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setInputMode(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: inputMode === tab.id ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)') : 'transparent',
                  color: inputMode === tab.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  fontFamily: 'Geist, system-ui, sans-serif',
                  fontSize: '13px',
                  fontWeight: inputMode === tab.id ? '500' : '400',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                }}
              >
                <span style={{
                  fontFamily: 'DM Mono, monospace',
                  fontSize: '12px',
                  opacity: inputMode === tab.id ? 1 : 0.4,
                }}>
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: `linear-gradient(90deg, transparent 0%, ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 30%, ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 70%, transparent 100%)`,
            opacity: isCardActive ? 1 : 0.3,
            transition: 'opacity 0.3s ease',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1.5px',
            background: 'linear-gradient(90deg, transparent 0%, var(--accent) 30%, var(--accent) 70%, transparent 100%)',
            opacity: 0.4,
            pointerEvents: 'none',
          }} />

          <AnimatePresence mode="wait">
            {inputMode === 'url' && (
              <Motion.div
                key="url"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                style={{ padding: '32px' }}
              >
                <div style={{ position: 'relative' }}>
                  <input
                    type="url"
                    placeholder="Paste policy URL..."
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      background: 'transparent',
                      border: 'none',
                      padding: '8px 12px',
                      fontFamily: 'Geist, system-ui, sans-serif',
                      fontSize: '15px',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: '-8px',
                    left: 0,
                    right: 0,
                    height: '1px',
                    background: urlInput ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)') : 'transparent',
                    transition: 'background 0.2s ease',
                  }} />
                </div>
              </Motion.div>
            )}

            {inputMode === 'text' && (
              <Motion.div
                key="text"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                style={{ padding: '32px', position: 'relative' }}
              >
                <textarea
                  placeholder="Paste Terms of Service or Privacy Policy text here..."
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  rows={8}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'transparent',
                    border: 'none',
                    padding: '8px 12px',
                    resize: 'none',
                    fontFamily: 'Geist, system-ui, sans-serif',
                    fontWeight: '300',
                    fontSize: '15px',
                    lineHeight: '1.6',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
                <span style={{
                  position: 'absolute',
                  bottom: '24px',
                  right: '32px',
                  fontFamily: 'DM Mono, monospace',
                  fontSize: '11px',
                  color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.3)',
                }}>
                  {wordCount > 0 ? `${wordCount} words` : ''}
                </span>
              </Motion.div>
            )}

            {inputMode === 'upload' && (
              <Motion.div
                key="upload"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                style={{
                  padding: '48px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  background: isDragging ? 'var(--accent-dim)' : 'transparent',
                  transition: 'background 0.15s ease',
                }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragEnter={() => setIsDragging(true)}
                onDragLeave={() => setIsDragging(false)}
                onDrop={e => {
                  e.preventDefault();
                  setIsDragging(false);
                  const f = e.dataTransfer.files[0];
                  if (f) setUploadedFile(f);
                }}
              >
                <input
                  type="file"
                  id="file-upload"
                  ref={fileInputRef}
                  accept=".pdf"
                  onChange={e => setUploadedFile(e.target.files[0])}
                  style={{ display: 'none' }}
                />

                <div style={{
                  width: '44px',
                  height: '44px',
                  border: '1.5px solid',
                  borderColor: isDragging ? 'var(--accent)' : 'var(--border-strong)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'border-color 0.15s',
                  position: 'relative',
                }}>
                  <div style={{
                    width: '16px',
                    height: '20px',
                    border: '1.5px solid',
                    borderColor: isDragging ? 'var(--accent)' : 'var(--text-tertiary)',
                    borderRadius: '2px',
                    position: 'relative',
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '-1px',
                      right: '-1px',
                      width: '6px',
                      height: '6px',
                      background: 'var(--bg-surface)',
                      borderLeft: '1.5px solid',
                      borderBottom: '1.5px solid',
                      borderColor: isDragging ? 'var(--accent)' : 'var(--text-tertiary)',
                    }} />
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <p style={{
                    fontFamily: 'Geist, system-ui, sans-serif',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: uploadedFile ? 'var(--accent)' : isDragging ? 'var(--accent)' : 'var(--text-primary)',
                    margin: '0 0 4px',
                  }}>
                    {uploadedFile
                      ? uploadedFile.name
                      : isDragging
                        ? 'Drop to upload'
                        : 'Drop PDF here'}
                  </p>
                  <p style={{
                    fontFamily: 'Geist, system-ui, sans-serif',
                    fontWeight: '300',
                    fontSize: '12px',
                    color: 'var(--text-tertiary)',
                    margin: '0',
                  }}>
                    {uploadedFile
                      ? `${(uploadedFile.size / 1024).toFixed(0)} KB`
                      : 'or click to browse \u2014 PDF only, up to 50 MB'}
                  </p>
                </div>
              </Motion.div>
            )}
          </AnimatePresence>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)'}`,
            background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{
                fontFamily: 'Geist, system-ui, sans-serif',
                fontWeight: '300',
                fontSize: '12px',
                color: 'var(--text-tertiary)',
              }}>
                <span style={{ fontFamily: 'DM Mono, monospace', marginRight: '6px', opacity: 0.7 }}>{'\u21B5'}</span>
                Press Enter to Analyze
              </span>
            </div>

            {isProcessing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{
                  fontFamily: 'DM Mono, monospace',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        style={{
                          width: '3px',
                          height: '10px',
                          background: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                          borderRadius: '2px',
                          animation: `pulse-bar 1s ease-in-out ${i * 0.15}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                  ANALYZING
                </span>
                <button
                  onClick={stopAnalysis}
                  style={{
                    padding: '6px 12px',
                    background: 'transparent',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                    borderRadius: '6px',
                    color: 'var(--text-secondary)',
                    fontFamily: 'Geist, system-ui, sans-serif',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => e.target.style.color = 'var(--text-primary)'}
                  onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={startAnalysis}
                disabled={!hasInput}
                style={{
                  padding: '8px 16px',
                  background: hasInput ? (isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)') : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
                  border: 'none',
                  borderRadius: '8px',
                  color: hasInput ? (isDark ? '#000' : '#fff') : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'),
                  fontFamily: 'Geist, system-ui, sans-serif',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: hasInput ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                Analyze
                <span style={{ opacity: hasInput ? 0.6 : 0.3 }}>{'\u2192'}</span>
              </button>
            )}
          </div>
        </div>

        {!isProcessing && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            marginTop: '16px',
          }}>
            {[
              { icon: '\uD83D\uDD12', text: 'Not stored' },
              { icon: '\u26A1', text: 'Analysis in ~8s' },
              { icon: '\u00A7', text: 'Trained on legal corpus' },
            ].map(item => (
              <span
                key={item.text}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontFamily: 'Geist, system-ui, sans-serif',
                  fontWeight: '300',
                  fontSize: '12px',
                  color: 'var(--text-tertiary)',
                }}
              >
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px' }}>
                  {item.icon}
                </span>
                {item.text}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
