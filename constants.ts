import { CanvasElement, Page, TextTemplate } from './types';

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

export const INITIAL_ELEMENTS: CanvasElement[] = [
  { 
    id: 'l1', 
    pageId: 'p1',
    name: 'Hero_Visual_Left.jpg', 
    type: 'image', 
    x: 0, 
    y: 0, 
    width: 500, 
    height: 420, 
    ...DEFAULT_STYLE_PROPS,
    content: 'https://images.unsplash.com/photo-1500673922987-e212871fec22?auto=format&fit=crop&q=80&w=1000'
  },
  { 
    id: 'l2', 
    pageId: 'p1',
    name: 'Main_Heading_01', 
    type: 'text', 
    x: 48, 
    y: 450, 
    width: 400, 
    height: 60, 
    ...DEFAULT_STYLE_PROPS,
    content: 'Quiet Solace',
    fontSize: 32,
    fontWeight: 300,
    fontFamily: 'Inter',
    color: '#121212',
    letterSpacing: -0.05,
    lineHeight: 1.2,
    textAlign: 'left'
  },
  { 
    id: 'l3', 
    pageId: 'p1',
    name: 'Sub_Heading', 
    type: 'text', 
    x: 48, 
    y: 500, 
    width: 400, 
    height: 20, 
    ...DEFAULT_STYLE_PROPS,
    content: 'CHAPTER I — 45.4215° N, 75.6972° W',
    fontSize: 10,
    fontWeight: 400,
    fontFamily: 'JetBrains Mono',
    color: '#121212',
    letterSpacing: 0.1,
    lineHeight: 1.4,
    textAlign: 'left',
    opacity: 0.6
  },
  // Element on Page 2
  { 
    id: 'l4', 
    pageId: 'p2',
    name: 'Full_Spread_Img', 
    type: 'image', 
    x: 100, 
    y: 100, 
    width: 800, 
    height: 400, 
    ...DEFAULT_STYLE_PROPS,
    content: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=1000'
  },
];

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
        preview: '“',
        elementData: {
            content: '“Design is intelligence made visible.”',
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