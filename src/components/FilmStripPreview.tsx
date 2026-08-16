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
  Info
} from 'lucide-react';
import { FilmStripConfig, FrameData } from '../types';
import { calculateFilmStripGeometry } from '../utils/canvasExport';
import { FrameAdjuster } from './FrameAdjuster';

interface FilmStripPreviewProps {
  config: FilmStripConfig;
  frames: FrameData[];
  selectedFrameIndex: number | null;
  onSelectFrame: (index: number | null) => void;
  onUpdateFrame: (index: number, data: Partial<FrameData>) => void;
  onUploadImageForFrame: (index: number, file: File) => void;
  onRemoveImageFromFrame: (index: number) => void;
}

export const FilmStripPreview: React.FC<FilmStripPreviewProps> = ({
  config,
  frames,
  selectedFrameIndex,
  onSelectFrame,
  onUpdateFrame,
  onUploadImageForFrame,
  onRemoveImageFromFrame,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  
  // Viewport Zoom Scale for Preview stage
  const [viewportScale, setViewportScale] = useState<number>(1);
  const [fitToWidth, setFitToWidth] = useState<boolean>(true);
  
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
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [fitToWidth, geo.filmWidth, geo.filmHeight]);

  // Handle pointer panning on image
  const handlePointerDown = (e: React.PointerEvent, index: number) => {
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

  // Sprocket calculation along the film strip
  const sprocketsPerFrame = Math.max(2, config.sprocketsPerFrame || 4);
  const pitch = (geo.frameWidth + geo.frameDivider) / sprocketsPerFrame;
  const totalSprockets = Math.ceil(geo.filmWidth / pitch) + 2;
  const startSprocketX = geo.outerBorder + (geo.sideMargin % pitch) / 2;
  
  const topSprocketY = config.sprocketMarginTop + geo.outerBorder;
  const bottomSprocketY = geo.filmHeight - geo.outerBorder - config.sprocketMarginTop - config.sprocketHeight;

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
      onClick={() => onSelectFrame(null)}
    >
      {/* Top Preview Control Bar */}
      <div className="h-12 border-b border-zinc-800/80 bg-zinc-900/60 px-4 flex items-center justify-between shrink-0 z-20 backdrop-blur-sm">
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
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFitToWidth(true);
            }}
            className={`px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
              fitToWidth
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
            title="Zoom Out"
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
              setViewportScale((s) => Math.min(2.0, s + 0.15));
            }}
            className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
            title="Zoom In"
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
      </div>

      {/* Main Interactive Stage Area */}
      <div
        ref={containerRef}
        className="flex-1 w-full h-full overflow-auto flex items-center justify-center p-8 relative film-grain-bg"
      >
        {/* Scaled Film Strip Container */}
        <div
          style={{
            transform: `scale(${viewportScale})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.15s ease-out',
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
            {/* SPROCKET HOLES (TOP TRACK) */}
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

            {/* SPROCKET HOLES (BOTTOM TRACK) */}
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

            {/* FILM FRAMES ROW */}
            <div
              className="absolute flex items-center"
              style={{
                left: `${geo.outerBorder + geo.sideMargin}px`,
                top: `${geo.outerBorder + geo.headerHeight}px`,
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

                const frameNum = config.startNumber + index;
                const formattedNum = config.padZeroes
                  ? String(frameNum).padStart(2, '0')
                  : String(frameNum);
                const defaultLabel = `${config.prefix}${formattedNum}${config.suffix}`;
                const topLabel = frameData.customTextTop || defaultLabel;
                const bottomLabel = frameData.customTextBottom || defaultLabel;

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

                return (
                  <div
                    key={`frame-col-${index}`}
                    className="relative flex flex-col justify-center"
                    style={{ width: `${geo.frameWidth}px` }}
                  >
                    {/* TOP EDGE TEXT / LABEL */}
                    {config.showTopText && (
                      <div
                        className={`absolute left-0 right-0 flex items-center justify-between text-center pointer-events-none ${fontFamilyClass}`}
                        style={{
                          top: `-${geo.headerHeight - topSprocketY - config.sprocketHeight + 6}px`,
                          color: config.fontColor,
                          fontSize: `${config.fontSize}px`,
                        }}
                      >
                        {config.showFilmStockName && config.filmStockName ? (
                          <span className="text-[9px] opacity-85 font-semibold uppercase tracking-wider pl-1">
                            {config.filmStockName}
                          </span>
                        ) : <div />}
                        
                        <span className="font-bold tracking-wider">{topLabel}</span>
                        <div />
                      </div>
                    )}

                    {/* THE APERTURE / IMAGE FRAME BOX */}
                    <div
                      id={`film-frame-${index}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (frameData.imageUrl) {
                          onSelectFrame(index);
                        } else {
                          fileInputRefs.current[index]?.click();
                        }
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
                        backgroundColor: '#050508',
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
                          className={`w-full h-full flex items-center justify-center relative select-none ${
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
                            style={{
                              transform: `translate(${frameData.panX}px, ${frameData.panY}px) rotate(${frameData.rotation}deg) scale(${
                                (frameData.flipH ? -1 : 1) * frameData.zoom
                              }, ${(frameData.flipV ? -1 : 1) * frameData.zoom})`,
                              filter: filterString,
                              maxWidth: 'none',
                              maxHeight: 'none',
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              transition: isPanning ? 'none' : 'transform 0.05s ease-out',
                            }}
                            className="pointer-events-none select-none origin-center"
                          />

                          {/* Quick selection indicators on frame */}
                          {isSelected && (
                            <div className="absolute top-2 left-2 bg-amber-500/90 text-zinc-950 text-[10px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none flex items-center gap-1 font-mono">
                              <Move className="w-2.5 h-2.5" />
                              PAN / ZOOM
                            </div>
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

                    {/* BOTTOM EDGE TEXT / LABEL & BARCODE */}
                    {config.showBottomText && (
                      <div
                        className={`absolute left-0 right-0 flex items-center justify-between pointer-events-none ${fontFamilyClass}`}
                        style={{
                          bottom: `-${geo.footerHeight - (geo.filmHeight - geo.outerBorder - bottomSprocketY) + 6}px`,
                          color: config.fontColor,
                          fontSize: `${config.fontSize}px`,
                        }}
                      >
                        <div />
                        <span className="font-bold tracking-wider">
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
                                  height: `${Math.round(config.fontSize * 0.75)}px`,
                                  backgroundColor: bi % 2 === 0 ? config.fontColor : 'transparent',
                                }}
                              />
                            ))}
                          </div>
                        ) : <div />}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Selected Frame Adjustment Toolbar */}
      {selectedFrameIndex !== null && frames[selectedFrameIndex] && frames[selectedFrameIndex].imageUrl && (
        <div className="absolute bottom-6 right-6 z-40 animate-in slide-in-from-bottom-4 duration-200">
          <FrameAdjuster
            frame={frames[selectedFrameIndex]}
            frameIndex={selectedFrameIndex}
            onUpdate={(updated) => onUpdateFrame(selectedFrameIndex, updated)}
            onRemoveImage={() => onRemoveImageFromFrame(selectedFrameIndex)}
            onReplaceImage={() => fileInputRefs.current[selectedFrameIndex]?.click()}
            onClose={() => onSelectFrame(null)}
          />
        </div>
      )}

      {/* Quick Navigation / Selection Bar at Bottom */}
      <div className="h-10 border-t border-zinc-800/80 bg-zinc-900/80 px-4 flex items-center justify-between shrink-0 text-xs text-zinc-400 z-10">
        <div className="flex items-center gap-2">
          <span>Active Frames:</span>
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
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
                    isSelected
                      ? 'bg-amber-500 text-zinc-950 font-bold'
                      : hasImg
                      ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border border-zinc-700'
                      : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 border border-zinc-800'
                  }`}
                  title={`Frame ${i + 1} (${hasImg ? 'Has Image' : 'Empty'})`}
                >
                  #{i + 1}
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-[11px] text-zinc-500 hidden sm:flex items-center gap-2">
          <span>Shortcuts: <kbd className="px-1 py-0.5 bg-zinc-800 text-zinc-300 rounded font-mono text-[10px]">Esc</kbd> Deselect</span>
          <span>•</span>
          <span><kbd className="px-1 py-0.5 bg-zinc-800 text-zinc-300 rounded font-mono text-[10px]">Scroll</kbd> Zoom Image</span>
        </div>
      </div>
    </main>
  );
};
