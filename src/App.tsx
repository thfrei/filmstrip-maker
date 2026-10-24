import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  FilmStripConfig, 
  FrameData, 
  FilmStripProject,
  PhotoPrintConfig,
  VideoSourceInfo,
  DEFAULT_CONFIG, 
  DEFAULT_FILTERS,
  DEFAULT_PHOTO_PRINT_CONFIG
} from './types';
import { SidebarControls } from './components/SidebarControls';
import { FilmStripPreview } from './components/FilmStripPreview';
import { ExportModal } from './components/ExportModal';
import { ProjectSaveLoadModal } from './components/ProjectSaveLoadModal';
import { SAMPLE_CINEMA_IMAGES } from './utils/sampleImages';
import { loadCurrentStateFromStorage, saveCurrentStateToStorage } from './utils/storage';

export default function App() {
  const [config, setConfig] = useState<FilmStripConfig>(DEFAULT_CONFIG);
  const [projectName, setProjectName] = useState<string>('Cinema Film Reel');
  const [isLoadedFromStorage, setIsLoadedFromStorage] = useState<boolean>(false);
  const [lastAutoSavedTime, setLastAutoSavedTime] = useState<Date | null>(null);

  // Persistent Export Settings State
  const [exportMode, setExportMode] = useState<'photo_print' | 'single_strip'>('photo_print');
  const [exportMultiplier, setExportMultiplier] = useState<number>(2);
  const [exportFormat, setExportFormat] = useState<'image/png' | 'image/jpeg' | 'image/webp'>('image/jpeg');
  const [exportQuality, setExportQuality] = useState<number>(0.95);
  const [exportFilename, setExportFilename] = useState<string>('filmstrip-15x10cm-photo');
  const [photoPrintConfig, setPhotoPrintConfig] = useState<PhotoPrintConfig>(DEFAULT_PHOTO_PRINT_CONFIG);

  // Initialize frames array with default empty data
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
  const [isProjectModalOpen, setIsProjectModalOpen] = useState<boolean>(false);

  // Movie Frame Extractor Video Source state
  const [videoSource, setVideoSource] = useState<VideoSourceInfo | null>(null);
  const [isVideoDeckOpen, setIsVideoDeckOpen] = useState<boolean>(false);

  // Load saved state from IndexedDB across page reloads on initial mount
  useEffect(() => {
    let isMounted = true;
    loadCurrentStateFromStorage()
      .then((savedProject) => {
        if (!isMounted) return;
        if (savedProject && savedProject.config && Array.isArray(savedProject.frames) && savedProject.frames.length > 0) {
          setConfig({ ...DEFAULT_CONFIG, ...savedProject.config });
          setFrames(savedProject.frames);
          if (savedProject.projectName) {
            setProjectName(savedProject.projectName);
          }
          if (savedProject.updatedAt) {
            setLastAutoSavedTime(new Date(savedProject.updatedAt));
          }
          if (savedProject.exportMode) setExportMode(savedProject.exportMode);
          if (savedProject.exportMultiplier) setExportMultiplier(savedProject.exportMultiplier);
          if (savedProject.exportFormat) setExportFormat(savedProject.exportFormat);
          if (savedProject.exportQuality !== undefined) setExportQuality(savedProject.exportQuality);
          if (savedProject.exportFilename) setExportFilename(savedProject.exportFilename);
          if (savedProject.photoPrintConfig) {
            setPhotoPrintConfig({ ...DEFAULT_PHOTO_PRINT_CONFIG, ...savedProject.photoPrintConfig });
          }
        }
        setIsLoadedFromStorage(true);
      })
      .catch((err) => {
        console.warn('Could not load cached state from IndexedDB:', err);
        setIsLoadedFromStorage(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Debounced auto-save to IndexedDB whenever config, frames, projectName or export settings change
  useEffect(() => {
    if (!isLoadedFromStorage) return;

    const timer = setTimeout(() => {
      saveCurrentStateToStorage(config, frames, projectName, {
        exportMode,
        exportMultiplier,
        exportFormat,
        exportQuality,
        exportFilename,
        photoPrintConfig,
      })
        .then(() => {
          setLastAutoSavedTime(new Date());
        })
        .catch((err) => {
          console.warn('Auto-save error:', err);
        });
    }, 500);

    return () => clearTimeout(timer);
  }, [config, frames, projectName, exportMode, exportMultiplier, exportFormat, exportQuality, exportFilename, photoPrintConfig, isLoadedFromStorage]);

  // Sync frames array length when config.frameCount changes
  const handleUpdateConfig = useCallback((updated: Partial<FilmStripConfig>) => {
    setConfig((prev) => {
      const newConfig = { ...prev, ...updated };
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

  // Update frame directly from video frame capture
  const handleUpdateFrameFromVideo = useCallback(
    (
      index: number,
      data: {
        imageUrl: string;
        imageNaturalWidth: number;
        imageNaturalHeight: number;
        videoTimestamp: number;
        sourceVideoName: string;
        imageName: string;
      }
    ) => {
      handleUpdateFrame(index, {
        imageUrl: data.imageUrl,
        imageNaturalWidth: data.imageNaturalWidth,
        imageNaturalHeight: data.imageNaturalHeight,
        videoTimestamp: data.videoTimestamp,
        sourceVideoName: data.sourceVideoName,
        imageName: data.imageName,
        panX: 0,
        panY: 0,
        zoom: 1,
        rotation: 0,
      });
      setSelectedFrameIndex(index);
    },
    [handleUpdateFrame]
  );

  const handleSetVideoSource = useCallback((source: VideoSourceInfo | null) => {
    setVideoSource(source);
    if (source) {
      setIsVideoDeckOpen(true);
    }
  }, []);

  // Move / Swap frame position left or right
  const handleMoveFrame = useCallback((fromIndex: number, direction: 'left' | 'right') => {
    const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= frames.length) return;

    setFrames((prev) => {
      const next = [...prev];
      const temp = next[fromIndex];
      next[fromIndex] = next[toIndex];
      next[toIndex] = temp;
      return next;
    });
    setSelectedFrameIndex(toIndex);
  }, [frames.length]);

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

  // Full Project Load handler
  const handleLoadProject = useCallback((project: FilmStripProject) => {
    if (project.config) {
      setConfig({ ...DEFAULT_CONFIG, ...project.config });
    }
    if (Array.isArray(project.frames)) {
      setFrames(project.frames);
    }
    if (project.projectName) {
      setProjectName(project.projectName);
    }
    if (project.exportMode) {
      setExportMode(project.exportMode);
    }
    if (project.exportMultiplier) {
      setExportMultiplier(project.exportMultiplier);
    }
    if (project.exportFormat) {
      setExportFormat(project.exportFormat);
    }
    if (project.exportQuality !== undefined) {
      setExportQuality(project.exportQuality);
    }
    if (project.exportFilename) {
      setExportFilename(project.exportFilename);
    }
    if (project.photoPrintConfig) {
      setPhotoPrintConfig({ ...DEFAULT_PHOTO_PRINT_CONFIG, ...project.photoPrintConfig });
    }
    setSelectedFrameIndex(null);
    setLastAutoSavedTime(new Date());
  }, []);

  // Reset to default fresh project
  const handleResetToDefaults = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    setProjectName('Untitled Film Reel');
    setExportMode('photo_print');
    setExportMultiplier(2);
    setExportFormat('image/jpeg');
    setExportQuality(0.95);
    setExportFilename('filmstrip-15x10cm-photo');
    setPhotoPrintConfig(DEFAULT_PHOTO_PRINT_CONFIG);
    setFrames(
      Array.from({ length: DEFAULT_CONFIG.frameCount }).map((_, i) => ({
        id: `frame-${i}-${Date.now()}`,
        imageUrl: null,
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
      // If typing in input or textarea, don't trigger global shortcuts
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'Escape') {
        if (isExportModalOpen) {
          setIsExportModalOpen(false);
        } else if (isProjectModalOpen) {
          setIsProjectModalOpen(false);
        } else {
          setSelectedFrameIndex(null);
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedFrameIndex !== null) {
          handleRemoveImageFromFrame(selectedFrameIndex);
        }
      } else if (
        selectedFrameIndex !== null &&
        (e.altKey || (e.ctrlKey && e.shiftKey)) &&
        (e.key === 'ArrowLeft' || e.key === 'ArrowRight')
      ) {
        // Alt + Arrow Left/Right swaps frame with adjacent frame
        e.preventDefault();
        handleMoveFrame(selectedFrameIndex, e.key === 'ArrowLeft' ? 'left' : 'right');
      } else if (
        selectedFrameIndex !== null &&
        frames[selectedFrameIndex]?.imageUrl &&
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
      ) {
        // When an image is selected, arrow keys move the image inside the frame
        e.preventDefault();
        const step = e.shiftKey ? 20 : 4;
        const currentFrame = frames[selectedFrameIndex];
        let newPanX = currentFrame.panX;
        let newPanY = currentFrame.panY;

        if (e.key === 'ArrowLeft') newPanX -= step;
        if (e.key === 'ArrowRight') newPanX += step;
        if (e.key === 'ArrowUp') newPanY -= step;
        if (e.key === 'ArrowDown') newPanY += step;

        handleUpdateFrame(selectedFrameIndex, { panX: newPanX, panY: newPanY });
      } else if (e.key === 'ArrowRight' && selectedFrameIndex !== null && !frames[selectedFrameIndex]?.imageUrl) {
        setSelectedFrameIndex((prev) => (prev !== null ? Math.min(config.frameCount - 1, prev + 1) : null));
      } else if (e.key === 'ArrowLeft' && selectedFrameIndex !== null && !frames[selectedFrameIndex]?.imageUrl) {
        setSelectedFrameIndex((prev) => (prev !== null ? Math.max(0, prev - 1) : null));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFrameIndex, frames, config.frameCount, isExportModalOpen, isProjectModalOpen, handleRemoveImageFromFrame, handleUpdateFrame, handleMoveFrame]);

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
        onOpenProjectModal={() => setIsProjectModalOpen(true)}
        onToggleMovieDeck={() => setIsVideoDeckOpen((v) => !v)}
        isVideoLoaded={!!videoSource}
        filledFramesCount={filledFramesCount}
        totalFramesCount={config.frameCount}
        lastAutoSavedTime={lastAutoSavedTime}
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
        onMoveFrame={handleMoveFrame}
        onOpenProjectModal={() => setIsProjectModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        videoSource={videoSource}
        onSetVideoSource={handleSetVideoSource}
        isVideoDeckOpen={isVideoDeckOpen}
        onToggleVideoDeck={() => setIsVideoDeckOpen((v) => !v)}
        onUpdateFrameFromVideo={handleUpdateFrameFromVideo}
      />

      {/* High-Resolution Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        config={config}
        frames={frames}
        exportMode={exportMode}
        onUpdateExportMode={setExportMode}
        photoPrintConfig={photoPrintConfig}
        onUpdatePhotoPrintConfig={setPhotoPrintConfig}
        multiplier={exportMultiplier}
        onUpdateMultiplier={setExportMultiplier}
        format={exportFormat}
        onUpdateFormat={setExportFormat}
        quality={exportQuality}
        onUpdateQuality={setExportQuality}
        filename={exportFilename}
        onUpdateFilename={setExportFilename}
        defaultMultiplier={2}
      />

      {/* Complete Project Save & Load Modal */}
      <ProjectSaveLoadModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        config={config}
        frames={frames}
        projectName={projectName}
        onProjectNameChange={setProjectName}
        onLoadProject={handleLoadProject}
        onResetToDefaults={handleResetToDefaults}
        lastAutoSavedTime={lastAutoSavedTime}
        exportSettings={{
          exportMode,
          exportMultiplier,
          exportFormat,
          exportQuality,
          exportFilename,
          photoPrintConfig,
        }}
      />
    </div>
  );
}

