// language: JSX, file: src/components/ResultView.jsx, runtime: React 19 / Vite, target: Telehealth Frontend
import React, { useEffect, useState, useCallback } from 'react';
import { telehealthApi } from '../services/api';
import {
  formatDateTime,
  getScoreCategoryStyle,
  getFriendlyErrorMessage,
} from '../utils/helpers';

export default function ResultView({ assessmentId, onBack, onOpenStatus }) {
  const [hasil, setHasil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHasil = useCallback(async () => {
    if (!assessmentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await telehealthApi.getAssessmentHasil(assessmentId);
      setHasil(res.data);
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    fetchHasil();
  }, [fetchHasil]);

  if (loading) {
    return (
      <div className="bg-white border border-[#DFDCD4] p-10 text-center text-xs font-mono text-[#6E6C66] max-w-3xl mx-auto my-8">
        Memuat ringkasan hasil...
      </div>
    );
  }

  if (error || !hasil) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 my-6">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-medium text-[#575653] hover:text-[#161615] cursor-pointer"
        >
          ← Kembali ke Riwayat
        </button>
        <div className="bg-[#FDECEB] border border-[#F5C2C0] p-5 text-xs text-[#991B1B]">
          {error || 'Data hasil tidak ditemukan.'}
        </div>
      </div>
    );
  }

  const skor = hasil.skor;
  const perubahan = hasil.perubahan;
  const kelengkapan = hasil.kelengkapan || {};
  const ringkasan = hasil.ringkasan || [];
  const catStyle = getScoreCategoryStyle(skor?.kategori?.kode);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <button
          type="button"
          onClick={onBack}
          className="text-[#575653] hover:text-[#161615] font-medium cursor-pointer"
        >
          ← Kembali ke Riwayat
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchHasil}
            className="px-3 py-1.5 bg-white border border-[#DFDCD4] hover:border-[#161615] text-[#161615] font-medium cursor-pointer"
          >
            Muat Ulang
          </button>
          <button
            type="button"
            onClick={() => onOpenStatus(assessmentId)}
            className="px-4 py-1.5 bg-[#1B4332] hover:bg-[#143325] text-white font-medium cursor-pointer"
          >
            Pantau Status Laporan →
          </button>
        </div>
      </div>

      {/* Document Header */}
      <div className="bg-white border border-[#DFDCD4] p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono border-b border-[#DFDCD4] pb-4">
          <span className="text-[#161615] font-semibold">
            ID Laporan: {hasil.id || assessmentId}
          </span>
          <span className="text-[#14532D]">
            Kelengkapan: {kelengkapan.label || 'Lengkap'} ({kelengkapan.persen ?? 100}%)
          </span>
        </div>

        <h1 className="font-serif-editorial text-3xl sm:text-4xl text-[#161615]">
          {hasil.judul || 'Ringkasan Pengisian'}
        </h1>

        {/* Mandatory Keterbatasan / Non-Diagnosis Box */}
        <div className="bg-[#FEF3C7] border border-[#FDE68A] p-4 text-xs text-[#78350F] space-y-1">
          <p className="font-semibold">
            Keterbatasan hasil: {hasil.keterbatasan || 'Hasil self-assessment bukan diagnosis.'}
          </p>
          {hasil.langkah_berikutnya && (
            <p className="text-[#575653]">{hasil.langkah_berikutnya}</p>
          )}
        </div>
      </div>

      {/* GAD-7 Score Section */}
      {skor && skor.dapat_dihitung && (
        <div className="bg-white border border-[#DFDCD4] p-6 sm:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#DFDCD4] pb-5">
            <div className="space-y-1">
              <p className="text-xs font-mono uppercase tracking-wider text-[#6E6C66]">
                Skor {skor.instrumen}
              </p>
              <p className="text-xs sm:text-sm text-[#161615] leading-relaxed">
                {skor.keterangan}
              </p>
              {skor.referensi && (
                <p className="text-[11px] text-[#6E6C66] italic">{skor.referensi}</p>
              )}
            </div>

            <div className="bg-[#F6F5F0] border border-[#DFDCD4] p-4 text-right shrink-0">
              <div className={`text-3xl font-mono font-bold ${catStyle.ring}`}>
                {skor.total}
                <span className="text-sm font-normal text-[#6E6C66]">/{skor.maks}</span>
              </div>
              <span
                className={`inline-block mt-1 px-2.5 py-0.5 text-xs font-medium border ${catStyle.badge}`}
              >
                {skor.kategori?.label} ({skor.kategori?.rentang})
              </span>
            </div>
          </div>

          {skor.tabel_kategori && (
            <div className="grid grid-cols-2 sm:grid-cols-4 border border-[#DFDCD4] divide-y sm:divide-y-0 sm:divide-x divide-[#DFDCD4] text-xs">
              {skor.tabel_kategori.map((kat) => {
                const active = kat.kode === skor.kategori?.kode;
                return (
                  <div
                    key={kat.kode}
                    className={`p-3 ${
                      active ? 'bg-[#161615] text-white font-semibold' : 'bg-white text-[#6E6C66]'
                    }`}
                  >
                    <span className="block font-mono text-[11px]">
                      {kat.min}–{kat.max}
                    </span>
                    <span className="block mt-0.5">{kat.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Perubahan dari laporan sebelumnya */}
      {perubahan && (
        <div className="bg-white border border-[#DFDCD4] p-6 sm:p-8 space-y-4">
          <div className="border-b border-[#DFDCD4] pb-3 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="font-serif-editorial text-2xl text-[#161615]">
                Perubahan dari Laporan Sebelumnya
              </h2>
              <p className="text-xs text-[#6E6C66] font-mono">
                Dibandingkan dengan {perubahan.pembanding_id}{' '}
                {perubahan.pembanding_dikirim_pada
                  ? `(${formatDateTime(perubahan.pembanding_dikirim_pada)})`
                  : ''}
              </p>
            </div>

            {perubahan.skor && (
              <span className="font-mono text-xs bg-[#F6F5F0] border border-[#DFDCD4] px-3 py-1 font-semibold text-[#161615]">
                Skor {perubahan.skor.sebelumnya} → {perubahan.skor.sekarang} (
                {perubahan.skor.selisih >= 0
                  ? `+${perubahan.skor.selisih}`
                  : perubahan.skor.selisih}
                ) · {perubahan.skor.kategori_sebelumnya} → {perubahan.skor.kategori_sekarang}
              </span>
            )}
          </div>

          {(perubahan.perubahan || []).length === 0 ? (
            <p className="text-xs text-[#6E6C66]">Tidak ada perubahan jawaban.</p>
          ) : (
            <div className="border border-[#DFDCD4] divide-y divide-[#DFDCD4] text-xs">
              {perubahan.perubahan.map((chg, idx) => (
                <div
                  key={chg.question_id || idx}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <span className="font-medium text-[#161615]">{chg.label}</span>
                  <div className="font-mono text-[#575653]">
                    <span>{chg.sebelumnya}</span>
                    <span className="mx-2 text-[#161615]">→</span>
                    <strong className="text-[#161615]">{chg.sekarang}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Jawaban Anda */}
      <div className="bg-white border border-[#DFDCD4] p-6 sm:p-8 space-y-4">
        <h2 className="font-serif-editorial text-2xl text-[#161615]">Jawaban Anda</h2>

        <div className="border border-[#DFDCD4] divide-y divide-[#DFDCD4] text-xs">
          {ringkasan.map((item) => {
            const isUnfilled = !item.terisi || item.jawaban_teks === 'Belum diisi';
            const isMeasurement = item.data_type === 'pengukuran';
            return (
              <div
                key={item.question_id}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#161615]">{item.label}</span>
                    <span
                      className={`font-mono text-[10px] px-1.5 py-0.5 border ${
                        isMeasurement
                          ? 'bg-[#EBF3FE] text-[#1E40AF] border-[#BFDBFE]'
                          : 'bg-[#F6F5F0] text-[#6E6C66] border-[#DFDCD4]'
                      }`}
                    >
                      {isMeasurement ? 'pengukuran' : 'subjektif'}
                    </span>
                  </div>
                  <p className="text-[#6E6C66] mt-0.5">{item.pertanyaan}</p>
                </div>

                <div className="shrink-0 self-end sm:self-center">
                  {isUnfilled ? (
                    <span className="italic text-[#878580]">Belum diisi</span>
                  ) : (
                    <span className="font-semibold text-[#161615] bg-[#F6F5F0] border border-[#DFDCD4] px-2.5 py-1">
                      {item.jawaban_teks}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
