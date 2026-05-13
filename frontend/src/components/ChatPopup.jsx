import React, { useRef, useEffect, useState } from 'react';
import { MessageSquare, Minimize2, Maximize2, X } from 'lucide-react';
import TypingDots from './TypingDots.jsx';
import { ChatInput, ChatInputTextArea, ChatInputSubmit } from '@/components/ui/chat-input';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export default function ChatPopup({
  isOpen,
  onToggle,
  chatMessages,
  chatInput,
  onChatInputChange,
  onSendChat,
  isChatTyping,
  sessionId,
  user,
}) {
  const messagesEndRef = useRef(null);
  const token = localStorage.getItem('tos_token');
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

  const [indexStatus, setIndexStatus] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isOpen, isExpanded]);

  useEffect(() => {
    let interval;
    if (sessionId) {
      const pollStatus = async () => {
        try {
          const res = await fetch(`${API}/chat/${sessionId}/index/status`, { headers });
          if (res.ok) {
            const data = await res.json();
            setIndexStatus(data);
          }
        } catch {
          // ignore polling errors
        }
      };
      pollStatus();
      interval = setInterval(pollStatus, 10000);
    } else {
      setIndexStatus(null);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const suggestions = [
    "summarize the risks",
    "what is the overall risk level",
    "explain clause 1",
    "what are my rights",
  ];

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-black text-white flex items-center justify-center shadow-2xl border border-white/10 hover:scale-105 hover:bg-zinc-900 transition-all z-50 group"
      >
        <MessageSquare size={24} className="group-hover:text-blue-400 transition-colors" />
      </button>
    );
  }

  return (
    <div
      className={`fixed z-50 flex flex-col glass-card border border-white/10 shadow-2xl rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden ${isExpanded
          ? 'bottom-6 right-6 w-[calc(50vw-48px)] h-[calc(100vh-48px)]'
          : 'bottom-6 right-6 w-96 h-[600px] max-h-[calc(100vh-48px)]'
        }`}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(20px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-4 shrink-0 bg-white/5 border-b border-white/10">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/5 shrink-0">
            <MessageSquare size={16} className="text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-white tracking-tight">Jurist AI</h3>
            <p className="truncate text-[10px] text-white/50 tracking-wider uppercase font-medium">Document Intelligence</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {sessionId && indexStatus && (
            <span className={`inline-flex h-7 items-center whitespace-nowrap rounded-full border px-3 text-[10px] font-medium leading-none ${indexStatus.is_indexed ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
              {indexStatus.is_indexed ? 'Smart Context' : 'Indexing...'}
            </span>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
          <button
            onClick={onToggle}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-hide">
        {!sessionId ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4 border border-white/10">
              <MessageSquare size={28} className="text-white/20" />
            </div>
            <p className="text-sm text-white/40 mb-2">No active document context.</p>
            <p className="text-xs text-white/30 max-w-[200px]">Run an analysis first to unlock intelligent chat capabilities.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-semibold ${msg.role === 'bot'
                    ? 'bg-zinc-800 text-white/90 border border-white/10'
                    : 'bg-white text-black'
                    }`}
                >
                  {msg.role === 'bot' ? 'J' : user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div
                  className={`flex-1 p-[14px] rounded-2xl text-[13px] leading-relaxed shadow-sm ${msg.role === 'bot'
                    ? 'bg-zinc-900 border border-white/5 rounded-tl-sm'
                    : 'bg-white/10 border border-white/10 rounded-tr-sm backdrop-blur-md'
                    }`}
                >
                  <div
                    className="text-white/90 prose prose-invert prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: msg.html || msg.content }}
                  />
                </div>
              </div>
            ))}
            {isChatTyping && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-[11px] font-semibold text-white/90 border border-white/10">
                  J
                </div>
                <div className="py-3 px-4 rounded-2xl rounded-tl-sm bg-zinc-900 border border-white/5 flex items-center">
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      {sessionId && (
        <div className="p-4 border-t border-white/5 bg-black/40 backdrop-blur-xl">
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
            {suggestions.map((sugg, idx) => (
              <button
                key={idx}
                onClick={() => onChatInputChange(sugg)}
                className="whitespace-nowrap px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-xs text-white/60 hover:text-white hover:border-white/20 hover:bg-zinc-800 transition-all shadow-sm"
              >
                {sugg}
              </button>
            ))}
          </div>

          <div className="relative">
            <ChatInput
              value={chatInput}
              onChange={(e) => onChatInputChange(e.target.value)}
              onSubmit={onSendChat}
              loading={isChatTyping}
              onStop={() => { }}
              className="bg-zinc-900/80 border-white/10 rounded-xl"
            >
              <ChatInputTextArea placeholder="Ask Jurist about this document..." className="text-sm min-h-[44px]" />
              <div className="absolute right-2 bottom-2">
                <ChatInputSubmit className="h-8 w-8 rounded-md bg-white text-black hover:bg-zinc-200 shadow-sm" />
              </div>
            </ChatInput>
          </div>
        </div>
      )}
    </div>
  );
}
