import React, { useEffect, useState } from 'react';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  Loader2, 
  Image as ImageIcon, 
  Maximize2,
  Sparkles,
  Layers
} from 'lucide-react';
import { FilmStripConfig, FrameData, ExportOptions } from '../types';
import { renderFilmStripToCanvas, exportFilmStrip, copyFilmStripToClipboard, calculateFilmStripGeometry } from '../utils/canvasExport';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: FilmStripConfig;
  frames: FrameData[];
  defaultMultiplier?: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  config,
  frames,
  defaultMultiplier = 2,
}) => {
  const [multiplier, setMultiplier] = useState<number>(defaultMultiplier);
  const [format, setFormat] = useState<'image/png' | 'image/jpeg' | 'image/webp'>('image/png');
  const [quality, setQuality] = useState<number>(0.92);
  const [filename, setFilename] = useState<string>('cinema-filmstrip');
  
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [copied, setCopied] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // Generate fast preview whenever config or multiplier changes
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const generatePreview = async () => {
      setIsGenerating(true);
      try {
        // Render at 1x for preview display, but compute the export dimensions
        const geo = calculateFilmStripGeometry(config, multiplier);
        setDimensions({ width: geo.filmWidth, height: geo.filmHeight });

        const canvas = await renderFilmStripToCanvas(config, frames, 1);
        if (isMounted) {
          setPreviewDataUrl(canvas.toDataURL('image/png'));
        }
      } catch (err) {
        console.error('Failed to generate export preview:', err);
      } finally {
        if (isMounted) setIsGenerating(false);
      }
    };

    generatePreview();
    return () => {
      isMounted = false;
    };
  }, [isOpen, config, frames, multiplier]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const options: ExportOptions = {
        multiplier,
        format,
        quality,
        filename: `${filename}-${multiplier}x.${format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png'}`,
      };
      await exportFilmStrip(config, frames, options);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopy = async () => {
    const success = await copyFilmStripToClipboard(config, frames, multiplier);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } else {
      alert('Unable to copy image to clipboard in this browser context.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh] overflow-hidden text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">Export Cinema Film Strip</h2>
              <p className="text-xs text-zinc-400">Generate high-resolution stitched cinema asset</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Live Preview Window */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-1.5 font-medium">
                <ImageIcon className="w-4 h-4 text-amber-400" /> Export Preview
              </span>
              <span className="font-mono text-zinc-300 bg-zinc-800/80 px-2 py-0.5 rounded text-[11px] border border-zinc-700/50">
                Resolution: {dimensions.width} × {dimensions.height} px ({multiplier}x)
              </span>
            </div>

            <div className="relative w-full h-44 bg-zinc-950/80 rounded-xl border border-zinc-800 overflow-hidden flex items-center justify-center p-3 film-grain-bg">
              {isGenerating ? (
                <div className="flex flex-col items-center gap-2 text-zinc-400">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                  <span className="text-xs">Compositing film strip...</span>
                </div>
              ) : previewDataUrl ? (
                <img
                  src={previewDataUrl}
                  alt="Film Strip Preview"
                  className="max-h-full max-w-full object-contain rounded shadow-lg border border-zinc-800"
                />
              ) : (
                <div className="text-xs text-zinc-500">No preview generated yet</div>
              )}
            </div>
          </div>

          {/* Export Settings Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Resolution Multiplier */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300">
                Export Resolution Quality
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { mult: 1, label: '1x', desc: 'Screen' },
                  { mult: 2, label: '2x', desc: 'Retina / HD' },
                  { mult: 3, label: '3x', desc: 'Studio' },
                  { mult: 4, label: '4x', desc: 'Ultra 4K' },
                ].map((item) => (
                  <button
                    key={item.mult}
                    onClick={() => setMultiplier(item.mult)}
                    className={`py-2 px-1 text-center rounded-lg border transition-all ${
                      multiplier === item.mult
                        ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-bold shadow-sm'
                        : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="text-xs">{item.label}</div>
                    <div className="text-[10px] text-zinc-400 font-normal">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Export Format */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300">
                File Format
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { fmt: 'image/png' as const, label: 'PNG', desc: 'Lossless' },
                  { fmt: 'image/jpeg' as const, label: 'JPEG', desc: 'Compact' },
                  { fmt: 'image/webp' as const, label: 'WebP', desc: 'Modern' },
                ].map((item) => (
                  <button
                    key={item.fmt}
                    onClick={() => setFormat(item.fmt)}
                    className={`py-2 px-1 text-center rounded-lg border transition-all ${
                      format === item.fmt
                        ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-bold shadow-sm'
                        : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="text-xs">{item.label}</div>
                    <div className="text-[10px] text-zinc-400 font-normal">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Filename Input */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-300">
                Filename Prefix
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder="cinema-filmstrip"
                  className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 font-mono"
                />
                <span className="text-xs text-zinc-400 font-mono">
                  -{multiplier}x.{format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/90 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={isGenerating}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
              {copied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-xl text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-confirm-download-strip"
              onClick={handleDownload}
              disabled={isDownloading || isGenerating}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isDownloading ? 'Exporting...' : `Download ${multiplier}x (${dimensions.width}×${dimensions.height})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
