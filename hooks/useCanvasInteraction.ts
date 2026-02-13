
import { useState, useEffect, useRef, useCallback } from 'react';
import type { CanvasElement } from '../types';
import type { ResizeHandle } from '../types';
import { snapValue } from '../utils/canvas';

type InteractionMode = 'idle' | 'dragging' | 'resizing' | 'cropping' | 'drawing';

type InteractionState = {
  mode: InteractionMode;
  startX: number;
  startY: number;
  initialElements: {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    imageX?: number;
    imageY?: number;
  }[];
  handle?: ResizeHandle;
};

const initialInteraction: InteractionState = {
  mode: 'idle',
  startX: 0,
  startY: 0,
  initialElements: [],
};

export function useCanvasInteraction(
  elements: CanvasElement[],
  setElements: React.Dispatch<React.SetStateAction<CanvasElement[]>>,
  addToHistory: (els: CanvasElement[]) => void,
  scale: number,
  snapToGrid: boolean,
  gridSize: number,
  setActiveTool?: (t: any) => void // Optional callback to reset tool after drawing
) {
  const [interaction, setInteraction] = useState<InteractionState>(initialInteraction);
  const elementsRef = useRef(elements);
  elementsRef.current = elements;

  const snap = useCallback(
    (val: number) => snapValue(val, gridSize, snapToGrid),
    [gridSize, snapToGrid]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (interaction.mode === 'idle') return;

      const deltaX = (e.clientX - interaction.startX) / scale;
      const deltaY = (e.clientY - interaction.startY) / scale;

      if (interaction.mode === 'dragging') {
        setElements(prev =>
          prev.map(el => {
            const initial = interaction.initialElements.find(ie => ie.id === el.id);
            if (initial) {
              const x = snap(initial.x + deltaX);
              const y = snap(initial.y + deltaY);
              return {
                ...el,
                x: Math.round(x),
                y: Math.round(y),
              };
            }
            return el;
          })
        );
      } else if (interaction.mode === 'cropping') {
        const initial = interaction.initialElements[0];
        if (initial) {
          setElements(prev =>
            prev.map(el =>
              el.id === initial.id
                ? {
                    ...el,
                    imageX: (initial.imageX ?? 0) + deltaX,
                    imageY: (initial.imageY ?? 0) + deltaY,
                  }
                : el
            )
          );
        }
      } else if (interaction.mode === 'drawing') {
         const initial = interaction.initialElements[0];
         if (initial) {
             setElements(prev =>
                prev.map(el => {
                    if (el.id !== initial.id) return el;
                    
                    // Logic for drawing from start point
                    // deltaX/Y is relative to start mouse pos
                    
                    let newX = initial.x;
                    let newY = initial.y;
                    let newW = Math.abs(deltaX);
                    let newH = Math.abs(deltaY);

                    if (deltaX < 0) {
                        newX = initial.x + deltaX;
                    }
                    if (deltaY < 0) {
                        newY = initial.y + deltaY;
                    }

                    return {
                        ...el,
                        x: snap(newX),
                        y: snap(newY),
                        width: snap(newW),
                        height: snap(newH)
                    };
                })
             );
         }
      } else if (interaction.mode === 'resizing' && interaction.handle) {
        const handle = interaction.handle;
        setElements(prev =>
          prev.map(el => {
            const initial = interaction.initialElements.find(ie => ie.id === el.id);
            if (!initial) return el;

            let newX = initial.x;
            let newY = initial.y;
            let newW = initial.width;
            let newH = initial.height;

            if (handle.includes('r')) newW = Math.max(10, initial.width + deltaX);
            if (handle.includes('l')) {
              const diff = Math.min(initial.width - 10, deltaX);
              newX = initial.x + diff;
              newW = initial.width - diff;
            }
            if (handle.includes('b')) newH = Math.max(10, initial.height + deltaY);
            if (handle.includes('t')) {
              const diff = Math.min(initial.height - 10, deltaY);
              newY = initial.y + diff;
              newH = initial.height - diff;
            }

            return {
              ...el,
              x: snap(newX),
              y: snap(newY),
              width: snap(newW),
              height: snap(newH),
            };
          })
        );
      }
    };

    const handleMouseUp = () => {
      if (interaction.mode !== 'idle') {
        addToHistory(elementsRef.current);
        
        if (interaction.mode === 'drawing' && setActiveTool) {
             // Reset tool after drawing
             setActiveTool('move');
        }

        setInteraction(initialInteraction);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [interaction, scale, snap, setElements, addToHistory, setActiveTool]);

  return { interaction, setInteraction };
}
