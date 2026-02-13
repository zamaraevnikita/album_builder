import { CanvasElement, Page, TextTemplate, AlbumFormat } from './types';

export const GRID_SIZE = 5;

export const ALBUM_FORMATS: AlbumFormat[] = [
  { id: 'a4', name: '210×297 (A4)', width: 210, height: 297 },
  { id: '200', name: '200×200', width: 200, height: 200 },
  { id: '225', name: '225×270', width: 225, height: 270 },
];

export const INITIAL_PAGES: Page[] = [
  { id: 'p1', name: 'Spread 01' },
  { id: 'p2', name: 'Spread 02' },
];

const DEFAULT_STYLE_PROPS = {
  borderRadius: 0,
  borderWidth: 0,
  borderColor: '#000000',
  shadowBlur: 0,
  shadowColor: 'rgba(0,0,0,0.2)',
  shadowOffsetX: 0,
  shadowOffsetY: 4,
  opacity: 1,
  rotation: 0,
  locked: false,
  imageScale: 1,
  imageX: 0,
  imageY: 0,
};

export const INITIAL_ELEMENTS: CanvasElement[] = [];

export const MOCK_ASSETS = [
  'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=400'
];

export const TEXT_TEMPLATES: TextTemplate[] = [
    {
        id: 'headline-1',
        name: 'Serif Headline',
        preview: 'Aa',
        elementData: {
            content: 'Editorial Headline',
            fontSize: 42,
            fontFamily: 'Times New Roman',
            fontWeight: 400,
            letterSpacing: -0.05,
            width: 400,
            height: 60
        }
    },
    {
        id: 'subhead-mono',
        name: 'Mono Label',
        preview: '01',
        elementData: {
            content: 'FIG. 01 — DETAILS',
            fontSize: 10,
            fontFamily: 'JetBrains Mono',
            fontWeight: 400,
            letterSpacing: 0.1,
            uppercase: true,
            color: '#666666',
            width: 200,
            height: 20
        }
    },
    {
        id: 'body-col',
        name: 'Body Column',
        preview: '¶',
        elementData: {
            content: 'Ideally, a designer should try to create a page where the text is easy to read and the images are easy to see.',
            fontSize: 12,
            fontFamily: 'Inter',
            fontWeight: 400,
            lineHeight: 1.6,
            textAlign: 'justify',
            width: 200,
            height: 150
        }
    },
    {
        id: 'quote-italic',
        name: 'Pull Quote',
        preview: '"',
        elementData: {
            content: '"Design is intelligence made visible."',
            fontSize: 24,
            fontFamily: 'Inter',
            fontWeight: 300,
            italic: true,
            textAlign: 'center',
            width: 300,
            height: 80
        }
    }
];
