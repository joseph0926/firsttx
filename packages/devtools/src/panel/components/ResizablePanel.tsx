import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';

interface ResizablePanelProps {
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  storageKey?: string;
  children: ReactNode;
}

export function ResizablePanel({
  defaultWidth = 400,
  minWidth = 300,
  maxWidth = 800,
  storageKey = 'firsttx-panel-width',
  children,
}: ResizablePanelProps) {
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? Number(saved) : defaultWidth;
  });

  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsResizing(true);
      startXRef.current = e.clientX;
      startWidthRef.current = width;
      e.preventDefault();
    },
    [width],
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = startXRef.current - e.clientX;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + delta));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem(storageKey, String(width));
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, width, minWidth, maxWidth, storageKey]);

  return (
    <div className="resizable-panel" style={{ width }}>
      <div
        className={`resize-handle ${isResizing ? 'active' : ''}`}
        onMouseDown={handleMouseDown}
      />
      {children}
    </div>
  );
}
