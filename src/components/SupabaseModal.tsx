import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  ArrowUpRight,
  Sparkles,
  Server,
  Zap,
  Radio,
  FileCode
} from 'lucide-react';
import {
  SUPABASE_URL,
  supabase,
  bulkMigrateAllToSupabase,
  fetchStudentsFromSupabase,
  fetchGTKFromSupabase
} from '../services/supabaseService';
import { Student, GTKData, RiwayatPangkat, RiwayatKGB, PembelajaranData, GajiData, WaliKelas, Jurusan } from '../types';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  gtkList: GTKData[];
  waliKelasList: WaliKelas[];
  jurusanList: Jurusan[];
  onDataReloaded?: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  students,
  gtkList,
  waliKelasList,
  jurusanList,
  onDataReloaded
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'migrate' | 'sql'>('status');
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [statusMessage, setStatusMessage] = useState<string>('Memeriksa koneksi ke Supabase...');
  const [supabaseStats, setSupabaseStats] = useState<{ studentsCount: number; gtkCount: number }>({
    studentsCount: 0,
    gtkCount: 0
  });

  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationLog, setMigrationLog] = useState<string[]>([]);
  const [migrationSuccess, setMigrationSuccess] = useState<boolean | null>(null);

  const [copiedSql, setCopiedSql] = useState(false);

  // Check connection
  const checkSupabaseHealth = async () => {
    setConnectionStatus('checking');
    setStatusMessage('Menghubungkan ke project Supabase...');
    try {
      const { count: sCount, error: sErr } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });

      const { count: gCount, error: gErr } = await supabase
        .from('gtk')
        .select('*', { count: 'exact', head: true });

      if (sErr && sErr.code !== 'PGRST116') {
        throw new Error(sErr.message);
      }

      setSupabaseStats({
        studentsCount: sCount || 0,
        gtkCount: gCount || 0
      });
      setConnectionStatus('connected');
      setStatusMessage('Terhubung secara Real-Time ke Supabase!');
    } catch (err: any) {
      console.warn('Supabase check error:', err);
      setConnectionStatus('error');
      setStatusMessage(err.message || 'Gagal tersambung ke tabel Supabase. Pastikan skrip SQL sudah dijalankan.');
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkSupabaseHealth();
    }
  }, [isOpen]);

  const handleStartMigration = async () => {
    setIsMigrating(true);
    setMigrationLog(['Memulai proses migrasi dari memori / Google Sheets ke Supabase...']);
    setMigrationSuccess(null);

    // Get cached pangkat, kgb, pembelajaran, gaji from localStorage
    let pangkatList: RiwayatPangkat[] = [];
    let kgbList: RiwayatKGB[] = [];
    let pembList: PembelajaranData[] = [];
    let gajiList: GajiData[] = [];

    try {
      pangkatList = JSON.parse(localStorage.getItem('smkn1_riwayat_pangkat_data') || '[]');
      kgbList = JSON.parse(localStorage.getItem('smkn1_riwayat_kgb_data') || '[]');
      pembList = JSON.parse(localStorage.getItem('dapodik_cached_pembelajaran') || '[]');
      gajiList = JSON.parse(localStorage.getItem('dapodik_cached_gaji') || '[]');
    } catch {}

    const result = await bulkMigrateAllToSupabase(
      {
        students,
        gtk: gtkList,
        pangkat: pangkatList,
        kgb: kgbList,
        pembelajaran: pembList,
        gaji: gajiList,
        waliKelas: waliKelasList,
        jurusan: jurusanList
      },
      (msg) => {
        setMigrationLog((prev) => [...prev, msg]);
      }
    );

    setIsMigrating(false);
    if (result.success) {
      setMigrationSuccess(true);
      setMigrationLog((prev) => [...prev, 'SELURUH DATA BERHASIL DIMIGRASIKAN KE SUPABASE!']);
      checkSupabaseHealth();
      onDataReloaded?.();
    } else {
      setMigrationSuccess(false);
      setMigrationLog((prev) => [...prev, `GAGAL: ${result.message}`]);
    }
  };

  const copySqlCode = () => {
    const sqlText = `-- Skrip SQL Migrasi Supabase
-- Buka https://supabase.com/dashboard/project/orczqlxzcjuhezupalxe/sql
-- Selengkapnya tersedia di file schema_supabase.sql pada root project`;
    navigator.clipboard.writeText(sqlText);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Database Supabase (Real-Time)</h3>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <Radio className="w-2.5 h-2.5 text-emerald-600 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono truncate max-w-md">
                {SUPABASE_URL}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 px-5 gap-4 bg-slate-50/70 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('status')}
            className={`py-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'status'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Status Koneksi
          </button>
          <button
            onClick={() => setActiveTab('migrate')}
            className={`py-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'migrate'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Migrasikan Data
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`py-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'sql'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Info Skrip SQL
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'status' && (
            <div className="space-y-4">
              {/* Status Box */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                  connectionStatus === 'connected'
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                    : connectionStatus === 'checking'
                    ? 'bg-blue-50/80 border-blue-200 text-blue-950'
                    : 'bg-amber-50/80 border-amber-200 text-amber-950'
                }`}
              >
                {connectionStatus === 'connected' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : connectionStatus === 'checking' ? (
                  <RefreshCw className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 animate-spin" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="font-semibold text-sm">
                    {connectionStatus === 'connected'
                      ? 'Supabase Siap & Terhubung'
                      : connectionStatus === 'checking'
                      ? 'Sedang Memeriksa...'
                      : 'Perlu Perhatian'}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{statusMessage}</p>
                </div>
                <button
                  onClick={checkSupabaseHealth}
                  className="px-2.5 py-1 text-xs font-semibold bg-white rounded-lg border shadow-xs hover:bg-slate-50 transition"
                >
                  Tes Ulang
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-500 font-medium">Data Siswa di Supabase</div>
                  <div className="text-2xl font-bold text-slate-800 mt-1">
                    {supabaseStats.studentsCount} <span className="text-xs font-normal text-slate-500">siswa</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    (Memori lokal aplikasi: {students.length} siswa)
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-500 font-medium">Data GTK di Supabase</div>
                  <div className="text-2xl font-bold text-slate-800 mt-1">
                    {supabaseStats.gtkCount} <span className="text-xs font-normal text-slate-500">orang</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    (Memori lokal aplikasi: {gtkList.length} GTK)
                  </div>
                </div>
              </div>

              {/* Info Details */}
              <div className="text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-emerald-600" />
                  Keunggulan Sinkronisasi Supabase Real-Time:
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li>Perubahan status (Verval PD, edit siswa, pangkat, KGB) tersimpan langsung &lt; 100ms.</li>
                  <li>Tidak ada lagi kendala timeout atau Google Drive authorization quota.</li>
                  <li>Multi-user: jika guru lain mengupdate data, layar Anda otomatis ter-refresh secara real-time.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'migrate' && (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl text-xs text-indigo-900 space-y-1">
                <div className="font-semibold text-indigo-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Migrasi Data Otomatis ke Supabase
                </div>
                <p className="text-indigo-800">
                  Tombol ini akan mengambil seluruh data yang saat ini ada di aplikasi ({students.length} siswa, {gtkList.length} GTK, kenaikan pangkat, KGB, pembelajaran, dll) dan menyalinnya langsung ke tabel PostgreSQL Supabase Anda.
                </p>
              </div>

              <div className="flex justify-center py-2">
                <button
                  onClick={handleStartMigration}
                  disabled={isMigrating}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 text-sm transition disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isMigrating ? 'animate-spin' : ''}`} />
                  <span>{isMigrating ? 'Sedang Memigrasi Data...' : 'Mulai Migrasi Seluruh Data ke Supabase'}</span>
                </button>
              </div>

              {migrationLog.length > 0 && (
                <div className="bg-slate-900 text-slate-200 p-4 rounded-xl text-xs font-mono max-h-48 overflow-y-auto space-y-1">
                  {migrationLog.map((log, idx) => (
                    <div key={idx} className={log.includes('GAGAL') ? 'text-red-400' : log.includes('BERHASIL') ? 'text-emerald-400 font-bold' : ''}>
                      &gt; {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="font-semibold text-slate-800">File Skrip SQL Lengkap:</div>
                <p className="text-slate-600">
                  Seluruh skrip SQL telah dibuatkan dan disimpan di file <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[11px]">schema_supabase.sql</code> di root workspace Anda.
                </p>
                <a
                  href="https://supabase.com/dashboard/project/orczqlxzcjuhezupalxe/sql"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-semibold"
                >
                  <span>Buka Supabase SQL Editor</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Koneksi aktif: <span className="font-semibold text-slate-700">Supabase PostgreSQL</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
