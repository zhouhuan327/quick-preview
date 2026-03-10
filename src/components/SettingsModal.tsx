import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { Settings } from "../types";

const KEY_LABELS: Record<string, string> = {
  preview: "预览/关闭预览",
  pick: "标记/取消标记",
  next: "下一张",
  prev: "上一张",
  close: "关闭预览",
};

function formatKey(key: string): string {
  if (key === " ") return "Space";
  if (key === "ArrowLeft") return "←";
  if (key === "ArrowRight") return "→";
  if (key === "Escape") return "Esc";
  return key.toUpperCase();
}

interface Props {
  open: boolean;
  settings: Settings;
  onClose: () => void;
  onChange: (s: Settings) => void;
}

export function SettingsModal({ open, settings, onClose, onChange }: Props) {
  const [recording, setRecording] = useState<string | null>(null);

  function handleKeyRecord(action: string, e: React.KeyboardEvent) {
    e.preventDefault();
    e.stopPropagation();
    const key = e.key;
    if (key === "Escape") { setRecording(null); return; }
    onChange({
      ...settings,
      keybindings: { ...settings.keybindings, [action]: key },
    });
    setRecording(null);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2 }}
            className="w-[480px] rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
            style={{ background: "#161616" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="text-base font-semibold text-white">设置</h2>
              <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors">
                <X size={15} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* Merge RAW toggle */}
              <div>
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">文件</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-white">合并同名 JPG+RAW</div>
                    <div className="text-xs text-white/40 mt-0.5">相机双存模式下自动合并为一个格子</div>
                  </div>
                  <button
                    onClick={() => onChange({ ...settings, mergeRaw: !settings.mergeRaw })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${settings.mergeRaw ? "bg-blue-500" : "bg-white/15"}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.mergeRaw ? "translate-x-5.5" : "translate-x-0.5"}`} />
                  </button>
                </div>
              </div>

              {/* Keybindings */}
              <div>
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">快捷键</h3>
                <div className="space-y-1">
                  {(Object.keys(KEY_LABELS) as (keyof typeof settings.keybindings)[]).map((action) => (
                    <div key={action} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5">
                      <span className="text-sm text-white/70">{KEY_LABELS[action]}</span>
                      <button
                        onKeyDown={(e) => recording === action && handleKeyRecord(action, e)}
                        onClick={() => setRecording(recording === action ? null : action)}
                        className={`min-w-[64px] text-center px-3 py-1 rounded-md text-sm font-mono transition-all ${
                          recording === action
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/50 outline-none"
                            : "bg-white/10 text-white/70 hover:bg-white/15"
                        }`}
                      >
                        {recording === action ? "按下键..." : formatKey(settings.keybindings[action])}
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-white/25 mt-2">点击按键区域后按下新的按键来修改</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
