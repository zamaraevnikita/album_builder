import React from 'react';

export const GrainOverlay: React.FC = () => (
  <svg className="fixed inset-0 w-full h-full pointer-events-none z-[9999] opacity-[0.04] mix-blend-multiply">
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width="100%" height="100%" filter="url(#grain)" />
  </svg>
);
