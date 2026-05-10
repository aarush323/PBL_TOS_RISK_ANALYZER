import React, { createContext, useContext, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useTextareaResize } from '@/hooks/use-textarea-resize';
import { Button } from '@/components/ui/button';
import { Send, Square } from 'lucide-react';

const ChatInputContext = createContext({
    value: '',
    onChange: () => { },
    onSubmit: () => { },
    loading: false,
    onStop: () => { },
});

function ChatInput({
    children,
    className,
    value = '',
    onChange,
    onSubmit,
    loading = false,
    onStop,
    ...props
}) {
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (value.trim() && !loading) {
                onSubmit?.();
            }
        }
    };

    return (
        <ChatInputContext.Provider value={{ value, onChange, onSubmit, loading, onStop }}>
            <div
                className={cn(
                    'flex items-end gap-2 rounded-lg bg-white/5 border border-white/10 p-2 transition-colors focus-within:border-[#007AFF]/50',
                    className
                )}
                onKeyDown={handleKeyDown}
                {...props}
            >
                {children}
            </div>
        </ChatInputContext.Provider>
    );
}

function ChatInputTextArea({ className, placeholder = 'Type a message...', ...props }) {
    const { value, onChange } = useContext(ChatInputContext);
    const textareaRef = useRef(null);
    const resize = useTextareaResize(textareaRef, 120);

    const handleChange = (e) => {
        onChange?.(e);
        resize();
    };

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            rows={1}
            className={cn(
                'flex-1 bg-transparent border-0 text-sm text-white placeholder:text-white/40 focus:outline-none resize-none min-h-[36px] max-h-[120px] py-2 px-2',
                className
            )}
            {...props}
        />
    );
}

function ChatInputSubmit({ className, ...props }) {
    const { value, onSubmit, loading, onStop } = useContext(ChatInputContext);

    if (loading) {
        return (
            <Button
                variant="destructive"
                size="icon"
                className={cn('h-9 w-9 shrink-0 rounded-lg', className)}
                onClick={onStop}
                type="button"
                {...props}
            >
                <Square size={14} />
            </Button>
        );
    }

    return (
        <Button
            size="icon"
            className={cn('h-9 w-9 shrink-0 rounded-lg', className)}
            onClick={onSubmit}
            disabled={!value?.trim()}
            type="button"
            {...props}
        >
            <Send size={14} />
        </Button>
    );
}

export { ChatInput, ChatInputTextArea, ChatInputSubmit };
