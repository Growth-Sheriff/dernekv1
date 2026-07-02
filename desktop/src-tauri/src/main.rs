// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;
mod state;

use state::AppState;
use std::sync::Mutex;
use std::path::PathBuf;
use tauri::Manager;

fn main() {
    let app_state = AppState::new();

    tauri::Builder::default()
        //.plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .manage(app_state)
        .setup(|app| {
            println!("🚀 Setup hook started...");
            
            let setup_result = (|| -> Result<(), Box<dyn std::error::Error>> {
                let app_dir = app.path()
                    .app_data_dir()
                    .map_err(|e| format!("Failed to get app dir: {}", e))?;
                
                println!("📂 App Data Dir: {:?}", app_dir);

                if !app_dir.exists() {
                     println!("🛠️ Creating app directory...");
                     std::fs::create_dir_all(&app_dir)
                        .map_err(|e| format!("Failed to create app dir: {}", e))?;
                }
                
                let db_path = app_dir.join("bader.db");
                println!("💾 Database Path: {:?}", db_path);

                if let Some(parent) = db_path.parent() {
                    if !parent.exists() {
                        std::fs::create_dir_all(parent)
                             .map_err(|e| format!("Failed to create db parent dir: {}", e))?;
                    }
                }

                println!("🔌 Connecting to database...");
                // Havuz oluştur
                let pool = db::connection::establish_connection(db_path.clone());
                
                println!("🔗 Getting connection from pool...");
                // Bağlantı al (timeout riskine karşı loglu)
                let mut conn = pool.get()
                    .map_err(|e| format!("Failed to get DB connection: {}", e))?;
                
                println!("🏗️ Initializing database...");
                // init_database
                if let Err(e) = db::connection::init_database(&mut conn) {
                    eprintln!("❌ Database init warning: {:?}", e);
                    // Init hatası olsa bile devam etmeyi deneyebiliriz, belki tablolar vardır.
                }
                
                println!("🔄 Running migrations...");
                // run_migrations
                if let Err(e) = db::connection::run_migrations(&mut conn) {
                     eprintln!("❌ Migration warning: {:?}", e);
                }
                
                println!("✅ Saving state...");
                let state = app.state::<AppState>();
                *state.db.lock().unwrap() = Some(pool);
                *state.db_path.lock().unwrap() = Some(db_path);
                
                Ok(())
            })();

            match setup_result {
                Ok(_) => {
                    println!("✅ Setup completed successfully");
                    Ok(())
                },
                Err(e) => {
                    eprintln!("🔥 SETUP FAILED: {}", e);
                    Err(e.into())
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::database::get_db_path,
            commands::setup::check_initial_setup,
            commands::setup::reset_application,
            commands::license_validation::validate_license,
            commands::license_validation::validate_license_offline,
            commands::license_validation::update_license,
            // Login & State Management
            commands::login::login,
            commands::login::logout,
            commands::login::check_session,
            commands::login::change_password,
            state::get_current_user,
            state::get_current_tenant,
            state::get_license_info,
            state::get_app_config,
            state::update_app_config,
            state::check_permission,
            state::check_feature,
            // Tenant Yönetimi
            commands::tenant::create_tenant,
            commands::tenant::get_tenant,
            commands::tenant::update_tenant,
            commands::tenant::list_tenants,
            commands::tenant::check_slug_available,
            // Üyeler
            commands::uyeler::get_uyeler,
            commands::uyeler::get_uye_by_id,
            commands::uyeler::create_uye,
            commands::uyeler::update_uye,
            commands::uyeler::delete_uye,
            commands::uyeler::count_uyeler,
            // Aile Üyeleri - YENİ!
            commands::aile_uyeleri::get_aile_uyeleri,
            commands::aile_uyeleri::create_aile_uyesi,
            commands::aile_uyeleri::update_aile_uyesi,
            commands::aile_uyeleri::delete_aile_uyesi,
            // Aidat
            commands::aidat::get_aidat_takip,
            commands::aidat::get_all_aidat,
            commands::aidat::check_aidat_gelir_tutarliligi,
            commands::aidat::get_aidat_takip_with_uye,  // YENİ - üye bilgisiyle
            commands::aidat::create_aidat,
            commands::aidat::hesapla_gecikme,
            commands::aidat::get_aidat_ozet,
            commands::aidat::toplu_aidat_onizleme,  // YENİ - Önizleme ile UX iyileştirmesi
            commands::aidat::toplu_aidat_olustur,
            commands::aidat::toplu_aidat_kisi_bazli,  // YENİ - Kişi bazlı toplu aidat
            commands::aidat::get_uye_aidat_borclari,  // YENİ - Üye borç detayı
            commands::aidat::ozel_tutar_borclandir,  // YENİ - Seçili üyelere özel tutar
            commands::aidat::coklu_donem_tahsilat,  // YENİ - Çoklu dönem tahsilatı
            commands::aidat::coklu_yil_odeme,
            commands::aidat::kaydet_aidat_odeme_with_gelir,
            commands::aidat::add_aidat_odeme_with_gelir,  // RECOMMENDED - Full integration (kasa + gelir + aidat)
            // Aidat - YENİ EKSİK FONKSİYONLAR!
            commands::aidat::get_aidat_odemeleri,
            commands::aidat::update_aidat_odeme,
            commands::aidat::delete_aidat_odeme,
            commands::aidat::update_aidat_tanimlama,
            commands::aidat::delete_aidat_tanimlama,
            commands::aidat::get_uye_borc_durumlari,  // Üye borç durumları
            commands::aidat::delete_aidat_borclandirma,  // YENİ - Tek aidat borçlandırma iptal
            commands::aidat::toplu_aidat_iptal,  // YENİ - Toplu borçlandırma geri alma
            // Mali - Kasalar
            commands::mali::get_kasalar,
            commands::mali::create_kasa,
            commands::mali::update_kasa,  // YENİ!
            commands::mali::delete_kasa,  // YENİ!
            // Mali - Gelir Türleri
            commands::gelir_turleri::get_gelir_turleri,  // YENİ MODÜL!
            commands::gelir_turleri::create_gelir_turu,
            commands::gelir_turleri::update_gelir_turu,
            commands::gelir_turleri::delete_gelir_turu,
            // Mali - Gelirler
            commands::mali::get_gelirler,
            commands::mali::get_uyeye_ait_gelirler,  // UX İYİLEŞTİRME!
            commands::mali::create_gelir,
            commands::mali::update_gelir,  // YENİ!
            commands::mali::delete_gelir,  // YENİ!
            // Mali - Gider Türleri
            commands::gider_turleri::get_gider_turleri,  // YENİ MODÜL!
            commands::gider_turleri::create_gider_turu,
            commands::gider_turleri::update_gider_turu,
            commands::gider_turleri::delete_gider_turu,
            // Mali - Giderler
            commands::mali::get_giderler,
            commands::mali::get_giderler_paginated,
            commands::mali::create_gider,
            commands::mali::update_gider,  // YENİ!
            commands::mali::delete_gider,  // YENİ!
            // Mali - Virmanlar
            commands::mali::virman_yap,
            commands::mali::get_virmanlar,
            commands::mali::delete_virman,  // YENİ!
            commands::mali::get_devir_onizleme,
            commands::mali::uygula_yil_sonu_devir,
            commands::mali::get_kasa_ozet,
            // Sync
            commands::sync::get_sync_status,
            commands::sync::get_pending_changes,
            commands::sync::push_changes,
            commands::sync::pull_changes,
            commands::sync::manual_sync,
            commands::sync::get_pending_sync_count,
            commands::sync::get_pending_sync_changes,
            commands::sync::mark_changes_synced,
            commands::sync::queue_sync_change,
            commands::sync::apply_sync_changes,
            commands::sync::get_device_id,
            // Device Fingerprint
            commands::device::get_system_info,
            // User Management
            commands::users::get_users,
            commands::users::get_user,
            commands::users::create_user,
            commands::users::update_user,
            commands::users::delete_user,
            commands::users::activate_user,
            commands::kullanici::admin_change_user_password,
            commands::kullanici::count_users_by_role,
            // Export
            commands::export::export_uyeler_csv,
            commands::export::export_aidat_raporu_csv,
            commands::export::export_mali_raporu_csv,
            // Export Excel - YENİ!
            commands::export::export_kasalar_excel,
            commands::export::export_gelirler_excel,
            commands::export::export_giderler_excel,
            commands::export::export_uyeler_excel,
            commands::export::export_demirbaslar_excel,
            // Etkinlikler
            commands::etkinlikler::get_etkinlikler,
            commands::etkinlikler::get_etkinlik_mali_ozet,
            commands::etkinlikler::get_etkinlik,  // YENİ!
            commands::etkinlikler::create_etkinlik,
            commands::etkinlikler::update_etkinlik,
            commands::etkinlikler::delete_etkinlik,
            // Toplantılar
            commands::toplantilar::get_toplantilar,
            commands::toplantilar::get_toplanti,  // YENİ!
            commands::toplantilar::create_toplanti,
            commands::toplantilar::update_toplanti,
            commands::toplantilar::delete_toplanti,
            // Bütçe
            commands::butce::get_butce,
            commands::butce::get_butceler,  // YENİ!
            commands::butce::create_butce,
            commands::butce::update_butce,
            commands::butce::delete_butce,
            commands::butce::update_butce_gerceklesen,  // YENİ!
            // Köy Modülü
            commands::koy::get_koy_kasalar,
            commands::koy::create_koy_kasa,
            commands::koy::update_koy_kasa,
            commands::koy::delete_koy_kasa,
            commands::koy::get_koy_gelirler,
            commands::koy::create_koy_gelir,
            commands::koy::update_koy_gelir,  // YENİ!
            commands::koy::delete_koy_gelir,
            commands::koy::get_koy_giderler,
            commands::koy::create_koy_gider,
            commands::koy::update_koy_gider,  // YENİ!
            commands::koy::delete_koy_gider,
            commands::koy::get_koy_virmanlar,  // YENİ!
            commands::koy::create_koy_virman,  // YENİ!
            commands::koy::delete_koy_virman,  // YENİ!
            // Belgeler
            commands::belgeler::get_belgeler,
            commands::belgeler::create_belge,
            commands::belgeler::update_belge,
            commands::belgeler::download_belge,
            commands::belgeler::delete_belge,
            // Yedekleme
            commands::yedekleme::create_backup,
            commands::yedekleme::restore_backup,
            commands::yedekleme::list_backups,
            commands::yedekleme::delete_backup,
            // Dashboard
            commands::dashboard::get_dashboard_stats,
            commands::dashboard::get_uye_stats,
            commands::dashboard::get_aidat_stats,
            commands::dashboard::get_kasa_stats,
            // Demirbaşlar
            commands::demirbaslar::get_demirbaslar,
            commands::demirbaslar::get_demirbas,
            commands::demirbaslar::create_demirbas,
            commands::demirbaslar::update_demirbas,
            commands::demirbaslar::delete_demirbas,
            commands::demirbaslar::activate_demirbas,
            commands::demirbaslar::get_demirbas_ozet,
            commands::demirbaslar::toplu_demirbas_olustur,  // YENİ - toplu giriş
            // Vadeli İşlemler
            commands::vadeli_islemler::get_vadeli_islemler,
            commands::vadeli_islemler::create_vadeli_islem,
            commands::vadeli_islemler::gerceklestir_vadeli_islem,
            commands::vadeli_islemler::iptal_vadeli_islem,
            commands::vadeli_islemler::get_yaklasan_vadeler,
            commands::vadeli_islemler::get_vadeli_ozet,
            // Cariler
            commands::cariler::get_cariler,
            commands::cariler::get_cari,
            commands::cariler::create_cari,
            commands::cariler::update_cari,
            commands::cariler::delete_cari,
            commands::cariler::activate_cari,
            commands::cariler::get_cari_hareketler,
            commands::cariler::create_cari_hareket,
            commands::cariler::odeme_kaydet_cari,
            commands::cariler::get_cari_ekstre,
            commands::cariler::get_cari_ozet,
            // Aidat Tanımları
            commands::aidat_tanimlari::get_aidat_tanimlari,
            commands::aidat_tanimlari::get_aidat_tanimi_by_yil,
            commands::aidat_tanimlari::get_aidat_tanimi_by_yil_uye_turu,
            commands::aidat_tanimlari::set_aidat_tanimi,
            commands::aidat_tanimlari::delete_aidat_tanimi,
            // Kur Yönetimi
            commands::kur::get_kurlar,
            commands::kur::get_guncel_kurlar,
            commands::kur::get_kur_by_tarih,
            commands::kur::hesapla_kur,
            commands::kur::set_kur,
            commands::kur::delete_kur,
            commands::kur::get_kur_gecmisi,
            // Görünüm Tercihleri (Sütun Özelleştirme)
            commands::gorunum::save_column_preferences,
            commands::gorunum::get_column_preferences,
            commands::gorunum::reset_column_preferences,
            commands::gorunum::get_all_column_preferences,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
