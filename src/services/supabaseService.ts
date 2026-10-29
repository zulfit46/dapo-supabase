/**
 * ==============================================================================
 * SUPABASE CLIENT & REAL-TIME REPOSITORY SERVICE
 * Target: https://orczqlxzcjuhezupalxe.supabase.co
 * Menggantikan Google Sheets sync menjadi sinkronisasi Supabase Real-Time
 * ==============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import {
  Student,
  GTKData,
  RiwayatPangkat,
  RiwayatKGB,
  MutasiMasukItem,
  MutasiKeluarItem,
  PembelajaranData,
  GajiData,
  PIPData,
  WaliKelas,
  Jurusan,
  normalizeStudent
} from '../types';

function cleanSupabaseUrl(rawUrl?: string): string {
  let url = (rawUrl || '').trim();
  if (!url) return 'https://orczqlxzcjuhezupalxe.supabase.co';
  // Strip trailing /rest/v1 or /rest/v1/ or slashes
  url = url.replace(/\/rest\/v1\/?$/i, '');
  url = url.replace(/\/+$/, '');
  return url;
}

export const SUPABASE_URL = cleanSupabaseUrl(
  (import.meta.env.VITE_SUPABASE_URL as string) || 'https://orczqlxzcjuhezupalxe.supabase.co'
);

export const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string)?.trim() ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yY3pxbHh6Y2p1aGV6dXBhbHhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxNzg2MDYsImV4cCI6MjEwODc1NDYwNn0.8Qoo8H64GusvBHmW6oOqfjEDugZjZMtt0qYj6tBNHbo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// ==============================================================================
// 1. DATA CONVERTERS (Application Types <-> Supabase PostgreSQL Columns)
// ==============================================================================

export function mapStudentToDb(s: Partial<Student>): Record<string, any> {
  const norm = normalizeStudent(s);
  return {
    id: norm.id || norm.nipd || norm.nisn || `STU-${Date.now()}`,
    nama: norm.nama || '',
    nipd: norm.nipd || '',
    nisn: norm.nisn || '',
    jk: norm.jk || 'L',
    tempat_lahir: norm.tempatLahir || norm.t_lahir || '',
    tanggal_lahir: norm.tanggalLahir || norm.tgl_lahir || '',
    nik: norm.nik || '',
    agama: norm.agama || 'Islam',
    alamat: norm.alamat || '',
    rt: norm.rt || '',
    rw: norm.rw || '',
    dusun: norm.dusun || '',
    kelurahan: norm.kelurahan || '',
    kecamatan: norm.kecamatan || '',
    kode_pos: norm.kode_pos || norm.kodePos || '',
    jenis_tinggal: norm.jenis_tinggal || norm.jenisTinggal || '',
    transportasi: norm.transportaso || norm.transportasi || '',
    telepon: norm.telepon || '',
    hp: norm.hp || norm.noHp || '',
    email: norm.email || '',
    skhun: norm.skhun || norm.SKHUN || '',
    kps: norm.kps || '',
    no_kps: norm.no_kps || norm.noKps || '',
    nama_ayah: norm.nama_ayah || norm.ayah || '',
    thn_lahir_ayah: norm.thn_lahir_ayah || norm.thnLahirAyah || '',
    pend_ayah: norm.pend_ayah || norm.pendAyah || '',
    kerja_ayah: norm.kerja_ayah || norm.pekerjaanAyah || '',
    pengh_ayah: norm.pengh_ayah || norm.penghasilanAyah || '',
    nik_ayah: norm.nik_ayah || norm.nikAyah || '',
    nama_ibu: norm.nama_ibu || norm.ibu || '',
    thn_lahir_ibu: norm.thn_lahir_ibu || norm.thnLahirIbu || '',
    pend_ibu: norm.pend_ibu || norm.pendIbu || '',
    kerja_ibu: norm.kerja_ibu || norm.pekerjaanIbu || '',
    pengh_ibu: norm.pengh_ibu || norm.penghasilanIbu || '',
    nik_ibu: norm.nik_ibu || norm.nikIbu || '',
    nama_wali: norm.nama_wali || norm.namawali || norm.wali || '',
    thn_wali: norm.thn_wali || norm.thnwali || '',
    pend_wali: norm.pend_wali || norm.pendwali || '',
    pek_wali: norm.pek_wali || norm.pekwali || '',
    peng_wali: norm.peng_wali || norm.pengwali || '',
    nik_wali: norm.nik_wali || norm.nikwali || '',
    rombel: norm.rombel || norm.kelas || '',
    kelas: norm.kelas || norm.rombel || '',
    no_ujian: norm.no_ujian || norm.noUjian || '',
    no_ijazah: norm.no_ijazah || norm.noIjazah || '',
    kip: norm.kip || '',
    no_kip: norm.no_kip || norm.noKip || '',
    nama_kip: norm.nama_kip || norm.namaKip || '',
    no_kks: norm.no_kks || norm.noKks || '',
    reg_akta: norm.reg_akta || norm.regAkta || '',
    bank: norm.bank || norm.Bank || '',
    no_rek: norm.no_rek || norm.noRek || '',
    rek_nama: norm.rek_nama || norm.rekNama || '',
    layak_pip: norm.layak_pip || norm.layakPip || '',
    alasan: norm.alasan || '',
    keb_khusus: norm.keb_khusus || norm.kebKhusus || '',
    sekolah_asal: norm.sekolah_asal || norm.sekolahAsal || '',
    anak_ke: norm.anak_ke || norm.anakKe || '',
    lintang: norm.lintang || norm.Lintang || '',
    bujur: norm.bujur || norm.Bujur || '',
    no_kk: norm.no_kk || norm.noKk || '',
    berat_badan: Number(norm.berat_badan || norm.beratBadan || 0) || null,
    tinggi_badan: Number(norm.tinggi_badan || norm.tinggiBadan || 0) || null,
    lingkar_kepala: Number(norm.lingkar_kepala || norm.lingkarKepala || 0) || null,
    jum_saudara: Number(norm.jum_saudara || norm.jumSaudara || norm.jumlahSaudara || 0) || null,
    jarak_sekolah: norm.jarak_sekolah || norm.jarakSekolah || '',
    waktu_tempuh: norm.waktu_tempuh || norm.waktuTempuh || '',
    status: norm.status || 'Aktif',
    ket: norm.ket || '',
    verval_oleh: norm.verval_oleh || norm.vervalOleh || '',
    ket_desil: norm.ket_desil || norm.ketDesil || '',
    ket_pip: norm.ket_pip || norm.ketPip || ''
  };
}

export function mapDbToStudent(row: any): Student {
  return normalizeStudent({
    ...row,
    id: row.id || row.nipd || row.nisn,
    tempatLahir: row.tempat_lahir || row.t_lahir || '',
    tanggalLahir: row.tanggal_lahir || row.tgl_lahir || '',
    namaAyah: row.nama_ayah || row.ayah || '',
    ayah: row.nama_ayah || row.ayah || '',
    pekerjaanAyah: row.kerja_ayah || '',
    kerja_ayah: row.kerja_ayah || '',
    namaIbu: row.nama_ibu || row.ibu || '',
    ibu: row.nama_ibu || row.ibu || '',
    pekerjaanIbu: row.kerja_ibu || '',
    kerja_ibu: row.kerja_ibu || '',
    kelas: row.rombel || row.kelas || '',
    rombel: row.rombel || row.kelas || '',
    noHp: row.hp || row.telepon || '',
    sekolahAsal: row.sekolah_asal || '',
    tinggiBadan: row.tinggi_badan ? Number(row.tinggi_badan) : undefined,
    beratBadan: row.berat_badan ? Number(row.berat_badan) : undefined,
    jumlahSaudara: row.jum_saudara ? Number(row.jum_saudara) : undefined,
    jarakSekolah: row.jarak_sekolah || '',
    waktuTempuh: row.waktu_tempuh || '',
    vervalOleh: row.verval_oleh || '',
    ket_desil: row.ket_desil || '',
    ketDesil: row.ket_desil || '',
    ket_pip: row.ket_pip || '',
    ketPip: row.ket_pip || ''
  });
}

export function mapGTKToDb(g: Partial<GTKData>): Record<string, any> {
  return {
    id: g.id || g.nip || g.nuptk || `GTK-${Date.now()}`,
    no_urut: Number(g.no || g.no_urut || 0) || null,
    nama: g.nama || '',
    nuptk: g.nuptk || '',
    jk: g.jk || 'L',
    tempat_lahir: g.tempatLahir || g.tempat_lahir || '',
    tanggal_lahir: g.tanggalLahir || g.tanggal_lahir || '',
    nip: g.nip || '',
    status_kepegawaian: g.statusKepegawaian || g.status_kepegawaian || '',
    jenis_ptk: g.jenisPtk || g.jenis_ptk || '',
    gelar_depan: g.gelarDepan || g.gelar_depan || '',
    gelar_belakang: g.gelarBelakang || g.gelar_belakang || '',
    jenjang: g.jenjang || '',
    jurusan_prodi: g.jurusanProdi || g.jurusan_prodi || '',
    sertifikasi: g.sertifikasi || '',
    tmt_kerja: g.tmtKerja || g.tmt_kerja || '',
    tugas_tambahan: g.tugasTambahan || g.tugas_tambahan || '',
    jabatan_ptk: g.jabatanPtk || g.jabatan_ptk || '',
    mengajar: g.mengajar || '',
    jam_tugas_tambahan: g.jamTugasTambahan || g.jam_tugas_tambahan || '',
    jjm: g.jjm || '',
    total_jjm: g.totalJjm || g.total_jjm || '',
    siswa: g.siswa || '',
    kompetensi: g.kompetensi || '',
    agama: g.agama || 'Islam',
    alamat_jalan: g.alamatJalan || g.alamat_jalan || '',
    rt: g.rt || '',
    rw: g.rw || '',
    nama_dusun: g.namaDusun || g.nama_dusun || '',
    desa_kelurahan: g.desaKelurahan || g.desa_kelurahan || '',
    kecamatan: g.kecamatan || '',
    kode_pos: g.kodePos || g.kode_pos || '',
    telepon: g.telepon || '',
    hp: g.hp || '',
    email: g.email || '',
    sk_cpns: g.skCpns || g.sk_cpns || '',
    tanggal_cpns: g.tanggalCpns || g.tanggal_cpns || '',
    sk_pengangkatan: g.skPengangkatan || g.sk_pengangkatan || '',
    tmt_pengangkatan: g.tmtPengangkatan || g.tmt_pengangkatan || '',
    lembaga_pengangkatan: g.lembagaPengangkatan || g.lembaga_pengangkatan || '',
    pangkat_golongan: g.pangkatGolongan || g.pangkat_golongan || '',
    sumber_gaji: g.sumberGaji || g.sumber_gaji || '',
    nama_ibu_kandung: g.namaIbuKandung || g.nama_ibu_kandung || '',
    status_perkawinan: g.statusPerkawinan || g.status_perkawinan || '',
    nama_suami_istri: g.namaSuamiIstri || g.nama_suami_istri || '',
    nip_suami_istri: g.nipSuamiIstri || g.nip_suami_istri || '',
    pekerjaan_suami_istri: g.pekerjaanSuamiIstri || g.pekerjaan_suami_istri || '',
    tmt_pns: g.tmtPns || g.tmt_pns || '',
    sudah_lisensi_kepala_sekolah: g.sudahLisensiKepalaSekolah || g.sudah_lisensi_kepala_sekolah || '',
    pernah_diklat_kepengawasan: g.pernahDiklatKepengawasan || g.pernah_diklat_kepengawasan || '',
    keahlian_braille: g.keahlianBraille || g.keahlian_braille || '',
    keahlian_bahasa_isyarat: g.keahlianBahasaIsyarat || g.keahlian_bahasa_isyarat || '',
    npwp: g.npwp || '',
    nama_wajib_pajak: g.namaWajibPajak || g.nama_wajib_pajak || '',
    kewarganegaraan: g.kewarganegaraan || 'Indonesia',
    bank: g.bank || '',
    nomor_rekening_bank: g.nomorRekeningBank || g.nomor_rekening_bank || '',
    rekening_atas_nama: g.rekeningAtasNama || g.rekening_atas_nama || '',
    nik: g.nik || '',
    no_kk: g.noKk || g.no_kk || '',
    karpeg: g.karpeg || '',
    karis_karsu: g.karisKarsu || g.karis_karsu || '',
    lintang: g.lintang || '',
    bujur: g.bujur || '',
    nuks: g.nuks || '',
    status_login: g.status_login || g.statusLogin || 'guru',
    akses_menu: g.akses_menu || g.aksesMenu || ''
  };
}

export function mapDbToGTK(row: any): GTKData {
  return {
    ...row,
    id: row.id || row.nip || row.nuptk,
    no: row.no_urut || row.no,
    tempatLahir: row.tempat_lahir || row.tempatLahir,
    tanggalLahir: row.tanggal_lahir || row.tanggalLahir,
    statusKepegawaian: row.status_kepegawaian || row.statusKepegawaian,
    jenisPtk: row.jenis_ptk || row.jenisPtk,
    gelarDepan: row.gelar_depan || row.gelarDepan,
    gelarBelakang: row.gelar_belakang || row.gelarBelakang,
    jurusanProdi: row.jurusan_prodi || row.jurusanProdi,
    tmtKerja: row.tmt_kerja || row.tmtKerja,
    tugasTambahan: row.tugas_tambahan || row.tugasTambahan,
    jabatanPtk: row.jabatan_ptk || row.jabatanPtk,
    jabatan_ptk: row.jabatan_ptk || row.jabatanPtk,
    jamTugasTambahan: row.jam_tugas_tambahan || row.jamTugasTambahan,
    totalJjm: row.total_jjm || row.totalJjm,
    alamatJalan: row.alamat_jalan || row.alamatJalan,
    namaDusun: row.nama_dusun || row.namaDusun,
    desaKelurahan: row.desa_kelurahan || row.desaKelurahan,
    kodePos: row.kode_pos || row.kodePos,
    skCpns: row.sk_cpns || row.skCpns,
    tanggalCpns: row.tanggal_cpns || row.tanggalCpns,
    skPengangkatan: row.sk_pengangkatan || row.skPengangkatan,
    tmtPengangkatan: row.tmt_pengangkatan || row.tmtPengangkatan,
    lembagaPengangkatan: row.lembaga_pengangkatan || row.lembagaPengangkatan,
    pangkatGolongan: row.pangkat_golongan || row.pangkatGolongan,
    sumberGaji: row.sumber_gaji || row.sumberGaji,
    namaIbuKandung: row.nama_ibu_kandung || row.namaIbuKandung,
    statusPerkawinan: row.status_perkawinan || row.statusPerkawinan,
    namaSuamiIstri: row.nama_suami_istri || row.namaSuamiIstri,
    nipSuamiIstri: row.nip_suami_istri || row.nipSuamiIstri,
    pekerjaanSuamiIstri: row.pekerjaan_suami_istri || row.pekerjaanSuamiIstri,
    tmtPns: row.tmt_pns || row.tmtPns,
    sudahLisensiKepalaSekolah: row.sudah_lisensi_kepala_sekolah || row.sudahLisensiKepalaSekolah,
    pernahDiklatKepengawasan: row.pernah_diklat_kepengawasan || row.pernahDiklatKepengawasan,
    keahlianBraille: row.keahlian_braille || row.keahlianBraille,
    keahlianBahasaIsyarat: row.keahlian_bahasa_isyarat || row.keahlianBahasaIsyarat,
    namaWajibPajak: row.nama_wajib_pajak || row.namaWajibPajak,
    nomorRekeningBank: row.nomor_rekening_bank || row.nomorRekeningBank,
    rekeningAtasNama: row.rekening_atas_nama || row.rekeningAtasNama,
    noKk: row.no_kk || row.noKk,
    karisKarsu: row.karis_karsu || row.karisKarsu,
    statusLogin: row.status_login || row.statusLogin || 'guru',
    status_login: row.status_login || row.statusLogin || 'guru',
    aksesMenu: row.akses_menu || row.aksesMenu,
    akses_menu: row.akses_menu || row.aksesMenu
  };
}

// ==============================================================================
// 2. SUPABASE OPERATIONS & REALTIME SUBSCRIPTIONS
// ==============================================================================

// --- STUDENTS ---
export async function fetchStudentsFromSupabase(): Promise<Student[]> {
  let allStudents: any[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('nama', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('[Supabase] Gagal mengambil students:', error.message);
      throw error;
    }

    if (data && data.length > 0) {
      allStudents = allStudents.concat(data);
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        from += pageSize;
      }
    } else {
      hasMore = false;
    }
  }

  return allStudents.map(mapDbToStudent);
}

export async function saveStudentToSupabase(student: Partial<Student>): Promise<Student> {
  const payload = mapStudentToDb(student);
  const { data, error } = await supabase
    .from('students')
    .upsert(payload)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] Gagal menyimpan student:', error.message);
    throw error;
  }
  return mapDbToStudent(data);
}

export async function batchUpdateStudentsSupabase(
  updates: { id: string; status?: string; ket?: string; verval_oleh?: string }[]
): Promise<boolean> {
  for (const u of updates) {
    const payload: any = {};
    if (u.status !== undefined) payload.status = u.status;
    if (u.ket !== undefined) payload.ket = u.ket;
    if (u.verval_oleh !== undefined) payload.verval_oleh = u.verval_oleh;

    const { error } = await supabase
      .from('students')
      .update(payload)
      .eq('id', u.id);

    if (error) {
      console.warn(`[Supabase] Gagal update siswa ${u.id}:`, error.message);
    }
  }
  return true;
}

export async function updateStudentKetPIPSupabase(
  studentIdentifier: string,
  ketDesil: string,
  ketPip: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: { ket_desil: string; ket_pip: string } = {
      ket_desil: ketDesil,
      ket_pip: ketPip
    };
    const { error } = await supabase
      .from('students')
      .update(payload)
      .or(`id.eq.${studentIdentifier},nisn.eq.${studentIdentifier},nipd.eq.${studentIdentifier}`);

    if (error) {
      console.warn('[Supabase] Gagal update ket_desil/ket_pip (perlu jalankan ALTER TABLE di Supabase):', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('[Supabase] Exception saat update ket_desil/ket_pip:', err?.message || err);
    return { success: false, error: err?.message };
  }
}

export function subscribeStudentsRealtime(onUpdate: (students: Student[]) => void) {
  const channel = supabase
    .channel('realtime:students')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'students' },
      async () => {
        try {
          const fresh = await fetchStudentsFromSupabase();
          onUpdate(fresh);
        } catch (err) {
          console.error('[Supabase] Gagal refresh siswa realtime:', err);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// --- GTK ---
export async function fetchGTKFromSupabase(): Promise<GTKData[]> {
  const { data, error } = await supabase
    .from('gtk')
    .select('*')
    .order('nama', { ascending: true });

  if (error) {
    console.error('[Supabase] Gagal mengambil GTK:', error.message);
    throw error;
  }
  return (data || []).map(mapDbToGTK);
}

export async function saveGTKToSupabase(gtk: Partial<GTKData>): Promise<GTKData> {
  const payload = mapGTKToDb(gtk);
  const { data, error } = await supabase
    .from('gtk')
    .upsert(payload)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] Gagal menyimpan GTK:', error.message);
    throw error;
  }
  return mapDbToGTK(data);
}

export function subscribeGTKRealtime(onUpdate: (gtkList: GTKData[]) => void) {
  const channel = supabase
    .channel('realtime:gtk')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'gtk' },
      async () => {
        try {
          const fresh = await fetchGTKFromSupabase();
          onUpdate(fresh);
        } catch (err) {
          console.error('[Supabase] Gagal refresh GTK realtime:', err);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// --- RIWAYAT PANGKAT ---
export async function fetchPangkatFromSupabase(): Promise<RiwayatPangkat[]> {
  const { data, error } = await supabase
    .from('riwayat_pangkat')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((row: any) => ({
    ...row,
    id: row.id,
    nip: row.nip,
    nama: row.nama,
    gol: row.gol,
    noSk: row.no_sk || '',
    tglSk: row.tgl_sk || '',
    tmt: row.tmt || '',
    masaKerjaThn: Number(row.masa_kerja_thn) || 0,
    masaKerjaBln: Number(row.masa_kerja_bln) || 0,
    status: row.status || 'Aktif',
    keterangan: row.keterangan || ''
  }));
}

export async function savePangkatToSupabase(item: Partial<RiwayatPangkat>): Promise<void> {
  const payload = {
    id: item.id || `PANGKAT-${item.nip || 'GTK'}-${Date.now()}`,
    no_urut: Number(item.no || 0) || null,
    nip: item.nip || '',
    nama: item.nama || '',
    gol: item.gol || '',
    no_sk: item.noSk || item.no_sk || '',
    tgl_sk: item.tglSk || item.tgl_sk || '',
    tmt: item.tmt || '',
    masa_kerja_thn: Number(item.masaKerjaThn || 0),
    masa_kerja_bln: Number(item.masaKerjaBln || 0),
    status: item.status || 'Aktif',
    keterangan: item.keterangan || ''
  };

  const { error } = await supabase.from('riwayat_pangkat').upsert(payload);
  if (error) throw error;
}

// --- RIWAYAT KGB ---
export async function fetchKGBFromSupabase(): Promise<RiwayatKGB[]> {
  const { data, error } = await supabase
    .from('riwayat_kgb')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((row: any) => ({
    ...row,
    id: row.id,
    nip: row.nip,
    nama: row.nama,
    gol: row.gol,
    noSk: row.no_sk || '',
    tglSk: row.tgl_sk || '',
    tmt: row.tmt || '',
    masaKerjaThn: Number(row.masa_kerja_thn) || 0,
    masaKerjaBln: Number(row.masa_kerja_bln) || 0,
    gajiPokok: Number(row.gaji_pokok) || 0,
    status: row.status || 'Aktif',
    keterangan: row.keterangan || ''
  }));
}

export async function saveKGBToSupabase(item: Partial<RiwayatKGB>): Promise<void> {
  const payload = {
    id: item.id || `KGB-${item.nip || 'GTK'}-${Date.now()}`,
    no_urut: Number(item.no || 0) || null,
    nip: item.nip || '',
    nama: item.nama || '',
    gol: item.gol || '',
    no_sk: item.noSk || item.no_sk || '',
    tgl_sk: item.tglSk || item.tgl_sk || '',
    tmt: item.tmt || '',
    masa_kerja_thn: Number(item.masaKerjaThn || 0),
    masa_kerja_bln: Number(item.masaKerjaBln || 0),
    gaji_pokok: Number(item.gajiPokok || 0),
    status: item.status || 'Aktif',
    keterangan: item.keterangan || ''
  };

  const { error } = await supabase.from('riwayat_kgb').upsert(payload);
  if (error) throw error;
}

// --- MUTASI MASUK ---
export async function fetchMutasiMasukFromSupabase(): Promise<MutasiMasukItem[]> {
  const { data, error } = await supabase
    .from('mutasi_masuk')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    no: row.no_urut,
    nisn: row.nisn,
    nama: row.nama,
    provinsiNama: row.provinsi_nama || '',
    kabKotaNama: row.kab_kota_nama || '',
    kecamatanNama: row.kecamatan_nama || '',
    sekolahAsal: row.sekolah_asal || '',
    rombelTujuan: row.rombel_tujuan || '',
    tglMasuk: row.tgl_masuk || '',
    status: row.status || 'Pending',
    verval_oleh: row.verval_oleh || '',
    keterangan: row.keterangan || ''
  }));
}

export async function saveMutasiMasukToSupabase(item: Partial<MutasiMasukItem>): Promise<void> {
  const payload = {
    id: item.id || `MUT-IN-${item.nisn || Date.now()}`,
    no_urut: item.no || null,
    nisn: item.nisn || '',
    nama: item.nama || '',
    provinsi_nama: item.provinsiNama || '',
    kab_kota_nama: item.kabKotaNama || '',
    kecamatan_nama: item.kecamatanNama || '',
    sekolah_asal: item.sekolahAsal || '',
    rombel_tujuan: item.rombelTujuan || '',
    tgl_masuk: item.tglMasuk || '',
    status: item.status || 'Pending',
    verval_oleh: item.verval_oleh || item.vervalOleh || '',
    keterangan: item.keterangan || ''
  };

  const { error } = await supabase.from('mutasi_masuk').upsert(payload);
  if (error) throw error;
}

// --- MUTASI KELUAR ---
export async function fetchMutasiKeluarFromSupabase(): Promise<MutasiKeluarItem[]> {
  const { data, error } = await supabase
    .from('mutasi_keluar')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    no: row.no_urut,
    nipd: row.nipd || '',
    nisn: row.nisn || '',
    nama: row.nama || '',
    tempatLahir: row.tempat_lahir || '',
    tglLahir: row.tgl_lahir || '',
    rombel: row.rombel || '',
    ketMutasi: row.ket_mutasi || '',
    pindahKe: row.pindah_ke || '',
    tglMutasi: row.tgl_mutasi || '',
    alasanMutasi: row.alasan_mutasi || '',
    uploadBerkas: row.upload_berkas || '',
    status: row.status || 'Selesai',
    verval_oleh: row.verval_oleh || ''
  }));
}

export async function saveMutasiKeluarToSupabase(item: Partial<MutasiKeluarItem>): Promise<void> {
  const payload = {
    id: item.id || `MUT-OUT-${item.nisn || item.nipd || Date.now()}`,
    no_urut: Number(item.no || 0) || null,
    nipd: item.nipd || '',
    nisn: item.nisn || '',
    nama: item.nama || '',
    tempat_lahir: item.tempatLahir || '',
    tgl_lahir: item.tglLahir || '',
    rombel: item.rombel || '',
    ket_mutasi: item.ketMutasi || '',
    pindah_ke: item.pindahKe || '',
    tgl_mutasi: item.tglMutasi || '',
    alasan_mutasi: item.alasanMutasi || '',
    upload_berkas: item.uploadBerkas || '',
    status: item.status || 'Selesai',
    verval_oleh: item.verval_oleh || item.vervalOleh || ''
  };

  const { error } = await supabase.from('mutasi_keluar').upsert(payload);
  if (error) throw error;
}

// --- PEMBELAJARAN ---
export async function fetchPembelajaranFromSupabase(): Promise<PembelajaranData[]> {
  const { data, error } = await supabase
    .from('pembelajaran')
    .select('*')
    .order('nama_rombel', { ascending: true });

  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    no: row.no_urut,
    jenisRombel: row.jenis_rombel || '',
    tingkat: row.tingkat || '',
    namaRombel: row.nama_rombel || '',
    kurikulum: row.kurikulum || '',
    programKeahlian: row.program_keahlian || '',
    namaPtk: row.nama_ptk || '',
    nuptk: row.nuptk || '',
    ptkInduk: row.ptk_induk || '',
    kepegawaian: row.kepegawaian || '',
    namaMatpel: row.nama_matpel || '',
    kodeMatpel: row.kode_matpel || '',
    jjm: row.jjm || '',
    jmlSiswa: row.jml_siswa || '',
    tglSkMengajar: row.tgl_sk_mengajar || '',
    skMengajar: row.sk_mengajar || '',
    statusDiKurikulum: row.status_di_kurikulum || ''
  }));
}

export async function savePembelajaranToSupabase(item: Partial<PembelajaranData>): Promise<void> {
  const payload = {
    id: item.id || `PEMB-${item.nuptk || 'PTK'}-${Date.now()}`,
    no_urut: Number(item.no || 0) || null,
    jenis_rombel: item.jenisRombel || '',
    tingkat: item.tingkat || '',
    nama_rombel: item.namaRombel || '',
    kurikulum: item.kurikulum || '',
    program_keahlian: item.programKeahlian || '',
    nama_ptk: item.namaPtk || '',
    nuptk: item.nuptk || '',
    ptk_induk: item.ptkInduk || '',
    kepegawaian: item.kepegawaian || '',
    nama_matpel: item.namaMatpel || '',
    kode_matpel: item.kodeMatpel || '',
    jjm: String(item.jjm || ''),
    jml_siswa: String(item.jmlSiswa || ''),
    tgl_sk_mengajar: item.tglSkMengajar || '',
    sk_mengajar: item.skMengajar || '',
    status_di_kurikulum: item.statusDiKurikulum || ''
  };

  const { error } = await supabase.from('pembelajaran').upsert(payload);
  if (error) throw error;
}

// --- GAJI ---
export async function fetchGajiFromSupabase(): Promise<GajiData[]> {
  const { data, error } = await supabase
    .from('gaji')
    .select('*')
    .order('bulan', { ascending: false });

  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    no: row.no_urut,
    nip: row.nip,
    nama: row.nama,
    bulan: row.bulan,
    gaji_pokok: Number(row.gaji_pokok) || 0,
    gajiPokok: Number(row.gaji_pokok) || 0,
    jum_kotor: Number(row.jum_kotor) || 0,
    jumKotor: Number(row.jum_kotor) || 0,
    jum_bersih: Number(row.jum_bersih) || 0,
    jumBersih: Number(row.jum_bersih) || 0,
    status: row.status || 'Aktif'
  }));
}

export async function saveGajiToSupabase(item: Partial<GajiData>): Promise<void> {
  const payload = {
    id: item.id || `GAJI-${item.nip || 'GTK'}-${Date.now()}`,
    no_urut: Number(item.no || 0) || null,
    nip: item.nip || '',
    nama: item.nama || '',
    bulan: item.bulan || '',
    gaji_pokok: Number(item.gaji_pokok || item.gajiPokok || 0),
    jum_kotor: Number(item.jum_kotor || item.jumKotor || 0),
    jum_bersih: Number(item.jum_bersih || item.jumBersih || 0),
    status: item.status || 'Aktif'
  };

  const { error } = await supabase.from('gaji').upsert(payload);
  if (error) throw error;
}

// --- PIP ---
export async function fetchPIPFromSupabase(): Promise<PIPData[]> {
  const { data, error } = await supabase
    .from('pip')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    no: row.no_urut,
    nisn: row.nisn,
    nama: row.nama,
    rombel: row.rombel || '',
    alasan_layak: row.alasan_layak || '',
    status: row.status || 'Belum diusul'
  }));
}

export async function savePIPToSupabase(item: Partial<PIPData>): Promise<void> {
  const payload = {
    no_urut: item.no || null,
    nisn: item.nisn || '',
    nama: item.nama || '',
    rombel: item.rombel || '',
    alasan_layak: item.alasan_layak || item.alasanLayak || '',
    status: item.status || 'Belum diusul'
  };

  const { error } = await supabase.from('pip').upsert(payload);
  if (error) throw error;
}

// --- WALI KELAS & JURUSAN ---
export async function fetchWaliKelasFromSupabase(): Promise<WaliKelas[]> {
  const { data, error } = await supabase
    .from('wali_kelas')
    .select('*')
    .order('kelas', { ascending: true });

  if (error) throw error;
  return (data || []).map((row: any) => ({
    kelas: row.kelas,
    nama: row.nama,
    nip: row.nip || ''
  }));
}

export async function saveWaliKelasToSupabase(item: WaliKelas): Promise<void> {
  const { error } = await supabase.from('wali_kelas').upsert({
    kelas: item.kelas,
    nama: item.nama,
    nip: item.nip || ''
  });
  if (error) throw error;
}

export async function fetchJurusanFromSupabase(): Promise<Jurusan[]> {
  const { data, error } = await supabase
    .from('jurusan')
    .select('*')
    .order('kode', { ascending: true });

  if (error) throw error;
  return (data || []).map((row: any) => ({
    kode: row.kode,
    programKeahlian: row.program_keahlian,
    konsentrasiKeahlian: row.konsentrasi_keahlian
  }));
}

export async function saveJurusanToSupabase(item: Jurusan): Promise<void> {
  const { error } = await supabase.from('jurusan').upsert({
    kode: item.kode,
    program_keahlian: item.programKeahlian,
    konsentrasi_keahlian: item.konsentrasiKeahlian
  });
  if (error) throw error;
}

// ==============================================================================
// 3. BULK MIGRATION HELPER (Migrasi Seluruh Data ke Supabase)
// ==============================================================================
export async function bulkMigrateAllToSupabase(data: {
  students?: Student[];
  gtk?: GTKData[];
  pangkat?: RiwayatPangkat[];
  kgb?: RiwayatKGB[];
  pembelajaran?: PembelajaranData[];
  gaji?: GajiData[];
  waliKelas?: WaliKelas[];
  jurusan?: Jurusan[];
}, onProgress?: (msg: string) => void): Promise<{ success: boolean; message: string }> {
  try {
    if (data.students && data.students.length > 0) {
      onProgress?.(`Mengunggah ${data.students.length} data Siswa ke Supabase...`);
      const chunks = [];
      const dbStudents = data.students.map(mapStudentToDb);
      // Chunk in groups of 100 for optimal Supabase insertion
      for (let i = 0; i < dbStudents.length; i += 100) {
        chunks.push(dbStudents.slice(i, i + 100));
      }
      for (const chunk of chunks) {
        const { error } = await supabase.from('students').upsert(chunk);
        if (error) throw new Error(`Error siswa: ${error.message}`);
      }
    }

    if (data.gtk && data.gtk.length > 0) {
      onProgress?.(`Mengunggah ${data.gtk.length} data GTK ke Supabase...`);
      const dbGtk = data.gtk.map(mapGTKToDb);
      const { error } = await supabase.from('gtk').upsert(dbGtk);
      if (error) throw new Error(`Error GTK: ${error.message}`);
    }

    if (data.pangkat && data.pangkat.length > 0) {
      onProgress?.(`Mengunggah ${data.pangkat.length} data Kenaikan Pangkat...`);
      const dbPangkat = data.pangkat.map((p, idx) => ({
        id: p.id || `PANGKAT-${p.nip || idx}`,
        no_urut: Number(p.no || idx + 1),
        nip: p.nip || '',
        nama: p.nama || '',
        gol: p.gol || '',
        no_sk: p.noSk || p.no_sk || '',
        tgl_sk: p.tglSk || p.tgl_sk || '',
        tmt: p.tmt || '',
        masa_kerja_thn: Number(p.masaKerjaThn || 0),
        masa_kerja_bln: Number(p.masaKerjaBln || 0),
        status: p.status || 'Aktif',
        keterangan: p.keterangan || ''
      }));
      const { error } = await supabase.from('riwayat_pangkat').upsert(dbPangkat);
      if (error) throw new Error(`Error pangkat: ${error.message}`);
    }

    if (data.kgb && data.kgb.length > 0) {
      onProgress?.(`Mengunggah ${data.kgb.length} data Riwayat KGB...`);
      const dbKgb = data.kgb.map((k, idx) => ({
        id: k.id || `KGB-${k.nip || idx}`,
        no_urut: Number(k.no || idx + 1),
        nip: k.nip || '',
        nama: k.nama || '',
        gol: k.gol || '',
        no_sk: k.noSk || k.no_sk || '',
        tgl_sk: k.tglSk || k.tgl_sk || '',
        tmt: k.tmt || '',
        masa_kerja_thn: Number(k.masaKerjaThn || 0),
        masa_kerja_bln: Number(k.masaKerjaBln || 0),
        gaji_pokok: Number(k.gajiPokok || 0),
        status: k.status || 'Aktif',
        keterangan: k.keterangan || ''
      }));
      const { error } = await supabase.from('riwayat_kgb').upsert(dbKgb);
      if (error) throw new Error(`Error KGB: ${error.message}`);
    }

    if (data.waliKelas && data.waliKelas.length > 0) {
      onProgress?.(`Mengunggah data Wali Kelas...`);
      const dbWali = data.waliKelas.map(w => ({
        kelas: w.kelas,
        nama: w.nama,
        nip: w.nip || ''
      }));
      await supabase.from('wali_kelas').upsert(dbWali);
    }

    if (data.jurusan && data.jurusan.length > 0) {
      onProgress?.(`Mengunggah data Jurusan...`);
      const dbJur = data.jurusan.map(j => ({
        kode: j.kode,
        program_keahlian: j.programKeahlian,
        konsentrasi_keahlian: j.konsentrasiKeahlian
      }));
      await supabase.from('jurusan').upsert(dbJur);
    }

    return { success: true, message: 'Seluruh data berhasil dimigrasi dan disinkronkan ke Supabase!' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal migrasi ke Supabase' };
  }
}
