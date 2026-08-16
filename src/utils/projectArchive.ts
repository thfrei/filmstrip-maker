import JSZip from 'jszip';
import { FilmStripConfig, FrameData, FilmStripProject, PROJECT_VERSION } from '../types';

/**
 * Converts a data URL, blob URL or remote URL to an ArrayBuffer and mimeType
 */
async function urlToArrayBuffer(url: string): Promise<{ data: ArrayBuffer; mime: string; ext: string }> {
  if (url.startsWith('data:')) {
    const mimeMatch = url.match(/^data:([^;]+);base64,/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
    const base64Data = url.split(',')[1];
    const binaryStr = window.atob(base64Data);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return { data: bytes.buffer, mime, ext };
  }

  // Remote or blob URL
  const response = await fetch(url, { mode: 'cors' });
  const blob = await response.blob();
  const mime = blob.type || 'image/jpeg';
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
  const arrayBuffer = await blob.arrayBuffer();
  return { data: arrayBuffer, mime, ext };
}

/**
 * Converts a Blob to a Data URL string
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Exports complete project (settings + binary image assets) as a compressed ZIP file (.filmproj or .zip)
 */
export async function exportProjectAsZip(
  config: FilmStripConfig,
  frames: FrameData[],
  projectName: string = 'cinema_filmstrip_project',
  fileExtension: 'filmproj' | 'zip' = 'filmproj',
  onProgress?: (percent: number, status: string) => void
): Promise<void> {
  if (onProgress) onProgress(10, 'Initializing zip archive...');
  const zip = new JSZip();

  const assetsFolder = zip.folder('assets');
  const projectFramesMeta: any[] = [];

  const totalFrames = frames.length;

  for (let i = 0; i < totalFrames; i++) {
    const frame = frames[i];
    if (onProgress) {
      onProgress(
        10 + Math.round(((i + 1) / (totalFrames + 1)) * 60),
        `Packaging frame ${i + 1}/${totalFrames} assets...`
      );
    }

    let assetFilename: string | null = null;

    if (frame.imageUrl) {
      try {
        const { data, mime, ext } = await urlToArrayBuffer(frame.imageUrl);
        assetFilename = `frame_${i + 1}_${Date.now()}.${ext}`;
        if (assetsFolder) {
          assetsFolder.file(assetFilename, data, { binary: true });
        }
      } catch (err) {
        console.warn(`Could not package image for frame ${i}:`, err);
      }
    }

    // Strip bulky imageUrl from project manifest and reference relative asset file
    const { imageUrl, ...restFrame } = frame;
    projectFramesMeta.push({
      ...restFrame,
      assetFilename,
      hasImage: !!assetFilename,
    });
  }

  const manifest = {
    version: PROJECT_VERSION,
    format: 'cinema_filmstrip_bundle_v1',
    projectName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    config,
    frames: projectFramesMeta,
  };

  zip.file('project.json', JSON.stringify(manifest, null, 2));

  // Add README
  const readmeContent = `CINEMA FILM STRIP PROJECT ARCHIVE
====================================
Project Name: ${projectName}
Created: ${new Date().toLocaleString()}
Frames: ${frames.length}

This archive contains:
- project.json: Full strip styling parameters, sprockets, fonts, frame layouts, filters, and pan/zoom transforms.
- assets/: High-resolution image files for each frame.

You can drag and drop this .${fileExtension} file directly into the Cinema Film Strip Generator to reopen and edit your project anytime!
`;
  zip.file('README.txt', readmeContent);

  if (onProgress) onProgress(75, 'Compressing archive...');

  const content = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      if (onProgress) {
        onProgress(75 + Math.round(metadata.percent * 0.2), `Compressing: ${Math.round(metadata.percent)}%`);
      }
    }
  );

  if (onProgress) onProgress(98, 'Triggering download...');

  // Trigger download
  const blobUrl = URL.createObjectURL(content);
  const link = document.createElement('a');
  const sanitizedName = (projectName || 'filmstrip_project').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
  link.download = `${sanitizedName}.${fileExtension}`;
  link.href = blobUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);

  if (onProgress) onProgress(100, 'Complete!');
}

/**
 * Exports complete project as a single self-contained JSON file (includes base64 data URLs)
 */
export async function exportProjectAsJson(
  config: FilmStripConfig,
  frames: FrameData[],
  projectName: string = 'cinema_filmstrip_project',
  onProgress?: (percent: number, status: string) => void
): Promise<void> {
  if (onProgress) onProgress(20, 'Preparing JSON project payload...');

  // Convert any blob/remote URLs to robust base64 data URLs so the JSON is fully standalone
  const serializedFrames: FrameData[] = [];

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    if (onProgress) {
      onProgress(
        20 + Math.round(((i + 1) / frames.length) * 60),
        `Encoding frame ${i + 1}/${frames.length}...`
      );
    }

    if (frame.imageUrl && !frame.imageUrl.startsWith('data:')) {
      try {
        const res = await fetch(frame.imageUrl);
        const blob = await res.blob();
        const dataUrl = await blobToDataUrl(blob);
        serializedFrames.push({
          ...frame,
          imageUrl: dataUrl,
        });
      } catch {
        serializedFrames.push(frame);
      }
    } else {
      serializedFrames.push(frame);
    }
  }

  const project: FilmStripProject = {
    version: PROJECT_VERSION,
    projectName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    config,
    frames: serializedFrames,
  };

  if (onProgress) onProgress(90, 'Generating JSON download...');

  const jsonStr = JSON.stringify(project, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const sanitizedName = (projectName || 'filmstrip_project').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
  link.download = `${sanitizedName}.filmjson`;
  link.href = blobUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);

  if (onProgress) onProgress(100, 'Complete!');
}

/**
 * Imports and parses an uploaded project file (.filmproj, .zip, .filmjson, or .json)
 */
export async function importProjectFromFile(
  file: File,
  onProgress?: (percent: number, status: string) => void
): Promise<FilmStripProject> {
  const fileName = file.name.toLowerCase();

  // Check if it's a zip / .filmproj archive
  if (fileName.endsWith('.zip') || fileName.endsWith('.filmproj')) {
    if (onProgress) onProgress(15, 'Reading project archive...');
    const zip = await JSZip.loadAsync(file);

    const projectJsonFile = zip.file('project.json');
    if (!projectJsonFile) {
      throw new Error('Invalid project archive: missing project.json manifest');
    }

    if (onProgress) onProgress(35, 'Parsing project manifest...');
    const jsonText = await projectJsonFile.async('text');
    const parsedManifest = JSON.parse(jsonText);

    if (!parsedManifest.config || !Array.isArray(parsedManifest.frames)) {
      throw new Error('Corrupted project structure in archive');
    }

    const reconstructedFrames: FrameData[] = [];
    const rawFrames = parsedManifest.frames;

    for (let i = 0; i < rawFrames.length; i++) {
      const rf = rawFrames[i];
      if (onProgress) {
        onProgress(
          35 + Math.round(((i + 1) / rawFrames.length) * 55),
          `Unpacking image asset ${i + 1}/${rawFrames.length}...`
        );
      }

      let reconstructedImageUrl: string | null = null;

      if (rf.assetFilename) {
        // Look in assets folder or root
        const assetFile = zip.file(`assets/${rf.assetFilename}`) || zip.file(rf.assetFilename);
        if (assetFile) {
          const blob = await assetFile.async('blob');
          reconstructedImageUrl = await blobToDataUrl(blob);
        }
      } else if (rf.imageUrl) {
        reconstructedImageUrl = rf.imageUrl;
      }

      reconstructedFrames.push({
        id: rf.id || `frame-${i + 1}`,
        imageUrl: reconstructedImageUrl,
        imageName: rf.imageName,
        imageNaturalWidth: rf.imageNaturalWidth,
        imageNaturalHeight: rf.imageNaturalHeight,
        panX: typeof rf.panX === 'number' ? rf.panX : 0,
        panY: typeof rf.panY === 'number' ? rf.panY : 0,
        zoom: typeof rf.zoom === 'number' ? rf.zoom : 1,
        rotation: typeof rf.rotation === 'number' ? rf.rotation : 0,
        flipH: !!rf.flipH,
        flipV: !!rf.flipV,
        filters: rf.filters || {
          brightness: 100,
          contrast: 100,
          saturation: 100,
          sepia: 0,
          grayscale: 0,
          vintageWarmth: 0,
        },
        customTextTop: rf.customTextTop,
        customTextBottom: rf.customTextBottom,
      });
    }

    if (onProgress) onProgress(100, 'Project restored successfully!');

    return {
      version: parsedManifest.version || PROJECT_VERSION,
      projectName: parsedManifest.projectName || file.name.replace(/\.[^/.]+$/, ''),
      createdAt: parsedManifest.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      config: parsedManifest.config,
      frames: reconstructedFrames,
    };
  }

  // Otherwise assume JSON (.filmjson or .json)
  if (onProgress) onProgress(30, 'Reading JSON project file...');
  const text = await file.text();
  const parsed = JSON.parse(text);

  if (!parsed.config || !Array.isArray(parsed.frames)) {
    throw new Error('Invalid project file: expected config and frames properties');
  }

  if (onProgress) onProgress(100, 'Project loaded!');

  return {
    version: parsed.version || PROJECT_VERSION,
    projectName: parsed.projectName || file.name.replace(/\.[^/.]+$/, ''),
    createdAt: parsed.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    config: parsed.config,
    frames: parsed.frames,
  };
}
