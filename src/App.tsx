import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Download, Settings, Loader2, MousePointer2, RefreshCw, Search, X } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { MediaGrid } from "./components/MediaGrid";
import { PreviewModal } from "./components/PreviewModal";
import { VideoPreviewModal } from "./components/VideoPreviewModal";
import { SettingsModal } from "./components/SettingsModal";
import { groupMediaFiles } from "./lib/mediaUtils";
import { loadBookmarks, saveBookmarks, loadSettings, saveSettings } from "./lib/storage";
import type { Bookmark, FileInfo, MediaGroup, Settings as SettingsType } from "./types";
import "./index.css";

export default function App() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => loadBookmarks());
  const [activeBookmarkId, setActiveBookmarkId] = useState<string | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [groups, setGroups] = useState<MediaGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [settings, setSettings] = useState<SettingsType>(() => loadSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [videoPreviewIndex, setVideoPreviewIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const onTogglePickRef = useRef(handleTogglePick);

  useEffect(() => {
    setGroups(groupMediaFiles(files, settings.mergeRaw));
  }, [files, settings.mergeRaw]);

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedQuery(value), 200);
  }

  const filteredGroups = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return q ? groups.filter((g) => g.display.name.toLowerCase().includes(q)) : groups;
  }, [debouncedQuery, groups]);

  async function loadFolder(path: string) {
    setLoading(true);
    setPickedIds(new Set());
    setPreviewIndex(null);
    try {
      const result = await invoke<FileInfo[]>("scan_directory", { path });
      setFiles(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectBookmark(b: Bookmark) {
    setActiveBookmarkId(b.id);
    loadFolder(b.path);
  }

  function handleAddBookmark(b: Bookmark) {
    const next = [...bookmarks, b];
    setBookmarks(next);
    saveBookmarks(next);
    setActiveBookmarkId(b.id);
    loadFolder(b.path);
  }

  function handleDeleteBookmark(id: string) {
    const next = bookmarks.filter((b) => b.id !== id);
    setBookmarks(next);
    saveBookmarks(next);
    if (activeBookmarkId === id) {
      setActiveBookmarkId(null);
      setFiles([]);
    }
  }

  // Keep ref in sync
  onTogglePickRef.current = handleTogglePick;

  function handleTogglePick(id: string) {
    setPickedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSettingsChange(s: SettingsType) {
    setSettings(s);
    saveSettings(s);
  }

  async function handleExport() {
    if (pickedIds.size === 0) return;
    const targetDir = await open({ directory: true, multiple: false, title: "选择导出目录" });
    if (typeof targetDir !== "string") return;

    const filesToCopy: string[] = [];
    for (const group of groups) {
      if (!pickedIds.has(group.id)) continue;
      if (group.jpg) filesToCopy.push(group.jpg.path);
      if (group.raw) filesToCopy.push(group.raw.path);
    }

    try {
      const count = await invoke<number>("copy_files", { files: filesToCopy, targetDir });
      alert(`成功导出 ${count} 个文件`);
    } catch (e) {
      alert("导出失败: " + e);
    }
  }

  const handleGlobalKey = useCallback(
    (e: KeyboardEvent) => {
      if (showSettings) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key;
      // Space: open/close preview for hovered item
      if (key === settings.keybindings.preview) {
        e.preventDefault();
        if (previewIndex !== null) {
          setPreviewIndex(null);
        } else if (hoverIndex !== null) {
          setPreviewIndex(hoverIndex);
        } else if (groups.length > 0) {
          setPreviewIndex(0);
        }
      }
      // pick key: toggle pick for hovered item (grid mode)
      if (key.toLowerCase() === settings.keybindings.pick.toLowerCase() && hoverIndex !== null && previewIndex === null) {
        e.preventDefault();
        onTogglePickRef.current(groups[hoverIndex].id);
      }
    },
    [showSettings, settings.keybindings.preview, previewIndex, hoverIndex, groups]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, [handleGlobalKey]);

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: "#0a0a0a" }}>
      <Sidebar
        bookmarks={bookmarks}
        activeId={activeBookmarkId}
        onSelect={handleSelectBookmark}
        onAdd={handleAddBookmark}
        onDelete={handleDeleteBookmark}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-white/80">Quick Preview</span>
            {activeBookmarkId && (
              <>
                <span className="text-white/20">/</span>
                <span className="text-sm text-white/40 font-mono truncate max-w-xs">
                  {bookmarks.find((b) => b.id === activeBookmarkId)?.name}
                </span>
              </>
            )}
          </div>

            {/* Search */}
            <div className="relative flex items-center">
              <Search size={13} className="absolute left-2.5 text-white/30 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="搜索文件名..."
                className="pl-8 pr-7 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white/70 placeholder-white/20 focus:outline-none focus:border-white/20 w-48"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(""); setDebouncedQuery(""); }}
                  className="absolute right-2 text-white/30 hover:text-white/60"
                >
                  <X size={12} />
                </button>
              )}
            </div>

          <div className="flex items-center gap-2">
            {pickedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/50">
                  已选 <span className="text-blue-400 font-semibold">{pickedIds.size}</span> 张
                </span>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-400 text-white text-sm rounded-lg transition-colors"
                >
                  <Download size={13} />
                  导出
                </button>
              </div>
            )}
            <button
              onClick={() => activeBookmarkId && loadFolder(bookmarks.find(b => b.id === activeBookmarkId)!.path)}
              disabled={!activeBookmarkId || loading}
              title="刷新"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => setSelectionMode((v) => !v)}
              title="多选模式 (F键选中)"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
                selectionMode
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                  : "text-white/40 hover:text-white hover:bg-white/10"
              }`}
            >
              <MousePointer2 size={14} />
              <span className="text-xs">多选</span>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Settings size={15} />
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full text-white/30">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : (
            <MediaGrid
              groups={filteredGroups}
              pickedIds={pickedIds}
              onPreview={(idx) => {
                const g = filteredGroups[idx];
                if (g?.isVideo) setVideoPreviewIndex(idx);
                else setPreviewIndex(idx);
              }}
              onHoverIndex={setHoverIndex}
              selectionMode={selectionMode}
              onTogglePick={handleTogglePick}
            />
          )}
        </div>
      </div>

      <PreviewModal
        groups={filteredGroups}
        index={previewIndex}
        pickedIds={pickedIds}
        keybindings={settings.keybindings}
        onClose={() => setPreviewIndex(null)}
        onNext={() => setPreviewIndex((i) => (i !== null && i < groups.length - 1 ? i + 1 : i))}
        onPrev={() => setPreviewIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
        onTogglePick={handleTogglePick}
      />

      <VideoPreviewModal
        groups={filteredGroups}
        index={videoPreviewIndex}
        pickedIds={pickedIds}
        keybindings={settings.keybindings}
        onClose={() => setVideoPreviewIndex(null)}
        onNext={() => setVideoPreviewIndex((i) => (i !== null && i < filteredGroups.length - 1 ? i + 1 : i))}
        onPrev={() => setVideoPreviewIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
        onTogglePick={handleTogglePick}
      />

      <SettingsModal
        open={showSettings}
        settings={settings}
        onClose={() => setShowSettings(false)}
        onChange={handleSettingsChange}
      />
    </div>
  );
}
