import React, { useRef, useEffect, useState } from 'react';
import { MessageSquare, Minimize2, Maximize2, X } from 'lucide-react';
import TypingDots from './TypingDots.jsx';
import { ChatInput, ChatInputTextArea, ChatInputSubmit } from '@/components/ui/chat-input';
import { apiFetchJson } from '@/shared/api/client';
import { useTheme } from './theme-context.js';
import { useIsMobile } from '@/hooks/use-is-mobile.js';

export default function ChatPopup({
  isOpen, onToggle, chatMessages, chatInput, onChatInputChange,
  onSendChat, isChatTyping, sessionId, user,
}) {
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const isDark = theme !== 'light';
  const messagesEndRef = useRef(null);
  const [indexStatus, setIndexStatus] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const s = {
    font: 'Anthropic Sans, sans-serif', mono: 'Anthropic Mono, monospace', serif: 'Anthropic Serif, serif',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
    surface: isDark ? 'rgba(20,20,22,0.95)' : 'rgba(255,255,255,0.95)',
    msgBot: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    msgUser: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    textPrimary: 'var(--text-primary)',
    textSecondary: 'var(--text-secondary)',
    textTertiary: 'var(--text-tertiary)',
  };

  useEffect(() => {
    if (isOpen && messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isOpen, isExpanded]);

  useEffect(() => {
    let interval;
    if (sessionId) {
      const pollStatus = async () => {
        try {
          const { res, data } = await apiFetchJson(`/chat/${sessionId}/index/status`);
          if (res.ok) setIndexStatus(data);
        } catch { /* ignore transient status polling failures */ }
      };
      pollStatus();
      interval = setInterval(pollStatus, 10000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [sessionId]);

  const suggestions = ["summarize the risks", "what is the overall risk level", "explain clause 1", "what are my rights"];

  if (!isOpen) {
    return (
      <button className="chat-fab" onClick={onToggle} style={{
        position: 'fixed', bottom: '24px', right: '24px', width: '56px', height: '56px', borderRadius: '50%',
        background: isDark ? '#fff' : '#000', color: isDark ? '#000' : '#fff', border: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.15)', zIndex: 50,
        transition: 'transform 0.2s ease',
      }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
        <MessageSquare size={24} />
      </button>
    );
  }

  return (
    <div className="chat-popup" style={{
      position: 'fixed', zIndex: 50, display: 'flex', flexDirection: 'column',
      background: s.surface, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      border: `1px solid ${s.border}`, borderRadius: '16px', overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
      bottom: isMobile ? '0' : '24px',
      right: isMobile ? '0' : '24px',
      ...(isMobile
        ? { left: '0', width: '100vw', height: 'calc(100dvh - 76px)', maxHeight: 'calc(100dvh - 76px)', borderRadius: '16px 16px 0 0' }
        : isExpanded
        ? { width: 'calc(50vw - 48px)', height: 'calc(100vh - 48px)' }
        : { width: '380px', height: '600px', maxHeight: 'calc(100vh - 48px)' }
      )
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px',
        borderBottom: `1px solid ${s.border}`, background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: s.msgUser,
            border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={14} color={s.textPrimary} />
          </div>
          <div>
            <h3 style={{ fontFamily: s.font, fontSize: '14px', fontWeight: '500', color: s.textPrimary, margin: 0 }}>Jurist AI</h3>
            <p style={{ fontFamily: s.mono, fontSize: '9px', color: s.textTertiary, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>Document chat</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {sessionId && indexStatus && (
            <span style={{ fontFamily: s.mono, fontSize: '9px', padding: '4px 8px', borderRadius: '4px',
              background: indexStatus.is_indexed ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
              color: indexStatus.is_indexed ? '#22c55e' : '#f59e0b', border: `1px solid ${indexStatus.is_indexed ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
              letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {indexStatus.is_indexed ? 'Context Ready' : 'Building Context'}
            </span>
          )}
          <button onClick={() => setIsExpanded(!isExpanded)} style={{ background: 'none', border: 'none', color: s.textTertiary, cursor: 'pointer', padding: '4px' }}>
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button onClick={onToggle} style={{ background: 'none', border: 'none', color: s.textTertiary, cursor: 'pointer', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {!sessionId ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <MessageSquare size={32} style={{ color: s.textTertiary, marginBottom: '16px', opacity: 0.5 }} />
            <p style={{ fontFamily: s.font, fontSize: '14px', color: s.textSecondary, margin: '0 0 8px' }}>No active context.</p>
            <p style={{ fontFamily: s.font, fontSize: '12px', color: s.textTertiary, maxWidth: '240px', margin: 0, lineHeight: '1.5' }}>Run an analysis first to chat about the document.</p>
          </div>
        ) : (
          <>
            {chatMessages.map((msg, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '12px', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: s.mono, fontSize: '11px', fontWeight: '500',
                  background: msg.role === 'bot' ? (isDark ? '#fff' : '#000') : s.msgUser,
                  color: msg.role === 'bot' ? (isDark ? '#000' : '#fff') : s.textPrimary,
                  border: msg.role === 'bot' ? 'none' : `1px solid ${s.border}` }}>
                  {msg.role === 'bot' ? 'J' : user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div style={{ padding: '14px', borderRadius: '12px', maxWidth: '85%',
                  background: msg.role === 'bot' ? s.msgBot : s.msgUser,
                  border: `1px solid ${s.border}`,
                  borderTopLeftRadius: msg.role === 'bot' ? '4px' : '12px',
                  borderTopRightRadius: msg.role === 'user' ? '4px' : '12px',
                  fontFamily: 'Georgia, serif', fontSize: '14px', color: s.textPrimary, lineHeight: '1.6' }}
                  dangerouslySetInnerHTML={{ __html: msg.html || msg.content }}
                />
              </div>
            ))}
            {isChatTyping && (
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: s.mono, fontSize: '11px', fontWeight: '500', background: isDark ? '#fff' : '#000', color: isDark ? '#000' : '#fff' }}>J</div>
                <div style={{ padding: '14px', borderRadius: '12px 12px 12px 4px', background: s.msgBot, border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center' }}>
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      {sessionId && (
        <div style={{ padding: '16px', borderTop: `1px solid ${s.border}`, background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', scrollbarWidth: 'none' }}>
            {suggestions.map((sugg, idx) => (
              <button key={idx} onClick={() => onChatInputChange(sugg)} style={{
                whiteSpace: 'nowrap', padding: '6px 12px', borderRadius: '8px', background: s.msgBot, border: `1px solid ${s.border}`,
                fontFamily: s.font, fontSize: '11px', color: s.textSecondary, cursor: 'pointer', transition: 'all 0.15s',
              }}>{sugg}</button>
            ))}
          </div>
          <div style={{ position: 'relative' }}>
            <ChatInput value={chatInput} onChange={(e) => onChatInputChange(e.target.value)} onSubmit={onSendChat} loading={isChatTyping} onStop={() => {}}
              style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: `1px solid ${s.border}`, borderRadius: '12px' }}>
              <ChatInputTextArea placeholder="Ask Jurist..." style={{ fontFamily: s.font, fontSize: '13px', minHeight: '44px', padding: '12px', color: s.textPrimary }} />
              <div style={{ position: 'absolute', right: '8px', bottom: '8px' }}>
                <ChatInputSubmit style={{ width: '32px', height: '32px', borderRadius: '8px', background: isDark ? '#fff' : '#000', color: isDark ? '#000' : '#fff' }} />
              </div>
            </ChatInput>
          </div>
        </div>
      )}
    </div>
  );
}
