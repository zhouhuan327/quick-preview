use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process::Command;
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
        "mp4", "mov", "avi", "mkv", "webm", "m4v",
    ];

    let entries = fs::read_dir(dir).map_err(|e| e.to_string())?;
    let mut files: Vec<FileInfo> = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let metadata = entry.metadata().map_err(|e| e.to_string())?;
        let file_name = entry.file_name().to_string_lossy().to_string();

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
            continue;
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

#[tauri::command]
async fn check_ffmpeg() -> Option<String> {
    // 先找常见绝对路径（Tauri 运行时 PATH 可能不含 Homebrew）
    let candidates = [
        "/opt/homebrew/bin/ffmpeg",
        "/usr/local/bin/ffmpeg",
        "/usr/bin/ffmpeg",
    ];
    for path in &candidates {
        if Path::new(path).exists() {
            return Some(path.to_string());
        }
    }
    // fallback: which
    let output = Command::new("which").arg("ffmpeg").output().ok()?;
    if output.status.success() {
        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !path.is_empty() { Some(path) } else { None }
    } else {
        None
    }
}

#[tauri::command]
async fn get_video_thumbnail(video_path: String, modified: u64) -> Result<String, String> {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    let mut hasher = DefaultHasher::new();
    video_path.hash(&mut hasher);
    modified.hash(&mut hasher);
    let hash = hasher.finish();

    let home = std::env::var("HOME").map_err(|e| e.to_string())?;
    let cache_dir = Path::new(&home).join(".cache").join("quick-preview").join("thumbs");
    fs::create_dir_all(&cache_dir).map_err(|e| e.to_string())?;

    let thumb_path = cache_dir.join(format!("{}.jpg", hash));

    if thumb_path.exists() {
        return Ok(thumb_path.to_string_lossy().to_string());
    }

    let output = Command::new("/opt/homebrew/bin/ffmpeg")
        .args([
            "-y", "-i", &video_path,
            "-ss", "0.5", "-vframes", "1",
            "-vf", "scale=320:-1", "-q:v", "3",
            thumb_path.to_str().unwrap(),
        ])
        .output()
        .map_err(|e| format!("ffmpeg exec error: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ffmpeg failed: {}", stderr));
    }

    Ok(thumb_path.to_string_lossy().to_string())
}

#[tauri::command]
async fn get_video_duration(video_path: String) -> Result<f64, String> {
    let output = Command::new("/opt/homebrew/bin/ffprobe")
        .args([
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "csv=p=0",
            &video_path,
        ])
        .output()
        .map_err(|e| format!("ffprobe exec error: {}", e))?;

    if !output.status.success() {
        return Err("ffprobe failed".to_string());
    }

    let s = String::from_utf8_lossy(&output.stdout).trim().to_string();
    s.parse::<f64>().map_err(|e| format!("parse duration error: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            scan_directory,
            copy_files,
            check_ffmpeg,
            get_video_thumbnail,
            get_video_duration,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
