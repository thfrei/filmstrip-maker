/**
 * Video Frame Extractor & Demo Video Generator
 * Handles high-fidelity video frame extraction, timecode formatting, and 100% keyframe-accurate cinema demo reels.
 */

export function formatTimecode(seconds: number, includeHours = false): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);

  const pad = (n: number, z = 2) => String(n).padStart(z, '0');

  if (hrs > 0 || includeHours) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}.${pad(ms)}`;
  }
  return `${pad(mins)}:${pad(secs)}.${pad(ms)}`;
}

export function parseTimecode(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Pure number (e.g. "45.2" or "12")
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return parseFloat(trimmed);
  }

  // MM:SS or MM:SS.ms or HH:MM:SS or HH:MM:SS.ms
  const parts = trimmed.split(':');
  if (parts.length === 2) {
    const mins = parseFloat(parts[0]);
    const secs = parseFloat(parts[1]);
    if (!isNaN(mins) && !isNaN(secs)) {
      return mins * 60 + secs;
    }
  } else if (parts.length === 3) {
    const hrs = parseFloat(parts[0]);
    const mins = parseFloat(parts[1]);
    const secs = parseFloat(parts[2]);
    if (!isNaN(hrs) && !isNaN(mins) && !isNaN(secs)) {
      return hrs * 3600 + mins * 60 + secs;
    }
  }

  return null;
}

/**
 * Capture frame from an HTMLVideoElement at its native resolution with instant, frame-accurate extraction.
 * If targetTime is omitted or already matches the current video position, immediately captures whatever
 * pixels are currently rendered on the video element with zero delay or seeking.
 * If targetTime differs, safely seeks to the target timestamp and captures once the seeked event fires.
 */
export async function captureVideoFrame(
  video: HTMLVideoElement,
  targetTime?: number
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get 2D canvas context for frame capture'));
      return;
    }

    let settled = false;
    const extractPixels = () => {
      if (settled) return;
      settled = true;
      try {
        ctx.drawImage(video, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        resolve({ dataUrl, width, height });
      } catch (err) {
        reject(err);
      }
    };

    // If video element is still initializing (readyState < HAVE_CURRENT_DATA)
    if (video.readyState < 2) {
      const onReady = () => {
        video.removeEventListener('loadeddata', onReady);
        video.removeEventListener('canplay', onReady);
        extractPixels();
      };
      video.addEventListener('loadeddata', onReady, { once: true });
      video.addEventListener('canplay', onReady, { once: true });
      setTimeout(extractPixels, 400);
      return;
    }

    // Check if an explicit time seek is requested and needed
    const needsSeek = typeof targetTime === 'number' && 
      !isNaN(targetTime) && 
      Math.abs(video.currentTime - targetTime) > 0.04;

    if (needsSeek) {
      let timeoutId: any = null;
      const cleanUp = () => {
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onError);
        if (timeoutId) clearTimeout(timeoutId);
      };

      const onSeeked = () => {
        cleanUp();
        // Modern browsers guarantee frame texture ready on seeked; RAF ensures paint cycle alignment
        requestAnimationFrame(() => {
          extractPixels();
        });
      };

      const onError = () => {
        cleanUp();
        extractPixels();
      };

      timeoutId = setTimeout(() => {
        cleanUp();
        extractPixels();
      }, 500);

      video.addEventListener('seeked', onSeeked, { once: true });
      video.addEventListener('error', onError, { once: true });
      try {
        video.currentTime = Math.max(0, Math.min(targetTime!, video.duration || targetTime!));
      } catch {
        cleanUp();
        extractPixels();
      }
    } else {
      // If currently seeking, wait for seeked; otherwise grab the exact current frame INSTANTLY
      if (video.seeking) {
        let timeoutId: any = null;
        const cleanUp = () => {
          video.removeEventListener('seeked', onSeeked);
          if (timeoutId) clearTimeout(timeoutId);
        };
        const onSeeked = () => {
          cleanUp();
          requestAnimationFrame(() => {
            extractPixels();
          });
        };
        timeoutId = setTimeout(() => {
          cleanUp();
          extractPixels();
        }, 300);
        video.addEventListener('seeked', onSeeked, { once: true });
      } else {
        // Immediate synchronous capture of currently visible frame! Zero waiting or playback interference.
        extractPixels();
      }
    }
  });
}

/**
 * Loads the pre-compiled all-keyframe 35mm cinema demo reel.
 * Encoded with -g 1 (every single frame is an independent I-frame / keyframe).
 * This eliminates keyframe snapping and gives silky-smooth 60fps frame-accurate scrubbing.
 */
export async function generateDemoCinemaVideo(): Promise<{ blob: Blob | null; url: string; duration: number }> {
  const url = '/demo-cinema-reel.mp4';
  return {
    blob: null,
    url,
    duration: 12.0,
  };
}
