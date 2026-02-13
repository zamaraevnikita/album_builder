import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ViewMode, CanvasElement, ElementType } from './types';
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
    GRID_SIZE
  );

  const currentElements = elements.filter(el => el.pageId === activePageId);

  useEffect(() => {
    if (!containerRef.current) return;
    const calculateScale = () => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      const targetW = viewMode === 'spread' ? canvasSpreadWidth : canvasSingleWidth;
      const targetH = canvasSpreadHeight;
      const paddingX = 80;
      const paddingY = 80;
      const availableW = Math.max(100, width - paddingX);
      const availableH = Math.max(100, height - paddingY);
      const scaleW = availableW / targetW;
      const scaleH = availableH / targetH;
      const autoScale = Math.min(scaleW, scaleH);
      const raw = autoScale * zoomLevel;
      const newScale = Math.round(raw * 1000) / 1000;
      if (!zoomFromWheelRef.current) {
        const oldScale = scaleRef.current;
        if (oldScale > 0 && oldScale !== newScale) {
          setPanX(prev => prev * (newScale / oldScale));
          setPanY(prev => prev * (newScale / oldScale));
        }
        setScale(newScale);
      }
      zoomFromWheelRef.current = false;
    };
    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(calculateScale);
    });
    observer.observe(containerRef.current);
    calculateScale();
    return () => observer.disconnect();
  }, [viewMode, leftPanelOpen, rightPanelOpen, zoomLevel, canvasSpreadWidth, canvasSingleWidth, canvasSpreadHeight]);

  const zoomDeltaRef = useRef(0);
  const zoomRafRef = useRef<number | null>(null);
  const lastWheelPointRef = useRef({ x: 0, y: 0 });
  const zoomFromWheelRef = useRef(false);
  const scaleRef = useRef(scale);
  const zoomLevelRef = useRef(zoomLevel);
  const panXRef = useRef(panX);
  const panYRef = useRef(panY);
  const canvasWidthRef = useRef(canvasSpreadWidth);
  const canvasHeightRef = useRef(canvasSpreadHeight);
  const canvasSpreadWidthRef = useRef(canvasSpreadWidth);
  scaleRef.current = scale;
  zoomLevelRef.current = zoomLevel;
  panXRef.current = panX;
  panYRef.current = panY;
  canvasWidthRef.current = viewMode === 'spread' ? canvasSpreadWidth : canvasSingleWidth;
  canvasHeightRef.current = canvasSpreadHeight;
  canvasSpreadWidthRef.current = canvasSpreadWidth;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const s = scaleRef.current;
        const spreadW = canvasSpreadWidthRef.current;
        const spreadH = canvasHeightRef.current;
        const boxW = spreadW * s;
        const boxH = spreadH * s;
        const boxLeft = (rect.width - boxW) / 2;
        const boxTop = (rect.height - boxH) / 2;
        const mx = e.clientX - rect.left - boxLeft;
        const my = e.clientY - rect.top - boxTop;
        lastWheelPointRef.current = { x: mx, y: my };
        zoomDeltaRef.current += -e.deltaY * 0.01;
        if (zoomRafRef.current === null) {
          zoomRafRef.current = requestAnimationFrame(() => {
            zoomRafRef.current = null;
            const d = zoomDeltaRef.current;
            zoomDeltaRef.current = 0;
            if (d === 0) return;
            const prevZoom = zoomLevelRef.current;
            const newZoom = Math.max(0.1, Math.min(5, prevZoom + d));
            const sOld = scaleRef.current;
            const sNew = Math.round(sOld * (newZoom / prevZoom) * 1000) / 1000;
            const { x: mx_w, y: my_w } = lastWheelPointRef.current;
            const tx = panXRef.current;
            const ty = panYRef.current;
            const panXNew = mx_w * (1 - sNew / sOld) + tx * (sNew / sOld);
            const panYNew = my_w * (1 - sNew / sOld) + ty * (sNew / sOld);
            zoomFromWheelRef.current = true;
            setScale(sNew);
            setZoomLevel(newZoom);
            setPanX(panXNew);
            setPanY(panYNew);
          });
        }
      } else {
        e.preventDefault();
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
    // Pan (two fingers) and zoom (ctrl+wheel) are handled in the native wheel listener
  }, []);

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
            ? 'New Text'
            : type === 'image'
              ? 'New Image'
              : 'New Shape',
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
        content: type === 'text' ? 'Double click to edit' : '',
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

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, id: string, handle?: ResizeHandle) => {
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

      let currentElements = [...elements];
      const idsToMove = element.groupId
        ? currentElements
            .filter(el => el.groupId === element.groupId)
            .map(el => el.id)
        : [element.id];

      const isAtTop = idsToMove.every(
        moveId =>
          currentElements.findIndex(el => el.id === moveId) >=
          currentElements.length - idsToMove.length
      );

      if (!isAtTop) {
        const movingEls: CanvasElement[] = [];
        const remainingEls: CanvasElement[] = [];
        currentElements.forEach(el => {
          if (idsToMove.includes(el.id)) movingEls.push(el);
          else remainingEls.push(el);
        });
        currentElements = [...remainingEls, ...movingEls];
        setElements(currentElements);
        addToHistory(currentElements);
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
      setElements,
      addToHistory,
    ]
  );

  const handleDoubleClick = useCallback(
    (id: string) => {
      const el = elements.find(e => e.id === id);
      if (el?.type === 'text') setEditingId(id);
    },
    [elements]
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
      if (!payload || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      let x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;
      if (viewMode === 'single' && activeSide === 'right') {
        x += canvasSingleWidth;
      }
      x = snapValue(x, GRID_SIZE, snapToGrid);
      const finalY = snapValue(y, GRID_SIZE, snapToGrid);

      if (type === 'image') {
        addElement('image', {
          x: x - 100,
          y: finalY - 100,
          width: 200,
          height: 200,
          content: payload,
          name: 'Image Layer',
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
    },
    [
      scale,
      viewMode,
      activeSide,
      canvasSingleWidth,
      snapToGrid,
      addElement,
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
  }, [selectedIds, editingId, deleteSelected, duplicateSelected, copySelected, paste, clipboard.length, nudgeSelected, addToHistory, handleSelect]);

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
        currentSpreadName={pages[activeSpreadIndex]?.name ?? `Spread ${activeSpreadIndex + 1}`}
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
          containerRef={containerRef}
          canvasRef={canvasRef}
          viewMode={viewMode}
          activeSide={activeSide}
          scale={scale}
          zoomLevel={zoomLevel}
          setZoomLevel={setZoomLevel}
          panX={panX}
          panY={panY}
          onResetZoom={() => {
            setZoomLevel(1);
            setPanX(0);
            setPanY(0);
          }}
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
          onSelectBackground={() => handleSelect(null)}
          onMouseDownElement={handleMouseDown}
          onDoubleClickElement={handleDoubleClick}
          onDrop={handleDropOnCanvas}
          onDragOver={e => e.preventDefault()}
          onWheel={handleWheel}
          updateElement={updateElement}
          setEditingId={setEditingId}
          onAddText={() => addElement('text')}
          onAddShape={(kind) => addElement('shape', { shapeKind: kind })}
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
