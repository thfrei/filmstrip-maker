import React, { useState } from 'react';
import { 
  Film, 
  Sliders, 
  Type, 
  Download, 
  Sparkles, 
  Layers, 
  Palette, 
  UploadCloud, 
  RefreshCw, 
  Trash2,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Check,
  Zap,
  Maximize,
  Eye,
  EyeOff,
  Archive,
  FolderOpen,
  HardDrive
} from 'lucide-react';
import { FilmStripConfig, AspectRatioType, DEFAULT_CONFIG } from '../types';

interface SidebarControlsProps {
  config: FilmStripConfig;
  onUpdateConfig: (updated: Partial<FilmStripConfig>) => void;
  onResetConfig: () => void;
  onLoadDemoImages: () => void;
  onBatchUpload: (files: FileList) => void;
  onClearAllImages: () => void;
  onOpenExportModal: () => void;
  onOpenProjectModal: () => void;
  filledFramesCount: number;
  totalFramesCount: number;
  lastAutoSavedTime: Date | null;
}

export const SidebarControls: React.FC<SidebarControlsProps> = ({
  config,
  onUpdateConfig,
  onResetConfig,
  onLoadDemoImages,
  onBatchUpload,
  onClearAllImages,
  onOpenExportModal,
  onOpenProjectModal,
  filledFramesCount,
  totalFramesCount,
  lastAutoSavedTime,
}) => {
  // Collapsible section state
  const [openSections, setOpenSections] = useState({
    frames: true,
    stripStyle: true,
    textNumbering: true,
    presets: false,
    export: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Preset definitions
  const applyPreset = (presetName: string) => {
    switch (presetName) {
      case 'kodak_vision3':
        onUpdateConfig({
          filmHeight: 380,
          aspectRatio: '3:2',
          filmBgColor: '#0a0a0d',
          frameBorderColor: '#18181b',
          sprocketFillColor: '#000000',
          sprocketBorderColor: '#27272a',
          sprocketWidth: 16,
          sprocketHeight: 22,
          sprocketRadius: 4,
          sprocketsPerFrame: 4,
          prefix: 'SCENE-',
          suffix: '-A',
          fontColor: '#f59e0b', // Kodak Amber Gold
          fontFamily: 'mono',
          filmStockName: 'KODAK 500T 5219',
          showFilmStockName: true,
          showFrameArrows: true,
          showEdgeBarcodes: true,
        });
        break;
      case 'cinemascope':
        onUpdateConfig({
          filmHeight: 320,
          aspectRatio: '2.39:1',
          filmBgColor: '#07080a',
          frameBorderColor: '#0f172a',
          sprocketFillColor: '#020617',
          sprocketBorderColor: '#1e293b',
          sprocketWidth: 14,
          sprocketHeight: 20,
          sprocketRadius: 3,
          sprocketsPerFrame: 5,
          prefix: 'SCOPE-',
          suffix: 'X',
          fontColor: '#38bdf8', // Neon Cyan
          fontFamily: 'mono',
          filmStockName: 'PANAVISION ANAMORPHIC',
          showFilmStockName: true,
          showFrameArrows: true,
          showEdgeBarcodes: true,
        });
        break;
      case 'ilford_noir':
        onUpdateConfig({
          filmHeight: 390,
          aspectRatio: '4:3',
          filmBgColor: '#050505',
          frameBorderColor: '#262626',
          sprocketFillColor: '#000000',
          sprocketBorderColor: '#404040',
          sprocketWidth: 18,
          sprocketHeight: 24,
          sprocketRadius: 5,
          sprocketsPerFrame: 4,
          prefix: 'ILFORD-',
          suffix: '',
          fontColor: '#f4f4f5', // Crisp White
          fontFamily: 'courier',
          filmStockName: 'ILFORD HP5 PLUS 400',
          showFilmStockName: true,
          showFrameArrows: true,
          showEdgeBarcodes: true,
        });
        break;
      case 'fujifilm_eterna':
        onUpdateConfig({
          filmHeight: 370,
          aspectRatio: '16:9',
          filmBgColor: '#090d0b',
          frameBorderColor: '#14231b',
          sprocketFillColor: '#020b06',
          sprocketBorderColor: '#1b382b',
          sprocketWidth: 16,
          sprocketHeight: 22,
          sprocketRadius: 4,
          sprocketsPerFrame: 4,
          prefix: 'FUJI-',
          suffix: '-ET',
          fontColor: '#34d399', // Emerald Greenish White
          fontFamily: 'mono',
          filmStockName: 'FUJIFILM ETERNA 250D',
          showFilmStockName: true,
          showFrameArrows: true,
          showEdgeBarcodes: true,
        });
        break;
      case 'vintage_16mm':
        onUpdateConfig({
          filmHeight: 310,
          aspectRatio: '4:3',
          filmBgColor: '#120f0c',
          frameBorderColor: '#261d15',
          sprocketFillColor: '#050403',
          sprocketBorderColor: '#3d2e20',
          sprocketWidth: 14,
          sprocketHeight: 16,
          sprocketRadius: 3,
          sprocketsPerFrame: 2,
          prefix: '16MM-',
          suffix: '',
          fontColor: '#fb923c', // Warm Vintage Orange
          fontFamily: 'courier',
          filmStockName: 'EASTMAN KODACHROME',
          showFilmStockName: true,
          showFrameArrows: false,
          showEdgeBarcodes: false,
        });
        break;
    }
  };

  return (
    <aside
      id="sidebar-film-controls"
      className="w-full lg:w-84 xl:w-92 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full overflow-hidden shrink-0 select-none text-zinc-100"
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-zinc-950 font-black shadow-md shadow-amber-500/20">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-zinc-100 leading-none">
              Cinema Film Strip
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-zinc-400 font-mono" title="Auto-saved to browser IndexedDB">
                {lastAutoSavedTime ? 'Auto-Saved' : 'Ready'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            id="btn-open-project-manager"
            onClick={onOpenProjectModal}
            title="Save / Open Project (.filmproj, .zip, .filmjson)"
            className="p-1.5 hover:bg-zinc-800 text-amber-400 hover:text-amber-300 rounded-md transition-colors text-xs flex items-center gap-1 border border-zinc-700/60"
          >
            <Archive className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold pr-0.5">Project</span>
          </button>

          <button
            onClick={onResetConfig}
            title="Reset to default settings"
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-md transition-colors text-xs flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Action Bar */}
      <div className="p-3 bg-zinc-950/40 border-b border-zinc-800/80 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            id="btn-load-sample-stills"
            onClick={onLoadDemoImages}
            className="py-1.5 px-2.5 bg-zinc-800 hover:bg-zinc-700/80 text-zinc-200 rounded-lg text-xs font-medium border border-zinc-700 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Load Demo Stills
          </button>

          <button
            id="btn-batch-upload"
            onClick={() => fileInputRef.current?.click()}
            className="py-1.5 px-2.5 bg-zinc-800 hover:bg-zinc-700/80 text-zinc-200 rounded-lg text-xs font-medium border border-zinc-700 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-400" />
            Batch Upload
          </button>
        </div>

        <button
          id="btn-save-load-project-quick"
          onClick={onOpenProjectModal}
          className="w-full py-1.5 px-2.5 bg-zinc-900 hover:bg-zinc-800/90 text-amber-300 rounded-lg text-xs font-medium border border-amber-500/30 flex items-center justify-center gap-1.5 transition-all"
        >
          <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
          <span>Save / Open Project File (.filmproj / .zip)</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onBatchUpload(e.target.files);
              e.target.value = '';
            }
          }}
        />
      </div>

      {/* Scrollable Accordions */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60 text-xs">
        {/* SECTION 1: Frame Count & Dimensions */}
        <div className="p-3.5 space-y-3">
          <button
            onClick={() => toggleSection('frames')}
            className="w-full flex items-center justify-between font-semibold text-zinc-200 hover:text-white"
          >
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              Frames & Dimensions
            </span>
            {openSections.frames ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
          </button>

          {openSections.frames && (
            <div className="space-y-3 pt-1 animate-in fade-in duration-150">
              {/* Frame Count Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-zinc-400">Frame Count (1 - 10)</label>
                  <span className="font-mono text-amber-400 font-bold bg-zinc-800/80 px-2 py-0.5 rounded text-xs">
                    {config.frameCount} frames
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={config.frameCount}
                  onChange={(e) => onUpdateConfig({ frameCount: parseInt(e.target.value, 10) })}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between gap-1 pt-0.5">
                  {[1, 3, 4, 6, 8, 10].map((num) => (
                    <button
                      key={num}
                      onClick={() => onUpdateConfig({ frameCount: num })}
                      className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                        config.frameCount === num
                          ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                          : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Film Height Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-zinc-400">Film Height</label>
                  <span className="font-mono text-zinc-300">{config.filmHeight} px</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="600"
                  step="10"
                  value={config.filmHeight}
                  onChange={(e) => onUpdateConfig({ filmHeight: parseInt(e.target.value, 10) })}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              {/* Frame Aspect Ratio */}
              <div className="space-y-1.5">
                <label className="text-zinc-400 block">Frame Aspect Ratio</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: '3:2', label: '3:2', sub: '35mm Classic' },
                    { id: '16:9', label: '16:9', sub: 'Widescreen' },
                    { id: '4:3', label: '4:3', sub: 'Academy' },
                    { id: '1:1', label: '1:1', sub: 'Square' },
                    { id: '2.39:1', label: '2.39:1', sub: 'Cinemascope' },
                    { id: 'custom', label: 'Custom', sub: 'Ratio' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      onClick={() => onUpdateConfig({ aspectRatio: r.id as AspectRatioType })}
                      className={`p-1.5 text-left rounded-lg border transition-all ${
                        config.aspectRatio === r.id
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-semibold'
                          : 'bg-zinc-800/40 border-zinc-700/40 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <div className="text-[11px] leading-tight font-medium">{r.label}</div>
                      <div className="text-[9px] text-zinc-400 truncate">{r.sub}</div>
                    </button>
                  ))}
                </div>

                {config.aspectRatio === 'custom' && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={config.customAspectWidth}
                      onChange={(e) => onUpdateConfig({ customAspectWidth: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                      className="w-1/2 bg-zinc-950 border border-zinc-700 rounded p-1.5 text-center font-mono text-xs"
                      placeholder="W"
                    />
                    <span className="text-zinc-500 font-bold">:</span>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={config.customAspectHeight}
                      onChange={(e) => onUpdateConfig({ customAspectHeight: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                      className="w-1/2 bg-zinc-950 border border-zinc-700 rounded p-1.5 text-center font-mono text-xs"
                      placeholder="H"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: Film Strip & Sprocket Styling */}
        <div className="p-3.5 space-y-3">
          <button
            onClick={() => toggleSection('stripStyle')}
            className="w-full flex items-center justify-between font-semibold text-zinc-200 hover:text-white"
          >
            <span className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              Film Strip & Sprocket Styling
            </span>
            {openSections.stripStyle ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
          </button>

          {openSections.stripStyle && (
            <div className="space-y-3 pt-1 animate-in fade-in duration-150">
              {/* Outer Border & Divider Sliders */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-zinc-400 text-[11px]">
                    <span>Outer Border</span>
                    <span className="font-mono text-zinc-300">{config.outerBorderWidth}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="18"
                    value={config.outerBorderWidth}
                    onChange={(e) => onUpdateConfig({ outerBorderWidth: parseInt(e.target.value, 10) })}
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-zinc-400 text-[11px]">
                    <span>Frame Dividers</span>
                    <span className="font-mono text-zinc-300">{config.frameDividerWidth}px</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="28"
                    value={config.frameDividerWidth}
                    onChange={(e) => onUpdateConfig({ frameDividerWidth: parseInt(e.target.value, 10) })}
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>
              </div>

              {/* Sprocket Hole Dimensions */}
              <div className="space-y-1.5 bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800">
                <div className="text-zinc-300 font-medium text-[11px] mb-1">
                  Sprocket Perforations
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-zinc-400">Width</span>
                    <input
                      type="range"
                      min="10"
                      max="26"
                      value={config.sprocketWidth}
                      onChange={(e) => onUpdateConfig({ sprocketWidth: parseInt(e.target.value, 10) })}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <span className="font-mono text-[10px] text-zinc-400">{config.sprocketWidth}px</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-zinc-400">Height</span>
                    <input
                      type="range"
                      min="12"
                      max="32"
                      value={config.sprocketHeight}
                      onChange={(e) => onUpdateConfig({ sprocketHeight: parseInt(e.target.value, 10) })}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <span className="font-mono text-[10px] text-zinc-400">{config.sprocketHeight}px</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-zinc-400">Corner Radius</span>
                    <input
                      type="range"
                      min="0"
                      max="8"
                      value={config.sprocketRadius}
                      onChange={(e) => onUpdateConfig({ sprocketRadius: parseInt(e.target.value, 10) })}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <span className="font-mono text-[10px] text-zinc-400">{config.sprocketRadius}px</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-zinc-400">Perforations per frame</span>
                  <div className="flex gap-1">
                    {[2, 3, 4, 5].map((cnt) => (
                      <button
                        key={cnt}
                        onClick={() => onUpdateConfig({ sprocketsPerFrame: cnt })}
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          config.sprocketsPerFrame === cnt
                            ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Color Scheme Picker */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Film Base Color</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={config.filmBgColor}
                      onChange={(e) => onUpdateConfig({ filmBgColor: e.target.value })}
                      className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <span className="font-mono text-[10px] text-zinc-400 uppercase">{config.filmBgColor}</span>
                  </div>
                </div>

                {/* Quick color swatches */}
                <div className="flex gap-1.5">
                  {[
                    { color: '#0a0a0c', name: 'Kodak Black' },
                    { color: '#18181b', name: 'Dark Zinc' },
                    { color: '#0f172a', name: 'Cinema Slate' },
                    { color: '#17120e', name: 'Vintage Sepia' },
                    { color: '#1e1b18', name: 'Warm Charcoal' },
                  ].map((c) => (
                    <button
                      key={c.color}
                      onClick={() => onUpdateConfig({ filmBgColor: c.color })}
                      style={{ backgroundColor: c.color }}
                      className={`flex-1 h-6 rounded-md border transition-transform ${
                        config.filmBgColor.toLowerCase() === c.color.toLowerCase()
                          ? 'ring-2 ring-amber-500 scale-105 border-zinc-400'
                          : 'border-zinc-700 hover:scale-105'
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              {/* Sprocket Hole Fill Color */}
              <div className="flex justify-between items-center pt-1">
                <span className="text-zinc-400">Sprocket Hole Fill</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={config.sprocketFillColor === 'transparent' ? '#000000' : config.sprocketFillColor}
                    onChange={(e) => onUpdateConfig({ sprocketFillColor: e.target.value })}
                    className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <button
                    onClick={() => onUpdateConfig({ sprocketFillColor: '#000000' })}
                    className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 rounded text-[10px] text-zinc-300"
                  >
                    Pure Black
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: Text, Numbering & Edge Markings */}
        <div className="p-3.5 space-y-3">
          <button
            onClick={() => toggleSection('textNumbering')}
            className="w-full flex items-center justify-between font-semibold text-zinc-200 hover:text-white"
          >
            <span className="flex items-center gap-2">
              <Type className="w-4 h-4 text-amber-400" />
              Text, Numbering & Edge Codes
            </span>
            {openSections.textNumbering ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
          </button>

          {openSections.textNumbering && (
            <div className="space-y-3 pt-1 animate-in fade-in duration-150">
              {/* Prefix & Suffix Inputs */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-400 block mb-1">Prefix</label>
                  <input
                    type="text"
                    value={config.prefix}
                    onChange={(e) => onUpdateConfig({ prefix: e.target.value })}
                    placeholder="SCENE-"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-md p-1.5 font-mono text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1">Suffix</label>
                  <input
                    type="text"
                    value={config.suffix}
                    onChange={(e) => onUpdateConfig({ suffix: e.target.value })}
                    placeholder="-A"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-md p-1.5 font-mono text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Start Number & Pad Zeroes */}
              <div className="grid grid-cols-2 gap-2 items-center">
                <div>
                  <label className="text-zinc-400 block mb-1">Start Index</label>
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={config.startNumber}
                    onChange={(e) => onUpdateConfig({ startNumber: parseInt(e.target.value, 10) || 1 })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-md p-1.5 font-mono text-xs text-zinc-200"
                  />
                </div>

                <div className="pt-4">
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                    <input
                      type="checkbox"
                      checked={config.padZeroes}
                      onChange={(e) => onUpdateConfig({ padZeroes: e.target.checked })}
                      className="rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-0 cursor-pointer"
                    />
                    <span>Pad (01, 02)</span>
                  </label>
                </div>
              </div>

              {/* Top & Bottom Text Visibility Toggles */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onUpdateConfig({ showTopText: !config.showTopText })}
                  className={`p-2 rounded-lg border text-left flex items-center justify-between ${
                    config.showTopText
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 font-medium'
                      : 'bg-zinc-800/40 border-zinc-700/40 text-zinc-500'
                  }`}
                >
                  <span>Top Labels</span>
                  {config.showTopText ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={() => onUpdateConfig({ showBottomText: !config.showBottomText })}
                  className={`p-2 rounded-lg border text-left flex items-center justify-between ${
                    config.showBottomText
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 font-medium'
                      : 'bg-zinc-800/40 border-zinc-700/40 text-zinc-500'
                  }`}
                >
                  <span>Bottom Labels</span>
                  {config.showBottomText ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Font Color & Style */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Text & Ink Color</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={config.fontColor}
                      onChange={(e) => onUpdateConfig({ fontColor: e.target.value })}
                      className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <span className="font-mono text-[10px] text-zinc-400 uppercase">{config.fontColor}</span>
                  </div>
                </div>

                <div className="flex gap-1.5">
                  {[
                    { color: '#f59e0b', name: 'Kodak Amber' },
                    { color: '#f4f4f5', name: 'Clean White' },
                    { color: '#38bdf8', name: 'Cyan Neon' },
                    { color: '#fb923c', name: 'Fujifilm Orange' },
                    { color: '#f43f5e', name: 'Cine Ruby' },
                  ].map((c) => (
                    <button
                      key={c.color}
                      onClick={() => onUpdateConfig({ fontColor: c.color })}
                      style={{ backgroundColor: c.color }}
                      className={`flex-1 h-5 rounded border transition-transform ${
                        config.fontColor.toLowerCase() === c.color.toLowerCase()
                          ? 'ring-2 ring-white scale-105'
                          : 'border-zinc-700 hover:scale-105'
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              {/* Font Family Selection */}
              <div className="space-y-1.5">
                <label className="text-zinc-400 block">Typography Style</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'mono', label: 'Mono Strip', font: 'font-mono-film' },
                    { id: 'courier', label: 'Typewriter', font: 'font-courier' },
                    { id: 'sans', label: 'Modern Sans', font: 'font-sans' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => onUpdateConfig({ fontFamily: f.id as any })}
                      className={`p-1.5 rounded-lg border text-center transition-colors ${f.font} ${
                        config.fontFamily === f.id
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                          : 'bg-zinc-800/40 border-zinc-700/40 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Film Stock Branding & Edge Marks */}
              <div className="space-y-2 bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800">
                <div className="flex items-center justify-between">
                  <label className="text-zinc-300 font-medium text-[11px]">
                    Film Stock Edge Brand
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-zinc-400">
                    <input
                      type="checkbox"
                      checked={config.showFilmStockName}
                      onChange={(e) => onUpdateConfig({ showFilmStockName: e.target.checked })}
                      className="rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-0"
                    />
                    <span>Show</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={config.filmStockName}
                  onChange={(e) => onUpdateConfig({ filmStockName: e.target.value })}
                  placeholder="KODAK 500T 5219"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded p-1.5 font-mono text-[11px] text-zinc-200"
                />

                <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-400">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.showFrameArrows}
                      onChange={(e) => onUpdateConfig({ showFrameArrows: e.target.checked })}
                      className="rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-0"
                    />
                    <span>Frame Arrows (▲ 24A ▲)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.showEdgeBarcodes}
                      onChange={(e) => onUpdateConfig({ showEdgeBarcodes: e.target.checked })}
                      className="rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-0"
                    />
                    <span>DX Barcode</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 4: Film Stock Presets */}
        <div className="p-3.5 space-y-3">
          <button
            onClick={() => toggleSection('presets')}
            className="w-full flex items-center justify-between font-semibold text-zinc-200 hover:text-white"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Authentic Film Stock Presets
            </span>
            {openSections.presets ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
          </button>

          {openSections.presets && (
            <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
              {[
                { id: 'kodak_vision3', title: 'Kodak Vision3 500T 35mm', desc: 'Standard 35mm Hollywood cine strip' },
                { id: 'cinemascope', title: 'Panavision Cinemascope 2.39:1', desc: 'Ultra-widescreen anamorphic' },
                { id: 'ilford_noir', title: 'Ilford HP5 Plus 400 Noir', desc: 'Classic 4:3 high-contrast black & white' },
                { id: 'fujifilm_eterna', title: 'Fujifilm Eterna 250D', desc: '16:9 modern cinema palette' },
                { id: 'vintage_16mm', title: 'Eastman 16mm Vintage Cine', desc: 'Compact perforations & warm tones' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className="w-full text-left p-2 rounded-lg bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-700/50 hover:border-amber-500/40 transition-colors group"
                >
                  <div className="font-semibold text-zinc-200 group-hover:text-amber-300 text-xs">
                    {p.title}
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Sticky Footer with Main Export Button */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-900/95 space-y-2.5">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>
            Frames filled:{' '}
            <strong className="text-zinc-200">
              {filledFramesCount} / {totalFramesCount}
            </strong>
          </span>
          {filledFramesCount > 0 && (
            <button
              onClick={onClearAllImages}
              className="text-zinc-400 hover:text-rose-400 transition-colors flex items-center gap-1 text-[11px]"
            >
              <Trash2 className="w-3 h-3" /> Clear Images
            </button>
          )}
        </div>

        <button
          id="btn-export-film-strip-sidebar"
          onClick={onOpenExportModal}
          className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all cursor-pointer"
        >
          <Download className="w-4.5 h-4.5" />
          Export Film Strip
        </button>
      </div>
    </aside>
  );
};
