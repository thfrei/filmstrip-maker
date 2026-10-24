import JSZip from 'jszip';
import { 
  FilmStripConfig, 
  FrameData, 
  FilmStripProject, 
  VideoSourceInfo,
  PROJECT_VERSION, 
  PhotoPrintConfig 
} from '../types';

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

export interface ProjectExportSettings {
  exportMode?: 'photo_print' | 'single_strip';
  exportMultiplier?: number;
  exportFormat?: 'image/png' | 'image/jpeg' | 'image/webp';
  exportQuality?: number;
  exportFilename?: string;
  photoPrintConfig?: PhotoPrintConfig;
  videoSource?: VideoSourceInfo | null;
}

/**
 * Exports complete project (settings + frames + full source movie video) as a unified .filmproj bundle
 */
export async function exportProjectAsZip(
  config: FilmStripConfig,
  frames: FrameData[],
  projectName: string = 'cinema_filmstrip_project',
  fileExtension: 'filmproj' | 'zip' = 'filmproj',
  onProgress?: (percent: number, status: string) => void,
  exportSettings?: ProjectExportSettings
): Promise<void> {
  if (onProgress) onProgress(5, 'Initializing project archive...');
  const zip = new JSZip();

  const assetsFolder = zip.folder('assets');
  const projectFramesMeta: any[] = [];

  const totalFrames = frames.length;

  // 1. Package Picture Frame Assets
  for (let i = 0; i < totalFrames; i++) {
    const frame = frames[i];
    if (onProgress) {
      onProgress(
        10 + Math.round(((i + 1) / (totalFrames + 1)) * 40),
        `Packaging frame ${i + 1}/${totalFrames} assets...`
      );
    }

    let assetFilename: string | null = null;

    if (frame.imageUrl) {
      try {
        const { data, ext } = await urlToArrayBuffer(frame.imageUrl);
        assetFilename = `frame_${i + 1}_${Date.now()}.${ext}`;
        if (assetsFolder) {
          assetsFolder.file(assetFilename, data, { binary: true });
        }
      } catch (err) {
        console.warn(`Could not package image for frame ${i}:`, err);
      }
    }

    // Strip bulky imageUrl from manifest and reference asset file
    const { imageUrl, ...restFrame } = frame;
    projectFramesMeta.push({
      ...restFrame,
      assetFilename,
      hasImage: !!assetFilename,
      videoTimestamp: frame.videoTimestamp,
      sourceVideoName: frame.sourceVideoName,
    });
  }

  // 2. Package Source Movie Video (if loaded)
  let videoMeta: any = undefined;
  const videoSource = exportSettings?.videoSource;

  if (videoSource?.url) {
    if (onProgress) onProgress(55, 'Packaging source movie video into project...');
    try {
      let videoBuffer: ArrayBuffer | null = null;
      let videoExt = 'mp4';

      if (videoSource.blob) {
        videoBuffer = await videoSource.blob.arrayBuffer();
        if (videoSource.blob.type.includes('webm')) videoExt = 'webm';
      } else {
        const res = await fetch(videoSource.url);
        const blob = await res.blob();
        videoBuffer = await blob.arrayBuffer();
        if (blob.type.includes('webm')) videoExt = 'webm';
      }

      if (videoBuffer) {
        const videoFolder = zip.folder('video');
        const videoFilename = `source_movie.${videoExt}`;
        videoFolder?.file(videoFilename, videoBuffer, { binary: true });

        videoMeta = {
          name: videoSource.name,
          duration: videoSource.duration,
          width: videoSource.width,
          height: videoSource.height,
          videoFilename: `video/${videoFilename}`,
        };
      }
    } catch (err) {
      console.warn('Could not bundle source movie into zip:', err);
    }
  }

  // 3. Create Manifest
  const manifest = {
    version: PROJECT_VERSION,
    format: 'cinema_filmstrip_bundle_v2',
    projectName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    config,
    frames: projectFramesMeta,
    exportMode: exportSettings?.exportMode,
    exportMultiplier: exportSettings?.exportMultiplier,
    exportFormat: exportSettings?.exportFormat,
    exportQuality: exportSettings?.exportQuality,
    exportFilename: exportSettings?.exportFilename,
    photoPrintConfig: exportSettings?.photoPrintConfig,
    videoSource: videoMeta,
  };

  zip.file('project.json', JSON.stringify(manifest, null, 2));

  // Add README
  const readmeContent = `CINEMA FILM STRIP PROJECT ARCHIVE (.filmproj)
==============================================
Project Name: ${projectName}
Created: ${new Date().toLocaleString()}
Frames: ${frames.length}
Movie Included: ${videoMeta ? `Yes (${videoMeta.name})` : 'None'}

Contents:
- project.json: Strip configuration, geometry, sprockets, and per-frame video timestamps.
- assets/: Frame photographs and stills.
- video/: Source movie video file (reloaded automatically into the video scrubber upon import).

You can drag and drop this .${fileExtension} file directly into the Film Strip Generator to resume editing with full video scrubbing.
`;
  zip.file('README.txt', readmeContent);

  if (onProgress) onProgress(75, 'Compressing project archive...');

  const content = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 4 }, // Level 4 for fast compression of video files
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
  setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);

  if (onProgress) onProgress(100, 'Complete!');
}

/**
 * Imports and parses an uploaded project file (.filmproj, .zip, or legacy .json)
 */
export async function importProjectFromFile(
  file: File,
  onProgress?: (percent: number, status: string) => void
): Promise<FilmStripProject> {
  const fileName = file.name.toLowerCase();

  // Handle Zip / .filmproj Archive
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

    // 1. Unpack Movie Video if present
    let restoredVideoSource: VideoSourceInfo | undefined = undefined;
    if (parsedManifest.videoSource?.videoFilename) {
      if (onProgress) onProgress(45, 'Extracting bundled movie video...');
      const vFile = zip.file(parsedManifest.videoSource.videoFilename) || zip.file(`video/${parsedManifest.videoSource.videoFilename}`);
      if (vFile) {
        const vBlob = await vFile.async('blob');
        const vUrl = URL.createObjectURL(vBlob);
        restoredVideoSource = {
          url: vUrl,
          name: parsedManifest.videoSource.name || 'Restored Movie',
          duration: parsedManifest.videoSource.duration || 12,
          width: parsedManifest.videoSource.width || 1280,
          height: parsedManifest.videoSource.height || 720,
          blob: vBlob,
        };
      }
    }

    // 2. Unpack Frames
    const reconstructedFrames: FrameData[] = [];
    const rawFrames = parsedManifest.frames;

    for (let i = 0; i < rawFrames.length; i++) {
      const rf = rawFrames[i];
      if (onProgress) {
        onProgress(
          55 + Math.round(((i + 1) / rawFrames.length) * 40),
          `Unpacking frame ${i + 1}/${rawFrames.length}...`
        );
      }

      let reconstructedImageUrl: string | null = null;

      if (rf.assetFilename) {
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
        videoTimestamp: typeof rf.videoTimestamp === 'number' ? rf.videoTimestamp : undefined,
        sourceVideoName: rf.sourceVideoName,
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
      exportMode: parsedManifest.exportMode,
      exportMultiplier: parsedManifest.exportMultiplier,
      exportFormat: parsedManifest.exportFormat,
      exportQuality: parsedManifest.exportQuality,
      exportFilename: parsedManifest.exportFilename,
      photoPrintConfig: parsedManifest.photoPrintConfig,
      videoSource: restoredVideoSource,
      videoBlob: restoredVideoSource?.blob,
    };
  }

  // Legacy JSON fallback
  if (onProgress) onProgress(30, 'Reading project file...');
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
    exportMode: parsed.exportMode,
    exportMultiplier: parsed.exportMultiplier,
    exportFormat: parsed.exportFormat,
    exportQuality: parsed.exportQuality,
    exportFilename: parsed.exportFilename,
    photoPrintConfig: parsed.photoPrintConfig,
    videoSource: (parsed.videoSource && parsed.videoSource.url && parsed.videoSource.url.trim() !== '') ? parsed.videoSource : undefined,
  };
}
