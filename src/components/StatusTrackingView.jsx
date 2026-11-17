// language: JSX, file: src/components/StatusTrackingView.jsx, runtime: React 19 / Vite, target: Telehealth Frontend
import React, { useEffect, useState, useCallback } from 'react';
import { telehealthApi } from '../services/api';
import {
  formatDateTime,
  getDeliveryBadgeStyle,
  getReviewBadgeStyle,
  getFriendlyErrorMessage,
} from '../utils/helpers';

export default function StatusTrackingView({ assessmentId, onBack, onOpenResult }) {
  const [statusData, setStatusData] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [replyTexts, setReplyTexts] = useState({});
  const [submittingCid, setSubmittingCid] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const fetchStatusAndDetail = useCallback(async () => {
    if (!assessmentId) return;
    setLoading(true);
    setError(null);
    try {
      const [stRes, dtRes] = await Promise.all([
        telehealthApi.getAssessmentStatus(assessmentId),
        telehealthApi.getAssessmentDetail(assessmentId).catch(() => ({ data: null })),
      ]);
      setStatusData(stRes.data);
      setDetailData(dtRes.data);
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    fetchStatusAndDetail();
  }, [fetchStatusAndDetail]);

  const handleSendClarificationReply = async (cid) => {
    const jawaban = (replyTexts[cid] || '').trim();
    setFeedback(null);
    setSubmittingCid(cid);
    try {
      const res = await telehealthApi.replyClarification(assessmentId, cid, jawaban);
      setFeedback({
        type: 'success',
        text: res.message || 'Jawaban klarifikasi terkirim.',
      });
      setReplyTexts((prev) => ({ ...prev, [cid]: '' }));
      await fetchStatusAndDetail();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: getFriendlyErrorMessage(err),
      });
    } finally {
      setSubmittingCid(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-[#DFDCD4] p-10 text-center text-xs font-mono text-[#6E6C66] max-w-3xl mx-auto my-8">
        Memuat status laporan...
      </div>
    );
  }

  if (error || !statusData) {
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
          {error || 'Data status tidak ditemukan.'}
        </div>
      </div>
    );
  }

  const deliv = statusData.status_pengiriman || {};
  const rev = statusData.status_peninjauan || {};
  const pendingClarifications = statusData.klarifikasi_menunggu || [];
  const allClarifications = detailData?.klarifikasi || pendingClarifications;
  const tindakLanjut = statusData.tindak_lanjut || detailData?.tindak_lanjut || null;
  const timeline = statusData.timeline || [];

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
            onClick={() => onOpenResult(assessmentId)}
            className="px-3.5 py-1.5 bg-white border border-[#DFDCD4] hover:border-[#161615] text-[#161615] font-medium cursor-pointer"
          >
            Lihat Ringkasan
          </button>
          <button
            type="button"
            onClick={fetchStatusAndDetail}
            className="px-3.5 py-1.5 bg-[#1B4332] hover:bg-[#143325] text-white font-medium cursor-pointer"
          >
            Muat Ulang Status
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`border p-4 text-xs ${
            feedback.type === 'success'
              ? 'bg-[#E6F2EC] border-[#B7DBC8] text-[#14532D]'
              : 'bg-[#FDECEB] border-[#F5C2C0] text-[#991B1B]'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Status Pengiriman & Peninjauan */}
      <div className="bg-white border border-[#DFDCD4] p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DFDCD4] pb-4">
          <div>
            <p className="font-mono text-xs text-[#6E6C66]">
              Laporan {statusData.id || assessmentId}
            </p>
            <h1 className="font-serif-editorial text-3xl text-[#161615] mt-0.5">
              Status Laporan
            </h1>
          </div>
          {statusData.dikirim_pada && (
            <span className="font-mono text-xs text-[#6E6C66]">
              Dikirim: {formatDateTime(statusData.dikirim_pada)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 border border-[#DFDCD4] divide-y sm:divide-y-0 sm:divide-x divide-[#DFDCD4] bg-[#F6F5F0]">
          <div className="p-4 flex items-center justify-between text-xs">
            <span className="text-[#575653] font-medium">Pengiriman</span>
            <span className={`px-2.5 py-1 border font-semibold ${getDeliveryBadgeStyle(deliv.kode)}`}>
              {deliv.label}
            </span>
          </div>
          <div className="p-4 flex items-center justify-between text-xs">
            <span className="text-[#575653] font-medium">Peninjauan</span>
            <span className={`px-2.5 py-1 border font-semibold ${getReviewBadgeStyle(rev.kode)}`}>
              {rev.label}
            </span>
          </div>
        </div>

        <div className="bg-[#F6F5F0] border border-[#DFDCD4] p-4 text-xs space-y-1">
          <p className="font-medium text-[#161615]">
            {statusData.pesan || detailData?.pesan_status}
          </p>
          {statusData.peninjau && (
            <p className="text-[#6E6C66]">
              Peninjau: {statusData.peninjau.nama} ({statusData.peninjau.jabatan || statusData.peninjau.role})
            </p>
          )}
        </div>
      </div>

      {/* Tindak Lanjut */}
      {tindakLanjut && (
        <div className="bg-white border border-[#B7DBC8] p-6 sm:p-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EFECE6] pb-3">
            <h2 className="font-serif-editorial text-2xl text-[#161615]">Tindak Lanjut</h2>
            <span className="px-2.5 py-1 bg-[#E6F2EC] border border-[#B7DBC8] text-[#14532D] text-xs font-semibold">
              {tindakLanjut.jenis?.label || tindakLanjut.jenis?.kode}
            </span>
          </div>

          <p className="text-sm text-[#161615] leading-relaxed">{tindakLanjut.arahan}</p>

          {tindakLanjut.jadwal_konsultasi && (
            <div className="bg-[#E6F2EC] border border-[#B7DBC8] p-3 text-xs text-[#14532D] font-mono">
              Jadwal konsultasi: <strong>{formatDateTime(tindakLanjut.jadwal_konsultasi)}</strong>
            </div>
          )}

          <p className="text-xs text-[#6E6C66] font-mono">
            Dicatat oleh {tindakLanjut.dicatat_oleh?.nama || 'Petugas'} ·{' '}
            {formatDateTime(tindakLanjut.dicatat_pada)}
          </p>
        </div>
      )}

      {/* Klarifikasi dari Petugas */}
      {(pendingClarifications.length > 0 || allClarifications.length > 0) && (
        <div className="bg-white border border-[#DFDCD4] p-6 sm:p-8 space-y-4">
          <h2 className="font-serif-editorial text-2xl text-[#161615] border-b border-[#DFDCD4] pb-3">
            Klarifikasi dari Petugas
          </h2>

          <div className="space-y-4">
            {(allClarifications.length > 0 ? allClarifications : pendingClarifications).map(
              (kl) => {
                const isWaiting = kl.status === 'menunggu_jawaban' || !kl.jawaban;
                return (
                  <div
                    key={kl.id}
                    className="border border-[#DFDCD4] bg-[#F6F5F0] p-4 space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between font-mono text-[#6E6C66]">
                      <span>{kl.id}</span>
                      <span>
                        {kl.diminta_oleh?.nama || 'Petugas'} · {formatDateTime(kl.diminta_pada)}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-[#161615]">
                      Petugas: {kl.pertanyaan}
                    </p>

                    {isWaiting ? (
                      <div className="space-y-2 pt-1">
                        <label className="block font-medium text-[#161615]">
                          Jawaban Anda *
                        </label>
                        <textarea
                          rows={3}
                          value={replyTexts[kl.id] || ''}
                          onChange={(e) =>
                            setReplyTexts((prev) => ({ ...prev, [kl.id]: e.target.value }))
                          }
                          placeholder="Tulis jawaban Anda..."
                          className="w-full bg-white border border-[#DFDCD4] focus:border-[#161615] p-3 text-sm text-[#161615] outline-none"
                        />
                        <button
                          type="button"
                          disabled={submittingCid === kl.id}
                          onClick={() => handleSendClarificationReply(kl.id)}
                          className="bg-[#1B4332] hover:bg-[#143325] text-white px-4 py-2 text-xs font-medium cursor-pointer"
                        >
                          {submittingCid === kl.id ? 'Mengirim...' : 'Kirim Klarifikasi'}
                        </button>
                      </div>
                    ) : (
                      <div className="bg-white border border-[#DFDCD4] p-3 space-y-1">
                        <span className="font-mono text-[11px] text-[#14532D] block">
                          Dijawab pada {formatDateTime(kl.dijawab_pada)}
                        </span>
                        <p className="text-sm text-[#161615]">{kl.jawaban}</p>
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}

      {/* Riwayat Status (Timeline) */}
      <div className="bg-white border border-[#DFDCD4] p-6 sm:p-8 space-y-4">
        <h2 className="font-serif-editorial text-2xl text-[#161615] border-b border-[#DFDCD4] pb-3">
          Riwayat Status
        </h2>

        <div className="divide-y divide-[#EFECE6]">
          {[...timeline].reverse().map((ev, idx) => (
            <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3 text-xs">
              <span
                className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                  idx === 0 ? 'bg-[#1B4332]' : 'bg-[#C8C4B8]'
                }`}
              />
              <div className="space-y-0.5">
                <p className="font-medium text-[#161615]">{ev.keterangan}</p>
                <p className="font-mono text-[11px] text-[#6E6C66]">
                  {formatDateTime(ev.waktu)}
                  {ev.aktor ? ` · ${ev.aktor.nama}` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
