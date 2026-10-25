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
  HardDrive,
  Printer,
  Scissors,
  X
} from 'lucide-react';
import { FilmStripConfig, AspectRatioType, DEFAULT_CONFIG, FrameData } from '../types';
import { FrameBottomBar } from './FrameBottomBar';
import { calculateFilmStripGeometry } from '../utils/canvasExport';

interface SidebarControlsProps {
  config: FilmStripConfig;
  frames: FrameData[];
  selectedFrameIndex: number | null;
  onSelectFrame: (index: number | null) => void;
  onUpdateFrame: (index: number, data: Partial<FrameData>) => void;
  onRemoveImageFromFrame: (index: number) => void;
  onUploadImageForFrame: (index: number, file: File) => void;
  onMoveFrame?: (fromIndex: number, direction: 'left' | 'right') => void;
  onUpdateConfig: (updated: Partial<FilmStripConfig>) => void;
  onResetConfig: () => void;
  onLoadDemoImages: () => void;
  onBatchUpload: (files: FileList) => void;
  onClearAllImages: () => void;
  onOpenExportModal: () => void;
  onOpenProjectModal: () => void;
  onToggleMovieDeck?: () => void;
  isVideoLoaded?: boolean;
  filledFramesCount: number;
  totalFramesCount: number;
  lastAutoSavedTime: Date | null;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const SidebarControls: React.FC<SidebarControlsProps> = ({
  config,
  frames,
  selectedFrameIndex,
  onSelectFrame,
  onUpdateFrame,
  onRemoveImageFromFrame,
  onUploadImageForFrame,
  onMoveFrame,
  onUpdateConfig,
  onResetConfig,
  onLoadDemoImages,
  onBatchUpload,
  onClearAllImages,
  onOpenExportModal,
  onOpenProjectModal,
  onToggleMovieDeck,
  isVideoLoaded,
  filledFramesCount,
  totalFramesCount,
  lastAutoSavedTime,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  // Collapsible group state
  const [openGroups, setOpenGroups] = useState({
    filmstripSettings: true,
    frameSettings: true,
  });

  const toggleGroup = (group: keyof typeof openGroups) => {
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  // Collapsible section state
  const [openSections, setOpenSections] = useState({
    frames: true,
    stripStyle: true,
    textNumbering: true,
    edgeCodes: true,
    presets: false,
    export: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const frameFileInputRef = React.useRef<HTMLInputElement>(null);

  const geo = calculateFilmStripGeometry(config, 1);
  const selectedFrame = selectedFrameIndex !== null ? frames[selectedFrameIndex] ?? null : null;

  // Preset definitions
  const applyPreset = (presetName: string) => {
    switch (presetName) {
      case 'kodak_vision3':
        onUpdateConfig({
          filmHeight: 380,
          aspectRatio: '3:2',
          filmBgColor: '#000000',
          frameBgColor: '#050508',
          frameBorderColor: '#18181b',
          sprocketFillColor: '#ffffff',
          sprocketBorderColor: '#27272a',
          sprocketWidth: 12,
          sprocketHeight: 18,
          sprocketRadius: 4,
          sprocketDistance: 24,
          sprocketsPerFrame: 4,
          sprocketMarginTop: 6,
          textMarginTop: 8,
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
          frameBgColor: '#020617',
          frameBorderColor: '#0f172a',
          sprocketFillColor: '#ffffff',
          sprocketBorderColor: '#1e293b',
          sprocketWidth: 12,
          sprocketHeight: 18,
          sprocketRadius: 4,
          sprocketDistance: 24,
          sprocketsPerFrame: 5,
          sprocketMarginTop: 4,
          textMarginTop: 6,
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
          frameBgColor: '#09090b',
          frameBorderColor: '#262626',
          sprocketFillColor: '#ffffff',
          sprocketBorderColor: '#404040',
          sprocketWidth: 12,
          sprocketHeight: 18,
          sprocketRadius: 4,
          sprocketDistance: 24,
          sprocketsPerFrame: 4,
          sprocketMarginTop: 6,
          textMarginTop: 8,
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
          frameBgColor: '#020b06',
          frameBorderColor: '#14231b',
          sprocketFillColor: '#ffffff',
          sprocketBorderColor: '#1b382b',
          sprocketWidth: 12,
          sprocketHeight: 18,
          sprocketRadius: 4,
          sprocketDistance: 24,
          sprocketsPerFrame: 4,
          sprocketMarginTop: 6,
          textMarginTop: 8,
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
          frameBgColor: '#050403',
          frameBorderColor: '#261d15',
          sprocketFillColor: '#ffffff',
          sprocketBorderColor: '#3d2e20',
          sprocketWidth: 10,
          sprocketHeight: 14,
          sprocketRadius: 3,
          sprocketDistance: 32,
          sprocketsPerFrame: 2,
          sprocketMarginTop: 4,
          textMarginTop: 6,
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
      className={`fixed lg:static inset-y-0 left-0 z-50 w-[85vw] max-w-[20rem] lg:max-w-none lg:w-84 xl:w-92 bg-zinc-900 border-r border-zinc-800 flex flex-col lg:h-full overflow-hidden shrink-0 select-none text-zinc-100 transition-transform duration-200 ease-out shadow-2xl lg:shadow-none pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] lg:pt-0 lg:pb-0 ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
      aria-label="Film strip controls"
    >
      {/* Sidebar Header */}
      <div className="p-3 sm:p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90 backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-zinc-950 font-black shadow-md shadow-amber-500/20">
            <Film className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold tracking-tight text-zinc-100 leading-none truncate">
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

        <div className="flex items-center gap-1 shrink-0">
          <button
            id="btn-open-project-manager"
            onClick={onOpenProjectModal}
            title="Save / Open Project (.filmproj, .zip, .filmjson)"
            className="p-1.5 hover:bg-zinc-800 text-amber-400 hover:text-amber-300 rounded-md transition-colors text-xs flex items-center gap-1 border border-zinc-700/60"
          >
            <Archive className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold pr-0.5 hidden sm:inline">Project</span>
          </button>

          <button
            onClick={onResetConfig}
            title="Reset to default settings"
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-md transition-colors text-xs flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              title="Close Controls Panel"
              aria-label="Close controls panel"
              className="lg:hidden p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
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

        {onToggleMovieDeck && (
          <button
            id="btn-sidebar-open-movie-deck"
            onClick={onToggleMovieDeck}
            className="w-full py-1.5 px-2.5 bg-gradient-to-r from-amber-500/15 to-amber-600/15 hover:from-amber-500/25 hover:to-amber-600/25 text-amber-300 rounded-lg text-xs font-semibold border border-amber-500/40 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:border-amber-400"
            title="Open video frame extractor deck with full-width timeline slider"
          >
            <Film className="w-3.5 h-3.5 text-amber-400" />
            <span>🎬 Movie Frame Extractor</span>
            {isVideoLoaded && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        )}

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
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain text-xs">
        {/* ===== GROUP: FILMSTRIP SETTINGS ===== */}
        <div>
          <button
            type="button"
            onClick={() => toggleGroup('filmstripSettings')}
            className="w-full flex items-center justify-between px-3.5 py-3 bg-zinc-950/60 border-b border-zinc-800 text-[11px] font-bold uppercase tracking-wider text-amber-400/90 hover:bg-zinc-900/80 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Film className="w-4 h-4 text-amber-400" />
              Filmstrip Settings
            </span>
            {openGroups.filmstripSettings ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
          </button>
          {openGroups.filmstripSettings && (
            <div className="divide-y divide-zinc-800/60">
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
                  <label className="text-zinc-400 font-medium">Frame Count (1 - 10)</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={config.frameCount}
                      onChange={(e) => onUpdateConfig({ frameCount: Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1)) })}
                      className="w-14 bg-zinc-900 border border-zinc-700/80 rounded px-1.5 py-0.5 text-xs text-center font-mono text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-[10px] text-zinc-500">frames</span>
                  </div>
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
                  <label className="text-zinc-400 font-medium">Film Height</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="150"
                      max="800"
                      step="10"
                      value={config.filmHeight}
                      onChange={(e) => onUpdateConfig({ filmHeight: Math.max(150, parseInt(e.target.value, 10) || 200) })}
                      className="w-16 bg-zinc-900 border border-zinc-700/80 rounded px-1.5 py-0.5 text-xs text-center font-mono text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-[10px] text-zinc-500">px</span>
                  </div>
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
                <label className="text-zinc-400 block font-medium">Frame Aspect Ratio</label>
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
            <div className="space-y-3.5 pt-1 animate-in fade-in duration-150">
              {/* Spacing & Margins Hierarchy */}
              <div className="bg-amber-500/5 p-2.5 rounded-lg border border-amber-500/20 space-y-2.5">
                <div className="text-zinc-200 font-medium text-[11px] flex items-center justify-between">
                  <span className="font-semibold text-amber-300">Layout & Margin Hierarchy</span>
                  <span className="text-[10px] text-amber-400 font-mono">Edge → Text → Sprockets → Frames</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-zinc-300 text-[11px]">
                      <span>Sprocket-to-Frame Gap</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="60"
                          value={config.frameMargin ?? 12}
                          onChange={(e) => onUpdateConfig({ frameMargin: parseInt(e.target.value, 10) || 0 })}
                          className="w-12 bg-zinc-900 border border-zinc-700/80 rounded px-1 py-0.5 text-xs text-center font-mono text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                        />
                        <span className="text-[10px] text-zinc-500">px</span>
                      </div>
                    </div>
                    <input
                      id="slider-frame-margin"
                      type="range"
                      min="2"
                      max="40"
                      value={config.frameMargin ?? 12}
                      onChange={(e) => onUpdateConfig({ frameMargin: parseInt(e.target.value, 10) })}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-zinc-300 text-[11px]">
                      <span>Sprocket-to-Text Gap</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="-5"
                          max="20"
                          value={config.sprocketMarginTop ?? 6}
                          onChange={(e) => onUpdateConfig({ sprocketMarginTop: parseInt(e.target.value, 10) || 0 })}
                          className="w-12 bg-zinc-900 border border-zinc-700/80 rounded px-1 py-0.5 text-xs text-center font-mono text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                        />
                        <span className="text-[10px] text-zinc-500">px</span>
                      </div>
                    </div>
                    <input
                      id="slider-sprocket-margin"
                      type="range"
                      min="-5"
                      max="20"
                      value={config.sprocketMarginTop ?? 6}
                      onChange={(e) => onUpdateConfig({ sprocketMarginTop: parseInt(e.target.value, 10) })}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                </div>

                {/* Outer Border, Frame Dividers & Frame Border */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-zinc-800/80">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-zinc-400 text-[10px]">
                      <span>Divider</span>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={config.frameDividerWidth}
                        onChange={(e) => onUpdateConfig({ frameDividerWidth: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                        className="w-10 bg-zinc-900 border border-zinc-700/80 rounded px-1 py-0.5 text-[10px] text-center font-mono text-zinc-300 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="36"
                      value={config.frameDividerWidth}
                      onChange={(e) => onUpdateConfig({ frameDividerWidth: parseInt(e.target.value, 10) })}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-zinc-400 text-[10px]">
                      <span>Outer Border</span>
                      <input
                        type="number"
                        min="0"
                        max="40"
                        value={config.outerBorderWidth}
                        onChange={(e) => onUpdateConfig({ outerBorderWidth: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                        className="w-10 bg-zinc-900 border border-zinc-700/80 rounded px-1 py-0.5 text-[10px] text-center font-mono text-zinc-300 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="24"
                      value={config.outerBorderWidth}
                      onChange={(e) => onUpdateConfig({ outerBorderWidth: parseInt(e.target.value, 10) })}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-zinc-400 text-[10px]">
                      <span>Frame Line</span>
                      <input
                        type="number"
                        min="0"
                        max="16"
                        value={config.frameBorderWidth}
                        onChange={(e) => onUpdateConfig({ frameBorderWidth: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                        className="w-10 bg-zinc-900 border border-zinc-700/80 rounded px-1 py-0.5 text-[10px] text-center font-mono text-zinc-300 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="8"
                      value={config.frameBorderWidth}
                      onChange={(e) => onUpdateConfig({ frameBorderWidth: parseInt(e.target.value, 10) })}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Sprockets Per Frame Control */}
              <div className="space-y-2.5 bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-zinc-200 font-semibold text-[11px]">Sprockets Per Frame</span>
                    <p className="text-[10px] text-zinc-400">Controls number of perforations per frame (4 – 10)</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      id="input-sprockets-per-frame"
                      type="number"
                      min="4"
                      max="10"
                      value={config.sprocketsPerFrame ?? 5}
                      onChange={(e) => onUpdateConfig({ sprocketsPerFrame: Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 5)) })}
                      className="w-12 bg-zinc-900 border border-zinc-700/80 rounded px-1 py-0.5 text-xs text-center font-mono text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-[10px] text-zinc-500">holes</span>
                  </div>
                </div>

                <input
                  id="slider-sprockets-per-frame"
                  type="range"
                  min="4"
                  max="10"
                  step="1"
                  value={config.sprocketsPerFrame ?? 5}
                  onChange={(e) => onUpdateConfig({ sprocketsPerFrame: parseInt(e.target.value, 10) })}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />

                {/* Sprockets per frame quick buttons */}
                <div className="grid grid-cols-7 gap-1">
                  {[4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      onClick={() => onUpdateConfig({ sprocketsPerFrame: num })}
                      className={`py-1 px-0.5 text-center rounded border transition-colors ${
                        (config.sprocketsPerFrame ?? 5) === num
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                          : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:bg-zinc-800'
                      }`}
                    >
                      <div className="text-[10px] leading-none">{num}</div>
                    </button>
                  ))}
                </div>

                {/* Sprocket Hole Dimensions */}
                <div className="pt-2 border-t border-zinc-800/80">
                  <div className="text-zinc-300 font-medium text-[11px] mb-1.5">
                    Sprocket Dimensions (Default 12×18, 4px)
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] text-zinc-400">
                        <span>Width</span>
                        <input
                          type="number"
                          min="4"
                          max="40"
                          value={config.sprocketWidth ?? 12}
                          onChange={(e) => onUpdateConfig({ sprocketWidth: Math.max(2, parseInt(e.target.value, 10) || 2) })}
                          className="w-10 bg-zinc-900 border border-zinc-700/80 rounded px-1 py-0.5 text-[10px] text-center font-mono text-zinc-300 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <input
                        type="range"
                        min="6"
                        max="28"
                        value={config.sprocketWidth ?? 12}
                        onChange={(e) => onUpdateConfig({ sprocketWidth: parseInt(e.target.value, 10) })}
                        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] text-zinc-400">
                        <span>Height</span>
                        <input
                          type="number"
                          min="4"
                          max="50"
                          value={config.sprocketHeight ?? 18}
                          onChange={(e) => onUpdateConfig({ sprocketHeight: Math.max(2, parseInt(e.target.value, 10) || 2) })}
                          className="w-10 bg-zinc-900 border border-zinc-700/80 rounded px-1 py-0.5 text-[10px] text-center font-mono text-zinc-300 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <input
                        type="range"
                        min="8"
                        max="34"
                        value={config.sprocketHeight ?? 18}
                        onChange={(e) => onUpdateConfig({ sprocketHeight: parseInt(e.target.value, 10) })}
                        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] text-zinc-400">
                        <span>Radius</span>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={config.sprocketRadius ?? 4}
                          onChange={(e) => onUpdateConfig({ sprocketRadius: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                          className="w-10 bg-zinc-900 border border-zinc-700/80 rounded px-1 py-0.5 text-[10px] text-center font-mono text-zinc-300 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={config.sprocketRadius ?? 4}
                        onChange={(e) => onUpdateConfig({ sprocketRadius: parseInt(e.target.value, 10) })}
                        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sprocket Hole Fill Color */}
              <div className="space-y-1.5 bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-300 font-medium text-[11px]">Sprocket Hole Fill Color</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      id="input-sprocket-fill-color"
                      type="color"
                      value={config.sprocketFillColor === 'transparent' ? '#ffffff' : config.sprocketFillColor}
                      onChange={(e) => onUpdateConfig({ sprocketFillColor: e.target.value })}
                      className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <span className="font-mono text-[10px] text-zinc-400 uppercase">
                      {config.sprocketFillColor === 'transparent' ? 'TRANSPARENT' : config.sprocketFillColor}
                    </span>
                  </div>
                </div>

                {/* Quick Swatch Presets for Sprocket Hole Fill */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[
                    { color: '#ffffff', label: 'White (Default)' },
                    { color: '#000000', label: 'Black' },
                    { color: '#18181b', label: 'Dark Zinc' },
                    { color: '#fef3c7', label: 'Warm Glow' },
                  ].map((s) => (
                    <button
                      key={s.color}
                      onClick={() => onUpdateConfig({ sprocketFillColor: s.color })}
                      className={`px-1.5 py-1 text-[10px] rounded border flex items-center justify-center gap-1 font-medium transition-all ${
                        config.sprocketFillColor.toLowerCase() === s.color.toLowerCase()
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-zinc-600 shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="truncate">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Picture Frame Background Color */}
              <div className="space-y-1.5 bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-zinc-300 font-medium text-[11px]">Picture Frame Background</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      id="input-frame-bg-color"
                      type="color"
                      value={config.frameBgColor || '#050508'}
                      onChange={(e) => onUpdateConfig({ frameBgColor: e.target.value })}
                      className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                      title="Choose custom picture frame background"
                    />
                    <input
                      type="text"
                      value={(config.frameBgColor || '#050508').toUpperCase()}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.startsWith('#') || val.length <= 7) {
                          onUpdateConfig({ frameBgColor: val });
                        }
                      }}
                      className="font-mono text-[10px] text-zinc-300 bg-zinc-900 border border-zinc-700/80 rounded px-1.5 py-0.5 w-16 text-center uppercase focus:outline-none focus:border-amber-500"
                    />
                    {config.frameBgColor && config.frameBgColor.toLowerCase() !== '#050508' && (
                      <button
                        type="button"
                        onClick={() => onUpdateConfig({ frameBgColor: '#050508' })}
                        title="Reset to default Dark Matte (#050508)"
                        className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-amber-400 transition-colors"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Swatch 4 Presets for Picture Frame Background */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[
                    { color: '#050508', label: 'Dark (Default)' },
                    { color: '#000000', label: 'Pure Black' },
                    { color: '#18181b', label: 'Dark Zinc' },
                    { color: '#ffffff', label: 'White' },
                  ].map((s) => (
                    <button
                      key={s.color}
                      type="button"
                      onClick={() => onUpdateConfig({ frameBgColor: s.color })}
                      className={`px-1.5 py-1 text-[10px] rounded border flex items-center justify-center gap-1 font-medium transition-all ${
                        (config.frameBgColor || '#050508').toLowerCase() === s.color.toLowerCase()
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                      }`}
                      title={s.label}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-zinc-600 shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="truncate">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Scheme: Film Strip Background & Frame Border */}
              <div className="space-y-2.5 bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-zinc-200 font-medium text-[11px]">Film Strip Background Color</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      id="input-film-bg-color"
                      type="color"
                      value={config.filmBgColor}
                      onChange={(e) => onUpdateConfig({ filmBgColor: e.target.value })}
                      className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                      title="Choose custom background color"
                    />
                    <input
                      type="text"
                      value={config.filmBgColor.toUpperCase()}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.startsWith('#') || val.length <= 7) {
                          onUpdateConfig({ filmBgColor: val });
                        }
                      }}
                      className="font-mono text-[10px] text-zinc-300 bg-zinc-900 border border-zinc-700/80 rounded px-1.5 py-0.5 w-16 text-center uppercase focus:outline-none focus:border-amber-500"
                    />
                    {config.filmBgColor.toLowerCase() !== '#000000' && (
                      <button
                        type="button"
                        onClick={() => onUpdateConfig({ filmBgColor: '#000000' })}
                        title="Reset to default Black (#000000)"
                        className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-amber-400 transition-colors"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick color swatches for Film Strip Background */}
                <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                  {[
                    { color: '#000000', label: 'Black (Default)' },
                    { color: '#0a0a0c', label: 'Kodak Black' },
                    { color: '#18181b', label: 'Dark Zinc' },
                    { color: '#0f172a', label: 'Cinema Slate' },
                    { color: '#17120e', label: 'Vintage Sepia' },
                    { color: '#27272a', label: 'Charcoal' },
                    { color: '#ffffff', label: 'Negative White' },
                    { color: '#fef3c7', label: 'Amber Light' },
                  ].map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => onUpdateConfig({ filmBgColor: c.color })}
                      className={`px-1.5 py-1 text-[10px] rounded border flex items-center justify-center gap-1 font-medium transition-all ${
                        config.filmBgColor.toLowerCase() === c.color.toLowerCase()
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                      }`}
                      title={c.label}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-zinc-600 shrink-0"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="truncate">{c.label}</span>
                    </button>
                  ))}
                </div>

                {/* Frame Border Line Color */}
                <div className="flex justify-between items-center pt-2 border-t border-zinc-850 text-[11px]">
                  <span className="text-zinc-400 text-[10px]">Frame Border Line Color</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={config.frameBorderColor}
                      onChange={(e) => onUpdateConfig({ frameBorderColor: e.target.value })}
                      className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <span className="font-mono text-[10px] text-zinc-400 uppercase">{config.frameBorderColor}</span>
                  </div>
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
              Text & Numbering
            </span>
            {openSections.textNumbering ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
          </button>

          {openSections.textNumbering && (
            <div className="space-y-3 pt-1 animate-in fade-in duration-150">
              {/* Text Margin & Font Size Configuration */}
              <div className="bg-amber-500/5 p-2.5 rounded-lg border border-amber-500/20 space-y-2.5">
                <div className="text-zinc-200 font-medium text-[11px] flex items-center justify-between">
                  <span className="font-semibold text-amber-300">Text Edge Margin & Size</span>
                  <span className="text-[10px] text-amber-400 font-mono">Outer Edges</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-zinc-300 text-[11px]">
                      <span>Edge-to-Text Gap</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="50"
                          value={config.textMarginTop ?? 8}
                          onChange={(e) => onUpdateConfig({ textMarginTop: parseInt(e.target.value, 10) || 0 })}
                          className="w-12 bg-zinc-900 border border-zinc-700/80 rounded px-1 py-0.5 text-xs text-center font-mono text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                        />
                        <span className="text-[10px] text-zinc-500">px</span>
                      </div>
                    </div>
                    <input
                      id="slider-text-margin"
                      type="range"
                      min="0"
                      max="30"
                      value={config.textMarginTop ?? 8}
                      onChange={(e) => onUpdateConfig({ textMarginTop: parseInt(e.target.value, 10) })}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-zinc-300 text-[11px]">
                      <span>Font Size</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="6"
                          max="32"
                          value={config.fontSize ?? 11}
                          onChange={(e) => onUpdateConfig({ fontSize: Math.max(6, parseInt(e.target.value, 10) || 6) })}
                          className="w-12 bg-zinc-900 border border-zinc-700/80 rounded px-1 py-0.5 text-xs text-center font-mono text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                        />
                        <span className="text-[10px] text-zinc-500">px</span>
                      </div>
                    </div>
                    <input
                      id="slider-font-size"
                      type="range"
                      min="8"
                      max="24"
                      value={config.fontSize ?? 11}
                      onChange={(e) => onUpdateConfig({ fontSize: parseInt(e.target.value, 10) })}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                </div>
              </div>

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
            </div>
          )}
        </div>

        {/* SECTION 3b: Edge & Codes */}
        <div className="p-3.5 space-y-3">
          <button
            onClick={() => toggleSection('edgeCodes')}
            className="w-full flex items-center justify-between font-semibold text-zinc-200 hover:text-white"
          >
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Edge & Codes
            </span>
            {openSections.edgeCodes ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
          </button>

          {openSections.edgeCodes && (
            <div className="space-y-3 pt-1 animate-in fade-in duration-150">
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
          )}
        </div>

        {/* ===== GROUP: FRAME SETTINGS ===== */}
        <div className="border-t border-zinc-800">
          <button
            type="button"
            onClick={() => toggleGroup('frameSettings')}
            className="w-full flex items-center justify-between px-3.5 py-3 bg-zinc-950/60 border-b border-zinc-800 text-[11px] font-bold uppercase tracking-wider text-amber-400/90 hover:bg-zinc-900/80 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              Frame Settings
            </span>
            {openGroups.frameSettings ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
          </button>
          {openGroups.frameSettings && (
            <div className="p-2">
              <input
                ref={frameFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && selectedFrameIndex !== null) {
                    onUploadImageForFrame(selectedFrameIndex, file);
                  }
                  e.target.value = '';
                }}
              />
              <FrameBottomBar
                variant="sidebar"
                frame={selectedFrame}
                frameIndex={selectedFrameIndex}
                totalFrames={config.frameCount}
                frameWidth={geo.frameWidth}
                frameHeight={geo.frameHeight}
                onUpdate={(updated) =>
                  selectedFrameIndex !== null && onUpdateFrame(selectedFrameIndex, updated)
                }
                onRemoveImage={() =>
                  selectedFrameIndex !== null && onRemoveImageFromFrame(selectedFrameIndex)
                }
                onReplaceImage={() => frameFileInputRef.current?.click()}
                onMoveFrame={(dir) =>
                  selectedFrameIndex !== null && onMoveFrame?.(selectedFrameIndex, dir)
                }
                onSelectFrame={onSelectFrame}
                onClose={() => onSelectFrame(null)}
              />
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

        <div className="space-y-2">
          <button
            id="btn-export-film-strip-sidebar"
            onClick={onOpenExportModal}
            className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all cursor-pointer"
          >
            <Printer className="w-4.5 h-4.5" />
            <span>Export & 15×10cm Photo Print</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
