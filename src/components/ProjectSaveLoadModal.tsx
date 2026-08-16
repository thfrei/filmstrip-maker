import React, { useState, useRef } from 'react';
import { 
  X, 
  Save, 
  FolderOpen, 
  Archive, 
  FileCode, 
  CheckCircle2, 
  AlertCircle, 
  HardDrive, 
  RefreshCw, 
  Download, 
  Upload, 
  Sparkles,
  FileCheck,
  Trash2,
  Clock,
  Layers
} from 'lucide-react';
import { FilmStripConfig, FrameData, FilmStripProject, PhotoPrintConfig } from '../types';
import { exportProjectAsZip, exportProjectAsJson, importProjectFromFile, ProjectExportSettings } from '../utils/projectArchive';
import { clearStorageState } from '../utils/storage';

interface ProjectSaveLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: FilmStripConfig;
  frames: FrameData[];
  projectName: string;
  onProjectNameChange: (name: string) => void;
  onLoadProject: (project: FilmStripProject) => void;
  onResetToDefaults: () => void;
  lastAutoSavedTime: Date | null;
  exportSettings?: ProjectExportSettings;
}

export const ProjectSaveLoadModal: React.FC<ProjectSaveLoadModalProps> = ({
  isOpen,
  onClose,
  config,
  frames,
  projectName,
  onProjectNameChange,
  onLoadProject,
  onResetToDefaults,
  lastAutoSavedTime,
  exportSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'save' | 'open' | 'storage'>('save');
  const [saveFormat, setSaveFormat] = useState<'zip' | 'filmproj' | 'json'>('filmproj');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ percent: number; status: string }>({ percent: 0, status: '' });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const filledFramesCount = frames.filter((f) => !!f.imageUrl).length;

  const handleExport = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setProgress({ percent: 5, status: 'Preparing project bundle...' });

    try {
      if (saveFormat === 'filmproj') {
        await exportProjectAsZip(config, frames, projectName, 'filmproj', (percent, status) => {
          setProgress({ percent, status });
        }, exportSettings);
        setSuccessMessage(`Exported "${projectName}.filmproj" successfully!`);
      } else if (saveFormat === 'zip') {
        await exportProjectAsZip(config, frames, projectName, 'zip', (percent, status) => {
          setProgress({ percent, status });
        }, exportSettings);
        setSuccessMessage(`Exported "${projectName}.zip" archive successfully!`);
      } else {
        await exportProjectAsJson(config, frames, projectName, (percent, status) => {
          setProgress({ percent, status });
        }, exportSettings);
        setSuccessMessage(`Exported "${projectName}.filmjson" successfully!`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to export project');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelected = async (file: File) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setProgress({ percent: 10, status: 'Reading project file...' });

    try {
      const imported = await importProjectFromFile(file, (percent, status) => {
        setProgress({ percent, status });
      });

      onLoadProject(imported);
      if (imported.projectName) {
        onProjectNameChange(imported.projectName);
      }
      setSuccessMessage(`Loaded project "${imported.projectName || file.name}" with ${imported.frames.length} frames!`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to open project file. Make sure it is a valid .filmproj, .zip, or .filmjson file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleClearCache = async () => {
    if (window.confirm('Are you sure you want to reset everything and start a brand new blank film strip?')) {
      await clearStorageState();
      onResetToDefaults();
      setSuccessMessage('Reset to clean default project.');
      setTimeout(() => onClose(), 800);
    }
  };

  return (
    <div
      id="project-save-load-modal-backdrop"
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="project-save-load-modal"
        className="bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl max-w-xl w-full text-zinc-100 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-zinc-100">
                Project Manager: Save & Load
              </h2>
              <p className="text-xs text-zinc-400">
                Save settings and large photos to disk or restore a previous project
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/30 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('save')}
            className={`pb-3 px-3 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'save'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Save Project File
          </button>
          <button
            onClick={() => setActiveTab('open')}
            className={`pb-3 px-3 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'open'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Open / Load Project
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            className={`pb-3 px-3 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'storage'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            Auto-Save Status
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* TAB 1: SAVE PROJECT */}
          {activeTab === 'save' && (
            <div className="space-y-4">
              {/* Project Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Project Title</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => onProjectNameChange(e.target.value)}
                  placeholder="e.g. 35mm Cinema Reel - Scene 01"
                  className="w-full bg-zinc-950 border border-zinc-700 focus:border-amber-500 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
                />
              </div>

              {/* Reassurance Banner */}
              <div className="flex items-start gap-2.5 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold text-emerald-300">100% Raw & Uncropped Photos Preserved</span>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Browser storage and project archives save your <strong>full original uploaded photo files</strong> completely uncropped. Pan, zoom, and rotation are stored as non-destructive coordinates so you can freely re-pan or zoom out anytime.
                  </p>
                </div>
              </div>

              {/* Format Options */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-300">Choose Archive Format</label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: .filmproj / .zip (Recommended) */}
                  <div
                    onClick={() => setSaveFormat('filmproj')}
                    className={`cursor-pointer p-3.5 rounded-xl border transition-all text-left space-y-1.5 ${
                      saveFormat === 'filmproj' || saveFormat === 'zip'
                        ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/40'
                        : 'bg-zinc-950/40 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Archive className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-semibold text-zinc-200">
                          Cinema Bundle (.filmproj / .zip)
                        </span>
                      </div>
                      <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Packages full-resolution images (~5MB+) into a fast, compressed archive alongside styling manifest.
                    </p>
                    <div className="flex items-center gap-3 pt-1 text-[11px] text-zinc-500">
                      <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300">
                        <input
                          type="radio"
                          name="zipType"
                          checked={saveFormat === 'filmproj'}
                          onChange={() => setSaveFormat('filmproj')}
                          className="accent-amber-500"
                        />
                        <span>.filmproj</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300">
                        <input
                          type="radio"
                          name="zipType"
                          checked={saveFormat === 'zip'}
                          onChange={() => setSaveFormat('zip')}
                          className="accent-amber-500"
                        />
                        <span>.zip</span>
                      </label>
                    </div>
                  </div>

                  {/* Option 2: .filmjson */}
                  <div
                    onClick={() => setSaveFormat('json')}
                    className={`cursor-pointer p-3.5 rounded-xl border transition-all text-left space-y-1.5 ${
                      saveFormat === 'json'
                        ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/40'
                        : 'bg-zinc-950/40 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-semibold text-zinc-200">
                        Standalone JSON (.filmjson)
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Single text document with embedded base64 images. Great for easy file exchange and simple text archiving.
                    </p>
                    <span className="text-[10px] text-zinc-500 block pt-1">
                      Contains {filledFramesCount} photo{filledFramesCount !== 1 ? 's' : ''} & strip styles
                    </span>
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-xs text-zinc-400">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-zinc-300 font-medium">
                    <Layers className="w-3.5 h-3.5 text-amber-400" /> {config.frameCount} Total Frames
                  </span>
                  <span>•</span>
                  <span>{filledFramesCount} Images Uploaded</span>
                </div>
                <span className="font-mono text-zinc-400">{config.aspectRatio} • {config.filmStockName}</span>
              </div>

              {/* Progress / Status */}
              {isProcessing && (
                <div className="space-y-1.5 p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                  <div className="flex items-center justify-between text-xs text-zinc-300">
                    <span>{progress.status}</span>
                    <span className="font-mono font-bold text-amber-400">{progress.percent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all duration-200"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                id="btn-download-project-file"
                onClick={handleExport}
                disabled={isProcessing}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-semibold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                {isProcessing ? 'Packaging & Downloading...' : `Download ${saveFormat.toUpperCase()} Project File`}
              </button>
            </div>
          )}

          {/* TAB 2: OPEN / LOAD PROJECT */}
          {activeTab === 'open' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-amber-400 bg-amber-500/10'
                    : 'border-zinc-700 hover:border-zinc-500 bg-zinc-950/40 hover:bg-zinc-950/80'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".filmproj,.zip,.filmjson,.json,application/zip,application/json"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileSelected(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                <div className="p-3 bg-zinc-800/80 rounded-2xl mb-3 text-amber-400 border border-zinc-700">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-200">
                  Drop your Project File here, or click to browse
                </h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                  Supports <strong className="text-amber-400">.filmproj</strong>, <strong className="text-amber-400">.zip</strong>, <strong className="text-cyan-400">.filmjson</strong>, or standard <strong className="text-zinc-300">.json</strong> project exports.
                </p>
                <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-800 text-zinc-300 text-xs rounded-lg border border-zinc-700 font-medium">
                  <FolderOpen className="w-3.5 h-3.5" />
                  Select Project File
                </div>
              </div>

              {/* Progress / Status */}
              {isProcessing && (
                <div className="space-y-1.5 p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                  <div className="flex items-center justify-between text-xs text-zinc-300">
                    <span>{progress.status}</span>
                    <span className="font-mono font-bold text-amber-400">{progress.percent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all duration-200"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AUTO-SAVE & STORAGE STATUS */}
          {activeTab === 'storage' && (
            <div className="space-y-4">
              <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30 shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200">
                      Persistent Browser Storage Active
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                      Your film strip settings, raw full-resolution uploaded photos (100% uncropped original files), non-destructive pan/zoom coordinates, and color grades are automatically cached in browser <strong>IndexedDB</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    Last Auto-Saved:
                  </span>
                  <span className="font-mono text-zinc-300 font-medium">
                    {lastAutoSavedTime ? lastAutoSavedTime.toLocaleTimeString() : 'Just now'}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-zinc-950/30 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">Start Fresh Project</h4>
                  <p className="text-[11px] text-zinc-400">
                    Clears the saved browser cache and resets filmstrip to default 4-frame reel.
                  </p>
                </div>
                <button
                  onClick={handleClearCache}
                  className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-medium rounded-lg border border-rose-500/40 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear & Reset
                </button>
              </div>
            </div>
          )}

          {/* Feedback messages */}
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-zinc-950/80 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <span>💡 All project archives (.filmproj / .zip / .filmjson) work 100% offline</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
