import { useState, useCallback, useMemo } from 'react';
import type { CanvasElement } from '../types';

export function useSelection(elements: CanvasElement[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const primarySelectedId = selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null;
  const selectedElement = useMemo(
    () => (primarySelectedId ? elements.find(el => el.id === primarySelectedId) ?? null : null),
    [elements, primarySelectedId]
  );

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const select = useCallback((id: string | null, multi: boolean, options?: { onClear?: () => void }) => {
    if (!id) {
      if (!multi) {
        setSelectedIds([]);
        options?.onClear?.();
      }
      return;
    }

    const clickedEl = elements.find(e => e.id === id);
    if (!clickedEl) return;

    let idsToSelect = [id];
    if (clickedEl.groupId) {
      idsToSelect = elements.filter(el => el.groupId === clickedEl.groupId).map(el => el.id);
    }

    if (multi) {
      setSelectedIds(prev => {
        const isAlreadySelected = idsToSelect.some(i => prev.includes(i));
        if (isAlreadySelected) {
          return prev.filter(pid => !idsToSelect.includes(pid));
        }
        return [...Array.from(new Set([...prev, ...idsToSelect]))];
      });
    } else {
      if (!selectedIds.includes(id)) {
        setSelectedIds(idsToSelect);
        options?.onClear?.();
      }
    }
  }, [elements, selectedIds]);

  const setSelectedIdsDirect = useCallback((ids: string[]) => {
    setSelectedIds(ids);
  }, []);

  return {
    selectedIds,
    setSelectedIds: setSelectedIdsDirect,
    primarySelectedId,
    selectedElement,
    clearSelection,
    select,
  };
}
