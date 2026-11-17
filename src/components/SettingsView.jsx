// language: JSX, file: src/components/SettingsView.jsx, runtime: React 19 / Vite, target: Telehealth Frontend
import React, { useState } from 'react';
import { PATIENT_PRESETS, telehealthApi, isMahasiswaValid } from '../services/api';
import { getFriendlyErrorMessage } from '../utils/helpers';

export default function SettingsView({ config, onSaveConfig, onNavigate }) {
  const [nim, setNim] = useState(config.mahasiswa?.nim || '');
  const [nama, setNama] = useState(config.mahasiswa?.nama || '');
  const [kelas, setKelas] = useState(config.mahasiswa?.kelas || '');
  const [token, setToken] = useState(config.token || PATIENT_PRESETS[0].token);
  const [baseUrl, setBaseUrl] = useState(
    config.baseUrl || 'https://telehealth.informatikaunimus.site/api'
  );
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const validateFields = () => {
    const errs = {};
    const cleanNim = nim.trim().toUpperCase();
    const cleanNama = nama.trim();
    const cleanKelas = kelas.trim();

    if (cleanNim.length < 5 || cleanNim.length > 20 || !/^[A-Z0-9.\-_]+$/.test(cleanNim)) {
      errs.nim = 'NIM diisi 5–20 karakter huruf/angka (contoh: G2A021001).';
    }
    if (cleanNama.length < 3 || cleanNama.length > 100) {
      errs.nama = 'Nama diisi 3–100 karakter.';
    }
    if (cleanKelas.length < 1 || cleanKelas.length > 20) {
      errs.kelas = 'Kelas wajib diisi, maks. 20 karakter (contoh: TI-5A).';
    }
    if (!token.trim()) {
      errs.token = 'Token pasien wajib diisi.';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveAndTest = async (e) => {
    e.preventDefault();
    setFeedback(null);
    if (!validateFields()) return;

    const nextConfig = {
      baseUrl: baseUrl.trim().replace(/\/+$/, ''),
      token: token.trim(),
      mahasiswa: {
        nim: nim.trim().toUpperCase(),
        nama: nama.trim(),
        kelas: kelas.trim(),
      },
    };

    setTesting(true);
    try {
      const res = await telehealthApi.getMe(nextConfig.mahasiswa.nim, {
        customToken: nextConfig.token,
        customBaseUrl: nextConfig.baseUrl,
      });
      onSaveConfig(nextConfig, res.data);
      setFeedback({
        type: 'success',
        title: 'Koneksi terhubung dan konfigurasi disimpan.',
        detail: `Akun aktif: ${res.data.nama} (${res.data.id} / ${res.data.no_rm}) · Filter NIM: ${nextConfig.mahasiswa.nim}`,
      });
    } catch (err) {
      onSaveConfig(nextConfig, null);
      setFeedback({
        type: 'error',
        title: `Koneksi gagal (HTTP ${err.status || 'Jaringan'})`,
        detail: getFriendlyErrorMessage(err),
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-[#DFDCD4] pb-5 gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-[#6E6C66]">
            Konfigurasi Aplikasi
          </p>
          <h1 className="font-serif-editorial text-3xl sm:text-4xl text-[#161615] mt-1">
            Identitas Mahasiswa & Token Pasien
          </h1>
        </div>
        {isMahasiswaValid(config.mahasiswa) && (
          <button
            type="button"
            onClick={() => onNavigate('beranda')}
            className="self-start sm:self-auto px-4 py-2 bg-white border border-[#DFDCD4] hover:border-[#161615] text-xs font-medium text-[#161615] transition cursor-pointer"
          >
            ← Kembali ke Beranda
          </button>
        )}
      </div>

      {feedback && (
        <div
          className={`border p-4 text-xs space-y-1 ${
            feedback.type === 'success'
              ? 'bg-[#E6F2EC] border-[#B7DBC8] text-[#14532D]'
              : 'bg-[#FDECEB] border-[#F5C2C0] text-[#991B1B]'
          }`}
        >
          <p className="font-semibold text-sm">{feedback.title}</p>
          <p>{feedback.detail}</p>
          {feedback.type === 'success' && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigate('beranda')}
                className="px-3 py-1.5 bg-[#14532D] text-white text-xs font-medium cursor-pointer"
              >
                Buka Beranda →
              </button>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSaveAndTest} className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Identitas Mahasiswa */}
        <section className="md:col-span-6 bg-white border border-[#DFDCD4] p-6 space-y-5">
          <div className="border-b border-[#EFECE6] pb-3">
            <h2 className="text-base font-semibold text-[#161615]">1. Identitas Mahasiswa</h2>
            <p className="text-xs text-[#6E6C66] mt-0.5">
              Dikirim pada setiap pembuatan self-assessment dan dipakai untuk memfilter riwayat.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#161615] mb-1.5">
              NIM <span className="text-[#991B1B]">*</span>
            </label>
            <input
              type="text"
              value={nim}
              onChange={(e) => setNim(e.target.value.toUpperCase())}
              placeholder="G2A021001"
              maxLength={20}
              className="w-full bg-[#F6F5F0] border border-[#DFDCD4] focus:border-[#161615] focus:bg-white px-3.5 py-2.5 text-sm font-mono text-[#161615] outline-none transition"
            />
            {fieldErrors.nim && (
              <p className="text-xs text-[#991B1B] mt-1">{fieldErrors.nim}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#161615] mb-1.5">
              Nama Lengkap <span className="text-[#991B1B]">*</span>
            </label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Rina Wulandari"
              maxLength={100}
              className="w-full bg-[#F6F5F0] border border-[#DFDCD4] focus:border-[#161615] focus:bg-white px-3.5 py-2.5 text-sm text-[#161615] outline-none transition"
            />
            {fieldErrors.nama && (
              <p className="text-xs text-[#991B1B] mt-1">{fieldErrors.nama}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#161615] mb-1.5">
              Kelas <span className="text-[#991B1B]">*</span>
            </label>
            <input
              type="text"
              value={kelas}
              onChange={(e) => setKelas(e.target.value)}
              placeholder="TI-5A"
              maxLength={20}
              className="w-full bg-[#F6F5F0] border border-[#DFDCD4] focus:border-[#161615] focus:bg-white px-3.5 py-2.5 text-sm text-[#161615] outline-none transition"
            />
            {fieldErrors.kelas && (
              <p className="text-xs text-[#991B1B] mt-1">{fieldErrors.kelas}</p>
            )}
          </div>
        </section>

        {/* Token Pasien & Koneksi API */}
        <section className="md:col-span-6 bg-white border border-[#DFDCD4] p-6 space-y-5">
          <div className="border-b border-[#EFECE6] pb-3">
            <h2 className="text-base font-semibold text-[#161615]">2. Token Bearer Pasien</h2>
            <p className="text-xs text-[#6E6C66] mt-0.5">
              Pilih satu dari tiga akun simulasi pasien yang dibagikan dosen.
            </p>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-medium text-[#161615]">Pilih Akun Pasien:</span>
            <div className="divide-y divide-[#DFDCD4] border border-[#DFDCD4]">
              {PATIENT_PRESETS.map((preset) => {
                const active = token.trim() === preset.token;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setToken(preset.token);
                      setFeedback(null);
                    }}
                    className={`w-full text-left p-3 flex items-center justify-between gap-3 transition cursor-pointer ${
                      active ? 'bg-[#F6F5F0]' : 'bg-white hover:bg-[#FAF9F6]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-semibold text-[#161615]">
                          {preset.id}
                        </span>
                        <span className="font-semibold text-[#161615]">{preset.nama}</span>
                      </div>
                      <p className="text-[11px] text-[#6E6C66] mt-0.5">{preset.keterangan}</p>
                    </div>
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        active ? 'border-[#1B4332] bg-[#1B4332]' : 'border-[#C8C4B8]'
                      }`}
                    >
                      {active && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-[#161615]">
                Token Pasien <span className="text-[#991B1B]">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setToken('tlh_pasien_token_salah_uji_401');
                  setFeedback({
                    type: 'error',
                    title: 'Token simulasi error 401 dipasang.',
                    detail: 'Klik "Simpan & Uji Koneksi" di bawah untuk melihat respons HTTP 401 dari API.',
                  });
                }}
                className="text-[11px] text-[#78350F] underline hover:text-[#161615] cursor-pointer"
              >
                Tes Token Salah (401)
              </button>
            </div>
            <div className="flex border border-[#DFDCD4] bg-[#F6F5F0] focus-within:border-[#161615] focus-within:bg-white">
              <input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="tlh_pasien_..."
                className="w-full px-3.5 py-2.5 text-xs font-mono text-[#161615] bg-transparent outline-none"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="px-3 text-xs text-[#575653] hover:text-[#161615] border-l border-[#DFDCD4] cursor-pointer"
              >
                {showToken ? 'Sembunyikan' : 'Lihat'}
              </button>
            </div>
            {fieldErrors.token && (
              <p className="text-xs text-[#991B1B] mt-1">{fieldErrors.token}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#161615] mb-1.5">
              Alamat API
            </label>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full bg-[#F6F5F0] border border-[#DFDCD4] focus:border-[#161615] focus:bg-white px-3.5 py-2 text-xs font-mono text-[#575653] outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={testing}
            className="w-full bg-[#1B4332] hover:bg-[#143325] disabled:opacity-50 text-white font-medium py-3 px-4 text-xs tracking-wide transition cursor-pointer"
          >
            {testing ? 'Menguji koneksi ke server...' : 'Simpan & Uji Koneksi'}
          </button>
        </section>
      </form>
    </div>
  );
}
