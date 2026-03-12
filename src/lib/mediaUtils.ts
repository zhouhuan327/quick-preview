import type { FileInfo, MediaGroup } from "../types";

const RAW_EXTS = new Set(["arw", "cr2", "cr3", "nef", "orf", "raf", "dng", "rw2"]);
const IMG_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "heic", "heif"]);
const VID_EXTS = new Set(["mp4", "mov", "avi", "mkv", "webm", "m4v"]);

function getExt(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function getBaseName(name: string): string {
  const parts = name.split(".");
  if (parts.length > 1) parts.pop();
  return parts.join(".").toLowerCase();
}

export function isRaw(name: string): boolean {
  return RAW_EXTS.has(getExt(name));
}

export function isImage(name: string): boolean {
  return IMG_EXTS.has(getExt(name));
}

export function isVideo(name: string): boolean {
  return VID_EXTS.has(getExt(name));
}

export function groupMediaFiles(files: FileInfo[], mergeRaw: boolean): MediaGroup[] {
  if (!mergeRaw) {
    return files
      .filter((f) => isImage(f.name) || isVideo(f.name))
      .map((f) => ({
        id: f.path,
        jpg: isImage(f.name) ? f : null,
        raw: null,
        video: isVideo(f.name) ? f : null,
        display: f,
        isVideo: isVideo(f.name),
      }));
  }

  const map = new Map<string, { jpg: FileInfo | null; raw: FileInfo | null; video: FileInfo | null }>();

  for (const f of files) {
    const base = getBaseName(f.name);
    if (!map.has(base)) map.set(base, { jpg: null, raw: null, video: null });
    const group = map.get(base)!;
    if (isImage(f.name)) group.jpg = f;
    else if (isRaw(f.name)) group.raw = f;
    else if (isVideo(f.name)) group.video = f;
  }

  const groups: MediaGroup[] = [];
  for (const [base, { jpg, raw, video }] of map) {
    if (!jpg && !raw && !video) continue;
    const display = jpg ?? raw ?? video!;
    const vidOnly = !jpg && !raw && !!video;
    const imgOrRaw = !!(jpg || raw);
    if (!imgOrRaw && !vidOnly) continue;
    groups.push({ id: base, jpg, raw, video, display, isVideo: !jpg && !raw && !!video });
  }

  // Sort by modified time (ascending, caller can reverse for desc)
  groups.sort((a, b) => a.display.modified - b.display.modified);

  return groups;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDate(ms: number): string {
  if (!ms) return "";
  return new Date(ms).toLocaleString();
}
