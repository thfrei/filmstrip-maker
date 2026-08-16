import { FilmStripConfig, FrameData, FilmStripProject, DEFAULT_CONFIG, PROJECT_VERSION, PhotoPrintConfig } from '../types';

const DB_NAME = 'CinemaFilmStripDB';
const DB_VERSION = 1;
const STORE_NAME = 'project_cache';
const KEY_CURRENT_STATE = 'current_filmstrip_state';

/**
 * Opens or initializes the IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });
}

/**
 * Persist current configuration and frame data to IndexedDB
 */
export async function saveCurrentStateToStorage(
  config: FilmStripConfig,
  frames: FrameData[],
  projectName: string = 'Untitled Film Strip',
  exportSettings?: {
    exportMode?: 'photo_print' | 'single_strip';
    exportMultiplier?: number;
    exportFormat?: 'image/png' | 'image/jpeg' | 'image/webp';
    exportQuality?: number;
    exportFilename?: string;
    photoPrintConfig?: PhotoPrintConfig;
  }
): Promise<void> {
  try {
    const db = await openDB();
    const project: FilmStripProject = {
      version: PROJECT_VERSION,
      projectName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      config,
      frames,
      exportMode: exportSettings?.exportMode,
      exportMultiplier: exportSettings?.exportMultiplier,
      exportFormat: exportSettings?.exportFormat,
      exportQuality: exportSettings?.exportQuality,
      exportFilename: exportSettings?.exportFilename,
      photoPrintConfig: exportSettings?.photoPrintConfig,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const putReq = store.put(project, KEY_CURRENT_STATE);

      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn('Failed to save state to IndexedDB, attempting fallback:', err);
    // Fallback without big image strings to avoid quota crashes if IDB is disabled
    try {
      localStorage.setItem('filmstrip_config_fallback', JSON.stringify(config));
    } catch {
      // ignore
    }
  }
}

/**
 * Load cached state from IndexedDB across page reloads
 */
export async function loadCurrentStateFromStorage(): Promise<FilmStripProject | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(KEY_CURRENT_STATE);

      getReq.onsuccess = () => {
        const result = getReq.result as FilmStripProject | undefined;
        db.close();
        if (result && result.config && Array.isArray(result.frames)) {
          resolve(result);
        } else {
          resolve(null);
        }
      };

      getReq.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch (err) {
    console.warn('Could not read from IndexedDB:', err);
    return null;
  }
}

/**
 * Clear cached state from IndexedDB
 */
export async function clearStorageState(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const delReq = store.delete(KEY_CURRENT_STATE);

      delReq.onsuccess = () => resolve();
      delReq.onerror = () => reject(delReq.error);
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn('Could not clear IndexedDB state:', err);
  }
}
