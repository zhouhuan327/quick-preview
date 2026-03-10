import { open } from "@tauri-apps/plugin-dialog";
import { Bookmark as BookmarkIcon, FolderOpen, Plus, Trash2 } from "lucide-react";
import type { Bookmark } from "../types";

interface Props {
  bookmarks: Bookmark[];
  activeId: string | null;
  onSelect: (b: Bookmark) => void;
  onAdd: (b: Bookmark) => void;
  onDelete: (id: string) => void;
}

export function Sidebar({ bookmarks, activeId, onSelect, onAdd, onDelete }: Props) {
  async function handlePickFolder() {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") {
      onAdd({
        id: crypto.randomUUID(),
        name: selected.split("/").pop() ?? selected,
        path: selected,
      });
    }
  }

  return (
    <div
      className="flex flex-col h-full border-r border-white/5"
      style={{ width: "var(--sidebar-width)", minWidth: "var(--sidebar-width)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">文件夹</span>
        <button
          onClick={handlePickFolder}
          className="w-6 h-6 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Bookmark list */}
      <div className="flex-1 overflow-y-auto py-2 px-2">
        {bookmarks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-white/20 gap-2">
            <FolderOpen size={24} />
            <span className="text-xs">点击 + 添加文件夹</span>
          </div>
        )}
        {bookmarks.map((b) => (
          <div
            key={b.id}
            onClick={() => onSelect(b)}
            className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors mb-0.5 ${
              activeId === b.id
                ? "bg-white/10 text-white"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            <BookmarkIcon size={13} className="shrink-0 opacity-60" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{b.name}</div>
              <div className="text-[10px] text-white/30 truncate font-mono">{b.path}</div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(b.id); }}
              className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-white/30 hover:text-red-400 transition-all"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
