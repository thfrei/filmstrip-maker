import React, { useState, useEffect, useCallback } from 'react';
import { 
  FilmStripConfig, 
  FrameData, 
  DEFAULT_CONFIG, 
  DEFAULT_FILTERS 
} from './types';
import { SidebarControls } from './components/SidebarControls';
import { FilmStripPreview } from './components/FilmStripPreview';
import { ExportModal } from './components/ExportModal';
import { SAMPLE_CINEMA_IMAGES } from './utils/sampleImages';

export default function App() {
  const [config, setConfig] = useState<FilmStripConfig>(() => {
    // Try restoring saved config if available
    try {
      const saved = localStorage.getItem('cinema_strip_config');
      return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  // Initialize frames array with default data
  const [frames, setFrames] = useState<FrameData[]>(() => {
    return Array.from({ length: DEFAULT_CONFIG.frameCount }).map((_, i) => ({
      id: `frame-${i}-${Date.now()}`,
      imageUrl: null,
      panX: 0,
      panY: 0,
      zoom: 1,
      rotation: 0,
      flipH: false,
      flipV: false,
      filters: { ...DEFAULT_FILTERS },
    }));
  });

  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // Sync frames array length when config.frameCount changes
  const handleUpdateConfig = useCallback((updated: Partial<FilmStripConfig>) => {
    setConfig((prev) => {
      const newConfig = { ...prev, ...updated };
      try {
        localStorage.setItem('cinema_strip_config', JSON.stringify(newConfig));
      } catch {
        // Ignore localStorage quota errors
      }
      return newConfig;
    });

    if (updated.frameCount !== undefined) {
      const targetCount = updated.frameCount;
      setFrames((prevFrames) => {
        if (prevFrames.length === targetCount) return prevFrames;
        if (prevFrames.length < targetCount) {
          // Add extra empty frames
          const additions: FrameData[] = Array.from({
            length: targetCount - prevFrames.length,
          }).map((_, idx) => ({
            id: `frame-${prevFrames.length + idx}-${Date.now()}`,
            imageUrl: null,
            panX: 0,
            panY: 0,
            zoom: 1,
            rotation: 0,
            flipH: false,
            flipV: false,
            filters: { ...DEFAULT_FILTERS },
          }));
          return [...prevFrames, ...additions];
        } else {
          // Truncate
          return prevFrames.slice(0, targetCount);
        }
      });
    }
  }, []);

  const handleResetConfig = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
  }, []);

  // Update specific frame data
  const handleUpdateFrame = useCallback((index: number, data: Partial<FrameData>) => {
    setFrames((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], ...data };
      }
      return next;
    });
  }, []);

  // Load image from File for frame
  const handleUploadImageForFrame = useCallback((index: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        handleUpdateFrame(index, {
          imageUrl: dataUrl,
          imageName: file.name,
          imageNaturalWidth: img.naturalWidth,
          imageNaturalHeight: img.naturalHeight,
          panX: 0,
          panY: 0,
          zoom: 1,
          rotation: 0,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [handleUpdateFrame]);

  // Remove image from frame
  const handleRemoveImageFromFrame = useCallback((index: number) => {
    handleUpdateFrame(index, {
      imageUrl: null,
      imageName: undefined,
      imageNaturalWidth: undefined,
      imageNaturalHeight: undefined,
      panX: 0,
      panY: 0,
      zoom: 1,
      rotation: 0,
      flipH: false,
      flipV: false,
      filters: { ...DEFAULT_FILTERS },
    });
  }, [handleUpdateFrame]);

  // Batch upload multiple images to sequential frames
  const handleBatchUpload = useCallback((files: FileList) => {
    const imgFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    imgFiles.forEach((file, i) => {
      if (i < config.frameCount) {
        handleUploadImageForFrame(i, file);
      }
    });
    if (imgFiles.length > 0) {
      setSelectedFrameIndex(0);
    }
  }, [config.frameCount, handleUploadImageForFrame]);

  // Load curated sample cinema stills
  const handleLoadDemoImages = useCallback(() => {
    setFrames((prev) => {
      return prev.map((frame, i) => {
        const sample = SAMPLE_CINEMA_IMAGES[i % SAMPLE_CINEMA_IMAGES.length];
        return {
          ...frame,
          imageUrl: sample.url,
          imageName: sample.title,
          panX: 0,
          panY: 0,
          zoom: 1,
          rotation: 0,
          flipH: false,
          flipV: false,
          filters: { ...DEFAULT_FILTERS },
        };
      });
    });
  }, []);

  // Clear all images
  const handleClearAllImages = useCallback(() => {
    setFrames((prev) =>
      prev.map((frame) => ({
        ...frame,
        imageUrl: null,
        imageName: undefined,
        panX: 0,
        panY: 0,
        zoom: 1,
        rotation: 0,
        flipH: false,
        flipV: false,
        filters: { ...DEFAULT_FILTERS },
      }))
    );
    setSelectedFrameIndex(null);
  }, []);

  // Keyboard navigation & shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If typing in input or textarea, don't trigger shortcuts
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'Escape') {
        if (isExportModalOpen) {
          setIsExportModalOpen(false);
        } else {
          setSelectedFrameIndex(null);
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedFrameIndex !== null) {
          handleRemoveImageFromFrame(selectedFrameIndex);
        }
      } else if (e.key === 'ArrowRight' && selectedFrameIndex !== null) {
        setSelectedFrameIndex((prev) => (prev !== null ? Math.min(config.frameCount - 1, prev + 1) : null));
      } else if (e.key === 'ArrowLeft' && selectedFrameIndex !== null) {
        setSelectedFrameIndex((prev) => (prev !== null ? Math.max(0, prev - 1) : null));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFrameIndex, config.frameCount, isExportModalOpen, handleRemoveImageFromFrame]);

  const filledFramesCount = frames.filter((f) => !!f.imageUrl).length;

  return (
    <div id="cinema-app-root" className="flex flex-col lg:flex-row h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
      {/* Left Configuration & Controls Sidebar */}
      <SidebarControls
        config={config}
        onUpdateConfig={handleUpdateConfig}
        onResetConfig={handleResetConfig}
        onLoadDemoImages={handleLoadDemoImages}
        onBatchUpload={handleBatchUpload}
        onClearAllImages={handleClearAllImages}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        filledFramesCount={filledFramesCount}
        totalFramesCount={config.frameCount}
      />

      {/* Main Interactive Film Strip Canvas Preview Area */}
      <FilmStripPreview
        config={config}
        frames={frames}
        selectedFrameIndex={selectedFrameIndex}
        onSelectFrame={setSelectedFrameIndex}
        onUpdateFrame={handleUpdateFrame}
        onUploadImageForFrame={handleUploadImageForFrame}
        onRemoveImageFromFrame={handleRemoveImageFromFrame}
      />

      {/* High-Resolution Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        config={config}
        frames={frames}
        defaultMultiplier={2}
      />
    </div>
  );
}
