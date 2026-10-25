import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Sparkles, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Maximize, 
  RotateCw, 
  Trash2, 
  Move, 
  Sliders, 
  Camera, 
  ChevronRight, 
  ChevronLeft,
  Info,
  Crosshair,
  Hand,
  Archive,
  Download,
  ArrowLeft,
  ArrowRight,
  Film,
  Undo2,
  Redo2
} from 'lucide-react';
import { FilmStripConfig, FrameData, VideoSourceInfo } from '../types';
import { calculateFilmStripGeometry } from '../utils/canvasExport';
import { computeImageFit } from '../utils/geometry';
import { FrameBottomBar } from './FrameBottomBar';
import { VideoTimelineDeck } from './VideoTimelineDeck';
import { formatTimecode } from '../utils/videoExtractor';

interface FilmStripPreviewProps {
  config: FilmStripConfig;
  frames: FrameData[];
  selectedFrameIndex: number | null;
  onSelectFrame: (index: number | null) => void;
  onUpdateFrame: (index: number, data: Partial<FrameData>) => void;
  onUploadImageForFrame: (index: number, file: File) => void;
  onRemoveImageFromFrame: (index: number) => void;
  onMoveFrame?: (fromIndex: number, direction: 'left' | 'right') => void;
  onOpenProjectModal?: () => void;
  onOpenExportModal?: () => void;
  videoSource: VideoSourceInfo | null;
  onSetVideoSource: (source: VideoSourceInfo | null) => void;
  isVideoDeckOpen: boolean;
  onToggleVideoDeck: () => void;
  onUpdateFrameFromVideo: (index: number, data: {
    imageUrl: string;
    imageNaturalWidth: number;
    imageNaturalHeight: number;
    videoTimestamp: number;
    sourceVideoName: string;
    imageName: string;
  }) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export const FilmStripPreview: React.FC<FilmStripPreviewProps> = ({
  config,
  frames,
  selectedFrameIndex,
  onSelectFrame,
  onUpdateFrame,
  onUploadImageForFrame,
  onRemoveImageFromFrame,
  onMoveFrame,
  onOpenProjectModal,
  onOpenExportModal,
  videoSource,
  onSetVideoSource,
  isVideoDeckOpen,
  onToggleVideoDeck,
  onUpdateFrameFromVideo,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  
  // Viewport Zoom Scale and Canvas Pan for Preview stage
  const [viewportScale, setViewportScale] = useState<number>(1);
  const [fitToWidth, setFitToWidth] = useState<boolean>(true);
  const [stagePan, setStagePan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
  const [isStageDragging, setIsStageDragging] = useState<boolean>(false);
  const [stageDragStart, setStageDragStart] = useState<{ x: number; y: number; initialX: number; initialY: number } | null>(null);

  // Drag-to-pan state within individual frame image
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number; initialPanX: number; initialPanY: number } | null>(null);

  // Drag over state for individual frame drop targets
  const [dragOverFrameIndex, setDragOverFrameIndex] = useState<number | null>(null);

  const geo = calculateFilmStripGeometry(config, 1);

  // Auto-fit to viewport width when enabled
  useEffect(() => {
    if (!fitToWidth || !containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const availableWidth = entry.contentRect.width - 48; // padding
        const availableHeight = entry.contentRect.height - 48;
        
        const scaleX = availableWidth / geo.filmWidth;
        const scaleY = availableHeight / geo.filmHeight;
        
        // Pick best fitting scale capped at 1.0 (or slightly larger if very small)
        const bestScale = Math.min(1.1, Math.max(0.35, Math.min(scaleX, scaleY)));
        setViewportScale(bestScale);
        setStagePan({ x: 0, y: 0 });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [fitToWidth, geo.filmWidth, geo.filmHeight]);

  // Spacebar tracking for canvas-wide panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        setIsSpacePressed(false);
      }
    };

    const handleBlur = () => {
      setIsSpacePressed(false);
      setIsStageDragging(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Native wheel listener on container for Ctrl + Wheel Canvas Zooming
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();

        const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
        setViewportScale((prev) => {
          const next = Math.min(4.0, Math.max(0.15, prev * zoomFactor));
          return parseFloat(next.toFixed(3));
        });
        setFitToWidth(false);
      }
    };

    container.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleNativeWheel);
    };
  }, []);

  // Stage Canvas Pan Handlers (Space + Drag, or Middle Click Drag)
  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isSpacePressed || e.button === 1) {
      e.preventDefault();
      e.stopPropagation();
      setIsStageDragging(true);
      setStageDragStart({
        x: e.clientX,
        y: e.clientY,
        initialX: stagePan.x,
        initialY: stagePan.y,
      });
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isStageDragging && stageDragStart) {
      const dx = e.clientX - stageDragStart.x;
      const dy = e.clientY - stageDragStart.y;
      setStagePan({
        x: stageDragStart.initialX + dx,
        y: stageDragStart.initialY + dy,
      });
      setFitToWidth(false);
    }
  };

  const handleStagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isStageDragging) {
      setIsStageDragging(false);
      setStageDragStart(null);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Safe ignore
      }
    }
  };

  // Handle pointer panning on individual image inside frame
  const handlePointerDown = (e: React.PointerEvent, index: number) => {
    if (isSpacePressed) return; // Prioritize canvas panning when space is held
    const frame = frames[index];
    if (!frame || !frame.imageUrl) return;

    // Select the frame
    onSelectFrame(index);

    setIsPanning(true);
    setPanStart({
      x: e.clientX,
      y: e.clientY,
      initialPanX: frame.panX,
      initialPanY: frame.panY,
    });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent, index: number) => {
    if (!isPanning || !panStart || selectedFrameIndex !== index) return;

    // Calculate delta considering viewport scale
    const deltaX = (e.clientX - panStart.x) / viewportScale;
    const deltaY = (e.clientY - panStart.y) / viewportScale;

    onUpdateFrame(index, {
      panX: panStart.initialPanX + deltaX,
      panY: panStart.initialPanY + deltaY,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Safe ignore
      }
    }
  };

  // Wheel zoom on frame
  const handleWheel = (e: React.WheelEvent, index: number) => {
    if (e.ctrlKey || e.metaKey) return; // Handled by canvas zoom listener
    const frame = frames[index];
    if (!frame || !frame.imageUrl) return;

    e.preventDefault();
    e.stopPropagation();

    const zoomFactor = e.deltaY < 0 ? 0.08 : -0.08;
    const newZoom = Math.min(4.0, Math.max(0.2, frame.zoom + zoomFactor));
    onUpdateFrame(index, { zoom: newZoom });
  };

  // Drop handlers per frame
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFrameIndex(index);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFrameIndex(null);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFrameIndex(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // If multiple files dropped onto a frame, distribute to subsequent frames
      const files = Array.from(e.dataTransfer.files).filter((f: File) => f.type.startsWith('image/')) as File[];
      files.forEach((file, offset) => {
        const targetIndex = index + offset;
        if (targetIndex < config.frameCount) {
          onUploadImageForFrame(targetIndex, file);
        }
      });
      onSelectFrame(index);
    }
  };

  // Sprocket calculation along the film strip (sprockets per frame interval)
  const sprocketsPerFrame = Math.max(1, Math.min(20, config.sprocketsPerFrame ?? 5));
  const pitch = (geo.frameWidth + geo.frameDivider) / sprocketsPerFrame;
  const totalSprockets = Math.ceil(geo.filmWidth / pitch) + 2;
  const startSprocketX = geo.outerBorder + (geo.sideMargin % pitch) / 2;
  
  const topSprocketY = geo.topSprocketY;
  const bottomSprocketY = geo.bottomSprocketY;

  const fontFamilyClass =
    config.fontFamily === 'courier'
      ? 'font-courier'
      : config.fontFamily === 'sans'
      ? 'font-sans'
      : 'font-mono-film';

  return (
    <main
      id="film-strip-preview-area"
      className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950 text-zinc-100 relative select-none"
    >
      {/* Top Preview Control Bar */}
      <div 
        className="h-12 border-b border-zinc-800/80 bg-zinc-900/60 px-4 flex items-center justify-between shrink-0 z-20 backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Strip Dimensions:</span>
            <span className="font-mono text-zinc-200 bg-zinc-800/80 px-2 py-0.5 rounded text-[11px] border border-zinc-700/50">
              {geo.filmWidth} × {geo.filmHeight} px
            </span>
          </span>

          <span className="text-xs text-zinc-500 hidden md:inline">|</span>

          <span className="text-xs text-zinc-400 hidden md:flex items-center gap-1">
            Ratio: <strong className="text-zinc-200">{config.aspectRatio}</strong>
          </span>
        </div>

        {/* Viewport Zoom & Fit Controls */}
        <div className="flex items-center gap-1.5 bg-zinc-950/80 p-1 rounded-lg border border-zinc-800">
          {(stagePan.x !== 0 || stagePan.y !== 0) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setStagePan({ x: 0, y: 0 });
              }}
              className="px-2 py-1 text-[11px] bg-zinc-800 hover:bg-zinc-700 text-amber-300 rounded border border-amber-500/30 flex items-center gap-1 transition-colors"
              title="Reset Canvas Pan Position"
            >
              <Crosshair className="w-3 h-3" />
              <span>Center</span>
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              setFitToWidth(true);
              setStagePan({ x: 0, y: 0 });
            }}
            className={`px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
              fitToWidth && stagePan.x === 0 && stagePan.y === 0
                ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title="Fit Strip to Window"
          >
            <Maximize className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Fit View</span>
          </button>

          <div className="h-3 w-px bg-zinc-800 mx-0.5" />

          <button
            onClick={(e) => {
              e.stopPropagation();
              setFitToWidth(false);
              setViewportScale((s) => Math.max(0.25, s - 0.15));
            }}
            className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
            title="Zoom Out Canvas"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span className="font-mono text-[11px] text-zinc-300 w-10 text-center font-medium">
            {Math.round(viewportScale * 100)}%
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setFitToWidth(false);
              setViewportScale((s) => Math.min(2.5, s + 0.15));
            }}
            className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
            title="Zoom In Canvas"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setFitToWidth(false);
              setViewportScale(1.0);
            }}
            className={`px-2 py-1 text-[11px] rounded transition-colors ${
              !fitToWidth && viewportScale === 1.0
                ? 'bg-zinc-800 text-amber-400 font-bold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title="Actual 100% Size"
          >
            100%
          </button>
        </div>

        {/* Action Buttons: Movie Deck, Save/Load Project & Export */}
        <div className="flex items-center gap-2">
          {onUndo && (
            <div className="flex items-center gap-0.5 bg-zinc-950/80 p-1 rounded-lg border border-zinc-800">
              <button
                id="btn-undo"
                onClick={(e) => {
                  e.stopPropagation();
                  onUndo();
                }}
                disabled={!canUndo}
                className="p-1.5 text-zinc-300 hover:text-amber-400 hover:bg-zinc-800 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                id="btn-redo"
                onClick={(e) => {
                  e.stopPropagation();
                  onRedo?.();
                }}
                disabled={!canRedo}
                className="p-1.5 text-zinc-300 hover:text-amber-400 hover:bg-zinc-800 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Redo (Ctrl+Shift+Z / Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            id="btn-preview-top-movie-deck"
            onClick={(e) => {
              e.stopPropagation();
              onToggleVideoDeck();
            }}
            className={`px-2.5 py-1 text-xs rounded-lg border flex items-center gap-1.5 transition-all font-medium cursor-pointer ${
              isVideoDeckOpen
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm ring-1 ring-amber-500/30'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700/80 hover:text-white'
            }`}
            title="Toggle Movie Frame Extractor Deck (Full-width slider & video preview)"
          >
            <Film className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Movie Reel Deck</span>
            {videoSource && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          {onOpenProjectModal && (
            <button
              id="btn-preview-top-project"
              onClick={(e) => {
                e.stopPropagation();
                onOpenProjectModal();
              }}
              className="px-2.5 py-1 text-xs bg-zinc-900 hover:bg-zinc-800 text-amber-300 rounded-lg border border-zinc-700/80 flex items-center gap-1.5 transition-colors font-medium cursor-pointer"
              title="Save or Load Project (.filmproj, .zip, .filmjson)"
            >
              <Archive className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Project</span>
            </button>
          )}

          {onOpenExportModal && (
            <button
              id="btn-preview-top-export"
              onClick={(e) => {
                e.stopPropagation();
                onOpenExportModal();
              }}
              className="px-3 py-1 text-xs bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-md cursor-pointer"
              title="Export High-Resolution Image"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Interactive Stage Area */}
      <div
        ref={containerRef}
        onPointerDown={handleStagePointerDown}
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerUp}
        onPointerCancel={handleStagePointerUp}
        onClick={(e) => {
          if (e.target === containerRef.current) {
            onSelectFrame(null);
          }
        }}
        style={{ backgroundColor: '#A8A8A8' }}
        className={`flex-1 w-full h-full overflow-hidden flex items-center justify-center p-8 relative film-grain-bg select-none ${
          isSpacePressed
            ? isStageDragging
              ? 'cursor-grabbing'
              : 'cursor-grab'
            : ''
        }`}
      >
        {/* Floating Spacebar Pan Hint when Space is active */}
        {isSpacePressed && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-500/90 text-zinc-950 px-3 py-1 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1.5 z-30 pointer-events-none animate-in fade-in">
            <Hand className="w-3.5 h-3.5" />
            <span>Canvas Pan Mode: Drag anywhere to move canvas</span>
          </div>
        )}

        {/* Scaled & Translated Film Strip Container */}
        <div
          style={{
            transform: `translate(${stagePan.x}px, ${stagePan.y}px) scale(${viewportScale})`,
            transformOrigin: 'center center',
            transition: isPanning || isStageDragging ? 'none' : 'transform 0.12s ease-out',
            pointerEvents: isSpacePressed ? 'none' : 'auto',
          }}
          className="shrink-0 relative shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* THE FILM STRIP BODY */}
          <div
            id="interactive-film-strip"
            style={{
              width: `${geo.filmWidth}px`,
              height: `${geo.filmHeight}px`,
              backgroundColor: config.filmBgColor,
              borderColor: config.frameBorderColor,
              borderWidth: `${geo.outerBorder}px`,
              borderStyle: geo.outerBorder > 0 ? 'solid' : 'none',
            }}
            className="relative rounded-sm select-none overflow-hidden"
          >
            {/* 1. TOP EDGE TEXT / LABEL ROW (AT THE VERY TOP EDGE OF FILM STRIP) */}
            {config.showTopText && (
              <div
                className="absolute flex items-center pointer-events-none z-10"
                style={{
                  left: `${geo.outerBorder + geo.sideMargin}px`,
                  top: `${geo.topTextY - (geo.textAreaHeight / 2)}px`,
                  height: `${geo.textAreaHeight}px`,
                  gap: `${geo.frameDivider}px`,
                }}
              >
                {Array.from({ length: config.frameCount }).map((_, index) => {
                  const frameData = frames[index] || { id: `frame-${index}` };
                  const frameNum = config.startNumber + index;
                  const formattedNum = config.padZeroes
                    ? String(frameNum).padStart(2, '0')
                    : String(frameNum);
                  const defaultLabel = `${config.prefix}${formattedNum}${config.suffix}`;
                  const topLabel = frameData.customTextTop || defaultLabel;

                  return (
                    <div
                      key={`top-text-col-${index}`}
                      className={`flex items-center justify-between text-center ${fontFamilyClass}`}
                      style={{
                        width: `${geo.frameWidth}px`,
                        color: config.fontColor,
                        fontSize: `${config.fontSize}px`,
                        lineHeight: 1,
                      }}
                    >
                      {config.showFilmStockName && config.filmStockName ? (
                        <span className="text-[9px] opacity-85 font-semibold uppercase tracking-wider pl-1 select-none truncate max-w-[45%] text-left">
                          {config.filmStockName}
                        </span>
                      ) : <div />}

                      <span className="font-bold tracking-wider select-none truncate">{topLabel}</span>
                      <div />
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2. SPROCKET HOLES (TOP TRACK - BETWEEN TOP TEXT & FRAMES) */}
            <div
              className="absolute left-0 right-0 pointer-events-none"
              style={{
                top: `${topSprocketY}px`,
                height: `${config.sprocketHeight}px`,
              }}
            >
              {Array.from({ length: totalSprockets }).map((_, s) => {
                const spX = startSprocketX + s * pitch;
                if (spX + config.sprocketWidth > geo.filmWidth - geo.outerBorder) return null;
                return (
                  <div
                    key={`top-sprocket-${s}`}
                    style={{
                      left: `${spX}px`,
                      width: `${config.sprocketWidth}px`,
                      height: `${config.sprocketHeight}px`,
                      borderRadius: `${config.sprocketRadius}px`,
                      backgroundColor: config.sprocketFillColor,
                      borderColor: config.sprocketBorderColor,
                      borderWidth: '1px',
                    }}
                    className="absolute top-0 shadow-inner"
                  />
                );
              })}
            </div>

            {/* 3. FILM PICTURE FRAMES ROW */}
            <div
              className="absolute flex items-center"
              style={{
                left: `${geo.outerBorder + geo.sideMargin}px`,
                top: `${geo.frameY}px`,
                height: `${geo.frameHeight}px`,
                gap: `${geo.frameDivider}px`,
              }}
            >
              {Array.from({ length: config.frameCount }).map((_, index) => {
                const frameData = frames[index] || {
                  id: `frame-${index}`,
                  imageUrl: null,
                  panX: 0,
                  panY: 0,
                  zoom: 1,
                  rotation: 0,
                  flipH: false,
                  flipV: false,
                  filters: { brightness: 100, contrast: 100, saturation: 100, sepia: 0, grayscale: 0, vintageWarmth: 0 },
                };

                const isSelected = selectedFrameIndex === index;
                const isDragOver = dragOverFrameIndex === index;

                // Compose CSS filter string for this frame
                const f = frameData.filters || { brightness: 100, contrast: 100, saturation: 100, sepia: 0, grayscale: 0, vintageWarmth: 0 };
                const filterParts: string[] = [];
                if (f.brightness !== 100) filterParts.push(`brightness(${f.brightness}%)`);
                if (f.contrast !== 100) filterParts.push(`contrast(${f.contrast}%)`);
                if (f.saturation !== 100) filterParts.push(`saturate(${f.saturation}%)`);
                if (f.sepia > 0) filterParts.push(`sepia(${f.sepia}%)`);
                if (f.grayscale > 0) filterParts.push(`grayscale(${f.grayscale}%)`);
                if (f.vintageWarmth > 0) {
                  filterParts.push(`sepia(${Math.round(f.vintageWarmth * 0.35)}%)`);
                  filterParts.push(`contrast(${100 + Math.round(f.vintageWarmth * 0.15)}%)`);
                }
                const filterString = filterParts.join(' ') || 'none';

                // Calculate uncropped base dimensions matching canvas exporter
                const { baseW, baseH } = computeImageFit(
                  frameData.imageNaturalWidth,
                  frameData.imageNaturalHeight,
                  geo.frameWidth,
                  geo.frameHeight
                );

                return (
                  <div
                    key={`frame-col-${index}`}
                    className="relative flex flex-col justify-center"
                    style={{ width: `${geo.frameWidth}px` }}
                  >
                    {/* THE APERTURE / IMAGE FRAME BOX */}
                    <div
                      id={`film-frame-${index}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectFrame(index);
                      }}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      style={{
                        width: `${geo.frameWidth}px`,
                        height: `${geo.frameHeight}px`,
                        borderColor: isSelected
                          ? '#f59e0b'
                          : isDragOver
                          ? '#38bdf8'
                          : config.frameBorderColor,
                        borderWidth: `${Math.max(1, config.frameBorderWidth)}px`,
                        borderStyle: 'solid',
                        backgroundColor: config.frameBgColor || '#050508',
                      }}
                      className={`relative overflow-hidden cursor-pointer transition-shadow rounded-sm ${
                        isSelected
                          ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-black shadow-lg shadow-amber-500/20 z-10'
                          : isDragOver
                          ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-black z-10'
                          : 'hover:border-zinc-500'
                      }`}
                    >
                      {/* Hidden File Input for this frame */}
                      <input
                        ref={(el) => {
                          fileInputRefs.current[index] = el;
                        }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            onUploadImageForFrame(index, e.target.files[0]);
                            onSelectFrame(index);
                            e.target.value = '';
                          }
                        }}
                      />

                      {frameData.imageUrl ? (
                        /* Loaded & Transformed Image Container */
                        <div
                          className={`w-full h-full flex items-center justify-center relative select-none overflow-hidden ${
                            isSelected ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-pointer'
                          }`}
                          onPointerDown={(e) => handlePointerDown(e, index)}
                          onPointerMove={(e) => handlePointerMove(e, index)}
                          onPointerUp={handlePointerUp}
                          onPointerCancel={handlePointerUp}
                          onWheel={(e) => handleWheel(e, index)}
                        >
                          <img
                            src={frameData.imageUrl}
                            alt={`Frame ${index + 1}`}
                            draggable={false}
                            onLoad={(e) => {
                              const target = e.currentTarget;
                              if (
                                target.naturalWidth &&
                                target.naturalHeight &&
                                (target.naturalWidth !== frameData.imageNaturalWidth ||
                                  target.naturalHeight !== frameData.imageNaturalHeight)
                              ) {
                                onUpdateFrame(index, {
                                  imageNaturalWidth: target.naturalWidth,
                                  imageNaturalHeight: target.naturalHeight,
                                });
                              }
                            }}
                            style={{
                              position: 'absolute',
                              left: '50%',
                              top: '50%',
                              width: `${baseW}px`,
                              height: `${baseH}px`,
                              marginLeft: `${-baseW / 2}px`,
                              marginTop: `${-baseH / 2}px`,
                              transform: `translate(${frameData.panX}px, ${frameData.panY}px) rotate(${frameData.rotation}deg) scale(${
                                (frameData.flipH ? -1 : 1) * frameData.zoom
                              }, ${(frameData.flipV ? -1 : 1) * frameData.zoom})`,
                              filter: filterString,
                              maxWidth: 'none',
                              maxHeight: 'none',
                              transition: isPanning ? 'none' : 'transform 0.05s ease-out',
                            }}
                            className="pointer-events-none select-none origin-center"
                          />

                          {/* Quick selection indicators on frame */}
                          {isSelected && (
                            <>
                              <div className="absolute top-2 left-2 bg-amber-500/90 text-zinc-950 text-[10px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none flex items-center gap-1 font-mono z-20">
                                <Move className="w-2.5 h-2.5" />
                                FRAME #{index + 1}
                              </div>

                              {/* Quick Move / Swap Buttons directly on frame */}
                              <div 
                                className="absolute top-2 right-2 flex items-center gap-1 z-20"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {index > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onMoveFrame?.(index, 'left');
                                    }}
                                    title={`Move Left / Swap with Frame #${index} (Alt+Left)`}
                                    className="p-1 bg-zinc-900/90 hover:bg-amber-500 text-zinc-300 hover:text-zinc-950 rounded shadow border border-zinc-700/80 transition-all hover:scale-105"
                                  >
                                    <ArrowLeft className="w-3 h-3" />
                                  </button>
                                )}
                                {index < config.frameCount - 1 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onMoveFrame?.(index, 'right');
                                    }}
                                    title={`Move Right / Swap with Frame #${index + 2} (Alt+Right)`}
                                    className="p-1 bg-zinc-900/90 hover:bg-amber-500 text-zinc-300 hover:text-zinc-950 rounded shadow border border-zinc-700/80 transition-all hover:scale-105"
                                  >
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              {/* Movie Frame Timestamp Tag */}
                              {typeof frameData.videoTimestamp === 'number' && (
                                <div 
                                  className="absolute bottom-2 left-2 bg-black/85 backdrop-blur-sm text-amber-400 border border-amber-500/40 text-[9px] font-mono px-1.5 py-0.5 rounded shadow pointer-events-none z-20 flex items-center gap-1"
                                  title={`Movie Frame @ ${formatTimecode(frameData.videoTimestamp)}`}
                                >
                                  <Film className="w-2.5 h-2.5 text-amber-500" />
                                  <span>{formatTimecode(frameData.videoTimestamp)}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ) : (
                        /* Empty Frame Placeholder */
                        <div
                          className={`w-full h-full flex flex-col items-center justify-center p-4 text-center transition-colors ${
                            isDragOver ? 'bg-blue-500/10' : 'bg-zinc-950/60 hover:bg-zinc-900/60'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-zinc-400 mb-2 group-hover:scale-110 transition-transform">
                            <Upload className="w-4 h-4 text-amber-400" />
                          </div>
                          <span className="text-xs font-semibold text-zinc-300">
                            Frame #{index + 1}
                          </span>
                          <span className="text-[10px] text-zinc-500 mt-0.5">
                            Drag & drop or click to upload
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 4. SPROCKET HOLES (BOTTOM TRACK - BETWEEN FRAMES & BOTTOM TEXT) */}
            <div
              className="absolute left-0 right-0 pointer-events-none"
              style={{
                top: `${bottomSprocketY}px`,
                height: `${config.sprocketHeight}px`,
              }}
            >
              {Array.from({ length: totalSprockets }).map((_, s) => {
                const spX = startSprocketX + s * pitch;
                if (spX + config.sprocketWidth > geo.filmWidth - geo.outerBorder) return null;
                return (
                  <div
                    key={`bottom-sprocket-${s}`}
                    style={{
                      left: `${spX}px`,
                      width: `${config.sprocketWidth}px`,
                      height: `${config.sprocketHeight}px`,
                      borderRadius: `${config.sprocketRadius}px`,
                      backgroundColor: config.sprocketFillColor,
                      borderColor: config.sprocketBorderColor,
                      borderWidth: '1px',
                    }}
                    className="absolute top-0 shadow-inner"
                  />
                );
              })}
            </div>

            {/* 5. BOTTOM EDGE TEXT / LABEL & BARCODE ROW (AT THE VERY BOTTOM EDGE OF FILM STRIP) */}
            {config.showBottomText && (
              <div
                className="absolute flex items-center pointer-events-none z-10"
                style={{
                  left: `${geo.outerBorder + geo.sideMargin}px`,
                  top: `${geo.bottomTextY - (geo.textAreaHeight / 2)}px`,
                  height: `${geo.textAreaHeight}px`,
                  gap: `${geo.frameDivider}px`,
                }}
              >
                {Array.from({ length: config.frameCount }).map((_, index) => {
                  const frameData = frames[index] || { id: `frame-${index}` };
                  const frameNum = config.startNumber + index;
                  const formattedNum = config.padZeroes
                    ? String(frameNum).padStart(2, '0')
                    : String(frameNum);
                  const defaultLabel = `${config.prefix}${formattedNum}${config.suffix}`;
                  const bottomLabel = frameData.customTextBottom || defaultLabel;

                  return (
                    <div
                      key={`bottom-text-col-${index}`}
                      className={`flex items-center justify-between ${fontFamilyClass}`}
                      style={{
                        width: `${geo.frameWidth}px`,
                        color: config.fontColor,
                        fontSize: `${config.fontSize}px`,
                        lineHeight: 1,
                      }}
                    >
                      <div />
                      <span className="font-bold tracking-wider select-none truncate">
                        {config.showFrameArrows ? `▲ ${bottomLabel} ▲` : bottomLabel}
                      </span>

                      {/* DX Barcode Pattern */}
                      {config.showEdgeBarcodes ? (
                        <div className="flex items-center gap-0.5 opacity-80 pr-1">
                          {[2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 2, 1, 4].map((bw, bi) => (
                            <div
                              key={bi}
                              style={{
                                width: `${bw}px`,
                                height: `${Math.max(5, Math.round(config.fontSize * 0.75))}px`,
                                backgroundColor: bi % 2 === 0 ? config.fontColor : 'transparent',
                              }}
                            />
                          ))}
                        </div>
                      ) : <div />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Video Timeline Scrubber & Frame Extractor Deck */}
      <VideoTimelineDeck
        frames={frames}
        selectedFrameIndex={selectedFrameIndex}
        onSelectFrame={(idx) => onSelectFrame(idx)}
        onUpdateFrameImage={(idx, data) => onUpdateFrameFromVideo(idx, data)}
        videoSource={videoSource}
        onSetVideoSource={onSetVideoSource}
        isOpen={isVideoDeckOpen}
        onToggleOpen={onToggleVideoDeck}
      />

      {/* Status Bar: Active Frame Indicators & Keyboard Shortcuts */}
      <div 
        id="film-status-bar"
        className="h-9 border-t border-zinc-800/80 bg-zinc-900/90 px-4 flex items-center justify-between shrink-0 text-xs text-zinc-400 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-300 text-[11px]">Selected Frame:</span>
          <div className="flex items-center gap-1">
            {Array.from({ length: config.frameCount }).map((_, i) => {
              const hasImg = !!frames[i]?.imageUrl;
              const isSelected = selectedFrameIndex === i;
              return (
                <button
                  key={`frame-dot-${i}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectFrame(i);
                  }}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-mono transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-zinc-950 font-bold shadow-md ring-2 ring-amber-400'
                      : hasImg
                      ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border border-zinc-700'
                      : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 border border-zinc-800'
                  }`}
                  title={`Select Frame #${i + 1} (${hasImg ? 'Has Image' : 'Empty'})`}
                >
                  #{i + 1}
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-[11px] text-zinc-400 hidden md:flex items-center gap-3">
          <span><kbd className="px-1 py-0.5 bg-zinc-800 text-zinc-300 rounded font-mono text-[10px]">Ctrl+Z</kbd> <kbd className="px-1 py-0.5 bg-zinc-800 text-zinc-300 rounded font-mono text-[10px]">Ctrl+Y</kbd> Undo/Redo</span>
          <span>•</span>
          <span><kbd className="px-1 py-0.5 bg-zinc-800 text-zinc-300 rounded font-mono text-[10px]">Arrow Keys</kbd> Nudge Image</span>
          <span>•</span>
          <span><kbd className="px-1 py-0.5 bg-zinc-800 text-zinc-300 rounded font-mono text-[10px]">Alt + ←/→</kbd> Swap Frame</span>
          <span>•</span>
          <span><kbd className="px-1 py-0.5 bg-zinc-800 text-zinc-300 rounded font-mono text-[10px]">Space + Drag</kbd> Pan Canvas</span>
          <span>•</span>
          <span><kbd className="px-1 py-0.5 bg-zinc-800 text-zinc-300 rounded font-mono text-[10px]">Ctrl + Scroll</kbd> Zoom Canvas</span>
          <span>•</span>
          <span><kbd className="px-1 py-0.5 bg-zinc-800 text-zinc-300 rounded font-mono text-[10px]">Esc</kbd> Deselect</span>
        </div>
      </div>

      {/* Frame Options Bottom Bar (Docked directly below Status Bar) */}
      <FrameBottomBar
        frame={selectedFrameIndex !== null ? frames[selectedFrameIndex] : null}
        frameIndex={selectedFrameIndex}
        totalFrames={config.frameCount}
        frameWidth={geo.frameWidth}
        frameHeight={geo.frameHeight}
        onUpdate={(updated) => selectedFrameIndex !== null && onUpdateFrame(selectedFrameIndex, updated)}
        onRemoveImage={() => selectedFrameIndex !== null && onRemoveImageFromFrame(selectedFrameIndex)}
        onReplaceImage={() => selectedFrameIndex !== null && fileInputRefs.current[selectedFrameIndex]?.click()}
        onMoveFrame={(dir) => selectedFrameIndex !== null && onMoveFrame?.(selectedFrameIndex, dir)}
        onSelectFrame={onSelectFrame}
        onClose={() => onSelectFrame(null)}
      />
    </main>
  );
};
