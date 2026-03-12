import { useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { convertFileSrc } from "@tauri-apps/api/core";
import { X, ChevronLeft, ChevronRight, Check } from "lucide-react";
import type { MediaGroup, Keybindings } from "../types";
import { formatSize, formatDate } from "../lib/mediaUtils";

interface Props {
  groups: MediaGroup[];
  index: number | null;
  pickedIds: Set<string>;
  keybindings: Keybindings;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onTogglePick: (id: string) => void;
}

export function VideoPreviewModal({
  groups, index, pickedIds, keybindings,
  onClose, onNext, onPrev, onTogglePick,
}: Props) {
  const group = index !== null ? groups[index] : null;
  const isPicked = group ? pickedIds.has(group.id) : false;
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.load();
    v.play().catch(() => {});
  }, [group?.id]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (index === null) return;
    const key = e.key;
    if (key === " " || key === "ArrowLeft" || key === "ArrowRight") return;
    e.preventDefault(); e.stopPropagation();
    if (key === "Escape" || key === keybindings.close) onClose();
    else if (key === keybindings.next) onNext();
    else if (key === keybindings.prev) onPrev();
    else if (key.toLowerCase() === keybindings.pick.toLowerCase() && group) onTogglePick(group.id);
  }, [index, group, keybindings, onClose, onNext, onPrev, onTogglePick]);

  useEffect(() => {
    if (index !== null) {
      window.addEventListener("keydown", handleKey, true);
      return () => window.removeEventListener("keydown", handleKey, true);
    }
  }, [index, handleKey]);

  const videoFile = group?.video ?? group?.display;

  return (
    <AnimatePresence>
      {index !== null && group && videoFile && (
        <motion.div
          key="video-preview-backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.93)", backdropFilter: "blur(16px)" }}
          onClick={onClose}
        >
          <motion.div
            key={group.id}
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative flex flex-col items-center gap-3"
            style={{ width: "min(90vw, 1080px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <video
              ref={videoRef}
              src={convertFileSrc(videoFile.path)}
              controls
              autoPlay
              className="w-full rounded-xl shadow-2xl bg-black"
              style={{ maxHeight: "78vh", outline: "none" }}
            />
            <div className="flex items-center gap-4 text-white/50 text-sm">
              <span className="text-white/80 font-medium">{videoFile.name}</span>
              <span>{formatSize(videoFile.size)}</span>
              <span>{formatDate(videoFile.modified)}</span>
            </div>
          </motion.div>

          <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10">
            <X size={16} />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onTogglePick(group.id); }}
            className={`absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all z-10 ${isPicked ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "bg-white/10 text-white/70 hover:bg-white/20"}`}
          >
            {isPicked && <Check size={13} strokeWidth={3} />}
            {isPicked ? "已选中" : "按 F 选中"}
          </button>

          {index > 0 && (
            <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10">
              <ChevronLeft size={20} />
            </button>
          )}
          {index < groups.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10">
              <ChevronRight size={20} />
            </button>
          )}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/30 text-xs z-10">
            {index + 1} / {groups.length}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
