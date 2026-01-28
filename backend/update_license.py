"""
Script to migrate database tables with new fields
"""
import sqlite3
import os

# Database path
db_paths = [
    '/app/database.db',
    './database.db',
    '/app/data/database.db',
    './data/database.db',
]

db_path = None
for p in db_paths:
    if os.path.exists(p):
        db_path = p
        print(f"Found database at {p}")
        break

if not db_path:
    print("No database found!")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# ========== LICENSE TABLE ==========
print("\n=== LICENSE TABLE ===")
cursor.execute("PRAGMA table_info(license)")
license_columns = [col[1] for col in cursor.fetchall()]
print(f"Existing columns: {license_columns}")

license_new_columns = [
    ('desktop_enabled', 'INTEGER DEFAULT 0'),
    ('web_enabled', 'INTEGER DEFAULT 0'),
    ('mobile_enabled', 'INTEGER DEFAULT 0'),
    ('sync_enabled', 'INTEGER DEFAULT 0'),
    ('plan', 'TEXT DEFAULT "standard"'),
    ('mode', 'TEXT DEFAULT "hybrid"'),
    ('features', 'TEXT DEFAULT "ALL"'),
    ('hardware_id', 'TEXT'),
    ('expires_at', 'TEXT'),
    ('created_at', 'TEXT'),
    ('updated_at', 'TEXT'),
]

for col_name, col_type in license_new_columns:
    if col_name not in license_columns:
        try:
            cursor.execute(f"ALTER TABLE license ADD COLUMN {col_name} {col_type}")
            print(f"✅ License: Added column {col_name}")
        except Exception as e:
            print(f"⚠️ License: {col_name} - {e}")

# Update all licenses to HYBRID
cursor.execute("""
    UPDATE license 
    SET desktop_enabled = 1, 
        web_enabled = 1, 
        mobile_enabled = 1, 
        sync_enabled = 1
    WHERE desktop_enabled = 0 OR desktop_enabled IS NULL
""")
conn.commit()
print("✅ License: Updated all to HYBRID")

# ========== USER TABLE ==========
print("\n=== USER TABLE ===")
cursor.execute("PRAGMA table_info(user)")
user_columns = [col[1] for col in cursor.fetchall()]
print(f"Existing columns: {user_columns}")

user_new_columns = [
    ('username', 'TEXT'),
    ('password_hash', 'TEXT'),
    ('phone', 'TEXT'),
    ('is_superuser', 'INTEGER DEFAULT 0'),
    ('last_login', 'TEXT'),
    ('created_at', 'TEXT'),
    ('updated_at', 'TEXT'),
]

for col_name, col_type in user_new_columns:
    if col_name not in user_columns:
        try:
            cursor.execute(f"ALTER TABLE user ADD COLUMN {col_name} {col_type}")
            print(f"✅ User: Added column {col_name}")
        except Exception as e:
            print(f"⚠️ User: {col_name} - {e}")

conn.commit()

# ========== TENANT TABLE ==========
print("\n=== TENANT TABLE ===")
cursor.execute("PRAGMA table_info(tenant)")
tenant_columns = [col[1] for col in cursor.fetchall()]
print(f"Existing columns: {tenant_columns}")

tenant_new_columns = [
    ('status', 'TEXT DEFAULT "active"'),
    ('is_active', 'INTEGER DEFAULT 1'),
    ('contact_email', 'TEXT'),
    ('phone', 'TEXT'),
    ('address', 'TEXT'),
    ('created_at', 'TEXT'),
    ('updated_at', 'TEXT'),
    ('max_users', 'INTEGER DEFAULT 100'),
    ('max_storage_mb', 'INTEGER DEFAULT 1000'),
    ('max_members', 'INTEGER DEFAULT 10000'),
]

for col_name, col_type in tenant_new_columns:
    if col_name not in tenant_columns:
        try:
            cursor.execute(f"ALTER TABLE tenant ADD COLUMN {col_name} {col_type}")
            print(f"✅ Tenant: Added column {col_name}")
        except Exception as e:
            print(f"⚠️ Tenant: {col_name} - {e}")

conn.commit()

# ========== VERIFY ==========
print("\n=== VERIFICATION ===")
cursor.execute("SELECT id FROM license")
licenses = cursor.fetchall()
print(f"Total licenses: {len(licenses)}")

cursor.execute("SELECT id, email FROM user")
users = cursor.fetchall()
print(f"Total users: {len(users)}")
for u in users:
    print(f"  {u[0][:8]}... - {u[1]}")

conn.close()
print("\n✅ Migration completed!")

