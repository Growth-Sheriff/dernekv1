diesel::table! {
    tenants (id) {
        id -> Text,
        name -> Text,
        slug -> Text,
        is_active -> Bool,
        created_at -> Text,
        updated_at -> Text,
    }
}

diesel::table! {
    licenses (id) {
        id -> Text,
        tenant_id -> Text,
        plan -> Text,
        mode -> Text,
        features -> Text,
        hardware_id -> Nullable<Text>,
        expires_at -> Nullable<Text>,
        is_active -> Bool,
        created_at -> Text,
        updated_at -> Text,
    }
}

diesel::table! {
    users (id) {
        id -> Text,
        tenant_id -> Text,
        username -> Nullable<Text>,
        email -> Text,
        password_hash -> Text,
        full_name -> Text,
        role -> Nullable<Text>,
        phone -> Nullable<Text>,
        is_active -> Bool,
        is_superuser -> Nullable<Bool>,
        last_login -> Nullable<Text>,
        created_at -> Text,
        updated_at -> Text,
    }
}

// Üyeler tablosu 32+ kolonluk Diesel limitini aşıyor, bu yüzden raw SQL ile kullanılıyor
// diesel::table! kullanmıyoruz
diesel::table! {
    uyeler_basic (id) {
        id -> Text,
        tenant_id -> Text,
        uye_no -> Text,
        tc_no -> Text,
        ad -> Text,
        soyad -> Text,
        ad_soyad -> Text,
        telefon -> Nullable<Text>,
        email -> Nullable<Text>,
        giris_tarihi -> Text,
        durum -> Text,
        created_at -> Text,
        updated_at -> Text,
    }
}

diesel::table! {
    aidat_takip (id) {
        id -> Text,
        tenant_id -> Text,
        uye_id -> Text,
        yil -> Integer,
        ay -> Integer,
        tutar -> Double,
        odenen -> Double,
        kalan -> Nullable<Double>,
        odeme_tarihi -> Nullable<Text>,
        durum -> Text,
        gecikme_gun -> Nullable<Integer>,
        gecikme_faiz -> Nullable<Double>,
        tahsilat_turu -> Nullable<Text>,
        banka_sube -> Nullable<Text>,
        dekont_no -> Nullable<Text>,
        aciklama -> Nullable<Text>,
        notlar -> Nullable<Text>,
        gelir_id -> Nullable<Text>,
        aktarim_durumu -> Nullable<Text>,
        version -> Integer,
        created_at -> Text,
        updated_at -> Text,
    }
}

diesel::table! {
    kasalar (id) {
        id -> Text,
        tenant_id -> Text,
        kasa_adi -> Text,
        bakiye -> Double,
        para_birimi -> Text,
        devir_bakiye -> Nullable<Double>,
        toplam_gelir -> Nullable<Double>,
        toplam_gider -> Nullable<Double>,
        virman_giris -> Nullable<Double>,
        virman_cikis -> Nullable<Double>,
        fiziksel_bakiye -> Nullable<Double>,
        tahakkuk_tutari -> Nullable<Double>,
        serbest_bakiye -> Nullable<Double>,
        is_active -> Bool,
        created_at -> Text,
        updated_at -> Text,
    }
}

diesel::table! {
    gelir_turleri (id) {
        id -> Text,
        tenant_id -> Text,
        ad -> Text,
        kod -> Nullable<Text>,
        aciklama -> Nullable<Text>,
        varsayilan_makbuz_prefix -> Nullable<Text>,
        is_active -> Bool,
        created_at -> Text,
        updated_at -> Text,
    }
}

diesel::table! {
    gelirler (id) {
        id -> Text,
        tenant_id -> Text,
        kasa_id -> Text,
        gelir_turu -> Nullable<Text>,
        gelir_turu_id -> Nullable<Text>,
        alt_kategori -> Nullable<Text>,
        tarih -> Text,
        tutar -> Double,
        aciklama -> Nullable<Text>,
        makbuz_no -> Nullable<Text>,
        belge_no -> Nullable<Text>,
        tahsil_eden -> Nullable<Text>,
        aidat_id -> Nullable<Text>,
        uye_id -> Nullable<Text>,
        ait_oldugu_yil -> Nullable<Integer>,
        tahakkuk_durumu -> Nullable<Text>,
        notlar -> Nullable<Text>,
        belge_id -> Nullable<Text>,
        created_at -> Text,
        updated_at -> Text,
    }
}

diesel::table! {
    gider_turleri (id) {
        id -> Text,
        tenant_id -> Text,
        ad -> Text,
        kod -> Nullable<Text>,
        aciklama -> Nullable<Text>,
        varsayilan_fatura_prefix -> Nullable<Text>,
        is_active -> Bool,
        created_at -> Text,
        updated_at -> Text,
    }
}

diesel::table! {
    giderler (id) {
        id -> Text,
        tenant_id -> Text,
        kasa_id -> Text,
        gider_turu -> Nullable<Text>,
        gider_turu_id -> Nullable<Text>,
        alt_kategori -> Nullable<Text>,
        tarih -> Text,
        tutar -> Double,
        aciklama -> Nullable<Text>,
        fatura_no -> Nullable<Text>,
        islem_no -> Nullable<Text>,
        odeyen -> Nullable<Text>,
        notlar -> Nullable<Text>,
        belge_id -> Nullable<Text>,
        created_at -> Text,
        updated_at -> Text,
    }
}

diesel::table! {
    virmanlar (id) {
        id -> Text,
        tenant_id -> Text,
        kaynak_kasa_id -> Text,
        hedef_kasa_id -> Text,
        tarih -> Text,
        tutar -> Double,
        aciklama -> Nullable<Text>,
        kaynak_para_birimi -> Nullable<Text>,
        hedef_para_birimi -> Nullable<Text>,
        kaynak_tutar -> Nullable<Double>,
        hedef_tutar -> Nullable<Double>,
        uygulanan_kur -> Nullable<Double>,
        kur_id -> Nullable<Text>,
        created_at -> Text,
        updated_at -> Text,
    }
}

diesel::table! {
    kurlar (id) {
        id -> Text,
        tenant_id -> Text,
        para_birimi -> Text,
        hedef_para_birimi -> Text,
        kur_degeri -> Double,
        gecerlilik_baslangic -> Text,
        aciklama -> Nullable<Text>,
        is_active -> Bool,
        created_at -> Text,
        updated_at -> Text,
    }
}

diesel::table! {
    sync_changes (id) {
        id -> Text,
        tenant_id -> Text,
        table_name -> Text,
        record_id -> Text,
        operation -> Text,
        data -> Text,
        synced -> Bool,
        sync_version -> Integer,
        created_at -> Text,
    }
}

diesel::table! {
    etkinlikler (id) {
        id -> Text,
        tenant_id -> Text,
        baslik -> Text,
        aciklama -> Nullable<Text>,
        baslangic_tarihi -> Text,
        bitis_tarihi -> Nullable<Text>,
        yer -> Nullable<Text>,
        etkinlik_tipi -> Nullable<Text>,
        durum -> Nullable<Text>,
        katilimci_sayisi -> Nullable<Integer>,
        tahmini_butce -> Nullable<Double>,
        gerceklesen_butce -> Nullable<Double>,
        sorumlu_uye_id -> Nullable<Text>,
        notlar -> Nullable<Text>,
        created_at -> Nullable<Text>,
        updated_at -> Nullable<Text>,
        created_by -> Nullable<Text>,
        is_deleted -> Nullable<Integer>,
    }
}

diesel::table! {
    toplantilar (id) {
        id -> Text,
        tenant_id -> Text,
        baslik -> Text,
        aciklama -> Nullable<Text>,
        tarih -> Text,
        saat -> Nullable<Text>,
        yer -> Nullable<Text>,
        toplanti_tipi -> Nullable<Text>,
        durum -> Nullable<Text>,
        katilimci_sayisi -> Nullable<Integer>,
        gundem -> Nullable<Text>,
        kararlar -> Nullable<Text>,
        notlar -> Nullable<Text>,
        created_at -> Nullable<Text>,
        updated_at -> Nullable<Text>,
        created_by -> Nullable<Text>,
        is_deleted -> Nullable<Integer>,
    }
}

diesel::table! {
    butce (id) {
        id -> Text,
        tenant_id -> Text,
        yil -> Integer,
        kategori -> Text,
        alt_kategori -> Nullable<Text>,
        planlanan_gelir -> Nullable<Double>,
        planlanan_gider -> Nullable<Double>,
        gerceklesen_gelir -> Nullable<Double>,
        gerceklesen_gider -> Nullable<Double>,
        notlar -> Nullable<Text>,
        created_at -> Nullable<Text>,
        updated_at -> Nullable<Text>,
        donem -> Nullable<Text>,
    }
}

diesel::table! {
    koy_kasalar (id) {
        id -> Text,
        tenant_id -> Text,
        kasa_adi -> Text,
        para_birimi -> Text,
        bakiye -> Double,
        aciklama -> Nullable<Text>,
        is_active -> Bool,
        created_at -> Text,
        updated_at -> Text,
    }
}

diesel::table! {
    koy_gelirler (id) {
        id -> Text,
        tenant_id -> Text,
        kasa_id -> Text,
        gelir_turu -> Text,
        tarih -> Text,
        tutar -> Double,
        aciklama -> Nullable<Text>,
        makbuz_no -> Nullable<Text>,
        created_at -> Text,
        updated_at -> Text,
    }
}

diesel::table! {
    koy_giderler (id) {
        id -> Text,
        tenant_id -> Text,
        kasa_id -> Text,
        gider_turu -> Text,
        tarih -> Text,
        tutar -> Double,
        aciklama -> Nullable<Text>,
        fatura_no -> Nullable<Text>,
        created_at -> Text,
        updated_at -> Text,
    }
}

diesel::table! {
    belgeler (id) {
        id -> Text,
        tenant_id -> Text,
        belge_turu -> Text,
        baslik -> Text,
        dosya_adi -> Text,
        dosya_yolu -> Text,
        dosya_boyutu -> Nullable<Integer>,
        mime_type -> Nullable<Text>,
        bagli_kayit_turu -> Nullable<Text>,
        bagli_kayit_id -> Nullable<Text>,
        aciklama -> Nullable<Text>,
        etiketler -> Nullable<Text>,
        yukleyen_kullanici_id -> Nullable<Text>,
        is_active -> Bool,
        resmi_durum -> Nullable<Text>,
        created_at -> Text,
        updated_at -> Text,
    }
}

diesel::table! {
    koy_virmanlar (id) {
        id -> Text,
        tenant_id -> Text,
        kaynak_kasa_id -> Text,
        hedef_kasa_id -> Text,
        tarih -> Text,
        tutar -> Double,
        aciklama -> Nullable<Text>,
        created_at -> Text,
        updated_at -> Text,
    }
}
diesel::table! {
    uye_aile_uyeleri (id) {
        id -> Text,
        tenant_id -> Text,
        uye_id -> Text,
        yakinlik -> Nullable<Text>,
        ad_soyad -> Text,
        dogum_tarihi -> Nullable<Text>,
        telefon -> Nullable<Text>,
        meslek -> Nullable<Text>,
        egitim_durumu -> Nullable<Text>,
        notlar -> Nullable<Text>,
        sync_id -> Nullable<Text>,
        version -> Integer,
        is_deleted -> Integer,
        created_at -> Text,
        updated_at -> Text,
        created_by -> Nullable<Text>,
        updated_by -> Nullable<Text>,
    }
}
diesel::joinable!(licenses -> tenants (tenant_id));
diesel::joinable!(users -> tenants (tenant_id));
diesel::joinable!(uyeler_basic -> tenants (tenant_id));
diesel::joinable!(aidat_takip -> tenants (tenant_id));
diesel::joinable!(aidat_takip -> uyeler_basic (uye_id));
diesel::joinable!(kasalar -> tenants (tenant_id));
diesel::joinable!(gelir_turleri -> tenants (tenant_id));
diesel::joinable!(gelirler -> tenants (tenant_id));
diesel::joinable!(gelirler -> kasalar (kasa_id));
diesel::joinable!(gelirler -> uyeler_basic (uye_id));
diesel::joinable!(gelirler -> gelir_turleri (gelir_turu_id));
diesel::joinable!(gider_turleri -> tenants (tenant_id));
diesel::joinable!(giderler -> tenants (tenant_id));
diesel::joinable!(giderler -> kasalar (kasa_id));
diesel::joinable!(giderler -> gider_turleri (gider_turu_id));
diesel::joinable!(virmanlar -> tenants (tenant_id));
diesel::joinable!(sync_changes -> tenants (tenant_id));
diesel::joinable!(etkinlikler -> tenants (tenant_id));
diesel::joinable!(toplantilar -> tenants (tenant_id));
diesel::joinable!(butce -> tenants (tenant_id));
diesel::joinable!(belgeler -> tenants (tenant_id));
diesel::joinable!(koy_kasalar -> tenants (tenant_id));
diesel::joinable!(koy_gelirler -> tenants (tenant_id));
diesel::joinable!(koy_gelirler -> koy_kasalar (kasa_id));
diesel::joinable!(koy_giderler -> tenants (tenant_id));
diesel::joinable!(koy_giderler -> koy_kasalar (kasa_id));
diesel::joinable!(koy_virmanlar -> tenants (tenant_id));
diesel::joinable!(uye_aile_uyeleri -> tenants (tenant_id));
diesel::joinable!(uye_aile_uyeleri -> uyeler_basic (uye_id));
diesel::joinable!(kurlar -> tenants (tenant_id));

diesel::allow_tables_to_appear_in_same_query!(
    tenants,
    licenses,
    users,
    uyeler_basic,
    uye_aile_uyeleri,
    aidat_takip,
    kasalar,
    gelir_turleri,
    gelirler,
    gider_turleri,
    giderler,
    virmanlar,
    kurlar,
    sync_changes,
    etkinlikler,
    toplantilar,
    butce,
    belgeler,
    koy_kasalar,
    koy_gelirler,
    koy_giderler,
    koy_virmanlar,
);
