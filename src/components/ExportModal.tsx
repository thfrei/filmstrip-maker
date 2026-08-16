import React, { useEffect, useState, useRef } from 'react';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  Loader2, 
  Image as ImageIcon, 
  Maximize2,
  Sparkles,
  Layers,
  Printer,
  Scissors,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  FileCheck,
  Smartphone,
  SlidersHorizontal,
  Info,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';
import { 
  FilmStripConfig, 
  FrameData, 
  ExportOptions, 
  PhotoPrintConfig, 
  DEFAULT_PHOTO_PRINT_CONFIG,
  PrintOrientation,
  FrameDistributionMode,
  PrintDPI
} from '../types';
import { 
  renderFilmStripToCanvas, 
  exportFilmStrip, 
  copyFilmStripToClipboard, 
  calculateFilmStripGeometry,
  renderPhotoPrintSheetToCanvas,
  exportPhotoPrintSheet,
  copyPhotoPrintSheetToClipboard,
  calculatePhotoPrintDimensions
} from '../utils/canvasExport';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: FilmStripConfig;
  frames: FrameData[];
  // Controlled export settings from Project state
  exportMode?: 'photo_print' | 'single_strip';
  onUpdateExportMode?: (mode: 'photo_print' | 'single_strip') => void;
  photoPrintConfig?: PhotoPrintConfig;
  onUpdatePhotoPrintConfig?: (config: PhotoPrintConfig | ((prev: PhotoPrintConfig) => PhotoPrintConfig)) => void;
  multiplier?: number;
  onUpdateMultiplier?: (multiplier: number) => void;
  format?: 'image/png' | 'image/jpeg' | 'image/webp';
  onUpdateFormat?: (format: 'image/png' | 'image/jpeg' | 'image/webp') => void;
  quality?: number;
  onUpdateQuality?: (quality: number) => void;
  filename?: string;
  onUpdateFilename?: (filename: string) => void;
  defaultMultiplier?: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  config,
  frames,
  exportMode: controlledExportMode,
  onUpdateExportMode,
  photoPrintConfig: controlledPhotoPrintConfig,
  onUpdatePhotoPrintConfig,
  multiplier: controlledMultiplier,
  onUpdateMultiplier,
  format: controlledFormat,
  onUpdateFormat,
  quality: controlledQuality,
  onUpdateQuality,
  filename: controlledFilename,
  onUpdateFilename,
  defaultMultiplier = 2,
}) => {
  // Internal fallback states if not provided by parent
  const [internalExportMode, setInternalExportMode] = useState<'photo_print' | 'single_strip'>('photo_print');
  const [internalPhotoPrintConfig, setInternalPhotoPrintConfig] = useState<PhotoPrintConfig>({
    ...DEFAULT_PHOTO_PRINT_CONFIG,
    enabled: true,
  });
  const [internalMultiplier, setInternalMultiplier] = useState<number>(defaultMultiplier);
  const [internalFormat, setInternalFormat] = useState<'image/png' | 'image/jpeg' | 'image/webp'>('image/jpeg');
  const [internalQuality, setInternalQuality] = useState<number>(0.95);
  const [internalFilename, setInternalFilename] = useState<string>('filmstrip-15x10cm-photo');

  // Resolved values
  const exportMode = controlledExportMode ?? internalExportMode;
  const setExportMode = (mode: 'photo_print' | 'single_strip') => {
    if (onUpdateExportMode) onUpdateExportMode(mode);
    else setInternalExportMode(mode);
  };

  const photoPrintConfig = controlledPhotoPrintConfig ?? internalPhotoPrintConfig;
  const setPhotoPrintConfig = (updater: PhotoPrintConfig | ((prev: PhotoPrintConfig) => PhotoPrintConfig)) => {
    if (onUpdatePhotoPrintConfig) {
      if (typeof updater === 'function') {
        onUpdatePhotoPrintConfig(updater(photoPrintConfig));
      } else {
        onUpdatePhotoPrintConfig(updater);
      }
    } else {
      setInternalPhotoPrintConfig(updater);
    }
  };

  const multiplier = controlledMultiplier ?? internalMultiplier;
  const setMultiplier = (mult: number) => {
    if (onUpdateMultiplier) onUpdateMultiplier(mult);
    else setInternalMultiplier(mult);
  };

  const format = controlledFormat ?? internalFormat;
  const setFormat = (fmt: 'image/png' | 'image/jpeg' | 'image/webp') => {
    if (onUpdateFormat) onUpdateFormat(fmt);
    else setInternalFormat(fmt);
  };

  const quality = controlledQuality ?? internalQuality;
  const setQuality = (q: number) => {
    if (onUpdateQuality) onUpdateQuality(q);
    else setInternalQuality(q);
  };

  const filename = controlledFilename ?? internalFilename;
  const setFilename = (fn: string) => {
    if (onUpdateFilename) onUpdateFilename(fn);
    else setInternalFilename(fn);
  };

  // Preview & Processing state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number; desc?: string }>({ width: 0, height: 0 });
  const [copied, setCopied] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [showDpiExplainer, setShowDpiExplainer] = useState<boolean>(false);

  // Zoom & Pan state for preview
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; startPanX: number; startPanY: number }>({ x: 0, y: 0, startPanX: 0, startPanY: 0 });
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Generate fast preview whenever config, frames, or export parameters change
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const generatePreview = async () => {
      setIsGenerating(true);
      try {
        if (exportMode === 'photo_print') {
          // 15x10cm Photo Print Mode
          const dims = calculatePhotoPrintDimensions(photoPrintConfig, 1);
          setDimensions({ 
            width: dims.widthPx, 
            height: dims.heightPx,
            desc: `${dims.widthMm} × ${dims.heightMm} mm (${dims.dpi} DPI)`
          });

          // Render at lower scale for instant responsive UI preview, while maintaining exact layout
          const previewScale = Math.min(1.0, 1000 / Math.max(dims.widthPx, dims.heightPx));
          const canvas = await renderPhotoPrintSheetToCanvas(config, frames, photoPrintConfig, previewScale);
          if (isMounted) {
            setPreviewDataUrl(canvas.toDataURL('image/png'));
          }
        } else {
          // Standard Single Strip Mode
          const geo = calculateFilmStripGeometry(config, multiplier);
          setDimensions({ 
            width: geo.filmWidth, 
            height: geo.filmHeight,
            desc: `${multiplier}x Resolution`
          });

          const canvas = await renderFilmStripToCanvas(config, frames, 1);
          if (isMounted) {
            setPreviewDataUrl(canvas.toDataURL('image/png'));
          }
        }
      } catch (err) {
        console.error('Failed to generate export preview:', err);
      } finally {
        if (isMounted) setIsGenerating(false);
      }
    };

    generatePreview();
    return () => {
      isMounted = false;
    };
  }, [isOpen, exportMode, config, frames, photoPrintConfig, multiplier]);

  // Reset zoom & pan when modal opens
  useEffect(() => {
    if (isOpen) {
      setZoomScale(1);
      setPanOffset({ x: 0, y: 0 });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      if (exportMode === 'photo_print') {
        const options: ExportOptions = {
          multiplier: 1,
          format,
          quality,
          filename: `${filename}-${photoPrintConfig.dpi}dpi-${photoPrintConfig.stripCount}strips.${format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png'}`,
        };
        await exportPhotoPrintSheet(config, frames, photoPrintConfig, options);
      } else {
        const options: ExportOptions = {
          multiplier,
          format,
          quality,
          filename: `${filename}-${multiplier}x.${format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png'}`,
        };
        await exportFilmStrip(config, frames, options);
      }
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopy = async () => {
    let success = false;
    if (exportMode === 'photo_print') {
      success = await copyPhotoPrintSheetToClipboard(config, frames, photoPrintConfig);
    } else {
      success = await copyFilmStripToClipboard(config, frames, multiplier);
    }

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } else {
      alert('Unable to copy image to clipboard in this browser context.');
    }
  };

  // Quick Preset Handlers for 15x10cm Print
  const applyPhotoPrintPreset = (preset: 'seamless_twin' | 'borderless_bleed' | 'seamless_3' | 'seamless_4' | 'framed_classic') => {
    switch (preset) {
      case 'seamless_twin':
        setPhotoPrintConfig((prev) => ({
          ...prev,
          orientation: 'landscape',
          stripCount: 2,
          distributionMode: 'duplicate',
          sheetBgColor: '#ffffff',
          sheetMarginMm: 0,
          stripGapMm: 0,
          showCutGuides: false,
          dpi: 300,
        }));
        break;
      case 'borderless_bleed':
        setPhotoPrintConfig((prev) => ({
          ...prev,
          orientation: 'landscape',
          stripCount: 2,
          distributionMode: 'duplicate',
          sheetBgColor: '#ffffff',
          sheetMarginMm: -2,
          stripGapMm: 0,
          showCutGuides: false,
          dpi: 300,
        }));
        break;
      case 'seamless_3':
        setPhotoPrintConfig((prev) => ({
          ...prev,
          orientation: 'landscape',
          stripCount: 3,
          distributionMode: 'split',
          sheetBgColor: '#ffffff',
          sheetMarginMm: 0,
          stripGapMm: 0,
          showCutGuides: false,
          dpi: 300,
        }));
        break;
      case 'seamless_4':
        setPhotoPrintConfig((prev) => ({
          ...prev,
          orientation: 'landscape',
          stripCount: 4,
          distributionMode: 'split',
          sheetBgColor: '#ffffff',
          sheetMarginMm: 0,
          stripGapMm: 0,
          showCutGuides: false,
          dpi: 300,
        }));
        break;
      case 'framed_classic':
        setPhotoPrintConfig((prev) => ({
          ...prev,
          orientation: 'landscape',
          stripCount: 2,
          distributionMode: 'duplicate',
          sheetBgColor: '#ffffff',
          sheetMarginMm: 4,
          stripGapMm: 4,
          showCutGuides: true,
          dpi: 300,
        }));
        break;
    }
  };

  // Zoom helpers
  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(3.5, Number((prev + 0.25).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => {
      const next = Math.max(0.5, Number((prev - 0.25).toFixed(2)));
      if (next <= 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleFitZoom = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Pointer panning handlers for zoomable preview
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoomScale <= 1) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startPanX: panOffset.x,
      startPanY: panOffset.y,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || zoomScale <= 1) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPanOffset({
      x: dragStartRef.current.startPanX + dx,
      y: dragStartRef.current.startPanY + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      setZoomScale((prev) => {
        const next = Math.min(3.5, Math.max(0.5, Number((prev + delta).toFixed(2))));
        if (next <= 1) setPanOffset({ x: 0, y: 0 });
        return next;
      });
    }
  };

  const isBorderless = photoPrintConfig.sheetMarginMm <= 0 && photoPrintConfig.stripGapMm <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        id="export-modal"
        className="bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl max-w-6xl w-full flex flex-col h-[94vh] max-h-[920px] overflow-hidden text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-900/95 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-100">Export & Print Film Strip</h2>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  {exportMode === 'photo_print' ? '15×10 cm Photo Print Ready' : 'Single Strip Mode'}
                </span>
                {isBorderless && exportMode === 'photo_print' && (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    Borderless Flush
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">High-resolution export with live DPI preview, negative bleed margin, and saved project options</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TWO COLUMN MODAL CONTENT */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
          
          {/* ================= LEFT COLUMN: ZOOMABLE LIVE PREVIEW ================= */}
          <div className="lg:col-span-6 xl:col-span-7 bg-zinc-950/80 border-b lg:border-b-0 lg:border-r border-zinc-800 flex flex-col min-h-[300px] lg:min-h-0 overflow-hidden">
            {/* Preview Toolbar */}
            <div className="px-4 py-2.5 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-zinc-200">
                  {exportMode === 'photo_print' ? '15×10 cm Photo Print Sheet' : 'Single Film Strip'}
                </span>
                {dimensions.desc && (
                  <span className="text-[10px] text-amber-300/90 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    {dimensions.desc}
                  </span>
                )}
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                <button
                  onClick={handleZoomOut}
                  disabled={zoomScale <= 0.5}
                  className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded disabled:opacity-30 transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={handleResetZoom}
                  className="px-2 py-0.5 text-[11px] font-mono text-zinc-300 hover:text-amber-300 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                  title="Reset to 100%"
                >
                  {Math.round(zoomScale * 100)}%
                </button>

                <button
                  onClick={handleZoomIn}
                  disabled={zoomScale >= 3.5}
                  className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded disabled:opacity-30 transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>

                <div className="w-px h-3.5 bg-zinc-800 mx-0.5" />

                <button
                  onClick={handleFitZoom}
                  className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                  title="Fit to View"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Interactive Zoomable Viewport Canvas Area */}
            <div 
              ref={previewContainerRef}
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={`relative flex-1 bg-zinc-950 overflow-hidden flex items-center justify-center p-4 select-none ${
                zoomScale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
              }`}
              style={{
                backgroundImage: 'radial-gradient(#27272a 1px, transparent 1px)',
                backgroundSize: '16px 16px',
              }}
            >
              {isGenerating ? (
                <div className="flex flex-col items-center gap-3 text-zinc-400">
                  <Loader2 className="w-7 h-7 animate-spin text-amber-400" />
                  <span className="text-xs font-medium">Compositing layout & photo print sheet...</span>
                </div>
              ) : previewDataUrl ? (
                <div 
                  className="transition-transform duration-75 origin-center flex items-center justify-center max-w-full max-h-full"
                  style={{
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
                  }}
                >
                  <div className="relative rounded-lg shadow-2xl border border-zinc-800/80 bg-zinc-900/40 p-1">
                    <img
                      src={previewDataUrl}
                      alt="Export Preview"
                      draggable={false}
                      className="max-h-[58vh] max-w-full object-contain rounded shadow-2xl pointer-events-none"
                    />
                    
                    {exportMode === 'photo_print' && (
                      <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm text-zinc-200 text-[10px] font-mono px-2 py-0.5 rounded border border-white/10 shadow pointer-events-none flex items-center gap-1.5">
                        <span>15×10 cm ({photoPrintConfig.orientation === 'portrait' ? '100×150 mm' : '150×100 mm'})</span>
                        {photoPrintConfig.sheetMarginMm <= 0 && <span className="text-emerald-400 font-bold">• 0mm Gap/Margin</span>}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-zinc-500">No preview generated yet</div>
              )}

              {/* Zoom hint overlay */}
              {zoomScale > 1 && (
                <div className="absolute top-3 left-3 bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 text-zinc-300 text-[10px] px-2 py-1 rounded-md flex items-center gap-1.5 shadow pointer-events-none">
                  <Move className="w-3 h-3 text-amber-400" />
                  <span>Click and drag to pan ({Math.round(zoomScale * 100)}%)</span>
                </div>
              )}
            </div>

            {/* Preview Status Footer */}
            <div className="px-4 py-2 bg-zinc-900/95 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400">Total Pixel Size:</span>
                <span className="font-mono text-zinc-200 bg-zinc-950 px-2 py-0.5 rounded text-[11px] border border-zinc-800 font-semibold">
                  {dimensions.width} × {dimensions.height} px
                </span>
                {exportMode === 'photo_print' && (
                  <span className="text-[10px] text-amber-400 font-medium">
                    {photoPrintConfig.dpi === 600 ? '4x Ultra HD Master' : photoPrintConfig.dpi === 300 ? '2x Standard Photo Print' : '1x Draft'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                <span>Hold Ctrl / Alt + Scroll to zoom</span>
              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: EXPORT & PRINT CONTROLS ================= */}
          <div className="lg:col-span-6 xl:col-span-5 flex flex-col min-h-0 bg-zinc-900 overflow-hidden">
            
            {/* Mode Selector Header Tabs */}
            <div className="p-4 bg-zinc-950/60 border-b border-zinc-800 shrink-0">
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Export Target Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="tab-mode-photo-print"
                  onClick={() => setExportMode('photo_print')}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                    exportMode === 'photo_print'
                      ? 'bg-amber-500/15 border-amber-500/60 text-amber-300 shadow-sm ring-1 ring-amber-500/20'
                      : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Printer className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>15×10 cm Photo Print</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">Multi-strip stacked sheet (Borderless/DPI)</div>
                </button>

                <button
                  id="tab-mode-single-strip"
                  onClick={() => setExportMode('single_strip')}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                    exportMode === 'single_strip'
                      ? 'bg-amber-500/15 border-amber-500/60 text-amber-300 shadow-sm ring-1 ring-amber-500/20'
                      : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Layers className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>Single Film Strip</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">Standalone stitched strip (1x–4x)</div>
                </button>
              </div>
            </div>

            {/* Scrollable Configuration Panel */}
            <div className="flex-1 p-5 space-y-4 overflow-y-auto">
              
              {/* 15×10 CM PHOTO PRINT CONTROLS */}
              {exportMode === 'photo_print' ? (
                <div className="space-y-4 animate-in fade-in duration-150">
                  
                  {/* Quick Presets Bar (Borderless & Seamless First!) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-zinc-300">
                        15×10 cm Layout Presets
                      </label>
                      <span className="text-[10px] text-zinc-500">Zero Margin / Borderless</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {[
                        { id: 'seamless_twin' as const, label: '📸 Seamless Twin', desc: '0mm Gap • 2 Duplicate strips' },
                        { id: 'borderless_bleed' as const, label: '✨ Borderless Bleed', desc: '-2mm Bleed • Edge-to-edge' },
                        { id: 'seamless_3' as const, label: '🎞️ 3-Strip Flush', desc: '0mm Gap • 3 Strips split' },
                        { id: 'seamless_4' as const, label: '🎞️ 4-Strip Flush', desc: '0mm Gap • 4 Mini strips' },
                        { id: 'framed_classic' as const, label: '🖨️ Classic Framed', desc: '4mm Margin • With cut guides' },
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => applyPhotoPrintPreset(preset.id)}
                          className="py-1.5 px-2 bg-zinc-950/80 hover:bg-zinc-800 text-left rounded-lg border border-zinc-800 hover:border-amber-500/40 transition-all text-zinc-200 cursor-pointer"
                        >
                          <div className="text-xs font-bold text-amber-300 truncate">{preset.label}</div>
                          <div className="text-[10px] text-zinc-400 truncate">{preset.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Multi-Strip Stacking Configuration */}
                  <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-zinc-200">Strips Arrangement (Rows)</span>
                      </div>
                      <span className="text-[11px] text-amber-300 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {photoPrintConfig.stripCount} {photoPrintConfig.stripCount === 1 ? 'Strip' : 'Strips Stacked'}
                      </span>
                    </div>

                    {/* Number of Strips Grid */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <label className="font-medium text-zinc-300">
                          Number of Film Strips:
                        </label>
                        <span className="font-mono text-amber-400 font-bold">{photoPrintConfig.stripCount} rows</span>
                      </div>

                      <div className="grid grid-cols-6 gap-1">
                        {[1, 2, 3, 4, 5, 6].map((count) => (
                          <button
                            key={count}
                            onClick={() => setPhotoPrintConfig((prev) => ({ ...prev, stripCount: count }))}
                            className={`py-1.5 text-center rounded-lg border font-mono text-xs transition-all cursor-pointer ${
                              photoPrintConfig.stripCount === count
                                ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-sm'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                            }`}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Frame Distribution Mode */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300">
                        Frame Distribution:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setPhotoPrintConfig((prev) => ({ ...prev, distributionMode: 'duplicate' }))}
                          className={`p-2 text-left rounded-lg border transition-all cursor-pointer ${
                            photoPrintConfig.distributionMode === 'duplicate'
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                          }`}
                          title="Duplicates the same film strip on every row (ideal for photobooth souvenir prints)"
                        >
                          <div className="text-xs font-semibold">Duplicate Strips</div>
                          <div className="text-[10px] text-zinc-400 font-normal">Identical copies to share</div>
                        </button>

                        <button
                          onClick={() => setPhotoPrintConfig((prev) => ({ ...prev, distributionMode: 'split' }))}
                          className={`p-2 text-left rounded-lg border transition-all cursor-pointer ${
                            photoPrintConfig.distributionMode === 'split'
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                          }`}
                          title="Splits your total frames across the stacked strips in sequence"
                        >
                          <div className="text-xs font-semibold">Split Frames</div>
                          <div className="text-[10px] text-zinc-400 font-normal">Sequenced across rows</div>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* DPI & Orientation Section with Same Logic as Single Strip (1x, 2x, 4x) */}
                  <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <Printer className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-zinc-200">Print Lab Resolution & Density (DPI)</span>
                      </div>
                      <button
                        onClick={() => setShowDpiExplainer(!showDpiExplainer)}
                        className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                        title="Explain DPI in photo printing"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>{showDpiExplainer ? 'Hide explanation' : 'Explain DPI'}</span>
                      </button>
                    </div>

                    {/* Collapsible DPI Explainer Card */}
                    {showDpiExplainer && (
                      <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-lg text-xs text-amber-200/90 space-y-2 animate-in fade-in duration-150">
                        <div className="font-bold flex items-center gap-1.5 text-amber-300">
                          <Info className="w-4 h-4 shrink-0" />
                          <span>Understanding DPI & Resolution for 15×10 cm Prints:</span>
                        </div>
                        <ul className="space-y-1 list-disc list-inside text-[11px] text-zinc-300">
                          <li><strong>DPI (Dots Per Inch)</strong> defines how many pixels are printed per inch of physical paper.</li>
                          <li><strong>300 DPI (2x Standard Photo Print)</strong>: Generates <strong>1772 × 1181 px</strong>. This is the exact photographic industry standard for 15×10 cm (6×4 in) photo kiosks and drug store labs (Walgreens, CVS, DM, Fujifilm).</li>
                          <li><strong>600 DPI (4x Ultra HD Master)</strong>: Generates <strong>3543 × 2362 px</strong>. Provides tack-sharp archival museum quality, reproducing micro-fine film stock text, grain, and barcodes without soft edges.</li>
                          <li><strong>150 DPI (1x Draft)</strong>: Fast lightweight digital proof (~886 × 591 px).</li>
                        </ul>
                      </div>
                    )}

                    {/* Resolution Multiplier / DPI Selection Buttons */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-zinc-300">
                        Select Print Resolution Quality:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { dpi: 300 as PrintDPI, mult: '2x', title: '2x Standard Photo', desc: '300 DPI • ~1772×1181 px', badge: 'Lab Std' },
                          { dpi: 600 as PrintDPI, mult: '4x', title: '4x Ultra HD', desc: '600 DPI • ~3543×2362 px', badge: 'Archival' },
                          { dpi: 150 as PrintDPI, mult: '1x', title: '1x Web Draft', desc: '150 DPI • ~886×591 px', badge: 'Draft' },
                        ].map((item) => (
                          <button
                            key={item.dpi}
                            onClick={() => setPhotoPrintConfig((prev) => ({ ...prev, dpi: item.dpi }))}
                            className={`p-2 text-left rounded-lg border transition-all cursor-pointer relative ${
                              photoPrintConfig.dpi === item.dpi
                                ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-sm'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold">{item.title}</span>
                              <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-zinc-800 text-amber-300 border border-zinc-700">
                                {item.badge}
                              </span>
                            </div>
                            <div className="text-[10px] text-zinc-400 mt-0.5">{item.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Orientation & Background Color */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-zinc-300">
                          Sheet Orientation
                        </label>
                        <div className="grid grid-cols-2 gap-1">
                          <button
                            onClick={() => setPhotoPrintConfig((prev) => ({ ...prev, orientation: 'landscape' }))}
                            className={`py-1.5 px-2 text-center rounded-lg border text-xs transition-all cursor-pointer ${
                              photoPrintConfig.orientation === 'landscape'
                                ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                            }`}
                          >
                            <div>Landscape</div>
                            <div className="text-[9px] text-zinc-400">15 × 10 cm</div>
                          </button>

                          <button
                            onClick={() => setPhotoPrintConfig((prev) => ({ ...prev, orientation: 'portrait' }))}
                            className={`py-1.5 px-2 text-center rounded-lg border text-xs transition-all cursor-pointer ${
                              photoPrintConfig.orientation === 'portrait'
                                ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                            }`}
                          >
                            <div>Portrait</div>
                            <div className="text-[9px] text-zinc-400">10 × 15 cm</div>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-zinc-300">
                          Paper Color
                        </label>
                        <div className="grid grid-cols-3 gap-1">
                          {[
                            { color: '#ffffff', label: 'White' },
                            { color: '#000000', label: 'Black' },
                            { color: '#18181b', label: 'Slate' },
                          ].map((item) => (
                            <button
                              key={item.color}
                              onClick={() => setPhotoPrintConfig((prev) => ({ ...prev, sheetBgColor: item.color }))}
                              className={`py-1 text-center rounded-lg border text-xs flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                                photoPrintConfig.sheetBgColor === item.color
                                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                              }`}
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-zinc-600 shadow-sm"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="text-[9px]">{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BORDERLESS PRINTING, MARGINS & GAP NUMERIC TEXT FIELDS */}
                  <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800 space-y-3.5">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-zinc-200">Spacing & Borderless Bleed</span>
                      </div>
                      {isBorderless && (
                        <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          Zero Seams / Borderless
                        </span>
                      )}
                    </div>

                    {/* Sheet Outer Margin (Text Field + Slider + Negative Value Support) */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <label className="font-medium text-zinc-300 flex items-center gap-1.5">
                          <span>Outer Sheet Margin:</span>
                          {photoPrintConfig.sheetMarginMm < 0 && (
                            <span className="text-[10px] text-amber-400 font-mono font-bold bg-amber-500/15 px-1 rounded">
                              Bleed Active
                            </span>
                          )}
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.5"
                            min="-20"
                            max="40"
                            value={photoPrintConfig.sheetMarginMm}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setPhotoPrintConfig((prev) => ({ ...prev, sheetMarginMm: isNaN(val) ? 0 : val }));
                            }}
                            className="w-16 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-xs text-amber-300 font-mono font-bold text-right focus:outline-none focus:border-amber-500"
                          />
                          <span className="text-xs text-zinc-400 font-mono">mm</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-zinc-500">-15</span>
                        <input
                          type="range"
                          min="-15"
                          max="25"
                          step="0.5"
                          value={photoPrintConfig.sheetMarginMm}
                          onChange={(e) => setPhotoPrintConfig((prev) => ({ ...prev, sheetMarginMm: parseFloat(e.target.value) || 0 }))}
                          className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                        <span className="text-[10px] font-mono text-zinc-500">+25</span>
                      </div>

                      {/* Quick Margin Chips */}
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] text-zinc-500">Presets:</span>
                        {[
                          { val: -2, label: '-2mm (Bleed)' },
                          { val: 0, label: '0mm (Flush)' },
                          { val: 3, label: '3mm' },
                          { val: 6, label: '6mm (Framed)' },
                        ].map((chip) => (
                          <button
                            key={chip.val}
                            onClick={() => setPhotoPrintConfig((prev) => ({ ...prev, sheetMarginMm: chip.val }))}
                            className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                              photoPrintConfig.sheetMarginMm === chip.val
                                ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Gap Between Strips (Text Field + Slider + Negative Value Support) */}
                    <div className="space-y-1.5 pt-1 border-t border-zinc-800/60">
                      <div className="flex justify-between items-center text-xs">
                        <label className="font-medium text-zinc-300 flex items-center gap-1.5">
                          <span>Gap Between Strips:</span>
                          {photoPrintConfig.stripGapMm <= 0 && (
                            <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/15 px-1 rounded">
                              {photoPrintConfig.stripGapMm === 0 ? 'No Gap (Seamless)' : 'Overlap'}
                            </span>
                          )}
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.5"
                            min="-20"
                            max="40"
                            value={photoPrintConfig.stripGapMm}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setPhotoPrintConfig((prev) => ({ ...prev, stripGapMm: isNaN(val) ? 0 : val }));
                            }}
                            className="w-16 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-xs text-amber-300 font-mono font-bold text-right focus:outline-none focus:border-amber-500"
                          />
                          <span className="text-xs text-zinc-400 font-mono">mm</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-zinc-500">-15</span>
                        <input
                          type="range"
                          min="-15"
                          max="25"
                          step="0.5"
                          value={photoPrintConfig.stripGapMm}
                          onChange={(e) => setPhotoPrintConfig((prev) => ({ ...prev, stripGapMm: parseFloat(e.target.value) || 0 }))}
                          className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                        <span className="text-[10px] font-mono text-zinc-500">+25</span>
                      </div>

                      {/* Quick Gap Chips */}
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] text-zinc-500">Presets:</span>
                        {[
                          { val: -1, label: '-1mm (Overlap)' },
                          { val: 0, label: '0mm (Seamless)' },
                          { val: 2, label: '2mm' },
                          { val: 4, label: '4mm (Standard)' },
                        ].map((chip) => (
                          <button
                            key={chip.val}
                            onClick={() => setPhotoPrintConfig((prev) => ({ ...prev, stripGapMm: chip.val }))}
                            className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                              photoPrintConfig.stripGapMm === chip.val
                                ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Scissor Cut & Trim Guides Toggle */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900 border border-zinc-800 mt-2">
                      <div className="flex items-center gap-2">
                        <Scissors className="w-4 h-4 text-amber-400" />
                        <div>
                          <div className="text-xs font-semibold text-zinc-200">Scissor Cut Guides</div>
                          <div className="text-[10px] text-zinc-400">Trim lines & corner crop ticks (recommended when gap &gt; 0)</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={photoPrintConfig.showCutGuides}
                        onChange={(e) => setPhotoPrintConfig((prev) => ({ ...prev, showCutGuides: e.target.checked }))}
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* STANDARD SINGLE STRIP CONTROLS */
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Resolution Multiplier matching same logic (1x, 2x, 3x, 4x) */}
                  <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800 space-y-3">
                    <label className="block text-xs font-semibold text-zinc-300">
                      Export Resolution Multiplier
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { mult: 1, label: '1x', desc: 'Screen', sub: 'Draft' },
                        { mult: 2, label: '2x', desc: 'Retina', sub: 'Standard' },
                        { mult: 3, label: '3x', desc: 'Studio', sub: 'High Res' },
                        { mult: 4, label: '4x', desc: 'Ultra HD', sub: 'Archival' },
                      ].map((item) => (
                        <button
                          key={item.mult}
                          onClick={() => setMultiplier(item.mult)}
                          className={`py-2 px-1 text-center rounded-lg border transition-all cursor-pointer ${
                            multiplier === item.mult
                              ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-bold shadow-sm'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                          }`}
                        >
                          <div className="text-xs font-bold font-mono">{item.label}</div>
                          <div className="text-[10px] text-zinc-400 font-normal">{item.desc}</div>
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Export single stitched strip rendered directly at up to 4x Ultra HD resolution.
                    </p>
                  </div>
                </div>
              )}

              {/* Common File Format & Filename */}
              <div className="space-y-3 pt-2 border-t border-zinc-800">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-zinc-300">
                      Format
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { fmt: 'image/jpeg' as const, label: 'JPG' },
                        { fmt: 'image/png' as const, label: 'PNG' },
                        { fmt: 'image/webp' as const, label: 'WEBP' },
                      ].map((item) => (
                        <button
                          key={item.fmt}
                          onClick={() => setFormat(item.fmt)}
                          className={`py-1.5 text-center rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                            format === item.fmt
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1 col-span-2">
                    <label className="block text-xs font-semibold text-zinc-300">
                      Filename Prefix
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={filename}
                        onChange={(e) => setFilename(e.target.value)}
                        placeholder={exportMode === 'photo_print' ? 'filmstrip-15x10cm-photo' : 'cinema-filmstrip'}
                        className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 font-mono"
                      />
                      <span className="text-xs text-zinc-400 font-mono shrink-0">
                        .{format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Action Buttons Footer */}
            <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between gap-3 shrink-0">
              <button
                onClick={handleCopy}
                disabled={isGenerating || !previewDataUrl}
                className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-xl border border-zinc-700 transition-all disabled:opacity-50 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Image'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-medium rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  id="btn-download-export"
                  onClick={handleDownload}
                  disabled={isDownloading || isGenerating || !previewDataUrl}
                  className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating High-Res...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>
                        {exportMode === 'photo_print'
                          ? `Download 15×10cm Photo (${photoPrintConfig.dpi} DPI)`
                          : `Download Strip (${multiplier}x HD)`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
