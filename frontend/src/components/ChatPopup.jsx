import React, { useRef, useEffect, useState } from 'react';
import { MessageSquare, Minimize2 } from 'lucide-react';
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

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isOpen]);

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
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-[#007AFF] to-[#0056cc] text-white flex items-center justify-center shadow-lg shadow-[#007AFF]/30 hover:shadow-[#007AFF]/50 transition-all z-50"
      >
        <MessageSquare size={24} />
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-6 right-6 w-96 h-[500px] min-w-[320px] min-h-[400px] max-w-[90vw] max-h-[90vh] glass-card flex flex-col z-50 shadow-2xl"
      style={{ resize: 'both', overflow: 'hidden' }}
    >
      <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#007AFF] to-[#0056cc] flex items-center justify-center">
            <MessageSquare size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Chat with Jurist</h3>
            <p className="text-[10px] text-[#007AFF] uppercase">AI Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sessionId && indexStatus && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${indexStatus.is_indexed ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
              {indexStatus.is_indexed ? 'Smart retrieval active' : 'Indexing...'}
            </span>
          )}
          <button
            onClick={onToggle}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <Minimize2 size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!sessionId ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <MessageSquare size={32} className="text-white/30 mb-3" />
            <p className="text-sm text-white/50">Run an analysis first to enable chat.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-medium ${msg.role === 'bot'
                    ? 'bg-white/10 text-white/80 border border-white/10'
                    : 'bg-[#007AFF] text-white'
                    }`}
                >
                  {msg.role === 'bot' ? 'J' : user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div
                  className={`flex-1 p-3 rounded-xl text-sm ${msg.role === 'bot'
                    ? 'bg-white/5 border border-white/10'
                    : 'bg-white/10'
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
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium text-white/80 border border-white/10">
                  J
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {sessionId && (
        <div className="p-3 border-t border-white/10 space-y-2">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {suggestions.map((sugg, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onChatInputChange(sugg);
                }}
                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white hover:bg-white/10 transition-all"
              >
                {sugg}
              </button>
            ))}
          </div>

          <ChatInput
            value={chatInput}
            onChange={(e) => onChatInputChange(e.target.value)}
            onSubmit={onSendChat}
            loading={isChatTyping}
            onStop={() => { }}
          >
            <ChatInputTextArea placeholder="Ask about your document..." />
            <ChatInputSubmit />
          </ChatInput>
        </div>
      )}
    </div>
  );
}