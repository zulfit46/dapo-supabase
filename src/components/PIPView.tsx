import React, { useState, useEffect, useMemo } from 'react';
import { Student, AppConfig, GTKData, PIPData, WaliKelas } from '../types';
import { fetchPIPDirectly, savePIPDirectly, syncAllPIPDirectly, LOCAL_STORAGE_PIP_KEY } from '../services/sheetsSync';
import { safeGetItem, safeSetItem } from '../utils/storage';
import { isAdminRole, isUserRole, getWaliKelasForUser } from '../utils/authUtils';
import { PIPImportModal } from './PIPImportModal';
import { 
  GraduationCap, 
  Search, 
  Download, 
  Upload,
  RefreshCw, 
  Check, 
  X, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  CheckCircle2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Users,
  Settings,
  AlertTriangle,
  Lock,
  Power,
  PowerOff,
  Edit2,
  Tag,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface PIPViewProps {
  students: Student[];
  appConfig: AppConfig;
  currentUser?: GTKData | null;
  waliKelasList?: WaliKelas[];
  onUpdateStudentKetPIP?: (studentId: string, ketDesil: string, ketPip: string) => Promise<void>;
}

// Opsi Target Sasaran Tingkat Kelas (bisa memilih lebih dari 1)
export const OPSI_TARGET_SASARAN = [
  { id: '10', label: 'Kelas 10', badge: 'X', color: 'indigo' },
  { id: '11', label: 'Kelas 11', badge: 'XI', color: 'sky' },
  { id: '12', label: 'Kelas 12', badge: 'XII', color: 'violet' }
];

// Helper mendeteksi tingkat kelas dari rombel siswa (10, 11, atau 12)
export const getTingkatKelas = (rombel: string): '10' | '11' | '12' | 'lainnya' => {
  const clean = String(rombel || '').trim().toUpperCase();
  if (/^(10\b|X\b|KELAS 10|KELAS X)/i.test(clean) || clean.startsWith('10 ') || clean.startsWith('10-') || clean.startsWith('X ')) {
    return '10';
  }
  if (/^(11\b|XI\b|KELAS 11|KELAS XI)/i.test(clean) || clean.startsWith('11 ') || clean.startsWith('11-') || clean.startsWith('XI ')) {
    return '11';
  }
  if (/^(12\b|XII\b|KELAS 12|KELAS XII)/i.test(clean) || clean.startsWith('12 ') || clean.startsWith('12-') || clean.startsWith('XII ')) {
    return '12';
  }
  const match = clean.match(/^(10|11|12)/);
  if (match) return match[1] as '10' | '11' | '12';
  return 'lainnya';
};

// Daftar opsi alasan layak PIP (Desil 1-4 di urutan 1)
const OPSI_ALASAN_LAYAK = [
  'Desil 1-4',
  'Rentan Putus Sekolah',
  'Yatim dan atau Piatu',
  'Berada di Panti Asuhan/Sosial',
  'Berkebutuhan Khusus',
  'Orang Tua terdampak PHK',
  'Orang tua berstatus narapidana',
  'murid dalam binaan LPKA'
];

// Helper normalisasi nama rombel/kelas
const cleanClass = (str?: string) => (str || '').trim().toUpperCase().replace(/\s+/g, ' ');

// Helper normalisasi status usulan PIP (Hanya 3 pilihan valid)
export const normalizePIPStatus = (status?: string): 'Belum diusul' | 'Usulan Sekolah' | 'Usulan Luar' => {
  if (status === 'Usulan Sekolah') return 'Usulan Sekolah';
  if (status === 'Usulan Luar') return 'Usulan Luar';
  return 'Belum diusul';
};

export const PIPView: React.FC<PIPViewProps> = ({ 
  students, 
  appConfig, 
  currentUser,
  waliKelasList = [],
  onUpdateStudentKetPIP
}) => {
  const isAdmin = !currentUser || !isUserRole(currentUser) || isAdminRole(currentUser);

  // Deteksi penugasan wali kelas pengguna yang sedang login
  const userWaliKelas = useMemo(() => {
    return getWaliKelasForUser(currentUser, waliKelasList);
  }, [currentUser, waliKelasList]);

  // Jika bukan admin dan merupakan wali kelas, aktifkan filter otomatis sesuai rombelnya
  const isWaliKelasOnly = !isAdmin && Boolean(userWaliKelas);
  const assignedKelas = userWaliKelas?.kelas ? cleanClass(userWaliKelas.kelas) : '';

  // Tab switcher state: Tab 1 (Usulan PIP) & Tab 2 (Ket PIP)
  const [activePIPNavTab, setActivePIPNavTab] = useState<'usulan' | 'ket_pip'>('usulan');

  // Tab 2: Ket PIP States
  const [tab2Search, setTab2Search] = useState<string>('');
  const [tab2SelectedRombel, setTab2SelectedRombel] = useState<string>(() => {
    return isWaliKelasOnly && assignedKelas ? assignedKelas : 'all';
  });
  const [tab2FilterStatus, setTab2FilterStatus] = useState<'all' | 'filled_desil' | 'empty_desil' | 'sudah_pip' | 'belum_pip'>('all');
  const [tab2SortField, setTab2SortField] = useState<'default' | 'rombel' | 'nama' | 'nisn' | 'ket_desil' | 'ket_pip'>('default');
  const [tab2SortDirection, setTab2SortDirection] = useState<'asc' | 'desc'>('asc');
  const [tab2CurrentPage, setTab2CurrentPage] = useState<number>(1);
  const [tab2ItemsPerPage, setTab2ItemsPerPage] = useState<number>(25);

  // Selalu sinkronkan filter rombel Tab 2 jika pengguna yang login bertindak sebagai wali kelas
  useEffect(() => {
    if (isWaliKelasOnly && assignedKelas) {
      setTab2SelectedRombel(userWaliKelas?.kelas || assignedKelas);
    }
  }, [isWaliKelasOnly, assignedKelas, userWaliKelas]);

  // Modal State Pemilihan Keterangan Desil (Tab 2)
  const [tab2ModalStudent, setTab2ModalStudent] = useState<Student | null>(null);
  const [tab2SelectedDesil, setTab2SelectedDesil] = useState<string | null>(null);
  const [tab2IsYatimPiatu, setTab2IsYatimPiatu] = useState<boolean>(false);
  const [tab2SavingStudentId, setTab2SavingStudentId] = useState<string | null>(null);

  const [pipList, setPipList] = useState<PIPData[]>(() => {
    return safeGetItem<PIPData[]>(LOCAL_STORAGE_PIP_KEY, []);
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'filled' | 'empty'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);
  const [sortField, setSortField] = useState<'default' | 'rombel' | 'nama' | 'nisn' | 'status'>('default');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);

  // Modal State untuk pemilihan alasan layak (Multi-select)
  const [selectedStudent, setSelectedStudent] = useState<PIPData | null>(null);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // State Modal Smart Impor PIP (Khusus Admin)
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  // Status Aktif/Nonaktif Usulan PIP
  const [isPipAktif, setIsPipAktif] = useState<boolean>(() => {
    const saved = safeGetItem<boolean>('dapodik_pip_aktif', true);
    return saved;
  });

  // Kuota Usulan PIP State
  const [kuota, setKuota] = useState<number>(() => safeGetItem<number>('dapodik_pip_kuota', 50));
  const [isEditingKuota, setIsEditingKuota] = useState<boolean>(false);
  const [tempKuota, setTempKuota] = useState<string>('50');

  // Target Sasaran Tingkat Kelas (Kelas 10, 11, 12 - bisa memilih lebih dari 1)
  const [targetSasaran, setTargetSasaran] = useState<string[]>(() => {
    const saved = safeGetItem<string[]>('dapodik_pip_target_sasaran', ['10', '11', '12']);
    return Array.isArray(saved) && saved.length > 0 ? saved : ['10', '11', '12'];
  });
  const [tempTargetSasaran, setTempTargetSasaran] = useState<string[]>(['10', '11', '12']);
  const [filterOnlyTarget, setFilterOnlyTarget] = useState<boolean>(true);

  // Ambil kuota, target sasaran, dan status aktif dari server saat komponen dimuat
  useEffect(() => {
    fetch('/api/pip/kuota')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.kuota === 'number') {
          setKuota(data.kuota);
          safeSetItem('dapodik_pip_kuota', data.kuota);
        }
        if (data && Array.isArray(data.targetSasaran) && data.targetSasaran.length > 0) {
          setTargetSasaran(data.targetSasaran);
          safeSetItem('dapodik_pip_target_sasaran', data.targetSasaran);
        }
        if (data && typeof data.aktif === 'boolean') {
          setIsPipAktif(data.aktif);
          safeSetItem('dapodik_pip_aktif', data.aktif);
        }
      })
      .catch(() => {});
  }, []);

  // Toggle status aktif/nonaktif usulan PIP
  const handleTogglePipAktif = async () => {
    const newStatus = !isPipAktif;
    setIsPipAktif(newStatus);
    safeSetItem('dapodik_pip_aktif', newStatus);
    
    if (newStatus) {
      showToast('Usulan PIP telah diaktifkan.');
    } else {
      showToast('Usulan PIP telah dinonaktifkan.');
    }

    try {
      await fetch('/api/pip/kuota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aktif: newStatus })
      });
    } catch (err) {
      console.warn('Gagal menyimpan status ke server:', err);
    }
  };

  // Hitung jumlah usulan yang sudah terisi
  const totalTerusul = useMemo(() => {
    return pipList.filter(item => Boolean((item.alasan_layak || item.alasanLayak || '').trim())).length;
  }, [pipList]);

  // Toggle satu target sasaran (multi-select)
  const handleToggleSasaran = (tingkat: string) => {
    let next: string[];
    if (targetSasaran.includes(tingkat)) {
      if (targetSasaran.length <= 1) {
        showToast('Minimal 1 target sasaran kelas harus dipilih.');
        return;
      }
      next = targetSasaran.filter(t => t !== tingkat);
    } else {
      next = [...targetSasaran, tingkat].sort();
    }
    setTargetSasaran(next);
    safeSetItem('dapodik_pip_target_sasaran', next);
    showToast(`Target sasaran diperbarui: ${next.map(t => `Kelas ${t}`).join(', ')}`);
    fetch('/api/pip/kuota', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetSasaran: next })
    }).catch(() => {});
  };

  // Pilih semua target sasaran (Kelas 10, 11, 12)
  const handleSelectAllSasaran = () => {
    const all = ['10', '11', '12'];
    setTargetSasaran(all);
    safeSetItem('dapodik_pip_target_sasaran', all);
    showToast('Semua target sasaran (Kelas 10, 11, 12) dipilih.');
    fetch('/api/pip/kuota', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetSasaran: all })
    }).catch(() => {});
  };

  // Handler simpan kuota dan target sasaran dari modal
  const handleSaveKuotaAndSasaran = async () => {
    const num = parseInt(tempKuota);
    if (isNaN(num) || num < 0) {
      alert('Jumlah kuota harus berupa angka minimal 0.');
      return;
    }
    if (tempTargetSasaran.length === 0) {
      alert('Pilih minimal 1 target sasaran kelas (10, 11, atau 12).');
      return;
    }

    setKuota(num);
    setTargetSasaran(tempTargetSasaran);
    safeSetItem('dapodik_pip_kuota', num);
    safeSetItem('dapodik_pip_target_sasaran', tempTargetSasaran);
    setIsEditingKuota(false);
    showToast(`Pengaturan disimpan: Kuota ${num} siswa, Target: ${tempTargetSasaran.map(t => `Kelas ${t}`).join(', ')}`);

    try {
      await fetch('/api/pip/kuota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kuota: num, targetSasaran: tempTargetSasaran })
      });
    } catch (err) {
      console.warn('Gagal menyimpan pengaturan ke server:', err);
    }
  };

  // Map NISN ke rombel dari sheet "data" (data siswa)
  const nisnToRombelMap = useMemo(() => {
    const map = new Map<string, string>();
    students.forEach((s) => {
      const cleanNisn = String(s.nisn || '').trim();
      const rombel = String(s.kelas || (s as any).rombel || '').trim();
      if (cleanNisn && rombel) {
        map.set(cleanNisn, rombel);
      }
      // Fallback juga map berdasarkan nama jika nisn kosong
      const cleanNama = String(s.nama || '').trim().toLowerCase();
      if (cleanNama && rombel && !map.has(`name_${cleanNama}`)) {
        map.set(`name_${cleanNama}`, rombel);
      }
    });
    return map;
  }, [students]);

  // Fungsi helper mencari rombel berdasarkan NISN (atau Nama)
  const getRombel = (item: PIPData): string => {
    const cleanNisn = String(item.nisn || '').trim();
    if (cleanNisn && nisnToRombelMap.has(cleanNisn)) {
      return nisnToRombelMap.get(cleanNisn) || '-';
    }
    const cleanNama = String(item.nama || '').trim().toLowerCase();
    if (cleanNama && nisnToRombelMap.has(`name_${cleanNama}`)) {
      return nisnToRombelMap.get(`name_${cleanNama}`) || '-';
    }
    return item.rombel || '-';
  };

  // Muat data dari Google Sheets (sheet "pip")
  const loadPIPData = async (force: boolean = false) => {
    setIsLoading(true);
    try {
      const data = await fetchPIPDirectly(appConfig);
      if (data && data.length > 0) {
        setPipList(data);
        safeSetItem(LOCAL_STORAGE_PIP_KEY, data);
      } else if (pipList.length === 0 && students.length > 0) {
        const initialFromStudents: PIPData[] = students.map((s, idx) => ({
          rowIndex: idx + 2,
          no: idx + 1,
          nisn: String(s.nisn || '').trim(),
          nama: String(s.nama || '').trim(),
          rombel: String(s.kelas || '').trim(),
          alasan_layak: '',
          alasanLayak: '',
          status: 'Belum diusul'
        }));
        setPipList(initialFromStudents);
      }
    } catch (err) {
      console.warn('Gagal memuat data PIP:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPIPData();
  }, [appConfig.spreadsheetId, appConfig.webAppUrl]);

  // Tampilkan notifikasi toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Handler ubah Status pengusulan oleh Admin (Belum diusul, Usulan Sekolah, Usulan Luar)
  const handleStatusChange = async (student: PIPData, newStatus: string) => {
    const studentKey = student.nisn || student.nama;
    setSavingStatusId(studentKey);
    const targetNisn = student.nisn;
    const targetNama = student.nama;

    // 1. Update state tabel lokal secara instan
    const updatedList = pipList.map((item) => {
      const isMatch = (targetNisn && item.nisn === targetNisn) ||
                      (targetNama && item.nama.trim().toLowerCase() === targetNama.trim().toLowerCase());
      if (isMatch) {
        return {
          ...item,
          status: newStatus
        };
      }
      return item;
    });

    setPipList(updatedList);
    safeSetItem(LOCAL_STORAGE_PIP_KEY, updatedList);
    showToast(`Status usulan untuk "${targetNama}" diubah menjadi "${newStatus}".`);

    // 2. Simpan perubahan ke server backend & Google Sheets (sheet: "pip")
    try {
      await savePIPDirectly(appConfig.webAppUrl, {
        nisn: targetNisn,
        nama: targetNama,
        alasan_layak: student.alasan_layak || student.alasanLayak || '',
        status: newStatus,
        rowIndex: student.rowIndex
      });
    } catch (err: any) {
      console.warn('Gagal menyimpan status PIP ke Google Sheets:', err);
    } finally {
      setSavingStatusId(null);
    }
  };

  // Buka modal saat tombol di kolom alasan layak diklik
  const handleOpenReasonModal = (item: PIPData) => {
    // Cek apakah usulan PIP aktif
    if (!isPipAktif) {
      showToast('⚠️ Usulan PIP saat ini sedang DINONAKTIFKAN. Silakan hubungi admin untuk mengaktifkan kembali.');
      return;
    }

    const currentAlasan = (item.alasan_layak || item.alasanLayak || '').trim();
    const isAlreadyProposed = Boolean(currentAlasan);
    const studentTingkat = getTingkatKelas(getRombel(item));
    const isOutsideTarget = studentTingkat !== 'lainnya' && !targetSasaran.includes(studentTingkat);

    if (!isAlreadyProposed) {
      if (isOutsideTarget) {
        showToast(`Perhatian: Siswa berada di ${getRombel(item)} (Kelas ${studentTingkat}), di luar target sasaran aktif.`);
      }
    }

    setSelectedStudent(item);
    
    // Parse alasan yang sudah ada menjadi array (dipisah oleh koma)
    if (currentAlasan) {
      const reasonsArray = currentAlasan.split(/,\s*/).filter(Boolean);
      setSelectedReasons(reasonsArray);
    } else {
      setSelectedReasons([]);
    }
  };

  // Simpan alasan yang dipilih user (Multi-select)
  const handleSaveReason = async () => {
    if (!selectedStudent) return;
    
    if (selectedReasons.length === 0) {
      alert('Mohon pilih minimal 1 alasan layak.');
      return;
    }

    // Gabungkan array menjadi string dipisah koma
    const finalReason = selectedReasons.join(', ');

    const wasAlreadyProposed = Boolean((selectedStudent.alasan_layak || selectedStudent.alasanLayak || '').trim());
    const studentTingkat = getTingkatKelas(getRombel(selectedStudent));
    const isOutsideTarget = studentTingkat !== 'lainnya' && !targetSasaran.includes(studentTingkat);

    if (!wasAlreadyProposed && isOutsideTarget) {
      alert(`Siswa ini berada di ${getRombel(selectedStudent)} (Kelas ${studentTingkat}), di luar target sasaran usulan PIP saat ini (${targetSasaran.map(t => 'Kelas ' + t).join(', ')}). Silakan tambahkan Kelas ${studentTingkat} ke target sasaran terlebih dahulu.`);
      return;
    }

    if (isWaliKelasOnly && assignedKelas && cleanClass(getRombel(selectedStudent)) !== assignedKelas) {
      alert(`Anda hanya dapat mengusulkan siswa dari rombel binaan Anda (${userWaliKelas?.kelas || assignedKelas}).`);
      return;
    }

    setIsSaving(true);
    const targetNisn = selectedStudent.nisn;
    const targetNama = selectedStudent.nama;

    // 1. Update state tabel lokal secara instan
    const updatedList = pipList.map((item) => {
      const isMatch = (targetNisn && item.nisn === targetNisn) ||
                      (targetNama && item.nama.trim().toLowerCase() === targetNama.trim().toLowerCase());
      if (isMatch) {
        return {
          ...item,
          alasan_layak: finalReason,
          alasanLayak: finalReason
        };
      }
      return item;
    });

    setPipList(updatedList);
    safeSetItem(LOCAL_STORAGE_PIP_KEY, updatedList);

    // 2. Kirim update ke backend server & Google Sheets (sheet: "pip")
    try {
      await savePIPDirectly(appConfig.webAppUrl, {
        nisn: targetNisn,
        nama: targetNama,
        alasan_layak: finalReason,
        status: selectedStudent.status || 'Belum diusul',
        rowIndex: selectedStudent.rowIndex
      });
      showToast(`Alasan layak untuk "${targetNama}" berhasil disimpan.`);
    } catch (err: any) {
      console.warn('Gagal menyimpan ke Google Sheets:', err);
      showToast(`Alasan disimpan di cache lokal. Sinkronisasi akan diperbarui otomatis.`);
    } finally {
      setIsSaving(false);
      setSelectedStudent(null);
    }
  };

  // Hapus/Kosongkan alasan
  const handleClearReason = async () => {
    if (!selectedStudent) return;
    setIsSaving(true);
    const targetNisn = selectedStudent.nisn;
    const targetNama = selectedStudent.nama;

    const updatedList = pipList.map((item) => {
      const isMatch = (targetNisn && item.nisn === targetNisn) ||
                      (targetNama && item.nama.trim().toLowerCase() === targetNama.trim().toLowerCase());
      if (isMatch) {
        return {
          ...item,
          alasan_layak: '',
          alasanLayak: ''
        };
      }
      return item;
    });

    setPipList(updatedList);
    safeSetItem(LOCAL_STORAGE_PIP_KEY, updatedList);

    try {
      await savePIPDirectly(appConfig.webAppUrl, {
        nisn: targetNisn,
        nama: targetNama,
        alasan_layak: '',
        status: selectedStudent.status || 'Belum diusul',
        rowIndex: selectedStudent.rowIndex
      });
      showToast(`Alasan layak untuk "${targetNama}" telah dikosongkan.`);
    } catch {
      showToast(`Alasan dikosongkan di cache.`);
    } finally {
      setIsSaving(false);
      setSelectedStudent(null);
    }
  };

  // Hitung statistik siswa per tingkat sasaran
  const sasaranStats = useMemo(() => {
    let count10 = 0;
    let count11 = 0;
    let count12 = 0;
    let filled10 = 0;
    let filled11 = 0;
    let filled12 = 0;

    pipList.forEach((item) => {
      const rombel = getRombel(item);
      const tingkat = getTingkatKelas(rombel);
      const isFilled = Boolean((item.alasan_layak || item.alasanLayak || '').trim());

      if (tingkat === '10') {
        count10++;
        if (isFilled) filled10++;
      } else if (tingkat === '11') {
        count11++;
        if (isFilled) filled11++;
      } else if (tingkat === '12') {
        count12++;
        if (isFilled) filled12++;
      }
    });

    const totalSasaranSiswa = 
      (targetSasaran.includes('10') ? count10 : 0) +
      (targetSasaran.includes('11') ? count11 : 0) +
      (targetSasaran.includes('12') ? count12 : 0);

    const filledSasaranSiswa = 
      (targetSasaran.includes('10') ? filled10 : 0) +
      (targetSasaran.includes('11') ? filled11 : 0) +
      (targetSasaran.includes('12') ? filled12 : 0);

    return {
      count10, count11, count12,
      filled10, filled11, filled12,
      totalSasaranSiswa,
      filledSasaranSiswa
    };
  }, [pipList, targetSasaran, nisnToRombelMap]);

  // Statistik usulan khusus rombel wali kelas (jika akun wali kelas)
  const waliKelasStats = useMemo(() => {
    if (!isWaliKelasOnly || !assignedKelas) return null;
    let totalInRombel = 0;
    let filledInRombel = 0;
    pipList.forEach((item) => {
      if (cleanClass(getRombel(item)) === assignedKelas) {
        totalInRombel++;
        if (Boolean((item.alasan_layak || item.alasanLayak || '').trim())) {
          filledInRombel++;
        }
      }
    });
    return {
      totalInRombel,
      filledInRombel,
      emptyInRombel: Math.max(0, totalInRombel - filledInRombel)
    };
  }, [pipList, isWaliKelasOnly, assignedKelas, nisnToRombelMap]);

  // Filter & Pencarian Data
  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pipList.filter((item) => {
      const rombel = getRombel(item);
      const rombelClean = cleanClass(rombel);

      if (isWaliKelasOnly && assignedKelas) {
        if (rombelClean !== assignedKelas) return false;
      }

      const tingkat = getTingkatKelas(rombel);
      if (filterOnlyTarget && tingkat !== 'lainnya' && !targetSasaran.includes(tingkat)) {
        return false;
      }

      const nama = String(item.nama || '').toLowerCase();
      const nisn = String(item.nisn || '').toLowerCase();
      const rombelLower = rombel.toLowerCase();
      const alasan = String(item.alasan_layak || item.alasanLayak || '').toLowerCase();
      const statusText = String(item.status || 'Belum diusul').toLowerCase();

      const matchesSearch = !q || nama.includes(q) || nisn.includes(q) || rombelLower.includes(q) || alasan.includes(q) || (isAdmin && statusText.includes(q));
      if (!matchesSearch) return false;

      const hasReason = Boolean(item.alasan_layak || item.alasanLayak);
      if (filterStatus === 'filled') return hasReason;
      if (filterStatus === 'empty') return !hasReason;
      return true;
    });
  }, [pipList, search, filterStatus, nisnToRombelMap, targetSasaran, filterOnlyTarget, isWaliKelasOnly, assignedKelas, isAdmin]);

  // Handler klik header kolom untuk toggle sortir
  const handleToggleSort = (field: 'rombel' | 'nama' | 'nisn' | 'status') => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField('default');
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Data terfilter yang disortir untuk tabel UI
  const processedData = useMemo(() => {
    const list = [...filteredData];
    if (sortField === 'rombel') {
      list.sort((a, b) => {
        const rA = getRombel(a) || '';
        const rB = getRombel(b) || '';
        if (rA === '-' && rB !== '-') return 1;
        if (rA !== '-' && rB === '-') return -1;
        const cmp = rA.localeCompare(rB, 'id', { numeric: true, sensitivity: 'base' });
        if (cmp !== 0) return sortDirection === 'asc' ? cmp : -cmp;
        return (a.nama || '').localeCompare(b.nama || '', 'id');
      });
    } else if (sortField === 'nama') {
      list.sort((a, b) => {
        const cmp = (a.nama || '').localeCompare(b.nama || '', 'id');
        return sortDirection === 'asc' ? cmp : -cmp;
      });
    } else if (sortField === 'nisn') {
      list.sort((a, b) => {
        const cmp = (a.nisn || '').localeCompare(b.nisn || '', 'id');
        return sortDirection === 'asc' ? cmp : -cmp;
      });
    } else if (sortField === 'status') {
      list.sort((a, b) => {
        const sA = a.status || 'Belum diusul';
        const sB = b.status || 'Belum diusul';
        const cmp = sA.localeCompare(sB, 'id');
        return sortDirection === 'asc' ? cmp : -cmp;
      });
    }
    return list;
  }, [filteredData, sortField, sortDirection]);

  // Pagination
  const totalItems = processedData.length;
  const effectivePerPage = itemsPerPage === -1 ? totalItems : itemsPerPage;
  const totalPages = Math.max(1, Math.ceil(totalItems / (effectivePerPage || 1)));
  const paginatedData = useMemo(() => {
    if (itemsPerPage === -1) return processedData;
    const start = (currentPage - 1) * itemsPerPage;
    return processedData.slice(start, start + itemsPerPage);
  }, [processedData, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Download Excel (Termasuk status untuk akun Admin)
  const handleDownloadExcel = () => {
    if (filteredData.length === 0) {
      alert('Tidak ada data untuk diekspor ke Excel.');
      return;
    }

    const sortedData = [...filteredData].sort((a, b) => {
      const rombelA = getRombel(a) || '';
      const rombelB = getRombel(b) || '';
      if (rombelA === '-' && rombelB !== '-') return 1;
      if (rombelA !== '-' && rombelB === '-') return -1;
      const rombelComparison = rombelA.localeCompare(rombelB, 'id', { numeric: true, sensitivity: 'base' });
      if (rombelComparison !== 0) return rombelComparison;
      const namaA = (a.nama || '').trim();
      const namaB = (b.nama || '').trim();
      return namaA.localeCompare(namaB, 'id', { sensitivity: 'base' });
    });

    const exportRows = sortedData.map((item, idx) => {
      const row: any = {
        'No': idx + 1,
        'NISN': item.nisn || '',
        'Nama_Murid': item.nama || '',
        'Rombel': getRombel(item),
        'alasan_layak': item.alasan_layak || item.alasanLayak || ''
      };
      if (isAdmin) {
        row['Status'] = item.status || 'Belum diusul';
      }
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    worksheet['!cols'] = isAdmin
      ? [
          { wch: 6 }, { wch: 16 }, { wch: 35 }, { wch: 18 }, { wch: 45 }, { wch: 20 }
        ]
      : [
          { wch: 6 }, { wch: 16 }, { wch: 35 }, { wch: 18 }, { wch: 45 }
        ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Usulan PIP');
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Usulan_PIP_SMKN1_Palopo_${dateStr}.xlsx`);
  };

  // Handler mengeksekusi hasil Smart Impor PIP (Merge / Replace)
  const handleApplyImportPIP = async (
    finalList: PIPData[], 
    mode: 'merge' | 'replace',
    stats: { matchingCount: number; newCount: number; retainedCount: number; finalTotal: number; matchedStudentCount: number }
  ) => {
    setIsImportModalOpen(false);
    setIsLoading(true);
    setToastMessage(`Menyimpan ${finalList.length} data usulan PIP (${mode === 'merge' ? 'Smart Merge' : 'Ganti Semua'})...`);

    try {
      const res = await syncAllPIPDirectly(appConfig.webAppUrl || '', finalList, mode);
      setPipList(finalList);
      if (res.success) {
        setToastMessage(`Sukses: ${res.message} (${stats.matchingCount} data diperbarui, ${stats.newCount} data baru ditambahkan)`);
      } else {
        setToastMessage(`Data berhasil disimpan di penyimpanan lokal (${finalList.length} siswa)`);
      }
    } catch (err: any) {
      setPipList(finalList);
      setToastMessage(`Data tersimpan di penyimpanan browser: ${err?.message || 'Gagal tersinkron'}`);
    } finally {
      setIsLoading(false);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  // --- Tab 2: Keterangan PIP & Desil Helpers & Handlers ---

  // Cek otorisasi edit data siswa (Admin atau Wali Kelas rombel bersangkutan)
  const canEditStudent = (student: Student) => {
    if (isAdmin) return true;
    if (isWaliKelasOnly && assignedKelas) {
      const studentRombel = cleanClass(student.kelas || (student as any).rombel);
      return studentRombel === assignedKelas;
    }
    return false;
  };

  // Parsing keterangan desil saat ini (ekstrak desil 1-5 dan yatim piatu)
  const parseKetDesil = (val: string = ''): { desil: string | null; yatimPiatu: boolean } => {
    const clean = String(val || '').trim();
    let desil: string | null = null;
    for (const d of ['Desil 1', 'Desil 2', 'Desil 3', 'Desil 4', 'Desil 5']) {
      if (new RegExp(`\\b${d}\\b`, 'i').test(clean)) {
        desil = d;
        break;
      }
    }
    const yatimPiatu = /yatim\s*piatu/i.test(clean);
    return { desil, yatimPiatu };
  };

  // Buka modal pemilihan desil
  const handleOpenDesilModal = (student: Student) => {
    if (!canEditStudent(student)) {
      showToast(`Hanya Wali Kelas rombel ${student.kelas || (student as any).rombel} atau Admin yang dapat mengubah data.`);
      return;
    }
    setTab2ModalStudent(student);
    const parsed = parseKetDesil(student.ket_desil || student.ketDesil);
    setTab2SelectedDesil(parsed.desil);
    setTab2IsYatimPiatu(parsed.yatimPiatu);
  };

  // Simpan hasil modal desil
  const handleSaveModalDesil = async () => {
    if (!tab2ModalStudent) return;
    const parts: string[] = [];
    if (tab2SelectedDesil) parts.push(tab2SelectedDesil);
    if (tab2IsYatimPiatu) parts.push('Yatim Piatu');
    const combinedDesil = parts.join(', ');

    const currentKetPip = tab2ModalStudent.ket_pip || tab2ModalStudent.ketPip || '';
    setTab2SavingStudentId(tab2ModalStudent.id);

    try {
      if (onUpdateStudentKetPIP) {
        await onUpdateStudentKetPIP(tab2ModalStudent.id, combinedDesil, currentKetPip);
      }
      showToast(`Keterangan desil untuk "${tab2ModalStudent.nama}" disimpan: ${combinedDesil || 'Tanpa Desil'}`);
      setTab2ModalStudent(null);
    } catch (err: any) {
      showToast(`Gagal menyimpan: ${err?.message || 'Error'}`);
    } finally {
      setTab2SavingStudentId(null);
    }
  };

  // Handler ubah Keterangan PIP (Sudah dapat PIP / Belum dapat PIP / Kosong)
  const handleChangeKetPip = async (student: Student, newKetPip: string) => {
    if (!canEditStudent(student)) {
      showToast(`Hanya Wali Kelas rombel ${student.kelas || (student as any).rombel} atau Admin yang dapat mengubah status PIP.`);
      return;
    }
    const currentDesil = student.ket_desil || student.ketDesil || '';
    setTab2SavingStudentId(student.id);

    try {
      if (onUpdateStudentKetPIP) {
        await onUpdateStudentKetPIP(student.id, currentDesil, newKetPip);
      }
      showToast(`Keterangan PIP untuk "${student.nama}" diperbarui: ${newKetPip || 'Belum diisi'}`);
    } catch (err: any) {
      showToast(`Gagal menyimpan status PIP: ${err?.message || 'Error'}`);
    } finally {
      setTab2SavingStudentId(null);
    }
  };

  // Helper cek status keaktifan siswa (selaras dengan Dashboard, Rekap, dan Mutasi)
  // Siswa yang berstatus Tidak Aktif, Mutasi Keluar, Mengundurkan Diri, Lulus, dsb. otomatis tidak tampil
  const isStudentActive = (s: Student): boolean => {
    const st = String(s.status || '').toLowerCase().trim();
    if (
      st === 'tidak aktif' || 
      st.includes('tidak') || 
      st === 'mutasi' || 
      st === 'keluar' || 
      st === 'mengundurkan diri' || 
      st === 'lulus' || 
      st === 'dikeluarkan' || 
      st === 'putus sekolah' || 
      st === 'wafat' ||
      st === 'hilang'
    ) {
      return false;
    }
    const reg = String(s.statusRegistrasi || '').toLowerCase().trim();
    if (reg === 'lulus' || reg === 'keluar' || reg === 'mutasi') {
      return false;
    }
    const ket = String(s.ket || '').toLowerCase().trim();
    if (
      ket === 'mutasi' || 
      ket === 'dikeluarkan' || 
      ket === 'mengundurkan diri' || 
      ket === 'putus sekolah' || 
      ket === 'wafat' || 
      ket === 'hilang'
    ) {
      return false;
    }
    return true;
  };

  // Hanya data siswa yang berstatus aktif (hanya siswa aktif yang tampil di Tab 2 Keterangan PIP & Desil)
  const activeStudents = useMemo(() => {
    return students.filter(isStudentActive);
  }, [students]);

  // Daftar seluruh Rombel unik dari data siswa aktif
  const distinctRombels = useMemo(() => {
    const set = new Set<string>();
    activeStudents.forEach(s => {
      const r = (s.kelas || (s as any).rombel || '').trim();
      if (r) set.add(r);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id', { numeric: true, sensitivity: 'base' }));
  }, [activeStudents]);

  // Statistik Keterangan PIP & Desil (Tab 2) - Hanya menghitung siswa aktif dan sesuai penugasan
  const tab2Stats = useMemo(() => {
    let totalSiswa = 0;
    let filledDesil = 0;
    let sudahPip = 0;
    let belumPip = 0;

    activeStudents.forEach(s => {
      const rombel = cleanClass(s.kelas || (s as any).rombel || '');
      // Jika login sebagai Wali Kelas, batasi statistik HANYA untuk rombel binaannya
      if (isWaliKelasOnly && assignedKelas && rombel !== assignedKelas) {
        return;
      }
      if (!isWaliKelasOnly && tab2SelectedRombel !== 'all' && rombel !== cleanClass(tab2SelectedRombel)) {
        return;
      }
      totalSiswa++;
      if ((s.ket_desil || s.ketDesil || '').trim()) filledDesil++;
      const pip = (s.ket_pip || s.ketPip || '').trim();
      if (pip === 'Sudah dapat PIP') sudahPip++;
      else if (pip === 'Belum dapat PIP') belumPip++;
    });

    return { totalSiswa, filledDesil, sudahPip, belumPip };
  }, [activeStudents, isWaliKelasOnly, assignedKelas, tab2SelectedRombel]);

  // Data Terfilter untuk Tab 2 - HANYA siswa aktif dan rombel sesuai akun wali kelas yang login
  const tab2FilteredData = useMemo(() => {
    const q = tab2Search.trim().toLowerCase();
    return activeStudents.filter(s => {
      const rombel = cleanClass(s.kelas || (s as any).rombel || '');

      // Jika user login adalah Wali Kelas, data yang ditampilkan STRICTLY rombel binaannya
      if (isWaliKelasOnly && assignedKelas) {
        if (rombel !== assignedKelas) return false;
      } else if (tab2SelectedRombel !== 'all') {
        if (rombel !== cleanClass(tab2SelectedRombel)) return false;
      }

      const nama = (s.nama || '').toLowerCase();
      const nisn = (s.nisn || '').toLowerCase();
      const rombelRaw = (s.kelas || (s as any).rombel || '').toLowerCase();
      const ketDesil = (s.ket_desil || s.ketDesil || '').toLowerCase();
      const ketPip = (s.ket_pip || s.ketPip || '').toLowerCase();

      const matchesSearch = !q ||
        nama.includes(q) ||
        nisn.includes(q) ||
        rombelRaw.includes(q) ||
        ketDesil.includes(q) ||
        ketPip.includes(q);

      if (!matchesSearch) return false;

      const hasDesil = Boolean((s.ket_desil || s.ketDesil || '').trim());
      const rawKetPip = (s.ket_pip || s.ketPip || '').trim();

      if (tab2FilterStatus === 'filled_desil') return hasDesil;
      if (tab2FilterStatus === 'empty_desil') return !hasDesil;
      if (tab2FilterStatus === 'sudah_pip') return rawKetPip === 'Sudah dapat PIP';
      if (tab2FilterStatus === 'belum_pip') return rawKetPip === 'Belum dapat PIP';

      return true;
    });
  }, [activeStudents, tab2Search, tab2SelectedRombel, tab2FilterStatus, isWaliKelasOnly, assignedKelas]);

  // Toggle sort kolom Tab 2
  const handleToggleTab2Sort = (field: 'rombel' | 'nama' | 'nisn' | 'ket_desil' | 'ket_pip') => {
    if (tab2SortField === field) {
      if (tab2SortDirection === 'asc') {
        setTab2SortDirection('desc');
      } else {
        setTab2SortField('default');
        setTab2SortDirection('asc');
      }
    } else {
      setTab2SortField(field);
      setTab2SortDirection('asc');
    }
  };

  // Data Tersortir untuk Tab 2
  const tab2SortedData = useMemo(() => {
    const list = [...tab2FilteredData];
    list.sort((a, b) => {
      if (tab2SortField === 'nama') {
        const cmp = (a.nama || '').localeCompare(b.nama || '', 'id');
        return tab2SortDirection === 'asc' ? cmp : -cmp;
      }
      if (tab2SortField === 'nisn') {
        const cmp = (a.nisn || '').localeCompare(b.nisn || '', 'id');
        return tab2SortDirection === 'asc' ? cmp : -cmp;
      }
      if (tab2SortField === 'rombel') {
        const rA = a.kelas || (a as any).rombel || '';
        const rB = b.kelas || (b as any).rombel || '';
        const cmp = rA.localeCompare(rB, 'id', { numeric: true, sensitivity: 'base' });
        if (cmp !== 0) return tab2SortDirection === 'asc' ? cmp : -cmp;
        return (a.nama || '').localeCompare(b.nama || '', 'id');
      }
      if (tab2SortField === 'ket_desil') {
        const dA = a.ket_desil || a.ketDesil || '';
        const dB = b.ket_desil || b.ketDesil || '';
        const cmp = dA.localeCompare(dB, 'id');
        if (cmp !== 0) return tab2SortDirection === 'asc' ? cmp : -cmp;
        return (a.nama || '').localeCompare(b.nama || '', 'id');
      }
      if (tab2SortField === 'ket_pip') {
        const pA = a.ket_pip || a.ketPip || '';
        const pB = b.ket_pip || b.ketPip || '';
        const cmp = pA.localeCompare(pB, 'id');
        if (cmp !== 0) return tab2SortDirection === 'asc' ? cmp : -cmp;
        return (a.nama || '').localeCompare(b.nama || '', 'id');
      }
      const rA = a.kelas || (a as any).rombel || '';
      const rB = b.kelas || (b as any).rombel || '';
      const cmp = rA.localeCompare(rB, 'id', { numeric: true, sensitivity: 'base' });
      if (cmp !== 0) return cmp;
      return (a.nama || '').localeCompare(b.nama || '', 'id');
    });
    return list;
  }, [tab2FilteredData, tab2SortField, tab2SortDirection]);

  // Pagination Tab 2
  const tab2TotalItems = tab2SortedData.length;
  const tab2EffectivePerPage = tab2ItemsPerPage === -1 ? tab2TotalItems : tab2ItemsPerPage;
  const tab2TotalPages = Math.max(1, Math.ceil(tab2TotalItems / (tab2EffectivePerPage || 1)));
  const tab2PaginatedData = useMemo(() => {
    if (tab2ItemsPerPage === -1) return tab2SortedData;
    const start = (tab2CurrentPage - 1) * tab2ItemsPerPage;
    return tab2SortedData.slice(start, start + tab2ItemsPerPage);
  }, [tab2SortedData, tab2CurrentPage, tab2ItemsPerPage]);

  // Handler Download Excel Tab 2 (Hanya 6 kolom: no, nisn, nama, rombel, ket_desil, ket_pip)
  const handleDownloadKetPipExcel = () => {
    if (tab2SortedData.length === 0) {
      alert('Tidak ada data Keterangan PIP untuk diekspor ke Excel.');
      return;
    }

    const exportRows = tab2SortedData.map((s, idx) => ({
      'no': idx + 1,
      'nisn': s.nisn || '',
      'nama': s.nama || '',
      'rombel': s.kelas || (s as any).rombel || '',
      'ket_desil': s.ket_desil || s.ketDesil || '',
      'ket_pip': s.ket_pip || s.ketPip || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    worksheet['!cols'] = [
      { wch: 6 },   // no
      { wch: 16 },  // nisn
      { wch: 35 },  // nama
      { wch: 18 },  // rombel
      { wch: 25 },  // ket_desil
      { wch: 22 }   // ket_pip
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ket PIP');
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Ket_PIP_SMKN1_Palopo_${dateStr}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-200 ${
          toastMessage.includes('DINONAKTIFKAN') 
            ? 'bg-rose-600 text-white' 
            : 'bg-slate-900 text-white'
        }`}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Tab Switcher: Tab 1 (Usulan PIP) & Tab 2 (Ket PIP) */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
        <button
          type="button"
          onClick={() => setActivePIPNavTab('usulan')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activePIPNavTab === 'usulan'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Tab 1: Usulan PIP</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            activePIPNavTab === 'usulan' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'
          }`}>
            {totalTerusul} Usulan
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActivePIPNavTab('ket_pip')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activePIPNavTab === 'ket_pip'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Tab 2: Ket PIP</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            activePIPNavTab === 'ket_pip' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'
          }`}>
            {tab2Stats.filledDesil} / {tab2Stats.totalSiswa} Siswa
          </span>
        </button>
      </div>

      {activePIPNavTab === 'usulan' && (
        <>
          {/* Top Header Bar */}
          <div className="bg-white p-4 lg:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-600" /> Usulan PIP
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Klik pada tombol di kolom "Alasan Layak" untuk menentukan kelayakan usulan PIP (Bisa memilih lebih dari 1).
          </p>
          {isWaliKelasOnly && userWaliKelas && (
            <div className="mt-1.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-semibold">
                <Users className="w-3.5 h-3.5" />
                <span>Wali Kelas: {userWaliKelas.nama || currentUser?.nama} &bull; Rombel {userWaliKelas.kelas}</span>
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari nama, NISN, rombel..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder-slate-400"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e: any) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="py-2 pl-3 pr-8 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none"
            >
              <option value="all">
                {isWaliKelasOnly && userWaliKelas
                  ? `Siswa Rombel ${userWaliKelas.kelas} (${waliKelasStats?.totalInRombel ?? filteredData.length})`
                  : `Semua Siswa (${pipList.length})`}
              </option>
              <option value="filled">
                Sudah Diusulkan ({isWaliKelasOnly ? (waliKelasStats?.filledInRombel ?? totalTerusul) : totalTerusul})
              </option>
              <option value="empty">
                Belum Diusulkan ({isWaliKelasOnly ? (waliKelasStats?.emptyInRombel ?? 0) : Math.max(0, pipList.length - totalTerusul)})
              </option>
            </select>
            <Filter className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={() => loadPIPData(true)}
            disabled={isLoading}
            title="Segarkan data dari spreadsheet"
            className="p-2 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0"
                title="Smart Impor data Usulan PIP dari file Excel"
              >
                <Upload className="w-4 h-4" />
                <span>Smart Impor</span>
              </button>
              <button
                onClick={handleDownloadExcel}
                className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Download Excel</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status Usulan PIP Bar */}
      <div className={`border rounded-2xl p-4 lg:p-5 transition-all ${
        isPipAktif 
          ? 'bg-white border-slate-200 shadow-xs' 
          : 'bg-rose-50/70 border-rose-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${
              isPipAktif 
                ? 'bg-emerald-50 text-emerald-700' 
                : 'bg-rose-100 text-rose-700'
            }`}>
              {isPipAktif ? <Power className="w-5 h-5" /> : <PowerOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status Usulan PIP
                </span>
                {isPipAktif ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                    AKTIF
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-600 text-white animate-pulse">
                    DINONAKTIFKAN
                  </span>
                )}
              </div>
              {!isPipAktif && (
                <p className="text-xs text-rose-700 mt-1">
                  Usulan PIP sedang ditutup.
                </p>
              )}
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={handleTogglePipAktif}
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer shrink-0 ${
                isPipAktif
                  ? 'border-rose-300 hover:border-rose-400 bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800'
                  : 'border-emerald-300 hover:border-emerald-400 bg-white hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800'
              }`}
              title={isPipAktif ? 'Nonaktifkan usulan PIP' : 'Aktifkan usulan PIP'}
            >
              {isPipAktif ? (
                <>
                  <PowerOff className="w-3.5 h-3.5" />
                  <span>Nonaktifkan</span>
                </>
              ) : (
                <>
                  <Power className="w-3.5 h-3.5" />
                  <span>Aktifkan</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Clean Grid Table */}
      <div className={`bg-white border rounded-xl shadow-2xs overflow-hidden w-full ${
        !isPipAktif ? 'border-rose-200' : 'border-slate-300'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold text-xs border-b border-slate-300 select-none">
                <th className="py-2.5 px-3 text-center border-r border-slate-300 w-12">No</th>
                <th 
                  onClick={() => handleToggleSort('nisn')}
                  className="py-2.5 px-4 border-r border-slate-300 w-36 cursor-pointer hover:bg-slate-200/70 transition-colors"
                  title="Klik untuk menyortir NISN"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>NISN</span>
                    {sortField === 'nisn' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleToggleSort('nama')}
                  className="py-2.5 px-4 border-r border-slate-300 min-w-[220px] cursor-pointer hover:bg-slate-200/70 transition-colors"
                  title="Klik untuk menyortir Nama Murid"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>Nama Murid</span>
                    {sortField === 'nama' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleToggleSort('rombel')}
                  className="py-2.5 px-3 border-r border-slate-300 w-32 cursor-pointer hover:bg-slate-200/70 transition-colors"
                  title="Klik untuk menyortir Rombel (A-Z)"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>Rombel</span>
                    {sortField === 'rombel' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>
                <th className="py-2.5 px-4 min-w-[260px]">Alasan Layak</th>
                {isAdmin && (
                  <th 
                    onClick={() => handleToggleSort('status')}
                    className="py-2.5 px-3 border-l border-slate-300 w-44 cursor-pointer hover:bg-slate-200/70 transition-colors select-none"
                    title="Klik untuk menyortir Status"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span>Status</span>
                      {sortField === 'status' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {isLoading && pipList.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                      <span>Memuat data usulan PIP dari Google Sheets...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="py-14 text-center text-slate-500 italic">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <AlertCircle className="w-6 h-6 text-slate-400" />
                      <span>Tidak ada data siswa ditemukan</span>
                      {search && <span className="text-[11px] text-slate-400">Cobalah kata kunci pencarian yang berbeda</span>}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, idx) => {
                  const itemIndex = (currentPage - 1) * (itemsPerPage === -1 ? totalItems : itemsPerPage) + idx + 1;
                  const rombel = getRombel(item);
                  const reason = (item.alasan_layak || item.alasanLayak || '').trim();

                  return (
                    <tr 
                      key={item.nisn ? `pip-${item.nisn}-${idx}` : `pip-row-${idx}`}
                      className={`hover:bg-indigo-50/40 transition-colors border-b border-slate-200 group ${
                        !isPipAktif ? 'opacity-75' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center border-r border-slate-200 text-slate-600 font-medium">{itemIndex}</td>
                      <td className="py-2.5 px-4 border-r border-slate-200 font-mono text-slate-700">{item.nisn || '-'}</td>
                      <td className="py-2.5 px-4 border-r border-slate-200 font-semibold text-slate-900">
                        <span className="truncate">{item.nama || '-'}</span>
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 text-slate-700">{rombel !== '-' ? rombel : '-'}</td>
                      
                      {/* KOLOM ALASAN LAYAK DENGAN TOMBOL KLIK */}
                      <td className="py-2.5 px-4 text-slate-800">
                        <button
                          onClick={() => handleOpenReasonModal(item)}
                          disabled={!isPipAktif}
                          className={`w-full text-left flex items-center justify-between gap-2 p-1.5 -mx-1.5 rounded-lg transition-colors group/btn border border-transparent ${
                            isPipAktif
                              ? 'hover:bg-indigo-50/60 hover:border-indigo-200 cursor-pointer'
                              : 'cursor-not-allowed opacity-60'
                          }`}
                          title={!isPipAktif ? 'Usulan PIP sedang dinonaktifkan' : 'Klik untuk memilih atau mengubah alasan layak PIP'}
                        >
                          <span className={`flex-1 truncate text-xs ${reason ? 'text-slate-800 font-medium' : 'text-slate-400 italic'}`}>
                            {reason || (isPipAktif ? 'Klik untuk pilih alasan' : 'Usulan ditutup')}
                          </span>
                          {isPipAktif && (
                            <span className="text-[10px] text-indigo-600 font-semibold opacity-0 group-hover/btn:opacity-100 transition-opacity shrink-0">
                              {reason ? 'Ubah' : 'Pilih'} &rarr;
                            </span>
                          )}
                        </button>
                      </td>

                      {/* KOLOM STATUS (KHUSUS ADMIN) */}
                      {isAdmin && (
                        <td className="py-2.5 px-3 border-l border-slate-200 text-slate-800">
                          {(() => {
                            const curStatus = normalizePIPStatus(item.status);
                            return (
                              <div className="relative inline-block w-full min-w-[130px]">
                                <select
                                  value={curStatus}
                                  onChange={(e) => handleStatusChange(item, e.target.value)}
                                  disabled={savingStatusId === (item.nisn || item.nama)}
                                  className={`w-full py-1 px-2.5 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs ${
                                    curStatus === 'Usulan Sekolah'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100/70'
                                      : curStatus === 'Usulan Luar'
                                      ? 'bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100/70'
                                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200/70'
                                  }`}
                                  title="Pilih Status Usulan PIP (Hanya Admin)"
                                >
                                  <option value="Belum diusul">Belum diusul</option>
                                  <option value="Usulan Sekolah">Usulan Sekolah</option>
                                  <option value="Usulan Luar">Usulan Luar</option>
                                </select>
                              </div>
                            );
                          })()}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Clean Footer Pagination */}
        <div className="py-3 px-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span>
              Menampilkan <span className="font-semibold text-slate-900">{filteredData.length > 0 ? (currentPage - 1) * (itemsPerPage === -1 ? totalItems : itemsPerPage) + 1 : 0}</span> - <span className="font-semibold text-slate-900">{itemsPerPage === -1 ? totalItems : Math.min(currentPage * itemsPerPage, totalItems)}</span> dari <span className="font-semibold text-slate-900">{totalItems}</span> siswa
            </span>
            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-slate-400">Tampilkan:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-300 rounded-md px-1.5 py-0.5 text-xs text-slate-700 cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={-1}>Semua ({totalItems})</option>
              </select>
            </div>
          </div>

          {itemsPerPage !== -1 && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-1.5 border border-slate-300 bg-white hover:bg-slate-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="px-2 font-medium text-slate-700">Halaman {currentPage} dari {totalPages}</div>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-1.5 border border-slate-300 bg-white hover:bg-slate-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Halaman Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
      </>
      )}

      {/* TAB 2: KETERANGAN PIP & DESIL */}
      {activePIPNavTab === 'ket_pip' && (
        <>
          {/* Top Header Bar Tab 2 */}
          <div className="bg-white p-4 lg:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-600" /> Keterangan PIP & Desil Siswa
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengelolaan keterangan desil (Desil 1 s/d 5, Yatim Piatu) dan status penerimaan PIP untuk Wali Kelas & Admin.
              </p>
              {isWaliKelasOnly && userWaliKelas && (
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-semibold">
                    <Users className="w-3.5 h-3.5" />
                    <span>Wali Kelas: {userWaliKelas.nama || currentUser?.nama} &bull; Rombel {userWaliKelas.kelas}</span>
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:w-56">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={tab2Search}
                  onChange={(e) => {
                    setTab2Search(e.target.value);
                    setTab2CurrentPage(1);
                  }}
                  placeholder="Cari nama, NISN, desil..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder-slate-400"
                />
                {tab2Search && (
                  <button 
                    onClick={() => setTab2Search('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Rombel */}
              <div className="relative">
                <select
                  value={isWaliKelasOnly && assignedKelas ? (userWaliKelas?.kelas || assignedKelas) : tab2SelectedRombel}
                  onChange={(e) => {
                    if (!isWaliKelasOnly) {
                      setTab2SelectedRombel(e.target.value);
                      setTab2CurrentPage(1);
                    }
                  }}
                  disabled={isWaliKelasOnly && Boolean(assignedKelas)}
                  className="py-2 pl-3 pr-8 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                  title={isWaliKelasOnly ? `Rombel terkunci sesuai rombel binaan Anda (${userWaliKelas?.kelas || assignedKelas})` : 'Pilih Rombel'}
                >
                  {isWaliKelasOnly && userWaliKelas ? (
                    <option value={userWaliKelas.kelas}>Rombel: {userWaliKelas.kelas}</option>
                  ) : (
                    <>
                      <option value="all">Semua Rombel ({activeStudents.length})</option>
                      {distinctRombels.map((r) => (
                        <option key={r} value={r}>Rombel {r}</option>
                      ))}
                    </>
                  )}
                </select>
                <Filter className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Filter Status Desil & PIP */}
              <div className="relative">
                <select
                  value={tab2FilterStatus}
                  onChange={(e: any) => {
                    setTab2FilterStatus(e.target.value);
                    setTab2CurrentPage(1);
                  }}
                  className="py-2 pl-3 pr-8 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none"
                >
                  <option value="all">Semua Status ({tab2Stats.totalSiswa})</option>
                  <option value="filled_desil">Sudah Memiliki Desil ({tab2Stats.filledDesil})</option>
                  <option value="empty_desil">Belum Ada Desil ({Math.max(0, tab2Stats.totalSiswa - tab2Stats.filledDesil)})</option>
                  <option value="sudah_pip">Sudah dapat PIP ({tab2Stats.sudahPip})</option>
                  <option value="belum_pip">Belum dapat PIP ({tab2Stats.belumPip})</option>
                </select>
                <Filter className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Unduh Excel Tab 2 (Strictly: no, nisn, nama, rombel, ket_desil, ket_pip) */}
              <button
                type="button"
                onClick={handleDownloadKetPipExcel}
                className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0"
                title="Unduh Data Keterangan PIP ke Excel (6 Kolom: no, nisn, nama, rombel, ket_desil, ket_pip)"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Excel</span>
              </button>
            </div>
          </div>

          {/* 4 Summary Stat Cards Tab 2 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-bold text-slate-900 leading-tight">{tab2Stats.totalSiswa}</div>
                <div className="text-[11px] font-semibold text-slate-500 truncate">Total Siswa</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <Tag className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-bold text-amber-600 leading-tight">{tab2Stats.filledDesil}</div>
                <div className="text-[11px] font-semibold text-slate-500 truncate">Terisi Ket Desil</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-bold text-emerald-600 leading-tight">{tab2Stats.sudahPip}</div>
                <div className="text-[11px] font-semibold text-slate-500 truncate">Sudah dapat PIP</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-bold text-rose-600 leading-tight">{tab2Stats.belumPip}</div>
                <div className="text-[11px] font-semibold text-slate-500 truncate">Belum dapat PIP</div>
              </div>
            </div>
          </div>

          {/* Tabel Tab 2: Ket PIP (no, nisn, nama_murid, rombel, ket_desil, ket_pip) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider select-none">
                    <th className="py-3 px-3 text-center w-12 border-r border-slate-200">No</th>
                    
                    <th 
                      onClick={() => handleToggleTab2Sort('nisn')}
                      className="py-3 px-4 border-r border-slate-200 w-36 cursor-pointer hover:bg-slate-200/70 transition-colors"
                      title="Klik untuk menyortir NISN"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>NISN</span>
                        {tab2SortField === 'nisn' ? (
                          tab2SortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>

                    <th 
                      onClick={() => handleToggleTab2Sort('nama')}
                      className="py-3 px-4 border-r border-slate-200 min-w-64 cursor-pointer hover:bg-slate-200/70 transition-colors"
                      title="Klik untuk menyortir Nama"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>Nama Murid</span>
                        {tab2SortField === 'nama' ? (
                          tab2SortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>

                    <th 
                      onClick={() => handleToggleTab2Sort('rombel')}
                      className="py-3 px-3 border-r border-slate-200 w-36 cursor-pointer hover:bg-slate-200/70 transition-colors"
                      title="Klik untuk menyortir Rombel"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>Rombel</span>
                        {tab2SortField === 'rombel' ? (
                          tab2SortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>

                    <th 
                      onClick={() => handleToggleTab2Sort('ket_desil')}
                      className="py-3 px-4 border-r border-slate-200 w-52 cursor-pointer hover:bg-slate-200/70 transition-colors"
                      title="Klik untuk menyortir Ket Desil"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>Ket Desil</span>
                        {tab2SortField === 'ket_desil' ? (
                          tab2SortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>

                    <th 
                      onClick={() => handleToggleTab2Sort('ket_pip')}
                      className="py-3 px-4 w-48 cursor-pointer hover:bg-slate-200/70 transition-colors"
                      title="Klik untuk menyortir Ket PIP"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>Ket PIP</span>
                        {tab2SortField === 'ket_pip' ? (
                          tab2SortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {tab2PaginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-14 text-center text-slate-500 italic">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <AlertCircle className="w-6 h-6 text-slate-400" />
                          <span>Tidak ada data siswa ditemukan</span>
                          {tab2Search && <span className="text-[11px] text-slate-400">Cobalah kata kunci pencarian yang berbeda</span>}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    tab2PaginatedData.map((s, idx) => {
                      const itemIndex = (tab2CurrentPage - 1) * (tab2ItemsPerPage === -1 ? tab2TotalItems : tab2ItemsPerPage) + idx + 1;
                      const desilVal = (s.ket_desil || s.ketDesil || '').trim();
                      const pipVal = (s.ket_pip || s.ketPip || '').trim();
                      const parsed = parseKetDesil(desilVal);
                      const editable = canEditStudent(s);
                      const isSavingThis = tab2SavingStudentId === s.id;

                      return (
                        <tr 
                          key={s.id ? `tab2-stu-${s.id}` : `tab2-idx-${idx}`}
                          className="hover:bg-indigo-50/40 transition-colors border-b border-slate-200 group"
                        >
                          <td className="py-2.5 px-3 text-center border-r border-slate-200 text-slate-600 font-medium">{itemIndex}</td>
                          <td className="py-2.5 px-4 border-r border-slate-200 font-mono text-slate-700">{s.nisn || '-'}</td>
                          <td className="py-2.5 px-4 border-r border-slate-200 font-semibold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate">{s.nama || '-'}</span>
                              {s.jk && (
                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                  s.jk.toUpperCase().startsWith('P') ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {s.jk.toUpperCase().startsWith('P') ? 'P' : 'L'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-200 text-slate-700">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-medium text-[11px]">
                              {s.kelas || (s as any).rombel || '-'}
                            </span>
                          </td>

                          {/* KOLOM KET DESIL DENGAN OPSI PILIHAN */}
                          <td className="py-2.5 px-4 border-r border-slate-200">
                            {editable ? (
                              <button
                                type="button"
                                onClick={() => handleOpenDesilModal(s)}
                                className="group/btn flex items-center gap-1.5 text-left cursor-pointer hover:opacity-85 transition-all"
                                title="Klik untuk memilih atau mengubah keterangan desil"
                              >
                                {desilVal ? (
                                  <div className="flex flex-wrap items-center gap-1">
                                    {parsed.desil && (
                                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                        {parsed.desil}
                                      </span>
                                    )}
                                    {parsed.yatimPiatu && (
                                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                                        Yatim Piatu
                                      </span>
                                    )}
                                    <Edit2 className="w-3 h-3 text-slate-400 group-hover/btn:text-indigo-600 opacity-0 group-hover/btn:opacity-100 transition-opacity ml-1" />
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-500 bg-slate-100 hover:bg-amber-50 hover:text-amber-800 border border-dashed border-slate-300 transition-colors">
                                    <Tag className="w-3 h-3 text-amber-600" />
                                    + Pilih Desil
                                  </span>
                                )}
                              </button>
                            ) : (
                              <div className="flex flex-wrap items-center gap-1">
                                {desilVal ? (
                                  <>
                                    {parsed.desil && (
                                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800">
                                        {parsed.desil}
                                      </span>
                                    )}
                                    {parsed.yatimPiatu && (
                                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800">
                                        Yatim Piatu
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">-</span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* KOLOM KET PIP DENGAN DROPDOWN */}
                          <td className="py-2.5 px-4">
                            {editable ? (
                              <div className="relative inline-block w-full max-w-[170px]">
                                <select
                                  value={pipVal}
                                  onChange={(e) => handleChangeKetPip(s, e.target.value)}
                                  disabled={isSavingThis}
                                  className={`w-full py-1 pl-2.5 pr-7 rounded-xl text-xs font-semibold border cursor-pointer transition-all appearance-none ${
                                    pipVal === 'Sudah dapat PIP'
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 focus:ring-emerald-500'
                                      : pipVal === 'Belum dapat PIP'
                                      ? 'bg-rose-50 border-rose-300 text-rose-800 focus:ring-rose-500'
                                      : 'bg-slate-50 border-slate-300 text-slate-500 focus:ring-indigo-500'
                                  }`}
                                >
                                  <option value="">- Belum Diisi -</option>
                                  <option value="Sudah dapat PIP">Sudah dapat PIP</option>
                                  <option value="Belum dapat PIP">Belum dapat PIP</option>
                                </select>
                                <Filter className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                              </div>
                            ) : (
                              <div>
                                {pipVal === 'Sudah dapat PIP' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Sudah dapat PIP
                                  </span>
                                ) : pipVal === 'Belum dapat PIP' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800">
                                    <X className="w-3 h-3" />
                                    Belum dapat PIP
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">-</span>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Tab 2 */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-slate-500">
                  Menampilkan <strong>{tab2SortedData.length > 0 ? (tab2CurrentPage - 1) * tab2EffectivePerPage + 1 : 0}</strong> - <strong>{Math.min(tab2CurrentPage * tab2EffectivePerPage, tab2TotalItems)}</strong> dari <strong>{tab2TotalItems}</strong> siswa
                </span>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[11px]">Per halaman:</span>
                  <select
                    value={tab2ItemsPerPage}
                    onChange={(e) => {
                      setTab2ItemsPerPage(Number(e.target.value));
                      setTab2CurrentPage(1);
                    }}
                    className="p-1 border border-slate-300 rounded-md bg-white text-xs text-slate-700 cursor-pointer font-medium"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={-1}>Semua ({tab2TotalItems})</option>
                  </select>
                </div>
              </div>

              {tab2ItemsPerPage !== -1 && tab2TotalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setTab2CurrentPage(Math.max(1, tab2CurrentPage - 1))}
                    disabled={tab2CurrentPage === 1}
                    className="p-1.5 border border-slate-300 bg-white hover:bg-slate-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Halaman Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="px-2 font-medium text-slate-700">Halaman {tab2CurrentPage} dari {tab2TotalPages}</div>
                  <button
                    onClick={() => setTab2CurrentPage(Math.min(tab2TotalPages, tab2CurrentPage + 1))}
                    disabled={tab2CurrentPage === tab2TotalPages}
                    className="p-1.5 border border-slate-300 bg-white hover:bg-slate-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Halaman Berikutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal Pemilihan Alasan Layak PIP (Multi-Select) */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-600" />
                  Pilih Alasan Layak PIP
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="font-semibold text-slate-900">{selectedStudent.nama}</span>
                  <span className="text-slate-300">&bull;</span>
                  <span className="font-mono text-slate-600">NISN: {selectedStudent.nisn || '-'}</span>
                  <span className="text-slate-300">&bull;</span>
                  <span className="px-1.5 py-0.2 bg-slate-200 rounded text-slate-700 font-medium">
                    Rombel: {getRombel(selectedStudent)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-2 flex-1 text-xs">
              {(() => {
                const studentTingkat = getTingkatKelas(getRombel(selectedStudent));
                const isOutsideTarget = studentTingkat !== 'lainnya' && !targetSasaran.includes(studentTingkat);
                const isAlreadyProposed = Boolean((selectedStudent.alasan_layak || selectedStudent.alasanLayak || '').trim());

                if (isOutsideTarget && !isAlreadyProposed) {
                  return (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 mb-3">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span className="font-bold">Siswa Di Luar Target Sasaran Aktif</span>
                        <p className="mt-0.5 text-amber-800">
                          Siswa berada di rombel <strong>{getRombel(selectedStudent)}</strong> (Kelas {studentTingkat}). Target sasaran aktif saat ini: <strong>{targetSasaran.map(t => `Kelas ${t}`).join(', ')}</strong>.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleToggleSasaran(studentTingkat)}
                          className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          + Tambahkan Kelas {studentTingkat} ke Target Sasaran
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <p className="text-slate-600 font-medium mb-3">
                    Silakan pilih <strong>minimal 1</strong> alasan pengusulan layak PIP yang sesuai (bisa lebih dari satu):
                  </p>
                );
              })()}

              <div className="space-y-1.5">
                {OPSI_ALASAN_LAYAK.map((opsi, idx) => {
                  const isChecked = selectedReasons.includes(opsi);
                  return (
                    <label
                      key={`opsi-${idx}`}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                        isChecked 
                          ? 'bg-indigo-50/70 border-indigo-400 shadow-xs' 
                          : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedReasons([...selectedReasons, opsi]);
                          } else {
                            setSelectedReasons(selectedReasons.filter(r => r !== opsi));
                          }
                        }}
                        className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div className="flex-1">
                        <span className={`block font-medium ${isChecked ? 'text-indigo-950 font-bold' : 'text-slate-800'}`}>
                          {opsi}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              {(selectedStudent.alasan_layak || selectedStudent.alasanLayak) ? (
                <button
                  type="button"
                  onClick={handleClearReason}
                  disabled={isSaving}
                  className="px-3 py-2 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Kosongkan Alasan
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  disabled={isSaving}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-white bg-slate-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                {(() => {
                  const studentTingkat = getTingkatKelas(getRombel(selectedStudent));
                  const isOutsideTarget = studentTingkat !== 'lainnya' && !targetSasaran.includes(studentTingkat);
                  const isAlreadyProposed = Boolean((selectedStudent.alasan_layak || selectedStudent.alasanLayak || '').trim());
                  const cannotSaveDueToTarget = !isAlreadyProposed && isOutsideTarget;
                  const isBtnDisabled = isSaving || selectedReasons.length === 0 || cannotSaveDueToTarget;

                  return (
                    <button
                      type="button"
                      onClick={handleSaveReason}
                      disabled={isBtnDisabled}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer ${
                        isBtnDisabled
                          ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      {isSaving ? (
                        <><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>Menyimpan...</span></>
                      ) : cannotSaveDueToTarget ? (
                        <><Lock className="w-3.5 h-3.5" /><span>Di Luar Sasaran</span></>
                      ) : (
                        <><Check className="w-3.5 h-3.5" /><span>Simpan ({selectedReasons.length} dipilih)</span></>
                      )}
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pengaturan Kuota & Target Sasaran PIP */}
      {isEditingKuota && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-600" /> Atur Kuota & Target Sasaran PIP
              </h3>
              <button
                onClick={() => setIsEditingKuota(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">1. Jumlah Kuota Usulan PIP (Siswa)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={tempKuota}
                  onChange={(e) => setTempKuota(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 text-slate-800 font-semibold"
                  placeholder="Contoh: 50"
                  autoFocus
                />
                <div className="mt-2">
                  <span className="block text-[11px] text-slate-500 mb-1.5 font-medium">Pilihan Cepat Kuota:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[25, 50, 75, 100, 150, 200].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setTempKuota(String(preset))}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                          tempKuota === String(preset)
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-semibold text-slate-800">2. Target Sasaran Tingkat Kelas</label>
                  <span className="text-[11px] text-indigo-600 font-medium">Bisa memilih &gt; 1</span>
                </div>
                <p className="text-[11px] text-slate-500 mb-2.5">Pilih tingkat kelas yang berhak/ditargetkan untuk diusulkan menerima bantuan PIP:</p>

                <div className="space-y-2">
                  {OPSI_TARGET_SASARAN.map((opsi) => {
                    const isChecked = tempTargetSasaran.includes(opsi.id);
                    const countSiswa = opsi.id === '10' ? sasaranStats.count10 : opsi.id === '11' ? sasaranStats.count11 : sasaranStats.count12;
                    const filledSiswa = opsi.id === '10' ? sasaranStats.filled10 : opsi.id === '11' ? sasaranStats.filled11 : sasaranStats.filled12;

                    return (
                      <label
                        key={`modal-sasaran-${opsi.id}`}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                          isChecked ? 'bg-indigo-50/80 border-indigo-400 shadow-2xs' : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                if (tempTargetSasaran.length <= 1) {
                                  alert('Minimal harus memilih 1 target sasaran kelas.');
                                  return;
                                }
                                setTempTargetSasaran(tempTargetSasaran.filter(t => t !== opsi.id));
                              } else {
                                setTempTargetSasaran([...tempTargetSasaran, opsi.id].sort());
                              }
                            }}
                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div>
                            <span className={`font-semibold ${isChecked ? 'text-indigo-950 font-bold' : 'text-slate-800'}`}>{opsi.label}</span>
                            <span className="text-[11px] text-slate-500 ml-1.5 font-normal">(Tingkat {opsi.badge})</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                            {filledSiswa} / {countSiswa} siswa
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between mt-2 pt-1 text-[11px]">
                  <span className="text-slate-500">Terpilih: <strong>{tempTargetSasaran.length} dari 3 tingkat</strong></span>
                  <button
                    type="button"
                    onClick={() => setTempTargetSasaran(['10', '11', '12'])}
                    className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer hover:underline"
                  >
                    Pilih Semua Kelas (10, 11, 12)
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <div>Total Usulan Saat Ini: <strong className="text-indigo-600">{totalTerusul}</strong> siswa</div>
                <div>Kuota yang Ditetapkan: <strong className="text-slate-800">{tempKuota}</strong> siswa</div>
                <div>Target Sasaran: <strong className="text-slate-800">{tempTargetSasaran.map(t => `Kelas ${t}`).join(', ') || '-'}</strong></div>
              </div>
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsEditingKuota(false)}
                className="px-3.5 py-1.5 border border-slate-300 text-slate-700 hover:bg-white bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveKuotaAndSasaran}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
              >
                Simpan Pengaturan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Smart Impor Usulan PIP - Khusus Admin */}
      {isAdmin && (
        <PIPImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          students={students}
          currentPipList={pipList}
          onApplyImport={handleApplyImportPIP}
        />
      )}

      {/* Modal Pemilihan Keterangan Desil (Tab 2) */}
      {tab2ModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Keterangan Desil Siswa</h3>
                  <p className="text-[11px] text-slate-500">
                    {tab2ModalStudent.nama} &bull; NISN: {tab2ModalStudent.nisn || '-'} &bull; Rombel: {tab2ModalStudent.kelas || (tab2ModalStudent as any).rombel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTab2ModalStudent(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {/* Petunjuk Aturan Pemilihan */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                <strong>Aturan Pilihan:</strong> Anda dapat memilih 1 tingkat Desil (Desil 1 s/d 5) dan/atau opsi khusus <strong>Yatim Piatu</strong>. Pilihan antar tingkat Desil bersifat mutually exclusive (tidak bisa memilih dua desil sekaligus, misalnya Desil 1 dan Desil 2).
              </div>

              {/* 1. Pilihan Desil (Maksimal 1) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  1. Tingkat Desil (Pilih Maksimal 1):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {['Desil 1', 'Desil 2', 'Desil 3', 'Desil 4', 'Desil 5'].map((desil) => {
                    const isSelected = tab2SelectedDesil === desil;
                    return (
                      <button
                        key={desil}
                        type="button"
                        onClick={() => {
                          setTab2SelectedDesil(isSelected ? null : desil);
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-xl border font-semibold text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-50 border-amber-500 text-amber-950 shadow-2xs ring-2 ring-amber-400/30'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <span>{desil}</span>
                        {isSelected ? (
                          <CheckCircle2 className="w-4 h-4 text-amber-600" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-300" />
                        )}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setTab2SelectedDesil(null)}
                    className={`flex items-center justify-center p-2.5 rounded-xl border font-medium text-xs transition-all cursor-pointer ${
                      tab2SelectedDesil === null
                        ? 'bg-slate-100 border-slate-400 text-slate-800 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <span>Tanpa Desil</span>
                  </button>
                </div>
              </div>

              {/* 2. Opsi Tambahan / Khusus (Yatim Piatu) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  2. Keterangan Khusus (Bisa digabung dengan Desil):
                </label>
                <label
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    tab2IsYatimPiatu
                      ? 'bg-purple-50 border-purple-500 text-purple-950 shadow-2xs ring-2 ring-purple-400/30'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={tab2IsYatimPiatu}
                      onChange={(e) => setTab2IsYatimPiatu(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold">Yatim Piatu</span>
                      <p className="text-[11px] text-slate-500 font-normal">Siswa berstatus yatim, piatu, atau yatim piatu</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-700">
                    Khusus
                  </span>
                </label>
              </div>

              {/* Pratinjau Keterangan Tersimpan */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block mb-1 font-medium">Pratinjau Hasil Keterangan Desil:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {tab2SelectedDesil || tab2IsYatimPiatu ? (
                    <>
                      {tab2SelectedDesil && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg font-bold text-xs border border-amber-300">
                          <Tag className="w-3 h-3" />
                          {tab2SelectedDesil}
                        </span>
                      )}
                      {tab2IsYatimPiatu && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg font-bold text-xs border border-purple-300">
                          <Check className="w-3 h-3" />
                          Yatim Piatu
                        </span>
                      )}
                      <span className="text-slate-500 text-xs">
                        &rarr; Tersimpan sebagai: "<strong>
                          {[tab2SelectedDesil, tab2IsYatimPiatu ? 'Yatim Piatu' : null].filter(Boolean).join(', ')}
                        </strong>"
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-400 italic text-xs">Tidak ada keterangan desil yang dipilih (Kosong)</span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setTab2ModalStudent(null)}
                className="px-3.5 py-1.5 border border-slate-300 text-slate-700 hover:bg-white bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveModalDesil}
                disabled={tab2SavingStudentId !== null}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {tab2SavingStudentId ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Simpan Keterangan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};