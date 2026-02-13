import React from 'react';
import { Grid as GridIcon, Magnet } from 'lucide-react';
import { ToolButton } from '../ui/ToolButton';
import { ResizeHandle } from '../ui/ResizeHandle';
import { Toolbar } from '../Toolbar/Toolbar';
import type { CanvasElement } from '../../types';
import type { ResizeHandle as ResizeHandleType } from '../../types';
import { GRID_SIZE } from '../../constants';

export type CanvasProps = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  viewMode: 'spread' | 'single';
  activeSide: 'left' | 'right';
  scale: number;
  zoomLevel: number;
  setZoomLevel: (v: number) => void;
  showGrid: boolean;
  setShowGrid: (v: boolean) => void;
  snapToGrid: boolean;
  setSnapToGrid: (v: boolean) => void;
  canvasSpreadWidth: number;
  canvasSpreadHeight: number;
  canvasSingleWidth: number;
  currentElements: CanvasElement[];
  selectedIds: string[];
  selectedElement: CanvasElement | null;
  editingId: string | null;
  isCropping: boolean;
  onSelectBackground: () => void;
  onMouseDownElement: (e: React.MouseEvent, id: string, handle?: ResizeHandleType) => void;
  onDoubleClickElement: (id: string) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onWheel: (e: React.WheelEvent) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>, recordHistory?: boolean) => void;
  setEditingId: (id: string | null) => void;
  onAddText: () => void;
  onAddShape: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onMoveLayer: (direction: 'front' | 'back') => void;
  onDuplicate: () => void;
  onCopy: () => void;
  onPaste: () => void;
  canPaste: boolean;
  onDelete: () => void;
  onSelectNone: () => void;
  onSetCropping: (v: boolean) => void;
};

export const Canvas: React.FC<CanvasProps> = ({
  containerRef,
  canvasRef,
  viewMode,
  activeSide,
  scale,
  zoomLevel,
  setZoomLevel,
  showGrid,
  setShowGrid,
  snapToGrid,
  setSnapToGrid,
  canvasSpreadWidth,
  canvasSpreadHeight,
  canvasSingleWidth,
  currentElements,
  selectedIds,
  selectedElement,
  editingId,
  isCropping,
  onSelectBackground,
  onMouseDownElement,
  onDoubleClickElement,
  onDrop,
  onDragOver,
  onWheel,
  updateElement,
  setEditingId,
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
  onSelectNone,
  onSetCropping,
}) => {
  const canvasWidth =
    viewMode === 'spread' ? canvasSpreadWidth : canvasSingleWidth;
  const canvasHeight = canvasSpreadHeight;

  return (
    <main
      className="flex-1 bg-linen relative overflow-hidden flex items-center justify-center p-0 perspective-[2000px] touch-none"
      ref={containerRef}
      onWheel={onWheel}
      onMouseDown={e => {
        if (e.target === e.currentTarget) onSelectBackground();
      }}
    >
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
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <div className="flex items-center bg-white rounded-lg shadow-sm px-2 h-10 gap-2">
          <span className="text-[10px] font-mono text-gray-500">ZOOM</span>
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.1"
            value={zoomLevel}
            onChange={e => setZoomLevel(Number(e.target.value))}
            className="w-20 accent-monolith-black h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <button
            onClick={() => setZoomLevel(1)}
            className="text-[10px] font-mono hover:bg-gray-100 p-1 rounded"
          >
            {Math.round(scale * 100)}%
          </button>
        </div>
      </div>

      <div
        style={{
          width: canvasWidth * scale,
          height: canvasHeight * scale,
        }}
        className="relative shadow-soft ring-1 ring-black/5 overflow-hidden bg-white transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
      >
        <div
          ref={canvasRef}
          className="absolute top-0 left-0 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
          style={{
            width: canvasSpreadWidth,
            height: canvasSpreadHeight,
            transformOrigin: '0 0',
            transform:
              viewMode === 'single' && activeSide === 'right'
                ? `scale(${scale}) translateX(-${canvasSingleWidth}px)`
                : `scale(${scale})`,
          }}
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[2px] z-20 bg-gradient-to-r from-black/5 via-black/20 to-black/5 pointer-events-none" />

          {showGrid && (
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.05] z-0"
              style={{
                backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
                backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
                backgroundPosition: '0 0',
                transform: 'translateZ(0)',
              }}
            />
          )}

          {currentElements.map(el => {
            const isSelected = selectedIds.includes(el.id);
            const isEditing = editingId === el.id;
            const isBeingCropped =
              isCropping &&
              selectedIds.length === 1 &&
              selectedIds[0] === el.id;

            return (
              <div
                key={el.id}
                onMouseDown={e => onMouseDownElement(e, el.id)}
                onDoubleClick={e => {
                  e.stopPropagation();
                  onDoubleClickElement(el.id);
                }}
                style={{
                  position: 'absolute',
                  left: Math.round(el.x),
                  top: Math.round(el.y),
                  width: el.width,
                  height: el.height,
                  transform: `translateZ(0) rotate(${el.rotation}deg)`,
                  opacity: el.opacity,
                  zIndex: isSelected ? 50 : 1,
                  cursor: isEditing
                    ? 'text'
                    : el.locked
                      ? 'default'
                      : isBeingCropped
                        ? 'move'
                        : 'move',
                  borderRadius: `${el.borderRadius}px`,
                  border:
                    el.borderWidth > 0
                      ? `${el.borderWidth}px solid ${el.borderColor}`
                      : 'none',
                  boxShadow:
                    el.shadowBlur > 0
                      ? `${el.shadowOffsetX}px ${el.shadowOffsetY}px ${el.shadowBlur}px ${el.shadowColor}`
                      : 'none',
                  overflow: 'hidden',
                  backfaceVisibility: 'hidden',
                }}
                className={`group select-none ${isSelected ? 'ring-1 ring-accent' : 'hover:ring-1 hover:ring-gray-200'}`}
              >
                {isSelected &&
                  !el.locked &&
                  selectedIds.length === 1 &&
                  !isBeingCropped && (
                    <>
                      <ResizeHandle
                        cursor="nw-resize"
                        position="-top-1.5 -left-1.5"
                        scale={scale}
                        onMouseDown={e => onMouseDownElement(e, el.id, 'tl')}
                      />
                      <ResizeHandle
                        cursor="ne-resize"
                        position="-top-1.5 -right-1.5"
                        scale={scale}
                        onMouseDown={e => onMouseDownElement(e, el.id, 'tr')}
                      />
                      <ResizeHandle
                        cursor="sw-resize"
                        position="-bottom-1.5 -left-1.5"
                        scale={scale}
                        onMouseDown={e => onMouseDownElement(e, el.id, 'bl')}
                      />
                      <ResizeHandle
                        cursor="se-resize"
                        position="-bottom-1.5 -right-1.5"
                        scale={scale}
                        onMouseDown={e => onMouseDownElement(e, el.id, 'br')}
                      />
                    </>
                  )}

                {el.type === 'image' && (
                  <div className="w-full h-full relative pointer-events-none">
                    <img
                      src={el.content}
                      alt={el.name}
                      className="w-full h-full object-cover"
                      style={{
                        transform: `scale(${el.imageScale ?? 1}) translate(${el.imageX ?? 0}px, ${el.imageY ?? 0}px)`,
                        transformOrigin: 'center center',
                      }}
                    />
                  </div>
                )}
                {el.type === 'text' && (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
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
                      alignItems: 'flex-start',
                    }}
                  >
                    {isEditing ? (
                      <textarea
                        value={el.content}
                        autoFocus
                        onChange={e =>
                          updateElement(el.id, { content: e.target.value })
                        }
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
                          textAlign: 'inherit',
                        }}
                        className="cursor-text pointer-events-auto"
                        onMouseDown={e => e.stopPropagation()}
                      />
                    ) : (
                      <div className="w-full h-full whitespace-pre-wrap">
                        {el.content}
                      </div>
                    )}
                  </div>
                )}
                {el.type === 'shape' && (
                  <div
                    style={{
                      backgroundColor: el.backgroundColor,
                      borderRadius:
                        el.shapeKind === 'circle' || el.shapeKind === 'ellipse'
                          ? '50%'
                          : `${el.borderRadius}px`,
                      clipPath:
                        el.shapeKind === 'triangle'
                          ? 'polygon(50% 0%, 100% 100%, 0% 100%)'
                          : undefined,
                    }}
                    className="w-full h-full"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Toolbar
        selectedIds={selectedIds}
        selectedElement={selectedElement}
        isCropping={isCropping}
        onSetCropping={onSetCropping}
        onSelectNone={onSelectNone}
        onAddText={onAddText}
        onAddShape={onAddShape}
        onGroup={onGroup}
        onUngroup={onUngroup}
        onMoveLayer={onMoveLayer}
        onDuplicate={onDuplicate}
        onCopy={onCopy}
        onPaste={onPaste}
        canPaste={canPaste}
        onDelete={onDelete}
      />
    </main>
  );
};
