// language: JSX, file: src/components/DashboardView.jsx, runtime: React 19 / Vite, target: Telehealth Frontend
import React, { useEffect, useState, useCallback } from 'react';
import { telehealthApi, isMahasiswaValid } from '../services/api';
import { getFriendlyErrorMessage } from '../utils/helpers';

export default function DashboardView({
  config,
  onStartForm,
  onNavigate,
  onOpenHistoryWithFilter,
}) {
  const [profile, setProfile] = useState(null);
  const [forms, setForms] = useState([]);
  const [utsData, setUtsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const nim = config.mahasiswa?.nim || '';

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meRes, formsRes] = await Promise.all([
        telehealthApi.getMe(nim),
        telehealthApi.getForms(),
      ]);
      setProfile(meRes.data);
      setForms(formsRes.data || []);

      if (nim) {
        try {
          const utsRes = await telehealthApi.getUtsStatus(nim);
          setUtsData(utsRes.data);
        } catch {
          setUtsData(null);
        }
      }
    } catch (err) {
      setError({
        status: err.status,
        message: getFriendlyErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  }, [nim]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (!isMahasiswaValid(config.mahasiswa)) {
    return (
      <div className="bg-white border border-[#DFDCD4] p-8 max-w-xl mx-auto my-8 space-y-4">
        <p className="text-xs font-mono uppercase tracking-wider text-[#991B1B]">
          Identitas Diperlukan
        </p>
        <h2 className="font-serif-editorial text-3xl text-[#161615]">
          Isi NIM, Nama, dan Kelas sebelum memulai
        </h2>
        <p className="text-xs sm:text-sm text-[#575653] leading-relaxed">
          Satu token pasien digunakan bersama oleh banyak mahasiswa. Server memisahkan data dan mencatat nilai UTS berdasarkan NIM yang Anda kirim.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('pengaturan')}
          className="bg-[#1B4332] hover:bg-[#143325] text-white px-5 py-2.5 text-xs font-medium cursor-pointer"
        >
          Buka Pengaturan Identitas →
        </button>
      </div>
    );
  }

  const stat = profile?.statistik || {
    total: 0,
    draf: 0,
    menunggu: 0,
    perlu_klarifikasi: 0,
    sudah_ditinjau: 0,
  };

  return (
    <div className="space-y-8">
      {/* Error Banner */}
      {error && (
        <div className="bg-[#FDECEB] border border-[#F5C2C0] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-[#991B1B]">
          <div>
            <p className="font-semibold">
              Gagal memuat data dari API {error.status ? `(HTTP ${error.status})` : ''}
            </p>
            <p className="mt-0.5">{error.message}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('pengaturan')}
              className="px-3 py-1.5 bg-white border border-[#F5C2C0] text-[#991B1B] font-medium cursor-pointer"
            >
              Periksa Token
            </button>
            <button
              type="button"
              onClick={fetchDashboardData}
              className="px-3 py-1.5 bg-[#991B1B] text-white font-medium cursor-pointer"
            >
              Muat Ulang
            </button>
          </div>
        </div>
      )}

      {/* Clarification Notice */}
      {stat.perlu_klarifikasi > 0 && (
        <div className="bg-[#FEF3C7] border border-[#FDE68A] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-[#78350F]">
            <p className="font-semibold text-sm">
              Ada {stat.perlu_klarifikasi} laporan yang menunggu klarifikasi Anda.
            </p>
            <p className="mt-0.5">
              Petugas meminta informasi tambahan sebelum memberikan tindak lanjut.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenHistoryWithFilter('perlu_klarifikasi')}
            className="self-start sm:self-auto shrink-0 bg-[#78350F] text-white px-4 py-2 text-xs font-medium cursor-pointer"
          >
            Jawab Klarifikasi →
          </button>
        </div>
      )}

      {/* Patient Chart Header + Tabular Summary */}
      <section className="bg-white border border-[#DFDCD4]">
        <div className="p-6 sm:p-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#DFDCD4]">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-[#6E6C66]">
              Rekam Pasien Aktif
            </p>
            <h1 className="font-serif-editorial text-3xl sm:text-4xl text-[#161615] mt-1">
              {loading ? 'Memuat data pasien...' : profile?.nama || 'Pasien'}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#575653] mt-2 font-mono">
              <span>ID: {profile?.id || '—'}</span>
              <span>No. RM: {profile?.no_rm || '—'}</span>
              <span>Filter NIM: {nim}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchDashboardData}
              disabled={loading}
              className="px-3.5 py-2 bg-[#F6F5F0] hover:bg-[#EFECE6] border border-[#DFDCD4] text-xs font-medium text-[#161615] cursor-pointer"
            >
              {loading ? 'Memuat...' : 'Segarkan'}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('riwayat')}
              className="px-3.5 py-2 bg-[#161615] hover:bg-[#2E2E2C] text-white text-xs font-medium cursor-pointer"
            >
              Lihat Riwayat ({stat.total})
            </button>
          </div>
        </div>

        {/* 5-Column Tabular Counter Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[#DFDCD4]">
          <button
            type="button"
            onClick={() => onOpenHistoryWithFilter('all')}
            className="p-4 sm:p-5 text-left hover:bg-[#FAF9F6] transition cursor-pointer"
          >
            <span className="block text-[11px] uppercase tracking-wider text-[#6E6C66]">
              Total Laporan
            </span>
            <span className="block text-2xl font-mono font-semibold text-[#161615] mt-1">
              {stat.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenHistoryWithFilter('draft')}
            className="p-4 sm:p-5 text-left hover:bg-[#FAF9F6] transition cursor-pointer"
          >
            <span className="block text-[11px] uppercase tracking-wider text-[#6E6C66]">
              Draf
            </span>
            <span className="block text-2xl font-mono font-semibold text-[#78350F] mt-1">
              {stat.draf}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenHistoryWithFilter('diproses')}
            className="p-4 sm:p-5 text-left hover:bg-[#FAF9F6] transition cursor-pointer"
          >
            <span className="block text-[11px] uppercase tracking-wider text-[#6E6C66]">
              Menunggu / Ditinjau
            </span>
            <span className="block text-2xl font-mono font-semibold text-[#1E40AF] mt-1">
              {stat.menunggu}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenHistoryWithFilter('perlu_klarifikasi')}
            className="p-4 sm:p-5 text-left hover:bg-[#FAF9F6] transition cursor-pointer"
          >
            <span className="block text-[11px] uppercase tracking-wider text-[#6E6C66]">
              Perlu Klarifikasi
            </span>
            <span className="block text-2xl font-mono font-semibold text-[#991B1B] mt-1">
              {stat.perlu_klarifikasi}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenHistoryWithFilter('sudah_ditinjau')}
            className="col-span-2 sm:col-span-1 p-4 sm:p-5 text-left hover:bg-[#FAF9F6] transition cursor-pointer"
          >
            <span className="block text-[11px] uppercase tracking-wider text-[#6E6C66]">
              Sudah Ditinjau
            </span>
            <span className="block text-2xl font-mono font-semibold text-[#14532D] mt-1">
              {stat.sudah_ditinjau}
            </span>
          </button>
        </div>
      </section>

      {/* Two-Column Grid: Forms (Left) & UTS Feature Checklist (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 7 Columns: Formulir Self-Assessment */}
        <div className="lg:col-span-7 space-y-5">
          <div className="border-b border-[#DFDCD4] pb-2 flex items-baseline justify-between">
            <h2 className="font-serif-editorial text-2xl text-[#161615]">
              Formulir yang Tersedia
            </h2>
            <span className="text-xs text-[#6E6C66]">Pilih formulir untuk memulai pengisian</span>
          </div>

          <div className="divide-y divide-[#DFDCD4] border border-[#DFDCD4] bg-white">
            {forms.map((form) => {
              const isGad7 = form.id === 'FRM-GAD7';
              return (
                <div key={form.id} className="p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-[#161615] bg-[#F6F5F0] border border-[#DFDCD4] px-2 py-0.5">
                        {form.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 border font-medium ${
                          isGad7
                            ? 'bg-[#EBF3FE] text-[#1E40AF] border-[#BFDBFE]'
                            : 'bg-[#E6F2EC] text-[#14532D] border-[#B7DBC8]'
                        }`}
                      >
                        {isGad7 ? 'Bonus · Skor 0–21' : 'Wajib · Ringkasan Keluhan'}
                      </span>
                    </div>
                    <span className="font-mono text-[#6E6C66]">
                      ± {form.estimasi_menit} menit · {form.jumlah_pertanyaan} pertanyaan
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-[#161615]">{form.judul}</h3>
                    <p className="text-xs sm:text-sm text-[#575653] mt-1 leading-relaxed">
                      {form.deskripsi}
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#EFECE6]">
                    <span className="text-xs text-[#6E6C66]">
                      Periode pelaporan: <strong className="text-[#161615]">{form.periode_pelaporan}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => onStartForm(form.id)}
                      className="bg-[#1B4332] hover:bg-[#143325] text-white px-4 py-2 text-xs font-medium transition cursor-pointer"
                    >
                      Mulai Self-Assessment →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sample Data Reference Box */}
          <div className="bg-white border border-[#DFDCD4] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 text-xs">
              <p className="font-semibold text-[#161615]">Data Contoh Dosen (NIM = DEMO)</p>
              <p className="text-[#575653]">
                Lihat contoh laporan yang memiliki permintaan klarifikasi (SA-0005) atau jadwal tindak lanjut (SA-0004).
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenHistoryWithFilter('demo')}
              className="shrink-0 px-3.5 py-2 bg-[#F6F5F0] hover:bg-[#EFECE6] border border-[#DFDCD4] text-xs font-medium text-[#161615] cursor-pointer"
            >
              Buka Data DEMO →
            </button>
          </div>
        </div>

        {/* Right 5 Columns: Bukti Fitur UTS Checklist */}
        <div className="lg:col-span-5 space-y-5">
          <div className="border-b border-[#DFDCD4] pb-2 flex items-baseline justify-between">
            <h2 className="font-serif-editorial text-2xl text-[#161615]">
              Bukti Fitur UTS
            </h2>
            <span className="font-mono text-xs text-[#6E6C66]">GET /api/uts/{nim}</span>
          </div>

          <div className="bg-white border border-[#DFDCD4] p-6 space-y-5">
            {utsData ? (
              <>
                <div className="flex items-center justify-between border-b border-[#EFECE6] pb-4">
                  <div>
                    <span className="text-xs text-[#6E6C66] block">Status Pemeriksaan Dosen</span>
                    <span className="text-sm font-semibold text-[#161615] mt-0.5 block">
                      {utsData.penilaian?.status?.label || 'Belum diperiksa'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-[#6E6C66] block">Fitur Terdeteksi</span>
                    <span className="text-xl font-mono font-semibold text-[#1B4332]">
                      {utsData.bukti_fitur?.tercapai || 0} / {utsData.bukti_fitur?.total || 10}
                    </span>
                  </div>
                </div>

                {utsData.penilaian?.catatan && (
                  <div className="bg-[#FEF3C7] border border-[#FDE68A] p-3 text-xs text-[#78350F]">
                    <strong>Catatan Dosen:</strong> {utsData.penilaian.catatan}
                  </div>
                )}

                <div className="divide-y divide-[#EFECE6] border border-[#DFDCD4]">
                  {(utsData.bukti_fitur?.daftar || []).map((item) => (
                    <div
                      key={item.kode}
                      className="p-3 flex items-start justify-between gap-3 text-xs"
                    >
                      <div>
                        <span className="font-mono font-semibold text-[#161615] block">
                          {item.kode}
                        </span>
                        <span className="text-[#575653]">{item.label}</span>
                      </div>
                      <span
                        className={`shrink-0 px-2 py-0.5 font-mono text-[11px] border ${
                          item.tercapai
                            ? 'bg-[#E6F2EC] text-[#14532D] border-[#B7DBC8] font-semibold'
                            : 'bg-[#F6F5F0] text-[#6E6C66] border-[#DFDCD4]'
                        }`}
                      >
                        {item.tercapai ? 'Tercapai' : 'Belum'}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-2 text-xs text-[#575653]">
                <p className="font-semibold text-[#161615]">
                  Belum ada catatan untuk NIM {nim}.
                </p>
                <p className="leading-relaxed">
                  Server API otomatis mendeteksi bukti fitur begitu Anda membuat draf self-assessment pertama menggunakan NIM ini.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
