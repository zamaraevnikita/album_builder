import { useState, useCallback, useEffect, useRef } from 'react';
import type { CanvasElement } from '../types';

const HISTORY_LIMIT = 50;

export function useHistory(initialElements: CanvasElement[]) {
  const [history, setHistory] = useState<CanvasElement[][]>([initialElements]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [elements, setElements] = useState<CanvasElement[]>(initialElements);
  const historyIndexRef = useRef(historyIndex);
  historyIndexRef.current = historyIndex;

  const addToHistory = useCallback((newElements: CanvasElement[]) => {
    setHistory(prev => {
      const idx = historyIndexRef.current;
      const newHistory = prev.slice(0, idx + 1);
      newHistory.push(newElements);
      if (newHistory.length > HISTORY_LIMIT) newHistory.shift();
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
    setElements(newElements);
  }, []);

  const undo = useCallback(() => {
    setHistoryIndex(i => {
      if (i <= 0) return i;
      const prevElements = history[i - 1];
      setElements(prevElements);
      return i - 1;
    });
  }, [history]);

  const redo = useCallback(() => {
    setHistoryIndex(i => {
      if (i >= history.length - 1) return i;
      const nextElements = history[i + 1];
      setElements(nextElements);
      return i + 1;
    });
  }, [history]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return {
    elements,
    setElements,
    undo,
    redo,
    addToHistory,
    historyIndex,
    canUndo,
    canRedo,
  };
}