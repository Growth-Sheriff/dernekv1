// Device fingerprint commands - Cihaz bilgilerini toplama
use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::command;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemInfo {
    pub platform: String,
    pub os_version: String,
    pub app_version: String,
    pub hostname: Option<String>,
    pub username: Option<String>,
    pub cpu_info: Option<String>,
    pub ram_size: Option<String>,
    pub screen_resolution: Option<String>,
    pub mac_address: Option<String>,
    pub disk_serial: Option<String>,
}

// Not: get_device_id komutu sync.rs modülünde tanımlı
// Buradaki generate_device_id sadece internal helper olarak kullanılıyor

/// Device ID oluştur (hardware bilgilerinden)
fn generate_device_id() -> String {
    let mut components: Vec<String> = Vec::new();
    
    // MAC adresi
    if let Some(mac) = get_mac_address() {
        components.push(mac);
    }
    
    // Hostname
    if let Ok(hostname) = hostname::get() {
        components.push(hostname.to_string_lossy().to_string());
    }
    
    // Disk serial (platform specific)
    if let Some(serial) = get_disk_serial() {
        components.push(serial);
    }
    
    if components.is_empty() {
        // Fallback: UUID oluştur
        return format!("device_{}", Uuid::new_v4().to_string().replace("-", "")[..16].to_string());
    }
    
    // Hash oluştur
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    
    let mut hasher = DefaultHasher::new();
    for c in &components {
        c.hash(&mut hasher);
    }
    let hash = hasher.finish();
    
    format!("bader_{:016x}", hash)
}

/// Sistem bilgilerini al
#[command]
pub fn get_system_info() -> Result<SystemInfo, String> {
    let platform = std::env::consts::OS.to_string();
    
    let os_version = get_os_version().unwrap_or_else(|| "Unknown".to_string());
    let hostname = hostname::get().ok().map(|h| h.to_string_lossy().to_string());
    let username = whoami::username();
    
    let cpu_info = get_cpu_info();
    let ram_size = get_ram_size();
    let mac_address = get_mac_address();
    let disk_serial = get_disk_serial();
    
    Ok(SystemInfo {
        platform,
        os_version,
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        hostname,
        username: Some(username),
        cpu_info,
        ram_size,
        screen_resolution: None, // Frontend'den alınacak
        mac_address,
        disk_serial,
    })
}

/// OS sürümünü al
fn get_os_version() -> Option<String> {
    #[cfg(target_os = "macos")]
    {
        let output = Command::new("sw_vers")
            .arg("-productVersion")
            .output()
            .ok()?;
        let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
        return Some(format!("macOS {}", version));
    }
    
    #[cfg(target_os = "windows")]
    {
        let output = Command::new("cmd")
            .args(["/C", "ver"])
            .output()
            .ok()?;
        let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
        return Some(version);
    }
    
    #[cfg(target_os = "linux")]
    {
        if let Ok(content) = std::fs::read_to_string("/etc/os-release") {
            for line in content.lines() {
                if line.starts_with("PRETTY_NAME=") {
                    return Some(line.replace("PRETTY_NAME=", "").replace("\"", ""));
                }
            }
        }
        return Some("Linux".to_string());
    }
    
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    None
}

/// CPU bilgisini al
fn get_cpu_info() -> Option<String> {
    #[cfg(target_os = "macos")]
    {
        let output = Command::new("sysctl")
            .args(["-n", "machdep.cpu.brand_string"])
            .output()
            .ok()?;
        return Some(String::from_utf8_lossy(&output.stdout).trim().to_string());
    }
    
    #[cfg(target_os = "windows")]
    {
        let output = Command::new("wmic")
            .args(["cpu", "get", "name"])
            .output()
            .ok()?;
        let output_str = String::from_utf8_lossy(&output.stdout);
        let lines: Vec<&str> = output_str.lines().collect();
        if lines.len() > 1 {
            return Some(lines[1].trim().to_string());
        }
        return None;
    }
    
    #[cfg(target_os = "linux")]
    {
        if let Ok(content) = std::fs::read_to_string("/proc/cpuinfo") {
            for line in content.lines() {
                if line.starts_with("model name") {
                    if let Some(pos) = line.find(':') {
                        return Some(line[pos + 1..].trim().to_string());
                    }
                }
            }
        }
        return None;
    }
    
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    None
}

/// RAM boyutunu al
fn get_ram_size() -> Option<String> {
    #[cfg(target_os = "macos")]
    {
        let output = Command::new("sysctl")
            .args(["-n", "hw.memsize"])
            .output()
            .ok()?;
        let bytes: u64 = String::from_utf8_lossy(&output.stdout)
            .trim()
            .parse()
            .ok()?;
        let gb = bytes / (1024 * 1024 * 1024);
        return Some(format!("{} GB", gb));
    }
    
    #[cfg(target_os = "windows")]
    {
        let output = Command::new("wmic")
            .args(["computersystem", "get", "totalphysicalmemory"])
            .output()
            .ok()?;
        let output_str = String::from_utf8_lossy(&output.stdout);
        let lines: Vec<&str> = output_str.lines().collect();
        if lines.len() > 1 {
            if let Ok(bytes) = lines[1].trim().parse::<u64>() {
                let gb = bytes / (1024 * 1024 * 1024);
                return Some(format!("{} GB", gb));
            }
        }
        return None;
    }
    
    #[cfg(target_os = "linux")]
    {
        if let Ok(content) = std::fs::read_to_string("/proc/meminfo") {
            for line in content.lines() {
                if line.starts_with("MemTotal:") {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 2 {
                        if let Ok(kb) = parts[1].parse::<u64>() {
                            let gb = kb / (1024 * 1024);
                            return Some(format!("{} GB", gb));
                        }
                    }
                }
            }
        }
        return None;
    }
    
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    None
}

/// MAC adresini al (hash'lenmiş)
fn get_mac_address() -> Option<String> {
    #[cfg(target_os = "macos")]
    {
        let output = Command::new("ifconfig")
            .arg("en0")
            .output()
            .ok()?;
        let output_str = String::from_utf8_lossy(&output.stdout);
        for line in output_str.lines() {
            if line.contains("ether") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 2 {
                    // Hash the MAC address for privacy
                    return Some(hash_string(parts[1]));
                }
            }
        }
        return None;
    }
    
    #[cfg(target_os = "windows")]
    {
        let output = Command::new("getmac")
            .args(["/fo", "csv", "/nh"])
            .output()
            .ok()?;
        let output_str = String::from_utf8_lossy(&output.stdout);
        if let Some(line) = output_str.lines().next() {
            let parts: Vec<&str> = line.split(',').collect();
            if !parts.is_empty() {
                let mac = parts[0].replace("\"", "");
                if !mac.is_empty() && mac != "N/A" {
                    return Some(hash_string(&mac));
                }
            }
        }
        return None;
    }
    
    #[cfg(target_os = "linux")]
    {
        // Try common interface names
        for iface in &["eth0", "wlan0", "enp0s3", "ens33"] {
            let path = format!("/sys/class/net/{}/address", iface);
            if let Ok(mac) = std::fs::read_to_string(&path) {
                let mac = mac.trim();
                if !mac.is_empty() && mac != "00:00:00:00:00:00" {
                    return Some(hash_string(mac));
                }
            }
        }
        return None;
    }
    
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    None
}

/// Disk seri numarasını al (hash'lenmiş)
fn get_disk_serial() -> Option<String> {
    #[cfg(target_os = "macos")]
    {
        let output = Command::new("system_profiler")
            .args(["SPNVMeDataType", "-json"])
            .output()
            .ok()?;
        let output_str = String::from_utf8_lossy(&output.stdout);
        // Basit bir serial no arama
        if output_str.contains("serial_number") {
            // JSON parse etmek yerine basit bir hash döndür
            return Some(hash_string(&output_str[..100.min(output_str.len())]));
        }
        return None;
    }
    
    #[cfg(target_os = "windows")]
    {
        let output = Command::new("wmic")
            .args(["diskdrive", "get", "serialnumber"])
            .output()
            .ok()?;
        let output_str = String::from_utf8_lossy(&output.stdout);
        let lines: Vec<&str> = output_str.lines().collect();
        if lines.len() > 1 {
            let serial = lines[1].trim();
            if !serial.is_empty() {
                return Some(hash_string(serial));
            }
        }
        return None;
    }
    
    #[cfg(target_os = "linux")]
    {
        // Try to get disk serial
        let output = Command::new("lsblk")
            .args(["-o", "SERIAL", "-dn"])
            .output()
            .ok()?;
        let output_str = String::from_utf8_lossy(&output.stdout);
        let serial = output_str.trim();
        if !serial.is_empty() {
            return Some(hash_string(serial));
        }
        return None;
    }
    
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    None
}

/// String'i hash'le (privacy için)
fn hash_string(s: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    
    let mut hasher = DefaultHasher::new();
    s.hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}
