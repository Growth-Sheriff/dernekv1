-- Migration 032: licenses tablosundaki kolon isimlerini standardize et.
--
-- Arka plan: connection.rs fresh-install'da "starts_at" / "expires_at" kolonlarıyla
-- tablo yaratıyordu; migration 007 DROP edip "start_date" / "expiry_date" ile
-- yeniden yaratıyor. Eğer bir DB ilk kurulumda connection.rs schema'sında kalırsa
-- (migration 007 "DROP TABLE IF EXISTS" yaptığı için aslında çalışan bir senaryo
-- değil, ama savunmacı olalım), kod "starts_at" INSERT etmeye çalıştığında hata
-- veriyordu.
--
-- Bu migration garanti altına alıyor: licenses tablosunda start_date ve
-- expiry_date kolonları vardır. Eski starts_at / expires_at verisi (varsa)
-- start_date / expiry_date'e kopyalanır. Sütunlar SQLite'da DROP edilemez
-- ama kodun artık dokunmaması yeterli.
--
-- Migration runner zaten "duplicate column" ve "no such column" hatalarını
-- skipliyor (connection.rs:275), bu yüzden idempotent.

ALTER TABLE licenses ADD COLUMN start_date TEXT;
ALTER TABLE licenses ADD COLUMN expiry_date TEXT;

-- Eski starts_at verisini start_date'e kopyala (starts_at kolonu yoksa hata
-- skiplenir ve devam eder).
UPDATE licenses SET start_date = starts_at WHERE start_date IS NULL AND starts_at IS NOT NULL;
UPDATE licenses SET expiry_date = expires_at WHERE expiry_date IS NULL AND expires_at IS NOT NULL;
