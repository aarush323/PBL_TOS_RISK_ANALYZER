import { useCallback, useEffect } from 'react';

function resizeTextareaElement(textarea, maxHeight) {
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
}

export function useTextareaResize(ref, maxHeight = 200) {
    const resize = useCallback(() => {
        const textarea = ref?.current;
        if (!textarea) return;
        resizeTextareaElement(textarea, maxHeight);
    }, [ref, maxHeight]);

    useEffect(() => {
        resize();
    }, [resize]);

    return resize;
}
