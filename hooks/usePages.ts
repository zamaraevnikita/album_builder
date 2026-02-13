
import { useState, useCallback } from 'react';
import type { Page } from '../types';
import type { ViewMode, PageSide } from '../types';

export function usePages(initialPages: Page[]) {
  const [pages, setPages] = useState<Page[]>(initialPages);
  const [activePageId, setActivePageId] = useState<string>(initialPages[0]?.id ?? 'p1');
  const [activeSide, setActiveSide] = useState<PageSide>('left');
  const [viewMode, setViewMode] = useState<ViewMode>('spread');

  const activeSpreadIndex = pages.findIndex(p => p.id === activePageId);
  const currentPageNumber = activeSpreadIndex * 2 + (activeSide === 'left' ? 1 : 2);

  const addPage = useCallback(() => {
    const newPageId = `p${Date.now()}`;
    const newPage: Page = { id: newPageId, name: `Разворот ${pages.length + 1}` };
    setPages(prev => [...prev, newPage]);
    setActivePageId(newPageId);
    setActiveSide('left');
  }, [pages.length]);

  const switchPage = useCallback(
    (direction: 'next' | 'prev') => {
      if (viewMode === 'spread') {
        if (direction === 'prev' && activeSpreadIndex > 0) {
          setActivePageId(pages[activeSpreadIndex - 1].id);
        } else if (direction === 'next' && activeSpreadIndex < pages.length - 1) {
          setActivePageId(pages[activeSpreadIndex + 1].id);
        }
      } else {
        if (direction === 'next') {
          if (activeSide === 'left') {
            setActiveSide('right');
          } else if (activeSpreadIndex < pages.length - 1) {
            setActivePageId(pages[activeSpreadIndex + 1].id);
            setActiveSide('left');
          }
        } else {
          if (activeSide === 'right') {
            setActiveSide('left');
          } else if (activeSpreadIndex > 0) {
            setActivePageId(pages[activeSpreadIndex - 1].id);
            setActiveSide('right');
          }
        }
      }
    },
    [viewMode, activeSide, activeSpreadIndex, pages]
  );

  const setViewModeAndSide = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'single') setActiveSide('left');
  }, []);

  return {
    pages,
    setPages,
    activePageId,
    setActivePageId,
    activeSide,
    setActiveSide,
    viewMode,
    setViewMode: setViewModeAndSide,
    activeSpreadIndex,
    currentPageNumber,
    addPage,
    switchPage,
  };
}
