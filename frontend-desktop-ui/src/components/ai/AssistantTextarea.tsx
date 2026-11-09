import { useLayoutEffect, useRef, type ComponentProps } from 'react';

export function AssistantTextarea(props: ComponentProps<'textarea'>) {
    const ref = useRef<HTMLTextAreaElement>(null);
    useLayoutEffect(() => {
        const element = ref.current;
        if (!element) return;
        const resize = () => {
            element.style.height = 'auto';
            const border = element.offsetHeight - element.clientHeight;
            const height = element.scrollHeight + border;
            element.style.height = `${Math.min(height, 144)}px`;
            element.style.overflowY = height > 144 ? 'auto' : 'hidden';
        };
        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(element);
        return () => observer.disconnect();
    }, [props.value]);
    return <textarea {...props} ref={ref} rows={1} className={`assistant-textarea ${props.className ?? ''}`} />;
}
