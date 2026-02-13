
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ViewMode, CanvasElement, ElementType, ToolType } from './types';
import type { ResizeHandle, ShapeKind } from './types';
import type { LeftPanelTab } from './types';
import {
  INITIAL_ELEMENTS,
  INITIAL_PAGES,
  MOCK_ASSETS,
  TEXT_TEMPLATES,
  ALBUM_FORMATS,
  GRID_SIZE,
} from './constants';
import type { AlbumFormat } from './types';
import { snapValue } from './utils/canvas';
import { useHistory } from './hooks/useHistory';
import { useSelection } from './hooks/useSelection';
import { usePages } from './hooks/usePages';
import { useCanvasInteraction } from './hooks/useCanvasInteraction';
import { GrainOverlay } from './components/ui/GrainOverlay';
import { Header } from './components/Header/Header';
import { LeftPanel } from './components/LeftPanel/LeftPanel';
import { RightPanel } from './components/RightPanel/RightPanel';
import { Canvas } from './components/Canvas/Canvas';

const App: React.FC = () => {
  const {
    elements,
    setElements,
    undo,
    redo,
    addToHistory,
    canUndo,
    canRedo,
  } = useHistory(INITIAL_ELEMENTS);

  const {
    selectedIds,
    setSelectedIds,
    primarySelectedId,
    selectedElement,
    clearSelection,
    select,
  } = useSelection(elements);

  const {
    pages,
    setPages,
    activePageId,
    activeSide,
    viewMode,
    setViewMode,
    activeSpreadIndex,
    currentPageNumber,
    switchPage,
    addPage,
  } = usePages(INITIAL_PAGES);

  const [activeTool, setActiveTool] = useState<ToolType>('move');
  const [activeShapeKind, setActiveShapeKind] = useState<ShapeKind>('rectangle');
  
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [leftPanelWidth, setLeftPanelWidth] = useState(280);
  const [rightPanelWidth, setRightPanelWidth] = useState(300);
  const [uploadedAssets, setUploadedAssets] = useState<string[]>([]);
  const [clipboard, setClipboard] = useState<CanvasElement[]>([]);
  const [activeLeftTab, setActiveLeftTab] = useState<LeftPanelTab>('layers');
  const [albumFormat, setAlbumFormat] = useState<AlbumFormat>(ALBUM_FORMATS[0]);

  const canvasSingleWidth = albumFormat.width;
  const canvasSingleHeight = albumFormat.height;
  const canvasSpreadWidth = albumFormat.width * 2;
  const canvasSpreadHeight = albumFormat.height;

  const MIN_PANEL_WIDTH = 200;
  const MAX_PANEL_WIDTH = 480;

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const { interaction, setInteraction } = useCanvasInteraction(
    elements,
    setElements,
    addToHistory,
    scale,
    snapToGrid,
    GRID_SIZE,
    setActiveTool // Pass this to auto-switch back to move tool after drawing
  );

  const currentElements = elements.filter(el => el.pageId === activePageId);

  // Initial Center Logic
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current || !containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const targetW = viewMode === 'spread' ? canvasSpreadWidth : canvasSingleWidth;
    const targetH = canvasSpreadHeight;
    
    // Default initial padding/scale
    const padding = 60;
    const scaleX = (width - padding * 2) / targetW;
    const scaleY = (height - padding * 2) / targetH;
    const startScale = Math.min(Math.min(scaleX, scaleY), 1.2); // Cap initial scale
    
    const centeredX = (width - targetW * startScale) / 2;
    const centeredY = (height - targetH * startScale) / 2;

    setScale(startScale);
    setZoomLevel(startScale);
    setPanX(centeredX);
    setPanY(centeredY);
    hasInitialized.current = true;
  }, [canvasSpreadWidth, canvasSpreadHeight, canvasSingleWidth, viewMode]);

  // Recalculate refs for event handlers
  const scaleRef = useRef(scale);
  const panXRef = useRef(panX);
  const panYRef = useRef(panY);
  scaleRef.current = scale;
  panXRef.current = panX;
  panYRef.current = panY;

  const lastWheelPointRef = useRef({ x: 0, y: 0 });
  const zoomDeltaRef = useRef(0);
  const zoomRafRef = useRef<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      // ZOOM (Ctrl + Wheel or Trackpad Pinch-like behavior)
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        lastWheelPointRef.current = { x: mouseX, y: mouseY };
        zoomDeltaRef.current += -e.deltaY * 0.01;

        if (zoomRafRef.current === null) {
          zoomRafRef.current = requestAnimationFrame(() => {
            zoomRafRef.current = null;
            const d = zoomDeltaRef.current;
            zoomDeltaRef.current = 0;
            if (Math.abs(d) < 0.001) return;

            const sOld = scaleRef.current;
            const newZoom = Math.max(0.1, Math.min(5, sOld + d * 0.5)); // Sensitivity
            
            // Point-to-point zoom math:
            // The point under the mouse (mouseX, mouseY) should stay fixed relative to the content.
            // worldX = (mouseX - panX) / scale
            // newPanX = mouseX - worldX * newScale
            // Simplified: newPanX = mouseX - (mouseX - panX) * (newScale / oldScale)
            
            const pX = panXRef.current;
            const pY = panYRef.current;
            
            const ratio = newZoom / sOld;
            const newPanX = mouseX - (mouseX - pX) * ratio;
            const newPanY = mouseY - (mouseY - pY) * ratio;

            setScale(newZoom);
            setZoomLevel(newZoom);
            setPanX(newPanX);
            setPanY(newPanY);
          });
        }
      } else {
        // PAN (Standard Wheel or Trackpad Two-Finger Swipe)
        setPanX(prev => prev - e.deltaX);
        setPanY(prev => prev - e.deltaY);
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      if (zoomRafRef.current !== null) cancelAnimationFrame(zoomRafRef.current);
    };
  }, []);

  const handleWheel = useCallback((_e: React.WheelEvent) => {
    // Handled by native listener
  }, []);

  // START PANNING LOGIC
  const startPanning = useCallback((e: React.MouseEvent) => {
    setIsPanning(true);
    let lastX = e.clientX;
    let lastY = e.clientY;

    const handleMouseMove = (ev: MouseEvent) => {
      ev.preventDefault();
      const dx = ev.clientX - lastX;
      const dy = ev.clientY - lastY;
      
      setPanX(prev => prev + dx);
      setPanY(prev => prev + dy);
      
      lastX = ev.clientX;
      lastY = ev.clientY;
    };

    const handleMouseUp = () => {
      setIsPanning(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, []);

  const handleResetZoom = useCallback(() => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const targetW = viewMode === 'spread' ? canvasSpreadWidth : canvasSingleWidth;
    const targetH = canvasSpreadHeight;
    
    // Center it again
    const startScale = 1;
    const centeredX = (width - targetW * startScale) / 2;
    const centeredY = (height - targetH * startScale) / 2;

    setScale(startScale);
    setZoomLevel(startScale);
    setPanX(centeredX);
    setPanY(centeredY);
  }, [viewMode, canvasSpreadWidth, canvasSingleWidth, canvasSpreadHeight]);

  const handleSelect = useCallback(
    (id: string | null, multi: boolean = false) => {
      const onClear = () => {
        setEditingId(null);
        setIsCropping(false);
      };
      if (!id) {
        if (!multi) {
          clearSelection();
          onClear();
        }
        return;
      }
      select(id, multi, { onClear: multi ? undefined : onClear });
      if (!multi && primarySelectedId !== id) setIsCropping(false);
    },
    [clearSelection, select, primarySelectedId]
  );

  const updateElement = useCallback(
    (id: string, updates: Partial<CanvasElement>, recordHistory = true) => {
      const newElements = elements.map(el =>
        el.id === id ? { ...el, ...updates } : el
      );
      setElements(newElements);
      if (recordHistory) addToHistory(newElements);
    },
    [elements, setElements, addToHistory]
  );

  const groupSelected = useCallback(() => {
    if (selectedIds.length < 2) return;
    const groupId = Math.random().toString(36).substr(2, 9);
    const newElements = elements.map(el =>
      selectedIds.includes(el.id) ? { ...el, groupId } : el
    );
    setElements(newElements);
    addToHistory(newElements);
  }, [selectedIds, elements, setElements, addToHistory]);

  const ungroupSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const newElements = elements.map(el => {
      if (selectedIds.includes(el.id)) {
        const { groupId, ...rest } = el;
        return rest as CanvasElement;
      }
      return el;
    });
    setElements(newElements);
    addToHistory(newElements);
  }, [selectedIds, elements, setElements, addToHistory]);

  const moveLayer = useCallback(
    (direction: 'front' | 'back') => {
      const newElements = [...elements];
      const movingElements: CanvasElement[] = [];
      for (let i = newElements.length - 1; i >= 0; i--) {
        if (selectedIds.includes(newElements[i].id)) {
          movingElements.unshift(newElements[i]);
          newElements.splice(i, 1);
        }
      }
      if (direction === 'front') {
        newElements.push(...movingElements);
      } else {
        newElements.unshift(...movingElements);
      }
      setElements(newElements);
      addToHistory(newElements);
    },
    [elements, selectedIds, setElements, addToHistory]
  );

  const addElement = useCallback(
    (type: ElementType, defaults: Partial<CanvasElement> = {}) => {
      const id = Math.random().toString(36).substr(2, 9);
      let defaultX = 50;
      if (viewMode === 'single' && activeSide === 'right') {
        defaultX = canvasSingleWidth + 50;
      }
      const shapeKind = type === 'shape' ? (defaults.shapeKind ?? 'rectangle') : undefined;
      const shapeSize =
        type === 'shape'
          ? shapeKind === 'circle'
            ? { width: 120, height: 120 }
            : shapeKind === 'ellipse'
              ? { width: 140, height: 90 }
              : shapeKind === 'triangle'
                ? { width: 100, height: 87 }
                : { width: 200, height: 100 }
          : { width: 200, height: 100 };
      const newElement: CanvasElement = {
        id,
        pageId: activePageId,
        name:
          type === 'text'
            ? 'Текст'
            : type === 'image'
              ? 'Изображение'
              : 'Фигура',
        type,
        x: defaultX,
        y: 250,
        width: shapeSize.width,
        height: shapeSize.height,
        rotation: 0,
        opacity: 1,
        locked: false,
        borderRadius: 0,
        borderWidth: 0,
        borderColor: '#000000',
        shadowBlur: 0,
        shadowColor: 'rgba(0,0,0,0.2)',
        shadowOffsetX: 0,
        shadowOffsetY: 4,
        imageScale: 1,
        imageX: 0,
        imageY: 0,
        content: type === 'text' ? 'Дважды кликните для редактирования' : '',
        backgroundColor: type === 'shape' ? '#121212' : undefined,
        shapeKind: type === 'shape' ? shapeKind : undefined,
        fontSize: 16,
        color: '#000000',
        fontFamily: 'Inter',
        fontWeight: 400,
        lineHeight: 1.4,
        textAlign: 'left',
        letterSpacing: 0,
        ...defaults,
      };
      const newElements = [...elements, newElement];
      setElements(newElements);
      setSelectedIds([id]);
      addToHistory(newElements);
      return id; // Return the new ID
    },
    [
      viewMode,
      activeSide,
      activePageId,
      canvasSingleWidth,
      elements,
      setElements,
      setSelectedIds,
      addToHistory,
    ]
  );

  const deleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const newElements = elements.filter(el => !selectedIds.includes(el.id));
    setElements(newElements);
    setSelectedIds([]);
    addToHistory(newElements);
  }, [selectedIds, elements, setElements, setSelectedIds, addToHistory]);

  const duplicateSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const selected = elements.filter(el => selectedIds.includes(el.id));
    const newGroupId = selected.some(el => el.groupId) ? Math.random().toString(36).substr(2, 9) : undefined;
    const offset = 10;
    const clones: CanvasElement[] = selected.map(el => {
      const newId = Math.random().toString(36).substr(2, 9);
      return {
        ...el,
        id: newId,
        x: el.x + offset,
        y: el.y + offset,
        groupId: el.groupId ? newGroupId : undefined,
      };
    });
    const newElements = [...elements, ...clones];
    setElements(newElements);
    setSelectedIds(clones.map(c => c.id));
    addToHistory(newElements);
  }, [selectedIds, elements, setElements, setSelectedIds, addToHistory]);

  const copySelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const selected = elements.filter(el => selectedIds.includes(el.id));
    setClipboard(selected.map(el => ({ ...el })));
  }, [selectedIds, elements]);

  const paste = useCallback(() => {
    if (clipboard.length === 0) return;
    const offset = 10;
    const groupIdMap = new Map<string, string>();
    clipboard.forEach(el => {
      if (el.groupId && !groupIdMap.has(el.groupId)) {
        groupIdMap.set(el.groupId, Math.random().toString(36).substr(2, 9));
      }
    });
    const pasted: CanvasElement[] = clipboard.map(el => ({
      ...el,
      id: Math.random().toString(36).substr(2, 9),
      pageId: activePageId,
      x: el.x + offset,
      y: el.y + offset,
      groupId: el.groupId ? groupIdMap.get(el.groupId) : undefined,
    }));
    const newElements = [...elements, ...pasted];
    setElements(newElements);
    setSelectedIds(pasted.map(p => p.id));
    addToHistory(newElements);
  }, [clipboard, activePageId, elements, setElements, setSelectedIds, addToHistory]);

  const nudgePendingRef = useRef(false);
  const nudgeResultRef = useRef<CanvasElement[]>([]);

  const nudgeSelected = useCallback(
    (dx: number, dy: number) => {
      if (selectedIds.length === 0) return;
      nudgePendingRef.current = true;
      const step = (v: number) => (snapToGrid ? snapValue(v, GRID_SIZE, true) : v);
      setElements(prev => {
        const next = prev.map(el =>
          selectedIds.includes(el.id)
            ? { ...el, x: step(el.x + dx), y: step(el.y + dy) }
            : el
        );
        nudgeResultRef.current = next;
        return next;
      });
    },
    [selectedIds, setElements, snapToGrid]
  );

  const deleteLayerById = useCallback(
    (id: string) => {
      const el = elements.find(e => e.id === id);
      const ids = el
        ? el.groupId
          ? elements.filter(e => e.groupId === el.groupId).map(e => e.id)
          : [id]
        : [];
      const newElements = elements.filter(e => !ids.includes(e.id));
      setElements(newElements);
      setSelectedIds(prev => prev.filter(i => !ids.includes(i)));
      addToHistory(newElements);
    },
    [elements, setElements, setSelectedIds, addToHistory]
  );

  const effectiveTool = isSpacePressed ? 'hand' : activeTool;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, id: string, handle?: ResizeHandle) => {
      if (effectiveTool === 'hand') {
        e.stopPropagation();
        startPanning(e);
        return;
      }
      
      // If we are in creation mode (text/shape), we likely don't want to select existing elements
      // unless we click specifically on them, but for drawing shapes on top, usually we ignore selection if clicked on blank space.
      // However, if we click ON an element while in 'shape' mode, do we select it or draw on top?
      // Standard UX: Draw on top if tool is active.
      if (activeTool === 'text' || activeTool === 'shape') {
          // Allow propagation to canvas to handle creation
          return; 
      }

      e.stopPropagation();
      if (editingId === id) return;
      e.preventDefault();

      const element = elements.find(el => el.id === id);
      if (!element || element.locked) return;

      if (isCropping && selectedIds.includes(id) && element.type === 'image') {
        setInteraction({
          mode: 'cropping',
          startX: e.clientX,
          startY: e.clientY,
          initialElements: [
            {
              id: element.id,
              x: element.x,
              y: element.y,
              width: element.width,
              height: element.height,
              imageX: element.imageX ?? 0,
              imageY: element.imageY ?? 0,
            },
          ],
        });
        return;
      }

      const isMulti = e.shiftKey;
      if (isMulti) {
        handleSelect(id, true);
      } else if (!selectedIds.includes(id)) {
        handleSelect(id, false);
      }

      const activeIds = isMulti
        ? [...selectedIds, id]
        : selectedIds.includes(id)
          ? selectedIds
          : [id];
      
      const currentElements = elements;

      const initialElementStates = currentElements
        .filter(el => activeIds.includes(el.id))
        .map(el => ({
          id: el.id,
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
        }));

      setInteraction({
        mode: handle ? 'resizing' : 'dragging',
        startX: e.clientX,
        startY: e.clientY,
        initialElements: initialElementStates,
        handle,
      });
    },
    [
      editingId,
      elements,
      isCropping,
      selectedIds,
      handleSelect,
      setInteraction,
      effectiveTool,
      startPanning,
      activeTool,
    ]
  );

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (effectiveTool === 'hand') {
      startPanning(e);
      return;
    }

    // CALCULATE COORDINATES
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // This gives us the coordinate relative to the 0,0 of the canvas content
    const rawX = (e.clientX - containerRect.left - panX) / scale;
    const rawY = (e.clientY - containerRect.top - panY) / scale;

    const snappedX = snapValue(rawX, GRID_SIZE, snapToGrid);
    const snappedY = snapValue(rawY, GRID_SIZE, snapToGrid);
    
    // ADJUST FOR SINGLE PAGE VIEW (RIGHT SIDE)
    // If we are looking at the right page in single view, coordinates start at 0 visually,
    // but should be saved as starting at canvasSingleWidth.
    let finalX = snappedX;
    if (viewMode === 'single' && activeSide === 'right') {
        finalX += canvasSingleWidth;
    }

    if (activeTool === 'text') {
        const id = addElement('text', { x: finalX, y: snappedY, width: 200, height: 50 }); // Default size for click
        setEditingId(id);
        setActiveTool('move');
        return;
    }

    if (activeTool === 'shape') {
        // Create a 0x0 shape and start "drawing"
        const id = addElement('shape', { 
            x: finalX, 
            y: snappedY, 
            width: 0, 
            height: 0, 
            shapeKind: activeShapeKind,
            backgroundColor: '#121212'
        });
        
        // Start Interaction
        setInteraction({
            mode: 'drawing',
            startX: e.clientX,
            startY: e.clientY,
            initialElements: [{ id, x: finalX, y: snappedY, width: 0, height: 0 }]
        });
        return;
    }

    // DESELECTION LOGIC
    // Check if the clicked element is explicitly marked as background
    const target = e.target as HTMLElement;
    if (target.dataset?.canvasBackground === 'true') {
      handleSelect(null);
    }
  }, [
      effectiveTool, 
      handleSelect, 
      startPanning, 
      panX, 
      panY, 
      scale, 
      snapToGrid, 
      activeTool, 
      activeShapeKind, 
      addElement, 
      setInteraction,
      viewMode,
      activeSide,
      canvasSingleWidth
  ]);

  const handleDoubleClick = useCallback(
    (id: string) => {
      if (effectiveTool === 'hand') return;
      const el = elements.find(e => e.id === id);
      if (el?.type === 'text') setEditingId(id);
    },
    [elements, effectiveTool]
  );

  const handleDragStartAsset = useCallback(
    (e: React.DragEvent, payload: string, type: 'image' | 'template') => {
      e.dataTransfer.setData('app/type', type);
      e.dataTransfer.setData('app/payload', payload);
    },
    []
  );

  const handleImageUpload = useCallback(
    (url: string) => {
      setUploadedAssets(prev => [...prev, url]);
      addElement('image', {
        content: url,
        name: 'Uploaded Image',
      });
      setActiveTool('move');
    },
    [addElement]
  );

  const handleRemoveUploadedAsset = useCallback((url: string) => {
    setUploadedAssets(prev => prev.filter(u => u !== url));
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
  }, []);

  const handleDropOnCanvas = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('app/type');
      const payload = e.dataTransfer.getData('app/payload');
      
      // Calculate Drop Position
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const rawX = (e.clientX - containerRect.left - panX) / scale;
      const rawY = (e.clientY - containerRect.top - panY) / scale;
      
      let x = snapValue(rawX, GRID_SIZE, snapToGrid);
      const finalY = snapValue(rawY, GRID_SIZE, snapToGrid);
      
      // Adjust for right page in single view
      if (viewMode === 'single' && activeSide === 'right') {
          x += canvasSingleWidth;
      }
      
      if (type === 'image') {
        addElement('image', {
          x: x - 100,
          y: finalY - 100,
          width: 200,
          height: 200,
          content: payload,
          name: 'Слой с фото',
        });
      } else if (type === 'template') {
        const template = TEXT_TEMPLATES.find(t => t.id === payload);
        if (template) {
          addElement('text', {
            ...template.elementData,
            x: x - (template.elementData.width ?? 200) / 2,
            y: finalY - (template.elementData.height ?? 100) / 2,
            name: template.name,
          });
        }
      }
      setActiveTool('move');
    },
    [
      scale,
      panX, 
      panY,
      snapToGrid,
      addElement,
      viewMode,
      activeSide,
      canvasSingleWidth
    ]
  );

  const handleSwitchPage = useCallback(
    (direction: 'next' | 'prev') => {
      switchPage(direction);
      setSelectedIds([]);
    },
    [switchPage, setSelectedIds]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      // Tool Switching Shortcuts
      if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
        if (e.key === 'v') {
          setActiveTool('move');
          return;
        }
        if (e.key === 'h') {
          setActiveTool('hand');
          return;
        }
        if (e.key === 't') {
            setActiveTool('text');
            return;
        }
        if (e.key === 'r') {
            setActiveShapeKind('rectangle');
            setActiveTool('shape');
            return;
        }
        if (e.key === 'o') {
            setActiveShapeKind('circle');
            setActiveTool('shape');
            return;
        }
      }

      // Spacebar for temporary Hand tool
      if (e.code === 'Space' && !e.repeat) {
         // Prevent scrolling if not focused on input
         e.preventDefault();
         setIsSpacePressed(true);
      }

      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        selectedIds.length > 0 &&
        !editingId
      ) {
        deleteSelected();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (selectedIds.length > 0 && !editingId) duplicateSelected();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        if (selectedIds.length > 0 && !editingId) copySelected();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        if (!editingId && clipboard.length > 0) paste();
        return;
      }
      if (e.key === 'Escape') {
        if (editingId) setEditingId(null);
        else if (selectedIds.length > 0) handleSelect(null);
        else if (activeTool !== 'move') setActiveTool('move');
        return;
      }
      const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (arrowKeys.includes(e.key) && selectedIds.length > 0 && !editingId) {
        e.preventDefault();
        const delta = e.shiftKey ? 10 : 1;
        if (e.key === 'ArrowLeft') nudgeSelected(-delta, 0);
        else if (e.key === 'ArrowRight') nudgeSelected(delta, 0);
        else if (e.key === 'ArrowUp') nudgeSelected(0, -delta);
        else if (e.key === 'ArrowDown') nudgeSelected(0, delta);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }

      const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (arrowKeys.includes(e.key) && nudgePendingRef.current) {
        nudgePendingRef.current = false;
        if (nudgeResultRef.current.length > 0) addToHistory(nudgeResultRef.current);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedIds, editingId, deleteSelected, duplicateSelected, copySelected, paste, clipboard.length, nudgeSelected, addToHistory, handleSelect, activeTool]);

  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden bg-linen text-monolith-black font-sans relative"
      style={{ minHeight: '100vh', minWidth: '100vw' }}
    >
      <GrainOverlay />
      <Header
        leftPanelOpen={leftPanelOpen}
        setLeftPanelOpen={setLeftPanelOpen}
        rightPanelOpen={rightPanelOpen}
        setRightPanelOpen={setRightPanelOpen}
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        viewMode={viewMode}
        setViewMode={setViewMode}
        activeSpreadIndex={activeSpreadIndex}
        currentPageNumber={currentPageNumber}
        currentSpreadName={pages[activeSpreadIndex]?.name ?? `Разворот ${activeSpreadIndex + 1}`}
        activePageId={activePageId}
        onRenamePage={(pageId, name) =>
          setPages(prev => prev.map(p => (p.id === pageId ? { ...p, name } : p)))
        }
        pagesCount={pages.length}
        activeSide={activeSide}
        onSwitchPage={handleSwitchPage}
        onAddPage={addPage}
        albumFormat={albumFormat}
        albumFormats={ALBUM_FORMATS}
        onAlbumFormatChange={setAlbumFormat}
        isExporting={isExporting}
        onExport={() => {
          setIsExporting(true);
          setTimeout(() => setIsExporting(false), 2000);
        }}
      />
      <div className="flex-1 relative overflow-hidden flex">
        <LeftPanel
          panelOpen={leftPanelOpen}
          width={leftPanelWidth}
          onWidthChange={setLeftPanelWidth}
          minWidth={MIN_PANEL_WIDTH}
          maxWidth={MAX_PANEL_WIDTH}
          activeTab={activeLeftTab}
          setActiveTab={setActiveLeftTab}
          currentElements={currentElements}
          selectedIds={selectedIds}
          primarySelectedId={primarySelectedId}
          onSelectLayer={handleSelect}
          onDeleteLayer={deleteLayerById}
          onRenameLayer={(id, name) => updateElement(id, { name })}
          onDragStartAsset={handleDragStartAsset}
          onImageUpload={handleImageUpload}
          onRemoveUploadedAsset={handleRemoveUploadedAsset}
          mockAssets={MOCK_ASSETS}
          uploadedAssets={uploadedAssets}
          textTemplates={TEXT_TEMPLATES}
        />
        <Canvas
          activeTool={effectiveTool}
          isPanning={isPanning}
          containerRef={containerRef}
          canvasRef={canvasRef}
          viewMode={viewMode}
          activeSide={activeSide}
          scale={scale}
          zoomLevel={zoomLevel}
          setZoomLevel={setZoomLevel}
          panX={panX}
          panY={panY}
          onResetZoom={handleResetZoom}
          showGrid={showGrid}
          setShowGrid={setShowGrid}
          snapToGrid={snapToGrid}
          setSnapToGrid={setSnapToGrid}
          canvasSpreadWidth={canvasSpreadWidth}
          canvasSpreadHeight={canvasSpreadHeight}
          canvasSingleWidth={canvasSingleWidth}
          currentElements={currentElements}
          selectedIds={selectedIds}
          selectedElement={selectedElement}
          editingId={editingId}
          isCropping={isCropping}
          onSelectBackground={handleCanvasMouseDown}
          onMouseDownElement={handleMouseDown}
          onDoubleClickElement={handleDoubleClick}
          onDrop={handleDropOnCanvas}
          onDragOver={e => e.preventDefault()}
          onWheel={handleWheel}
          updateElement={updateElement}
          setEditingId={setEditingId}
          onAddText={() => { setActiveTool('text'); }}
          onAddShape={(kind) => { setActiveShapeKind(kind); setActiveTool('shape'); }}
          onGroup={groupSelected}
          onUngroup={ungroupSelected}
          onMoveLayer={moveLayer}
          onDuplicate={duplicateSelected}
          onCopy={copySelected}
          onPaste={paste}
          canPaste={clipboard.length > 0}
          onDelete={deleteSelected}
          onSelectNone={() => handleSelect(null)}
          onSetCropping={setIsCropping}
          setActiveTool={setActiveTool}
        />
        <RightPanel
          panelOpen={rightPanelOpen}
          width={rightPanelWidth}
          onWidthChange={setRightPanelWidth}
          minWidth={MIN_PANEL_WIDTH}
          maxWidth={MAX_PANEL_WIDTH}
          selectedElement={selectedElement}
          primarySelectedId={primarySelectedId}
          selectedIds={selectedIds}
          onUpdateElement={updateElement}
          onReplaceImage={(id, url) => updateElement(id, { content: url })}
          onGroup={groupSelected}
        />
        {(leftPanelOpen || rightPanelOpen) && (
          <div
            className="fixed inset-0 bg-black/20 z-30 lg:hidden"
            onClick={() => {
              setLeftPanelOpen(false);
              setRightPanelOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default App;
