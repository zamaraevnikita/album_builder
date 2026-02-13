
import React, { useState, useRef, useEffect } from 'react';
import {
  MousePointer2,
  Hand,
  Type as TypeIcon,
  Square,
  Circle,
  Triangle,
  CircleDot,
  ChevronDown,
  Group,
  Ungroup,
  Crop,
  ArrowUp,
  ArrowDown,
  Trash2,
  Check,
} from 'lucide-react';
import { ToolButton } from '../ui/ToolButton';
import type { CanvasElement, ToolType, ShapeKind } from '../../types';

const SHAPE_OPTIONS: { kind: ShapeKind; icon: React.ReactNode; label: string }[] = [
  { kind: 'rectangle', icon: <Square size={18} />, label: 'Прямоугольник' },
  { kind: 'circle', icon: <Circle size={18} />, label: 'Круг' },
  { kind: 'ellipse', icon: <CircleDot size={18} />, label: 'Овал' },
  { kind: 'triangle', icon: <Triangle size={18} />, label: 'Треугольник' },
];

export type ToolbarProps = {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  selectedIds: string[];
  selectedElement: CanvasElement | null;
  isCropping: boolean;
  onSetCropping: (v: boolean) => void;
  onSelectNone: () => void;
  onAddText: () => void;
  onAddShape: (kind: ShapeKind) => void;
  onGroup: () => void;
  onUngroup: () => void;
  onMoveLayer: (direction: 'front' | 'back') => void;
  onDuplicate: () => void;
  onCopy: () => void;
  onPaste: () => void;
  canPaste: boolean;
  onDelete: () => void;
};

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  setActiveTool,
  selectedIds,
  selectedElement,
  isCropping,
  onSetCropping,
  onSelectNone,
  onAddText,
  onAddShape,
  onGroup,
  onUngroup,
  onMoveLayer,
  onDuplicate,
  onCopy,
  onPaste,
  canPaste,
  onDelete,
}) => {
  const [shapeDropdownOpen, setShapeDropdownOpen] = useState(false);
  const [toolDropdownOpen, setToolDropdownOpen] = useState(false);
  
  const shapeDropdownRef = useRef<HTMLDivElement>(null);
  const toolDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shapeDropdownRef.current && !shapeDropdownRef.current.contains(e.target as Node)) {
        setShapeDropdownOpen(false);
      }
      if (toolDropdownRef.current && !toolDropdownRef.current.contains(e.target as Node)) {
        setToolDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
  <div 
    className="absolute bottom-6 lg:bottom-10 left-1/2 -translate-x-1/2 bg-monolith-black text-white rounded-full px-4 py-2 flex items-center gap-2 shadow-float z-30 scale-90 lg:scale-100 origin-bottom"
    onMouseDown={(e) => e.stopPropagation()}
    onClick={(e) => e.stopPropagation()}
  >
    
    {/* Tool Selection Dropdown */}
    <div className="relative" ref={toolDropdownRef}>
        <div className="flex items-center gap-0.5">
            <ToolButton
                icon={activeTool === 'move' ? <MousePointer2 size={18} /> : activeTool === 'hand' ? <Hand size={18} /> : <MousePointer2 size={18} />}
                active={activeTool === 'move' || activeTool === 'hand'} 
                onClick={() => setToolDropdownOpen(!toolDropdownOpen)}
                tooltip="Инструменты"
                variant="solid" 
            />
             <button 
                onClick={() => setToolDropdownOpen(!toolDropdownOpen)}
                className="text-gray-400 hover:text-white p-0.5 rounded"
            >
                <ChevronDown size={12} />
            </button>
        </div>
       
        {toolDropdownOpen && (
            <div className="absolute bottom-full left-0 mb-3 py-1 bg-[#222] rounded-lg shadow-xl min-w-[180px] z-50 border border-white/10 overflow-hidden">
                <button
                    onClick={() => { setActiveTool('move'); setToolDropdownOpen(false); }}
                    className="w-full px-3 py-2 flex items-center gap-3 text-left text-sm hover:bg-white/10 transition-colors text-white"
                >
                    <span className="w-4 flex items-center justify-center">
                        {activeTool === 'move' && <Check size={14} className="text-white" />}
                    </span>
                    <MousePointer2 size={18} className="text-gray-400" />
                    <span className="flex-1">Перемещение</span>
                    <span className="text-gray-500 text-xs font-mono">V</span>
                </button>
                <button
                    onClick={() => { setActiveTool('hand'); setToolDropdownOpen(false); }}
                    className="w-full px-3 py-2 flex items-center gap-3 text-left text-sm hover:bg-white/10 transition-colors text-white"
                >
                    <span className="w-4 flex items-center justify-center">
                        {activeTool === 'hand' && <Check size={14} className="text-white" />}
                    </span>
                    <Hand size={18} className="text-gray-400" />
                    <span className="flex-1">Рука</span>
                    <span className="text-gray-500 text-xs font-mono">H</span>
                </button>
            </div>
        )}
    </div>

    <div className="w-px h-6 bg-white/20 mx-1" />

    {/* Standard Tools */}
    <ToolButton 
        icon={<TypeIcon size={18} />} 
        onClick={onAddText} 
        active={activeTool === 'text'}
        tooltip="Текст (T)" 
    />
    <div className="relative" ref={shapeDropdownRef}>
      <ToolButton
        icon={
          <span className="flex items-center gap-1">
            <Square size={18} />
            <ChevronDown size={14} className="opacity-70" />
          </span>
        }
        active={activeTool === 'shape'}
        onClick={() => setShapeDropdownOpen((v) => !v)}
        tooltip="Фигура"
      />
      {shapeDropdownOpen && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 py-1 bg-monolith-dark rounded-lg shadow-float min-w-[140px] z-50 border border-white/10">
          {SHAPE_OPTIONS.map(({ kind, icon, label }) => (
            <button
              key={kind}
              type="button"
              onClick={() => {
                onAddShape(kind);
                setShapeDropdownOpen(false);
              }}
              className="w-full px-4 py-2 flex items-center gap-2 text-left text-sm hover:bg-white/10 transition-colors first:rounded-t-lg last:rounded-b-lg"
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
    
    <div className="w-px h-6 bg-white/20 mx-1" />
    
    {selectedIds.length > 1 && (
      <>
        <ToolButton icon={<Group size={18} />} onClick={onGroup} tooltip="Сгруппировать" />
        <div className="w-px h-6 bg-white/20 mx-1" />
      </>
    )}
    {selectedIds.length === 1 && selectedElement?.groupId && (
      <>
        <ToolButton icon={<Ungroup size={18} />} onClick={onUngroup} tooltip="Разгруппировать" />
        <div className="w-px h-6 bg-white/20 mx-1" />
      </>
    )}
    {selectedIds.length === 1 && selectedElement?.type === 'image' && (
      <>
        <ToolButton
          icon={<Crop size={18} />}
          active={isCropping}
          onClick={() => onSetCropping(!isCropping)}
          tooltip="Обрезать"
        />
        <div className="w-px h-6 bg-white/20 mx-1" />
      </>
    )}
    {selectedIds.length > 0 && (
      <>
        <ToolButton
          icon={<ArrowUp size={18} />}
          onClick={() => onMoveLayer('front')}
          tooltip="На передний план"
        />
        <ToolButton
          icon={<ArrowDown size={18} />}
          onClick={() => onMoveLayer('back')}
          tooltip="На задний план"
        />
        <div className="w-px h-6 bg-white/20 mx-1" />
      </>
    )}
    <ToolButton
      icon={<Trash2 size={18} />}
      onClick={onDelete}
      disabled={selectedIds.length === 0}
      tooltip="Удалить"
    />
  </div>
  );
};
