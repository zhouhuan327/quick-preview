import type { FileInfo, MediaGroup } from "../types";

const RAW_EXTS = new Set(["arw", "cr2", "cr3", "nef", "orf", "raf", "dng", "rw2"]);
const IMG_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "heic", "heif"]);

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

export function groupMediaFiles(files: FileInfo[], mergeRaw: boolean): MediaGroup[] {
  if (!mergeRaw) {
    return files
      .filter((f) => isImage(f.name))
      .map((f) => ({
        id: f.path,
        jpg: f,
        raw: null,
        display: f,
      }));
  }

  const map = new Map<string, { jpg: FileInfo | null; raw: FileInfo | null }>();

  for (const f of files) {
    const base = getBaseName(f.name);
    if (!map.has(base)) map.set(base, { jpg: null, raw: null });
    const group = map.get(base)!;
    if (isImage(f.name)) group.jpg = f;
    else if (isRaw(f.name)) group.raw = f;
  }

  const groups: MediaGroup[] = [];
  for (const [base, { jpg, raw }] of map) {
    if (!jpg && !raw) continue;
    const display = jpg ?? raw!;
    if (!isImage(display.name) && !raw) continue; // skip pure raw with no jpg? still show
    groups.push({ id: base, jpg, raw, display });
  }

  // Sort by display file name
  groups.sort((a, b) => a.display.name.toLowerCase().localeCompare(b.display.name.toLowerCase()));

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
