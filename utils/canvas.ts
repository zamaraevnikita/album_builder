export function snapValue(val: number, gridSize: number, enabled: boolean): number {
  if (!enabled) return val;
  return Math.round(val / gridSize) * gridSize;
}

export function getCanvasDimensions(
  viewMode: 'spread' | 'single',
  spreadWidth: number,
  singleWidth: number,
  height: number
) {
  return {
    width: viewMode === 'spread' ? spreadWidth : singleWidth,
    height,
  };
}