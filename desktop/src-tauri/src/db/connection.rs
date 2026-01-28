use diesel::prelude::*;
use diesel::r2d2::{self, ConnectionManager};
use std::path::PathBuf;
use std::fs;

pub type Pool = r2d2::Pool<ConnectionManager<SqliteConnection>>;
pub type DbConnection = r2d2::PooledConnection<ConnectionManager<SqliteConnection>>;

/// Database connection pool oluştur
pub fn establish_connection(db_path: PathBuf) -> Pool {
    let db_url = db_path.to_str().expect("Invalid database path");
    let manager = ConnectionManager::<SqliteConnection>::new(db_url);
    
    r2d2::Pool::builder()
        .max_size(5)
        .build(manager)
        .expect("Failed to create database pool")
}

/// Veritabanını başlat - schema.sql'den tüm tabloları oluştur
pub fn init_database(conn: &mut SqliteConnection) -> QueryResult<()> {
    use std::fs;
    use std::path::Path;
    
    // Migration tracking tablosu oluştur
    diesel::sql_query(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        )"
    ).execute(conn)?;
    
    println!("✅ Migration tracking table ready");
    
    // schema.sql dosyasını oku ve çalıştır
    let schema_path = Path::new("schema.sql");
    if schema_path.exists() {
        let schema_sql = fs::read_to_string(schema_path)
            .map_err(|_| diesel::result::Error::NotFound)?;
        
        // Comment satırlarını kaldır ve SQL ifadelerini çalıştır
        let sql_lines: Vec<&str> = schema_sql
            .lines()
            .filter(|line| {
                let trimmed = line.trim();
                !trimmed.is_empty() && !trimmed.starts_with("--")
            })
            .collect();
        
        let cleaned_sql = sql_lines.join(" ");
        
        for statement in cleaned_sql.split(';') {
            let trimmed = statement.trim();
            if !trimmed.is_empty() {
                match diesel::sql_query(trimmed).execute(conn) {
                    Ok(_) => {
                        // CREATE TABLE statements için başarı mesajı
                        if trimmed.to_uppercase().contains("CREATE TABLE") {
                            if let Some(table_name) = trimmed.split_whitespace()
                                .skip_while(|w| !w.eq_ignore_ascii_case("TABLE"))
                                .nth(1)
                                .and_then(|s| s.split('(').next())
                            {
                                println!("  ✓ Table: {}", table_name.replace("IF", "").trim());
                            }
                        }
                    }
                    Err(e) => {
                        let error_msg = format!("{:?}", e);
                        // "table already exists" hataları OK
                        if error_msg.contains("already exists") {
                            continue;
                        }
                        eprintln!("  ⚠ Schema error: {:?}", e);
                        // Schema hataları kritik değil, devam et
                    }
                }
            }
        }
        println!("✅ Schema loaded from schema.sql");
    } else {
        println!("⚠️  schema.sql not found, skipping initial schema");
    }

    // FALLBACK: Ana tabloları manuel oluştur (Dosya okuma başarısız olursa diye - özellikle macOS App Bundle içinde)
    let core_tables = vec![
        "CREATE TABLE IF NOT EXISTS tenants (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            slug TEXT NOT NULL UNIQUE,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        "CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY NOT NULL,
            tenant_id TEXT NOT NULL,
            username TEXT NOT NULL,
            email TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'USER',
            phone TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        )",
        "CREATE TABLE IF NOT EXISTS licenses (
            id TEXT PRIMARY KEY NOT NULL,
            license_key TEXT NOT NULL UNIQUE,
            tenant_id TEXT,
            plan TEXT NOT NULL DEFAULT 'STANDARD',
            mode TEXT DEFAULT 'local',
            is_active INTEGER NOT NULL DEFAULT 0,
            starts_at TEXT,
            expires_at TEXT,
            expiry_date TEXT,
            desktop_enabled INTEGER DEFAULT 1,
            web_enabled INTEGER DEFAULT 0,
            mobile_enabled INTEGER DEFAULT 0,
            sync_enabled INTEGER DEFAULT 0,
            max_users INTEGER DEFAULT 5,
            max_records INTEGER DEFAULT 1000,
            features TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        )",
        "CREATE TABLE IF NOT EXISTS kasalar (
             id TEXT PRIMARY KEY NOT NULL,
             tenant_id TEXT NOT NULL,
             kasa_adi TEXT NOT NULL,
             bakiye REAL NOT NULL DEFAULT 0,
             para_birimi TEXT NOT NULL DEFAULT 'TRY',
             fiziksel_bakiye REAL DEFAULT 0,
             serbest_bakiye REAL DEFAULT 0,
             is_active INTEGER DEFAULT 1,
             created_at TEXT NOT NULL,
             updated_at TEXT NOT NULL,
             FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        )",
        "CREATE TABLE IF NOT EXISTS gelir_turleri (
            id TEXT PRIMARY KEY NOT NULL,
            tenant_id TEXT NOT NULL,
            ad TEXT NOT NULL,
            kod TEXT NOT NULL,
            aciklama TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        )",
        "CREATE TABLE IF NOT EXISTS gider_turleri (
            id TEXT PRIMARY KEY NOT NULL,
            tenant_id TEXT NOT NULL,
            ad TEXT NOT NULL,
            kod TEXT NOT NULL,
            aciklama TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        )"
    ];

    println!("🛠️ Running fallback table creation...");
    for sql in core_tables {
        if let Err(e) = diesel::sql_query(sql).execute(conn) {
             eprintln!("  ⚠ Fallback table creation warning: {:?}", e);
        }
    }
    
    Ok(())
}

pub fn run_migrations(conn: &mut SqliteConnection) -> QueryResult<()> {
    use std::fs;
    use std::path::Path;
    use diesel::QueryableByName;
    
    #[derive(QueryableByName)]
    struct MigrationVersion {
        #[diesel(sql_type = diesel::sql_types::Text)]
        version: String,
    }
    
    // Migration tracking table
    diesel::sql_query(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version TEXT PRIMARY KEY,
            applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )"
    ).execute(conn)?;

    // Migration dosyalarının yolu
    let migrations_dir = Path::new("migrations");
    
    if !migrations_dir.exists() {
        println!("Migrations directory not found, skipping migrations");
        return Ok(());
    }

    // Migration dosyalarını oku
    let mut migration_files: Vec<_> = fs::read_dir(migrations_dir)
        .map_err(|_| diesel::result::Error::NotFound)?
        .filter_map(|entry| {
            entry.ok().and_then(|e| {
                let path = e.path();
                if path.extension().and_then(|s| s.to_str()) == Some("sql") {
                    Some(path)
                } else {
                    None
                }
            })
        })
        .collect();

    migration_files.sort();

    for migration_file in migration_files {
        let filename = migration_file
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("");
        
        // Bu migration daha önce uygulandı mı kontrol et
        let applied: Result<MigrationVersion, _> = diesel::sql_query(
            "SELECT version FROM schema_migrations WHERE version = ?1"
        )
        .bind::<diesel::sql_types::Text, _>(filename)
        .get_result::<MigrationVersion>(conn);

        if applied.is_ok() {
            println!("Migration {} already applied, skipping", filename);
            continue;
        }

        // Migration dosyasını oku ve çalıştır
        let sql_content = fs::read_to_string(&migration_file)
            .map_err(|_| diesel::result::Error::NotFound)?;

        println!("Running migration: {}", filename);

        // Comment satırlarını ve boş satırları kaldır
        let sql_lines: Vec<&str> = sql_content
            .lines()
            .filter(|line| {
                let trimmed = line.trim();
                !trimmed.is_empty() && !trimmed.starts_with("--")
            })
            .collect();

        let cleaned_sql = sql_lines.join(" ");

        // Transaction içinde migration çalıştır
        let migration_result: Result<(), diesel::result::Error> = conn.transaction(|conn| {
            // SQL ifadelerini çalıştır
            for statement in cleaned_sql.split(';') {
                let trimmed = statement.trim();
                if !trimmed.is_empty() {
                    match diesel::sql_query(trimmed).execute(conn) {
                        Ok(_) => {
                            let preview = if trimmed.len() > 60 {
                                format!("{}...", &trimmed[..60])
                            } else {
                                trimmed.to_string()
                            };
                            println!("  ✓ {}", preview);
                        }
                        Err(e) => {
                            let error_msg = format!("{:?}", e);

                            // Bu hataları atla - kritik değil
                            if error_msg.contains("duplicate column") ||
                               error_msg.contains("already exists") ||
                               error_msg.contains("no such table") ||
                               error_msg.contains("no such column") {
                                let preview = if trimmed.len() > 40 {
                                    format!("{}...", &trimmed[..40])
                                } else {
                                    trimmed.to_string()
                                };
                                println!("  ⚠ Skipped ({}): {}",
                                    if error_msg.contains("no such table") { "table not found" }
                                    else if error_msg.contains("already exists") { "already exists" }
                                    else if error_msg.contains("duplicate column") { "duplicate column" }
                                    else { "column not found" },
                                    preview);
                                continue;
                            }

                            eprintln!("  ✗ Migration FAILED: {:?}", e);
                            eprintln!("    Statement: {}", trimmed);
                            eprintln!("    Rolling back migration: {}", filename);
                            return Err(e);
                        }
                    }
                }
            }

            // Migration'ı işaretle
            diesel::sql_query(
                "INSERT INTO schema_migrations (version) VALUES (?1)"
            )
            .bind::<diesel::sql_types::Text, _>(filename)
            .execute(conn)?;

            Ok(())
        });

        match migration_result {
            Ok(_) => println!("✅ Migration {} completed", filename),
            Err(e) => {
                eprintln!("❌ Migration {} ROLLED BACK due to error", filename);
                return Err(e);
            }
        }
    }

    Ok(())
}
