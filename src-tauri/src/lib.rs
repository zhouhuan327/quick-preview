use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;

#[derive(Serialize, Deserialize, Debug)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub modified: u64,
    pub is_directory: bool,
}

#[tauri::command]
async fn scan_directory(path: String) -> Result<Vec<FileInfo>, String> {
    let dir = Path::new(&path);
    if !dir.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    if !dir.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }

    let image_exts = [
        "jpg", "jpeg", "png", "gif", "webp", "heic", "heif",
        "arw", "cr2", "cr3", "nef", "orf", "raf", "dng", "rw2",
    ];

    let entries = fs::read_dir(dir).map_err(|e| e.to_string())?;
    let mut files: Vec<FileInfo> = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let metadata = entry.metadata().map_err(|e| e.to_string())?;
        let file_name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files
        if file_name.starts_with('.') {
            continue;
        }

        if metadata.is_file() {
            let ext = Path::new(&file_name)
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_lowercase();

            if !image_exts.contains(&ext.as_str()) {
                continue;
            }
        } else {
            continue; // skip directories in scan
        }

        let modified = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);

        files.push(FileInfo {
            path: entry.path().to_string_lossy().to_string(),
            name: file_name,
            size: metadata.len(),
            modified,
            is_directory: metadata.is_dir(),
        });
    }

    // Sort by name
    files.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    Ok(files)
}

#[tauri::command]
async fn copy_files(files: Vec<String>, target_dir: String) -> Result<u32, String> {
    let target = Path::new(&target_dir);
    if !target.exists() {
        fs::create_dir_all(target).map_err(|e| e.to_string())?;
    }

    let mut count = 0u32;
    for file_path in &files {
        let src = Path::new(file_path);
        if !src.exists() {
            continue;
        }
        let file_name = src.file_name().ok_or("Invalid file name")?;
        let dest = target.join(file_name);
        fs::copy(src, &dest).map_err(|e| format!("Failed to copy {:?}: {}", file_name, e))?;
        count += 1;
    }

    Ok(count)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![scan_directory, copy_files])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
