import { FilmStripConfig, FrameData, ExportOptions, PhotoPrintConfig } from '../types';
import { computeImageFit } from './geometry';

/**
 * Loads an image from a URL with crossOrigin support and resolves HTMLImageElement
 */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => {
      // If CORS fails for remote image, try without crossOrigin if local or fallback
      const fallbackImg = new Image();
      fallbackImg.onload = () => resolve(fallbackImg);
      fallbackImg.onerror = () => reject(err);
      fallbackImg.src = url;
    };
    img.src = url;
  });
}

/**
 * Converts millimeters to pixels based on target DPI
 */
export function mmToPx(mm: number, dpi: number = 300): number {
  return Math.round((mm / 25.4) * dpi);
}

/**
 * Calculates accurate physical and pixel dimensions for 15x10cm (150x100mm) photo prints
 */
export function calculatePhotoPrintDimensions(printConfig: PhotoPrintConfig, scaleMultiplier: number = 1) {
  const isPortrait = printConfig.orientation === 'portrait';
  const widthMm = isPortrait ? 100 : 150;
  const heightMm = isPortrait ? 150 : 100;
  
  const targetDpi = printConfig.dpi * scaleMultiplier;
  const widthPx = mmToPx(widthMm, targetDpi);
  const heightPx = mmToPx(heightMm, targetDpi);
  const marginPx = mmToPx(printConfig.sheetMarginMm, targetDpi);
  const gapPx = mmToPx(printConfig.stripGapMm, targetDpi);
  
  return {
    widthMm,
    heightMm,
    widthPx,
    heightPx,
    marginPx,
    gapPx,
    dpi: targetDpi,
    isPortrait,
  };
}

/**
 * Helper to draw a rounded rectangle on a 2D canvas context
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Calculates accurate geometry for the film strip based on config and multiplier
 */
export function calculateFilmStripGeometry(config: FilmStripConfig, multiplier: number = 1) {
  const M = multiplier;
  const filmHeight = Math.round(config.filmHeight * M);
  
  // Outer borders
  const outerBorder = Math.round((config.outerBorderWidth ?? 6) * M);
  
  // Text area & margins (Text on the outer top and outer bottom edges)
  const textMargin = Math.round((config.textMarginTop ?? 8) * M);
  const fontSize = Math.max(8, Math.round((config.fontSize ?? 11) * M));
  const textAreaHeight = Math.max(fontSize + 4 * M, Math.round(16 * M));
  
  // Sprocket track margin and dimensions (Sprockets between text and frames)
  const sprocketGap = Math.round((config.sprocketMarginTop ?? 6) * M);
  const sprocketHeight = Math.round((config.sprocketHeight ?? 22) * M);
  const frameMargin = Math.round((config.frameMargin ?? 10) * M);
  
  // Header and footer heights:
  // Edge border -> textMargin -> textAreaHeight -> sprocketGap -> sprocketHeight -> frameMargin (gap to frame)
  const headerHeight = textMargin + textAreaHeight + sprocketGap + sprocketHeight + frameMargin;
  const footerHeight = headerHeight;
  
  // Frame height available
  const frameHeight = Math.max(40, filmHeight - headerHeight - footerHeight - (outerBorder * 2));
  
  // Aspect ratio calculation
  let aspect = 1.5; // default 3:2
  if (config.aspectRatio === '16:9') aspect = 16 / 9;
  else if (config.aspectRatio === '4:3') aspect = 4 / 3;
  else if (config.aspectRatio === '1:1') aspect = 1;
  else if (config.aspectRatio === '2.39:1') aspect = 2.39;
  else if (config.aspectRatio === 'custom') {
    aspect = (config.customAspectWidth || 3) / (config.customAspectHeight || 2);
  }
  
  const frameWidth = Math.round(frameHeight * aspect);
  const frameDivider = Math.round((config.frameDividerWidth ?? 12) * M);
  const sideMargin = Math.round(Math.max(24 * M, frameDivider * 1.5));
  
  const totalFramesWidth = (config.frameCount * frameWidth) + ((config.frameCount - 1) * frameDivider);
  const filmWidth = (outerBorder * 2) + (sideMargin * 2) + totalFramesWidth;
  
  // Key vertical Y positions
  const topTextY = outerBorder + textMargin + (textAreaHeight / 2);
  const topSprocketY = outerBorder + textMargin + textAreaHeight + sprocketGap;
  const frameY = outerBorder + headerHeight;
  const bottomSprocketY = frameY + frameHeight + frameMargin;
  const bottomTextY = filmHeight - outerBorder - textMargin - (textAreaHeight / 2);
  
  return {
    M,
    filmWidth,
    filmHeight,
    outerBorder,
    textMargin,
    textAreaHeight,
    sprocketGap,
    headerHeight,
    footerHeight,
    frameHeight,
    frameWidth,
    frameDivider,
    sideMargin,
    aspect,
    sprocketMarginTop: sprocketGap,
    sprocketHeight,
    frameMargin,
    topTextY,
    topSprocketY,
    frameY,
    bottomSprocketY,
    bottomTextY,
  };
}

/**
 * Draws vintage 35mm DX edge barcode pattern
 */
function drawEdgeBarcode(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, color: string) {
  ctx.fillStyle = color;
  const bars = [2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 2, 1, 4, 2, 1, 3];
  let curX = x;
  const totalBarsWidth = bars.reduce((a, b) => a + b, 0);
  const scale = width / totalBarsWidth;
  
  bars.forEach((barWidth, index) => {
    if (index % 2 === 0) {
      ctx.fillRect(curX, y, barWidth * scale, height);
    }
    curX += barWidth * scale;
  });
}

/**
 * Renders the complete film strip to an HTML5 canvas
 */
export async function renderFilmStripToCanvas(
  config: FilmStripConfig,
  frames: FrameData[],
  multiplier: number = 1
): Promise<HTMLCanvasElement> {
  const geo = calculateFilmStripGeometry(config, multiplier);
  const M = geo.M;
  
  const canvas = document.createElement('canvas');
  canvas.width = geo.filmWidth;
  canvas.height = geo.filmHeight;
  
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get 2D canvas context');
  
  // Enable high quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // 1. Draw Film Strip Base Background
  ctx.fillStyle = config.filmBgColor;
  ctx.fillRect(0, 0, geo.filmWidth, geo.filmHeight);
  
  // 2. Outer Border if configured
  if (geo.outerBorder > 0) {
    ctx.lineWidth = geo.outerBorder;
    ctx.strokeStyle = config.frameBorderColor;
    ctx.strokeRect(geo.outerBorder / 2, geo.outerBorder / 2, geo.filmWidth - geo.outerBorder, geo.filmHeight - geo.outerBorder);
  }
  
  // 3. Render Continuous Sprocket Holes along the entire width
  const sprocketW = Math.round((config.sprocketWidth ?? 12) * M);
  const sprocketH = Math.round((config.sprocketHeight ?? 18) * M);
  const sprocketR = Math.round((config.sprocketRadius ?? 4) * M);
  
  // Calculate sprocket spacing: aligned per frame interval (sprockets per frame)
  const sprocketsPerFrame = Math.max(1, Math.min(20, config.sprocketsPerFrame ?? 5));
  const pitch = (geo.frameWidth + geo.frameDivider) / sprocketsPerFrame;
  const totalSprockets = Math.ceil(geo.filmWidth / pitch) + 2;
  const startSprocketX = geo.outerBorder + (geo.sideMargin % pitch) / 2;
  
  const topSprocketY = geo.topSprocketY;
  const bottomSprocketY = geo.bottomSprocketY;
  
  for (let s = 0; s < totalSprockets; s++) {
    const spX = startSprocketX + (s * pitch);
    if (spX + sprocketW > geo.filmWidth - geo.outerBorder) continue;
    
    // Top sprocket (between top text and frame)
    drawRoundedRect(ctx, spX, topSprocketY, sprocketW, sprocketH, sprocketR);
    ctx.fillStyle = config.sprocketFillColor;
    ctx.fill();
    if (config.sprocketBorderColor && config.sprocketBorderColor !== 'transparent') {
      ctx.lineWidth = Math.max(1, 1 * M);
      ctx.strokeStyle = config.sprocketBorderColor;
      ctx.stroke();
    }
    
    // Bottom sprocket (between frame and bottom text)
    drawRoundedRect(ctx, spX, bottomSprocketY, sprocketW, sprocketH, sprocketR);
    ctx.fillStyle = config.sprocketFillColor;
    ctx.fill();
    if (config.sprocketBorderColor && config.sprocketBorderColor !== 'transparent') {
      ctx.lineWidth = Math.max(1, 1 * M);
      ctx.strokeStyle = config.sprocketBorderColor;
      ctx.stroke();
    }
  }
  
  // 4. Preload all frame images in parallel
  const loadedImages: (HTMLImageElement | null)[] = await Promise.all(
    frames.map(async (f) => {
      if (!f.imageUrl) return null;
      try {
        return await loadImage(f.imageUrl);
      } catch (err) {
        console.warn('Failed to load image for frame:', f.id, err);
        return null;
      }
    })
  );
  
  // Font configuration for edge markings & numbering
  const fontFamilyName =
    config.fontFamily === 'courier'
      ? "'Courier Prime', monospace"
      : config.fontFamily === 'sans'
      ? "'Plus Jakarta Sans', sans-serif"
      : "'JetBrains Mono', monospace";
  
  const fontSize = Math.max(8, Math.round(config.fontSize * M));
  ctx.font = `700 ${fontSize}px ${fontFamilyName}`;
  ctx.textBaseline = 'middle';
  
  // 5. Draw Each Frame and its Edge Markings
  for (let i = 0; i < config.frameCount; i++) {
    const frameData = frames[i] || {
      id: `frame-${i}`,
      imageUrl: null,
      panX: 0,
      panY: 0,
      zoom: 1,
      rotation: 0,
      flipH: false,
      flipV: false,
      filters: { brightness: 100, contrast: 100, saturation: 100, sepia: 0, grayscale: 0, vintageWarmth: 0 },
    };
    
    const frameX = geo.outerBorder + geo.sideMargin + i * (geo.frameWidth + geo.frameDivider);
    const frameY = geo.outerBorder + geo.headerHeight;
    
    // Frame background aperture
    ctx.fillStyle = config.frameBgColor || '#050507';
    ctx.fillRect(frameX, frameY, geo.frameWidth, geo.frameHeight);
    
    // Draw Frame Image (with Pan, Zoom, Rotation, Filters, and Clipping)
    const img = loadedImages[i];
    if (img) {
      ctx.save();
      // Clip to frame boundary
      ctx.beginPath();
      ctx.rect(frameX, frameY, geo.frameWidth, geo.frameHeight);
      ctx.clip();
      
      // Calculate cover dimensions for image (single source of truth)
      const { baseW, baseH } = computeImageFit(
        img.naturalWidth,
        img.naturalHeight,
        geo.frameWidth,
        geo.frameHeight
      );
      
      // Apply filters if supported by context
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
      if (filterParts.length > 0 && typeof ctx.filter !== 'undefined') {
        ctx.filter = filterParts.join(' ');
      }
      
      // Coordinate transform for center pan, rotation, zoom, flips
      const centerX = frameX + geo.frameWidth / 2 + (frameData.panX * M);
      const centerY = frameY + geo.frameHeight / 2 + (frameData.panY * M);
      
      ctx.translate(centerX, centerY);
      ctx.rotate((frameData.rotation * Math.PI) / 180);
      ctx.scale((frameData.flipH ? -1 : 1) * frameData.zoom, (frameData.flipV ? -1 : 1) * frameData.zoom);
      
      // Draw image centered
      ctx.drawImage(img, -baseW / 2, -baseH / 2, baseW, baseH);
      
      ctx.restore();
      ctx.filter = 'none';
    } else {
      // Empty frame placeholder crosshair / frame guide
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1 * M;
      ctx.setLineDash([4 * M, 4 * M]);
      ctx.strokeRect(frameX + 8 * M, frameY + 8 * M, geo.frameWidth - 16 * M, geo.frameHeight - 16 * M);
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.font = `500 ${Math.max(10, Math.round(12 * M))}px ${fontFamilyName}`;
      ctx.textAlign = 'center';
      ctx.fillText(`FRAME ${i + 1}`, frameX + geo.frameWidth / 2, frameY + geo.frameHeight / 2);
      ctx.restore();
    }
    
    // Frame inner border
    if (config.frameBorderWidth > 0) {
      ctx.lineWidth = Math.round(config.frameBorderWidth * M);
      ctx.strokeStyle = config.frameBorderColor;
      ctx.strokeRect(frameX, frameY, geo.frameWidth, geo.frameHeight);
    }
    
    // 6. Draw Formatted Index Text & Edge Markings
    const frameIndexNum = config.startNumber + i;
    const formattedNum = config.padZeroes
      ? String(frameIndexNum).padStart(2, '0')
      : String(frameIndexNum);
    
    const labelText = `${config.prefix}${formattedNum}${config.suffix}`;
    const frameCenterX = frameX + geo.frameWidth / 2;
    
    // Top text (at the very top edge of the film strip)
    if (config.showTopText) {
      ctx.fillStyle = config.fontColor;
      ctx.textAlign = 'center';
      const topTextY = geo.topTextY;
      
      // Combine custom or default text
      const topLabel = frameData.customTextTop || labelText;
      ctx.fillText(topLabel, frameCenterX, topTextY);
      
      // Film Stock name or edge marking to the left of the frame top
      if (config.showFilmStockName && config.filmStockName) {
        ctx.save();
        ctx.font = `600 ${Math.max(7, Math.round(fontSize * 0.82))}px ${fontFamilyName}`;
        ctx.fillStyle = config.fontColor;
        ctx.textAlign = 'left';
        ctx.fillText(config.filmStockName, frameX + 4 * M, topTextY);
        ctx.restore();
      }
    }
    
    // Bottom text (at the very bottom edge of the film strip)
    if (config.showBottomText) {
      ctx.fillStyle = config.fontColor;
      ctx.textAlign = 'center';
      const bottomTextY = geo.bottomTextY;
      
      let bottomLabel = frameData.customTextBottom || labelText;
      if (config.showFrameArrows) {
        bottomLabel = `▲ ${bottomLabel} ▲`;
      }
      ctx.fillText(bottomLabel, frameCenterX, bottomTextY);
      
      // Optional edge barcode on the right footer of each frame
      if (config.showEdgeBarcodes) {
        const barcodeW = Math.min(48 * M, geo.frameWidth * 0.28);
        const barcodeH = Math.max(6 * M, Math.round(fontSize * 0.75));
        drawEdgeBarcode(
          ctx,
          frameX + geo.frameWidth - barcodeW - 4 * M,
          bottomTextY - (barcodeH / 2),
          barcodeW,
          barcodeH,
          config.fontColor
        );
      }
    }
  }
  
  // 7. Optional Film Grain Noise
  if (config.filmGrain > 0) {
    const grainCanvas = document.createElement('canvas');
    grainCanvas.width = 128;
    grainCanvas.height = 128;
    const gCtx = grainCanvas.getContext('2d');
    if (gCtx) {
      const gImgData = gCtx.createImageData(128, 128);
      const data = gImgData.data;
      const intensity = (config.filmGrain / 100) * 45;
      for (let p = 0; p < data.length; p += 4) {
        const noise = (Math.random() - 0.5) * intensity;
        data[p] = 128 + noise;
        data[p + 1] = 128 + noise;
        data[p + 2] = 128 + noise;
        data[p + 3] = Math.min(255, Math.abs(noise) * 2.5);
      }
      gCtx.putImageData(gImgData, 0, 0);
      
      const pattern = ctx.createPattern(grainCanvas, 'repeat');
      if (pattern) {
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, geo.filmWidth, geo.filmHeight);
        ctx.restore();
      }
    }
  }
  
  return canvas;
}

/**
 * Triggers export download with descriptive filename
 */
export async function exportFilmStrip(
  config: FilmStripConfig,
  frames: FrameData[],
  options: ExportOptions
): Promise<{ blob: Blob; dataUrl: string; width: number; height: number }> {
  const canvas = await renderFilmStripToCanvas(config, frames, options.multiplier);
  
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to generate image blob'));
          return;
        }
        
        const dataUrl = canvas.toDataURL(options.format, options.quality);
        
        // Trigger download
        const link = document.createElement('a');
        const extension = options.format === 'image/jpeg' ? 'jpg' : options.format === 'image/webp' ? 'webp' : 'png';
        const timestamp = new Date().toISOString().slice(0, 10);
        link.download = options.filename || `cinema-filmstrip-${timestamp}-${options.multiplier}x.${extension}`;
        link.href = URL.createObjectURL(blob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        resolve({
          blob,
          dataUrl,
          width: canvas.width,
          height: canvas.height,
        });
      },
      options.format,
      options.quality
    );
  });
}

/**
 * Copies film strip image to clipboard
 */
export async function copyFilmStripToClipboard(
  config: FilmStripConfig,
  frames: FrameData[],
  multiplier: number = 2
): Promise<boolean> {
  try {
    const canvas = await renderFilmStripToCanvas(config, frames, multiplier);
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          resolve(false);
          return;
        }
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          resolve(true);
        } catch (err) {
          console.warn('Clipboard write failed:', err);
          resolve(false);
        }
      }, 'image/png');
    });
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}

/**
 * Renders a full 15x10cm (or 10x15cm) photo print sheet with multiple film strips stacked underneath each other
 */
export async function renderPhotoPrintSheetToCanvas(
  config: FilmStripConfig,
  frames: FrameData[],
  printConfig: PhotoPrintConfig,
  previewScaleMultiplier: number = 1
): Promise<HTMLCanvasElement> {
  const dims = calculatePhotoPrintDimensions(printConfig, previewScaleMultiplier);
  const scale = previewScaleMultiplier;
  
  const canvas = document.createElement('canvas');
  canvas.width = dims.widthPx;
  canvas.height = dims.heightPx;
  
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get 2D canvas context for photo print');
  
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // 1. Fill Sheet Background (e.g. Pure White for standard 15x10cm photo print card, or Black/Slate)
  if (printConfig.sheetBgColor && printConfig.sheetBgColor !== 'transparent') {
    ctx.fillStyle = printConfig.sheetBgColor;
    ctx.fillRect(0, 0, dims.widthPx, dims.heightPx);
  } else {
    ctx.clearRect(0, 0, dims.widthPx, dims.heightPx);
  }
  
  // 2. Compute Stacking Geometry
  const stripCount = Math.max(1, Math.min(6, printConfig.stripCount));
  const availWidth = dims.widthPx - (dims.marginPx * 2);
  const totalGaps = (stripCount - 1) * dims.gapPx;
  const availHeight = dims.heightPx - (dims.marginPx * 2) - totalGaps;
  const singleStripMaxHeight = Math.max(20, availHeight / stripCount);
  
  // 3. Render Each Strip Row
  for (let r = 0; r < stripCount; r++) {
    let rowFrames: FrameData[] = [];
    let rowFramesCount = config.frameCount;
    let rowStartNumber = config.startNumber;
    
    if (printConfig.distributionMode === 'duplicate') {
      // Duplicate exact same film strip
      rowFrames = frames.slice(0, config.frameCount);
      rowFramesCount = config.frameCount;
      rowStartNumber = config.startNumber;
    } else {
      // Split frames across stacked strips
      const framesPerRow = Math.ceil(config.frameCount / stripCount);
      const startIdx = r * framesPerRow;
      const endIdx = Math.min(config.frameCount, startIdx + framesPerRow);
      
      rowFrames = frames.slice(startIdx, endIdx);
      rowFramesCount = Math.max(1, endIdx - startIdx);
      rowStartNumber = config.startNumber + startIdx;
      
      // If we don't have enough frames for this row, fill with empty frame items
      while (rowFrames.length < rowFramesCount) {
        rowFrames.push({
          id: `row-${r}-frame-${rowFrames.length}`,
          imageUrl: null,
          panX: 0,
          panY: 0,
          zoom: 1,
          rotation: 0,
          flipH: false,
          flipV: false,
          filters: { brightness: 100, contrast: 100, saturation: 100, sepia: 0, grayscale: 0, vintageWarmth: 0 },
        });
      }
    }
    
    const rowStripConfig: FilmStripConfig = {
      ...config,
      frameCount: rowFramesCount,
      startNumber: rowStartNumber,
    };
    
    // Geometry at 1x to calculate scale factor
    const geo1x = calculateFilmStripGeometry(rowStripConfig, 1);
    
    // Calculate uniform scale to fit neatly in slot
    const scaleW = availWidth / geo1x.filmWidth;
    const scaleH = singleStripMaxHeight / geo1x.filmHeight;
    const fitScale = Math.min(scaleW, scaleH);
    
    // Render individual strip to its own canvas
    const stripCanvas = await renderFilmStripToCanvas(rowStripConfig, rowFrames, fitScale);
    
    // Center the strip inside its slot (supports negative margins for bleed)
    const slotY = dims.marginPx + (r * (singleStripMaxHeight + dims.gapPx));
    const stripX = dims.marginPx + ((availWidth - stripCanvas.width) / 2);
    const stripY = slotY + ((singleStripMaxHeight - stripCanvas.height) / 2);
    
    // Draw subtle drop shadow behind the celluloid film strip on light paper only if positive margins and gaps exist
    if (printConfig.sheetBgColor && printConfig.sheetBgColor.toLowerCase() === '#ffffff' && dims.marginPx >= 3 && dims.gapPx >= 2) {
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      ctx.shadowBlur = Math.max(2, 4 * scale);
      ctx.shadowOffsetY = Math.max(1, 2 * scale);
      ctx.fillStyle = '#000000';
      ctx.fillRect(stripX, stripY, stripCanvas.width, stripCanvas.height);
      ctx.restore();
    }
    
    ctx.drawImage(stripCanvas, stripX, stripY);
  }
  
  // 4. Render Photo Print Cut Guides & Trim Marks
  if (printConfig.showCutGuides) {
    const isDarkSheet = printConfig.sheetBgColor === '#000000' || printConfig.sheetBgColor === '#18181b';
    const guideColor = isDarkSheet ? 'rgba(255, 255, 255, 0.4)' : 'rgba(100, 116, 139, 0.6)';
    const textColor = isDarkSheet ? 'rgba(255, 255, 255, 0.7)' : 'rgba(71, 85, 105, 0.8)';
    
    ctx.save();
    ctx.strokeStyle = guideColor;
    ctx.lineWidth = Math.max(1, 1 * scale);
    
    // Inter-strip cut dashed lines
    if (stripCount > 1 && dims.gapPx > 0) {
      ctx.setLineDash([Math.max(3, 5 * scale), Math.max(3, 4 * scale)]);
      
      for (let r = 1; r < stripCount; r++) {
        const cutY = dims.marginPx + (r * singleStripMaxHeight) + ((r - 0.5) * dims.gapPx);
        
        ctx.beginPath();
        ctx.moveTo(2 * scale, cutY);
        ctx.lineTo(dims.widthPx - 2 * scale, cutY);
        ctx.stroke();
        
        // Small scissor mark or trim indicator
        ctx.font = `${Math.max(9, Math.round(10 * scale))}px monospace`;
        ctx.fillStyle = textColor;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('✂', Math.max(2, 3 * scale), cutY - (1 * scale));
        
        ctx.textAlign = 'right';
        ctx.fillText('✂', dims.widthPx - Math.max(2, 3 * scale), cutY - (1 * scale));
      }
    }
    
    // 4 Corner Crop Tick Marks (L-marks 4mm from edges)
    ctx.setLineDash([]);
    const tickLen = Math.max(4, mmToPx(3.5, dims.dpi));
    const m = Math.max(2, dims.marginPx);
    
    // Top-Left
    ctx.beginPath();
    ctx.moveTo(m, 0); ctx.lineTo(m, tickLen);
    ctx.moveTo(0, m); ctx.lineTo(tickLen, m);
    // Top-Right
    ctx.moveTo(dims.widthPx - m, 0); ctx.lineTo(dims.widthPx - m, tickLen);
    ctx.moveTo(dims.widthPx, m); ctx.lineTo(dims.widthPx - tickLen, m);
    // Bottom-Left
    ctx.moveTo(m, dims.heightPx); ctx.lineTo(m, dims.heightPx - tickLen);
    ctx.moveTo(0, dims.heightPx - m); ctx.lineTo(tickLen, dims.heightPx - m);
    // Bottom-Right
    ctx.moveTo(dims.widthPx - m, dims.heightPx); ctx.lineTo(dims.widthPx - m, dims.heightPx - tickLen);
    ctx.moveTo(dims.widthPx, dims.heightPx - m); ctx.lineTo(dims.widthPx - tickLen, dims.heightPx - m);
    ctx.stroke();
    
    // Small discrete 15x10cm print spec label in the corner margin
    if (dims.marginPx >= 8 * scale) {
      ctx.font = `600 ${Math.max(7, Math.round(8 * scale))}px 'JetBrains Mono', monospace`;
      ctx.fillStyle = textColor;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(
        `15×10cm PHOTO PRINT • ${dims.dpi} DPI • ${stripCount} ${stripCount === 1 ? 'STRIP' : 'STRIPS'}`,
        dims.widthPx - dims.marginPx,
        dims.heightPx - Math.max(2, 2 * scale)
      );
    }
    
    ctx.restore();
  }
  
  return canvas;
}

/**
 * Exports 15x10cm Photo Print Sheet to File
 */
export async function exportPhotoPrintSheet(
  config: FilmStripConfig,
  frames: FrameData[],
  printConfig: PhotoPrintConfig,
  options: ExportOptions
): Promise<{ blob: Blob; dataUrl: string; width: number; height: number }> {
  const canvas = await renderPhotoPrintSheetToCanvas(config, frames, printConfig, 1);
  
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to generate 15x10cm photo print blob'));
          return;
        }
        
        const dataUrl = canvas.toDataURL(options.format, options.quality);
        const link = document.createElement('a');
        const extension = options.format === 'image/jpeg' ? 'jpg' : options.format === 'image/webp' ? 'webp' : 'png';
        const timestamp = new Date().toISOString().slice(0, 10);
        
        link.download = options.filename || `filmstrip-15x10cm-photo-${printConfig.dpi}dpi-${printConfig.stripCount}strips-${timestamp}.${extension}`;
        link.href = URL.createObjectURL(blob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        resolve({
          blob,
          dataUrl,
          width: canvas.width,
          height: canvas.height,
        });
      },
      options.format,
      options.quality
    );
  });
}

/**
 * Copies 15x10cm Photo Print Sheet to Clipboard
 */
export async function copyPhotoPrintSheetToClipboard(
  config: FilmStripConfig,
  frames: FrameData[],
  printConfig: PhotoPrintConfig
): Promise<boolean> {
  try {
    const canvas = await renderPhotoPrintSheetToCanvas(config, frames, printConfig, 1);
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          resolve(false);
          return;
        }
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          resolve(true);
        } catch (err) {
          console.warn('Clipboard write failed for photo print:', err);
          resolve(false);
        }
      }, 'image/png');
    });
  } catch (err) {
    console.error('Failed to copy photo print to clipboard:', err);
    return false;
  }
}

