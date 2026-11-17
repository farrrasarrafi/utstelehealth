// language: JSX, file: src/App.jsx, runtime: React 19 / Vite / Capacitor Android, target: Telehealth Frontend
import React, { useState, useEffect } from 'react';
import {
  loadConfig,
  saveConfig,
  isMahasiswaValid,
  PATIENT_PRESETS,
  telehealthApi,
} from './services/api';
import DashboardView from './components/DashboardView';
import SettingsView from './components/SettingsView';
import AssessmentWizardView from './components/AssessmentWizardView';
import HistoryView from './components/HistoryView';
import ResultView from './components/ResultView';
import StatusTrackingView from './components/StatusTrackingView';

export default function App() {
  const [config, setConfig] = useState(() => loadConfig());
  const [activeView, setActiveView] = useState(() =>
    isMahasiswaValid(loadConfig().mahasiswa) ? 'beranda' : 'pengaturan'
  );
  const [wizardFormId, setWizardFormId] = useState('FRM-KELUHAN');
  const [resumeId, setResumeId] = useState(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState(null);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [apiOnline, setApiOnline] = useState(true);

  useEffect(() => {
    telehealthApi
      .checkHealth(config.baseUrl)
      .then(() => setApiOnline(true))
      .catch(() => setApiOnline(false));
  }, [config.baseUrl]);

  const currentPreset = PATIENT_PRESETS.find((p) => p.token === config.token);

  const handleSaveConfig = (newCfg) => {
    const saved = saveConfig(newCfg);
    setConfig(saved);
  };

  const handleQuickSwitchPatient = (preset) => {
    const updated = saveConfig({
      ...config,
      token: preset.token,
    });
    setConfig(updated);
  };

  const handleStartForm = (formId) => {
    if (!isMahasiswaValid(config.mahasiswa)) {
      setActiveView('pengaturan');
      return;
    }
    setWizardFormId(formId);
    setResumeId(null);
    setActiveView('wizard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResumeDraft = (assessmentId, formId) => {
    setWizardFormId(formId || 'FRM-KELUHAN');
    setResumeId(assessmentId);
    setActiveView('wizard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenResult = (assessmentId) => {
    setSelectedAssessmentId(assessmentId);
    setActiveView('hasil');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenStatus = (assessmentId) => {
    setSelectedAssessmentId(assessmentId);
    setActiveView('status');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenHistoryWithFilter = (filterKey) => {
    setHistoryFilter(filterKey);
    setActiveView('riwayat');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isHistoryGroup =
    activeView === 'riwayat' || activeView === 'hasil' || activeView === 'status';

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F5F0] text-[#161615] pb-16 md:pb-0">
      {/* Clinical Non-Diagnosis Notice Strip */}
      <div className="bg-[#1B4332] text-[#F6F5F0] text-[11px] sm:text-xs py-2 px-4 sm:px-8 border-b border-[#143325] safe-top">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <p>
            <strong className="font-semibold">Pernyataan Klinis:</strong> Hasil self-assessment bukan diagnosis. Laporan ditinjau oleh tenaga kesehatan.
          </p>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  apiOnline ? 'bg-emerald-400' : 'bg-rose-400'
                }`}
              />
              {apiOnline ? 'API v2.0 Aktif' : 'API Terputus'}
            </span>
            {isMahasiswaValid(config.mahasiswa) && (
              <span className="text-[#B7DBC8]">
                NIM: {config.mahasiswa.nim}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Masthead & Navigation */}
      <header className="bg-white border-b border-[#DFDCD4] sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <div className="flex flex-wrap items-center justify-between py-3.5 gap-3">
            <div className="flex items-baseline gap-4">
              <button
                type="button"
                onClick={() => setActiveView('beranda')}
                className="text-left cursor-pointer group"
              >
                <span className="block font-serif-editorial text-2xl sm:text-3xl tracking-tight text-[#161615] group-hover:text-[#1B4332] transition-colors">
                  Self-Assessment Pra-Konsultasi
                </span>
              </button>
              <span className="hidden lg:inline-block text-xs text-[#6E6C66] border-l border-[#DFDCD4] pl-3">
                Telehealth UNIMUS
              </span>
            </div>

            {/* Patient Account Switcher & Desktop Nav */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center bg-[#F6F5F0] border border-[#DFDCD4] p-0.5 text-xs">
                <span className="px-2 py-1 text-[11px] font-medium text-[#6E6C66]">
                  Pasien:
                </span>
                {PATIENT_PRESETS.map((p) => {
                  const active = config.token === p.token;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleQuickSwitchPatient(p)}
                      title={`${p.nama} — ${p.keterangan}`}
                      className={`px-2.5 py-1 font-mono text-xs transition cursor-pointer ${
                        active
                          ? 'bg-[#161615] text-white font-semibold'
                          : 'text-[#575653] hover:text-[#161615]'
                      }`}
                    >
                      {p.id}
                    </button>
                  );
                })}
              </div>

              {/* Desktop Navigation Tabs */}
              <nav className="hidden md:flex items-center border border-[#DFDCD4] bg-white text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setActiveView('beranda')}
                  className={`px-3.5 py-2 border-r border-[#DFDCD4] transition cursor-pointer ${
                    activeView === 'beranda'
                      ? 'bg-[#1B4332] text-white font-semibold'
                      : 'text-[#3F3E3A] hover:bg-[#F6F5F0]'
                  }`}
                >
                  Beranda
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHistoryFilter('all');
                    setActiveView('riwayat');
                  }}
                  className={`px-3.5 py-2 border-r border-[#DFDCD4] transition cursor-pointer ${
                    isHistoryGroup
                      ? 'bg-[#1B4332] text-white font-semibold'
                      : 'text-[#3F3E3A] hover:bg-[#F6F5F0]'
                  }`}
                >
                  Riwayat
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('pengaturan')}
                  className={`px-3.5 py-2 transition cursor-pointer ${
                    activeView === 'pengaturan'
                      ? 'bg-[#1B4332] text-white font-semibold'
                      : 'text-[#3F3E3A] hover:bg-[#F6F5F0]'
                  }`}
                >
                  Identitas & Token
                </button>
              </nav>
            </div>
          </div>

          {/* Sub-bar showing active patient & student record */}
          <div className="border-t border-[#EFECE6] py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs text-[#575653]">
            <div>
              Pasien Aktif:{' '}
              <strong className="text-[#161615]">
                {currentPreset ? `${currentPreset.nama} (${currentPreset.id})` : 'Token Kustom'}
              </strong>
            </div>

            <div>
              {isMahasiswaValid(config.mahasiswa) ? (
                <span>
                  <strong className="text-[#161615]">{config.mahasiswa.nama}</strong> ·{' '}
                  <span className="font-mono text-[#161615]">{config.mahasiswa.nim}</span> ·{' '}
                  <span>{config.mahasiswa.kelas}</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveView('pengaturan')}
                  className="text-[#991B1B] font-medium underline cursor-pointer"
                >
                  Isi identitas mahasiswa →
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8">
        {activeView === 'pengaturan' && (
          <SettingsView
            config={config}
            onSaveConfig={handleSaveConfig}
            onNavigate={setActiveView}
          />
        )}

        {activeView === 'beranda' && (
          <DashboardView
            config={config}
            onStartForm={handleStartForm}
            onNavigate={setActiveView}
            onOpenHistoryWithFilter={handleOpenHistoryWithFilter}
          />
        )}

        {activeView === 'wizard' && (
          <AssessmentWizardView
            config={config}
            formId={wizardFormId}
            resumeAssessmentId={resumeId}
            onNavigate={setActiveView}
            onOpenResult={handleOpenResult}
            onOpenStatus={handleOpenStatus}
          />
        )}

        {activeView === 'riwayat' && (
          <HistoryView
            config={config}
            initialFilter={historyFilter}
            onResumeDraft={handleResumeDraft}
            onOpenResult={handleOpenResult}
            onOpenStatus={handleOpenStatus}
            onStartForm={handleStartForm}
          />
        )}

        {activeView === 'hasil' && (
          <ResultView
            assessmentId={selectedAssessmentId}
            onBack={() => setActiveView('riwayat')}
            onOpenStatus={handleOpenStatus}
          />
        )}

        {activeView === 'status' && (
          <StatusTrackingView
            assessmentId={selectedAssessmentId}
            onBack={() => setActiveView('riwayat')}
            onOpenResult={handleOpenResult}
          />
        )}
      </main>

      {/* Mobile Sticky Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[#DFDCD4] grid grid-cols-3 divide-x divide-[#DFDCD4] safe-bottom">
        <button
          type="button"
          onClick={() => setActiveView('beranda')}
          className={`py-3 text-xs font-medium text-center transition cursor-pointer ${
            activeView === 'beranda'
              ? 'bg-[#1B4332] text-white font-semibold'
              : 'text-[#3F3E3A] active:bg-[#F6F5F0]'
          }`}
        >
          Beranda
        </button>
        <button
          type="button"
          onClick={() => {
            setHistoryFilter('all');
            setActiveView('riwayat');
          }}
          className={`py-3 text-xs font-medium text-center transition cursor-pointer ${
            isHistoryGroup
              ? 'bg-[#1B4332] text-white font-semibold'
              : 'text-[#3F3E3A] active:bg-[#F6F5F0]'
          }`}
        >
          Riwayat
        </button>
        <button
          type="button"
          onClick={() => setActiveView('pengaturan')}
          className={`py-3 text-xs font-medium text-center transition cursor-pointer ${
            activeView === 'pengaturan'
              ? 'bg-[#1B4332] text-white font-semibold'
              : 'text-[#3F3E3A] active:bg-[#F6F5F0]'
          }`}
        >
          Identitas & Token
        </button>
      </nav>

      {/* Desktop Footer */}
      <footer className="hidden md:block border-t border-[#DFDCD4] bg-white py-5 px-4 sm:px-8 text-xs text-[#6E6C66]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Hasil self-assessment bukan diagnosis. Data ditinjau oleh tenaga kesehatan.</span>
          <span className="font-mono text-[11px]">Telehealth API v2.0 · Informatika UNIMUS</span>
        </div>
      </footer>
    </div>
  );
}
