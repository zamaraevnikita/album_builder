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
  panX: number;
  panY: number;
  onResetZoom: () => void;
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
  panX,
  panY,
  onResetZoom,
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
  const gridPatternId = `grid-${React.useId().replace(/:/g, '')}`;
  const canvasWidth =
    viewMode === 'spread' ? canvasSpreadWidth : canvasSingleWidth;
  const canvasHeight = canvasSpreadHeight;

  const renderElement = (el: CanvasElement, offsetX: number) => {
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
          left: Math.round(el.x + offsetX),
          top: Math.round(el.y),
          width: el.width,
          height: el.height,
          transform: `translateZ(0) rotate(${el.rotation}deg)`,
          opacity: el.opacity,
          zIndex: isSelected ? 50 : 1,
          cursor: isEditing ? 'text' : el.locked ? 'default' : isBeingCropped ? 'move' : 'move',
          borderRadius: `${el.borderRadius}px`,
          border: el.borderWidth > 0 ? `${el.borderWidth}px solid ${el.borderColor}` : 'none',
          boxShadow: el.shadowBlur > 0 ? `${el.shadowOffsetX}px ${el.shadowOffsetY}px ${el.shadowBlur}px ${el.shadowColor}` : 'none',
          overflow: 'hidden',
          backfaceVisibility: 'hidden',
        }}
        className={`group select-none ${isSelected ? 'ring-1 ring-accent' : 'hover:ring-1 hover:ring-gray-200'}`}
      >
        {isSelected && !el.locked && selectedIds.length === 1 && !isBeingCropped && (
          <>
            <ResizeHandle cursor="nw-resize" position="-top-1.5 -left-1.5" scale={scale} onMouseDown={e => onMouseDownElement(e, el.id, 'tl')} />
            <ResizeHandle cursor="ne-resize" position="-top-1.5 -right-1.5" scale={scale} onMouseDown={e => onMouseDownElement(e, el.id, 'tr')} />
            <ResizeHandle cursor="sw-resize" position="-bottom-1.5 -left-1.5" scale={scale} onMouseDown={e => onMouseDownElement(e, el.id, 'bl')} />
            <ResizeHandle cursor="se-resize" position="-bottom-1.5 -right-1.5" scale={scale} onMouseDown={e => onMouseDownElement(e, el.id, 'br')} />
          </>
        )}
        {el.type === 'image' && (
          <div className="w-full h-full relative pointer-events-none">
            <img src={el.content} alt={el.name} className="w-full h-full object-cover" style={{ transform: `scale(${el.imageScale ?? 1}) translate(${el.imageX ?? 0}px, ${el.imageY ?? 0}px)`, transformOrigin: 'center center' }} />
          </div>
        )}
        {el.type === 'text' && (
          <div style={{ width: '100%', height: '100%', fontSize: `${el.fontSize}px`, fontFamily: el.fontFamily, fontWeight: el.fontWeight, color: el.color, letterSpacing: `${el.letterSpacing}em`, textAlign: el.textAlign, lineHeight: el.lineHeight, fontStyle: el.italic ? 'italic' : 'normal', textTransform: el.uppercase ? 'uppercase' : 'none', display: 'flex', alignItems: 'flex-start' }}>
            {isEditing ? (
              <textarea value={el.content} autoFocus onChange={e => updateElement(el.id, { content: e.target.value })} onBlur={() => setEditingId(null)} style={{ width: '100%', height: '100%', background: 'transparent', resize: 'none', border: 'none', outline: 'none', padding: 0, margin: 0, font: 'inherit', color: 'inherit', textAlign: 'inherit' }} className="cursor-text pointer-events-auto" onMouseDown={e => e.stopPropagation()} />
            ) : (
              <div className="w-full h-full whitespace-pre-wrap">{el.content}</div>
            )}
          </div>
        )}
        {el.type === 'shape' && (
          <div style={{ backgroundColor: el.backgroundColor, borderRadius: el.shapeKind === 'circle' || el.shapeKind === 'ellipse' ? '50%' : `${el.borderRadius}px`, clipPath: el.shapeKind === 'triangle' ? 'polygon(50% 0%, 100% 100%, 0% 100%)' : undefined }} className="w-full h-full" />
        )}
      </div>
    );
  };

  return (
    <main
      className="flex-1 bg-linen relative overflow-hidden flex flex-col p-0 perspective-[2000px] touch-none min-h-0"
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
            onClick={onResetZoom}
            className="text-[10px] font-mono hover:bg-gray-100 p-1 rounded"
          >
            {Math.round(scale * 100)}%
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 w-full relative">
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            marginLeft: -(canvasWidth * scale) / 2,
            marginTop: -(canvasHeight * scale) / 2,
          }}
        >
          {/* Один слот под размер — центрирование по нему */}
          <div
            style={{
              position: 'relative',
              width: canvasWidth * scale,
              height: canvasHeight * scale,
            }}
          >
            {/* Рамка и transform — один элемент, не могут разъехаться */}
            <div
              ref={canvasRef}
              className="absolute top-0 left-0 shadow-soft ring-1 ring-black/5 overflow-hidden bg-white will-change-transform"
              style={{
                width: canvasWidth,
                height: canvasHeight,
                transformOrigin: '0 0',
                transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
              }}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onMouseDown={e => {
                if (e.target === e.currentTarget) onSelectBackground();
              }}
            >
              {viewMode === 'spread' ? (
                /* One canvas for full spread */
                <div className="relative" style={{ width: canvasSpreadWidth, height: canvasSpreadHeight }}>
                  {showGrid && (
                    <svg className="absolute top-0 left-0 pointer-events-none z-0" width={canvasSpreadWidth} height={canvasSpreadHeight} style={{ opacity: 0.05 }} xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id={`${gridPatternId}-spread`} width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
                          <path d={`M ${GRID_SIZE} 0 V ${GRID_SIZE} M 0 ${GRID_SIZE} H ${GRID_SIZE}`} fill="none" stroke="black" strokeWidth="1" />
                        </pattern>
                      </defs>
                      <rect width={canvasSpreadWidth} height={canvasSpreadHeight} fill={`url(#${gridPatternId}-spread)`} />
                    </svg>
                  )}
                  <div
                    className="absolute top-0 bottom-0 z-20 pointer-events-none"
                    style={{
                      left: Math.round(canvasSingleWidth),
                      width: 1,
                      backgroundColor: 'rgba(0,0,0,0.2)',
                      transform: 'translateX(-0.5px)',
                    }}
                  />
                  {currentElements.map(el => renderElement(el, 0))}
                </div>
              ) : (
                /* Single page - show left or right */
                <div className="relative" style={{ width: canvasSingleWidth, height: canvasSpreadHeight }}>
                  {showGrid && (
                    <svg className="absolute top-0 left-0 pointer-events-none z-0" width={canvasSingleWidth} height={canvasSpreadHeight} style={{ opacity: 0.05 }} xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id={`${gridPatternId}-single`} width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
                          <path d={`M ${GRID_SIZE} 0 V ${GRID_SIZE} M 0 ${GRID_SIZE} H ${GRID_SIZE}`} fill="none" stroke="black" strokeWidth="1" />
                        </pattern>
                      </defs>
                      <rect width={canvasSingleWidth} height={canvasSpreadHeight} fill={`url(#${gridPatternId}-single)`} />
                    </svg>
                  )}
                  {activeSide === 'left'
                    ? currentElements.filter(el => el.x < canvasSingleWidth).map(el => renderElement(el, 0))
                    : currentElements.filter(el => el.x >= canvasSingleWidth).map(el => renderElement(el, -canvasSingleWidth))}
                </div>
              )}
            </div>
          </div>
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
