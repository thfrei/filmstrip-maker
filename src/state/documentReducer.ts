import {
  FilmStripConfig,
  FrameData,
  FilmStripProject,
  PhotoPrintConfig,
  DEFAULT_FILTERS,
  DEFAULT_CONFIG,
  DEFAULT_PHOTO_PRINT_CONFIG,
} from '../types';
import { SAMPLE_CINEMA_IMAGES } from '../utils/sampleImages';

/**
 * The single "document" object that represents everything the user can edit.
 * This is the granularity at which undo/redo snapshots are taken.
 *
 * Note: `videoSource` is intentionally NOT part of this document. It holds a
 * Blob + object URL and is UI/media state, so it lives outside the undo stack
 * (see App.tsx). Frame captures (JPEG data URLs) ARE included in frames.
 */
export interface ExportSettings {
  exportMode: 'photo_print' | 'single_strip';
  exportMultiplier: number;
  exportFormat: 'image/png' | 'image/jpeg' | 'image/webp';
  exportQuality: number;
  exportFilename: string;
}

export interface DocumentState extends ExportSettings {
  config: FilmStripConfig;
  frames: FrameData[];
  projectName: string;
  photoPrintConfig: PhotoPrintConfig;
}

export type DocumentAction =
  | { type: 'UPDATE_CONFIG'; updates: Partial<FilmStripConfig> }
  | { type: 'RESET_CONFIG' }
  | { type: 'UPDATE_FRAME'; index: number; data: Partial<FrameData> }
  | { type: 'MOVE_FRAME'; fromIndex: number; direction: 'left' | 'right' }
  | { type: 'REMOVE_FRAME_IMAGE'; index: number }
  | { type: 'LOAD_DEMO_IMAGES' }
  | { type: 'CLEAR_ALL_IMAGES' }
  | { type: 'SET_PROJECT_NAME'; name: string }
  | { type: 'SET_EXPORT_SETTINGS'; updates: Partial<ExportSettings> }
  | { type: 'SET_PHOTO_PRINT_CONFIG'; updates: Partial<PhotoPrintConfig> }
  | { type: 'LOAD_PROJECT'; project: FilmStripProject }
  | { type: 'RESET_TO_DEFAULTS' };

/** Creates a single empty frame with default transforms and filters. */
export function createEmptyFrame(index: number): FrameData {
  return {
    id: `frame-${index}-${Date.now()}`,
    imageUrl: null,
    panX: 0,
    panY: 0,
    zoom: 1,
    rotation: 0,
    flipH: false,
    flipV: false,
    filters: { ...DEFAULT_FILTERS },
  };
}

export function createEmptyFrames(count: number): FrameData[] {
  return Array.from({ length: count }).map((_, i) => createEmptyFrame(i));
}

/** Removes the image from a frame, resetting it back to a clean empty state. */
function clearFrameImage(frame: FrameData): FrameData {
  return {
    ...frame,
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
  };
}

/** Grows or shrinks the frames array to match a target frame count. */
function resizeFrames(frames: FrameData[], target: number): FrameData[] {
  if (frames.length === target) return frames;
  if (frames.length < target) {
    const additions = Array.from({ length: target - frames.length }).map((_, i) =>
      createEmptyFrame(frames.length + i)
    );
    return [...frames, ...additions];
  }
  return frames.slice(0, target);
}

/** Builds a fresh document state (used on first mount and "reset to defaults"). */
export function createInitialState(): DocumentState {
  return {
    config: { ...DEFAULT_CONFIG },
    frames: createEmptyFrames(DEFAULT_CONFIG.frameCount),
    projectName: 'Cinema Film Reel',
    exportMode: 'photo_print',
    exportMultiplier: 2,
    exportFormat: 'image/jpeg',
    exportQuality: 0.95,
    exportFilename: 'filmstrip-15x10cm-photo',
    photoPrintConfig: { ...DEFAULT_PHOTO_PRINT_CONFIG },
  };
}

/** Maps a loaded/imported project onto the document state, filling gaps with defaults. */
export function documentStateFromProject(project: FilmStripProject): DocumentState {
  return {
    config: { ...DEFAULT_CONFIG, ...(project.config ?? {}) },
    frames: Array.isArray(project.frames)
      ? project.frames
      : createEmptyFrames(DEFAULT_CONFIG.frameCount),
    projectName: project.projectName ?? 'Untitled Film Reel',
    exportMode: project.exportMode ?? 'photo_print',
    exportMultiplier: project.exportMultiplier ?? 2,
    exportFormat: project.exportFormat ?? 'image/jpeg',
    exportQuality: project.exportQuality !== undefined ? project.exportQuality : 0.95,
    exportFilename: project.exportFilename ?? 'filmstrip-15x10cm-photo',
    photoPrintConfig: { ...DEFAULT_PHOTO_PRINT_CONFIG, ...(project.photoPrintConfig ?? {}) },
  };
}

/**
 * Pure reducer for the film-strip document. Every action transitions the state
 * immutably, which is what makes both unit testing and undo/redo possible.
 */
export function documentReducer(state: DocumentState, action: DocumentAction): DocumentState {
  switch (action.type) {
    case 'UPDATE_CONFIG': {
      const config = { ...state.config, ...action.updates };
      // Keep the frames array in lock-step with the config frame count.
      const frames =
        action.updates.frameCount !== undefined
          ? resizeFrames(state.frames, action.updates.frameCount)
          : state.frames;
      return { ...state, config, frames };
    }

    case 'RESET_CONFIG': {
      // Reset styling back to defaults but preserve the current frame count so
      // no loaded photos are dropped.
      return {
        ...state,
        config: { ...DEFAULT_CONFIG, frameCount: state.config.frameCount },
      };
    }

    case 'UPDATE_FRAME': {
      const frames = state.frames.map((f, i) =>
        i === action.index ? { ...f, ...action.data } : f
      );
      return { ...state, frames };
    }

    case 'MOVE_FRAME': {
      const { fromIndex, direction } = action;
      const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
      if (fromIndex < 0 || toIndex < 0 || toIndex >= state.frames.length) return state;

      const frames = [...state.frames];
      const tmp = frames[fromIndex];
      frames[fromIndex] = frames[toIndex];
      frames[toIndex] = tmp;
      return { ...state, frames };
    }

    case 'REMOVE_FRAME_IMAGE': {
      const frames = state.frames.map((f, i) => (i === action.index ? clearFrameImage(f) : f));
      return { ...state, frames };
    }

    case 'LOAD_DEMO_IMAGES': {
      const frames = state.frames.map((frame, i) => {
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
      return { ...state, frames };
    }

    case 'CLEAR_ALL_IMAGES': {
      return { ...state, frames: state.frames.map(clearFrameImage) };
    }

    case 'SET_PROJECT_NAME':
      return { ...state, projectName: action.name };

    case 'SET_EXPORT_SETTINGS':
      return { ...state, ...action.updates };

    case 'SET_PHOTO_PRINT_CONFIG':
      return {
        ...state,
        photoPrintConfig: {
          ...DEFAULT_PHOTO_PRINT_CONFIG,
          ...state.photoPrintConfig,
          ...action.updates,
        },
      };

    case 'LOAD_PROJECT':
      return documentStateFromProject(action.project);

    case 'RESET_TO_DEFAULTS':
      return { ...createInitialState(), projectName: 'Untitled Film Reel' };

    default:
      return state;
  }
}