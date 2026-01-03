
import { Adjustments } from './types';

export const DEFAULT_ADJUSTMENTS: Adjustments = {
  exposure: 0,
  contrast: 0,
  saturation: 0,
  brightness: 0,
  highlights: 0,
  shadows: 0,
  temperature: 0,
  tint: 0,
  sharpness: 0,
  vignette: 0,
  grain: 0,
};

export const FILTERS = [
  { id: 'none', name: 'Original', icon: '📸' },
  { id: 'vintage', name: 'Vintage', icon: '🎞️' },
  { id: 'bw', name: 'Black & White', icon: '🌗' },
  { id: 'cinematic', name: 'Cinematic', icon: '🎬' },
  { id: 'vivid', name: 'Vivid', icon: '🌈' },
  { id: 'matte', name: 'Matte', icon: '🌫️' },
  { id: 'sepia', name: 'Sepia', icon: '📜' },
  { id: 'cool', name: 'Cool Tone', icon: '❄️' },
  { id: 'warm', name: 'Warm Tone', icon: '☀️' },
  { id: 'cyberpunk', name: 'Cyberpunk', icon: '🌃' },
];

export const ARTISTIC_STYLES = [
  { id: 'oil-painting', name: 'Oil Painting', icon: '🎨' },
  { id: 'watercolor', name: 'Watercolor', icon: '💧' },
  { id: 'sketch', name: 'Sketch', icon: '✏️' },
  { id: 'cyberpunk-ai', name: 'Cyberpunk', icon: '🧪' },
  { id: 'film-noir', name: 'Film Noir', icon: '🌑' },
];
