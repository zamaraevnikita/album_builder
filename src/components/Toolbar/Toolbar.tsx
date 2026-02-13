import React, { useState, useRef, useEffect } from 'react';
import {
  MousePointer2,
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
  Copy,
  ClipboardCopy,
  ClipboardPaste,
} from 'lucide-react';
import { ToolButton } from '../ui/ToolButton';
import type { CanvasElement } from '../../types';
import type { ShapeKind } from '../../types';

const SHAPE_OPTIONS: { kind: ShapeKind; icon: React.ReactNode; label: string }[] = [
  { kind: 'rectangle', icon: <Square size={18} />, label: 'Rectangle' },
  { kind: 'circle', icon: <Circle size={18} />, label: 'Circle' },
  { kind: 'ellipse', icon: <CircleDot size={18} />, label: 'Ellipse' },
  { kind: 'triangle', icon: <Triangle size={18} />, label: 'Triangle' },
];

export type ToolbarProps = {
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
  onDuplicate: () => void;
  onCopy: () => void;
  onPaste: () => void;
  canPaste: boolean;
  onDelete: () => void;
};

export const Toolbar: React.FC<ToolbarProps> = ({
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
  const shapeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shapeDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (shapeDropdownRef.current && !shapeDropdownRef.current.contains(e.target as Node)) {
        setShapeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [shapeDropdownOpen]);

  return (
  <div className="absolute bottom-6 lg:bottom-10 left-1/2 -translate-x-1/2 bg-monolith-black text-white rounded-full px-4 py-2 flex items-center gap-2 shadow-float z-30 scale-90 lg:scale-100 origin-bottom">
    <ToolButton
      icon={<MousePointer2 size={18} />}
      active={selectedIds.length === 0}
      onClick={onSelectNone}
      tooltip="Select"
    />
    <div className="w-px h-6 bg-white/20 mx-1" />
    <ToolButton icon={<TypeIcon size={18} />} onClick={onAddText} tooltip="Add Text" />
    <div className="relative" ref={shapeDropdownRef}>
      <ToolButton
        icon={
          <span className="flex items-center gap-1">
            <Square size={18} />
            <ChevronDown size={14} className="opacity-70" />
          </span>
        }
        onClick={() => setShapeDropdownOpen((v) => !v)}
        tooltip="Add Shape"
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
    <ToolButton
      icon={<ClipboardCopy size={18} />}
      onClick={onCopy}
      disabled={selectedIds.length === 0}
      tooltip="Copy (Ctrl+C)"
    />
    <ToolButton
      icon={<ClipboardPaste size={18} />}
      onClick={onPaste}
      disabled={!canPaste}
      tooltip="Paste (Ctrl+V)"
    />
    <div className="w-px h-6 bg-white/20 mx-1" />
    {selectedIds.length > 1 && (
      <>
        <ToolButton icon={<Group size={18} />} onClick={onGroup} tooltip="Group" />
        <div className="w-px h-6 bg-white/20 mx-1" />
      </>
    )}
    {selectedIds.length === 1 && selectedElement?.groupId && (
      <>
        <ToolButton icon={<Ungroup size={18} />} onClick={onUngroup} tooltip="Ungroup" />
        <div className="w-px h-6 bg-white/20 mx-1" />
      </>
    )}
    {selectedIds.length === 1 && selectedElement?.type === 'image' && (
      <>
        <ToolButton
          icon={<Crop size={18} />}
          active={isCropping}
          onClick={() => onSetCropping(!isCropping)}
          tooltip="Crop Image"
        />
        <div className="w-px h-6 bg-white/20 mx-1" />
      </>
    )}
    {selectedIds.length > 0 && (
      <>
        <ToolButton
          icon={<ArrowUp size={18} />}
          onClick={() => onMoveLayer('front')}
          tooltip="Bring to Front"
        />
        <ToolButton
          icon={<ArrowDown size={18} />}
          onClick={() => onMoveLayer('back')}
          tooltip="Send to Back"
        />
        <div className="w-px h-6 bg-white/20 mx-1" />
        <ToolButton
          icon={<Copy size={18} />}
          onClick={onDuplicate}
          tooltip="Duplicate (Ctrl+D)"
        />
        <div className="w-px h-6 bg-white/20 mx-1" />
      </>
    )}
    <ToolButton
      icon={<Trash2 size={18} />}
      onClick={onDelete}
      disabled={selectedIds.length === 0}
      tooltip="Delete"
    />
  </div>
  );
};
