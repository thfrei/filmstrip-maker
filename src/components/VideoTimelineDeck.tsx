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
  ChevronUp, 
  Wand2, 
  Eye, 
  RefreshCw,
  Check,
  Maximize2,
  Sliders,
  X
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

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(videoSource?.duration || 10);
  const [timeInputString, setTimeInputString] = useState<string>('00:00.00');
  const [isLiveSyncEnabled, setIsLiveSyncEnabled] = useState<boolean>(true);
  const [isGeneratingDemo, setIsGeneratingDemo] = useState<boolean>(false);
  const [hoveredTime, setHoveredTime] = useState<number | null>(null);
  const [hoveredFrameMarker, setHoveredFrameMarker] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Active frame index default to 0 if none selected
  const activeFrameIndex = selectedFrameIndex !== null ? selectedFrameIndex : 0;
  const activeFrame = frames[activeFrameIndex];

  // Helper to show transient status messages
  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 2500);
  };

  // When active frame changes, if it has a saved video timestamp, seek to it!
  useEffect(() => {
    if (!videoRef.current || !videoSource) return;

    if (activeFrame && typeof activeFrame.videoTimestamp === 'number' && !isPlaying) {
      const targetTime = Math.max(0, Math.min(activeFrame.videoTimestamp, duration));
      if (Math.abs(videoRef.current.currentTime - targetTime) > 0.08) {
        videoRef.current.currentTime = targetTime;
        setCurrentTime(targetTime);
        setTimeInputString(formatTimecode(targetTime));
      }
    }
  }, [activeFrameIndex, activeFrame?.videoTimestamp, duration, isPlaying, videoSource]);

  // Video time update listener
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);
    setTimeInputString(formatTimecode(t));
  };

  // Video loaded metadata
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration || 10;
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

  // Capture current video frame into target frame index
  const captureCurrentToFrame = useCallback(
    async (frameIndex: number, specificTime?: number) => {
      const video = videoRef.current;
      if (!video) return;

      setIsCapturing(true);
      try {
        const timeToCapture = specificTime !== undefined ? specificTime : video.currentTime;
        const result = await captureVideoFrame(video, timeToCapture);
        
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
      } catch (err) {
        console.error('Frame capture failed:', err);
      } finally {
        setIsCapturing(false);
      }
    },
    [videoSource?.name, onUpdateFrameImage]
  );

  // Handle Scrubbing (range slider change)
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    setTimeInputString(formatTimecode(newTime));

    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }

    // Live update active frame if enabled and not playing
    if (isLiveSyncEnabled && !isPlaying) {
      captureCurrentToFrame(activeFrameIndex, newTime);
    }
  };

  // Handle Timecode Text Input Commit
  const handleTimeInputCommit = () => {
    const parsed = parseTimecode(timeInputString);
    if (parsed !== null && !isNaN(parsed)) {
      const clamped = Math.max(0, Math.min(parsed, duration));
      setCurrentTime(clamped);
      setTimeInputString(formatTimecode(clamped));
      if (videoRef.current) {
        videoRef.current.currentTime = clamped;
      }
      if (isLiveSyncEnabled) {
        captureCurrentToFrame(activeFrameIndex, clamped);
      }
    } else {
      setTimeInputString(formatTimecode(currentTime));
    }
  };

  // Frame Nudge (Step by 1 frame or 1s)
  const handleStep = (deltaSeconds: number) => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    const nextTime = Math.max(0, Math.min(currentTime + deltaSeconds, duration));
    videoRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
    setTimeInputString(formatTimecode(nextTime));
    if (isLiveSyncEnabled) {
      captureCurrentToFrame(activeFrameIndex, nextTime);
    }
  };

  // Toggle Play / Pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Video File Upload Handler
  const handleVideoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    onSetVideoSource({
      url,
      name: file.name,
      duration: 0,
      width: 1920,
      height: 1080,
    });
    showStatus(`Loaded: ${file.name}`);
  };

  // Generate and load Demo Cinema Video
  const handleLoadDemoVideo = async () => {
    setIsGeneratingDemo(true);
    showStatus('Generating vintage 35mm cinema demo clip...');
    try {
      const demo = await generateDemoCinemaVideo();
      onSetVideoSource({
        url: demo.url,
        name: 'EASTMAN 35MM ARCHIVAL REEL',
        duration: demo.duration,
        width: 960,
        height: 540,
      });
      showStatus('Demo cinema video ready! Scrub timeline to select frames.');
      
      // Auto-populate frames evenly across demo video
      setTimeout(() => {
        handleDistributeFramesAcrossVideo(demo.duration);
      }, 300);
    } catch (err) {
      console.error('Demo video generation failed:', err);
      showStatus('Failed to generate demo video');
    } finally {
      setIsGeneratingDemo(false);
    }
  };

  // Automatically distribute all frames evenly across video duration
  const handleDistributeFramesAcrossVideo = async (overrideDuration?: number) => {
    const dur = overrideDuration || duration;
    if (!videoRef.current || dur <= 0 || frames.length === 0) return;

    showStatus(`Distributing ${frames.length} frames across movie...`);
    const count = frames.length;
    // Spread between 8% and 92% of the movie duration to avoid blank black leads
    const startP = 0.08;
    const endP = 0.92;
    const stepP = (endP - startP) / Math.max(1, count - 1);

    for (let i = 0; i < count; i++) {
      const targetTime = count === 1 ? dur * 0.5 : (startP + i * stepP) * dur;
      await captureCurrentToFrame(i, targetTime);
    }
    showStatus(`All ${count} frames extracted from movie!`);
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-14 right-6 z-40">
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
      className="bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 shadow-2xl z-30 transition-all select-none"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/*"
        onChange={handleVideoFileUpload}
        className="hidden"
      />

      {/* 1. TOP HEADER STRIP */}
      <div className="h-10 px-4 border-b border-zinc-800/80 flex items-center justify-between text-xs bg-zinc-900/60">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-mono text-amber-400 font-semibold tracking-wide">
            <Film className="w-4 h-4 text-amber-500" />
            <span>CINEMA FRAME EXTRACTOR</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-zinc-400 text-[11px]">
            <span className="text-zinc-600">|</span>
            <span className="truncate max-w-[200px] text-zinc-300 font-mono">
              {videoSource ? videoSource.name : 'No movie loaded'}
            </span>
            {videoSource && (
              <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono text-[10px]">
                {duration.toFixed(1)}s
              </span>
            )}
          </div>

          {statusMessage && (
            <span className="text-amber-300 font-mono text-[11px] animate-pulse bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60">
              {statusMessage}
            </span>
          )}
        </div>

        {/* Quick Deck Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700 font-mono text-[11px] cursor-pointer transition-colors"
            title="Upload an MP4, WebM, or MOV video file"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Upload Movie</span>
          </button>

          <button
            onClick={handleLoadDemoVideo}
            disabled={isGeneratingDemo}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-[11px] cursor-pointer transition-colors disabled:opacity-50"
            title="Load in-browser 35mm cinema demo clip"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{isGeneratingDemo ? 'Generating...' : 'Load Demo Film'}</span>
          </button>

          {videoSource && (
            <button
              onClick={() => handleDistributeFramesAcrossVideo()}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 border border-zinc-700 font-mono text-[11px] cursor-pointer transition-colors"
              title="Automatically distribute all strip frames evenly across the video"
            >
              <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Auto-Distribute Frames</span>
            </button>
          )}

          <div className="h-4 w-px bg-zinc-800 mx-1" />

          <button
            onClick={onToggleOpen}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Minimize Movie Deck"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. MAIN DECK BODY */}
      <div className="p-3.5 flex flex-col md:flex-row gap-4 items-stretch">
        {/* Left: Small Video Preview Monitor */}
        <div className="w-full md:w-56 shrink-0 flex flex-col gap-2">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-zinc-800 shadow-inner flex items-center justify-center group">
            {videoSource ? (
              <video
                ref={videoRef}
                src={videoSource.url}
                className="w-full h-full object-contain cursor-pointer"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
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

            {/* Capturing pulse indicator */}
            {isCapturing && (
              <div className="absolute inset-0 bg-amber-500/20 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
                <span className="px-2 py-1 rounded bg-black/90 text-amber-400 font-mono text-xs font-bold shadow-lg animate-pulse">
                  SAVING FRAME #{activeFrameIndex + 1}...
                </span>
              </div>
            )}
          </div>

          {/* Mini Playback Controls */}
          <div className="flex items-center justify-between px-1 py-0.5 bg-zinc-900/80 rounded-md border border-zinc-800/80 text-zinc-300">
            <button
              onClick={() => handleStep(-1)}
              disabled={!videoSource}
              className="p-1 hover:text-amber-400 hover:bg-zinc-800 rounded transition-colors cursor-pointer disabled:opacity-40"
              title="Step -1 second"
            >
              <span className="text-[10px] font-mono font-bold">-1s</span>
            </button>

            <button
              onClick={() => handleStep(-0.033)}
              disabled={!videoSource}
              className="p-1 hover:text-amber-400 hover:bg-zinc-800 rounded transition-colors cursor-pointer disabled:opacity-40"
              title="Step -1 frame (1/30 sec)"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={togglePlay}
              disabled={!videoSource}
              className="p-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded transition-colors cursor-pointer disabled:opacity-40"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
            </button>

            <button
              onClick={() => handleStep(0.033)}
              disabled={!videoSource}
              className="p-1 hover:text-amber-400 hover:bg-zinc-800 rounded transition-colors cursor-pointer disabled:opacity-40"
              title="Step +1 frame (1/30 sec)"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => handleStep(1)}
              disabled={!videoSource}
              className="p-1 hover:text-amber-400 hover:bg-zinc-800 rounded transition-colors cursor-pointer disabled:opacity-40"
              title="Step +1 second"
            >
              <span className="text-[10px] font-mono font-bold">+1s</span>
            </button>
          </div>
        </div>

        {/* Right: Full-Width Timeline, Multi-Frame Slider, and Frame Selector */}
        <div className="flex-1 flex flex-col justify-between gap-2.5">
          {/* Header Row: Frame Picker Pills & Time Input */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Frame Selector Pills: Clicking selects active frame */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-zinc-400 font-mono text-[11px] mr-1">Active Target:</span>
              {frames.map((frame, idx) => {
                const isSelected = activeFrameIndex === idx;
                const hasTime = typeof frame.videoTimestamp === 'number';
                return (
                  <button
                    key={frame.id}
                    onClick={() => {
                      onSelectFrame(idx);
                      if (videoRef.current && hasTime) {
                        videoRef.current.currentTime = frame.videoTimestamp!;
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
                title="When enabled, scrubbing the timeline immediately updates the selected frame in the filmstrip"
              >
                <input
                  type="checkbox"
                  checked={isLiveSyncEnabled}
                  onChange={(e) => setIsLiveSyncEnabled(e.target.checked)}
                  className="accent-amber-500 w-3.5 h-3.5 rounded cursor-pointer"
                />
                <span className="font-mono">Live Scrub</span>
              </label>

              {/* Capture Current Frame Button */}
              <button
                onClick={() => captureCurrentToFrame(activeFrameIndex)}
                disabled={!videoSource || isCapturing}
                className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded font-mono text-xs cursor-pointer transition-all shadow-md shadow-amber-500/20 active:scale-95 disabled:opacity-40"
                title={`Grab snapshot at ${formatTimecode(currentTime)} into Frame #${activeFrameIndex + 1}`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Snap to #{activeFrameIndex + 1}</span>
              </button>
            </div>
          </div>

          {/* 3. THE MULTI-FRAME TIMELINE SLIDER (USER'S CORE REQUIREMENT) */}
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

              {/* MARKERS FOR ALL FRAMES ON THE TIMELINE */}
              {frames.map((frame, idx) => {
                const isSelected = activeFrameIndex === idx;
                // If timestamp is not set yet, position evenly as default preview
                const frameTime = typeof frame.videoTimestamp === 'number'
                  ? frame.videoTimestamp
                  : (idx / Math.max(1, frames.length - 1)) * duration;
                
                const percent = duration > 0 ? Math.max(0, Math.min(100, (frameTime / duration) * 100)) : 0;

                if (isSelected) {
                  // PRIMARY COLOR SLIDER THUMB (The active selected frame!)
                  return (
                    <div
                      key={`active-marker-${frame.id}`}
                      className="absolute -top-3.5 bottom-0 z-30 pointer-events-none transform -translate-x-1/2 flex flex-col items-center"
                      style={{ left: `${percent}%` }}
                    >
                      {/* Active Frame Badge with Primary Color (Kodak Amber #f59e0b) */}
                      <div className="px-2 py-0.5 rounded-full bg-amber-500 text-zinc-950 font-mono font-black text-[11px] shadow-xl shadow-amber-500/50 ring-4 ring-amber-500/30 ring-offset-2 ring-offset-zinc-950 flex items-center gap-1 animate-in zoom-in-75 duration-150">
                        <span>#{idx + 1}</span>
                        <span className="text-[9px] font-semibold opacity-90">ACTIVE</span>
                      </div>
                      {/* Needle Indicator */}
                      <div className="w-1 flex-1 bg-amber-400 shadow-[0_0_10px_#f59e0b] rounded-full my-0.5" />
                    </div>
                  );
                } else {
                  // SECONDARY SLIDER MARKERS (Other frames visible along the timeline)
                  return (
                    <div
                      key={`other-marker-${frame.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectFrame(idx);
                        if (videoRef.current) {
                          videoRef.current.currentTime = frameTime;
                        }
                      }}
                      onMouseEnter={() => setHoveredFrameMarker(idx)}
                      onMouseLeave={() => setHoveredFrameMarker(null)}
                      className="absolute -top-2.5 bottom-0 z-20 cursor-pointer transform -translate-x-1/2 flex flex-col items-center group transition-transform hover:scale-110"
                      style={{ left: `${percent}%` }}
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
                max={duration || 10}
                step={0.02}
                value={currentTime}
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
                Scrub to pick scene for Frame #{activeFrameIndex + 1} • Click other badges (#2, #3...) to switch
              </span>
              <span>{formatTimecode(duration)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
