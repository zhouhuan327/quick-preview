import type { Bookmark, Settings } from "../types";
import { DEFAULT_SETTINGS } from "../types";

const BOOKMARKS_KEY = "qp_bookmarks";
const SETTINGS_KEY = "qp_settings";

export function loadBookmarks(): Bookmark[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveBookmarks(bookmarks: Bookmark[]): void {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
