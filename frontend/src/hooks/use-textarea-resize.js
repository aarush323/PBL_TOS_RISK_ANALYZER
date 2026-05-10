import { useCallback, useEffect } from 'react';

export function useTextareaResize(ref, maxHeight = 200) {
    const resize = useCallback(() => {
        const textarea = ref?.current;
        if (!textarea) return;
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, maxHeight);
        textarea.style.height = `${newHeight}px`;
    }, [ref, maxHeight]);

    useEffect(() => {
        resize();
    }, [resize]);

    return resize;
}
