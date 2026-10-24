# Film Strip Generator — Developer & AI Agent Guide

Welcome to the **Film Strip Generator** codebase. This document serves as the architectural reference and implementation manual for future AI coding agents and human developers maintaining, extending, or refactoring this application.

---

## 1. High-Level Architecture Overview

The application is a client-side React 19 single-page application (SPA) built with Vite, TypeScript, Tailwind CSS, and HTML5 Canvas.

### Core Philosophy
- **Dual-Engine Rendering**:
  1. **Interactive DOM Filmstrip (`FilmStripPreview.tsx`)**: High-performance, reactive DOM/CSS representation for real-time zooming, drag panning, direct photo replacement, and live styling feedback.
  2. **High-Resolution Canvas Exporter (`utils/canvasExport.ts`)**: Native 2D Canvas engine that mathematically replicates every millimeter of the DOM filmstrip (sprocket holes, barcodes, grain, filters, text markings, and non-destructive image matrices) at `1x`, `2x`, or `4x` scale.
- **Non-Destructive Aperture Sizing**:
  - Images are never cropped destructively.
  - The frame box serves as an optical aperture viewport (`overflow: hidden`).
  - Image scaling uses exact natural aspect-ratio math (`baseW`, `baseH`) centered at `(centerX, centerY)` with pan, zoom, rotation, and flips applied via matrix transforms.
- **Single Source of Truth**:
  - `FilmStripConfig` controls global strip geometry, sprockets, stock branding, and typography.
  - `FrameData[]` controls per-frame image URLs, natural dimensions, transform matrices (`panX`, `panY`, `zoom`, `rotation`, `flipH`, `flipV`), color filters, and custom edge text overrides.

---

## 2. Directory Structure & File Map

```
/
├── index.html                     # HTML root entry point with Google Fonts (Cinematic fonts)
├── package.json                   # React 19, Vite, Tailwind CSS, Lucide icons, JSZip
├── tsconfig.json                  # TypeScript strict configuration
├── vite.config.ts                 # Vite bundler configuration
├── metadata.json                  # Application title and permissions metadata
├── README.md                      # End-user documentation and quickstart guide
├── AGENTS.md                      # AI agent architecture guidelines (this file)
└── src/
    ├── main.tsx                   # React root mounting
    ├── App.tsx                    # Top-level state management, keyboard shortcuts, modals
    ├── types.ts                   # Universal TypeScript interfaces and default configurations
    ├── index.css                  # Global Tailwind imports & custom scrollbar styling
    ├── components/
    │   ├── FilmStripPreview.tsx   # Interactive canvas area, status bar, and frame viewport
    │   ├── FrameBottomBar.tsx     # 3-Column docked frame inspector (Framing, Filters, Labels)
    │   ├── FrameAdjuster.tsx      # Legacy/secondary standalone frame adjuster component
    │   ├── SidebarControls.tsx    # Left sidebar for strip setup, aspect ratios, sprockets, presets
    │   ├── ExportModal.tsx        # High-res export modal (1x/2x/4x, PNG/JPEG/WebP, individual/strip)
    │   ├── ProjectSaveLoadModal.tsx # Project management, local storage, JSON/ZIP import & export
    │   └── VideoTimelineDeck.tsx  # Movie frame extractor, preview monitor & multi-thumb timeline scrubber
    └── utils/
        ├── canvasExport.ts        # 2D Canvas mathematical renderer and exporter
        ├── projectArchive.ts      # Multi-frame ZIP packaging via JSZip
        ├── sampleImages.ts        # Curated vintage cinematic sample images
        ├── storage.ts             # LocalStorage persistence for projects and settings
        └── videoExtractor.ts      # Video frame capture, timecode formatting & demo clip generator
```

---

## 3. Core Data Contracts (`src/types.ts`)

### `FilmStripConfig`
Global configuration for the entire film strip:
- `frameCount`: Number of active picture frames.
- `filmHeight`: Total height of the film strip in pixels (drives all proportional geometry).
- `aspectRatio`: `'3:2' | '16:9' | '4:3' | '1:1' | '2.39:1' | 'custom'`.
- `customAspectWidth` / `customAspectHeight`: Numeric ratio for custom aspect setting.
- `outerBorderWidth`, `frameBorderWidth`, `frameDividerWidth`, `frameMargin`: Geometry spacing.
- `filmBgColor`, `frameBgColor`, `frameBorderColor`: Celluloid colors.
- `sprocketFillColor`, `sprocketBorderColor`, `sprocketWidth`, `sprocketHeight`, `sprocketRadius`, `sprocketsPerFrame`: Sprocket hole parameters.
- `filmStockName`, `showFilmStockName`, `showEdgeBarcodes`, `showFrameArrows`: Vintage film stock details.
- `prefix`, `suffix`, `startNumber`, `padZeroes`, `fontColor`, `fontFamily`, `fontSize`: Edge text markings.

### `FrameData`
State representation for an individual picture frame:
- `id`: Unique frame identifier string.
- `imageUrl`: Data URL or object URL of the photo (or `null` if empty).
- `imageNaturalWidth` / `imageNaturalHeight`: Intrinsic dimensions of the uploaded image.
- `panX` / `panY`: Pixel offsets relative to frame center.
- `zoom`: Scale multiplier (`0.2` to `10.0`, default `1.0`).
- `rotation`: Free rotation angle in degrees (`0` to `359`).
- `flipH` / `flipV`: Boolean horizontal / vertical mirroring.
- `filters`: `ImageFilterSettings` (brightness, contrast, saturation, sepia, grayscale, vintageWarmth).
- `customTextTop` / `customTextBottom`: Per-frame edge markings overriding strip defaults.

---

## 4. Component Breakdown & Responsibilities

### `src/App.tsx`
- **Orchestration**: Manages `config`, `frames`, `selectedFrameIndex`, `activeModal`, and `activeSidebarTab`.
- **Keyboard Shortcuts**:
  - `ArrowLeft` / `ArrowRight`: Navigate selected frame.
  - `Alt + ArrowLeft` / `Alt + ArrowRight`: Swap adjacent frames.
  - `Delete` / `Backspace`: Remove photo from active frame.
  - `Escape`: Deselect active frame.
  - `Ctrl + S`: Open project save/export modal.
  - `Ctrl + E`: Open export modal.
- **Header Actions**: Quick sample photo loader, reset strip, project save/load, and export buttons.

### `src/components/FilmStripPreview.tsx`
- **Visual Canvas Stage**:
  - Renders celluloid base, top/bottom sprocket tracks, and edge text markings.
  - Renders frame apertures with exact geometry calculations.
  - Supports Drag-and-Drop file uploads directly onto frame boxes.
- **Status Bar (`#film-status-bar`)**:
  - Frame indicator badges (`#1`, `#2`, etc.) with image-presence indicators.
  - Keyboard shortcut hints.
- **Interactive Gestures**:
  - Pointer pan dragging (`handlePointerDown`, `handlePointerMove`, `handlePointerUp`).
  - Wheel zoom (`handleWheel` with `ctrlKey` or trackpad pinch).

### `src/components/FrameBottomBar.tsx`
- Docked directly below the status bar for desktop widescreen editing.
- **Column 1 (Framing & Geometry)**:
  - Frame badge, prev/next buttons, swap left/right, replace/upload, delete photo.
  - Synchronized Zoom and Rotation range sliders and numeric input boxes.
  - 90° CCW / CW buttons, Flips, Alignment presets (Left, Center, Right), Framing reset.
- **Column 2 (Color & Filters)**:
  - Cinema Presets: Norm, B&W, Warm, Vivid, Noir.
  - Fine sliders for Brightness, Contrast, Saturation.
  - B&W toggle and filter reset.
- **Column 3 (Edge Markings & Inspector)**:
  - Live editable `TOP` and `BTM` edge marking text inputs per frame.
  - Reset All and Close/Deselect (`Esc`) buttons.

### `src/components/SidebarControls.tsx`
Left drawer organized into categorized panels:
1. **Layout & Dimensions**: Frame count, film height slider, aspect ratio selector presets, spacing, and dividers.
2. **Stock & Presets**: Authentic film stocks (Kodak Vision3, Fujifilm Eterna, Ilford Noir, CineStill 800T), grain simulation, celluloid colors.
3. **Sprockets**: Sprocket hole width, height, corner radius, pitch (sprockets per frame), and colors.
4. **Edge Markings**: Top/bottom text toggles, scene prefixes, numbering formats, fonts (Mono, Courier, Sans), and amber/yellow/red font colors.
5. **Frame Gallery**: Reorderable list of loaded frames with thumbnail previews and quick upload/replace triggers.

### `src/components/ExportModal.tsx`
- Generates high-res image previews.
- Multiplier options: `1x` (Standard), `2x` (Retina / Print ~300 DPI), `4x` (Ultra HD / Archival).
- Format selection: PNG (lossless), JPEG (compressed), WebP.
- Batch export: Download full film strip or individual separated frames as a ZIP archive.

---

## 5. Geometry & Math Engine (`src/utils/canvasExport.ts`)

The geometry function `calculateFilmStripGeometry(config)` computes:
```ts
export function calculateFilmStripGeometry(config: FilmStripConfig) {
  // 1. Determine numeric aspect ratio (e.g. 1.5 for 3:2, 1.777 for 16:9)
  // 2. Calculate frameHeight = filmHeight - (sprocketHeight * 2 + frameMargin * 2 + border * 2)
  // 3. Calculate frameWidth = frameHeight * aspect
  // 4. Calculate totalWidth = outerBorder*2 + sideMargin*2 + (frameWidth * count) + (divider * (count-1))
  // 5. Derive sprocket coordinates and pitch
}
```

### Uncropped Image Positioning Formula
To ensure images are not prematurely cropped by CSS `object-fit`:
```ts
const imgAspect = (imgNaturalW && imgNaturalH) ? (imgNaturalW / imgNaturalH) : frameAspect;

let baseW = geo.frameWidth;
let baseH = geo.frameHeight;
if (imgAspect > frameAspect) {
  baseH = geo.frameHeight;
  baseW = geo.frameHeight * imgAspect;
} else {
  baseW = geo.frameWidth;
  baseH = geo.frameWidth / imgAspect;
}
```
This formula is identically mirrored in `FilmStripPreview.tsx`, `canvasExport.ts`, and `FrameBottomBar.tsx`.

---

## 6. Guidelines for Future AI Agents & Modifications

1. **Maintain Geometry Parity**: Whenever modifying `calculateFilmStripGeometry`, ensure both `FilmStripPreview.tsx` (DOM) and `canvasExport.ts` (Canvas 2D) are updated in tandem to prevent export discrepancies.
2. **Preserve Non-Destructive Transforms**: Never apply permanent crops to image assets. Retain original image URLs and natural dimensions in `FrameData`.
3. **Keep Color Styling Dark & Film-Centric**: The interface is intentionally styled in a vintage cinema darkroom aesthetic (Zinc 900/950, Kodak amber `#f59e0b` accents, clean monospace numbers). Avoid generic bright SaaS UI patterns.
4. **Type Safety**: Keep `types.ts` strictly updated whenever introducing new configurable parameters to `FilmStripConfig` or `FrameData`.
5. **Linting & Compilation**: Always run `lint_applet` and `compile_applet` after making structural changes.
