
import React from 'react';

type ResizeHandleProps = {
  cursor: string;
  position: string;
  onMouseDown: (e: React.MouseEvent) => void;
  scale: number;
};

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  cursor,
  position,
  onMouseDown,
  scale,
}) => (
  <div
    className={`absolute w-2.5 h-2.5 bg-white border border-[#18A0FB] z-50 ${position}`}
    style={{ 
      cursor, 
      transform: `scale(${1 / scale})`,
      boxShadow: '0 0 2px rgba(0,0,0,0.1)' 
    }}
    onMouseDown={onMouseDown}
  />
);
