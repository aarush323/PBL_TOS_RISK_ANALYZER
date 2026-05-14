import React, { useState, useEffect, useRef } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '@/context/app-context.js';

export default function DashboardPage() {
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
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
    }}>
      <div style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '48px 24px',
      }}>
        <header style={{ marginBottom: '48px' }}>
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
            fontSize: '42px',
            fontWeight: '400',
            color: 'var(--text-primary)',
            lineHeight: '1.1',
            letterSpacing: '-0.02em',
            margin: '0 0 12px',
          }}>
            What are you<br />
            <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>
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

        <div style={{
          display: 'inline-flex',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '10px',
          padding: '3px',
          marginBottom: '20px',
          gap: '2px',
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
                gap: '7px',
                padding: '7px 16px',
                borderRadius: '7px',
                border: 'none',
                background: inputMode === tab.id ? 'var(--bg-elevated)' : 'transparent',
                color: inputMode === tab.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
                fontFamily: 'Geist, system-ui, sans-serif',
                fontSize: '13px',
                fontWeight: inputMode === tab.id ? '500' : '400',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: inputMode === tab.id
                  ? '0 1px 3px rgba(0,0,0,0.4), inset 0 0.5px 0 rgba(255,255,255,0.06)'
                  : 'none',
                outline: 'none',
              }}
            >
              <span style={{
                fontFamily: 'DM Mono, monospace',
                fontSize: '13px',
                opacity: inputMode === tab.id ? 1 : 0.4,
              }}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </div>

        <div
          ref={cardRef}
          onMouseEnter={() => setIsCardHovered(true)}
          onMouseLeave={() => setIsCardHovered(false)}
          style={{
            position: 'relative',
            background: 'var(--bg-surface)',
            border: '1px solid',
            borderColor: isCardActive ? 'var(--border-strong)' : 'var(--border-default)',
            borderRadius: '12px',
            overflow: 'hidden',
            transition: 'border-color 0.2s ease',
          }}
        >
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
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                style={{ padding: '24px' }}
              >
                <label style={{
                  display: 'block',
                  fontFamily: 'DM Mono, monospace',
                  fontSize: '10px',
                  color: 'var(--text-tertiary)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginBottom: '10px',
                }}>
                  Policy URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/terms"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    fontFamily: 'DM Mono, monospace',
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--border-strong)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border-subtle)'; }}
                />
                <p style={{
                  marginTop: '8px',
                  fontFamily: 'Geist, system-ui, sans-serif',
                  fontSize: '12px',
                  color: 'var(--text-tertiary)',
                  fontWeight: '300',
                }}>
                  Works best on static HTML policy pages. Some sites block scraping — try PDF upload if this fails.
                </p>
              </Motion.div>
            )}

            {inputMode === 'text' && (
              <Motion.div
                key="text"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                style={{ padding: '24px', position: 'relative' }}
              >
                <textarea
                  placeholder="Paste Terms of Service or Privacy Policy text here\u2026"
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  rows={10}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'transparent',
                    border: 'none',
                    resize: 'none',
                    fontFamily: 'Geist, system-ui, sans-serif',
                    fontWeight: '300',
                    fontSize: '14px',
                    lineHeight: '1.7',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
                <span style={{
                  position: 'absolute',
                  bottom: '16px',
                  right: '20px',
                  fontFamily: 'DM Mono, monospace',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
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
        </div>

        {isProcessing ? (
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px 20px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: '10px',
            }}>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    style={{
                      width: '3px',
                      height: '14px',
                      background: 'var(--accent)',
                      borderRadius: '2px',
                      animation: `pulse-bar 1s ease-in-out ${i * 0.15}s infinite`,
                      opacity: 0.7,
                    }}
                  />
                ))}
              </div>
              <span style={{
                fontFamily: 'DM Mono, monospace',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                letterSpacing: '0.05em',
              }}>
                ANALYZING DOCUMENT
              </span>
            </div>
            <button
              onClick={stopAnalysis}
              style={{
                padding: '14px 20px',
                background: 'var(--red-dim)',
                border: '1px solid rgba(255,68,68,0.2)',
                borderRadius: '10px',
                color: 'var(--red)',
                fontFamily: 'Geist, system-ui, sans-serif',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div style={{ marginTop: '20px' }}>
            <button
              onClick={startAnalysis}
              disabled={!hasInput}
              style={{
                width: '100%',
                padding: '15px 24px',
                background: hasInput ? 'var(--accent)' : 'var(--bg-elevated)',
                border: '1px solid',
                borderColor: hasInput ? 'var(--accent)' : 'var(--border-subtle)',
                borderRadius: '10px',
                color: hasInput ? '#0A0A0B' : 'var(--text-tertiary)',
                fontFamily: 'Geist, system-ui, sans-serif',
                fontSize: '14px',
                fontWeight: '600',
                letterSpacing: '0.01em',
                cursor: hasInput ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
              onMouseEnter={e => { if (hasInput) e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              {hasInput ? (
                <>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '13px' }}>
                    {'\u2303'}
                  </span>
                  Analyze document
                </>
              ) : (
                'Paste or upload a document to continue'
              )}
            </button>
          </div>
        )}

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
