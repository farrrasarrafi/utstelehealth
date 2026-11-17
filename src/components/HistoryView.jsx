// language: JSX, file: src/components/HistoryView.jsx, runtime: React 19 / Vite, target: Telehealth Frontend
import React, { useEffect, useState, useCallback } from 'react';
import { telehealthApi } from '../services/api';
import {
  formatDateTime,
  getDeliveryBadgeStyle,
  getReviewBadgeStyle,
  getFriendlyErrorMessage,
} from '../utils/helpers';

export default function HistoryView({
  config,
  initialFilter = 'all',
  onResumeDraft,
  onOpenResult,
  onOpenStatus,
  onStartForm,
}) {
  const [modeNim, setModeNim] = useState(
    initialFilter === 'demo' ? 'DEMO' : config.mahasiswa?.nim || ''
  );
  const [activeTab, setActiveTab] = useState(
    initialFilter === 'demo' ? 'all' : initialFilter || 'all'
  );
  const [formFilter, setFormFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (initialFilter === 'demo') {
      setModeNim('DEMO');
      setActiveTab('all');
    } else {
      setModeNim(config.mahasiswa?.nim || '');
      if (initialFilter) setActiveTab(initialFilter);
    }
  }, [initialFilter, config.mahasiswa?.nim]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        nim: modeNim || config.mahasiswa?.nim,
      };
      if (activeTab === 'draft') {
        params.status_pengiriman = 'draft';
      } else if (activeTab === 'perlu_klarifikasi') {
        params.status_peninjauan = 'perlu_klarifikasi';
      } else if (activeTab === 'sudah_ditinjau') {
        params.status_peninjauan = 'sudah_ditinjau';
      }
      if (formFilter) params.form_id = formFilter;
      if (searchQuery.trim()) params.q = searchQuery.trim();

      const res = await telehealthApi.getAssessments(params);
      let list = res.data || [];

      if (activeTab === 'diproses') {
        list = list.filter((it) =>
          ['menunggu_peninjauan', 'sedang_ditinjau', 'klarifikasi_dijawab'].includes(
            it.status_peninjauan?.kode
          )
        );
      }
      setItems(list);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: getFriendlyErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  }, [modeNim, config.mahasiswa?.nim, activeTab, formFilter, searchQuery]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleDeleteDraft = async (id) => {
    setFeedback(null);
    try {
      const res = await telehealthApi.deleteAssessment(id);
      setFeedback({
        type: 'success',
        text: res.message || `Draf ${id} dihapus.`,
      });
      fetchHistory();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: getFriendlyErrorMessage(err),
      });
    }
  };

  const handleSimulate409 = async (id) => {
    setFeedback(null);
    try {
      await telehealthApi.patchAssessment(id, { keluhan_utama: 'Uji ubah setelah terkirim' });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: `[HTTP ${err.status}] ${getFriendlyErrorMessage(err)}`,
      });
    }
  };

  const tabs = [
    { id: 'all', label: 'Semua' },
    { id: 'draft', label: 'Draf' },
    { id: 'diproses', label: 'Diproses' },
    { id: 'perlu_klarifikasi', label: 'Perlu Klarifikasi' },
    { id: 'sudah_ditinjau', label: 'Sudah Ditinjau' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#DFDCD4] p-6 sm:p-8 space-y-5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#DFDCD4] pb-5">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-[#6E6C66]">
              GET /api/assessments?nim={modeNim}
            </p>
            <h1 className="font-serif-editorial text-3xl sm:text-4xl text-[#161615] mt-1">
              Riwayat Self-Assessment
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="inline-flex border border-[#DFDCD4] bg-[#F6F5F0]">
              <button
                type="button"
                onClick={() => setModeNim(config.mahasiswa?.nim || '')}
                className={`px-3 py-1.5 font-medium cursor-pointer ${
                  modeNim !== 'DEMO'
                    ? 'bg-[#161615] text-white'
                    : 'text-[#575653] hover:text-[#161615]'
                }`}
              >
                NIM Saya ({config.mahasiswa?.nim || '—'})
              </button>
              <button
                type="button"
                onClick={() => setModeNim('DEMO')}
                className={`px-3 py-1.5 font-medium border-l border-[#DFDCD4] cursor-pointer ${
                  modeNim === 'DEMO'
                    ? 'bg-[#161615] text-white'
                    : 'text-[#575653] hover:text-[#161615]'
                }`}
              >
                Data Contoh (DEMO)
              </button>
            </div>

            <button
              type="button"
              onClick={fetchHistory}
              className="px-3 py-1.5 bg-white border border-[#DFDCD4] hover:border-[#161615] text-[#161615] font-medium cursor-pointer"
            >
              Segarkan
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap border border-[#DFDCD4] divide-x divide-[#DFDCD4] bg-[#F6F5F0]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 text-xs font-medium transition cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#1B4332] text-white font-semibold'
                    : 'text-[#575653] hover:bg-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={formFilter}
              onChange={(e) => setFormFilter(e.target.value)}
              className="bg-[#F6F5F0] border border-[#DFDCD4] px-3 py-2 text-xs text-[#161615] outline-none focus:border-[#161615]"
            >
              <option value="">Semua Formulir</option>
              <option value="FRM-KELUHAN">FRM-KELUHAN</option>
              <option value="FRM-GAD7">FRM-GAD7</option>
            </select>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari keluhan / ID..."
              className="bg-[#F6F5F0] border border-[#DFDCD4] focus:border-[#161615] focus:bg-white px-3 py-2 text-xs text-[#161615] outline-none w-44 sm:w-56"
            />
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`border p-4 text-xs flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-[#E6F2EC] border-[#B7DBC8] text-[#14532D]'
              : 'bg-[#FDECEB] border-[#F5C2C0] text-[#991B1B]'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="font-mono font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-[#DFDCD4] p-10 text-center text-xs font-mono text-[#6E6C66]">
          Memuat riwayat...
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-[#DFDCD4] p-10 text-center space-y-3">
          <p className="text-sm font-semibold text-[#161615]">
            Tidak ada laporan untuk filter ini (NIM: {modeNim}).
          </p>
          <p className="text-xs text-[#6E6C66] max-w-md mx-auto">
            {modeNim === 'DEMO'
              ? 'Ganti akun pasien (P-001, P-002, atau P-003) pada bilah atas untuk melihat data contoh milik akun pasien tersebut.'
              : 'Belum ada laporan yang dibuat dengan NIM ini pada akun pasien aktif.'}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onStartForm('FRM-KELUHAN')}
              className="bg-[#1B4332] text-white px-4 py-2 text-xs font-medium cursor-pointer"
            >
              Buat Self-Assessment Baru →
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#DFDCD4] divide-y divide-[#DFDCD4]">
          {items.map((item) => {
            const isDraft = item.status_pengiriman?.kode === 'draft';
            const needsClarification =
              item.status_peninjauan?.kode === 'perlu_klarifikasi' ||
              item.klarifikasi_menunggu > 0;

            return (
              <div key={item.id} className="p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-semibold text-[#161615] bg-[#F6F5F0] border border-[#DFDCD4] px-2 py-0.5">
                        {item.id}
                      </span>
                      <span className="text-[#6E6C66]">
                        {item.form?.judul || item.form?.id}
                      </span>
                      {item.skor && (
                        <span className="font-mono px-2 py-0.5 bg-[#EBF3FE] text-[#1E40AF] border border-[#BFDBFE]">
                          Skor {item.skor.total} ({item.skor.kategori?.label})
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-semibold text-[#161615]">
                      {item.judul || 'Draf Self-Assessment'}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6E6C66] font-mono">
                      <span>Dibuat: {formatDateTime(item.dibuat_pada)}</span>
                      {item.dikirim_pada && (
                        <span>Dikirim: {formatDateTime(item.dikirim_pada)}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
                    <span
                      className={`px-2.5 py-1 border font-medium ${getDeliveryBadgeStyle(
                        item.status_pengiriman?.kode
                      )}`}
                    >
                      {item.status_pengiriman?.label}
                    </span>
                    <span
                      className={`px-2.5 py-1 border font-medium ${getReviewBadgeStyle(
                        item.status_peninjauan?.kode
                      )}`}
                    >
                      {item.status_peninjauan?.label}
                    </span>
                  </div>
                </div>

                {needsClarification && (
                  <div className="bg-[#FEF3C7] border border-[#FDE68A] p-3 text-xs text-[#78350F]">
                    Petugas meminta klarifikasi pada laporan ini. Buka halaman status untuk mengirim jawaban.
                  </div>
                )}

                <div className="pt-3 border-t border-[#EFECE6] flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="text-[#6E6C66]">
                    Kelengkapan:{' '}
                    <strong className="text-[#161615]">
                      {item.status_kelengkapan === 'lengkap' ? 'Lengkap' : 'Belum lengkap'}
                    </strong>
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    {isDraft ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onResumeDraft(item.id, item.form?.id)}
                          className="px-3.5 py-1.5 bg-[#1B4332] hover:bg-[#143325] text-white font-medium cursor-pointer"
                        >
                          Lanjutkan Pengisian →
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDraft(item.id)}
                          className="px-3 py-1.5 bg-[#FDECEB] border border-[#F5C2C0] text-[#991B1B] font-medium cursor-pointer"
                        >
                          Hapus Draf
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onOpenResult(item.id)}
                          className="px-3.5 py-1.5 bg-white border border-[#DFDCD4] hover:border-[#161615] text-[#161615] font-medium cursor-pointer"
                        >
                          Lihat Ringkasan
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenStatus(item.id)}
                          className={`px-3.5 py-1.5 font-medium cursor-pointer ${
                            needsClarification
                              ? 'bg-[#78350F] text-white'
                              : 'bg-[#1B4332] hover:bg-[#143325] text-white'
                          }`}
                        >
                          {needsClarification ? 'Jawab Klarifikasi →' : 'Pantau Status →'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSimulate409(item.id)}
                          className="px-2.5 py-1.5 bg-[#F6F5F0] border border-[#DFDCD4] text-[#6E6C66] hover:text-[#161615] cursor-pointer"
                          title="Uji ubah laporan terkirim untuk melihat respons HTTP 409"
                        >
                          Tes 409
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
