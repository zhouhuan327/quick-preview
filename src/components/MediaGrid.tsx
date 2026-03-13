import { useState, useRef, useEffect, useMemo } from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { Check, Play } from "lucide-react";
import type { MediaGroup } from "../types";

const COLS = 4;
const GAP = 10;
const PADDING = 12;
const OVERSCAN = 2; // extra rows to render above/below viewport

interface Props {
  groups: MediaGroup[];
  pickedIds: Set<string>;
  selectionMode: boolean;
  onPreview: (index: number) => void;
  onHoverIndex: (index: number | null) => void;
  onTogglePick: (id: string) => void;
  ffmpegPath?: string | null;
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function VideoThumbnail({ src, filePath, modified, ffmpegPath, onDuration }: {
  src: string;
  filePath: string;
  modified: number;
  ffmpegPath?: string | null;
  onDuration?: (d: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // ffmpeg 模式：后端生成缩略图 + 读时长
  useEffect(() => {
    if (!ffmpegPath) return;
    let cancelled = false;
    (async () => {
      try {
        const [thumbPath, duration] = await Promise.all([
          invoke<string>("get_video_thumbnail", { videoPath: filePath, modified }),
          invoke<number>("get_video_duration", { videoPath: filePath }),
        ]);
        if (cancelled) return;
        setThumbUrl(convertFileSrc(thumbPath));
        setLoaded(true);
        if (onDuration) onDuration(duration);
      } catch {
        // fallback 到 canvas 模式（不设 loaded，让 video 元素接管）
      }
    })();
    return () => { cancelled = true; };
  }, [filePath, ffmpegPath]);

  const handleSeeked = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 180;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL("image/jpeg", 0.8);
      setThumbUrl(url);
      setLoaded(true);
    } catch (e) {
      // canvas tainted - fallback to showing video directly
      setLoaded(true);
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    if (onDuration && video.duration && isFinite(video.duration)) onDuration(video.duration);
    // Play then immediately pause to force GPU decode + frame render
    video.play().then(() => {
      video.pause();
      video.currentTime = 0.5;
    }).catch(() => {
      video.currentTime = 0.5;
    });
  };

  return (
    <>
      {!loaded && <div className="absolute inset-0 bg-white/5 animate-pulse rounded-lg" />}
      {/* Canvas 模式：隐藏 video 截帧 */}
      {!ffmpegPath && (
        <>
          <video
            ref={videoRef}
            src={src}
            muted
            playsInline
            preload="metadata"
            onLoadedMetadata={handleLoadedMetadata}
            onSeeked={handleSeeked}
            style={{ display: "none" }}
          />
          <canvas ref={canvasRef} style={{ display: "none" }} />
        </>
      )}
      {thumbUrl ? (
        <img
          src={thumbUrl}
          alt="video thumbnail"
          className={`w-full h-full object-cover transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      ) : loaded ? (
        /* fallback: show video element directly */
        <video
          src={src}
          muted
          playsInline
          className="w-full h-full object-cover"
          style={{ pointerEvents: "none" }}
        />
      ) : null}
    </>
  );
}

function Thumbnail({ src, alt, isVideo, filePath, modified, ffmpegPath, onDuration }: {
  src: string; alt: string; isVideo?: boolean;
  filePath?: string; modified?: number; ffmpegPath?: string | null;
  onDuration?: (d: number) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  if (isVideo) {
    return <VideoThumbnail src={src} filePath={filePath!} modified={modified!} ffmpegPath={ffmpegPath} onDuration={onDuration} />;
  }
  return (
    <>
      {!loaded && <div className="absolute inset-0 bg-white/5 animate-pulse rounded-lg" />}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={`w-full h-full object-cover transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
        loading="lazy"
        decoding="async"
      />
    </>
  );
}

interface GridItemProps {
  group: MediaGroup;
  src: string;
  isPicked: boolean;
  top: number;
  left: number;
  cellSize: number;
  selectionMode: boolean;
  ffmpegPath?: string | null;
  onPreview: () => void;
  onHoverIndex: () => void;
  onTogglePick: (id: string) => void;
}

function GridItem({ group, src, isPicked, top, left, cellSize, selectionMode, ffmpegPath, onPreview, onHoverIndex, onTogglePick }: GridItemProps) {
  const [duration, setDuration] = useState<number | null>(null);
  return (
    <div style={{ position: "absolute", top, left, width: cellSize, height: cellSize }}>
      <div
        className="relative group w-full h-full rounded-lg overflow-hidden cursor-pointer bg-white/5"
        onClick={() => selectionMode ? onTogglePick(group.id) : onPreview()}
        onMouseEnter={onHoverIndex}
      >
        <Thumbnail
          src={src}
          alt={group.display.name}
          isVideo={group.isVideo}
          filePath={group.display.path}
          modified={group.display.modified}
          ffmpegPath={ffmpegPath}
          onDuration={group.isVideo ? setDuration : undefined}
        />

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-150" />

        {group.isVideo && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm">
            <Play size={9} className="text-white fill-white" />
            <span className="text-[9px] text-white/80 font-medium leading-none">
              {duration != null ? formatDuration(duration) : "VIDEO"}
            </span>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-xs text-white truncate">{group.display.name}</p>
          {group.raw && <span className="text-[10px] text-white/40">+RAW</span>}
        </div>

        {selectionMode && (
          <div className={`absolute top-2 left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
            isPicked ? "bg-blue-500 border-blue-500" : "border-white/50 bg-black/30"
          }`}>
            {isPicked && <Check size={11} className="text-white" strokeWidth={3} />}
          </div>
        )}

        {!selectionMode && isPicked && (
          <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
            <Check size={11} className="text-white" strokeWidth={3} />
          </div>
        )}

        {isPicked && (
          <div className="absolute inset-0 ring-2 ring-blue-500 ring-inset rounded-lg pointer-events-none" />
        )}
      </div>
    </div>
  );
}

export function MediaGrid({ groups, pickedIds, selectionMode, onPreview, onHoverIndex, onTogglePick, ffmpegPath }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [containerHeight, setContainerHeight] = useState(600);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setContainerWidth(width);
      setContainerHeight(height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cellSize = Math.floor((containerWidth - PADDING * 2 - GAP * (COLS - 1)) / COLS);
  const rowHeight = cellSize + GAP;
  const rowCount = Math.ceil(groups.length / COLS);
  const totalHeight = rowCount * rowHeight + PADDING;

  // Visible row range
  const firstVisibleRow = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN);
  const lastVisibleRow = Math.min(rowCount - 1, Math.ceil((scrollTop + containerHeight) / rowHeight) + OVERSCAN);

  const visibleItems = useMemo(() => {
    const items = [];
    for (let row = firstVisibleRow; row <= lastVisibleRow; row++) {
      for (let col = 0; col < COLS; col++) {
        const index = row * COLS + col;
        if (index >= groups.length) break;
        items.push({ index, row, col });
      }
    }
    return items;
  }, [firstVisibleRow, lastVisibleRow, groups.length]);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white/20 gap-3">
        <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 19.5h18a.75.75 0 00.75-.75v-15A.75.75 0 0021 3H3a.75.75 0 00-.75.75v15c0 .414.336.75.75.75z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-sm">选择左侧文件夹查看图片</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-y-auto"
      onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
      onMouseLeave={() => onHoverIndex(null)}
    >
      {/* Total height spacer for correct scrollbar */}
      <div style={{ height: totalHeight, position: "relative" }}>
        {visibleItems.map(({ index, row, col }) => {
          const group = groups[index];
          const isPicked = pickedIds.has(group.id);
          const src = convertFileSrc(group.display.path);
          const top = PADDING + row * rowHeight;
          const left = PADDING + col * (cellSize + GAP);

          return (
            <GridItem
              key={group.id}
              group={group}
              src={src}
              isPicked={isPicked}
              top={top}
              left={left}
              cellSize={cellSize}
              selectionMode={selectionMode}
              ffmpegPath={ffmpegPath}
              onPreview={() => onPreview(index)}
              onHoverIndex={() => onHoverIndex(index)}
              onTogglePick={onTogglePick}
            />
          );

        })}
      </div>
    </div>
  );
}
