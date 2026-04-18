-- Mevcut tenant'lar için "Demirbaş" gider türünü ekle (eksikse)
INSERT INTO gider_turleri (id, tenant_id, ad, kod, aciklama, is_active, created_at, updated_at)
SELECT
    lower(hex(randomblob(16))) as id,
    t.id as tenant_id,
    'Demirbaş' as ad,
    'DEMIRBAS' as kod,
    'Demirbaş alımları (mobilya, elektronik, ekipman)' as aciklama,
    1 as is_active,
    datetime('now') as created_at,
    datetime('now') as updated_at
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM gider_turleri gt
    WHERE gt.tenant_id = t.id AND gt.kod = 'DEMIRBAS'
);
