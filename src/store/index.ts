import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { groupMediaFiles } from "../lib/mediaUtils";
import { loadBookmarks, saveBookmarks, loadSettings, saveSettings } from "../lib/storage";
import type { Bookmark, FileInfo, MediaGroup, Settings } from "../types";

interface AppState {
  // 文件
  files: FileInfo[];
  groups: MediaGroup[];
  loading: boolean;
  sortDesc: boolean;

  // 书签
  bookmarks: Bookmark[];
  activeBookmarkId: string | null;

  // 选片
  pickedIds: Set<string>;
  selectionMode: boolean;

  // 预览
  previewIndex: number | null;
  videoPreviewIndex: number | null;
  hoverIndex: number | null;

  // 搜索
  searchQuery: string;
  debouncedQuery: string;

  // 设置
  settings: Settings;
  showSettings: boolean;

  // ffmpeg
  ffmpegPath: string | null;

  // actions
  loadFolder: (path: string) => Promise<void>;
  refreshFolder: () => Promise<void>;
  setSortDesc: (v: boolean | ((prev: boolean) => boolean)) => void;

  selectBookmark: (b: Bookmark) => void;
  addBookmark: (b: Bookmark) => void;
  deleteBookmark: (id: string) => void;

  togglePick: (id: string) => void;
  clearPicks: () => void;
  setSelectionMode: (v: boolean | ((prev: boolean) => boolean)) => void;

  setPreviewIndex: (i: number | null | ((prev: number | null) => number | null)) => void;
  setVideoPreviewIndex: (i: number | null | ((prev: number | null) => number | null)) => void;
  setHoverIndex: (i: number | null) => void;

  setSearchQuery: (q: string) => void;
  setDebouncedQuery: (q: string) => void;

  updateSettings: (s: Settings) => void;
  setShowSettings: (v: boolean) => void;

  checkFfmpeg: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  files: [],
  groups: [],
  loading: false,
  sortDesc: true,

  bookmarks: loadBookmarks(),
  activeBookmarkId: null,

  pickedIds: new Set(),
  selectionMode: false,

  previewIndex: null,
  videoPreviewIndex: null,
  hoverIndex: null,

  searchQuery: "",
  debouncedQuery: "",

  settings: loadSettings(),
  showSettings: false,

  ffmpegPath: null,

  loadFolder: async (path) => {
    set({ loading: true, pickedIds: new Set(), previewIndex: null, files: [], groups: [] });
    try {
      const files = await invoke<FileInfo[]>("scan_directory", { path });
      const groups = groupMediaFiles(files, get().settings.mergeRaw);
      set({ files, groups });
    } catch (e) {
      console.error(e);
      alert("无法打开目录：" + e);
    } finally {
      set({ loading: false });
    }
  },

  refreshFolder: async () => {
    const { activeBookmarkId, bookmarks, loadFolder } = get();
    if (!activeBookmarkId) return;
    const b = bookmarks.find((b) => b.id === activeBookmarkId);
    if (b) await loadFolder(b.path);
  },

  setSortDesc: (v) =>
    set((s) => ({ sortDesc: typeof v === "function" ? v(s.sortDesc) : v })),

  selectBookmark: (b) => {
    set({ activeBookmarkId: b.id });
    get().loadFolder(b.path);
  },

  addBookmark: (b) => {
    const next = [...get().bookmarks, b];
    set({ bookmarks: next, activeBookmarkId: b.id });
    saveBookmarks(next);
    get().loadFolder(b.path);
  },

  deleteBookmark: (id) => {
    const next = get().bookmarks.filter((b) => b.id !== id);
    set({ bookmarks: next });
    saveBookmarks(next);
    if (get().activeBookmarkId === id) {
      set({ activeBookmarkId: null, files: [], groups: [] });
    }
  },

  togglePick: (id) =>
    set((s) => {
      const next = new Set(s.pickedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { pickedIds: next };
    }),

  clearPicks: () => set({ pickedIds: new Set() }),

  setSelectionMode: (v) =>
    set((s) => ({ selectionMode: typeof v === "function" ? v(s.selectionMode) : v })),

  setPreviewIndex: (i) =>
    set((s) => ({ previewIndex: typeof i === "function" ? i(s.previewIndex) : i })),

  setVideoPreviewIndex: (i) =>
    set((s) => ({ videoPreviewIndex: typeof i === "function" ? i(s.videoPreviewIndex) : i })),

  setHoverIndex: (i) => set({ hoverIndex: i }),

  setSearchQuery: (q) => set({ searchQuery: q }),
  setDebouncedQuery: (q) => set({ debouncedQuery: q }),

  updateSettings: (s) => {
    set({ settings: s });
    saveSettings(s);
    // mergeRaw 变了要重新分组
    const groups = groupMediaFiles(get().files, s.mergeRaw);
    set({ groups });
  },

  setShowSettings: (v) => set({ showSettings: v }),

  checkFfmpeg: async () => {
    try {
      const path = await invoke<string | null>("check_ffmpeg");
      set({ ffmpegPath: path ?? null });
    } catch {
      set({ ffmpegPath: null });
    }
  },
}));
