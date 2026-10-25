import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Film, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Upload, 
  Sparkles, 
  Clock, 
  Camera, 
  ChevronDown, 
  Wand2, 
  Info,
  Check,
  Sliders,
  HelpCircle
} from 'lucide-react';
import { FrameData, VideoSourceInfo } from '../types';
import { formatTimecode, parseTimecode, captureVideoFrame, generateDemoCinemaVideo } from '../utils/videoExtractor';

interface VideoTimelineDeckProps {
  frames: FrameData[];
  selectedFrameIndex: number | null;
  onSelectFrame: (index: number) => void;
  onUpdateFrameImage: (index: number, data: {
    imageUrl: string;
    imageNaturalWidth: number;
    imageNaturalHeight: number;
    videoTimestamp: number;
    sourceVideoName: string;
    imageName: string;
  }) => void;
  videoSource: VideoSourceInfo | null;
  onSetVideoSource: (source: VideoSourceInfo | null) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const VideoTimelineDeck: React.FC<VideoTimelineDeckProps> = ({
  frames,
  selectedFrameIndex,
  onSelectFrame,
  onUpdateFrameImage,
  videoSource,
  onSetVideoSource,
  isOpen,
  onToggleOpen,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);

  // Seeking queue refs to prevent decoder flooding
  const isSeekingRef = useRef<boolean>(false);
  const queuedSeekTimeRef = useRef<number | null>(null);
  const settleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(videoSource?.duration || 12);
  const [timeInputString, setTimeInputString] = useState<string>('00:00.00');
  const [isLiveSyncEnabled, setIsLiveSyncEnabled] = useState<boolean>(false);
  const [isGeneratingDemo, setIsGeneratingDemo] = useState<boolean>(false);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [justSnapped, setJustSnapped] = useState<number | null>(null);
  const [shutterFlash, setShutterFlash] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showKeyframeInfo, setShowKeyframeInfo] = useState<boolean>(false);
  const justSnappedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Safe pause that awaits any pending play() promise to prevent AbortError
  const safePause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (playPromiseRef.current) {
      playPromiseRef.current
        .then(() => {
          video.pause();
          setIsPlaying(false);
        })
        .catch(() => {
          try {
            video.pause();
          } catch {
            // ignore
          }
          setIsPlaying(false);
        });
    } else {
      try {
        video.pause();
      } catch {
        // ignore
      }
      setIsPlaying(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      safePause();
    };
  }, [safePause]);

  // Active frame index default to 0 if none selected
  const activeFrameIndex = selectedFrameIndex !== null ? selectedFrameIndex : 0;
  const activeFrame = frames[activeFrameIndex];

  // Ref to track last active frame index so seeking only happens on actual user selection change
  const prevActiveIndexRef = useRef<number | null>(null);

  // Ensure active frame is selected when video deck is open
  useEffect(() => {
    if (isOpen && selectedFrameIndex === null && frames.length > 0) {
      onSelectFrame(0);
    }
  }, [isOpen, selectedFrameIndex, frames.length, onSelectFrame]);

  // Helper to show transient status messages
  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Safe seek handler that queues rapid seeks without dropping decoder state
  const requestVideoSeek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;

    const clampedTime = Math.max(0, Math.min(time, duration || video.duration || time));

    if (isSeekingRef.current) {
      queuedSeekTimeRef.current = clampedTime;
      return;
    }

    isSeekingRef.current = true;
    video.currentTime = clampedTime;
  }, [duration]);

  // Video seeked event handler to process queued seeks
  const handleSeeked = useCallback(() => {
    isSeekingRef.current = false;
    const nextSeek = queuedSeekTimeRef.current;
    if (nextSeek !== null && videoRef.current) {
      queuedSeekTimeRef.current = null;
      if (Math.abs(videoRef.current.currentTime - nextSeek) > 0.02) {
        isSeekingRef.current = true;
        videoRef.current.currentTime = nextSeek;
      }
    }
  }, []);

  // When active frame selection changes in filmstrip, seek video to its timestamp (if already set)
  useEffect(() => {
    if (!videoRef.current || !videoSource) return;

    if (activeFrameIndex !== prevActiveIndexRef.current) {
      prevActiveIndexRef.current = activeFrameIndex;

      const currentTarget = frames[activeFrameIndex];
      if (currentTarget && typeof currentTarget.videoTimestamp === 'number' && !isPlaying && !isScrubbing) {
        const targetTime = Math.max(0, Math.min(currentTarget.videoTimestamp, duration));
        if (Math.abs(videoRef.current.currentTime - targetTime) > 0.03) {
          requestVideoSeek(targetTime);
          setCurrentTime(targetTime);
          setTimeInputString(formatTimecode(targetTime));
        }
      }
    }
  }, [activeFrameIndex, frames, duration, isPlaying, isScrubbing, videoSource, requestVideoSeek]);

  // Capture current video frame into target frame index
  const captureCurrentToFrame = useCallback(
    async (frameIndex: number, specificTime?: number) => {
      const video = videoRef.current;
      if (!video) return;

      setIsCapturing(true);
      try {
        // If specificTime is provided, use that; otherwise use the instantaneous video.currentTime
        const timeToCapture = specificTime !== undefined 
          ? specificTime 
          : (typeof video.currentTime === 'number' && !isNaN(video.currentTime) ? video.currentTime : 0);
        // Only pass targetTime to captureVideoFrame if specificTime was explicitly given
        const result = await captureVideoFrame(video, specificTime);
        
        const videoName = videoSource?.name || 'Movie Clip';
        const formattedTime = formatTimecode(timeToCapture);

        onUpdateFrameImage(frameIndex, {
          imageUrl: result.dataUrl,
          imageNaturalWidth: result.width,
          imageNaturalHeight: result.height,
          videoTimestamp: timeToCapture,
          sourceVideoName: videoName,
          imageName: `${videoName} @ ${formattedTime}`,
        });

        // Trigger brief visual success feedback on the Snap button and status bar
        setJustSnapped(frameIndex);
        if (justSnappedTimeoutRef.current) {
          clearTimeout(justSnappedTimeoutRef.current);
        }
        justSnappedTimeoutRef.current = setTimeout(() => {
          setJustSnapped(null);
        }, 1200);

        // Flash camera shutter effect on monitor
        setShutterFlash(true);
        setTimeout(() => setShutterFlash(false), 120);

        showStatus(`✓ Snapped Frame #${frameIndex + 1} @ ${formattedTime}`);
      } catch (err) {
        console.error('Frame capture failed:', err);
        showStatus(`Failed to snap Frame #${frameIndex + 1}`);
      } finally {
        setIsCapturing(false);
      }
    },
    [videoSource?.name, onUpdateFrameImage]
  );

  // Video time update listener
  const handleTimeUpdate = () => {
    if (!videoRef.current || isScrubbing) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);
    setTimeInputString(formatTimecode(t));
  };

  // Video loaded metadata
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration || 12;
    setDuration(dur);
    if (videoSource) {
      onSetVideoSource({
        ...videoSource,
        duration: dur,
        width: videoRef.current.videoWidth || 1280,
        height: videoRef.current.videoHeight || 720,
      });
    }
  };

  // Scrubbing Handler: Updates video preview immediately & settles capture upon pause
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isPlaying) {
      safePause();
    }
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    setTimeInputString(formatTimecode(newTime));

    // Seek the video preview smoothly
    requestVideoSeek(newTime);

    // If live sync is enabled, debounce the high-resolution frame capture
    if (isLiveSyncEnabled && !isPlaying) {
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current);
      }
      settleTimerRef.current = setTimeout(() => {
        captureCurrentToFrame(activeFrameIndex, newTime);
      }, 150);
    }
  };

  // Handle Scrub Release (pointerup / mouseup on slider)
  const handleScrubEnd = () => {
    setIsScrubbing(false);
    if (isLiveSyncEnabled && !isPlaying) {
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current);
      }
      captureCurrentToFrame(activeFrameIndex, currentTime);
    }
  };

  // Handle Timecode Text Input Commit
  const handleTimeInputCommit = () => {
    const parsed = parseTimecode(timeInputString);
    if (parsed !== null && !isNaN(parsed)) {
      const clamped = Math.max(0, Math.min(parsed, duration));
      setCurrentTime(clamped);
      setTimeInputString(formatTimecode(clamped));
      requestVideoSeek(clamped);
      if (isLiveSyncEnabled) {
        captureCurrentToFrame(activeFrameIndex, clamped);
      }
    } else {
      setTimeInputString(formatTimecode(currentTime));
    }
  };

  // Precise Frame-by-Frame Stepping (±1 frame = 1/30s = 0.0333s)
  const handleStep = (deltaSeconds: number) => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      safePause();
    }

    const nextTime = Math.max(0, Math.min(currentTime + deltaSeconds, duration));
    requestVideoSeek(nextTime);
    setCurrentTime(nextTime);
    setTimeInputString(formatTimecode(nextTime));
  };

  // Toggle Play / Pause safely
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      safePause();
    } else {
      try {
        const p = video.play();
        if (p !== undefined) {
          playPromiseRef.current = p;
          p.then(() => {
            playPromiseRef.current = null;
            setIsPlaying(true);
          }).catch((err) => {
            playPromiseRef.current = null;
            setIsPlaying(false);
            if (err?.name !== 'AbortError') {
              console.warn('Video playback aborted/failed:', err);
            }
          });
        } else {
          setIsPlaying(true);
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.warn('Video play call error:', err);
        }
      }
    }
  };

  // Video File Upload Handler
  const handleVideoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    safePause();

    if (videoSource?.url && videoSource.url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(videoSource.url);
      } catch {
        // Safe ignore
      }
    }

    const url = URL.createObjectURL(file);
    onSetVideoSource({
      url,
      blob: file,
      name: file.name,
      duration: 0,
      width: 1920,
      height: 1080,
    });
    showStatus(`Loaded: ${file.name}`);
  };

  // Load All-Keyframe Demo Cinema Video
  const handleLoadDemoVideo = async () => {
    safePause();
    setIsGeneratingDemo(true);
    showStatus('Loading 35mm all-keyframe archival cinema reel...');
    try {
      const demo = await generateDemoCinemaVideo();
      onSetVideoSource({
        url: demo.url,
        blob: demo.blob,
        name: '35MM ALL-KEYFRAME ARCHIVAL REEL',
        duration: demo.duration,
        width: 960,
        height: 540,
      });
      showStatus('All-keyframe cinema reel loaded! Zero seek latency.');
      
      // Auto-populate frames evenly across demo video
      setTimeout(() => {
        handleDistributeFramesAcrossVideo(demo.duration);
      }, 400);
    } catch (err) {
      console.error('Demo video load failed:', err);
      showStatus('Failed to load demo video');
    } finally {
      setIsGeneratingDemo(false);
    }
  };

  // Distribute all frames evenly across video duration
  const handleDistributeFramesAcrossVideo = async (overrideDuration?: number) => {
    const dur = overrideDuration || duration;
    if (!videoRef.current || dur <= 0 || frames.length === 0) return;

    showStatus(`Extracting ${frames.length} frames across movie...`);
    const count = frames.length;
    const startP = 0.08;
    const endP = 0.92;
    const stepP = (endP - startP) / Math.max(1, count - 1);

    for (let i = 0; i < count; i++) {
      const targetTime = count === 1 ? dur * 0.5 : (startP + i * stepP) * dur;
      await captureCurrentToFrame(i, targetTime);
    }
    showStatus(`All ${count} frames successfully extracted!`);
  };

  if (!isOpen) {
    return (
      <div className="hidden sm:block fixed bottom-14 right-6 z-40">
        <button
          onClick={onToggleOpen}
          className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-2xl shadow-amber-500/30 border border-amber-300 cursor-pointer transition-all hover:scale-105 active:scale-95"
          title="Open Movie Frame Extractor"
        >
          <Film className="w-4 h-4" />
          <span>Movie Reel Deck</span>
          {videoSource && (
            <span className="w-2 h-2 rounded-full bg-emerald-950 animate-ping" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div 
      id="video-timeline-deck"
      className="fixed inset-x-0 bottom-0 z-40 max-h-[70dvh] overflow-y-auto overscroll-contain bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 shadow-2xl transition-all select-none pb-[env(safe-area-inset-bottom)] lg:static lg:inset-auto lg:z-30 lg:max-h-none lg:overflow-visible lg:pb-0"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/*"
        onChange={handleVideoFileUpload}
        className="hidden"
      />

      {/* 1. TOP HEADER STRIP */}
      <div className="h-10 px-2 sm:px-4 border-b border-zinc-800/80 flex items-center justify-between gap-2 text-xs bg-zinc-900/60 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 font-mono text-amber-400 font-semibold tracking-wide">
            <Film className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">CINEMA FRAME EXTRACTOR</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-zinc-400 text-[11px]">
            <span className="text-zinc-600">|</span>
            <span className="truncate max-w-[220px] text-zinc-300 font-mono">
              {videoSource ? videoSource.name : 'No movie loaded'}
            </span>
            {videoSource && (
              <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono text-[10px]">
                {duration.toFixed(1)}s
              </span>
            )}
          </div>

          {/* Keyframe & Seeking Explainer Tooltip Toggle */}
          <button
            onClick={() => setShowKeyframeInfo((v) => !v)}
            className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-amber-400 transition-colors cursor-pointer"
            title="Understanding Keyframes & Scrubbing in Video Codecs"
          >
            <HelpCircle className="w-3.5 h-3.5 text-zinc-500 hover:text-amber-400" />
            <span className="hidden lg:inline text-[10px]">Keyframe Info</span>
          </button>

          {statusMessage && (
            <span className="text-amber-300 font-mono text-[11px] bg-amber-950/90 px-2.5 py-0.5 rounded border border-amber-800/80 shadow">
              {statusMessage}
            </span>
          )}
        </div>

        {/* Quick Deck Actions */}
        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700 font-mono text-[11px] cursor-pointer transition-colors"
            title="Upload any MP4, WebM, or MOV video file"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Upload Movie</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleLoadDemoVideo();
            }}
            disabled={isGeneratingDemo}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-[11px] cursor-pointer transition-colors disabled:opacity-50"
            title="Load 35mm all-keyframe demo cinema reel"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{isGeneratingDemo ? 'Loading...' : 'Load 35mm Demo Reel'}</span>
          </button>

          {videoSource && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDistributeFramesAcrossVideo();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 border border-zinc-700 font-mono text-[11px] cursor-pointer transition-colors"
              title="Automatically distribute all strip frames evenly across the movie"
            >
              <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Auto-Distribute</span>
            </button>
          )}

          <div className="h-4 w-px bg-zinc-800 mx-1" />

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleOpen();
            }}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Minimize Movie Deck"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Keyframe Explainer Dropdown Banner */}
      {showKeyframeInfo && (
        <div className="px-4 py-2 bg-amber-950/40 border-b border-amber-500/20 text-[11px] text-zinc-300 flex items-start gap-2.5 animate-in slide-in-from-top-2 duration-150">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="font-semibold text-amber-300">
              Why do some movies skip or snap when scrubbing fast?
            </p>
            <p className="text-zinc-300 leading-relaxed">
              Standard movie files (H.264 / VP9 / AV1) use <strong>long-GOP compression</strong>: they only store full pictures (<span className="text-amber-400 font-mono">I-frames / Keyframes</span>) every 1–3 seconds, and only mathematical differences (<span className="text-cyan-400 font-mono">P/B delta frames</span>) in between.
              During high-speed dragging, video decoders prioritize keyframes to prevent freezing.
              When you <strong>pause on a time</strong> or use the <strong>◀ -1 Frame / ▶ +1 Frame</strong> buttons, the decoder fully reconstructs the exact delta frame!
            </p>
          </div>
          <button
            onClick={() => setShowKeyframeInfo(false)}
            className="text-zinc-500 hover:text-zinc-300 text-xs font-mono p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. MAIN DECK BODY */}
      <div className="p-3.5 flex flex-col md:flex-row gap-4 items-stretch">
        {/* Left: Small Video Preview Monitor */}
        <div className="w-full md:w-56 shrink-0 flex flex-col gap-2">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-zinc-800 shadow-inner flex items-center justify-center group">
            {videoSource && videoSource.url && videoSource.url.trim() !== '' ? (
              <video
                ref={videoRef}
                src={videoSource.url}
                className="w-full h-full object-contain cursor-pointer"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onSeeked={handleSeeked}
                onError={(e) => {
                  const mediaErr = e.currentTarget.error;
                  // Code 1 is MEDIA_ERR_ABORTED - fetching process was aborted by user agent
                  if (mediaErr?.code === 1) {
                    return;
                  }
                  console.warn('Video playback notice:', mediaErr);
                }}
                onClick={togglePlay}
                playsInline
                preload="auto"
              />
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:bg-zinc-900/50 transition-colors w-full h-full"
              >
                <Film className="w-8 h-8 text-zinc-600 mb-2 group-hover:text-amber-500 transition-colors" />
                <span className="text-[11px] font-mono text-zinc-400">Click to load movie</span>
                <span className="text-[10px] text-zinc-600 mt-0.5">MP4 • WebM • MOV</span>
              </div>
            )}

            {/* Timecode overlay badge on video */}
            {videoSource && (
              <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm border border-zinc-700/60 font-mono text-[10px] text-amber-400 font-bold pointer-events-none">
                {formatTimecode(currentTime)}
              </div>
            )}

            {/* Camera shutter flash effect on snapshot */}
            {shutterFlash && (
              <div className="absolute inset-0 bg-white/70 pointer-events-none transition-opacity duration-150" />
            )}

            {/* Non-intrusive capturing badge */}
            {isCapturing && (
              <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-black/85 backdrop-blur-sm border border-amber-500/60 font-mono text-[10px] text-amber-400 font-bold pointer-events-none flex items-center gap-1.5 shadow-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span>SNAPPING #{activeFrameIndex + 1}...</span>
              </div>
            )}
          </div>

          {/* Precision Frame-by-Frame Stepping Controls */}
          <div 
            className="flex items-center justify-between px-1.5 py-1 bg-zinc-900/90 rounded-md border border-zinc-800/80 text-zinc-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* -1 Second */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleStep(-1.0);
              }}
              disabled={!videoSource}
              className="px-1.5 py-0.5 hover:text-amber-400 hover:bg-zinc-800 rounded transition-colors cursor-pointer disabled:opacity-40 font-mono text-[10px] font-bold"
              title="Step -1 second (Preview only)"
            >
              -1s
            </button>

            {/* -1 Exact Frame (1/30 sec) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleStep(-0.0333);
              }}
              disabled={!videoSource}
              className="flex items-center gap-0.5 px-1.5 py-0.5 hover:text-amber-400 hover:bg-zinc-800 rounded transition-colors cursor-pointer disabled:opacity-40 text-xs font-mono"
              title="Step -1 frame (exact 1/30 sec, preview only)"
            >
              <SkipBack className="w-3 h-3" />
              <span className="text-[10px] font-bold">-1f</span>
            </button>

            {/* Play / Pause */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              disabled={!videoSource}
              className="p-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded transition-colors cursor-pointer disabled:opacity-40"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
            </button>

            {/* +1 Exact Frame (1/30 sec) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleStep(0.0333);
              }}
              disabled={!videoSource}
              className="flex items-center gap-0.5 px-1.5 py-0.5 hover:text-amber-400 hover:bg-zinc-800 rounded transition-colors cursor-pointer disabled:opacity-40 text-xs font-mono"
              title="Step +1 frame (exact 1/30 sec, preview only)"
            >
              <span className="text-[10px] font-bold">+1f</span>
              <SkipForward className="w-3 h-3" />
            </button>

            {/* +1 Second */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleStep(1.0);
              }}
              disabled={!videoSource}
              className="px-1.5 py-0.5 hover:text-amber-400 hover:bg-zinc-800 rounded transition-colors cursor-pointer disabled:opacity-40 font-mono text-[10px] font-bold"
              title="Step +1 second (Preview only)"
            >
              +1s
            </button>
          </div>
        </div>

        {/* Right: Full-Width Timeline, Multi-Frame Slider, and Frame Selector */}
        <div className="flex-1 flex flex-col justify-between gap-2.5">
          {/* Header Row: Frame Picker Pills & Time Input */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Frame Selector Pills: Clicking selects active frame */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-zinc-300 font-mono text-[11px] font-semibold mr-1">Target Frame:</span>
              {frames.map((frame, idx) => {
                const isSelected = activeFrameIndex === idx;
                const hasTime = typeof frame.videoTimestamp === 'number';
                return (
                  <button
                    key={frame.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectFrame(idx);
                      if (hasTime) {
                        requestVideoSeek(frame.videoTimestamp!);
                        setCurrentTime(frame.videoTimestamp!);
                        setTimeInputString(formatTimecode(frame.videoTimestamp!));
                      }
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20 ring-2 ring-amber-400'
                        : hasTime
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-500 border border-zinc-800'
                    }`}
                    title={`Click to select Frame #${idx + 1} (${hasTime ? formatTimecode(frame.videoTimestamp!) : 'No time set'})`}
                  >
                    <span>#{idx + 1}</span>
                    {hasTime && (
                      <span className={`text-[10px] ${isSelected ? 'text-zinc-900 font-semibold' : 'text-zinc-400'}`}>
                        {formatTimecode(frame.videoTimestamp!)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Timecode Input & Capture Controls */}
            <div className="flex items-center gap-2">
              {/* Direct Timecode Input */}
              <div className="flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded border border-zinc-700">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <input
                  type="text"
                  value={timeInputString}
                  onChange={(e) => setTimeInputString(e.target.value)}
                  onBlur={handleTimeInputCommit}
                  onKeyDown={(e) => e.key === 'Enter' && handleTimeInputCommit()}
                  disabled={!videoSource}
                  className="w-20 bg-transparent text-amber-400 font-mono text-xs font-bold focus:outline-none"
                  placeholder="00:00.00"
                  title="Enter exact timestamp (e.g. 01:23.45 or 83.4)"
                />
                <span className="text-[10px] font-mono text-zinc-500">
                  / {formatTimecode(duration)}
                </span>
              </div>

              {/* Live Sync Toggle */}
              <label 
                className="flex items-center gap-1.5 text-[11px] text-zinc-300 cursor-pointer select-none px-2 py-1 rounded bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800"
                title="When enabled, dragging the timeline slider automatically captures the frame into the strip when you stop"
              >
                <input
                  type="checkbox"
                  checked={isLiveSyncEnabled}
                  onChange={(e) => setIsLiveSyncEnabled(e.target.checked)}
                  className="accent-amber-500 w-3.5 h-3.5 rounded cursor-pointer"
                />
                <span className="font-mono">Auto-Sync</span>
              </label>

              {/* Instant Frame Capture Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  captureCurrentToFrame(activeFrameIndex);
                }}
                disabled={!videoSource || isCapturing}
                className={`flex items-center gap-1.5 px-3 py-1 font-bold rounded font-mono text-xs cursor-pointer transition-all shadow-md active:scale-95 disabled:opacity-40 ${
                  justSnapped === activeFrameIndex
                    ? 'bg-emerald-400 text-zinc-950 shadow-emerald-500/30 ring-1 ring-emerald-300'
                    : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20'
                }`}
                title={`Grab exact frame at current position into Frame #${activeFrameIndex + 1}`}
              >
                {justSnapped === activeFrameIndex ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Snapped #{activeFrameIndex + 1}!</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isCapturing ? 'Snapping...' : `Snap to #${activeFrameIndex + 1}`}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3. FULL-WIDTH TIMELINE TRACK WITH ALL FRAME MARKERS */}
          <div className="relative pt-6 pb-4">
            {/* Timeline Bar Track */}
            <div className="relative w-full h-8 bg-zinc-900/90 rounded-lg border border-zinc-800 overflow-visible flex items-center">
              {/* Progress fill up to current video position */}
              <div
                className="absolute left-0 top-0 bottom-0 bg-amber-500/15 rounded-l-lg pointer-events-none border-r border-amber-500/40"
                style={{
                  width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                }}
              />

              {/* Subtle Time Markers / Ticks */}
              <div className="absolute inset-0 flex justify-between px-2 items-center pointer-events-none opacity-40">
                {Array.from({ length: 11 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-px bg-zinc-600 ${i % 2 === 0 ? 'h-3' : 'h-1.5'}`}
                  />
                ))}
              </div>

              {/* MULTI-FRAME MARKERS ON THE TIMELINE */}
              {frames.map((frame, idx) => {
                const isSelected = activeFrameIndex === idx;

                if (isSelected) {
                  // PRIMARY COLOR SLIDER THUMB: Dynamically follows the slider cursor in real time
                  const activePercent = duration > 0 ? Math.max(0, Math.min(100, (currentTime / duration) * 100)) : 0;
                  return (
                    <div
                      key={`active-marker-${frame.id}`}
                      className="absolute -top-3.5 bottom-0 z-30 pointer-events-none transform -translate-x-1/2 flex flex-col items-center"
                      style={{ left: `${activePercent}%` }}
                    >
                      {/* Active Frame Badge with Primary Color (Kodak Amber #f59e0b) */}
                      <div className="px-2.5 py-0.5 rounded-full bg-amber-500 text-zinc-950 font-mono font-black text-[11px] shadow-xl shadow-amber-500/50 ring-4 ring-amber-500/30 ring-offset-2 ring-offset-zinc-950 flex items-center gap-1 animate-in zoom-in-75 duration-150">
                        <span>#{idx + 1}</span>
                        <span className="text-[9px] font-semibold opacity-90">TARGET</span>
                      </div>
                      {/* Needle Indicator */}
                      <div className="w-1 flex-1 bg-amber-400 shadow-[0_0_10px_#f59e0b] rounded-full my-0.5" />
                    </div>
                  );
                } else {
                  // SECONDARY SLIDER MARKERS: Remain pinned at their captured/saved timestamps
                  const frameTime = typeof frame.videoTimestamp === 'number'
                    ? frame.videoTimestamp
                    : (idx / Math.max(1, frames.length - 1)) * duration;
                  const otherPercent = duration > 0 ? Math.max(0, Math.min(100, (frameTime / duration) * 100)) : 0;

                  return (
                    <div
                      key={`other-marker-${frame.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectFrame(idx);
                        if (typeof frame.videoTimestamp === 'number') {
                          requestVideoSeek(frame.videoTimestamp);
                          setCurrentTime(frame.videoTimestamp);
                          setTimeInputString(formatTimecode(frame.videoTimestamp));
                        }
                      }}
                      className="absolute -top-2.5 bottom-0 z-20 cursor-pointer transform -translate-x-1/2 flex flex-col items-center group transition-transform hover:scale-110"
                      style={{ left: `${otherPercent}%` }}
                      title={`Frame #${idx + 1} @ ${formatTimecode(frameTime)} - Click to select & seek`}
                    >
                      {/* Frame Pin Badge */}
                      <div className="px-1.5 py-0.5 rounded-md bg-zinc-800 group-hover:bg-zinc-700 text-zinc-300 group-hover:text-amber-300 font-mono text-[10px] font-bold border border-zinc-600 group-hover:border-amber-400/80 shadow-md transition-colors flex items-center gap-0.5">
                        <span>#{idx + 1}</span>
                      </div>
                      {/* Needle Line */}
                      <div className="w-0.5 flex-1 bg-zinc-600 group-hover:bg-amber-400/80 transition-colors my-0.5" />
                    </div>
                  );
                }
              })}

              {/* Native Range Slider Overlay spanning 100% width for drag scrubbing */}
              <input
                ref={sliderRef}
                type="range"
                min={0}
                max={duration || 12}
                step={0.01}
                value={currentTime}
                onPointerDown={() => setIsScrubbing(true)}
                onPointerUp={handleScrubEnd}
                onTouchStart={() => setIsScrubbing(true)}
                onTouchEnd={handleScrubEnd}
                onChange={handleSliderChange}
                disabled={!videoSource}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-40"
                title={`Drag to scrub video (${formatTimecode(currentTime)})`}
              />
            </div>

            {/* Timeline Time Labels along bottom */}
            <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 mt-1.5 px-1">
              <span>00:00.00</span>
              <span className="text-zinc-400">
                {isScrubbing ? (
                  <span className="text-amber-400 font-semibold animate-pulse">Scrubbing to select frame...</span>
                ) : (
                  <span>Drag slider to scrub • Use <strong>-1f / +1f</strong> for single-frame precision • Click badges (#2, #3...) to switch</span>
                )}
              </span>
              <span>{formatTimecode(duration)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
