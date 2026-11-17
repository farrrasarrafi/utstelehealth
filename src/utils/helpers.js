// language: JavaScript, file: src/utils/helpers.js, runtime: Vite/Browser, target: Telehealth Frontend

export function isVisible(cond, answers = {}) {
  if (!cond) return true;
  if (cond.any) return cond.any.some((c) => isVisible(c, answers));
  if (cond.all) return cond.all.every((c) => isVisible(c, answers));

  const v = answers[cond.question];
  const filled =
    v !== undefined &&
    v !== null &&
    v !== '' &&
    !(Array.isArray(v) && v.length === 0);

  if ('equals' in cond) return v === cond.equals;
  if ('in' in cond) return Array.isArray(cond.in) && cond.in.includes(v);
  if ('includes' in cond) return Array.isArray(v) && v.includes(cond.includes);
  if ('filled' in cond) return filled === cond.filled;
  return true;
}

export function isAnswerFilled(val) {
  if (val === undefined || val === null || val === '') return false;
  if (Array.isArray(val) && val.length === 0) return false;
  return true;
}

export function getTodayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateTime(isoString) {
  if (!isoString) return '—';
  try {
    const dt = new Date(isoString);
    if (Number.isNaN(dt.getTime())) return isoString;
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dt);
  } catch {
    return isoString;
  }
}

export function getDeliveryBadgeStyle(kode) {
  switch (kode) {
    case 'terkirim':
      return 'bg-[#E6F2EC] text-[#14532D] border-[#B7DBC8]';
    case 'draft':
    default:
      return 'bg-[#F5EFE6] text-[#78350F] border-[#E2D3BC]';
  }
}

export function getReviewBadgeStyle(kode) {
  switch (kode) {
    case 'sudah_ditinjau':
      return 'bg-[#E6F2EC] text-[#14532D] border-[#B7DBC8]';
    case 'perlu_klarifikasi':
      return 'bg-[#FDECEB] text-[#991B1B] border-[#F5C2C0]';
    case 'klarifikasi_dijawab':
      return 'bg-[#EBF3FE] text-[#1E40AF] border-[#BFDBFE]';
    case 'sedang_ditinjau':
      return 'bg-[#EEF2FF] text-[#3730A3] border-[#C7D2FE]';
    case 'menunggu_peninjauan':
      return 'bg-[#F3F2EE] text-[#3F3E3A] border-[#D8D5CD]';
    case 'belum_dikirim':
    default:
      return 'bg-[#F3F2EE] text-[#6E6C66] border-[#DFDCD4]';
  }
}

export function getScoreCategoryStyle(kode) {
  switch (kode) {
    case 'minimal':
      return {
        badge: 'bg-[#E6F2EC] text-[#14532D] border-[#B7DBC8]',
        ring: 'text-[#14532D]',
        bar: 'bg-[#1B4332]',
      };
    case 'ringan':
      return {
        badge: 'bg-[#EBF3FE] text-[#1E40AF] border-[#BFDBFE]',
        ring: 'text-[#1E40AF]',
        bar: 'bg-[#1D4ED8]',
      };
    case 'sedang':
      return {
        badge: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
        ring: 'text-[#92400E]',
        bar: 'bg-[#D97706]',
      };
    case 'berat':
      return {
        badge: 'bg-[#FDECEB] text-[#991B1B] border-[#F5C2C0]',
        ring: 'text-[#991B1B]',
        bar: 'bg-[#B91C1C]',
      };
    default:
      return {
        badge: 'bg-[#F3F2EE] text-[#3F3E3A] border-[#D8D5CD]',
        ring: 'text-[#161615]',
        bar: 'bg-[#161615]',
      };
  }
}

export function getFriendlyErrorMessage(err) {
  if (!err) return 'Terjadi kesalahan yang tidak diketahui.';
  if (err.status === 401) {
    return err.message || 'Token tidak ditemukan atau tidak valid (401). Periksa header Authorization.';
  }
  if (err.status === 403) {
    return err.message || 'Akses ditolak (403). Endpoint ini khusus petugas.';
  }
  if (err.status === 404) {
    return err.message || 'Data tidak ditemukan (404) atau milik akun pasien lain.';
  }
  if (err.status === 409) {
    return err.message || 'Aksi ditolak (409). Laporan yang sudah dikirim tidak dapat diubah atau dihapus.';
  }
  if (err.status === 422) {
    return err.message || 'Isian belum lengkap atau format tidak valid (422).';
  }
  return err.message || 'Gagal menghubungi server API.';
}
