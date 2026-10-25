import React, { useState, useEffect, useCallback } from 'react';
import {
  FilmStripConfig,
  FrameData,
  FilmStripProject,
  PhotoPrintConfig,
  VideoSourceInfo,
} from './types';
import { SidebarControls } from './components/SidebarControls';
import { FilmStripPreview } from './components/FilmStripPreview';
import { ExportModal } from './components/ExportModal';
import { ProjectSaveLoadModal } from './components/ProjectSaveLoadModal';
import { loadCurrentStateFromStorage, saveCurrentStateToStorage } from './utils/storage';
import {
  documentReducer,
  createInitialState,
  documentStateFromProject,
  ExportSettings,
} from './state/documentReducer';
import { useUndoableReducer } from './state/useUndoableReducer';

export default function App() {
  const {
    state,
    dispatch,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
  } = useUndoableReducer(documentReducer, createInitialState());

  const {
    config,
    frames,
    projectName,
    exportMode,
    exportMultiplier,
    exportFormat,
    exportQuality,
    exportFilename,
    photoPrintConfig,
  } = state;

  // ---- UI / media state (NOT part of the undoable document) ----
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(0);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState<boolean>(false);
  const [isVideoDeckOpen, setIsVideoDeckOpen] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [videoSource, setVideoSource] = useState<VideoSourceInfo | null>(null);
  const [isLoadedFromStorage, setIsLoadedFromStorage] = useState<boolean>(false);
  const [lastAutoSavedTime, setLastAutoSavedTime] = useState<Date | null>(null);

  // Load saved state from IndexedDB across page reloads (not undoable).
  useEffect(() => {
    let isMounted = true;
    loadCurrentStateFromStorage()
      .then((savedProject) => {
        if (!isMounted) return;
        if (
          savedProject &&
          savedProject.config &&
          Array.isArray(savedProject.frames) &&
          savedProject.frames.length > 0
        ) {
          reset(documentStateFromProject(savedProject));
          if (savedProject.updatedAt) {
            setLastAutoSavedTime(new Date(savedProject.updatedAt));
          }
          if (
            savedProject.videoSource &&
            savedProject.videoSource.url &&
            savedProject.videoSource.url.trim() !== ''
          ) {
            setVideoSource(savedProject.videoSource);
            setIsVideoDeckOpen(true);
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
  }, [reset]);

  // Debounced auto-save to IndexedDB whenever the document or video changes.
  useEffect(() => {
    if (!isLoadedFromStorage) return;

    const timer = setTimeout(() => {
      saveCurrentStateToStorage(
        config,
        frames,
        projectName,
        {
          exportMode,
          exportMultiplier,
          exportFormat,
          exportQuality,
          exportFilename,
          photoPrintConfig,
        },
        videoSource
      )
        .then(() => {
          setLastAutoSavedTime(new Date());
        })
        .catch((err) => {
          console.warn('Auto-save error:', err);
        });
    }, 500);

    return () => clearTimeout(timer);
  }, [
    config,
    frames,
    projectName,
    exportMode,
    exportMultiplier,
    exportFormat,
    exportQuality,
    exportFilename,
    photoPrintConfig,
    videoSource,
    isLoadedFromStorage,
  ]);

  // ---- Document mutation handlers (thin wrappers over the reducer) ----
  const handleUpdateConfig = useCallback(
    (updates: Partial<FilmStripConfig>) => dispatch({ type: 'UPDATE_CONFIG', updates }),
    [dispatch]
  );

  const handleResetConfig = useCallback(() => dispatch({ type: 'RESET_CONFIG' }), [dispatch]);

  const handleUpdateFrame = useCallback(
    (index: number, data: Partial<FrameData>) => dispatch({ type: 'UPDATE_FRAME', index, data }),
    [dispatch]
  );

  const handleMoveFrame = useCallback(
    (fromIndex: number, direction: 'left' | 'right') => {
      const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
      if (toIndex < 0 || toIndex >= frames.length) return;
      dispatch({ type: 'MOVE_FRAME', fromIndex, direction });
      setSelectedFrameIndex(toIndex);
    },
    [dispatch, frames.length]
  );

  const handleRemoveImageFromFrame = useCallback(
    (index: number) => dispatch({ type: 'REMOVE_FRAME_IMAGE', index }),
    [dispatch]
  );

  // Load image from File for frame.
  const handleUploadImageForFrame = useCallback(
    (index: number, file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          dispatch({
            type: 'UPDATE_FRAME',
            index,
            data: {
              imageUrl: dataUrl,
              imageName: file.name,
              imageNaturalWidth: img.naturalWidth,
              imageNaturalHeight: img.naturalHeight,
              panX: 0,
              panY: 0,
              zoom: 1,
              rotation: 0,
            },
          });
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    },
    [dispatch]
  );

  // Update frame directly from video frame capture.
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
      dispatch({
        type: 'UPDATE_FRAME',
        index,
        data: {
          ...data,
          panX: 0,
          panY: 0,
          zoom: 1,
          rotation: 0,
        },
      });
      setSelectedFrameIndex(index);
    },
    [dispatch]
  );

  const handleSetVideoSource = useCallback((source: VideoSourceInfo | null) => {
    if (source && (!source.url || source.url.trim() === '')) {
      setVideoSource(null);
      return;
    }
    setVideoSource(source);
    if (source) {
      setIsVideoDeckOpen(true);
    }
  }, []);

  // Batch upload multiple images to sequential frames.
  const handleBatchUpload = useCallback(
    (files: FileList) => {
      const imgFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
      imgFiles.forEach((file, i) => {
        if (i < config.frameCount) {
          handleUploadImageForFrame(i, file);
        }
      });
      if (imgFiles.length > 0) {
        setSelectedFrameIndex(0);
      }
    },
    [config.frameCount, handleUploadImageForFrame]
  );

  const handleLoadDemoImages = useCallback(() => dispatch({ type: 'LOAD_DEMO_IMAGES' }), [dispatch]);

  const handleClearAllImages = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_IMAGES' });
    setSelectedFrameIndex(null);
  }, [dispatch]);

  const handleLoadProject = useCallback(
    (project: FilmStripProject) => {
      dispatch({ type: 'LOAD_PROJECT', project });
      if (project.videoSource && project.videoSource.url && project.videoSource.url.trim() !== '') {
        setVideoSource(project.videoSource);
        setIsVideoDeckOpen(true);
      } else {
        setVideoSource(null);
        setIsVideoDeckOpen(false);
      }
      setSelectedFrameIndex(0);
      setLastAutoSavedTime(new Date());
    },
    [dispatch]
  );

  const handleResetToDefaults = useCallback(() => {
    dispatch({ type: 'RESET_TO_DEFAULTS' });
    setVideoSource(null);
    setIsVideoDeckOpen(false);
    setSelectedFrameIndex(0);
  }, [dispatch]);

  const handleSetProjectName = useCallback(
    (name: string) => dispatch({ type: 'SET_PROJECT_NAME', name }),
    [dispatch]
  );

  const handleUpdateExportSettings = useCallback(
    (updates: Partial<ExportSettings>) => dispatch({ type: 'SET_EXPORT_SETTINGS', updates }),
    [dispatch]
  );

  const handleUpdatePhotoPrintConfig = useCallback(
    (updates: Partial<PhotoPrintConfig>) => dispatch({ type: 'SET_PHOTO_PRINT_CONFIG', updates }),
    [dispatch]
  );

  // Keyboard navigation & shortcuts.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If typing in input or textarea, don't trigger global shortcuts.
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const mod = e.ctrlKey || e.metaKey;

      if (mod && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }

      if (mod && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
        return;
      }

      if (e.key === 'Escape') {
        if (isExportModalOpen) {
          setIsExportModalOpen(false);
        } else if (isProjectModalOpen) {
          setIsProjectModalOpen(false);
        } else if (isMobileSidebarOpen) {
          setIsMobileSidebarOpen(false);
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
        e.preventDefault();
        handleMoveFrame(selectedFrameIndex, e.key === 'ArrowLeft' ? 'left' : 'right');
      } else if (
        selectedFrameIndex !== null &&
        frames[selectedFrameIndex]?.imageUrl &&
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
      ) {
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
      } else if (
        e.key === 'ArrowRight' &&
        selectedFrameIndex !== null &&
        !frames[selectedFrameIndex]?.imageUrl
      ) {
        setSelectedFrameIndex((prev) =>
          prev !== null ? Math.min(config.frameCount - 1, prev + 1) : null
        );
      } else if (
        e.key === 'ArrowLeft' &&
        selectedFrameIndex !== null &&
        !frames[selectedFrameIndex]?.imageUrl
      ) {
        setSelectedFrameIndex((prev) => (prev !== null ? Math.max(0, prev - 1) : null));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedFrameIndex,
    frames,
    config.frameCount,
    isExportModalOpen,
    isProjectModalOpen,
    isMobileSidebarOpen,
    handleRemoveImageFromFrame,
    handleUpdateFrame,
    handleMoveFrame,
    undo,
    redo,
  ]);

  const filledFramesCount = frames.filter((f) => !!f.imageUrl).length;

  return (
    <div
      id="cinema-app-root"
      className="flex flex-col lg:flex-row h-screen supports-[height:100dvh]:h-[100dvh] w-full overflow-hidden bg-zinc-950 text-zinc-100 font-sans"
    >
      {/* Mobile drawer backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-[45] bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Left Configuration & Controls Sidebar */}
      <SidebarControls
        config={config}
        frames={frames}
        selectedFrameIndex={selectedFrameIndex}
        onSelectFrame={setSelectedFrameIndex}
        onUpdateFrame={handleUpdateFrame}
        onRemoveImageFromFrame={handleRemoveImageFromFrame}
        onUploadImageForFrame={handleUploadImageForFrame}
        onMoveFrame={handleMoveFrame}
        onUpdateConfig={handleUpdateConfig}
        onResetConfig={handleResetConfig}
        onLoadDemoImages={handleLoadDemoImages}
        onBatchUpload={handleBatchUpload}
        onClearAllImages={handleClearAllImages}
        onOpenExportModal={() => {
          setIsMobileSidebarOpen(false);
          setIsExportModalOpen(true);
        }}
        onOpenProjectModal={() => {
          setIsMobileSidebarOpen(false);
          setIsProjectModalOpen(true);
        }}
        onToggleMovieDeck={() => {
          setIsMobileSidebarOpen(false);
          setIsVideoDeckOpen((v) => !v);
        }}
        isVideoLoaded={!!videoSource}
        filledFramesCount={filledFramesCount}
        totalFramesCount={config.frameCount}
        lastAutoSavedTime={lastAutoSavedTime}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Interactive Film Strip Canvas Preview Area */}
      <FilmStripPreview
        config={config}
        frames={frames}
        selectedFrameIndex={selectedFrameIndex}
        onSelectFrame={setSelectedFrameIndex}
        onUpdateFrame={handleUpdateFrame}
        onUploadImageForFrame={handleUploadImageForFrame}
        onMoveFrame={handleMoveFrame}
        onOpenProjectModal={() => setIsProjectModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        videoSource={videoSource}
        onSetVideoSource={handleSetVideoSource}
        isVideoDeckOpen={isVideoDeckOpen}
        onToggleVideoDeck={() => setIsVideoDeckOpen((v) => !v)}
        onUpdateFrameFromVideo={handleUpdateFrameFromVideo}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        isMobileSidebarOpen={isMobileSidebarOpen}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen((v) => !v)}
      />

      {/* High-Resolution Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        config={config}
        frames={frames}
        exportMode={exportMode}
        onUpdateExportMode={(mode) => handleUpdateExportSettings({ exportMode: mode })}
        photoPrintConfig={photoPrintConfig}
        onUpdatePhotoPrintConfig={handleUpdatePhotoPrintConfig}
        multiplier={exportMultiplier}
        onUpdateMultiplier={(multiplier) => handleUpdateExportSettings({ exportMultiplier: multiplier })}
        format={exportFormat}
        onUpdateFormat={(format) => handleUpdateExportSettings({ exportFormat: format })}
        quality={exportQuality}
        onUpdateQuality={(quality) => handleUpdateExportSettings({ exportQuality: quality })}
        filename={exportFilename}
        onUpdateFilename={(filename) => handleUpdateExportSettings({ exportFilename: filename })}
        defaultMultiplier={2}
      />

      {/* Complete Project Save & Load Modal */}
      <ProjectSaveLoadModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        config={config}
        frames={frames}
        projectName={projectName}
        onProjectNameChange={handleSetProjectName}
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
          videoSource,
        }}
      />
    </div>
  );
}