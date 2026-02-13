
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Type, Image as ImageIcon, Circle, Cloud, Trash2, Lock, LayoutTemplate } from 'lucide-react';
import type { CanvasElement } from '../../types';
import type { TextTemplate } from '../../types';
import type { LeftPanelTab } from '../../types';

export type LeftPanelProps = {
  panelOpen: boolean;
  width: number;
  onWidthChange: (w: number) => void;
  minWidth?: number;
  maxWidth?: number;
  activeTab: LeftPanelTab;
  setActiveTab: (tab: LeftPanelTab) => void;
  currentElements: CanvasElement[];
  selectedIds: string[];
  primarySelectedId: string | null;
  onSelectLayer: (id: string, multi: boolean) => void;
  onDeleteLayer: (id: string) => void;
  onRenameLayer: (id: string, name: string) => void;
  onDragStartAsset: (e: React.DragEvent, payload: string, type: 'image' | 'template') => void;
  onImageUpload: (url: string) => void;
  onRemoveUploadedAsset?: (url: string) => void;
  mockAssets: string[];
  uploadedAssets: string[];
  textTemplates: TextTemplate[];
};

export const LeftPanel: React.FC<LeftPanelProps> = ({
  panelOpen,
  width,
  onWidthChange,
  minWidth = 200,
  maxWidth = 480,
  activeTab,
  setActiveTab,
  currentElements,
  selectedIds,
  primarySelectedId,
  onSelectLayer,
  onDeleteLayer,
  onRenameLayer,
  onDragStartAsset,
  onImageUpload,
  onRemoveUploadedAsset,
  mockAssets,
  uploadedAssets = [],
  textTemplates,
}) => {
  const layersListRef = useRef<HTMLUListElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingLayerName, setEditingLayerName] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingLayerId) renameInputRef.current?.focus();
  }, [editingLayerId]);

  const finishRename = useCallback(
    (id: string) => {
      const trimmed = editingLayerName.trim();
      if (trimmed) onRenameLayer(id, trimmed);
      setEditingLayerId(null);
    },
    [editingLayerName, onRenameLayer]
  );

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        onImageUpload(url);
      }
      e.target.value = '';
    },
    [onImageUpload]
  );

  useEffect(() => {
    if (primarySelectedId && layersListRef.current) {
      const item = layersListRef.current.querySelector(`[data-layer-id="${primarySelectedId}"]`);
      if (item) item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [primarySelectedId]);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startXRef.current = e.clientX;
      startWidthRef.current = width;
      const onMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startXRef.current;
        const next = Math.min(maxWidth, Math.max(minWidth, startWidthRef.current + delta));
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
        flex-shrink-0 fixed top-16 bottom-0 left-0 lg:relative lg:top-0 lg:bottom-0 z-40 bg-white border-r border-black/5 flex flex-col 
        transition-[transform,width] duration-300 ease-in-out shadow-2xl lg:shadow-none
        ${panelOpen ? 'translate-x-0 overflow-hidden' : '-translate-x-full lg:overflow-hidden'}
      `}
    >
      {panelOpen && (
        <>
          <div
            role="separator"
            aria-orientation="vertical"
            onMouseDown={handleResizeStart}
            className="absolute top-0 right-0 bottom-0 w-1.5 cursor-col-resize z-50 hover:bg-accent/20 active:bg-accent/30 transition-colors"
            style={{ touchAction: 'none' }}
          />
          <div className="flex border-b border-black/5">
            <button
              onClick={() => setActiveTab('layers')}
              className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider ${
                activeTab === 'layers' ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Слои
            </button>
            <button
              onClick={() => setActiveTab('assets')}
              className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider ${
                activeTab === 'assets' ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Фото
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider ${
                activeTab === 'templates' ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Макеты
            </button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 bg-gray-50/30">
        {activeTab === 'layers' && (
          <div className="p-2">
            <ul className="space-y-1" ref={layersListRef}>
              {currentElements.slice().reverse().map(layer => (
                <li
                  key={layer.id}
                  data-layer-id={layer.id}
                  onClick={e => onSelectLayer(layer.id, e.shiftKey)}
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
                  {editingLayerId === layer.id ? (
                    <input
                      ref={renameInputRef}
                      type="text"
                      value={editingLayerName}
                      onChange={e => setEditingLayerName(e.target.value)}
                      onBlur={() => finishRename(layer.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') finishRename(layer.id);
                        e.stopPropagation();
                      }}
                      onClick={e => e.stopPropagation()}
                      className="flex-1 min-w-0 bg-transparent border-none outline-none ring-0 text-[13px] font-inherit text-inherit px-0"
                    />
                  ) : (
                    <span
                      className="truncate flex-1"
                      onDoubleClick={e => {
                        e.stopPropagation();
                        setEditingLayerId(layer.id);
                        setEditingLayerName(layer.name);
                      }}
                    >
                      {layer.name}
                    </span>
                  )}
                  {layer.locked && <Lock size={12} className="opacity-30 ml-2" />}
                  {layer.groupId && (
                    <span className="ml-2 text-[9px] bg-gray-200 px-1 rounded text-gray-500">ГР</span>
                  )}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onSelectLayer(layer.id, false);
                      onDeleteLayer(layer.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity absolute right-2"
                  >
                    <Trash2 size={12} />
                  </button>
                </li>
              ))}
              {currentElements.length === 0 && (
                <div className="text-xs text-gray-300 text-center py-8">На этой странице нет слоев</div>
              )}
            </ul>
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="p-4 grid grid-cols-2 gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="col-span-2 pb-2">
              <button
                type="button"
                onClick={handleUploadClick}
                className="w-full py-2 border border-dashed border-gray-300 rounded text-xs text-gray-500 hover:border-gray-400 hover:text-black transition-colors flex items-center justify-center gap-2"
              >
                <Cloud size={14} /> Загрузить фото
              </button>
            </div>
            {mockAssets.map((src, i) => (
              <div
                key={`mock-${i}`}
                draggable
                onDragStart={e => onDragStartAsset(e, src, 'image')}
                className="aspect-square bg-white rounded overflow-hidden cursor-grab active:cursor-grabbing hover:opacity-80 transition-all group relative border border-gray-200 shadow-sm"
              >
                <img src={src} alt="asset" className="w-full h-full object-cover" />
              </div>
            ))}
            {uploadedAssets.map((src, i) => (
              <div
                key={`uploaded-${i}`}
                draggable
                onDragStart={e => onDragStartAsset(e, src, 'image')}
                className="aspect-square bg-white rounded overflow-hidden cursor-grab active:cursor-grabbing hover:opacity-80 transition-all group relative border border-gray-200 shadow-sm"
              >
                <img src={src} alt="uploaded" className="w-full h-full object-cover" />
                {onRemoveUploadedAsset && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      onRemoveUploadedAsset(src);
                    }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove from library"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="p-4 space-y-3">
            {textTemplates.map(tpl => (
              <div
                key={tpl.id}
                draggable
                onDragStart={e => onDragStartAsset(e, tpl.id, 'template')}
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
        </>
      )}
    </aside>
  );
};
