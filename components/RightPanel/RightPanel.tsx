
import React, { useRef, useCallback, useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  Bold,
  Italic,
  CaseUpper,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Square,
  Group,
  MousePointer2,
  ImagePlus,
  RotateCcw,
} from 'lucide-react';
import type { CanvasElement } from '../../types';

export type RightPanelProps = {
  panelOpen: boolean;
  width: number;
  onWidthChange: (w: number) => void;
  minWidth?: number;
  maxWidth?: number;
  selectedElement: CanvasElement | null;
  primarySelectedId: string | null;
  selectedIds: string[];
  onUpdateElement: (id: string, updates: Partial<CanvasElement>, recordHistory?: boolean) => void;
  onReplaceImage?: (id: string, url: string) => void;
  onGroup: () => void;
};

// Helper to handle numeric inputs safely
const NumericInput = ({ 
  value, 
  onChange, 
  className,
  min,
  max,
  step 
}: { 
  value: number; 
  onChange: (val: number) => void; 
  className?: string;
  min?: number;
  max?: number;
  step?: number;
}) => {
  const [localValue, setLocalValue] = useState(String(value));

  useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    
    // Allow empty string or single minus sign while typing
    if (val === '' || val === '-') return;

    const num = parseFloat(val);
    if (!isNaN(num)) {
      onChange(num);
    }
  };

  const handleBlur = () => {
    let num = parseFloat(localValue);
    if (isNaN(num)) num = value; // Revert to original prop if invalid
    setLocalValue(String(num));
    onChange(num);
  };

  return (
    <input
      type="number"
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
      }}
      className={className}
      min={min}
      max={max}
      step={step}
    />
  );
};

export const RightPanel: React.FC<RightPanelProps> = ({
  panelOpen,
  width,
  onWidthChange,
  minWidth = 200,
  maxWidth = 480,
  selectedElement,
  primarySelectedId,
  selectedIds,
  onUpdateElement,
  onReplaceImage,
  onGroup,
}) => {
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const replaceImageInputRef = useRef<HTMLInputElement>(null);

  const handleReplaceImageClick = useCallback(() => {
    replaceImageInputRef.current?.click();
  }, []);

  const handleReplaceImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file?.type.startsWith('image/') && selectedElement && onReplaceImage) {
        onReplaceImage(selectedElement.id, URL.createObjectURL(file));
      }
      e.target.value = '';
    },
    [selectedElement, onReplaceImage]
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startXRef.current = e.clientX;
      startWidthRef.current = width;
      const onMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startXRef.current;
        const next = Math.min(maxWidth, Math.max(minWidth, startWidthRef.current - delta));
        onWidthChange(next);
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [width, minWidth, maxWidth, onWidthChange]
  );

  const effectiveWidth = panelOpen ? width : 0;

  return (
  <aside
    style={{
      width: effectiveWidth,
      minWidth: panelOpen ? minWidth : 0,
      maxWidth: panelOpen ? maxWidth : 0,
    }}
    className={`
      flex-shrink-0 fixed top-16 bottom-0 right-0 lg:relative lg:top-0 lg:bottom-0 z-40 bg-white border-l border-black/5 overflow-y-auto
      transition-[transform,width] duration-300 ease-in-out shadow-2xl lg:shadow-none
      ${panelOpen ? 'translate-x-0' : 'translate-x-full lg:overflow-hidden'}
    `}
  >
    {panelOpen && (
      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={handleResizeStart}
        className="absolute top-0 left-0 bottom-0 w-1.5 cursor-col-resize z-50 hover:bg-accent/20 active:bg-accent/30 transition-colors"
        style={{ touchAction: 'none' }}
      />
    )}
    {primarySelectedId && selectedElement ? (
      <div className="pb-12">
        <div className="p-6 border-b border-black/5 sticky top-0 bg-white/95 backdrop-blur z-10">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-gray-400">
              Расположение
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  onUpdateElement(selectedElement.id, { locked: !selectedElement.locked })
                }
                className="text-gray-400 hover:text-gray-600"
              >
                {selectedElement.locked ? <Lock size={14} /> : <Unlock size={14} />}
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6 border-b border-black/5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-gray-500 block mb-1">X</span>
              <NumericInput
                value={Math.round(selectedElement.x)}
                onChange={val => onUpdateElement(selectedElement.id, { x: val })}
                className="w-full font-mono text-[11px] bg-linen px-2 py-1.5 rounded border-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <span className="text-xs text-gray-500 block mb-1">Y</span>
              <NumericInput
                value={Math.round(selectedElement.y)}
                onChange={val => onUpdateElement(selectedElement.id, { y: val })}
                className="w-full font-mono text-[11px] bg-linen px-2 py-1.5 rounded border-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <span className="text-xs text-gray-500 block mb-1">Ш</span>
              <NumericInput
                value={Math.round(selectedElement.width)}
                onChange={val => onUpdateElement(selectedElement.id, { width: val })}
                className="w-full font-mono text-[11px] bg-linen px-2 py-1.5 rounded border-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <span className="text-xs text-gray-500 block mb-1">В</span>
              <NumericInput
                value={Math.round(selectedElement.height)}
                onChange={val => onUpdateElement(selectedElement.id, { height: val })}
                className="w-full font-mono text-[11px] bg-linen px-2 py-1.5 rounded border-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <div>
            <span className="text-xs text-gray-500 block mb-1">Поворот</span>
            <input
              type="range"
              min="0"
              max="360"
              value={selectedElement.rotation}
              onChange={e =>
                onUpdateElement(selectedElement.id, { rotation: Number(e.target.value) })
              }
              className="w-full accent-monolith-black h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="text-right mt-1 font-mono text-[10px] text-gray-500">
              {selectedElement.rotation}°
            </div>
          </div>

          {selectedElement.type === 'image' && (
            <div className="bg-linen p-3 rounded">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase">
                  Заливка изображением
                </span>
                {onReplaceImage && (
                  <>
                    <input
                      ref={replaceImageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleReplaceImageChange}
                    />
                    <button
                      type="button"
                      onClick={handleReplaceImageClick}
                      className="text-[10px] font-semibold text-accent hover:underline flex items-center gap-1"
                    >
                      <ImagePlus size={12} /> Заменить
                    </button>
                  </>
                )}
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] text-gray-500 block">Масштаб</span>
                  <input
                    type="range"
                    min="0.1"
                    max="5"
                    step="0.1"
                    value={selectedElement.imageScale ?? 1}
                    onChange={e =>
                      onUpdateElement(selectedElement.id, {
                        imageScale: Number(e.target.value),
                      })
                    }
                    className="w-full accent-monolith-black h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <NumericInput
                    value={Math.round(selectedElement.imageX ?? 0)}
                    onChange={val => onUpdateElement(selectedElement.id, { imageX: val })}
                    className="w-full font-mono text-[10px] p-1 rounded"
                  />
                  <NumericInput
                    value={Math.round(selectedElement.imageY ?? 0)}
                    onChange={val => onUpdateElement(selectedElement.id, { imageY: val })}
                    className="w-full font-mono text-[10px] p-1 rounded"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateElement(selectedElement.id, {
                      imageScale: 1,
                      imageX: 0,
                      imageY: 0,
                    })
                  }
                  className="w-full mt-2 py-1.5 text-[10px] font-semibold text-gray-500 hover:text-black flex items-center justify-center gap-1"
                >
                  <RotateCcw size={12} /> Сбросить кроп
                </button>
              </div>
            </div>
          )}

          <div>
            <span className="text-xs text-gray-500 block mb-1">Прозрачность</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={selectedElement.opacity}
              onChange={e =>
                onUpdateElement(selectedElement.id, { opacity: Number(e.target.value) })
              }
              className="w-full accent-monolith-black h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="text-right mt-1 font-mono text-[10px] text-gray-500">
              {Math.round(selectedElement.opacity * 100)}%
            </div>
          </div>
        </div>

        {selectedElement.type === 'text' && (
          <div className="p-6 border-b border-black/5">
            <h3 className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-gray-400 mb-4">
              Типографика
            </h3>
            <div className="space-y-4">
              <div>
                <span className="text-xs text-gray-500 block mb-1">Шрифт</span>
                <select
                  value={selectedElement.fontFamily}
                  onChange={e =>
                    onUpdateElement(selectedElement.id, { fontFamily: e.target.value })
                  }
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
                  onClick={() =>
                    onUpdateElement(selectedElement.id, {
                      fontWeight: selectedElement.fontWeight === 700 ? 400 : 700,
                    })
                  }
                  className={`p-1.5 rounded flex-1 flex justify-center ${
                    selectedElement.fontWeight === 700
                      ? 'bg-monolith-black text-white'
                      : 'bg-linen text-black'
                  }`}
                >
                  <Bold size={14} />
                </button>
                <button
                  onClick={() =>
                    onUpdateElement(selectedElement.id, {
                      italic: !selectedElement.italic,
                    })
                  }
                  className={`p-1.5 rounded flex-1 flex justify-center ${
                    selectedElement.italic ? 'bg-monolith-black text-white' : 'bg-linen text-black'
                  }`}
                >
                  <Italic size={14} />
                </button>
                <button
                  onClick={() =>
                    onUpdateElement(selectedElement.id, {
                      uppercase: !selectedElement.uppercase,
                    })
                  }
                  className={`p-1.5 rounded flex-1 flex justify-center ${
                    selectedElement.uppercase
                      ? 'bg-monolith-black text-white'
                      : 'bg-linen text-black'
                  }`}
                >
                  <CaseUpper size={14} />
                </button>
              </div>
              <div className="flex gap-1 bg-linen p-1 rounded">
                {(['left', 'center', 'right', 'justify'] as const).map(align => (
                  <button
                    key={align}
                    onClick={() =>
                      onUpdateElement(selectedElement.id, { textAlign: align })
                    }
                    className={`p-1.5 rounded flex-1 flex justify-center transition-colors ${
                      selectedElement.textAlign === align ? 'bg-white shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    {align === 'left' && <AlignLeft size={14} />}
                    {align === 'center' && <AlignCenter size={14} />}
                    {align === 'right' && <AlignRight size={14} />}
                    {align === 'justify' && <AlignJustify size={14} />}
                  </button>
                ))}
              </div>
              <div>
                <span className="text-xs text-gray-500 block mb-1">Размер</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="8"
                    max="120"
                    value={selectedElement.fontSize ?? 16}
                    onChange={e =>
                      onUpdateElement(selectedElement.id, {
                        fontSize: Number(e.target.value),
                      })
                    }
                    className="flex-1 accent-monolith-black h-1 bg-gray-200 rounded-lg appearance-none"
                  />
                  <span className="font-mono text-[11px] w-8 text-right">
                    {selectedElement.fontSize}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-xs text-gray-500 block mb-1">Межбуквенное</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="-0.1"
                    max="0.5"
                    step="0.01"
                    value={selectedElement.letterSpacing ?? 0}
                    onChange={e =>
                      onUpdateElement(selectedElement.id, {
                        letterSpacing: Number(e.target.value),
                      })
                    }
                    className="flex-1 accent-monolith-black h-1 bg-gray-200 rounded-lg appearance-none"
                  />
                  <span className="font-mono text-[11px] w-8 text-right">
                    {selectedElement.letterSpacing}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-xs text-gray-500 block mb-1">Цвет</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={selectedElement.color}
                    onChange={e =>
                      onUpdateElement(selectedElement.id, { color: e.target.value })
                    }
                    className="w-full h-8 rounded cursor-pointer border-none p-0"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="p-6 border-b border-black/5">
          <h3 className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-gray-400 mb-4">
            Вид
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Скругление</span>
              <NumericInput
                value={selectedElement.borderRadius}
                onChange={val => onUpdateElement(selectedElement.id, { borderRadius: val })}
                className="w-16 font-mono text-[11px] bg-linen px-2 py-1 rounded border-none text-right"
              />
            </div>
            {selectedElement.type === 'shape' && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Заливка</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={selectedElement.backgroundColor}
                    onChange={e =>
                      onUpdateElement(selectedElement.id, {
                        backgroundColor: e.target.value,
                      })
                    }
                    className="w-5 h-5 rounded border-none p-0 bg-transparent cursor-pointer"
                  />
                  <span className="text-[10px] font-mono uppercase">
                    {selectedElement.backgroundColor}
                  </span>
                </div>
              </div>
            )}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-500">Обводка</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={selectedElement.borderColor}
                    onChange={e =>
                      onUpdateElement(selectedElement.id, { borderColor: e.target.value })
                    }
                    className="w-4 h-4 rounded-full border-none p-0 bg-transparent cursor-pointer"
                  />
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                value={selectedElement.borderWidth}
                onChange={e =>
                  onUpdateElement(selectedElement.id, {
                    borderWidth: Number(e.target.value),
                  })
                }
                className="w-full accent-monolith-black h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-right mt-1 font-mono text-[10px] text-gray-500">
                {selectedElement.borderWidth}px
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-b border-black/5">
          <h3 className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-gray-400 mb-4">
            Тень
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-500">Размытие</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={selectedElement.shadowBlur}
                onChange={e =>
                  onUpdateElement(selectedElement.id, {
                    shadowBlur: Number(e.target.value),
                  })
                }
                className="w-full accent-monolith-black h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-gray-500 block mb-1">Смещение X</span>
                <NumericInput
                  value={selectedElement.shadowOffsetX}
                  onChange={val => onUpdateElement(selectedElement.id, { shadowOffsetX: val })}
                  className="w-full font-mono text-[11px] bg-linen px-2 py-1 rounded border-none"
                />
              </div>
              <div>
                <span className="text-xs text-gray-500 block mb-1">Смещение Y</span>
                <NumericInput
                  value={selectedElement.shadowOffsetY}
                  onChange={val => onUpdateElement(selectedElement.id, { shadowOffsetY: val })}
                  className="w-full font-mono text-[11px] bg-linen px-2 py-1 rounded border-none"
                />
              </div>
            </div>
          </div>
        </div>

      </div>
    ) : selectedIds.length > 1 ? (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
        <div className="relative mb-4">
          <Square size={24} className="absolute -top-2 -left-2 text-gray-300" />
          <Square size={24} className="text-gray-400" />
        </div>
        <p className="text-xs font-mono mb-2">ОБЪЕКТОВ ВЫБРАНО: {selectedIds.length}</p>
        <button
          onClick={onGroup}
          className="bg-monolith-black text-white px-4 py-2 rounded text-xs font-bold flex items-center gap-2 hover:bg-black transition-colors"
        >
          <Group size={14} /> Сгруппировать
        </button>
      </div>
    ) : (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
        <MousePointer2 size={32} strokeWidth={1} className="mb-4 opacity-20" />
        <p className="text-xs font-mono">ВЫБЕРИТЕ ЭЛЕМЕНТ ДЛЯ РЕДАКТИРОВАНИЯ</p>
        <div className="mt-8 block lg:hidden">
          <p className="text-[10px] text-gray-500 mb-2">ПОДСКАЗКА</p>
          <p className="text-[10px] text-gray-400">Закройте панель, чтобы видеть холст.</p>
        </div>
      </div>
    )}
  </aside>
  );
};
