/**
 * Computes the non-destructive "cover fit" dimensions for an image displayed
 * inside a fixed frame aperture.
 *
 * The image is scaled so it fully covers the frame (no letterboxing), then
 * clipped by the aperture. The returned dimensions are the image's base
 * width/height *before* pan/zoom/rotation transforms are applied.
 *
 * This is the single source of truth for both the DOM preview and the canvas
 * exporter so the two renderers can never drift apart.
 */
export function computeImageFit(
  naturalWidth: number | undefined,
  naturalHeight: number | undefined,
  frameWidth: number,
  frameHeight: number
): { baseW: number; baseH: number } {
  const frameAspect = frameWidth / frameHeight;

  // If we don't yet know the image's intrinsic size, fall back to the frame's
  // aspect ratio (empty-frame behavior).
  const imgAspect =
    naturalWidth && naturalHeight
      ? naturalWidth / naturalHeight
      : frameAspect;

  if (imgAspect > frameAspect) {
    // Image is wider than the frame: match height, overflow width
    return {
      baseW: frameHeight * imgAspect,
      baseH: frameHeight,
    };
  }

  // Image is taller than (or equal to) the frame: match width, overflow height
  return {
    baseW: frameWidth,
    baseH: frameWidth / imgAspect,
  };
}