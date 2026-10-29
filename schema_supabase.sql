-- ==============================================================================
-- SKRIP MIGRASI DATABASE SPREADSHEET KE SUPABASE POSTGRESQL
-- Aplikasi: Dapodik & GTK SMKN 1 Palopo
-- Target: Supabase Project (https://orczqlxzcjuhezupalxe.supabase.co)
-- ==============================================================================

-- 0. AKTIFKAN EKSTENSI POSTGRESQL YANG DIBUTUHKAN
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- FUNGSI OTOMATIS UPDATE TIMESTAMP (updated_at)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 1. TABEL: students (Sheet Spreadsheet: "data")
-- Data Siswa / Peserta Didik
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY,                       -- NIPD / NISN / ID Unik
    nama TEXT NOT NULL,                        -- Nama Lengkap
    nipd TEXT,                                 -- Nomor Induk Peserta Didik
    nisn TEXT UNIQUE,                          -- NISN (Nomor Induk Siswa Nasional)
    jk VARCHAR(2) DEFAULT 'L',                 -- Jenis Kelamin (L / P)
    tempat_lahir TEXT,                         -- Tempat Lahir
    tanggal_lahir TEXT,                        -- Tanggal Lahir (dd/MM/yyyy atau YYYY-MM-DD)
    nik TEXT,                                  -- NIK Siswa
    agama TEXT DEFAULT 'Islam',                -- Agama
    alamat TEXT,                               -- Alamat Tempat Tinggal
    rt TEXT,                                   -- RT
    rw TEXT,                                   -- RW
    dusun TEXT,                                -- Nama Dusun
    kelurahan TEXT,                            -- Desa / Kelurahan
    kecamatan TEXT,                            -- Kecamatan
    kode_pos TEXT,                             -- Kode Pos
    jenis_tinggal TEXT,                        -- Jenis Tinggal (Bersama orang tua, Kos, dll)
    transportasi TEXT,                         -- Alat Transportasi
    telepon TEXT,                              -- Telepon Rumah
    hp TEXT,                                   -- No HP / WhatsApp Siswa
    email TEXT,                                -- Email Siswa
    skhun TEXT,                                -- No SKHUN
    kps TEXT,                                  -- Penerima KPS (Ya/Tidak)
    no_kps TEXT,                               -- Nomor KPS
    nama_ayah TEXT,                            -- Nama Ayah Kandung
    thn_lahir_ayah TEXT,                       -- Tahun Lahir Ayah
    pend_ayah TEXT,                            -- Pendidikan Terakhir Ayah
    kerja_ayah TEXT,                           -- Pekerjaan Ayah
    pengh_ayah TEXT,                           -- Penghasilan Ayah
    nik_ayah TEXT,                             -- NIK Ayah
    nama_ibu TEXT,                             -- Nama Ibu Kandung
    thn_lahir_ibu TEXT,                        -- Tahun Lahir Ibu
    pend_ibu TEXT,                             -- Pendidikan Terakhir Ibu
    kerja_ibu TEXT,                            -- Pekerjaan Ibu
    pengh_ibu TEXT,                            -- Penghasilan Ibu
    nik_ibu TEXT,                              -- NIK Ibu
    nama_wali TEXT,                            -- Nama Wali
    thn_wali TEXT,                             -- Tahun Lahir Wali
    pend_wali TEXT,                            -- Pendidikan Wali
    pek_wali TEXT,                             -- Pekerjaan Wali
    peng_wali TEXT,                            -- Penghasilan Wali
    nik_wali TEXT,                             -- NIK Wali
    rombel TEXT,                               -- Rombongan Belajar / Kelas
    kelas TEXT,                                -- Alias Rombel
    no_ujian TEXT,                             -- No Peserta Ujian
    no_ijazah TEXT,                            -- No Ijazah
    kip TEXT,                                  -- Penerima KIP (Ya/Tidak)
    no_kip TEXT,                               -- Nomor KIP
    nama_kip TEXT,                             -- Nama di KIP
    no_kks TEXT,                               -- Nomor KKS
    reg_akta TEXT,                             -- No Registrasi Akta Lahir
    bank TEXT,                                 -- Nama Bank
    no_rek TEXT,                               -- Nomor Rekening
    rek_nama TEXT,                             -- Rekening Atas Nama
    layak_pip TEXT,                            -- Kelayakan PIP (Ya/Tidak)
    alasan TEXT,                               -- Alasan Layak PIP
    keb_khusus TEXT,                           -- Kebutuhan Khusus
    sekolah_asal TEXT,                         -- Asal Sekolah
    anak_ke TEXT,                              -- Anak Ke-
    lintang TEXT,                              -- Koordinat Lintang
    bujur TEXT,                                -- Koordinat Bujur
    no_kk TEXT,                                -- Nomor Kartu Keluarga
    berat_badan NUMERIC,                       -- Berat Badan (kg)
    tinggi_badan NUMERIC,                      -- Tinggi Badan (cm)
    lingkar_kepala NUMERIC,                    -- Lingkar Kepala (cm)
    jum_saudara INTEGER,                       -- Jumlah Saudara Kandung
    jarak_sekolah TEXT,                        -- Jarak ke Sekolah
    waktu_tempuh TEXT,                         -- Waktu Tempuh ke Sekolah
    status TEXT DEFAULT 'Aktif',               -- Status Siswa (Aktif, Tidak Aktif, Mutasi, Lulus)
    ket TEXT,                                  -- Keterangan
    verval_oleh TEXT,                          -- Petugas Verval / Wali Kelas
    ket_desil TEXT,                            -- Keterangan Desil (Desil 1 s.d. 5, Yatim Piatu)
    ket_pip TEXT,                              -- Status Keterangan PIP (Sudah dapat PIP / Belum dapat PIP)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_students_updated_at
BEFORE UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Indeks untuk pencarian cepat data siswa
CREATE INDEX IF NOT EXISTS idx_students_nisn ON public.students(nisn);
CREATE INDEX IF NOT EXISTS idx_students_nipd ON public.students(nipd);
CREATE INDEX IF NOT EXISTS idx_students_nama ON public.students(nama);
CREATE INDEX IF NOT EXISTS idx_students_rombel ON public.students(rombel);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);


-- ==============================================================================
-- 2. TABEL: gtk (Sheet Spreadsheet: "gtk" & "ptk")
-- Data Guru dan Tenaga Kependidikan
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.gtk (
    id TEXT PRIMARY KEY,                       -- NIP / NUPTK / ID Unik GTK
    no_urut INTEGER,
    nama TEXT NOT NULL,                        -- Nama Lengkap GTK
    nuptk TEXT,                                -- NUPTK
    jk VARCHAR(2) DEFAULT 'L',                 -- Jenis Kelamin
    tempat_lahir TEXT,
    tanggal_lahir TEXT,
    nip TEXT,                                  -- NIP GTK
    status_kepegawaian TEXT,                   -- PNS, PPPK, Honorer, GTT, PTT
    jenis_ptk TEXT,                            -- Guru Mapel, Guru BK, Tenaga Administrasi, dll
    gelar_depan TEXT,
    gelar_belakang TEXT,
    jenjang TEXT,                              -- S1, S2, D3, dll
    jurusan_prodi TEXT,                        -- Program Studi
    sertifikasi TEXT,                          -- Status Sertifikasi
    tmt_kerja TEXT,
    tugas_tambahan TEXT,                       -- Kepala Lab, Wali Kelas, dll
    jabatan_ptk TEXT,
    mengajar TEXT,
    jam_tugas_tambahan TEXT,
    jjm TEXT,                                  -- Jumlah Jam Mengajar
    total_jjm TEXT,
    siswa TEXT,
    kompetensi TEXT,
    agama TEXT DEFAULT 'Islam',
    alamat_jalan TEXT,
    rt TEXT,
    rw TEXT,
    nama_dusun TEXT,
    desa_kelurahan TEXT,
    kecamatan TEXT,
    kode_pos TEXT,
    telepon TEXT,
    hp TEXT,
    email TEXT,
    sk_cpns TEXT,
    tanggal_cpns TEXT,
    sk_pengangkatan TEXT,
    tmt_pengangkatan TEXT,
    lembaga_pengangkatan TEXT,
    pangkat_golongan TEXT,                     -- Golongan (cth: IV/a, III/c)
    sumber_gaji TEXT,
    nama_ibu_kandung TEXT,
    status_perkawinan TEXT,
    nama_suami_istri TEXT,
    nip_suami_istri TEXT,
    pekerjaan_suami_istri TEXT,
    tmt_pns TEXT,
    sudah_lisensi_kepala_sekolah TEXT,
    pernah_diklat_kepengawasan TEXT,
    keahlian_braille TEXT,
    keahlian_bahasa_isyarat TEXT,
    npwp TEXT,
    nama_wajib_pajak TEXT,
    kewarganegaraan TEXT DEFAULT 'Indonesia',
    bank TEXT,
    nomor_rekening_bank TEXT,
    rekening_atas_nama TEXT,
    nik TEXT,
    no_kk TEXT,
    karpeg TEXT,
    karis_karsu TEXT,
    lintang TEXT,
    bujur TEXT,
    nuks TEXT,
    status_login TEXT DEFAULT 'guru',          -- admin, kurikulum, kesiswaan, walikelas, guru
    akses_menu TEXT,                           -- Konfigurasi hak akses menu
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_gtk_updated_at
BEFORE UPDATE ON public.gtk
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE INDEX IF NOT EXISTS idx_gtk_nip ON public.gtk(nip);
CREATE INDEX IF NOT EXISTS idx_gtk_nuptk ON public.gtk(nuptk);
CREATE INDEX IF NOT EXISTS idx_gtk_nama ON public.gtk(nama);


-- ==============================================================================
-- 3. TABEL: riwayat_pangkat (Sheet Spreadsheet: "naikpangkat")
-- Riwayat Kenaikan Pangkat GTK
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.riwayat_pangkat (
    id TEXT PRIMARY KEY,                       -- PANGKAT-NIP-xxx
    no_urut INTEGER,
    nip TEXT NOT NULL,                         -- NIP GTK
    nama TEXT NOT NULL,                        -- Nama GTK
    gol TEXT NOT NULL,                         -- Golongan Baru
    no_sk TEXT,                                -- Nomor SK Kenaikan Pangkat
    tgl_sk TEXT,                               -- Tanggal SK
    tmt TEXT,                                  -- Terhitung Mulai Tanggal
    masa_kerja_thn INTEGER DEFAULT 0,
    masa_kerja_bln INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Aktif',
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_riwayat_pangkat_updated_at
BEFORE UPDATE ON public.riwayat_pangkat
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE INDEX IF NOT EXISTS idx_pangkat_nip ON public.riwayat_pangkat(nip);


-- ==============================================================================
-- 4. TABEL: riwayat_kgb (Sheet Spreadsheet: "kgb")
-- Riwayat Kenaikan Gaji Berkala GTK
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.riwayat_kgb (
    id TEXT PRIMARY KEY,                       -- KGB-NIP-xxx
    no_urut INTEGER,
    nip TEXT NOT NULL,                         -- NIP GTK
    nama TEXT NOT NULL,                        -- Nama GTK
    gol TEXT NOT NULL,                         -- Golongan
    no_sk TEXT,                                -- Nomor SK KGB
    tgl_sk TEXT,                               -- Tanggal SK
    tmt TEXT,                                  -- TMT KGB
    masa_kerja_thn INTEGER DEFAULT 0,
    masa_kerja_bln INTEGER DEFAULT 0,
    gaji_pokok NUMERIC DEFAULT 0,              -- Nominal Gaji Pokok Baru
    status TEXT DEFAULT 'Aktif',
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_riwayat_kgb_updated_at
BEFORE UPDATE ON public.riwayat_kgb
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE INDEX IF NOT EXISTS idx_kgb_nip ON public.riwayat_kgb(nip);


-- ==============================================================================
-- 5. TABEL: mutasi_masuk (Sheet Spreadsheet: "mutasi_masuk")
-- Data Siswa Mutasi / Pindahan Masuk
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.mutasi_masuk (
    id TEXT PRIMARY KEY,                       -- MUT-IN-xxx
    no_urut INTEGER,
    nisn TEXT NOT NULL,                        -- NISN Siswa Masuk
    nama TEXT NOT NULL,                        -- Nama Siswa
    provinsi_nama TEXT,                        -- Asal Provinsi
    kab_kota_nama TEXT,                        -- Asal Kab/Kota
    kecamatan_nama TEXT,                       -- Asal Kecamatan
    sekolah_asal TEXT,                         -- Nama Sekolah Asal
    rombel_tujuan TEXT,                        -- Rombel / Kelas yang Dituju
    tgl_masuk TEXT,                            -- Tanggal Masuk
    status TEXT DEFAULT 'Pending',             -- Pending / Diterima
    verval_oleh TEXT,                          -- Petugas Verifikasi
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_mutasi_masuk_updated_at
BEFORE UPDATE ON public.mutasi_masuk
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE INDEX IF NOT EXISTS idx_mutasi_masuk_nisn ON public.mutasi_masuk(nisn);


-- ==============================================================================
-- 6. TABEL: mutasi_keluar (Sheet Spreadsheet: "mutasi_keluar")
-- Data Siswa Mutasi / Pindah Keluar
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.mutasi_keluar (
    id TEXT PRIMARY KEY,                       -- MUT-OUT-xxx
    no_urut INTEGER,
    nipd TEXT,
    nisn TEXT NOT NULL,                        -- NISN Siswa Keluar
    nama TEXT NOT NULL,                        -- Nama Siswa
    tempat_lahir TEXT,
    tgl_lahir TEXT,
    rombel TEXT,                               -- Kelas Asal
    ket_mutasi TEXT,                           -- Pindah Sekolah, Mengundurkan Diri, dll
    pindah_ke TEXT,                            -- Sekolah Tujuan
    tgl_mutasi TEXT,                           -- Tanggal Surat Mutasi
    alasan_mutasi TEXT,                        -- Alasan Pindah
    upload_berkas TEXT,                        -- URL Bukti Berkas Google Drive / Supabase Storage
    status TEXT DEFAULT 'Selesai',
    verval_oleh TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_mutasi_keluar_updated_at
BEFORE UPDATE ON public.mutasi_keluar
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE INDEX IF NOT EXISTS idx_mutasi_keluar_nisn ON public.mutasi_keluar(nisn);


-- ==============================================================================
-- 7. TABEL: pembelajaran (Sheet Spreadsheet: "pembelajaran")
-- Beban Mengajar Guru & Jadwal Pembelajaran
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.pembelajaran (
    id TEXT PRIMARY KEY,                       -- PEMB-NUPTK-xxx
    no_urut INTEGER,
    jenis_rombel TEXT,                         -- Teori / Praktik
    tingkat TEXT,                              -- X, XI, XII
    nama_rombel TEXT,                          -- Rombel (cth: X TKJ 1)
    kurikulum TEXT,                            -- Kurikulum Merdeka / K13
    program_keahlian TEXT,                     -- Program / Kompetensi Keahlian
    nama_ptk TEXT NOT NULL,                    -- Nama Guru Pengajar
    nuptk TEXT,
    ptk_induk TEXT,
    kepegawaian TEXT,
    nama_matpel TEXT,                          -- Nama Mata Pelajaran
    kode_matpel TEXT,                          -- Kode Mapel
    jjm TEXT,                                  -- Jumlah Jam Mengajar
    jml_siswa TEXT,                            -- Jumlah Siswa di Rombel
    tgl_sk_mengajar TEXT,
    sk_mengajar TEXT,
    status_di_kurikulum TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_pembelajaran_updated_at
BEFORE UPDATE ON public.pembelajaran
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE INDEX IF NOT EXISTS idx_pembelajaran_ptk ON public.pembelajaran(nama_ptk);
CREATE INDEX IF NOT EXISTS idx_pembelajaran_rombel ON public.pembelajaran(nama_rombel);


-- ==============================================================================
-- 8. TABEL: gaji (Sheet Spreadsheet: "gaji")
-- Data Penggajian / Payroll GTK
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.gaji (
    id TEXT PRIMARY KEY,                       -- GAJI-NIP-xxx
    no_urut INTEGER,
    nip TEXT NOT NULL,                         -- NIP GTK
    nama TEXT NOT NULL,                        -- Nama GTK
    bulan TEXT NOT NULL,                       -- Periode Bulan (cth: Oktober 2026)
    gaji_pokok NUMERIC DEFAULT 0,
    jum_kotor NUMERIC DEFAULT 0,
    jum_bersih NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Aktif',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_gaji_updated_at
BEFORE UPDATE ON public.gaji
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE INDEX IF NOT EXISTS idx_gaji_nip ON public.gaji(nip);
CREATE INDEX IF NOT EXISTS idx_gaji_bulan ON public.gaji(bulan);


-- ==============================================================================
-- 9. TABEL: pip (Sheet Spreadsheet: "pip")
-- Data Program Indonesia Pintar / Usulan PIP
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.pip (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    no_urut INTEGER,
    nisn TEXT NOT NULL,                        -- NISN Murid
    nama TEXT NOT NULL,                        -- Nama Murid
    rombel TEXT,                               -- Kelas Murid
    alasan_layak TEXT,                         -- Alasan Kelayakan (Yatim, Miskin, dll)
    status TEXT DEFAULT 'Belum diusul',        -- Belum diusul / Usulan Sekolah / Usulan Luar
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_pip_updated_at
BEFORE UPDATE ON public.pip
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE INDEX IF NOT EXISTS idx_pip_nisn ON public.pip(nisn);


-- ==============================================================================
-- 10. TABEL: wali_kelas (Sheet Spreadsheet: "walikelas")
-- Pembagian Wali Kelas per Rombongan Belajar
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.wali_kelas (
    kelas TEXT PRIMARY KEY,                    -- Nama Kelas / Rombel (cth: X TKJ 1)
    nama TEXT NOT NULL,                        -- Nama Wali Kelas
    nip TEXT,                                  -- NIP Wali Kelas
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_wali_kelas_updated_at
BEFORE UPDATE ON public.wali_kelas
FOR EACH ROW EXECUTE FUNCTION update_modified_column();


-- ==============================================================================
-- 11. TABEL: jurusan (Sheet Spreadsheet: "jurusan")
-- Referensi Kompetensi Keahlian / Jurusan Sekolah
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.jurusan (
    kode TEXT PRIMARY KEY,                     -- Kode Jurusan (cth: TKJ, RPL, AKL)
    program_keahlian TEXT NOT NULL,            -- Program Keahlian
    konsentrasi_keahlian TEXT NOT NULL,        -- Konsentrasi Keahlian
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==============================================================================
-- 12. TABEL: attendance (Presensi Kehadiran Siswa)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL,
    status VARCHAR(10) NOT NULL CHECK (status IN ('Hadir', 'Izin', 'Sakit', 'Alpa')),
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_tanggal ON public.attendance(tanggal);


-- ==============================================================================
-- KEAMANAN: ROW LEVEL SECURITY (RLS) & POLICIES
-- Aktifkan RLS dan berikan akses baca-tulis untuk API Supabase (anon / authenticated)
-- ==============================================================================

-- 1. students
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write on students" ON public.students;
CREATE POLICY "Allow public read-write on students" ON public.students
    FOR ALL USING (true) WITH CHECK (true);

-- 2. gtk
ALTER TABLE public.gtk ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write on gtk" ON public.gtk;
CREATE POLICY "Allow public read-write on gtk" ON public.gtk
    FOR ALL USING (true) WITH CHECK (true);

-- 3. riwayat_pangkat
ALTER TABLE public.riwayat_pangkat ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write on riwayat_pangkat" ON public.riwayat_pangkat;
CREATE POLICY "Allow public read-write on riwayat_pangkat" ON public.riwayat_pangkat
    FOR ALL USING (true) WITH CHECK (true);

-- 4. riwayat_kgb
ALTER TABLE public.riwayat_kgb ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write on riwayat_kgb" ON public.riwayat_kgb;
CREATE POLICY "Allow public read-write on riwayat_kgb" ON public.riwayat_kgb
    FOR ALL USING (true) WITH CHECK (true);

-- 5. mutasi_masuk
ALTER TABLE public.mutasi_masuk ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write on mutasi_masuk" ON public.mutasi_masuk;
CREATE POLICY "Allow public read-write on mutasi_masuk" ON public.mutasi_masuk
    FOR ALL USING (true) WITH CHECK (true);

-- 6. mutasi_keluar
ALTER TABLE public.mutasi_keluar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write on mutasi_keluar" ON public.mutasi_keluar;
CREATE POLICY "Allow public read-write on mutasi_keluar" ON public.mutasi_keluar
    FOR ALL USING (true) WITH CHECK (true);

-- 7. pembelajaran
ALTER TABLE public.pembelajaran ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write on pembelajaran" ON public.pembelajaran;
CREATE POLICY "Allow public read-write on pembelajaran" ON public.pembelajaran
    FOR ALL USING (true) WITH CHECK (true);

-- 8. gaji
ALTER TABLE public.gaji ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write on gaji" ON public.gaji;
CREATE POLICY "Allow public read-write on gaji" ON public.gaji
    FOR ALL USING (true) WITH CHECK (true);

-- 9. pip
ALTER TABLE public.pip ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write on pip" ON public.pip;
CREATE POLICY "Allow public read-write on pip" ON public.pip
    FOR ALL USING (true) WITH CHECK (true);

-- 10. wali_kelas
ALTER TABLE public.wali_kelas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write on wali_kelas" ON public.wali_kelas;
CREATE POLICY "Allow public read-write on wali_kelas" ON public.wali_kelas
    FOR ALL USING (true) WITH CHECK (true);

-- 11. jurusan
ALTER TABLE public.jurusan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write on jurusan" ON public.jurusan;
CREATE POLICY "Allow public read-write on jurusan" ON public.jurusan
    FOR ALL USING (true) WITH CHECK (true);

-- 12. attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write on attendance" ON public.attendance;
CREATE POLICY "Allow public read-write on attendance" ON public.attendance
    FOR ALL USING (true) WITH CHECK (true);
