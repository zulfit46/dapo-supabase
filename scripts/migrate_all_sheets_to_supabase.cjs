const { createClient } = require('@supabase/supabase-js');

const SPREADSHEET_ID = '1t_i5_kMDb00AT2uL0Km49_37CHJB2RWUv3tZjVgLlAk';
const SUPABASE_URL = 'https://orczqlxzcjuhezupalxe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yY3pxbHh6Y2p1aGV6dXBhbHhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxNzg2MDYsImV4cCI6MjEwODc1NDYwNn0.8Qoo8H64GusvBHmW6oOqfjEDugZjZMtt0qYj6tBNHbo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function cleanCell(cell) {
  if (!cell || cell.v === null || cell.v === undefined) return '';
  if (typeof cell.v === 'string' && cell.v.startsWith('Date(')) {
    return cell.f || cell.v;
  }
  return cell.f || String(cell.v).trim();
}

async function fetchSheetData(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  const text = await res.text();
  const jsonText = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
  const parsed = JSON.parse(jsonText);
  const rows = parsed.table?.rows || [];
  if (rows.length <= 1) return [];

  const headers = rows[0].c.map(c => cleanCell(c).toLowerCase().replace(/[^a-z0-9]/g, ''));
  const records = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i].c;
    if (!row) continue;
    const obj = {};
    headers.forEach((h, colIdx) => {
      if (h) {
        obj[h] = cleanCell(row[colIdx]);
      }
    });
    records.push(obj);
  }
  return records;
}

async function migratePangkat() {
  console.log('--- Migrasi Riwayat Pangkat ---');
  const raw = await fetchSheetData('pangkat');
  const items = raw.map((r, idx) => ({
    id: `PANGKAT-${r.nip || 'GTK'}-${idx + 1}`,
    no_urut: Number(r.no) || idx + 1,
    nip: r.nip || '',
    nama: r.nama || '',
    gol: r.gol || '',
    no_sk: r.nosk || '',
    tgl_sk: r.tglsk || '',
    tmt: r.tmt || '',
    masa_kerja_thn: Number(r.masakerjathn) || 0,
    masa_kerja_bln: Number(r.masakerjabln) || 0,
    status: r.status || 'Aktif',
    keterangan: r.timestamp || ''
  })).filter(p => p.nama || p.nip);

  if (items.length > 0) {
    const { error } = await supabase.from('riwayat_pangkat').upsert(items);
    if (error) console.error('Pangkat error:', error.message);
    else console.log(`Sukses: ${items.length} riwayat pangkat termigrasi!`);
  }
}

async function migrateKGB() {
  console.log('--- Migrasi Riwayat KGB ---');
  const raw = await fetchSheetData('kgb');
  const items = raw.map((r, idx) => ({
    id: `KGB-${r.nip || 'GTK'}-${idx + 1}`,
    no_urut: Number(r.no) || idx + 1,
    nip: r.nip || '',
    nama: r.nama || '',
    gol: r.gol || '',
    no_sk: r.nosk || '',
    tgl_sk: r.tglsk || '',
    tmt: r.tmtkgb || r.tmt || '',
    masa_kerja_thn: Number(r.masakerjatahun || r.masakerjathn) || 0,
    masa_kerja_bln: Number(r.masakerjabln) || 0,
    gaji_pokok: Number(String(r.gajipokok || '0').replace(/[^0-9]/g, '')) || 0,
    status: r.status || 'Aktif',
    keterangan: r.timestamp || ''
  })).filter(k => k.nama || k.nip);

  if (items.length > 0) {
    const { error } = await supabase.from('riwayat_kgb').upsert(items);
    if (error) console.error('KGB error:', error.message);
    else console.log(`Sukses: ${items.length} riwayat KGB termigrasi!`);
  }
}

async function migratePembelajaran() {
  console.log('--- Migrasi Pembelajaran ---');
  const raw = await fetchSheetData('pembelajaran');
  const items = raw.map((r, idx) => ({
    id: `PEMB-${r.nuptk || 'PTK'}-${idx + 1}`,
    no_urut: Number(r.no) || idx + 1,
    jenis_rombel: r.jenisrombel || '',
    tingkat: r.tingkat || '',
    nama_rombel: r.namarombel || '',
    kurikulum: r.kurikulum || '',
    program_keahlian: r.programkompetensikeahlian || r.programkeahlian || '',
    nama_ptk: r.namaptk || '',
    nuptk: r.nuptk || '',
    ptk_induk: r.ptkinduk || '',
    kepegawaian: r.kepegawaian || '',
    nama_matpel: r.namamatpel || '',
    kode_matpel: r.kodematpel || '',
    jjm: r.jjm || '',
    jml_siswa: r.jmlsiswa || '',
    tgl_sk_mengajar: r.tglskmengajar || '',
    sk_mengajar: r.skmengajar || '',
    status_di_kurikulum: r.statusdikurikulum || ''
  })).filter(p => p.nama_ptk);

  // Chunk in batches of 100
  for (let i = 0; i < items.length; i += 100) {
    const chunk = items.slice(i, i + 100);
    const { error } = await supabase.from('pembelajaran').upsert(chunk);
    if (error) console.error(`Pembelajaran batch ${i} error:`, error.message);
  }
  console.log(`Sukses: ${items.length} data pembelajaran termigrasi!`);
}

async function migrateGaji() {
  console.log('--- Migrasi Gaji ---');
  const raw = await fetchSheetData('gaji');
  const items = raw.map((r, idx) => ({
    id: `GAJI-${r.nip || 'GTK'}-${r.bulan || ''}-${idx + 1}`,
    no_urut: Number(r.no) || idx + 1,
    nip: r.nip || '',
    nama: r.nama || '',
    bulan: r.bulan || '',
    gaji_pokok: Number(String(r.gajipokok || '0').replace(/[^0-9]/g, '')) || 0,
    jum_kotor: Number(String(r.jumkotor || '0').replace(/[^0-9]/g, '')) || 0,
    jum_bersih: Number(String(r.jumbersih || '0').replace(/[^0-9]/g, '')) || 0,
    status: 'Aktif'
  })).filter(g => g.nama || g.nip);

  for (let i = 0; i < items.length; i += 100) {
    const chunk = items.slice(i, i + 100);
    const { error } = await supabase.from('gaji').upsert(chunk);
    if (error) console.error(`Gaji batch ${i} error:`, error.message);
  }
  console.log(`Sukses: ${items.length} data gaji termigrasi!`);
}

async function migratePIP() {
  console.log('--- Migrasi Usulan PIP ---');
  const raw = await fetchSheetData('pip');
  const items = raw.map((r, idx) => ({
    no_urut: idx + 1,
    nisn: r.nisn || '',
    nama: r.namamurid || r.nama || '',
    rombel: '',
    alasan_layak: r.alasanusul || r.alasanlayak || '',
    status: r.status || 'Belum diusul'
  })).filter(p => p.nama || p.nisn);

  for (let i = 0; i < items.length; i += 100) {
    const chunk = items.slice(i, i + 100);
    const { error } = await supabase.from('pip').insert(chunk);
    if (error) console.error(`PIP batch ${i} error:`, error.message);
  }
  console.log(`Sukses: ${items.length} data PIP termigrasi!`);
}

async function migrateMutasi() {
  console.log('--- Migrasi Mutasi Masuk & Keluar ---');
  const rawMasuk = await fetchSheetData('mutasi_masuk');
  const itemsMasuk = rawMasuk.map((r, idx) => ({
    id: `MUT-IN-${r.nisn || idx + 1}`,
    no_urut: Number(r.no) || idx + 1,
    nisn: r.nisn || '',
    nama: r.namasiswa || r.nama || '',
    provinsi_nama: r.provinsi || '',
    kab_kota_nama: r.kabkota || '',
    kecamatan_nama: r.kecamatan || '',
    sekolah_asal: r.namasekolah || '',
    rombel_tujuan: r.rombeltujuan || '',
    tgl_masuk: r.timestamp || '',
    status: r.status || 'Diterima',
    verval_oleh: r.vervaloleh || '',
    keterangan: ''
  })).filter(m => m.nama);

  if (itemsMasuk.length > 0) {
    const { error } = await supabase.from('mutasi_masuk').upsert(itemsMasuk);
    if (error) console.error('Mutasi masuk error:', error.message);
    else console.log(`Sukses: ${itemsMasuk.length} mutasi masuk termigrasi!`);
  }

  const rawKeluar = await fetchSheetData('mutasi_keluar');
  const itemsKeluar = rawKeluar.map((r, idx) => ({
    id: `MUT-OUT-${r.nisn || r.nipd || idx + 1}`,
    no_urut: Number(r.no) || idx + 1,
    nipd: r.nipd || '',
    nisn: r.nisn || '',
    nama: r.nama || '',
    tempat_lahir: r.tempatlahir || '',
    tgl_lahir: r.tgllahir || '',
    rombel: r.rombel || '',
    ket_mutasi: r.ketmutasi || '',
    pindah_ke: r.pindahke || '',
    tgl_mutasi: r.tglmutasi || '',
    alasan_mutasi: r.alasanmutasi || '',
    upload_berkas: r.uploadberkas || '',
    status: r.status || 'Selesai',
    verval_oleh: r.vervaloleh || ''
  })).filter(m => m.nama);

  if (itemsKeluar.length > 0) {
    const { error } = await supabase.from('mutasi_keluar').upsert(itemsKeluar);
    if (error) console.error('Mutasi keluar error:', error.message);
    else console.log(`Sukses: ${itemsKeluar.length} mutasi keluar termigrasi!`);
  }
}

async function runAll() {
  await migratePangkat();
  await migrateKGB();
  await migratePembelajaran();
  await migrateGaji();
  await migratePIP();
  await migrateMutasi();
  console.log('=== SEMUA MIGRASI SELESAI ===');
}

runAll();
