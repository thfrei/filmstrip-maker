import React from 'react';
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
  Type
} from 'lucide-react';
import { FrameData, DEFAULT_FILTERS } from '../types';

interface FrameAdjusterProps {
  frame: FrameData;
  frameIndex: number;
  onUpdate: (updated: Partial<FrameData>) => void;
  onRemoveImage: () => void;
  onReplaceImage: () => void;
  onClose: () => void;
}

export const FrameAdjuster: React.FC<FrameAdjusterProps> = ({
  frame,
  frameIndex,
  onUpdate,
  onRemoveImage,
  onReplaceImage,
  onClose,
}) => {
  const [activeTab, setActiveTab] = React.useState<'transform' | 'filters' | 'text'>('transform');

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ zoom: parseFloat(e.target.value) });
  };

  const handleRotationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ rotation: parseInt(e.target.value, 10) });
  };

  const handleRotate90 = (direction: 'cw' | 'ccw') => {
    const delta = direction === 'cw' ? 90 : -90;
    const newRot = (frame.rotation + delta + 360) % 360;
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

  return (
    <div
      id="frame-adjustment-toolbar"
      className="bg-zinc-900/95 backdrop-blur-md border border-zinc-700/80 rounded-xl shadow-2xl p-3.5 text-zinc-100 max-w-md w-full animate-in fade-in zoom-in-95 duration-150 z-30"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header with Title, Frame Number, and Tabs */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <span className="bg-amber-500/20 text-amber-400 font-mono text-xs font-semibold px-2 py-0.5 rounded border border-amber-500/30">
            FRAME #{frameIndex + 1}
          </span>
          <span className="text-xs text-zinc-400 font-medium truncate max-w-[140px]">
            {frame.imageName || 'Selected Frame'}
          </span>
        </div>

        <div className="flex items-center gap-1">
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
            title="Remove Image"
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
          Transform & Pan
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
          Color & Grain
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

      {/* Tab 1: Transform & Pan */}
      {activeTab === 'transform' && (
        <div className="space-y-3">
          {/* Zoom Control */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 flex items-center gap-1">
                <ZoomIn className="w-3.5 h-3.5 text-zinc-500" /> Zoom Scale
              </span>
              <span className="font-mono text-amber-400 font-semibold">{frame.zoom.toFixed(2)}x</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdate({ zoom: Math.max(0.2, frame.zoom - 0.1) })}
                className="p-1 hover:bg-zinc-800 text-zinc-400 rounded transition-colors"
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
                onChange={handleZoomChange}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <button
                onClick={() => onUpdate({ zoom: Math.min(4.0, frame.zoom + 0.1) })}
                className="p-1 hover:bg-zinc-800 text-zinc-400 rounded transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Rotation Control */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 flex items-center gap-1">
                <RotateCw className="w-3.5 h-3.5 text-zinc-500" /> Rotation
              </span>
              <span className="font-mono text-amber-400 font-semibold">{frame.rotation}°</span>
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
                onChange={handleRotationChange}
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

          {/* Flip & Quick Position Actions */}
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

          <div className="text-[11px] text-zinc-500 bg-zinc-950/40 px-2 py-1 rounded border border-zinc-800/50 flex items-center justify-between">
            <span>💡 Tip: Click & drag image to pan. Scroll to zoom.</span>
            {(frame.panX !== 0 || frame.panY !== 0) && (
              <span className="font-mono text-zinc-400 text-[10px]">
                X:{Math.round(frame.panX)} Y:{Math.round(frame.panY)}
              </span>
            )}
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
              <div className="flex justify-between text-[11px] text-zinc-400 mb-0.5">
                <span>Brightness</span>
                <span className="font-mono text-zinc-300">{frame.filters.brightness}%</span>
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
              <div className="flex justify-between text-[11px] text-zinc-400 mb-0.5">
                <span>Contrast</span>
                <span className="font-mono text-zinc-300">{frame.filters.contrast}%</span>
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
              <div className="flex justify-between text-[11px] text-zinc-400 mb-0.5">
                <span>Saturation</span>
                <span className="font-mono text-zinc-300">{frame.filters.saturation}%</span>
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
              <div className="flex justify-between text-[11px] text-zinc-400 mb-0.5">
                <span>B&W Grayscale</span>
                <span className="font-mono text-zinc-300">{frame.filters.grayscale}%</span>
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
