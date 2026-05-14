import React, { useRef, useEffect } from 'react';
import { MessageSquare, Send, Square } from 'lucide-react';

const suggestions = [
  "summarize the risks",
  "what is the overall risk level",
  "explain clause 1",
  "what are my rights",
];

export default function ChatPage({
  chatMessages,
  chatInput,
  onChatInputChange,
  onSendChat,
  isChatTyping,
  sessionId,
  user,
}) {
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (chatInput.trim() && !isChatTyping) {
        onSendChat();
      }
    }
  };

  const handleInputChange = (e) => {
    onChatInputChange(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-surface)]">
      {!sessionId ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-2)] flex items-center justify-center mb-4 border border-[var(--color-border)]">
            <MessageSquare size={28} className="text-[var(--color-text-subtle)]" />
          </div>
          <p className="text-[var(--color-text-muted)] mb-2">No active document context.</p>
          <p className="text-sm text-[var(--color-text-subtle)] max-w-sm">
            Run an analysis first, then ask questions about the document and flagged clauses.
          </p>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-semibold ${
                      msg.role === 'bot'
                        ? 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
                        : 'bg-[var(--color-primary)] text-[var(--color-surface)]'
                    }`}
                  >
                    {msg.role === 'bot' ? 'J' : user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div
                    className={`flex-1 p-4 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'bot'
                        ? 'bg-[var(--color-surface-1)] border border-[var(--color-border)]'
                        : 'bg-[var(--color-primary)] text-[var(--color-surface)]'
                    }`}
                  >
                    <div
                      className={msg.role === 'bot' ? 'text-[var(--color-text)]' : 'text-white'}
                      dangerouslySetInnerHTML={{ __html: msg.html || msg.content }}
                    />
                  </div>
                </div>
              ))}
              {isChatTyping && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center text-sm font-semibold text-[var(--color-text-muted)] border border-[var(--color-border)]">
                    J
                  </div>
                  <div className="p-4 rounded-2xl bg-[var(--color-surface-1)] border border-[var(--color-border)]">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-[var(--color-text-subtle)] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-[var(--color-text-subtle)] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-[var(--color-text-subtle)] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="max-w-3xl mx-auto px-6 py-4">
              <div className="flex gap-2 overflow-x-auto pb-3">
                {suggestions.map((sugg, idx) => (
                  <button
                    key={idx}
                    onClick={() => onChatInputChange(sugg)}
                    className="whitespace-nowrap px-3 py-1.5 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-accent)]/30 transition-all"
                  >
                    {sugg}
                  </button>
                ))}
              </div>

              <div className="flex items-end gap-2 bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-xl p-2 focus-within:border-[var(--color-accent)]/50 transition-colors">
                <textarea
                  ref={textareaRef}
                  value={chatInput}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about this document..."
                  rows={1}
                  className="flex-1 bg-transparent border-0 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none resize-none min-h-[36px] max-h-[120px] py-2 px-2"
                />
                {isChatTyping ? (
                  <button
                    className="h-9 w-9 rounded-lg bg-[var(--color-error)]/10 text-[var(--color-error)] flex items-center justify-center shrink-0"
                    type="button"
                  >
                    <Square size={14} />
                  </button>
                ) : (
                  <button
                    onClick={onSendChat}
                    disabled={!chatInput?.trim()}
                    className="h-9 w-9 rounded-lg bg-[var(--color-primary)] text-[var(--color-surface)] flex items-center justify-center shrink-0 hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
                    type="button"
                  >
                    <Send size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
