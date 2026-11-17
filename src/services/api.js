// language: JavaScript, file: src/services/api.js, runtime: Vite/Browser, target: Telehealth API v2.0

export const PATIENT_PRESETS = [
  {
    id: 'P-001',
    nama: 'Budi Santoso',
    keterangan: 'Pasien umum',
    token: import.meta.env.VITE_TOKEN_P001 || import.meta.env.VITE_API_TOKEN || '',
  },
  {
    id: 'P-002',
    nama: 'Siti Aminah',
    keterangan: 'Contoh pasien yang diisi pendamping',
    token: import.meta.env.VITE_TOKEN_P002 || '',
  },
  {
    id: 'P-003',
    nama: 'Andi Wijaya',
    keterangan: 'Pasien umum',
    token: import.meta.env.VITE_TOKEN_P003 || '',
  },
];

const STORAGE_KEY = 'telehealth_unimus_config_v2';

const DEFAULT_CONFIG = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'https://telehealth.informatikaunimus.site/api',
  token: import.meta.env.VITE_API_TOKEN || PATIENT_PRESETS[0].token || '',
  mahasiswa: {
    nim: '',
    nama: '',
    kelas: '',
  },
};

export function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      baseUrl: (parsed.baseUrl || DEFAULT_CONFIG.baseUrl).replace(/\/+$/, ''),
      token: (parsed.token || DEFAULT_CONFIG.token).trim(),
      mahasiswa: {
        nim: (parsed.mahasiswa?.nim || '').trim().toUpperCase(),
        nama: (parsed.mahasiswa?.nama || '').trim(),
        kelas: (parsed.mahasiswa?.kelas || '').trim(),
      },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(newConfig) {
  const normalized = {
    baseUrl: (newConfig.baseUrl || DEFAULT_CONFIG.baseUrl).replace(/\/+$/, ''),
    token: (newConfig.token || DEFAULT_CONFIG.token).trim(),
    mahasiswa: {
      nim: (newConfig.mahasiswa?.nim || '').trim().toUpperCase(),
      nama: (newConfig.mahasiswa?.nama || '').trim(),
      kelas: (newConfig.mahasiswa?.kelas || '').trim(),
    },
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function isMahasiswaValid(mhs) {
  if (!mhs) return false;
  const nim = (mhs.nim || '').trim();
  const nama = (mhs.nama || '').trim();
  const kelas = (mhs.kelas || '').trim();
  return (
    nim.length >= 5 &&
    nim.length <= 20 &&
    /^[A-Za-z0-9.\-_]+$/.test(nim) &&
    nama.length >= 3 &&
    nama.length <= 100 &&
    kelas.length >= 1 &&
    kelas.length <= 20
  );
}

export async function apiRequest(path, { method = 'GET', body, customToken, customBaseUrl, skipAuth = false } = {}) {
  const cfg = loadConfig();
  const base = (customBaseUrl || cfg.baseUrl).replace(/\/+$/, '');
  const token = (customToken !== undefined ? customToken : cfg.token).trim();

  const headers = {};
  if (!skipAuth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let res;
  try {
    res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw {
      status: 0,
      success: false,
      message: 'Gagal terhubung ke server API. Periksa koneksi internet atau alamat Base URL API.',
      originalError: networkErr,
    };
  }

  let json;
  try {
    json = await res.json();
  } catch {
    throw {
      status: res.status,
      success: false,
      message: `Respons server bukan JSON valid (HTTP ${res.status}). Pastikan URL diakhiri /api.`,
    };
  }

  if (!res.ok || !json.success) {
    throw {
      status: res.status,
      ...json,
    };
  }

  return json;
}

export const telehealthApi = {
  checkHealth: (customBaseUrl) =>
    apiRequest('', { method: 'GET', skipAuth: true, customBaseUrl }),

  getMe: (nim, opts = {}) => {
    const query = nim ? `?nim=${encodeURIComponent(nim.trim().toUpperCase())}` : '';
    return apiRequest(`/me${query}`, opts);
  },

  getForms: () => apiRequest('/forms'),

  getFormDetail: (formId) => apiRequest(`/forms/${encodeURIComponent(formId)}`),

  validateForm: (formId, nim, answers) =>
    apiRequest(`/forms/${encodeURIComponent(formId)}/validate`, {
      method: 'POST',
      body: {
        nim: (nim || '').trim().toUpperCase(),
        answers,
      },
    }),

  createAssessment: ({ form_id, persetujuan = true, mahasiswa, answers = {}, kirim = false }) => {
    const payload = {
      form_id,
      persetujuan: Boolean(persetujuan),
      mahasiswa: {
        nim: (mahasiswa.nim || '').trim().toUpperCase(),
        nama: (mahasiswa.nama || '').trim(),
        kelas: (mahasiswa.kelas || '').trim(),
      },
      answers,
    };
    if (kirim) payload.kirim = true;
    return apiRequest('/assessments', {
      method: 'POST',
      body: payload,
    });
  },

  getAssessments: ({ nim, status_pengiriman, status_peninjauan, form_id, q } = {}) => {
    const params = new URLSearchParams();
    if (nim) params.set('nim', nim.trim().toUpperCase());
    if (status_pengiriman) params.set('status_pengiriman', status_pengiriman);
    if (status_peninjauan) params.set('status_peninjauan', status_peninjauan);
    if (form_id) params.set('form_id', form_id);
    if (q) params.set('q', q.trim());
    const qs = params.toString();
    return apiRequest(`/assessments${qs ? `?${qs}` : ''}`);
  },

  getAssessmentDetail: (id) =>
    apiRequest(`/assessments/${encodeURIComponent(id)}`),

  patchAssessment: (id, answers) =>
    apiRequest(`/assessments/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: { answers },
    }),

  putAssessment: (id, answers) =>
    apiRequest(`/assessments/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: { answers },
    }),

  deleteAssessment: (id) =>
    apiRequest(`/assessments/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  submitAssessment: (id) =>
    apiRequest(`/assessments/${encodeURIComponent(id)}/submit`, {
      method: 'POST',
    }),

  getAssessmentHasil: (id) =>
    apiRequest(`/assessments/${encodeURIComponent(id)}/hasil`),

  getAssessmentStatus: (id) =>
    apiRequest(`/assessments/${encodeURIComponent(id)}/status`),

  replyClarification: (id, cid, jawaban) =>
    apiRequest(
      `/assessments/${encodeURIComponent(id)}/clarifications/${encodeURIComponent(cid)}/reply`,
      {
        method: 'POST',
        body: { jawaban },
      }
    ),

  getUtsStatus: (nim) =>
    apiRequest(`/uts/${encodeURIComponent((nim || '').trim().toUpperCase())}`),
};
