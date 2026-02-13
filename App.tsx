import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Layers, 
  Type, 
  Image as ImageIcon, 
  Circle, 
  ChevronDown, 
  Maximize2, 
  Move, 
  Type as TypeIcon, 
  Square, 
  MoreHorizontal,
  Cloud,
  Check,
  MousePointer2,
  Undo2,
  Redo2,
  Grid as GridIcon,
  Trash2,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Menu,
  X,
  Settings,
  PanelLeft,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  CaseUpper,
  BringToFront,
  SendToBack,
  Magnet,
  LayoutTemplate,
  Crop,
  Group,
  Ungroup,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { ViewMode, CanvasElement, ElementType, Page } from './types';
import { INITIAL_ELEMENTS, INITIAL_PAGES, MOCK_ASSETS, TEXT_TEMPLATES } from './constants';

const GrainOverlay = () => (
  <svg className="fixed inset-0 w-full h-full pointer-events-none z-[9999] opacity-[0.04] mix-blend-multiply">
    <filter id='grain'>
      <feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
    <rect width='100%' height='100%' filter='url(#grain)'/>
  </svg>
);

const ToolButton = ({ 
  icon, 
  active, 
  onClick, 
  tooltip, 
  disabled,
  variant = 'ghost'
}: { 
  icon: React.ReactNode, 
  active?: boolean;
  onClick?: () => void;
  tooltip?: string; 
  disabled?: boolean,
  variant?: 'ghost' | 'solid'
}) => {
  const baseClasses = "p-2 rounded-md transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed";
  
  const solidClasses = active 
    ? "bg-monolith-black text-white shadow-md" 
    : "bg-white text-gray-700 hover:text-black shadow-sm hover:shadow-md";

  const ghostClasses = active
    ? "bg-white text-monolith-black shadow-sm"
    : "text-current hover:bg-white/20";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={`${baseClasses} ${variant === 'solid' ? solidClasses : ghostClasses}`}
    >
      {icon}
    </button>
  );
};

type InteractionMode = 'idle' | 'dragging' | 'resizing' | 'cropping';
type ResizeHandle = 'tl' | 'tr' | 'bl' | 'br';
type PageSide = 'left' | 'right';
type LeftPanelTab = 'layers' | 'assets' | 'templates';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('spread');
  
  // Undo/Redo History
  const [history, setHistory] = useState<CanvasElement[][]>([INITIAL_ELEMENTS]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // State for Pages (Spreads)
  const [pages, setPages] = useState<Page[]>(INITIAL_PAGES);
  const [activePageId, setActivePageId] = useState<string>('p1');
  const [activeSide, setActiveSide] = useState<PageSide>('left');

  // Elements & Selection
  const [elements, setElements] = useState<CanvasElement[]>(INITIAL_ELEMENTS);
  
  // Ref to hold latest elements for event listeners to avoid re-binding
  const elementsRef = useRef(elements);
  elementsRef.current = elements;

  const [selectedIds, setSelectedIds] = useState<string[]>([]); 
  const [editingId, setEditingId] = useState<string | null>(null); // For Text Editing
  const [isExporting, setIsExporting] = useState(false);
  const [isCropping, setIsCropping] = useState(false); // Cropping Mode
  
  // Editor Settings
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const GRID_SIZE = 20;

  // Responsive UI State
  const [scale, setScale] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1); 
  const [leftPanelOpen, setLeftPanelOpen] = useState(true); 
  const [rightPanelOpen, setRightPanelOpen] = useState(true); 
  const [activeLeftTab, setActiveLeftTab] = useState<LeftPanelTab>('layers');

  // Unified Interaction State
  const [interaction, setInteraction] = useState<{
    mode: InteractionMode;
    startX: number;
    startY: number;
    // Store initial state for dragging/resizing
    initialElements: { 
        id: string, x: number, y: number, width: number, height: number,
        imageX?: number, imageY?: number 
    }[];
    handle?: ResizeHandle;
  }>({
    mode: 'idle',
    startX: 0, startY: 0,
    initialElements: []
  });

  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layersListRef = useRef<HTMLUListElement>(null);

  // Filter elements for current SPREAD
  const currentElements = elements.filter(el => el.pageId === activePageId);
  const primarySelectedId = selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null;
  const selectedElement = elements.find(el => el.id === primarySelectedId);

  // Active Page Index Logic
  const activeSpreadIndex = pages.findIndex(p => p.id === activePageId);
  const currentPageNumber = (activeSpreadIndex * 2) + (activeSide === 'left' ? 1 : 2);

  // --- SYNC LAYERS SCROLL ---
  useEffect(() => {
    if (primarySelectedId && layersListRef.current) {
        const item = layersListRef.current.querySelector(`[data-layer-id="${primarySelectedId}"]`);
        if (item) {
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
  }, [primarySelectedId]);

  // --- HISTORY MANAGEMENT ---
  const addToHistory = useCallback((newElements: CanvasElement[]) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newElements);
      if (newHistory.length > 50) newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const undo = () => {
      if (historyIndex > 0) {
          const prevElements = history[historyIndex - 1];
          setElements(prevElements);
          setHistoryIndex(historyIndex - 1);
      }
  };

  const redo = () => {
      if (historyIndex < history.length - 1) {
          const nextElements = history[historyIndex + 1];
          setElements(nextElements);
          setHistoryIndex(historyIndex + 1);
      }
  };

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
  }, [historyIndex, history]);

  // --- RESPONSIVE SCALING ---
  useEffect(() => {
    if (!containerRef.current) return;

    const calculateScale = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const targetW = viewMode === 'spread' ? 1000 : 500;
        const targetH = 600;
        const paddingX = 80; 
        const paddingY = 80;
        const availableW = Math.max(100, width - paddingX);
        const availableH = Math.max(100, height - paddingY);
        const scaleW = availableW / targetW;
        const scaleH = availableH / targetH;
        const autoScale = Math.min(scaleW, scaleH);
        setScale(autoScale * zoomLevel); 
      }
    };

    const observer = new ResizeObserver(() => {
        window.requestAnimationFrame(calculateScale);
    });

    observer.observe(containerRef.current);
    calculateScale(); 

    return () => observer.disconnect();
  }, [viewMode, leftPanelOpen, rightPanelOpen, zoomLevel]);

  // --- ZOOM HANDLER ---
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Check if it's a pinch (Ctrl + Wheel) or just a regular wheel scroll
    // We'll treat standard wheel as zoom too as requested, but with different sensitivity
    let delta = 0;
    
    if (e.ctrlKey || e.metaKey) {
        // Pinch gesture or Ctrl+Wheel
        delta = -e.deltaY * 0.01;
    } else {
        // Standard wheel
        delta = -e.deltaY * 0.002; 
    }

    setZoomLevel(prev => {
        const next = prev + delta;
        return Math.max(0.1, Math.min(5, next));
    });
  }, []);

  // --- ACTIONS ---

  const handleSelect = (id: string | null, multi: boolean = false) => {
    // If clicking nothing, clear selection
    if (!id) {
        if (!multi) {
            setSelectedIds([]);
            setEditingId(null);
            setIsCropping(false);
        }
        return;
    }

    const clickedEl = elements.find(e => e.id === id);
    if (!clickedEl) return;

    let idsToSelect = [id];

    // Group Selection Logic: If element belongs to a group, select the whole group
    if (clickedEl.groupId) {
        const groupMembers = elements.filter(el => el.groupId === clickedEl.groupId).map(el => el.id);
        idsToSelect = groupMembers;
    }

    if (multi) {
        setSelectedIds(prev => {
            // Check if already selected (any part of the group)
            const isAlreadySelected = idsToSelect.some(i => prev.includes(i));
            if (isAlreadySelected) {
                // Deselect group
                return prev.filter(pid => !idsToSelect.includes(pid));
            } else {
                // Add unique
                return [...Array.from(new Set([...prev, ...idsToSelect]))];
            }
        });
    } else {
        // If simply clicking an unselected item, select it (or its group)
        // If clicking something already selected, keep selection (might be starting a drag)
        if (!selectedIds.includes(id)) {
            setSelectedIds(idsToSelect);
            setEditingId(null); 
            // Only turn off cropping if we switch to a different element
            if (primarySelectedId !== id) setIsCropping(false); 
        }
    }
  };

  const handleDoubleClick = (id: string) => {
      const el = elements.find(e => e.id === id);
      if (el && el.type === 'text') {
          setEditingId(id);
      }
  };

  const updateElement = (id: string, updates: Partial<CanvasElement>, recordHistory = true) => {
    const newElements = elements.map(el => el.id === id ? { ...el, ...updates } : el);
    setElements(newElements);
    if (recordHistory) addToHistory(newElements);
  };

  const groupSelected = () => {
      if (selectedIds.length < 2) return;
      const groupId = Math.random().toString(36).substr(2, 9);
      const newElements = elements.map(el => {
          if (selectedIds.includes(el.id)) {
              return { ...el, groupId };
          }
          return el;
      });
      setElements(newElements);
      addToHistory(newElements);
  };

  const ungroupSelected = () => {
      if (selectedIds.length === 0) return;
      const newElements = elements.map(el => {
          if (selectedIds.includes(el.id)) {
              const { groupId, ...rest } = el; // remove groupId
              return rest as CanvasElement;
          }
          return el;
      });
      setElements(newElements);
      addToHistory(newElements);
  };

  const moveLayer = (direction: 'front' | 'back') => {
      const indicesToMove = elements
        .map((el, index) => selectedIds.includes(el.id) ? index : -1)
        .filter(i => i !== -1)
        .sort((a, b) => direction === 'front' ? a - b : b - a);

      if (indicesToMove.length === 0) return;

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
  };

  const addElement = (type: ElementType, defaults: Partial<CanvasElement> = {}) => {
    const id = Math.random().toString(36).substr(2, 9);
    
    let defaultX = 100;
    if (viewMode === 'single' && activeSide === 'right') {
        defaultX = 600;
    }

    const newElement: CanvasElement = {
      id,
      pageId: activePageId, 
      name: type === 'text' ? 'New Text' : type === 'image' ? 'New Image' : 'New Shape',
      type,
      x: defaultX, 
      y: 250,
      width: 200,
      height: 100,
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
      fontSize: 16,
      color: '#000000',
      fontFamily: 'Inter',
      fontWeight: 400,
      lineHeight: 1.4,
      textAlign: 'left',
      letterSpacing: 0,
      ...defaults
    };
    const newElements = [...elements, newElement];
    setElements(newElements);
    setSelectedIds([id]);
    addToHistory(newElements);
  };

  const deleteSelected = () => {
    if (selectedIds.length === 0) return;
    const newElements = elements.filter(el => !selectedIds.includes(el.id));
    setElements(newElements);
    setSelectedIds([]);
    addToHistory(newElements);
  };

  const addNewPage = () => {
    const newPageId = `p${Date.now()}`;
    const newPage: Page = { id: newPageId, name: `Spread ${pages.length + 1}` };
    setPages([...pages, newPage]);
    setActivePageId(newPageId);
    setActiveSide('left');
  };

  const switchPage = (direction: 'next' | 'prev') => {
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
    setSelectedIds([]);
  };

  const handleSetViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'single') {
        setActiveSide('left');
    }
  };

  // --- SNAP LOGIC ---
  const snapValue = (val: number) => {
    if (!snapToGrid) return val;
    return Math.round(val / GRID_SIZE) * GRID_SIZE;
  };

  // --- MOUSE INTERACTIONS ---

  const handleMouseDown = (e: React.MouseEvent, id: string, handle?: ResizeHandle) => {
    e.stopPropagation(); 
    
    // Stop if we are in text editing mode on this element
    if (editingId === id) return;
    e.preventDefault(); 

    const element = elements.find(el => el.id === id);
    if (!element || element.locked) return;

    // Logic for Cropping
    if (isCropping && selectedIds.includes(id) && element.type === 'image') {
        setInteraction({
            mode: 'cropping',
            startX: e.clientX,
            startY: e.clientY,
            initialElements: [{
                id: element.id, 
                x: element.x, y: element.y, width: element.width, height: element.height,
                imageX: element.imageX || 0, imageY: element.imageY || 0
            }]
        });
        return;
    }

    // --- REORDER LOGIC (Click to Front) ---
    // If we click an item, we want to bring it (and its group) to the front
    let currentElements = [...elements]; // Copy current state
    const idsToMove = element.groupId 
        ? currentElements.filter(el => el.groupId === element.groupId).map(el => el.id)
        : [element.id];
    
    // Check if the item(s) are already at the very end (top of stack)
    const isAtTop = idsToMove.every(moveId => {
        return currentElements.findIndex(el => el.id === moveId) >= currentElements.length - idsToMove.length;
    });

    if (!isAtTop) {
        // Extract moving elements preserving their relative order
        const movingEls: CanvasElement[] = [];
        const remainingEls: CanvasElement[] = [];
        
        currentElements.forEach(el => {
            if (idsToMove.includes(el.id)) {
                movingEls.push(el);
            } else {
                remainingEls.push(el);
            }
        });

        // Combine: remaining + moving at the end
        currentElements = [...remainingEls, ...movingEls];
        setElements(currentElements);
        addToHistory(currentElements);
    }
    // --------------------------------------

    // Normal Selection Logic
    const isMulti = e.shiftKey;
    if (isMulti) {
        handleSelect(id, true);
    } else if (!selectedIds.includes(id)) {
        handleSelect(id, false);
    }
    
    // Determine elements to interact with (could be a group)
    const activeIds = isMulti ? [...selectedIds, id] : (selectedIds.includes(id) ? selectedIds : [id]);
    
    // Use `currentElements` (the reordered array) to find initial states
    // so dragging feels instant and uses the new Z-index positions
    const initialElementStates = currentElements
        .filter(el => activeIds.includes(el.id)) 
        .map(el => ({ id: el.id, x: el.x, y: el.y, width: el.width, height: el.height }));

    setInteraction({
      mode: handle ? 'resizing' : 'dragging',
      startX: e.clientX,
      startY: e.clientY,
      initialElements: initialElementStates,
      handle
    });
  };

  // Optimized Mouse Move/Up Effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (interaction.mode === 'idle') return;

      const deltaX = (e.clientX - interaction.startX) / scale;
      const deltaY = (e.clientY - interaction.startY) / scale;

      if (interaction.mode === 'dragging') {
        // Use functional state update to access latest state without re-binding listener
        setElements(prev => prev.map(el => {
            const initial = interaction.initialElements.find(ie => ie.id === el.id);
            if (initial) {
                return {
                    ...el,
                    x: snapValue(initial.x + deltaX),
                    y: snapValue(initial.y + deltaY)
                };
            }
            return el;
        }));

      } else if (interaction.mode === 'cropping') {
          const initial = interaction.initialElements[0];
          if (initial) {
              setElements(prev => prev.map(el => el.id === initial.id ? {
                  ...el,
                  imageX: (initial.imageX || 0) + deltaX,
                  imageY: (initial.imageY || 0) + deltaY
              } : el));
          }

      } else if (interaction.mode === 'resizing' && interaction.handle) {
         setElements(prev => prev.map(el => {
             const initial = interaction.initialElements.find(ie => ie.id === el.id);
             if (!initial) return el;

             let newX = initial.x;
             let newY = initial.y;
             let newW = initial.width;
             let newH = initial.height;
             const handle = interaction.handle!;

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
                 x: snapValue(newX),
                 y: snapValue(newY),
                 width: snapValue(newW),
                 height: snapValue(newH)
             };
         }));
      }
    };

    const handleMouseUp = () => {
      if (interaction.mode !== 'idle') {
        addToHistory(elementsRef.current); // Use ref to get latest elements for history
        setInteraction(prev => ({ ...prev, mode: 'idle', initialElements: [] }));
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [interaction, scale, snapToGrid, addToHistory]);

  // --- DRAG & DROP ASSETS & TEMPLATES ---

  const handleDragStartAsset = (e: React.DragEvent, payload: string, type: 'image' | 'template') => {
    e.dataTransfer.setData('app/type', type);
    e.dataTransfer.setData('app/payload', payload);
  };

  const handleDropOnCanvas = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('app/type');
    const payload = e.dataTransfer.getData('app/payload');
    
    if (payload && canvasRef.current && containerRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      let x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;

      if (viewMode === 'single' && activeSide === 'right') {
          x += 500;
      }
      
      x = snapValue(x);
      const finalY = snapValue(y);

      if (type === 'image') {
          addElement('image', {
            x: x - 100, 
            y: finalY - 100,
            width: 200,
            height: 200,
            content: payload,
            name: 'Image Layer'
          });
      } else if (type === 'template') {
          const template = TEXT_TEMPLATES.find(t => t.id === payload);
          if (template) {
              addElement('text', {
                  ...template.elementData,
                  x: x - (template.elementData.width || 200) / 2,
                  y: finalY - (template.elementData.height || 100) / 2,
                  name: template.name
              });
          }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // --- KEYBOARD ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0 && !editingId) {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea') {
            deleteSelected();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, elements, editingId]);


  const Handle = ({ cursor, position, onMouseDown }: { cursor: string, position: string, onMouseDown: (e: React.MouseEvent) => void }) => (
    <div 
        className={`absolute w-3 h-3 bg-white border border-accent rounded-full z-50 ${position}`}
        style={{ cursor, transform: `scale(${1/scale})` }} 
        onMouseDown={onMouseDown}
    />
  );

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-linen text-monolith-black font-sans relative">
      <GrainOverlay />

      {/* HEADER */}
      <header className="h-16 bg-white border-b border-black/5 flex items-center justify-between px-4 lg:px-6 z-50 shrink-0 relative">
        <div className="flex items-center gap-3">
            <button onClick={() => setLeftPanelOpen(!leftPanelOpen)} className="p-1.5 hover:bg-linen rounded transition-colors text-gray-500 hover:text-black">
                {leftPanelOpen ? <X size={20} /> : <PanelLeft size={20} />}
            </button>
            <div className="font-extrabold uppercase tracking-tight text-lg hidden sm:block">
            Studio—01
            </div>
            
            <div className="flex items-center gap-1 ml-4 border-l border-gray-200 pl-4">
                <button onClick={undo} disabled={historyIndex <= 0} className="p-1.5 text-gray-500 hover:text-black disabled:opacity-30 rounded hover:bg-linen">
                    <Undo2 size={16} />
                </button>
                <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-1.5 text-gray-500 hover:text-black disabled:opacity-30 rounded hover:bg-linen">
                    <Redo2 size={16} />
                </button>
            </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-4 absolute left-1/2 -translate-x-1/2 lg:static lg:translate-x-0">
             <div className="flex items-center bg-linen p-1 rounded-lg shadow-sm lg:shadow-none">
                <button 
                    onClick={() => switchPage('prev')} 
                    disabled={currentPageNumber === 1}
                    className="p-1 hover:bg-white rounded disabled:opacity-30 disabled:hover:bg-transparent"
                >
                    <ChevronLeft size={16} />
                </button>
                <span className="text-[10px] lg:text-[11px] font-mono px-2 lg:px-3 w-20 lg:w-32 text-center font-medium truncate">
                    {viewMode === 'spread' ? `Spread ${activeSpreadIndex + 1}` : `Page ${currentPageNumber}`}
                </span>
                <button 
                    onClick={() => switchPage('next')}
                    disabled={activeSpreadIndex === pages.length - 1 && (viewMode === 'spread' || activeSide === 'right')}
                    className="p-1 hover:bg-white rounded disabled:opacity-30 disabled:hover:bg-transparent"
                >
                    <ChevronRight size={16} />
                </button>
             </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-4">
          <div className="bg-linen p-1 rounded-lg hidden md:flex gap-1">
                <button 
                    onClick={() => handleSetViewMode('spread')}
                    className={`px-3 lg:px-4 py-2 rounded-md text-[10px] lg:text-xs font-semibold transition-all duration-300 ${
                    viewMode === 'spread' 
                        ? 'bg-white shadow-sm text-monolith-black' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Spread
                </button>
                <button 
                    onClick={() => handleSetViewMode('single')}
                    className={`px-3 lg:px-4 py-2 rounded-md text-[10px] lg:text-xs font-semibold transition-all duration-300 ${
                    viewMode === 'single' 
                        ? 'bg-white shadow-sm text-monolith-black' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Single
                </button>
            </div>

          <button 
            onClick={() => { setIsExporting(true); setTimeout(() => setIsExporting(false), 2000); }}
            className="bg-monolith-black hover:bg-monolith-dark transition-colors text-white px-3 lg:px-5 py-2 rounded text-xs font-bold flex items-center gap-2"
          >
            {isExporting ? '...' : 'Export'}
          </button>
          
          <button onClick={() => setRightPanelOpen(!rightPanelOpen)} className="p-1.5 hover:bg-linen rounded transition-colors text-gray-500 hover:text-black">
                {rightPanelOpen ? <X size={20} /> : <Settings size={20} />}
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 relative overflow-hidden flex">
        
        {/* LEFT PANEL */}
        <aside 
            className={`
                fixed lg:relative inset-y-0 left-0 z-40 w-[280px] bg-white border-r border-black/5 flex flex-col 
                transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-2xl lg:shadow-none
                ${leftPanelOpen ? 'translate-x-0 top-16' : '-translate-x-full lg:translate-x-0'}
            `}
        >
          {/* Tabs */}
          <div className="flex border-b border-black/5">
              <button 
                onClick={() => setActiveLeftTab('layers')}
                className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider ${activeLeftTab === 'layers' ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-gray-600'}`}
              >
                  Layers
              </button>
              <button 
                onClick={() => setActiveLeftTab('assets')}
                className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider ${activeLeftTab === 'assets' ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-gray-600'}`}
              >
                  Assets
              </button>
              <button 
                onClick={() => setActiveLeftTab('templates')}
                className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider ${activeLeftTab === 'templates' ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-gray-600'}`}
              >
                  Layouts
              </button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 bg-gray-50/30">
            {activeLeftTab === 'layers' && (
                <div className="p-2">
                    <ul className="space-y-1" ref={layersListRef}>
                    {currentElements.slice().reverse().map((layer) => (
                        <li 
                        key={layer.id}
                        data-layer-id={layer.id}
                        onClick={(e) => handleSelect(layer.id, e.shiftKey)}
                        className={`flex items-center px-4 py-2.5 rounded text-[13px] cursor-pointer transition-colors duration-200 group relative ${
                            selectedIds.includes(layer.id)
                            ? 'bg-linen font-semibold text-monolith-black' 
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        >
                        <span className="opacity-50 mr-3">
                            {layer.type === 'image' && <ImageIcon size={14} />}
                            {layer.type === 'text' && <Type size={14} />}
                            {layer.type === 'shape' && <Circle size={14} />}
                        </span>
                        <span className="truncate flex-1">{layer.name}</span>
                        {layer.locked && <Lock size={12} className="opacity-30 ml-2" />}
                        {layer.groupId && <span className="ml-2 text-[9px] bg-gray-200 px-1 rounded text-gray-500">GRP</span>}
                        
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleSelect(layer.id); deleteSelected(); }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity absolute right-2"
                        >
                            <Trash2 size={12} />
                        </button>
                        </li>
                    ))}
                    {currentElements.length === 0 && <div className="text-xs text-gray-300 text-center py-8">No layers on this page</div>}
                    </ul>
                </div>
            )}

            {activeLeftTab === 'assets' && (
                <div className="p-4 grid grid-cols-2 gap-2">
                     <div className="col-span-2 pb-2">
                        <button className="w-full py-2 border border-dashed border-gray-300 rounded text-xs text-gray-500 hover:border-gray-400 hover:text-black transition-colors flex items-center justify-center gap-2">
                            <Cloud size={14} /> Upload Image
                        </button>
                    </div>
                    {MOCK_ASSETS.map((src, i) => (
                        <div 
                        key={i} 
                        draggable
                        onDragStart={(e) => handleDragStartAsset(e, src, 'image')}
                        className="aspect-square bg-white rounded overflow-hidden cursor-grab active:cursor-grabbing hover:opacity-80 transition-all group relative border border-gray-200 shadow-sm"
                        >
                        <img src={src} alt="asset" className="w-full h-full object-cover" />
                        </div>
                    ))}
                </div>
            )}

            {activeLeftTab === 'templates' && (
                <div className="p-4 space-y-3">
                    {TEXT_TEMPLATES.map((tpl) => (
                        <div 
                            key={tpl.id}
                            draggable
                            onDragStart={(e) => handleDragStartAsset(e, tpl.id, 'template')}
                            className="bg-white border border-gray-200 rounded p-3 cursor-grab active:cursor-grabbing hover:border-accent hover:shadow-md transition-all group"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold uppercase text-gray-500">{tpl.name}</span>
                                <LayoutTemplate size={12} className="text-gray-300" />
                            </div>
                            <div className="text-3xl text-center py-2 font-serif text-black/80">{tpl.preview}</div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        </aside>

        {/* MIDDLE: VIEWPORT */}
        <main 
            className="flex-1 bg-linen relative overflow-hidden flex items-center justify-center p-0 perspective-[2000px] touch-none"
            ref={containerRef}
            onWheel={handleWheel}
            onMouseDown={(e) => { 
                // Only deselect if clicking the background directly
                if (e.target === e.currentTarget) handleSelect(null);
            }}
        >
          {/* CANVAS TOOLBAR */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
             <ToolButton 
                icon={<GridIcon size={16} />} 
                active={showGrid} 
                onClick={() => setShowGrid(!showGrid)}
                tooltip="Toggle Grid"
                variant="solid"
             />
             <ToolButton 
                icon={<Magnet size={16} />} 
                active={snapToGrid} 
                onClick={() => setSnapToGrid(!snapToGrid)}
                tooltip="Toggle Snap to Grid"
                variant="solid"
             />
             <div className="w-px h-6 bg-gray-300 mx-1"></div>
             {/* Manual Zoom Control */}
             <div className="flex items-center bg-white rounded-lg shadow-sm px-2 h-10 gap-2">
                 <span className="text-[10px] font-mono text-gray-500">ZOOM</span>
                 <input 
                    type="range" min="0.5" max="1.5" step="0.1" 
                    value={zoomLevel} 
                    onChange={(e) => setZoomLevel(Number(e.target.value))}
                    className="w-20 accent-monolith-black h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" 
                 />
                 <button onClick={() => setZoomLevel(1)} className="text-[10px] font-mono hover:bg-gray-100 p-1 rounded">
                    {Math.round(scale * 100)}%
                 </button>
             </div>
          </div>

          <div 
            style={{ 
                transform: `scale(${scale})`,
                width: viewMode === 'spread' ? '1000px' : '500px', 
                height: '600px',
            }}
            className="relative shadow-soft ring-1 ring-black/5 overflow-hidden origin-center bg-white transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
          >
            <div 
                ref={canvasRef}
                className="absolute top-0 left-0 w-[1000px] h-[600px] transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
                style={{
                    transform: viewMode === 'single' && activeSide === 'right' ? 'translateX(-500px)' : 'translateX(0)'
                }}
                onDrop={handleDropOnCanvas}
                onDragOver={handleDragOver}
            >
                {/* CENTERED SPINE */}
                <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[2px] z-20 bg-gradient-to-r from-black/5 via-black/20 to-black/5 pointer-events-none" />

                {/* GRID LINES - Centered */}
                {showGrid && (
                    <div className="absolute inset-0 pointer-events-none opacity-[0.05] z-0" 
                        style={{ 
                            backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`, 
                            backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
                            backgroundPosition: 'center top'
                        }}>
                    </div>
                )}

                {/* RENDER ELEMENTS */}
                {currentElements.map(el => {
                    const isSelected = selectedIds.includes(el.id);
                    const isEditing = editingId === el.id;
                    const isBeingCropped = isCropping && selectedIds.length === 1 && selectedIds[0] === el.id;
                    
                    return (
                        <div
                            key={el.id}
                            onMouseDown={(e) => handleMouseDown(e, el.id)}
                            onDoubleClick={(e) => { e.stopPropagation(); handleDoubleClick(el.id); }}
                            style={{
                                position: 'absolute',
                                left: el.x,
                                top: el.y,
                                width: el.width,
                                height: el.height,
                                transform: `rotate(${el.rotation}deg)`,
                                opacity: el.opacity,
                                zIndex: isSelected ? 50 : 1,
                                cursor: isEditing ? 'text' : el.locked ? 'default' : isBeingCropped ? 'move' : 'move',
                                borderRadius: `${el.borderRadius}px`,
                                border: el.borderWidth > 0 ? `${el.borderWidth}px solid ${el.borderColor}` : 'none',
                                boxShadow: el.shadowBlur > 0 ? `${el.shadowOffsetX}px ${el.shadowOffsetY}px ${el.shadowBlur}px ${el.shadowColor}` : 'none',
                                overflow: 'hidden' // Important for masking images
                            }}
                            className={`group select-none ${isSelected ? 'ring-1 ring-accent' : 'hover:ring-1 hover:ring-gray-200'}`}
                        >
                            {/* Resize Handles - Only show if single item selected and NOT cropping */}
                            {isSelected && !el.locked && selectedIds.length === 1 && !isBeingCropped && (
                                <>
                                    <Handle cursor="nw-resize" position="-top-1.5 -left-1.5" onMouseDown={(e) => handleMouseDown(e, el.id, 'tl')} />
                                    <Handle cursor="ne-resize" position="-top-1.5 -right-1.5" onMouseDown={(e) => handleMouseDown(e, el.id, 'tr')} />
                                    <Handle cursor="sw-resize" position="-bottom-1.5 -left-1.5" onMouseDown={(e) => handleMouseDown(e, el.id, 'bl')} />
                                    <Handle cursor="se-resize" position="-bottom-1.5 -right-1.5" onMouseDown={(e) => handleMouseDown(e, el.id, 'br')} />
                                </>
                            )}

                            {/* CONTENT */}
                            {el.type === 'image' && (
                                <div className="w-full h-full relative pointer-events-none">
                                    <img 
                                        src={el.content} 
                                        alt={el.name}
                                        className="w-full h-full object-cover"
                                        style={{ 
                                            // Cropping Transform
                                            transform: `scale(${el.imageScale || 1}) translate(${el.imageX || 0}px, ${el.imageY || 0}px)`,
                                            transformOrigin: 'center center'
                                        }}
                                    />
                                </div>
                            )}
                            {el.type === 'text' && (
                                <div style={{
                                        width: '100%', height: '100%',
                                        fontSize: `${el.fontSize}px`,
                                        fontFamily: el.fontFamily,
                                        fontWeight: el.fontWeight,
                                        color: el.color,
                                        letterSpacing: `${el.letterSpacing}em`,
                                        textAlign: el.textAlign,
                                        lineHeight: el.lineHeight,
                                        fontStyle: el.italic ? 'italic' : 'normal',
                                        textTransform: el.uppercase ? 'uppercase' : 'none',
                                        display: 'flex',
                                        alignItems: 'flex-start'
                                }}>
                                    {isEditing ? (
                                        <textarea
                                            value={el.content}
                                            autoFocus
                                            onChange={(e) => updateElement(el.id, { content: e.target.value })}
                                            onBlur={() => setEditingId(null)}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                background: 'transparent',
                                                resize: 'none',
                                                border: 'none',
                                                outline: 'none',
                                                padding: 0,
                                                margin: 0,
                                                font: 'inherit',
                                                color: 'inherit',
                                                textAlign: 'inherit'
                                            }}
                                            className="cursor-text pointer-events-auto"
                                            onMouseDown={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        <div className="w-full h-full whitespace-pre-wrap">{el.content}</div>
                                    )}
                                </div>
                            )}
                            {el.type === 'shape' && (
                                <div 
                                    style={{ 
                                      backgroundColor: el.backgroundColor,
                                      borderRadius: `${el.borderRadius}px`
                                    }} 
                                    className="w-full h-full"
                                />
                            )}
                        </div>
                    );
                })}
            </div>
          </div>

          <div className="absolute bottom-6 lg:bottom-10 left-1/2 -translate-x-1/2 bg-monolith-black text-white rounded-full px-4 py-2 flex items-center gap-2 shadow-float z-30 scale-90 lg:scale-100 origin-bottom">
             {/* ... Tool Buttons ... */}
             <ToolButton 
                icon={<MousePointer2 size={18} />} 
                active={selectedIds.length === 0} 
                onClick={() => handleSelect(null)}
                tooltip="Select"
             />
             <div className="w-px h-6 bg-white/20 mx-1" />
             <ToolButton icon={<TypeIcon size={18} />} onClick={() => addElement('text')} tooltip="Add Text" />
             <ToolButton icon={<Square size={18} />} onClick={() => addElement('shape')} tooltip="Add Rectangle" />
             <div className="w-px h-6 bg-white/20 mx-1" />
             
             {/* Dynamic Buttons based on Selection */}
             {selectedIds.length > 1 && (
                 <>
                    <ToolButton icon={<Group size={18} />} onClick={groupSelected} tooltip="Group" />
                    <div className="w-px h-6 bg-white/20 mx-1" />
                 </>
             )}
             {selectedIds.length === 1 && selectedElement?.groupId && (
                  <>
                    <ToolButton icon={<Ungroup size={18} />} onClick={ungroupSelected} tooltip="Ungroup" />
                    <div className="w-px h-6 bg-white/20 mx-1" />
                 </>
             )}
             {selectedIds.length === 1 && selectedElement?.type === 'image' && (
                 <>
                    <ToolButton icon={<Crop size={18} />} active={isCropping} onClick={() => setIsCropping(!isCropping)} tooltip="Crop Image" />
                    <div className="w-px h-6 bg-white/20 mx-1" />
                 </>
             )}

             {selectedIds.length > 0 && (
                 <>
                    <ToolButton icon={<ArrowUp size={18} />} onClick={() => moveLayer('front')} tooltip="Bring to Front" />
                    <ToolButton icon={<ArrowDown size={18} />} onClick={() => moveLayer('back')} tooltip="Send to Back" />
                    <div className="w-px h-6 bg-white/20 mx-1" />
                 </>
             )}

             <ToolButton 
                icon={<Trash2 size={18} />} 
                onClick={deleteSelected} 
                disabled={selectedIds.length === 0}
                tooltip="Delete"
            />
          </div>
        </main>

        {/* RIGHT PANEL - PROPERTIES - Keep existing properties code ... */}
        <aside 
            className={`
                fixed lg:relative inset-y-0 right-0 z-40 w-[300px] bg-white border-l border-black/5 overflow-y-auto
                transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-2xl lg:shadow-none
                ${rightPanelOpen ? 'translate-x-0 top-16' : 'translate-x-full lg:translate-x-0'}
            `}
        >
          {primarySelectedId && selectedElement ? (
            <div className="pb-12">
                {/* ... existing properties panel content ... */}
              <div className="p-6 border-b border-black/5 sticky top-0 bg-white/95 backdrop-blur z-10">
                <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-gray-400">Layout</h3>
                    <div className="flex gap-2">
                        <button onClick={() => updateElement(selectedElement.id, { locked: !selectedElement.locked })} className="text-gray-400 hover:text-gray-600">
                            {selectedElement.locked ? <Lock size={14} /> : <Unlock size={14} />}
                        </button>
                    </div>
                </div>
              </div>
              
              <div className="p-6 space-y-6 border-b border-black/5">
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <span className="text-xs text-gray-500 block mb-1">X</span>
                        <input 
                            type="number" 
                            value={Math.round(selectedElement.x)} 
                            onChange={(e) => updateElement(selectedElement.id, { x: Number(e.target.value) })}
                            className="w-full font-mono text-[11px] bg-linen px-2 py-1.5 rounded border-none focus:ring-1 focus:ring-accent"
                        />
                     </div>
                     <div>
                        <span className="text-xs text-gray-500 block mb-1">Y</span>
                        <input 
                            type="number" 
                            value={Math.round(selectedElement.y)} 
                            onChange={(e) => updateElement(selectedElement.id, { y: Number(e.target.value) })}
                            className="w-full font-mono text-[11px] bg-linen px-2 py-1.5 rounded border-none focus:ring-1 focus:ring-accent"
                        />
                     </div>
                     <div>
                        <span className="text-xs text-gray-500 block mb-1">W</span>
                        <input 
                            type="number" 
                            value={Math.round(selectedElement.width)} 
                            onChange={(e) => updateElement(selectedElement.id, { width: Number(e.target.value) })}
                            className="w-full font-mono text-[11px] bg-linen px-2 py-1.5 rounded border-none focus:ring-1 focus:ring-accent"
                        />
                     </div>
                     <div>
                        <span className="text-xs text-gray-500 block mb-1">H</span>
                        <input 
                            type="number" 
                            value={Math.round(selectedElement.height)} 
                            onChange={(e) => updateElement(selectedElement.id, { height: Number(e.target.value) })}
                            className="w-full font-mono text-[11px] bg-linen px-2 py-1.5 rounded border-none focus:ring-1 focus:ring-accent"
                        />
                     </div>
                  </div>
                  
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">Rotation</span>
                    <input 
                        type="range" min="0" max="360" 
                        value={selectedElement.rotation} 
                        onChange={(e) => updateElement(selectedElement.id, { rotation: Number(e.target.value) })}
                        className="w-full accent-monolith-black h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="text-right mt-1 font-mono text-[10px] text-gray-500">{selectedElement.rotation}°</div>
                  </div>

                  {selectedElement.type === 'image' && (
                    <div className="bg-linen p-3 rounded">
                        <span className="text-xs font-bold text-gray-500 block mb-2 uppercase">Image Fill</span>
                        <div className="space-y-2">
                             <div>
                                <span className="text-[10px] text-gray-500 block">Scale</span>
                                <input 
                                    type="range" min="0.1" max="5" step="0.1"
                                    value={selectedElement.imageScale || 1} 
                                    onChange={(e) => updateElement(selectedElement.id, { imageScale: Number(e.target.value) })}
                                    className="w-full accent-monolith-black h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                             </div>
                             <div className="grid grid-cols-2 gap-2">
                                 <input 
                                     type="number" placeholder="Off X"
                                     value={Math.round(selectedElement.imageX || 0)}
                                     onChange={(e) => updateElement(selectedElement.id, { imageX: Number(e.target.value) })}
                                     className="w-full font-mono text-[10px] p-1 rounded"
                                 />
                                 <input 
                                     type="number" placeholder="Off Y"
                                     value={Math.round(selectedElement.imageY || 0)}
                                     onChange={(e) => updateElement(selectedElement.id, { imageY: Number(e.target.value) })}
                                     className="w-full font-mono text-[10px] p-1 rounded"
                                 />
                             </div>
                        </div>
                    </div>
                  )}
                  
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">Opacity</span>
                    <input 
                        type="range" min="0" max="1" step="0.01"
                        value={selectedElement.opacity} 
                        onChange={(e) => updateElement(selectedElement.id, { opacity: Number(e.target.value) })}
                        className="w-full accent-monolith-black h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="text-right mt-1 font-mono text-[10px] text-gray-500">{Math.round(selectedElement.opacity * 100)}%</div>
                  </div>
              </div>

              {/* APPEARANCE SECTION */}
              <div className="p-6 border-b border-black/5">
                 <h3 className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-gray-400 mb-4">Appearance</h3>
                 
                 <div className="space-y-4">
                     <div className="flex justify-between items-center">
                         <span className="text-xs text-gray-500">Corner Radius</span>
                         <input 
                             type="number" className="w-16 font-mono text-[11px] bg-linen px-2 py-1 rounded border-none text-right"
                             value={selectedElement.borderRadius}
                             onChange={(e) => updateElement(selectedElement.id, { borderRadius: Number(e.target.value) })}
                         />
                     </div>

                     {selectedElement.type === 'shape' && (
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Fill Color</span>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="color" 
                                    value={selectedElement.backgroundColor}
                                    onChange={(e) => updateElement(selectedElement.id, { backgroundColor: e.target.value })}
                                    className="w-5 h-5 rounded border-none p-0 bg-transparent cursor-pointer"
                                />
                                <span className="text-[10px] font-mono uppercase">{selectedElement.backgroundColor}</span>
                            </div>
                        </div>
                     )}

                     <div>
                        <div className="flex justify-between items-center mb-2">
                             <span className="text-xs text-gray-500">Border</span>
                             <div className="flex items-center gap-2">
                                <input 
                                    type="color" 
                                    value={selectedElement.borderColor}
                                    onChange={(e) => updateElement(selectedElement.id, { borderColor: e.target.value })}
                                    className="w-4 h-4 rounded-full border-none p-0 bg-transparent cursor-pointer"
                                />
                             </div>
                        </div>
                        <input 
                            type="range" min="0" max="20" 
                            value={selectedElement.borderWidth}
                            onChange={(e) => updateElement(selectedElement.id, { borderWidth: Number(e.target.value) })}
                            className="w-full accent-monolith-black h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="text-right mt-1 font-mono text-[10px] text-gray-500">{selectedElement.borderWidth}px</div>
                     </div>
                 </div>
              </div>

              {/* EFFECTS SECTION */}
              <div className="p-6 border-b border-black/5">
                 <h3 className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-gray-400 mb-4">Shadow</h3>
                 <div className="space-y-4">
                     <div>
                        <div className="flex justify-between items-center mb-1">
                             <span className="text-xs text-gray-500">Blur</span>
                        </div>
                        <input 
                            type="range" min="0" max="50" 
                            value={selectedElement.shadowBlur}
                            onChange={(e) => updateElement(selectedElement.id, { shadowBlur: Number(e.target.value) })}
                            className="w-full accent-monolith-black h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                             <span className="text-xs text-gray-500 block mb-1">Offset X</span>
                             <input type="number" value={selectedElement.shadowOffsetX} onChange={(e) => updateElement(selectedElement.id, {shadowOffsetX: Number(e.target.value)})} className="w-full font-mono text-[11px] bg-linen px-2 py-1 rounded border-none"/>
                         </div>
                         <div>
                             <span className="text-xs text-gray-500 block mb-1">Offset Y</span>
                             <input type="number" value={selectedElement.shadowOffsetY} onChange={(e) => updateElement(selectedElement.id, {shadowOffsetY: Number(e.target.value)})} className="w-full font-mono text-[11px] bg-linen px-2 py-1 rounded border-none"/>
                         </div>
                     </div>
                 </div>
              </div>

              {selectedElement.type === 'text' && (
                  <div className="p-6 border-b border-black/5">
                    <h3 className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-gray-400 mb-4">Typography</h3>
                    
                    <div className="space-y-4">
                         <div>
                            <span className="text-xs text-gray-500 block mb-1">Font Family</span>
                            <select 
                                value={selectedElement.fontFamily}
                                onChange={(e) => updateElement(selectedElement.id, { fontFamily: e.target.value })}
                                className="w-full text-xs p-2 bg-linen rounded border-none outline-none"
                            >
                                <option value="Inter">Inter (Sans)</option>
                                <option value="JetBrains Mono">Mono</option>
                                <option value="Times New Roman">Serif</option>
                                <option value="Arial">Arial</option>
                            </select>
                         </div>

                         <div className="flex gap-2">
                             <button 
                                onClick={() => updateElement(selectedElement.id, { fontWeight: selectedElement.fontWeight === 700 ? 400 : 700 })}
                                className={`p-1.5 rounded flex-1 flex justify-center ${selectedElement.fontWeight === 700 ? 'bg-monolith-black text-white' : 'bg-linen text-black'}`}
                            >
                                <Bold size={14} />
                             </button>
                             <button 
                                onClick={() => updateElement(selectedElement.id, { italic: !selectedElement.italic })}
                                className={`p-1.5 rounded flex-1 flex justify-center ${selectedElement.italic ? 'bg-monolith-black text-white' : 'bg-linen text-black'}`}
                            >
                                <Italic size={14} />
                             </button>
                             <button 
                                onClick={() => updateElement(selectedElement.id, { uppercase: !selectedElement.uppercase })}
                                className={`p-1.5 rounded flex-1 flex justify-center ${selectedElement.uppercase ? 'bg-monolith-black text-white' : 'bg-linen text-black'}`}
                            >
                                <CaseUpper size={14} />
                             </button>
                         </div>

                         <div className="flex gap-1 bg-linen p-1 rounded">
                             {['left', 'center', 'right', 'justify'].map((align) => (
                                 <button 
                                    key={align}
                                    onClick={() => updateElement(selectedElement.id, { textAlign: align as any })}
                                    className={`p-1.5 rounded flex-1 flex justify-center transition-colors ${selectedElement.textAlign === align ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                                 >
                                    {align === 'left' && <AlignLeft size={14} />}
                                    {align === 'center' && <AlignCenter size={14} />}
                                    {align === 'right' && <AlignRight size={14} />}
                                    {align === 'justify' && <AlignJustify size={14} />}
                                 </button>
                             ))}
                         </div>

                         <div>
                            <span className="text-xs text-gray-500 block mb-1">Size</span>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="range" min="8" max="120" 
                                    value={selectedElement.fontSize}
                                    onChange={(e) => updateElement(selectedElement.id, { fontSize: Number(e.target.value) })}
                                    className="flex-1 accent-monolith-black h-1 bg-gray-200 rounded-lg appearance-none"
                                />
                                <span className="font-mono text-[11px] w-8 text-right">{selectedElement.fontSize}</span>
                            </div>
                         </div>
                         
                         <div>
                            <span className="text-xs text-gray-500 block mb-1">Letter Spacing</span>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="range" min="-0.1" max="0.5" step="0.01"
                                    value={selectedElement.letterSpacing || 0}
                                    onChange={(e) => updateElement(selectedElement.id, { letterSpacing: Number(e.target.value) })}
                                    className="flex-1 accent-monolith-black h-1 bg-gray-200 rounded-lg appearance-none"
                                />
                                <span className="font-mono text-[11px] w-8 text-right">{selectedElement.letterSpacing}</span>
                            </div>
                         </div>

                         <div>
                            <span className="text-xs text-gray-500 block mb-1">Color</span>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="color" 
                                    value={selectedElement.color}
                                    onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                                    className="w-full h-8 rounded cursor-pointer border-none p-0"
                                />
                            </div>
                         </div>
                    </div>
                  </div>
              )}
            </div>
          ) : selectedIds.length > 1 ? (
             <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                <div className="relative mb-4">
                    <Square size={24} className="absolute -top-2 -left-2 text-gray-300" />
                    <Square size={24} className="text-gray-400" />
                </div>
                <p className="text-xs font-mono mb-2">{selectedIds.length} ITEMS SELECTED</p>
                <button 
                    onClick={groupSelected}
                    className="bg-monolith-black text-white px-4 py-2 rounded text-xs font-bold flex items-center gap-2 hover:bg-black transition-colors"
                >
                    <Group size={14} /> Group Selection
                </button>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                <MousePointer2 size={32} strokeWidth={1} className="mb-4 opacity-20" />
                <p className="text-xs font-mono">SELECT AN ELEMENT TO EDIT PROPERTIES</p>
                <div className="mt-8 block lg:hidden">
                    <p className="text-[10px] text-gray-500 mb-2">HINT</p>
                    <p className="text-[10px] text-gray-400">Close this panel to see the canvas again.</p>
                </div>
            </div>
          )}
        </aside>

        {(leftPanelOpen || rightPanelOpen) && (
            <div 
                className="fixed inset-0 bg-black/20 z-30 lg:hidden"
                onClick={() => { setLeftPanelOpen(false); setRightPanelOpen(false); }}
            />
        )}
      </div>
    </div>
  );
};

export default App;