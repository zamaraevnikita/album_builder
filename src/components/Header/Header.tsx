import React, { useState, useRef, useEffect } from 'react';
import { X, PanelLeft, Undo2, Redo2, ChevronLeft, ChevronRight, Plus, Settings } from 'lucide-react';
import type { ViewMode, PageSide, AlbumFormat } from '../../types';

export type HeaderProps = {
  leftPanelOpen: boolean;
  setLeftPanelOpen: (v: boolean) => void;
  rightPanelOpen: boolean;
  setRightPanelOpen: (v: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  activeSpreadIndex: number;
  currentPageNumber: number;
  currentSpreadName: string;
  activePageId: string;
  onRenamePage: (pageId: string, name: string) => void;
  pagesCount: number;
  activeSide: PageSide;
  onSwitchPage: (direction: 'next' | 'prev') => void;
  onAddPage: () => void;
  albumFormat: AlbumFormat;
  albumFormats: AlbumFormat[];
  onAlbumFormatChange: (format: AlbumFormat) => void;
  isExporting: boolean;
  onExport: () => void;
};

export const Header: React.FC<HeaderProps> = ({
  leftPanelOpen,
  setLeftPanelOpen,
  rightPanelOpen,
  setRightPanelOpen,
  undo,
  redo,
  canUndo,
  canRedo,
  viewMode,
  setViewMode,
  activeSpreadIndex,
  currentPageNumber,
  currentSpreadName,
  activePageId,
  onRenamePage,
  pagesCount,
  activeSide,
  onSwitchPage,
  onAddPage,
  albumFormat,
  albumFormats,
  onAlbumFormatChange,
  isExporting,
  onExport,
}) => {
  const [editingPageName, setEditingPageName] = useState(false);
  const [pageNameDraft, setPageNameDraft] = useState(currentSpreadName);
  const pageNameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPageNameDraft(currentSpreadName);
  }, [currentSpreadName]);

  useEffect(() => {
    if (editingPageName) pageNameInputRef.current?.focus();
  }, [editingPageName]);

  const finishPageRename = () => {
    const trimmed = pageNameDraft.trim();
    if (trimmed) onRenamePage(activePageId, trimmed);
    setEditingPageName(false);
  };

  return (
  <header className="h-16 bg-white border-b border-black/5 flex items-center px-4 lg:px-6 z-50 shrink-0 gap-4">
    <div className="flex items-center gap-3 shrink-0">
      <button
        onClick={() => setLeftPanelOpen(!leftPanelOpen)}
        className="p-1.5 hover:bg-linen rounded transition-colors text-gray-500 hover:text-black"
      >
        {leftPanelOpen ? <X size={20} /> : <PanelLeft size={20} />}
      </button>
      <div className="font-extrabold uppercase tracking-tight text-lg hidden sm:block">
        Studio—01
      </div>
      <div className="flex items-center gap-1 ml-4 border-l border-gray-200 pl-4">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="p-1.5 text-gray-500 hover:text-black disabled:opacity-30 rounded hover:bg-linen"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="p-1.5 text-gray-500 hover:text-black disabled:opacity-30 rounded hover:bg-linen"
        >
          <Redo2 size={16} />
        </button>
      </div>
    </div>

    <div className="flex-1 min-w-0 flex justify-center">
      <div className="flex items-center bg-linen p-1 rounded-lg shadow-sm lg:shadow-none shrink-0">
        <button
          onClick={() => onSwitchPage('prev')}
          disabled={currentPageNumber === 1}
          className="p-1 hover:bg-white rounded disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronLeft size={16} />
        </button>
        {editingPageName ? (
          <input
            ref={pageNameInputRef}
            type="text"
            value={pageNameDraft}
            onChange={e => setPageNameDraft(e.target.value)}
            onBlur={finishPageRename}
            onKeyDown={e => {
              if (e.key === 'Enter') finishPageRename();
            }}
            className="text-[10px] lg:text-[11px] font-mono px-2 lg:px-3 w-20 lg:w-32 text-center font-medium bg-white border border-accent rounded outline-none"
          />
        ) : (
          <span
            className="text-[10px] lg:text-[11px] font-mono px-2 lg:px-3 w-20 lg:w-32 text-center font-medium truncate cursor-pointer hover:text-accent"
            onDoubleClick={() => setEditingPageName(true)}
            title="Double-click to rename"
          >
            {viewMode === 'spread' ? currentSpreadName : `Page ${currentPageNumber}`}
          </span>
        )}
        <button
          onClick={() => onSwitchPage('next')}
          disabled={
            activeSpreadIndex === pagesCount - 1 && (viewMode === 'spread' || activeSide === 'right')
          }
          className="p-1 hover:bg-white rounded disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronRight size={16} />
        </button>
        <button
          onClick={onAddPage}
          className="p-1 hover:bg-white rounded text-gray-500 hover:text-black"
          title="Add spread"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>

    <div className="flex items-center gap-2 lg:gap-4 shrink-0">
      <select
        value={albumFormat.id}
        onChange={e => {
          const f = albumFormats.find(fmt => fmt.id === e.target.value);
          if (f) onAlbumFormatChange(f);
        }}
        className="text-[10px] font-mono px-2 py-1.5 rounded border border-black/10 bg-white text-gray-700 hover:border-black/20 focus:outline-none focus:ring-1 focus:ring-accent"
        title="Album format"
      >
        {albumFormats.map(fmt => (
          <option key={fmt.id} value={fmt.id}>
            {fmt.name}
          </option>
        ))}
      </select>
      <div className="bg-linen p-1 rounded-lg hidden md:flex gap-1">
        <button
          onClick={() => setViewMode('spread')}
          className={`px-3 lg:px-4 py-2 rounded-md text-[10px] lg:text-xs font-semibold transition-all duration-300 ${
            viewMode === 'spread'
              ? 'bg-white shadow-sm text-monolith-black'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Spread
        </button>
        <button
          onClick={() => setViewMode('single')}
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
        onClick={onExport}
        className="bg-monolith-black hover:bg-monolith-dark transition-colors text-white px-3 lg:px-5 py-2 rounded text-xs font-bold flex items-center gap-2"
      >
        {isExporting ? '...' : 'Export'}
      </button>
      <button
        onClick={() => setRightPanelOpen(!rightPanelOpen)}
        className="p-1.5 hover:bg-linen rounded transition-colors text-gray-500 hover:text-black"
      >
        {rightPanelOpen ? <X size={20} /> : <Settings size={20} />}
      </button>
    </div>
  </header>
  );
};
