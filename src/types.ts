export type AspectRatioType = '3:2' | '16:9' | '4:3' | '1:1' | '2.39:1' | 'custom';

export type FilmStockPreset = 'kodak_vision3' | 'fujifilm_eterna' | 'ilford_noir' | 'cinestill_800t' | 'vintage_monochrome' | 'clean_modern';

export interface ImageFilterSettings {
  brightness: number; // 0 to 200 (100 is normal)
  contrast: number;   // 0 to 200 (100 is normal)
  saturation: number; // 0 to 200 (100 is normal)
  sepia: number;      // 0 to 100 (0 is none)
  grayscale: number;  // 0 to 100 (0 is none)
  vintageWarmth: number; // 0 to 100
}

export interface FrameData {
  id: string;
  imageUrl: string | null;
  imageName?: string;
  imageNaturalWidth?: number;
  imageNaturalHeight?: number;
  panX: number;       // In px relative to center
  panY: number;       // In px relative to center
  zoom: number;       // 0.2 to 5.0 (1.0 default)
  rotation: number;   // 0 to 360 degrees
  flipH: boolean;
  flipV: boolean;
  filters: ImageFilterSettings;
  customTextTop?: string;
  customTextBottom?: string;
}

export interface FilmStripConfig {
  frameCount: number;
  filmHeight: number;           // Total height of the film strip in px (default ~360px)
  aspectRatio: AspectRatioType;
  customAspectWidth: number;
  customAspectHeight: number;
  outerBorderWidth: number;     // Outer strip border (px)
  frameBorderWidth: number;     // Border around each frame photo (px)
  frameDividerWidth: number;    // Space between adjacent frames (px)
  frameMargin: number;          // Distance between sprocket holes and frames (px)
  filmBgColor: string;          // Strip background / base color
  frameBorderColor: string;     // Border around individual frames
  sprocketFillColor: string;    // Sprocket hole fill color
  sprocketBorderColor: string;  // Sprocket hole border color
  sprocketWidth: number;        // Sprocket hole width (px)
  sprocketHeight: number;       // Sprocket hole height (px)
  sprocketRadius: number;       // Corner radius for sprocket holes (px)
  sprocketsPerFrame: number;    // Sprockets per frame interval (e.g. 4 for 35mm)
  sprocketMarginTop: number;    // Distance from outer edge to sprocket hole (px)
  prefix: string;
  suffix: string;
  startNumber: number;
  padZeroes: boolean;
  showTopText: boolean;
  showBottomText: boolean;
  fontSize: number;
  fontColor: string;
  fontFamily: 'mono' | 'courier' | 'sans';
  showFrameArrows: boolean;
  showEdgeBarcodes: boolean;
  filmStockName: string;        // e.g. "EASTMAN 5219", "KODAK 500T", "FUJIFILM"
  showFilmStockName: boolean;
  filmGrain: number;            // 0 to 100
}

export interface ExportOptions {
  multiplier: number;           // 1x, 2x, 3x, 4x
  format: 'image/png' | 'image/jpeg' | 'image/webp';
  quality: number;              // 0.92
  filename: string;
}

export interface FilmStripProject {
  version: string;
  projectName: string;
  createdAt: string;
  updatedAt: string;
  config: FilmStripConfig;
  frames: FrameData[];
}

export const PROJECT_VERSION = '1.0.0';

export const DEFAULT_FILTERS: ImageFilterSettings = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  sepia: 0,
  grayscale: 0,
  vintageWarmth: 0,
};

export const DEFAULT_CONFIG: FilmStripConfig = {
  frameCount: 4,
  filmHeight: 380,
  aspectRatio: '3:2',
  customAspectWidth: 3,
  customAspectHeight: 2,
  outerBorderWidth: 6,
  frameBorderWidth: 2,
  frameDividerWidth: 12,
  frameMargin: 12,
  filmBgColor: '#000000',
  frameBorderColor: '#18181b',
  sprocketFillColor: '#ffffff',
  sprocketBorderColor: '#27272a',
  sprocketWidth: 16,
  sprocketHeight: 22,
  sprocketRadius: 4,
  sprocketsPerFrame: 4,
  sprocketMarginTop: 8,
  prefix: 'SCENE-',
  suffix: '-A',
  startNumber: 1,
  padZeroes: true,
  showTopText: true,
  showBottomText: true,
  fontSize: 11,
  fontColor: '#f59e0b', // Kodak amber gold
  fontFamily: 'mono',
  showFrameArrows: true,
  showEdgeBarcodes: true,
  filmStockName: 'KODAK 500T 5219',
  showFilmStockName: true,
  filmGrain: 0,
};
