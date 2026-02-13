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
    className={`absolute w-3 h-3 bg-white border border-accent rounded-full z-50 ${position}`}
    style={{ cursor, transform: `scale(${1 / scale})` }}
    onMouseDown={onMouseDown}
  />
);
