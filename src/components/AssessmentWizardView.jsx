// language: JSX, file: src/components/AssessmentWizardView.jsx, runtime: React 19 / Vite, target: Telehealth Frontend
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { telehealthApi } from '../services/api';
import {
  isVisible,
  isAnswerFilled,
  getTodayIsoDate,
  getDeliveryBadgeStyle,
  getReviewBadgeStyle,
  getFriendlyErrorMessage,
} from '../utils/helpers';

export default function AssessmentWizardView({
  config,
  formId,
  resumeAssessmentId,
  onNavigate,
  onOpenResult,
  onOpenStatus,
}) {
  const [formDef, setFormDef] = useState(null);
  const [assessmentId, setAssessmentId] = useState(resumeAssessmentId || null);
  const [step, setStep] = useState('loading');
  const [agreed, setAgreed] = useState(false);
  const [answers, setAnswers] = useState({});
  const [touchedKeys, setTouchedKeys] = useState(new Set());
  const [sectionIdx, setSectionIdx] = useState(0);
  const [fieldErrors, setFieldErrors] = useState({});
  const [bannerMsg, setBannerMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [validationData, setValidationData] = useState(null);
  const [validating, setValidating] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function init() {
      setStep('loading');
      setBannerMsg(null);
      try {
        if (resumeAssessmentId) {
          const detailRes = await telehealthApi.getAssessmentDetail(resumeAssessmentId);
          const draft = detailRes.data;
          const targetFormId = draft.form?.id || formId || 'FRM-KELUHAN';
          const formRes = await telehealthApi.getFormDetail(targetFormId);
          if (!mounted) return;
          setFormDef(formRes.data);
          setAssessmentId(draft.id);
          setAnswers(draft.answers || {});
          setAgreed(Boolean(draft.persetujuan?.disetujui ?? true));
          setSectionIdx(0);
          setStep('fill');
        } else {
          const formRes = await telehealthApi.getFormDetail(formId || 'FRM-KELUHAN');
          if (!mounted) return;
          setFormDef(formRes.data);
          setAssessmentId(null);
          setAnswers({});
          setAgreed(false);
          setSectionIdx(0);
          setStep('consent');
        }
      } catch (err) {
        if (!mounted) return;
        setBannerMsg({
          type: 'error',
          text: getFriendlyErrorMessage(err),
        });
        setStep('consent');
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, [formId, resumeAssessmentId]);

  const visibleSections = useMemo(() => {
    if (!formDef?.sections) return [];
    return formDef.sections.filter((sec) => isVisible(sec.show_if, answers));
  }, [formDef, answers]);

  const safeSectionIdx = Math.min(sectionIdx, Math.max(0, visibleSections.length - 1));
  const currentSection = visibleSections[safeSectionIdx] || null;

  const visibleQuestionsInCurrentSection = useMemo(() => {
    if (!currentSection?.questions) return [];
    return currentSection.questions.filter((q) => isVisible(q.show_if, answers));
  }, [currentSection, answers]);

  const buildAnswersPayload = useCallback(
    (includeNullForCleared = true) => {
      if (!formDef?.sections) return answers;
      const payload = {};
      for (const sec of formDef.sections) {
        const secVisible = isVisible(sec.show_if, answers);
        for (const q of sec.questions || []) {
          const qVisible = secVisible && isVisible(q.show_if, answers);
          const val = answers[q.id];
          if (qVisible && isAnswerFilled(val)) {
            payload[q.id] = val;
          } else if (includeNullForCleared && touchedKeys.has(q.id)) {
            payload[q.id] = null;
          }
        }
      }
      return payload;
    },
    [formDef, answers, touchedKeys]
  );

  const handleStartAssessment = async () => {
    if (!agreed) return;
    setSaving(true);
    setBannerMsg(null);
    try {
      const res = await telehealthApi.createAssessment({
        form_id: formDef.id,
        persetujuan: true,
        mahasiswa: config.mahasiswa,
        answers: {},
      });
      setAssessmentId(res.data.id);
      setSectionIdx(0);
      setStep('fill');
      setBannerMsg({
        type: 'success',
        text: `Draf ${res.data.id} dibuat.`,
      });
    } catch (err) {
      setBannerMsg({
        type: 'error',
        text: getFriendlyErrorMessage(err),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
    setTouchedKeys((prev) => {
      const next = new Set(prev);
      next.add(questionId);
      return next;
    });
    if (fieldErrors[questionId]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[questionId];
        return copy;
      });
    }
  };

  const handleMultiChoiceToggle = (question, option) => {
    const currentArr = Array.isArray(answers[question.id]) ? answers[question.id] : [];
    const exists = currentArr.includes(option.value);

    let nextArr;
    if (exists) {
      nextArr = currentArr.filter((v) => v !== option.value);
    } else if (option.exclusive) {
      nextArr = [option.value];
    } else {
      const exclusiveValues = new Set(
        (question.options || []).filter((o) => o.exclusive).map((o) => o.value)
      );
      nextArr = [...currentArr.filter((v) => !exclusiveValues.has(v)), option.value];
    }
    handleAnswerChange(question.id, nextArr.length > 0 ? nextArr : null);
  };

  const validateCurrentSectionLocally = () => {
    const errs = {};
    for (const q of visibleQuestionsInCurrentSection) {
      const val = answers[q.id];
      if (q.required && !isAnswerFilled(val)) {
        errs[q.id] = q.pesan_wajib || `Kolom "${q.label}" wajib diisi.`;
        continue;
      }
      if (isAnswerFilled(val) && q.type === 'number') {
        const num = Number(val);
        if (Number.isNaN(num)) {
          errs[q.id] = 'Masukkan angka yang valid.';
        } else if (q.min !== undefined && num < q.min) {
          errs[q.id] = `Nilai minimal ${q.min}${q.satuan ? ' ' + q.satuan : ''}.`;
        } else if (q.max !== undefined && num > q.max) {
          errs[q.id] = `Nilai maksimal ${q.max}${q.satuan ? ' ' + q.satuan : ''}.`;
        }
      }
      if (isAnswerFilled(val) && q.type === 'date' && q.max === 'today') {
        if (val > getTodayIsoDate()) {
          errs[q.id] = 'Tanggal tidak boleh melebihi hari ini.';
        }
      }
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveDraft = async (silent = false) => {
    if (!assessmentId) return true;
    setSaving(true);
    if (!silent) setBannerMsg(null);
    try {
      const payload = buildAnswersPayload(true);
      await telehealthApi.patchAssessment(assessmentId, payload);
      if (!silent) {
        setBannerMsg({
          type: 'success',
          text: `Draf ${assessmentId} disimpan.`,
        });
      }
      return true;
    } catch (err) {
      if (err.errors) {
        setFieldErrors((prev) => ({ ...prev, ...err.errors }));
      }
      setBannerMsg({
        type: 'error',
        text: getFriendlyErrorMessage(err),
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNextSection = async () => {
    setBannerMsg(null);
    if (!validateCurrentSectionLocally()) {
      setBannerMsg({
        type: 'error',
        text: 'Lengkapi pertanyaan bertanda bintang (*) pada bagian ini sebelum lanjut, atau klik "Simpan Draf".',
      });
      return;
    }

    const ok = await handleSaveDraft(true);
    if (!ok) return;

    if (safeSectionIdx < visibleSections.length - 1) {
      setSectionIdx(safeSectionIdx + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      await openReviewStep();
    }
  };

  const openReviewStep = async () => {
    setStep('review');
    setValidating(true);
    setBannerMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      if (assessmentId) {
        await telehealthApi.patchAssessment(assessmentId, buildAnswersPayload(true));
      }
      const cleanAnswers = buildAnswersPayload(false);
      const res = await telehealthApi.validateForm(
        formDef.id,
        config.mahasiswa.nim,
        cleanAnswers
      );
      setValidationData(res.data);
      if (res.data.errors) {
        setFieldErrors(res.data.errors);
      }
    } catch (err) {
      setBannerMsg({
        type: 'error',
        text: getFriendlyErrorMessage(err),
      });
    } finally {
      setValidating(false);
    }
  };

  const handleJumpToQuestion = (questionId) => {
    const idx = visibleSections.findIndex((sec) =>
      (sec.questions || []).some((q) => q.id === questionId)
    );
    if (idx !== -1) {
      setSectionIdx(idx);
    }
    setStep('fill');
  };

  const handleSubmitAssessment = async () => {
    if (!assessmentId) return;
    setSaving(true);
    setBannerMsg(null);
    try {
      await telehealthApi.patchAssessment(assessmentId, buildAnswersPayload(true));
      const res = await telehealthApi.submitAssessment(assessmentId);
      setSubmittedData(res.data);
      setStep('submitted');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err.status === 422 && err.errors) {
        setFieldErrors(err.errors);
      }
      setBannerMsg({
        type: 'error',
        text: getFriendlyErrorMessage(err),
      });
    } finally {
      setSaving(false);
    }
  };

  if (step === 'loading' || !formDef) {
    return (
      <div className="bg-white border border-[#DFDCD4] p-10 text-center max-w-2xl mx-auto my-8">
        <p className="text-xs font-mono text-[#6E6C66]">Memuat formulir dari server...</p>
      </div>
    );
  }

  // ==================== STEP 1: PETUNJUK & PERSETUJUAN ====================
  if (step === 'consent') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <button
          type="button"
          onClick={() => onNavigate('beranda')}
          className="text-xs font-medium text-[#575653] hover:text-[#161615] cursor-pointer"
        >
          ← Kembali ke Beranda
        </button>

        {bannerMsg && (
          <div className="bg-[#FDECEB] border border-[#F5C2C0] p-4 text-xs text-[#991B1B]">
            {bannerMsg.text}
          </div>
        )}

        <div className="bg-white border border-[#DFDCD4] p-6 sm:p-8 space-y-6">
          <div className="border-b border-[#DFDCD4] pb-5 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-[#6E6C66]">
              <span>{formDef.id} · v{formDef.versi}</span>
              <span>Estimasi ± {formDef.estimasi_menit} menit</span>
            </div>
            <h1 className="font-serif-editorial text-3xl sm:text-4xl text-[#161615]">
              {formDef.judul}
            </h1>
            <p className="text-xs sm:text-sm text-[#575653] leading-relaxed">
              {formDef.deskripsi}
            </p>
            <p className="text-xs text-[#6E6C66] pt-1">
              Periode pelaporan: <strong className="text-[#161615]">{formDef.periode_pelaporan}</strong>
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-wider text-[#6E6C66]">
              Petunjuk Pengisian
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-[#161615] leading-relaxed">
              {(formDef.petunjuk || []).map((pt, i) => (
                <li key={i}>{pt}</li>
              ))}
            </ol>
          </div>

          <label
            htmlFor="consent-check"
            className={`block border p-4 cursor-pointer transition ${
              agreed
                ? 'bg-[#E6F2EC] border-[#B7DBC8]'
                : 'bg-[#F6F5F0] border-[#DFDCD4] hover:border-[#161615]'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                id="consent-check"
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 accent-[#1B4332] cursor-pointer"
              />
              <div className="text-xs sm:text-sm leading-relaxed text-[#161615]">
                <span className="font-semibold block mb-0.5">Persetujuan Pasien *</span>
                {formDef.persetujuan?.teks}
              </div>
            </div>
          </label>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-[#EFECE6]">
            <span className="text-xs text-[#6E6C66]">
              Identitas pengirim: <strong className="font-mono text-[#161615]">{config.mahasiswa.nim}</strong>
            </span>
            <button
              type="button"
              disabled={!agreed || saving}
              onClick={handleStartAssessment}
              className="bg-[#1B4332] hover:bg-[#143325] disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-3 text-xs font-medium transition cursor-pointer"
            >
              {saving ? 'Membuat draf...' : 'Mulai Pengisian →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== STEP 2: PENGISIAN BERTAHAP ====================
  if (step === 'fill' && currentSection) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Stepper Header */}
        <div className="bg-white border border-[#DFDCD4] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <button
              type="button"
              onClick={() => onNavigate('beranda')}
              className="text-[#575653] hover:text-[#161615] font-medium cursor-pointer"
            >
              ← Simpan & Keluar
            </button>
            <div className="flex items-center gap-3">
              {assessmentId && (
                <span className="font-mono text-[#6E6C66]">ID Draf: {assessmentId}</span>
              )}
              <button
                type="button"
                onClick={openReviewStep}
                className="px-3 py-1 bg-[#F6F5F0] hover:bg-[#EFECE6] border border-[#DFDCD4] text-[#161615] font-medium cursor-pointer"
              >
                Periksa Jawaban
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 border border-[#DFDCD4] divide-y sm:divide-y-0 sm:divide-x divide-[#DFDCD4]">
            {visibleSections.map((sec, idx) => {
              const isCurrent = idx === safeSectionIdx;
              const isDone = idx < safeSectionIdx;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setSectionIdx(idx)}
                  className={`p-2.5 text-left text-xs transition cursor-pointer ${
                    isCurrent
                      ? 'bg-[#161615] text-white font-semibold'
                      : isDone
                      ? 'bg-[#E6F2EC] text-[#14532D]'
                      : 'bg-white text-[#6E6C66] hover:bg-[#FAF9F6]'
                  }`}
                >
                  <span className="block font-mono text-[10px] opacity-75">
                    Bagian {idx + 1}/{visibleSections.length}
                  </span>
                  <span className="block truncate mt-0.5">{sec.judul}</span>
                </button>
              );
            })}
          </div>
        </div>

        {bannerMsg && (
          <div
            className={`border p-4 text-xs ${
              bannerMsg.type === 'success'
                ? 'bg-[#E6F2EC] border-[#B7DBC8] text-[#14532D]'
                : 'bg-[#FDECEB] border-[#F5C2C0] text-[#991B1B]'
            }`}
          >
            {bannerMsg.text}
          </div>
        )}

        {/* Active Section Sheet */}
        <div className="bg-white border border-[#DFDCD4] p-6 sm:p-8 space-y-6">
          <div className="border-b border-[#DFDCD4] pb-4">
            <p className="text-xs font-mono uppercase tracking-wider text-[#6E6C66]">
              Bagian {safeSectionIdx + 1} dari {visibleSections.length}
            </p>
            <h2 className="font-serif-editorial text-3xl text-[#161615] mt-0.5">
              {currentSection.judul}
            </h2>
            {currentSection.deskripsi && (
              <p className="text-xs sm:text-sm text-[#575653] mt-1">{currentSection.deskripsi}</p>
            )}
          </div>

          <div className="divide-y divide-[#EFECE6]">
            {visibleQuestionsInCurrentSection.map((q) => {
              const val = answers[q.id];
              const errMsg = fieldErrors[q.id];
              const isMeasurement = q.data_type === 'pengukuran';

              return (
                <div key={q.id} className="py-5 first:pt-0 last:pb-0 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-mono px-2 py-0.5 border ${
                          isMeasurement
                            ? 'bg-[#EBF3FE] text-[#1E40AF] border-[#BFDBFE]'
                            : 'bg-[#F6F5F0] text-[#575653] border-[#DFDCD4]'
                        }`}
                      >
                        {isMeasurement ? 'Data Pengukuran' : 'Laporan Subjektif'}
                      </span>
                      {!q.required && (
                        <span className="text-[11px] text-[#878580]">(Opsional)</span>
                      )}
                    </div>

                    {isAnswerFilled(val) && (
                      <button
                        type="button"
                        onClick={() => handleAnswerChange(q.id, null)}
                        className="text-[11px] text-[#6E6C66] hover:text-[#991B1B] underline cursor-pointer"
                      >
                        Kosongkan jawaban
                      </button>
                    )}
                  </div>

                  <label className="block text-sm sm:text-base font-medium text-[#161615]">
                    {q.pertanyaan}{' '}
                    {q.required && <span className="text-[#991B1B] font-bold">*</span>}
                  </label>

                  {q.catatan && (
                    <p className="text-xs text-[#6E6C66]">{q.catatan}</p>
                  )}

                  {/* Question Type Controls */}
                  <div>
                    {q.type === 'single_choice' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(q.options || []).map((opt) => {
                          const selected = val === opt.value;
                          return (
                            <button
                              key={String(opt.value)}
                              type="button"
                              onClick={() => handleAnswerChange(q.id, opt.value)}
                              className={`text-left border p-3 flex items-center justify-between gap-3 text-xs sm:text-sm transition cursor-pointer ${
                                selected
                                  ? 'bg-[#1B4332] text-white border-[#1B4332] font-medium'
                                  : 'bg-[#F6F5F0] text-[#161615] border-[#DFDCD4] hover:bg-[#EFECE6]'
                              }`}
                            >
                              <span>{opt.label}</span>
                              <span
                                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                  selected ? 'border-white bg-white' : 'border-[#878580]'
                                }`}
                              >
                                {selected && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#1B4332]" />
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {q.type === 'multi_choice' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(q.options || []).map((opt) => {
                          const selected = Array.isArray(val) && val.includes(opt.value);
                          return (
                            <button
                              key={String(opt.value)}
                              type="button"
                              onClick={() => handleMultiChoiceToggle(q, opt)}
                              className={`text-left border p-3 flex items-center justify-between gap-3 text-xs sm:text-sm transition cursor-pointer ${
                                selected
                                  ? 'bg-[#1B4332] text-white border-[#1B4332] font-medium'
                                  : 'bg-[#F6F5F0] text-[#161615] border-[#DFDCD4] hover:bg-[#EFECE6]'
                              }`}
                            >
                              <div>
                                <span className="block">{opt.label}</span>
                                {opt.exclusive && (
                                  <span
                                    className={`text-[10px] ${
                                      selected ? 'text-[#B7DBC8]' : 'text-[#6E6C66]'
                                    }`}
                                  >
                                    Opsi eksklusif
                                  </span>
                                )}
                              </div>
                              <span
                                className={`w-3.5 h-3.5 border flex items-center justify-center text-[10px] shrink-0 ${
                                  selected
                                    ? 'border-white bg-white text-[#1B4332] font-bold'
                                    : 'border-[#878580]'
                                }`}
                              >
                                {selected ? '✓' : ''}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {q.type === 'scale' && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(q.options || []).map((opt) => {
                          const numVal = Number(opt.value);
                          const selected = val === numVal;
                          return (
                            <button
                              key={String(opt.value)}
                              type="button"
                              onClick={() => handleAnswerChange(q.id, numVal)}
                              className={`border p-3 text-left transition cursor-pointer ${
                                selected
                                  ? 'bg-[#1B4332] text-white border-[#1B4332] font-medium'
                                  : 'bg-[#F6F5F0] text-[#161615] border-[#DFDCD4] hover:bg-[#EFECE6]'
                              }`}
                            >
                              <span className="block font-mono text-sm font-semibold">
                                {opt.value}
                              </span>
                              <span className="block text-xs mt-1">{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {q.type === 'number' && (
                      <div className="flex items-center max-w-xs border border-[#DFDCD4] bg-[#F6F5F0] focus-within:border-[#161615] focus-within:bg-white">
                        <input
                          type="number"
                          min={q.min}
                          max={q.max}
                          step={q.step || 1}
                          value={val === null || val === undefined ? '' : val}
                          placeholder={q.placeholder || ''}
                          onChange={(e) => {
                            const raw = e.target.value;
                            handleAnswerChange(q.id, raw === '' ? null : Number(raw));
                          }}
                          className="w-full px-3.5 py-2.5 text-sm font-mono text-[#161615] bg-transparent outline-none"
                        />
                        {q.satuan && (
                          <span className="px-3.5 py-2.5 text-xs font-mono text-[#575653] border-l border-[#DFDCD4] bg-[#EFECE6]">
                            {q.satuan}
                          </span>
                        )}
                      </div>
                    )}

                    {q.type === 'date' && (
                      <div className="max-w-xs">
                        <input
                          type="date"
                          max={q.max === 'today' ? getTodayIsoDate() : q.max}
                          value={val || ''}
                          onChange={(e) =>
                            handleAnswerChange(q.id, e.target.value ? e.target.value : null)
                          }
                          className="w-full bg-[#F6F5F0] border border-[#DFDCD4] focus:border-[#161615] focus:bg-white px-3.5 py-2.5 text-sm font-mono text-[#161615] outline-none"
                        />
                      </div>
                    )}

                    {q.type === 'text' && (
                      <div>
                        <input
                          type="text"
                          maxLength={q.max_length || 150}
                          value={val || ''}
                          placeholder={q.placeholder || ''}
                          onChange={(e) =>
                            handleAnswerChange(q.id, e.target.value ? e.target.value : null)
                          }
                          className="w-full bg-[#F6F5F0] border border-[#DFDCD4] focus:border-[#161615] focus:bg-white px-3.5 py-2.5 text-sm text-[#161615] outline-none"
                        />
                        {q.max_length && (
                          <div className="text-right text-[11px] font-mono text-[#878580] mt-1">
                            {(val || '').length}/{q.max_length}
                          </div>
                        )}
                      </div>
                    )}

                    {q.type === 'textarea' && (
                      <div>
                        <textarea
                          rows={3}
                          maxLength={q.max_length || 500}
                          value={val || ''}
                          placeholder={q.placeholder || ''}
                          onChange={(e) =>
                            handleAnswerChange(q.id, e.target.value ? e.target.value : null)
                          }
                          className="w-full bg-[#F6F5F0] border border-[#DFDCD4] focus:border-[#161615] focus:bg-white px-3.5 py-2.5 text-sm text-[#161615] outline-none"
                        />
                        {q.max_length && (
                          <div className="text-right text-[11px] font-mono text-[#878580] mt-1">
                            {(val || '').length}/{q.max_length}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {errMsg && (
                    <p className="text-xs font-medium text-[#991B1B]">{errMsg}</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-5 border-t border-[#DFDCD4] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {safeSectionIdx > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSectionIdx(safeSectionIdx - 1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-4 py-2.5 bg-white border border-[#DFDCD4] hover:border-[#161615] text-xs font-medium text-[#161615] cursor-pointer"
                >
                  ← Sebelumnya
                </button>
              )}
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSaveDraft(false)}
                className="px-4 py-2.5 bg-[#F6F5F0] hover:bg-[#EFECE6] border border-[#DFDCD4] text-xs font-medium text-[#161615] cursor-pointer"
              >
                {saving ? 'Menyimpan...' : 'Simpan Draf'}
              </button>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={handleNextSection}
              className="px-6 py-2.5 bg-[#1B4332] hover:bg-[#143325] text-white text-xs font-medium cursor-pointer"
            >
              {safeSectionIdx < visibleSections.length - 1
                ? 'Simpan & Lanjut →'
                : 'Periksa Jawaban →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== STEP 3: PERIKSA SEBELUM MENGIRIM ====================
  if (step === 'review') {
    const kelengkapan = validationData?.kelengkapan || {
      status: 'belum_lengkap',
      persen: 0,
      wajib_terisi: 0,
      wajib_total: 0,
    };
    const previewRingkasan = validationData?.hasil_pratinjau?.ringkasan || [];
    const previewSkor = validationData?.hasil_pratinjau?.skor || null;
    const valErrors = validationData?.errors || {};
    const isReadyToSubmit = Boolean(validationData?.valid);

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => setStep('fill')}
            className="text-[#575653] hover:text-[#161615] font-medium cursor-pointer"
          >
            ← Kembali ke Formulir
          </button>
          {assessmentId && (
            <span className="font-mono text-[#6E6C66]">ID Draf: {assessmentId}</span>
          )}
        </div>

        {bannerMsg && (
          <div className="bg-[#FDECEB] border border-[#F5C2C0] p-4 text-xs text-[#991B1B]">
            {bannerMsg.text}
          </div>
        )}

        <div className="bg-white border border-[#DFDCD4] p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#DFDCD4] pb-5">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-[#6E6C66]">
                Verifikasi Pra-Kirim
              </p>
              <h1 className="font-serif-editorial text-3xl text-[#161615] mt-1">
                Periksa Jawaban Sebelum Mengirim
              </h1>
            </div>
            <span
              className={`px-3 py-1 text-xs font-mono border ${
                isReadyToSubmit
                  ? 'bg-[#E6F2EC] text-[#14532D] border-[#B7DBC8] font-semibold'
                  : 'bg-[#FEF3C7] text-[#78350F] border-[#FDE68A]'
              }`}
            >
              {validating
                ? 'Memeriksa...'
                : `Kelengkapan: ${kelengkapan.wajib_terisi}/${kelengkapan.wajib_total} (${
                    kelengkapan.persen ?? 0
                  }%)`}
            </span>
          </div>

          {Object.keys(valErrors).length > 0 && (
            <div className="bg-[#FDECEB] border border-[#F5C2C0] p-4 space-y-2 text-xs text-[#991B1B]">
              <p className="font-semibold">Pertanyaan wajib yang belum lengkap:</p>
              <ul className="space-y-1.5">
                {Object.entries(valErrors).map(([qId, msg]) => (
                  <li key={qId} className="flex items-center justify-between gap-2">
                    <span>• {msg}</span>
                    <button
                      type="button"
                      onClick={() => handleJumpToQuestion(qId)}
                      className="underline font-semibold shrink-0 cursor-pointer"
                    >
                      Isi sekarang →
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {previewSkor && previewSkor.dapat_dihitung && (
            <div className="bg-[#F6F5F0] border border-[#DFDCD4] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div>
                <p className="font-semibold text-[#161615]">{previewSkor.instrumen}</p>
                <p className="text-[#575653] mt-0.5">{previewSkor.keterangan}</p>
              </div>
              <div className="font-mono text-right shrink-0">
                <span className="text-xl font-bold text-[#161615]">
                  {previewSkor.total}/{previewSkor.maks}
                </span>
                <span className="block text-[#575653]">{previewSkor.kategori?.label}</span>
              </div>
            </div>
          )}

          {/* Answer Table */}
          <div className="border border-[#DFDCD4] divide-y divide-[#DFDCD4]">
            {previewRingkasan.map((item) => {
              const isUnfilled = !item.terisi || item.jawaban_teks === 'Belum diisi';
              return (
                <div
                  key={item.question_id}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#161615]">{item.label}</span>
                      {item.data_type === 'pengukuran' && (
                        <span className="font-mono text-[10px] px-1.5 py-0.5 bg-[#EBF3FE] text-[#1E40AF]">
                          ukur
                        </span>
                      )}
                    </div>
                    <p className="text-[#6E6C66] mt-0.5">{item.pertanyaan}</p>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    {isUnfilled ? (
                      <span className="italic text-[#878580]">Belum diisi</span>
                    ) : (
                      <span className="font-semibold text-[#161615] bg-[#F6F5F0] border border-[#DFDCD4] px-2.5 py-1">
                        {item.jawaban_teks}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleJumpToQuestion(item.question_id)}
                      className="text-[#575653] hover:text-[#161615] underline cursor-pointer"
                    >
                      Ubah
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-[#DFDCD4]">
            <button
              type="button"
              onClick={() => setStep('fill')}
              className="px-4 py-2.5 bg-white border border-[#DFDCD4] hover:border-[#161615] text-xs font-medium text-[#161615] cursor-pointer"
            >
              ← Ubah Jawaban
            </button>

            <div className="flex flex-wrap items-center gap-2">
              {!isReadyToSubmit && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSubmitAssessment}
                  className="px-3.5 py-2.5 bg-[#F5EFE6] border border-[#E2D3BC] text-[#78350F] text-xs font-medium cursor-pointer"
                >
                  Tes Kirim Belum Lengkap (422)
                </button>
              )}
              <button
                type="button"
                disabled={!isReadyToSubmit || saving}
                onClick={handleSubmitAssessment}
                className="px-6 py-2.5 bg-[#1B4332] hover:bg-[#143325] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium cursor-pointer"
              >
                {saving ? 'Mengirim...' : 'Kirim Jawaban →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== STEP 4: KONFIRMASI PENGIRIMAN ====================
  if (step === 'submitted') {
    const deliv = submittedData?.status_pengiriman || {
      kode: 'terkirim',
      label: 'Terkirim',
    };
    const rev = submittedData?.status_peninjauan || {
      kode: 'menunggu_peninjauan',
      label: 'Menunggu peninjauan',
    };

    return (
      <div className="max-w-xl mx-auto my-8 bg-white border border-[#DFDCD4] p-8 space-y-6">
        <div className="border-b border-[#DFDCD4] pb-4">
          <p className="font-mono text-xs text-[#14532D] uppercase">
            Pengiriman Berhasil · #{assessmentId}
          </p>
          <h1 className="font-serif-editorial text-3xl text-[#161615] mt-1">
            Formulir Anda telah diterima.
          </h1>
          <p className="text-xs sm:text-sm text-[#575653] mt-1">
            {submittedData?.pesan_status ||
              'Laporan masuk ke antrean petugas dan tidak dapat diubah kembali.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 bg-[#F6F5F0] border border-[#DFDCD4] p-4 text-xs">
          <div>
            <span className="text-[#6E6C66] block">Status Pengiriman</span>
            <span
              className={`inline-block mt-1 px-2 py-0.5 border font-medium ${getDeliveryBadgeStyle(
                deliv.kode
              )}`}
            >
              {deliv.label}
            </span>
          </div>
          <div>
            <span className="text-[#6E6C66] block">Status Peninjauan</span>
            <span
              className={`inline-block mt-1 px-2 py-0.5 border font-medium ${getReviewBadgeStyle(
                rev.kode
              )}`}
            >
              {rev.label}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => onOpenResult(assessmentId)}
            className="px-4 py-2.5 bg-white border border-[#DFDCD4] hover:border-[#161615] text-xs font-medium text-[#161615] cursor-pointer"
          >
            Lihat Ringkasan Hasil
          </button>
          <button
            type="button"
            onClick={() => onOpenStatus(assessmentId)}
            className="px-4 py-2.5 bg-[#1B4332] hover:bg-[#143325] text-white text-xs font-medium cursor-pointer"
          >
            Pantau Status →
          </button>
          <button
            type="button"
            onClick={() => onNavigate('beranda')}
            className="px-4 py-2.5 text-xs text-[#575653] hover:text-[#161615] cursor-pointer"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  return null;
}
