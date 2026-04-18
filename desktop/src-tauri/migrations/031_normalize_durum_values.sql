-- Migration 031: Durum değerlerini normalize et
-- Tek kaynak değerleri: 'odenmedi' | 'kismi_odendi' | 'odendi' | 'iptal'
-- Eski/farklı değerleri bunlara map'le.

-- aidat_takip.durum normalize
UPDATE aidat_takip SET durum = 'odenmedi'     WHERE durum IN ('Bekliyor', 'bekliyor', 'beklemede', 'BEKLEMEDE');
UPDATE aidat_takip SET durum = 'odendi'       WHERE durum IN ('Ödendi', 'ödendi', 'ODENDI', 'Odendi');
UPDATE aidat_takip SET durum = 'kismi_odendi' WHERE durum IN ('Kısmi', 'kısmi', 'Kismi', 'kismi', 'Kısmi Ödendi', 'KISMI_ODENDI');
UPDATE aidat_takip SET durum = 'iptal'        WHERE durum IN ('İptal', 'iptal', 'IPTAL', 'Iptal');

-- aidat_takip.aktarim_durumu normalize
UPDATE aidat_takip SET aktarim_durumu = 'bekliyor'   WHERE aktarim_durumu IN ('Bekliyor', 'beklemede', 'BEKLEMEDE');
UPDATE aidat_takip SET aktarim_durumu = 'aktarildi'  WHERE aktarim_durumu IN ('Aktarıldı', 'aktarıldı', 'AKTARILDI');

-- demirbaslar.durum normalize: ASCII küçük harfli
UPDATE demirbaslar SET durum = 'aktif'        WHERE durum IN ('Aktif', 'AKTIF', 'AKTİF');
UPDATE demirbaslar SET durum = 'arizali'      WHERE durum IN ('Arızalı', 'arızalı', 'ARIZALI');
UPDATE demirbaslar SET durum = 'bakimda'      WHERE durum IN ('Bakımda', 'bakımda', 'BAKIMDA');
UPDATE demirbaslar SET durum = 'kullanim_disi' WHERE durum IN ('Kullanım Dışı', 'kullanım dışı', 'Kullanim Disi', 'KULLANIM_DISI');
UPDATE demirbaslar SET durum = 'satildi'      WHERE durum IN ('Satıldı', 'satıldı', 'SATILDI');
UPDATE demirbaslar SET durum = 'hurda'        WHERE durum IN ('Hurda', 'HURDA');

-- cari_hareketler.hareket_tipi normalize: tek kaynak Türkçe "Borç" / "Alacak"
UPDATE cari_hareketler SET hareket_tipi = 'Borç'   WHERE hareket_tipi IN ('BORC', 'borc', 'Borc', 'BORÇ', 'borç');
UPDATE cari_hareketler SET hareket_tipi = 'Alacak' WHERE hareket_tipi IN ('ALACAK', 'alacak');
