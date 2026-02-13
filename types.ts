
export type ViewMode = 'spread' | 'single';

export interface AlbumFormat {
  id: string;
  name: string;
  width: number;
  height: number;
}

export type ElementType = 'image' | 'text' | 'shape';

export type ShapeKind = 'rectangle' | 'circle' | 'ellipse' | 'triangle';

export type ToolType = 'move' | 'hand' | 'text' | 'shape';

export interface Page {
  id: string;
  name: string; // "Spread 1", "Cover", etc.
}

export interface CanvasElement {
  id: string;
  pageId: string; // Link to specific page
  groupId?: string; // ID of the group if grouped
  type: ElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content?: string; 
  
  // Image Specific (Cropping)
  imageScale?: number; // Scale of image inside the box (1 = cover)
  imageX?: number; // Offset X inside box
  imageY?: number; // Offset Y inside box

  // Style props
  opacity: number;
  backgroundColor?: string;

  // Shape variant (when type === 'shape')
  shapeKind?: ShapeKind;

  // Borders & Corners
  borderRadius: number;
  borderWidth: number;
  borderColor: string;

  // Effects
  shadowBlur: number;
  shadowColor: string;
  shadowOffsetX: number;
  shadowOffsetY: number;

  // Typography
  color?: string;
  fontSize?: number;
  fontWeight?: number; // 100-900
  lineHeight?: number;
  letterSpacing?: number;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  italic?: boolean;
  uppercase?: boolean;
  
  locked: boolean;
}

export interface PropertyGroup {
  label: string;
  items: { label: string; value: string }[];
}

export interface TextTemplate {
    id: string;
    name: string;
    preview: string;
    elementData: Partial<CanvasElement>;
}

export type ResizeHandle = 'tl' | 'tr' | 'bl' | 'br';
export type PageSide = 'left' | 'right';
export type LeftPanelTab = 'layers' | 'assets' | 'templates';
