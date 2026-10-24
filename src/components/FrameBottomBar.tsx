import React, { useState, useEffect } from 'react';
import { 
  ZoomIn, 
  RotateCw, 
  RotateCcw, 
  FlipHorizontal, 
  FlipVertical, 
  Sliders, 
  Trash2, 
  Upload, 
  X, 
  RefreshCw,
  Move,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Crosshair,
  ArrowLeft,
  ArrowRight,
  Sun,
  Contrast,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Film
} from 'lucide-react';
import { FrameData, DEFAULT_FILTERS } from '../types';
import { formatTimecode } from '../utils/videoExtractor';

interface FrameBottomBarProps {
  frame: FrameData | null;
  frameIndex: number | null;
  totalFrames: number;
  frameWidth?: number;
  frameHeight?: number;
  onUpdate: (updated: Partial<FrameData>) => void;
  onRemoveImage: () => void;
  onReplaceImage: () => void;
  onMoveFrame?: (direction: 'left' | 'right') => void;
  onSelectFrame: (index: number | null) => void;
  onClose: () => void;
}

export const FrameBottomBar: React.FC<FrameBottomBarProps> = ({
  frame,
  frameIndex,
  totalFrames,
  frameWidth = 360,
  frameHeight = 240,
  onUpdate,
  onRemoveImage,
  onReplaceImage,
  onMoveFrame,
  onSelectFrame,
  onClose,
}) => {
  // Local numeric input states for responsive editing before blur
  const [zoomInput, setZoomInput] = useState<string>(frame ? frame.zoom.toFixed(2) : '1.00');
  const [rotationInput, setRotationInput] = useState<string>(frame ? String(frame.rotation) : '0');
  const [panXInput, setPanXInput] = useState<string>(frame ? String(Math.round(frame.panX)) : '0');
  const [panYInput, setPanYInput] = useState<string>(frame ? String(Math.round(frame.panY)) : '0');

  useEffect(() => {
    if (frame) {
      setZoomInput(frame.zoom.toFixed(2));
      setRotationInput(String(frame.rotation));
      setPanXInput(String(Math.round(frame.panX)));
      setPanYInput(String(Math.round(frame.panY)));
    }
  }, [frame?.zoom, frame?.rotation, frame?.panX, frame?.panY, frameIndex]);

  if (frameIndex === null || !frame) {
    return (
      <div 
        id="frame-bottom-bar-empty"
        className="w-full bg-zinc-950 border-t border-zinc-800 px-6 py-5 flex items-center justify-between shrink-0 text-xs text-zinc-500 shadow-2xl min-h-[140px]"
      >
        <div className="max-w-[1920px] mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="flex items-center gap-3 bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800/80">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20 shrink-0">
              <Move className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-zinc-300 text-xs">Framing & Position</div>
              <div className="text-[11px] text-zinc-500">Select any frame to adjust zoom, rotation, flips & alignment</div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800/80">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20 shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-zinc-300 text-xs">Color & Film Filters</div>
              <div className="text-[11px] text-zinc-500">Apply B&W, Warmth, Vivid, Noir and fine-tune contrast</div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800/80">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20 shrink-0">
              <Type className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-zinc-300 text-xs">Frame Edge Markings</div>
              <div className="text-[11px] text-zinc-500">Add custom per-frame scene, take, or director notes</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleZoomSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setZoomInput(val.toFixed(2));
    onUpdate({ zoom: val });
  };

  const handleZoomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    setZoomInput(valStr);
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed) && parsed >= 0.1 && parsed <= 10.0) {
      onUpdate({ zoom: parsed });
    }
  };

  const handleZoomInputBlur = () => {
    let parsed = parseFloat(zoomInput);
    if (isNaN(parsed) || parsed < 0.1) parsed = 0.2;
    if (parsed > 10.0) parsed = 10.0;
    setZoomInput(parsed.toFixed(2));
    onUpdate({ zoom: parsed });
  };

  const handleRotationSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setRotationInput(String(val));
    onUpdate({ rotation: val });
  };

  const handleRotationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    setRotationInput(valStr);
    const parsed = parseInt(valStr, 10);
    if (!isNaN(parsed)) {
      const normalized = ((parsed % 360) + 360) % 360;
      onUpdate({ rotation: normalized });
    }
  };

  const handleRotationInputBlur = () => {
    let parsed = parseInt(rotationInput, 10);
    if (isNaN(parsed)) parsed = 0;
    const normalized = ((parsed % 360) + 360) % 360;
    setRotationInput(String(normalized));
    onUpdate({ rotation: normalized });
  };

  const handlePanXInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    setPanXInput(valStr);
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed)) {
      onUpdate({ panX: parsed });
    }
  };

  const handlePanYInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    setPanYInput(valStr);
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed)) {
      onUpdate({ panY: parsed });
    }
  };

  const handleRotate90 = (direction: 'cw' | 'ccw') => {
    const delta = direction === 'cw' ? 90 : -90;
    const newRot = (frame.rotation + delta + 360) % 360;
    setRotationInput(String(newRot));
    onUpdate({ rotation: newRot });
  };

  const handleResetTransform = () => {
    onUpdate({
      panX: 0,
      panY: 0,
      zoom: 1,
      rotation: 0,
      flipH: false,
      flipV: false,
    });
    setZoomInput('1.00');
    setRotationInput('0');
    setPanXInput('0');
    setPanYInput('0');
  };

  const handleAlign = (hAlign?: 'left' | 'center' | 'right', vAlign?: 'top' | 'middle' | 'bottom') => {
    const imgAspect = (frame.imageNaturalWidth && frame.imageNaturalHeight)
      ? frame.imageNaturalWidth / frame.imageNaturalHeight
      : frameWidth / frameHeight;

    const frameAspect = frameWidth / frameHeight;
    let baseW = frameWidth;
    let baseH = frameHeight;
    if (imgAspect > frameAspect) {
      baseH = frameHeight;
      baseW = frameHeight * imgAspect;
    } else {
      baseW = frameWidth;
      baseH = frameWidth / imgAspect;
    }

    const currentW = baseW * frame.zoom;
    const currentH = baseH * frame.zoom;

    let newPanX = frame.panX;
    let newPanY = frame.panY;

    if (hAlign === 'left') {
      newPanX = Math.max(0, (currentW - frameWidth) / 2);
    } else if (hAlign === 'right') {
      newPanX = -Math.max(0, (currentW - frameWidth) / 2);
    } else if (hAlign === 'center') {
      newPanX = 0;
    }

    if (vAlign === 'top') {
      newPanY = Math.max(0, (currentH - frameHeight) / 2);
    } else if (vAlign === 'bottom') {
      newPanY = -Math.max(0, (currentH - frameHeight) / 2);
    } else if (vAlign === 'middle') {
      newPanY = 0;
    }

    onUpdate({ panX: newPanX, panY: newPanY });
    setPanXInput(String(Math.round(newPanX)));
    setPanYInput(String(Math.round(newPanY)));
  };

  const updateFilter = (key: keyof typeof DEFAULT_FILTERS, value: number) => {
    onUpdate({
      filters: {
        ...frame.filters,
        [key]: value,
      },
    });
  };

  const handleResetFilters = () => {
    onUpdate({ filters: { ...DEFAULT_FILTERS } });
  };

  const handleResetAll = () => {
    handleResetTransform();
    handleResetFilters();
    onUpdate({ customTextTop: undefined, customTextBottom: undefined });
  };

  return (
    <div
      id="frame-options-bottom-bar"
      className="w-full bg-zinc-950 border-t border-zinc-800/90 shadow-2xl z-20 shrink-0 text-zinc-100 select-none py-3.5 px-4 md:px-6"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="max-w-[1920px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 items-start">
        
        {/* ========================================================================= */}
        {/* COLUMN 1: FRAME IDENTITY, NAVIGATION & TRANSFORMS (ZOOM, ROTATION, PAN) */}
        {/* ========================================================================= */}
        <div className="space-y-2.5 lg:border-r lg:border-zinc-800/80 lg:pr-5">
          {/* Header Row: Frame Badge, Prev/Next, Replace/Upload, Swap, Clear */}
          <div className="flex items-center justify-between gap-2 pb-1 border-b border-zinc-800/60">
            <div className="flex items-center gap-1.5">
              {/* Prev / Frame Badge / Next */}
              <div className="flex items-center gap-0.5 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => onSelectFrame(Math.max(0, frameIndex - 1))}
                  disabled={frameIndex === 0}
                  className="p-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-800 rounded transition-colors"
                  title="Previous Frame (Left Arrow)"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <div className="px-2 py-0.5 bg-amber-500/20 text-amber-400 font-mono text-[11px] font-bold rounded border border-amber-500/30">
                  FRAME #{frameIndex + 1}
                </div>
                <button
                  type="button"
                  onClick={() => onSelectFrame(Math.min(totalFrames - 1, frameIndex + 1))}
                  disabled={frameIndex === totalFrames - 1}
                  className="p-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-800 rounded transition-colors"
                  title="Next Frame (Right Arrow)"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Movie Source Timestamp Tag */}
              {typeof frame.videoTimestamp === 'number' && (
                <div 
                  className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 bg-black/60 text-amber-400 font-mono text-[10px] rounded border border-amber-500/30 font-medium"
                  title={frame.sourceVideoName ? `Captured from ${frame.sourceVideoName} at ${formatTimecode(frame.videoTimestamp)}` : `Movie frame at ${formatTimecode(frame.videoTimestamp)}`}
                >
                  <Film className="w-3 h-3 text-amber-500" />
                  <span>{formatTimecode(frame.videoTimestamp)}</span>
                </div>
              )}

              {/* Move/Swap Left/Right */}
              {onMoveFrame && totalFrames > 1 && (
                <div className="flex items-center gap-0.5 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => onMoveFrame('left')}
                    disabled={frameIndex === 0}
                    title="Swap with Left (Alt+Left)"
                    className="p-1 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowLeft className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveFrame('right')}
                    disabled={frameIndex === totalFrames - 1}
                    title="Swap with Right (Alt+Right)"
                    className="p-1 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Photo Actions: Upload/Replace & Delete */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onReplaceImage}
                className="px-2 py-1 text-[11px] bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 rounded-md flex items-center gap-1 font-medium transition-colors"
                title="Replace or upload photo for this frame"
              >
                <Upload className="w-3 h-3 text-amber-400" />
                <span>{frame.imageUrl ? 'Replace' : 'Upload'}</span>
              </button>

              {frame.imageUrl && (
                <button
                  type="button"
                  onClick={onRemoveImage}
                  className="p-1 text-[11px] bg-zinc-900 hover:bg-red-950/80 text-zinc-400 hover:text-red-400 border border-zinc-700/80 rounded-md transition-colors"
                  title="Clear photo from frame (Delete / Backspace)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Zoom & Rotation Controls with live numeric inputs */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Zoom */}
            <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-lg p-2 space-y-1">
              <div className="flex justify-between items-center text-[10px] text-zinc-400">
                <span className="flex items-center gap-1 font-medium text-zinc-300">
                  <ZoomIn className="w-3 h-3 text-amber-400" /> Zoom
                </span>
                <div className="flex items-center gap-0.5">
                  <input
                    type="number"
                    min="0.2"
                    max="10.0"
                    step="0.1"
                    value={zoomInput}
                    onChange={handleZoomInputChange}
                    onBlur={handleZoomInputBlur}
                    className="w-12 bg-zinc-950 border border-zinc-700/80 rounded px-1 py-0.5 text-center font-mono text-amber-400 font-bold text-[10px] focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[9px] text-zinc-500">x</span>
                </div>
              </div>
              <input
                type="range"
                min="0.2"
                max="4.0"
                step="0.05"
                value={frame.zoom}
                onChange={handleZoomSliderChange}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Rotation */}
            <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-lg p-2 space-y-1">
              <div className="flex justify-between items-center text-[10px] text-zinc-400">
                <span className="flex items-center gap-1 font-medium text-zinc-300">
                  <RotateCw className="w-3 h-3 text-amber-400" /> Rotation
                </span>
                <div className="flex items-center gap-0.5">
                  <input
                    type="number"
                    min="0"
                    max="359"
                    value={rotationInput}
                    onChange={handleRotationInputChange}
                    onBlur={handleRotationInputBlur}
                    className="w-10 bg-zinc-950 border border-zinc-700/80 rounded px-1 py-0.5 text-center font-mono text-amber-400 font-bold text-[10px] focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[9px] text-zinc-500">°</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="359"
                step="1"
                value={frame.rotation}
                onChange={handleRotationSliderChange}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>

          {/* Row 3: Pan Nudge, 90° Rotations, Flips, Alignments & Reset */}
          <div className="flex items-center justify-between gap-1.5 pt-0.5">
            {/* Quick 90 deg rotation buttons */}
            <div className="flex items-center gap-0.5 bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => handleRotate90('ccw')}
                className="px-1.5 py-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded text-[10px] flex items-center gap-0.5"
                title="-90° Counter-Clockwise"
              >
                <RotateCcw className="w-3 h-3" />
                <span>-90°</span>
              </button>
              <button
                type="button"
                onClick={() => handleRotate90('cw')}
                className="px-1.5 py-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded text-[10px] flex items-center gap-0.5"
                title="+90° Clockwise"
              >
                <RotateCw className="w-3 h-3" />
                <span>+90°</span>
              </button>
            </div>

            {/* Flips */}
            <div className="flex items-center gap-0.5 bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => onUpdate({ flipH: !frame.flipH })}
                className={`p-1 rounded transition-all ${
                  frame.flipH
                    ? 'bg-amber-500 text-zinc-950 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
                title="Flip Horizontal"
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onUpdate({ flipV: !frame.flipV })}
                className={`p-1 rounded transition-all ${
                  frame.flipV
                    ? 'bg-amber-500 text-zinc-950 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
                title="Flip Vertical"
              >
                <FlipVertical className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Alignments */}
            <div className="flex items-center gap-0.5 bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => handleAlign('left')}
                className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded"
                title="Align Left"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleAlign('center', 'middle')}
                className="p-1 hover:bg-zinc-800 text-amber-400 hover:text-amber-300 rounded font-medium"
                title="Center Photo"
              >
                <Crosshair className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleAlign('right')}
                className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded"
                title="Align Right"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Reset transform */}
            <button
              type="button"
              onClick={handleResetTransform}
              className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded-lg text-[10px] flex items-center gap-1 font-medium"
              title="Reset Zoom, Pan & Rotation"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 2: COLOR GRADING, CINEMA PRESETS & IMAGE FILTERS */}
        {/* ========================================================================= */}
        <div className="space-y-2.5 lg:border-r lg:border-zinc-800/80 lg:pr-5">
          {/* Header Row: Presets and B&W quick toggle */}
          <div className="flex items-center justify-between gap-1 pb-1 border-b border-zinc-800/60">
            <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-amber-400" /> Film Color & Filters
            </span>

            {/* Quick Cinema Presets */}
            <div className="flex items-center gap-1">
              {[
                { name: 'Norm', f: { ...DEFAULT_FILTERS } },
                { name: 'B&W', f: { brightness: 105, contrast: 120, saturation: 0, sepia: 0, grayscale: 100, vintageWarmth: 0 } },
                { name: 'Warm', f: { brightness: 102, contrast: 110, saturation: 105, sepia: 25, grayscale: 0, vintageWarmth: 40 } },
                { name: 'Vivid', f: { brightness: 100, contrast: 120, saturation: 135, sepia: 0, grayscale: 0, vintageWarmth: 0 } },
                { name: 'Noir', f: { brightness: 90, contrast: 145, saturation: 0, sepia: 0, grayscale: 100, vintageWarmth: 0 } },
              ].map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => onUpdate({ filters: preset.f })}
                  className="px-1.5 py-0.5 text-[10px] font-semibold bg-zinc-900 hover:bg-amber-500 hover:text-zinc-950 text-zinc-300 border border-zinc-800 rounded transition-colors"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders Grid: Brightness, Contrast, Saturation & Grayscale */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Brightness */}
            <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-lg p-2 space-y-1">
              <div className="flex justify-between items-center text-[10px] text-zinc-400">
                <span className="flex items-center gap-1 font-medium text-zinc-300">
                  <Sun className="w-3 h-3 text-amber-400" /> Brightness
                </span>
                <span className="font-mono text-amber-400 font-bold text-[10px]">{frame.filters.brightness}%</span>
              </div>
              <input
                type="range"
                min="40"
                max="160"
                value={frame.filters.brightness}
                onChange={(e) => updateFilter('brightness', parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Contrast */}
            <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-lg p-2 space-y-1">
              <div className="flex justify-between items-center text-[10px] text-zinc-400">
                <span className="flex items-center gap-1 font-medium text-zinc-300">
                  <Contrast className="w-3 h-3 text-amber-400" /> Contrast
                </span>
                <span className="font-mono text-amber-400 font-bold text-[10px]">{frame.filters.contrast}%</span>
              </div>
              <input
                type="range"
                min="40"
                max="160"
                value={frame.filters.contrast}
                onChange={(e) => updateFilter('contrast', parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>

          {/* Saturation, Sepia & Filter Reset Row */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            {/* Saturation Slider */}
            <div className="flex-1 bg-zinc-900/70 border border-zinc-800/80 rounded-lg px-2 py-1 flex items-center gap-2">
              <span className="text-[10px] text-zinc-300 font-medium shrink-0">Sat</span>
              <input
                type="range"
                min="0"
                max="200"
                value={frame.filters.saturation}
                onChange={(e) => updateFilter('saturation', parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <span className="font-mono text-amber-400 text-[10px] font-bold shrink-0">{frame.filters.saturation}%</span>
            </div>

            {/* B&W Quick Button */}
            <button
              type="button"
              onClick={() => updateFilter('grayscale', frame.filters.grayscale > 0 ? 0 : 100)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                frame.filters.grayscale > 0
                  ? 'bg-amber-500 text-zinc-950 border-amber-500'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
              }`}
            >
              B&W
            </button>

            {/* Reset Filters */}
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded-lg text-[10px] flex items-center gap-1 font-medium"
              title="Reset Filters to Default"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 3: CUSTOM LABELS, TEXT EDGE MARKINGS & CLOSE INSPECTOR */}
        {/* ========================================================================= */}
        <div className="space-y-2.5">
          {/* Header Row: Title & Close Inspector */}
          <div className="flex items-center justify-between pb-1 border-b border-zinc-800/60">
            <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1">
              <Type className="w-3.5 h-3.5 text-amber-400" /> Frame Edge Markings
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleResetAll}
                className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded text-[10px] transition-colors"
                title="Reset this frame back to default"
              >
                Reset All
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
                title="Close Frame Options (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Top Edge Text Input */}
          <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-lg px-2.5 py-1.5 flex items-center gap-2">
            <span className="text-[10px] text-amber-400 font-mono font-bold uppercase shrink-0">TOP:</span>
            <input
              type="text"
              placeholder={`Default: frame prefix (e.g. SCENE-${frameIndex + 1})`}
              value={frame.customTextTop || ''}
              onChange={(e) => onUpdate({ customTextTop: e.target.value })}
              className="w-full bg-transparent text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none"
            />
            {frame.customTextTop && (
              <button
                type="button"
                onClick={() => onUpdate({ customTextTop: undefined })}
                className="text-zinc-500 hover:text-zinc-300 text-xs px-1"
                title="Clear custom top text"
              >
                ×
              </button>
            )}
          </div>

          {/* Bottom Edge Text Input */}
          <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-lg px-2.5 py-1.5 flex items-center gap-2">
            <span className="text-[10px] text-amber-400 font-mono font-bold uppercase shrink-0">BTM:</span>
            <input
              type="text"
              placeholder={`Default: frame suffix (e.g. ${frameIndex + 1}A)`}
              value={frame.customTextBottom || ''}
              onChange={(e) => onUpdate({ customTextBottom: e.target.value })}
              className="w-full bg-transparent text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none"
            />
            {frame.customTextBottom && (
              <button
                type="button"
                onClick={() => onUpdate({ customTextBottom: undefined })}
                className="text-zinc-500 hover:text-zinc-300 text-xs px-1"
                title="Clear custom bottom text"
              >
                ×
              </button>
            )}
          </div>

          {/* Quick Tokens / Helper row */}
          <div className="flex items-center justify-between text-[10px] text-zinc-500 px-0.5">
            <span>Custom edge text overrides strip defaults for this frame</span>
            <span className="font-mono text-zinc-400">Esc to deselect</span>
          </div>
        </div>

      </div>
    </div>
  );
};
