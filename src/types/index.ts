export interface FileInfo {
  name: string;
  path: string;
  size: number;
  modified: number;
  is_directory: boolean;
}

export interface MediaGroup {
  id: string;       // base name without extension
  jpg: FileInfo | null;
  raw: FileInfo | null;
  video: FileInfo | null;
  display: FileInfo; // the one shown in grid (jpg preferred)
  isVideo: boolean;
}

export interface Bookmark {
  id: string;
  name: string;
  path: string;
}

export interface Keybindings {
  preview: string;
  pick: string;
  next: string;
  prev: string;
  close: string;
}

export interface Settings {
  mergeRaw: boolean;
  keybindings: Keybindings;
}

export const DEFAULT_SETTINGS: Settings = {
  mergeRaw: true,
  keybindings: {
    preview: " ",
    pick: "f",
    next: "ArrowRight",
    prev: "ArrowLeft",
    close: "Escape",
  },
};
