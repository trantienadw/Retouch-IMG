
export interface Adjustments {
  exposure: number;
  contrast: number;
  saturation: number;
  brightness: number;
  highlights: number;
  shadows: number;
  temperature: number;
  tint: number;
  sharpness: number;
  vignette: number;
  grain: number;
}

export type ToolCategory = 'ai' | 'adjust' | 'filters' | 'transform' | 'creative' | 'presets';

export interface HistoryItem {
  imageData: ImageData;
  adjustments: Adjustments;
  filter: string | null;
}

export interface UserPreset {
  id: string;
  name: string;
  adjustments: Adjustments;
  filter: string | null;
}
