import React, { useState } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
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
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyEnd,
  Grid,
  Crosshair,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowLeftRight
} from 'lucide-react';
import { FrameData, DEFAULT_FILTERS } from '../types';
import { computeImageFit } from '../utils/geometry';

interface FrameAdjusterProps {
  frame: FrameData;
  frameIndex: number;
  totalFrames: number;
  frameWidth?: number;
  frameHeight?: number;
  onUpdate: (updated: Partial<FrameData>) => void;
  onRemoveImage: () => void;
  onReplaceImage: () => void;
  onMoveFrame?: (direction: 'left' | 'right') => void;
  onClose: () => void;
}

export const FrameAdjuster: React.FC<FrameAdjusterProps> = ({
  frame,
  frameIndex,
  totalFrames,
  frameWidth = 360,
  frameHeight = 240,
  onUpdate,
  onRemoveImage,
  onReplaceImage,
  onMoveFrame,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'transform' | 'filters' | 'text'>('transform');

  // Local state for numeric inputs to allow smooth typing before blur/commit
  const [zoomInput, setZoomInput] = useState<string>(frame.zoom.toFixed(2));
  const [rotationInput, setRotationInput] = useState<string>(String(frame.rotation));
  const [panXInput, setPanXInput] = useState<string>(String(Math.round(frame.panX)));
  const [panYInput, setPanYInput] = useState<string>(String(Math.round(frame.panY)));

  // Sync local inputs when frame props change externally
  React.useEffect(() => {
    setZoomInput(frame.zoom.toFixed(2));
  }, [frame.zoom]);

  React.useEffect(() => {
    setRotationInput(String(frame.rotation));
  }, [frame.rotation]);

  React.useEffect(() => {
    setPanXInput(String(Math.round(frame.panX)));
  }, [frame.panX]);

  React.useEffect(() => {
    setPanYInput(String(Math.round(frame.panY)));
  }, [frame.panY]);

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

  /**
   * Calculates alignment pan offsets
   */
  const handleAlign = (hAlign?: 'left' | 'center' | 'right', vAlign?: 'top' | 'middle' | 'bottom') => {
    // Estimate image rendered dimensions relative to frame
    const { baseW, baseH } = computeImageFit(
      frame.imageNaturalWidth,
      frame.imageNaturalHeight,
      frameWidth,
      frameHeight
    );

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

  const handleResetFilters = () => {
    onUpdate({ filters: { ...DEFAULT_FILTERS } });
  };

  const updateFilter = (key: keyof typeof DEFAULT_FILTERS, value: number) => {
    onUpdate({
      filters: {
        ...frame.filters,
        [key]: value,
      },
    });
  };

  const nudgePan = (dx: number, dy: number) => {
    const newX = frame.panX + dx;
    const newY = frame.panY + dy;
    onUpdate({ panX: newX, panY: newY });
    setPanXInput(String(Math.round(newX)));
    setPanYInput(String(Math.round(newY)));
  };

  return (
    <div
      id="frame-adjustment-toolbar"
      className="bg-zinc-900/95 backdrop-blur-md border border-zinc-700/80 rounded-xl shadow-2xl p-3.5 text-zinc-100 max-w-lg w-full animate-in fade-in zoom-in-95 duration-150 z-30"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header with Title, Frame Number, Move / Swap buttons, and Actions */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="bg-amber-500/20 text-amber-400 font-mono text-xs font-semibold px-2 py-0.5 rounded border border-amber-500/30 shrink-0">
            FRAME #{frameIndex + 1}
          </span>
          <span className="text-xs text-zinc-400 font-medium truncate max-w-[120px]">
            {frame.imageName || 'Selected Frame'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Quick Header Swap Buttons */}
          <div className="flex items-center bg-zinc-950/80 p-0.5 rounded-lg border border-zinc-800">
            <button
              id={`btn-header-move-left-${frameIndex}`}
              type="button"
              onClick={() => onMoveFrame?.('left')}
              disabled={frameIndex <= 0}
              title={frameIndex > 0 ? `Move Left & Swap with Frame #${frameIndex} (Alt+Left)` : 'Already first frame'}
              className={`p-1.5 rounded transition-colors flex items-center gap-1 text-xs ${
                frameIndex > 0
                  ? 'hover:bg-zinc-800 text-zinc-300 hover:text-amber-400 cursor-pointer active:scale-95'
                  : 'text-zinc-600 cursor-not-allowed opacity-40'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium hidden sm:inline">Swap Left</span>
            </button>
            <div className="w-[1px] h-3.5 bg-zinc-800" />
            <button
              id={`btn-header-move-right-${frameIndex}`}
              type="button"
              onClick={() => onMoveFrame?.('right')}
              disabled={frameIndex >= totalFrames - 1}
              title={frameIndex < totalFrames - 1 ? `Move Right & Swap with Frame #${frameIndex + 2} (Alt+Right)` : 'Already last frame'}
              className={`p-1.5 rounded transition-colors flex items-center gap-1 text-xs ${
                frameIndex < totalFrames - 1
                  ? 'hover:bg-zinc-800 text-zinc-300 hover:text-amber-400 cursor-pointer active:scale-95'
                  : 'text-zinc-600 cursor-not-allowed opacity-40'
              }`}
            >
              <span className="text-[11px] font-medium hidden sm:inline">Swap Right</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-[1px] h-4 bg-zinc-800 mx-0.5" />

          <button
            id={`btn-replace-image-${frameIndex}`}
            onClick={onReplaceImage}
            title="Replace Image"
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-md transition-colors"
          >
            <Upload className="w-4 h-4" />
          </button>
          <button
            id={`btn-remove-image-${frameIndex}`}
            onClick={onRemoveImage}
            title="Remove Image (Delete / Backspace)"
            className="p-1.5 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 rounded-md transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            id={`btn-close-adjuster-${frameIndex}`}
            onClick={onClose}
            title="Deselect Frame (Esc)"
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-md transition-colors ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-zinc-950/60 p-0.5 rounded-lg border border-zinc-800 mb-3">
        <button
          onClick={() => setActiveTab('transform')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'transform'
              ? 'bg-zinc-800 text-amber-400 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Move className="w-3.5 h-3.5" />
          Transform & Align
        </button>
        <button
          onClick={() => setActiveTab('filters')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'filters'
              ? 'bg-zinc-800 text-amber-400 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Color & Tone
        </button>
        <button
          onClick={() => setActiveTab('text')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'text'
              ? 'bg-zinc-800 text-amber-400 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          Text
        </button>
      </div>

      {/* Tab 1: Transform, Pan, Alignment & Coordinates */}
      {activeTab === 'transform' && (
        <div className="space-y-3.5">
          {/* Zoom Scale Control (Slider + Typeable Number Input) */}
          <div className="space-y-1.5 bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-medium flex items-center gap-1">
                <ZoomIn className="w-3.5 h-3.5 text-amber-400" /> Zoom Scale
              </span>
              
              {/* Typeable Zoom Input */}
              <div className="flex items-center gap-1">
                <input
                  id="input-zoom-scale-number"
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="10.0"
                  value={zoomInput}
                  onChange={handleZoomInputChange}
                  onBlur={handleZoomInputBlur}
                  className="w-18 bg-zinc-900 border border-zinc-700 focus:border-amber-500 rounded px-1.5 py-0.5 text-xs text-right font-mono text-amber-400 focus:outline-none font-bold"
                  title="Type exact zoom scale (e.g. 1.25)"
                />
                <span className="text-zinc-400 font-mono text-xs">x</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const nz = Math.max(0.2, frame.zoom - 0.1);
                  setZoomInput(nz.toFixed(2));
                  onUpdate({ zoom: nz });
                }}
                className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <input
                type="range"
                min="0.2"
                max="4.0"
                step="0.05"
                value={frame.zoom}
                onChange={handleZoomSliderChange}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <button
                onClick={() => {
                  const nz = Math.min(4.0, frame.zoom + 0.1);
                  setZoomInput(nz.toFixed(2));
                  onUpdate({ zoom: nz });
                }}
                className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Rotation Control (Slider + Typeable Number Input) */}
          <div className="space-y-1.5 bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-medium flex items-center gap-1">
                <RotateCw className="w-3.5 h-3.5 text-amber-400" /> Rotation
              </span>
              
              {/* Typeable Rotation Input */}
              <div className="flex items-center gap-1">
                <input
                  id="input-rotation-angle-number"
                  type="number"
                  step="1"
                  min="0"
                  max="360"
                  value={rotationInput}
                  onChange={handleRotationInputChange}
                  onBlur={handleRotationInputBlur}
                  className="w-16 bg-zinc-900 border border-zinc-700 focus:border-amber-500 rounded px-1.5 py-0.5 text-xs text-right font-mono text-amber-400 focus:outline-none font-bold"
                  title="Type exact rotation angle (0 - 360°)"
                />
                <span className="text-zinc-400 font-mono text-xs">°</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleRotate90('ccw')}
                className="p-1.5 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 rounded text-xs flex items-center gap-1 transition-colors"
                title="Rotate 90° CCW"
              >
                <RotateCcw className="w-3.5 h-3.5" /> -90°
              </button>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={frame.rotation}
                onChange={handleRotationSliderChange}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <button
                onClick={() => handleRotate90('cw')}
                className="p-1.5 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 rounded text-xs flex items-center gap-1 transition-colors"
                title="Rotate 90° CW"
              >
                <RotateCw className="w-3.5 h-3.5" /> +90°
              </button>
            </div>
          </div>

          {/* ALIGNMENT OPTIONS */}
          <div className="space-y-2 bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800">
            <div className="flex items-center justify-between text-xs text-zinc-300 font-medium">
              <span className="flex items-center gap-1">
                <Grid className="w-3.5 h-3.5 text-amber-400" /> Frame Alignment
              </span>
              <button
                onClick={() => handleAlign('center', 'middle')}
                className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
                title="Align to Exact Center"
              >
                <Crosshair className="w-3 h-3" /> Center Both
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Horizontal Align */}
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Horizontal</span>
                <div className="flex bg-zinc-900 rounded-md border border-zinc-700/80 p-0.5">
                  <button
                    onClick={() => handleAlign('left')}
                    className="flex-1 py-1 px-1.5 hover:bg-zinc-800 text-zinc-300 hover:text-amber-300 rounded flex items-center justify-center gap-1 text-[11px] transition-colors"
                    title="Align Left"
                  >
                    <AlignLeft className="w-3 h-3" /> Left
                  </button>
                  <button
                    onClick={() => handleAlign('center')}
                    className="flex-1 py-1 px-1.5 hover:bg-zinc-800 text-zinc-300 hover:text-amber-300 rounded flex items-center justify-center gap-1 text-[11px] transition-colors border-x border-zinc-800"
                    title="Align Center"
                  >
                    <AlignCenter className="w-3 h-3" /> Center
                  </button>
                  <button
                    onClick={() => handleAlign('right')}
                    className="flex-1 py-1 px-1.5 hover:bg-zinc-800 text-zinc-300 hover:text-amber-300 rounded flex items-center justify-center gap-1 text-[11px] transition-colors"
                    title="Align Right"
                  >
                    <AlignRight className="w-3 h-3" /> Right
                  </button>
                </div>
              </div>

              {/* Vertical Align */}
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Vertical</span>
                <div className="flex bg-zinc-900 rounded-md border border-zinc-700/80 p-0.5">
                  <button
                    onClick={() => handleAlign(undefined, 'top')}
                    className="flex-1 py-1 px-1.5 hover:bg-zinc-800 text-zinc-300 hover:text-amber-300 rounded flex items-center justify-center gap-1 text-[11px] transition-colors"
                    title="Align Top"
                  >
                    <AlignVerticalJustifyStart className="w-3 h-3" /> Top
                  </button>
                  <button
                    onClick={() => handleAlign(undefined, 'middle')}
                    className="flex-1 py-1 px-1.5 hover:bg-zinc-800 text-zinc-300 hover:text-amber-300 rounded flex items-center justify-center gap-1 text-[11px] transition-colors border-x border-zinc-800"
                    title="Align Middle"
                  >
                    <AlignVerticalJustifyCenter className="w-3 h-3" /> Mid
                  </button>
                  <button
                    onClick={() => handleAlign(undefined, 'bottom')}
                    className="flex-1 py-1 px-1.5 hover:bg-zinc-800 text-zinc-300 hover:text-amber-300 rounded flex items-center justify-center gap-1 text-[11px] transition-colors"
                    title="Align Bottom"
                  >
                    <AlignVerticalJustifyEnd className="w-3 h-3" /> Bot
                  </button>
                </div>
              </div>
            </div>

            {/* Quick 3x3 Position Pad & Coordinates */}
            <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
              <div className="grid grid-cols-3 gap-1 bg-zinc-900 p-1 rounded-md border border-zinc-800">
                <button
                  onClick={() => handleAlign('left', 'top')}
                  className="w-5 h-5 bg-zinc-800 hover:bg-amber-500/20 text-zinc-400 hover:text-amber-300 rounded text-[9px] font-bold"
                  title="Top-Left"
                >
                  ↖
                </button>
                <button
                  onClick={() => handleAlign('center', 'top')}
                  className="w-5 h-5 bg-zinc-800 hover:bg-amber-500/20 text-zinc-400 hover:text-amber-300 rounded text-[9px] font-bold"
                  title="Top-Center"
                >
                  ↑
                </button>
                <button
                  onClick={() => handleAlign('right', 'top')}
                  className="w-5 h-5 bg-zinc-800 hover:bg-amber-500/20 text-zinc-400 hover:text-amber-300 rounded text-[9px] font-bold"
                  title="Top-Right"
                >
                  ↗
                </button>
                <button
                  onClick={() => handleAlign('left', 'middle')}
                  className="w-5 h-5 bg-zinc-800 hover:bg-amber-500/20 text-zinc-400 hover:text-amber-300 rounded text-[9px] font-bold"
                  title="Middle-Left"
                >
                  ←
                </button>
                <button
                  onClick={() => handleAlign('center', 'middle')}
                  className="w-5 h-5 bg-zinc-800 hover:bg-amber-500/30 text-amber-400 rounded text-[9px] font-bold"
                  title="Exact Center"
                >
                  •
                </button>
                <button
                  onClick={() => handleAlign('right', 'middle')}
                  className="w-5 h-5 bg-zinc-800 hover:bg-amber-500/20 text-zinc-400 hover:text-amber-300 rounded text-[9px] font-bold"
                  title="Middle-Right"
                >
                  →
                </button>
                <button
                  onClick={() => handleAlign('left', 'bottom')}
                  className="w-5 h-5 bg-zinc-800 hover:bg-amber-500/20 text-zinc-400 hover:text-amber-300 rounded text-[9px] font-bold"
                  title="Bottom-Left"
                >
                  ↙
                </button>
                <button
                  onClick={() => handleAlign('center', 'bottom')}
                  className="w-5 h-5 bg-zinc-800 hover:bg-amber-500/20 text-zinc-400 hover:text-amber-300 rounded text-[9px] font-bold"
                  title="Bottom-Center"
                >
                  ↓
                </button>
                <button
                  onClick={() => handleAlign('right', 'bottom')}
                  className="w-5 h-5 bg-zinc-800 hover:bg-amber-500/20 text-zinc-400 hover:text-amber-300 rounded text-[9px] font-bold"
                  title="Bottom-Right"
                >
                  ↘
                </button>
              </div>

              {/* Typeable Coordinates Pan X and Pan Y */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-zinc-500 font-mono">X:</span>
                  <input
                    type="number"
                    value={panXInput}
                    onChange={handlePanXInputChange}
                    className="w-14 bg-zinc-900 border border-zinc-700 rounded px-1 py-0.5 text-[11px] font-mono text-zinc-200 text-right"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-zinc-500 font-mono">Y:</span>
                  <input
                    type="number"
                    value={panYInput}
                    onChange={handlePanYInputChange}
                    className="w-14 bg-zinc-900 border border-zinc-700 rounded px-1 py-0.5 text-[11px] font-mono text-zinc-200 text-right"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Flip & Reset Actions */}
          <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onUpdate({ flipH: !frame.flipH })}
                className={`px-2.5 py-1 text-xs rounded border transition-colors flex items-center gap-1 ${
                  frame.flipH
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800'
                }`}
                title="Flip Horizontal"
              >
                <FlipHorizontal className="w-3.5 h-3.5" /> Flip H
              </button>
              <button
                onClick={() => onUpdate({ flipV: !frame.flipV })}
                className={`px-2.5 py-1 text-xs rounded border transition-colors flex items-center gap-1 ${
                  frame.flipV
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800'
                }`}
                title="Flip Vertical"
              >
                <FlipVertical className="w-3.5 h-3.5" /> Flip V
              </button>
            </div>

            <button
              onClick={handleResetTransform}
              className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-800 transition-colors"
              title="Reset Zoom, Rotation & Pan"
            >
              <RefreshCw className="w-3 h-3" /> Reset
            </button>
          </div>

          {/* Reorder / Swap Frame Position */}
          <div className="bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" />
                Move Frame Position (Swap)
              </span>
              <span className="text-[11px] text-zinc-400 font-mono">
                Frame #{frameIndex + 1} of {totalFrames}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                id={`btn-tab-move-left-${frameIndex}`}
                type="button"
                onClick={() => onMoveFrame?.('left')}
                disabled={frameIndex <= 0}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  frameIndex > 0
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border-zinc-700 hover:border-amber-500/50 cursor-pointer active:scale-95 shadow-sm'
                    : 'bg-zinc-900/40 border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50'
                }`}
                title={frameIndex > 0 ? `Swap with Frame #${frameIndex} (Alt+Left)` : 'Already first frame'}
              >
                <ArrowLeft className="w-4 h-4 text-amber-400" />
                <span>Move Left {frameIndex > 0 ? `(#${frameIndex})` : ''}</span>
              </button>

              <button
                id={`btn-tab-move-right-${frameIndex}`}
                type="button"
                onClick={() => onMoveFrame?.('right')}
                disabled={frameIndex >= totalFrames - 1}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  frameIndex < totalFrames - 1
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border-zinc-700 hover:border-amber-500/50 cursor-pointer active:scale-95 shadow-sm'
                    : 'bg-zinc-900/40 border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50'
                }`}
                title={frameIndex < totalFrames - 1 ? `Swap with Frame #${frameIndex + 2} (Alt+Right)` : 'Already last frame'}
              >
                <span>Move Right {frameIndex < totalFrames - 1 ? `(#${frameIndex + 2})` : ''}</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          </div>

          <div className="text-[11px] text-zinc-400 bg-zinc-950/60 px-2.5 py-1.5 rounded border border-zinc-800/70 flex flex-col gap-0.5">
            <div className="flex items-center justify-between text-zinc-300">
              <span>⌨️ <strong className="text-amber-400">Arrow keys</strong> nudge image • <strong className="text-amber-400">Alt + Left/Right</strong> swaps frame</span>
            </div>
            <div className="text-zinc-500 text-[10px]">
              Hold <kbd className="bg-zinc-800 px-1 rounded text-[10px]">Space</kbd> + Drag to pan canvas. Hold <kbd className="bg-zinc-800 px-1 rounded text-[10px]">Ctrl</kbd> + Scroll to zoom canvas.
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Filters & Tone */}
      {activeTab === 'filters' && (
        <div className="space-y-2.5">
          {/* Quick presets */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => onUpdate({ filters: { ...DEFAULT_FILTERS } })}
              className="px-2 py-1 text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 whitespace-nowrap"
            >
              Normal
            </button>
            <button
              onClick={() =>
                onUpdate({
                  filters: { ...DEFAULT_FILTERS, grayscale: 100, contrast: 125, brightness: 95 },
                })
              }
              className="px-2 py-1 text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 whitespace-nowrap"
            >
              B&W Noir
            </button>
            <button
              onClick={() =>
                onUpdate({
                  filters: { ...DEFAULT_FILTERS, sepia: 40, saturation: 110, vintageWarmth: 50 },
                })
              }
              className="px-2 py-1 text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 whitespace-nowrap"
            >
              Kodak Warm
            </button>
            <button
              onClick={() =>
                onUpdate({
                  filters: { ...DEFAULT_FILTERS, contrast: 130, saturation: 120, brightness: 105 },
                })
              }
              className="px-2 py-1 text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 whitespace-nowrap"
            >
              Cinema Vivid
            </button>
          </div>

          {/* Sliders */}
          <div className="space-y-2 pt-1">
            {/* Brightness */}
            <div>
              <div className="flex justify-between items-center text-[11px] text-zinc-400 mb-0.5">
                <span>Brightness</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="30"
                    max="180"
                    value={frame.filters.brightness}
                    onChange={(e) => updateFilter('brightness', parseInt(e.target.value, 10) || 100)}
                    className="w-12 bg-zinc-900 border border-zinc-700/80 rounded px-1 py-0.5 text-[10px] text-center font-mono text-zinc-300 focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-zinc-500">%</span>
                </div>
              </div>
              <input
                type="range"
                min="30"
                max="180"
                value={frame.filters.brightness}
                onChange={(e) => updateFilter('brightness', parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Contrast */}
            <div>
              <div className="flex justify-between items-center text-[11px] text-zinc-400 mb-0.5">
                <span>Contrast</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="30"
                    max="180"
                    value={frame.filters.contrast}
                    onChange={(e) => updateFilter('contrast', parseInt(e.target.value, 10) || 100)}
                    className="w-12 bg-zinc-900 border border-zinc-700/80 rounded px-1 py-0.5 text-[10px] text-center font-mono text-zinc-300 focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-zinc-500">%</span>
                </div>
              </div>
              <input
                type="range"
                min="30"
                max="180"
                value={frame.filters.contrast}
                onChange={(e) => updateFilter('contrast', parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Saturation */}
            <div>
              <div className="flex justify-between items-center text-[11px] text-zinc-400 mb-0.5">
                <span>Saturation</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="200"
                    value={frame.filters.saturation}
                    onChange={(e) => updateFilter('saturation', parseInt(e.target.value, 10) || 100)}
                    className="w-12 bg-zinc-900 border border-zinc-700/80 rounded px-1 py-0.5 text-[10px] text-center font-mono text-zinc-300 focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-zinc-500">%</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={frame.filters.saturation}
                onChange={(e) => updateFilter('saturation', parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Grayscale */}
            <div>
              <div className="flex justify-between items-center text-[11px] text-zinc-400 mb-0.5">
                <span>B&W Grayscale</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={frame.filters.grayscale}
                    onChange={(e) => updateFilter('grayscale', parseInt(e.target.value, 10) || 0)}
                    className="w-12 bg-zinc-900 border border-zinc-700/80 rounded px-1 py-0.5 text-[10px] text-center font-mono text-zinc-300 focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-zinc-500">%</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={frame.filters.grayscale}
                onChange={(e) => updateFilter('grayscale', parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={handleResetFilters}
              className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Reset Colors
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Custom Text Labels */}
      {activeTab === 'text' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              Top Custom Label <span className="text-zinc-500">(Optional override)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. SCENE 4 EXT. NIGHT"
              value={frame.customTextTop || ''}
              onChange={(e) => onUpdate({ customTextTop: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              Bottom Custom Label <span className="text-zinc-500">(Optional override)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. TAKE 03 - DIR. CUT"
              value={frame.customTextBottom || ''}
              onChange={(e) => onUpdate({ customTextBottom: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div className="text-[11px] text-zinc-500">
            Leave blank to use global prefix/index/suffix numbering.
          </div>
        </div>
      )}
    </div>
  );
};

