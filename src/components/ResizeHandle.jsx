import { useState, useEffect, useRef } from 'react';

export default function ResizeHandle() {
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const resizeRef = useRef(null);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
    setStartX(e.clientX);

    // Get current panel width
    const panel = document.getElementById('side-panel-content');
    if (panel) {
      setStartWidth(panel.offsetWidth);
    }

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = (e) => {
    if (!isResizing) return;

    e.preventDefault();
    const deltaX = startX - e.clientX; // Inverted because we're resizing from right edge
    const newWidth = Math.max(320, Math.min(800, startWidth + deltaX)); // Min 320px, Max 800px

    // Update the panel width
    const panel = document.getElementById('side-panel-content');
    if (panel) {
      panel.style.width = `${newWidth}px`;
    }

    // Store the width preference
    localStorage.setItem('walletSidePanelWidth', newWidth);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, startX, startWidth]);

  // Load saved width on mount
  useEffect(() => {
    const savedWidth = localStorage.getItem('walletSidePanelWidth');
    if (savedWidth) {
      const panel = document.getElementById('side-panel-content');
      if (panel) {
        panel.style.width = `${savedWidth}px`;
      }
    }
  }, []);

  return (
    <div
      ref={resizeRef}
      onMouseDown={handleMouseDown}
      className={`absolute left-0 top-0 bottom-0 w-1 bg-transparent hover:bg-blue-500 cursor-col-resize transition-colors z-50 ${
        isResizing ? 'bg-blue-500' : ''
      }`}
      style={{
        marginLeft: '-2px' // Slight overlap to make it easier to grab
      }}
    >
      {/* Visual indicator */}
      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-12 bg-gray-300 dark:bg-gray-600 rounded-r opacity-0 hover:opacity-100 transition-opacity" />
    </div>
  );
}