// Validation Helper Functions
use regex::Regex;

/// Email validasyonu
pub fn validate_email(email: &str) -> Result<(), String> {
    if email.is_empty() {
        return Err("Email boş olamaz".to_string());
    }

    let email_regex = Regex::new(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
        .map_err(|_| "Email regex error")?;

    if !email_regex.is_match(email) {
        return Err("Geçersiz email formatı".to_string());
    }

    Ok(())
}

/// TC Kimlik No validasyonu (11 haneli, algoritma kontrolü)
pub fn validate_tc_no(tc: &str) -> Result<(), String> {
    // Boş kontrol
    if tc.is_empty() {
        return Err("TC Kimlik No boş olamaz".to_string());
    }

    // 11 karakter kontrolü
    if tc.len() != 11 {
        return Err("TC Kimlik No 11 haneli olmalıdır".to_string());
    }

    // Sadece rakam kontrolü
    if !tc.chars().all(|c| c.is_numeric()) {
        return Err("TC Kimlik No sadece rakam içermelidir".to_string());
    }

    // İlk hane 0 olamaz
    if tc.starts_with('0') {
        return Err("TC Kimlik No 0 ile başlayamaz".to_string());
    }

    // Algoritma kontrolü
    let digits: Vec<u32> = tc.chars()
        .filter_map(|c| c.to_digit(10))
        .collect();

    if digits.len() != 11 {
        return Err("TC Kimlik No geçersiz".to_string());
    }

    // 10. hane kontrolü (1,3,5,7,9 hanelerin toplamı * 7 - 2,4,6,8 hanelerin toplamı) mod 10
    let sum_odd: u32 = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
    let sum_even: u32 = digits[1] + digits[3] + digits[5] + digits[7];
    let check_10 = ((sum_odd * 7).wrapping_sub(sum_even)) % 10;

    if check_10 != digits[9] {
        return Err("TC Kimlik No geçersiz (10. hane)".to_string());
    }

    // 11. hane kontrolü (ilk 10 hanenin toplamı mod 10)
    let sum_all: u32 = digits[..10].iter().sum();
    let check_11 = sum_all % 10;

    if check_11 != digits[10] {
        return Err("TC Kimlik No geçersiz (11. hane)".to_string());
    }

    Ok(())
}

/// Telefon validasyonu (Türkiye formatı)
pub fn validate_phone(phone: &str) -> Result<(), String> {
    if phone.is_empty() {
        return Err("Telefon boş olamaz".to_string());
    }

    // Sadece rakam ve + kontrolü
    let clean_phone: String = phone.chars()
        .filter(|c| c.is_numeric() || *c == '+')
        .collect();

    // 10-13 karakter arası (0532, +90532, 532)
    if clean_phone.len() < 10 || clean_phone.len() > 13 {
        return Err("Telefon numarası 10-13 karakter olmalıdır".to_string());
    }

    Ok(())
}

/// Tarih formatı validasyonu (YYYY-MM-DD veya DD.MM.YYYY)
pub fn validate_date_format(date: &str) -> Result<(), String> {
    if date.is_empty() {
        return Err("Tarih boş olamaz".to_string());
    }

    // YYYY-MM-DD formatı
    let iso_regex = Regex::new(r"^\d{4}-\d{2}-\d{2}$")
        .map_err(|_| "Date regex error")?;

    // DD.MM.YYYY formatı
    let tr_regex = Regex::new(r"^\d{2}\.\d{2}\.\d{4}$")
        .map_err(|_| "Date regex error")?;

    if !iso_regex.is_match(date) && !tr_regex.is_match(date) {
        return Err("Geçersiz tarih formatı (YYYY-MM-DD veya DD.MM.YYYY)".to_string());
    }

    Ok(())
}

/// Tutar validasyonu (pozitif sayı)
pub fn validate_amount(amount: f64, field_name: &str) -> Result<(), String> {
    if amount < 0.0 {
        return Err(format!("{} negatif olamaz", field_name));
    }

    if amount > 999999999.99 {
        return Err(format!("{} çok büyük (max: 999,999,999.99)", field_name));
    }

    Ok(())
}

/// String uzunluk validasyonu
pub fn validate_length(text: &str, field_name: &str, min: usize, max: usize) -> Result<(), String> {
    let len = text.len();

    if len < min {
        return Err(format!("{} en az {} karakter olmalıdır", field_name, min));
    }

    if len > max {
        return Err(format!("{} en fazla {} karakter olmalıdır", field_name, max));
    }

    Ok(())
}

/// IBAN validasyonu
pub fn validate_iban(iban: &str) -> Result<(), String> {
    if iban.is_empty() {
        return Err("IBAN boş olamaz".to_string());
    }

    // Sadece harf ve rakam
    let clean_iban: String = iban.chars()
        .filter(|c| c.is_alphanumeric())
        .collect();

    // TR IBAN 26 karakter
    if clean_iban.len() != 26 || !clean_iban.starts_with("TR") {
        return Err("Geçersiz TR IBAN formatı (26 karakter, TR ile başlamalı)".to_string());
    }

    Ok(())
}

/// Şifre güvenlik validasyonu
pub fn validate_password_strength(password: &str) -> Result<(), String> {
    if password.len() < 8 {
        return Err("Şifre en az 8 karakter olmalıdır".to_string());
    }

    if !password.chars().any(|c| c.is_uppercase()) {
        return Err("Şifre en az 1 büyük harf içermelidir".to_string());
    }

    if !password.chars().any(|c| c.is_lowercase()) {
        return Err("Şifre en az 1 küçük harf içermelidir".to_string());
    }

    if !password.chars().any(|c| c.is_numeric()) {
        return Err("Şifre en az 1 rakam içermelidir".to_string());
    }

    Ok(())
}

/// URL validasyonu
pub fn validate_url(url: &str) -> Result<(), String> {
    if url.is_empty() {
        return Err("URL boş olamaz".to_string());
    }

    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("URL http:// veya https:// ile başlamalıdır".to_string());
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_email_validation() {
        assert!(validate_email("test@example.com").is_ok());
        assert!(validate_email("invalid-email").is_err());
        assert!(validate_email("").is_err());
    }

    #[test]
    fn test_phone_validation() {
        assert!(validate_phone("05551234567").is_ok());
        assert!(validate_phone("+905551234567").is_ok());
        assert!(validate_phone("123").is_err());
    }

    #[test]
    fn test_amount_validation() {
        assert!(validate_amount(100.0, "Tutar").is_ok());
        assert!(validate_amount(-10.0, "Tutar").is_err());
        assert!(validate_amount(1000000000.0, "Tutar").is_err());
    }

    #[test]
    fn test_password_strength() {
        assert!(validate_password_strength("Abc12345").is_ok());
        assert!(validate_password_strength("weak").is_err());
        assert!(validate_password_strength("NOLOWER123").is_err());
    }
}
