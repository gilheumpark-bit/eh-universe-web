"use client";

import React, { useState } from 'react';
import { AppLanguage } from '@/lib/studio-types';
import { ENGINE_VERSION } from '@/lib/studio-constants';
import { useAuth } from '@/lib/AuthContext';
import {
  User, Shield, Cpu, Trash2,
  ChevronRight, Zap, Bell, Key, Monitor, Smartphone, Hash, Thermometer
} from 'lucide-react';

interface SettingsViewProps {
  language: AppLanguage;
  onClearAll: () => void;
  onManageApiKey: () => void;
}

const LABELS: Record<AppLanguage, Record<string, string>> = {
  KO: { engineSettings: "엔진 설정", defaultPlatform: "기본 플랫폼", defaultPlatformDesc: "새 프로젝트의 기본 출력 플랫폼", defaultEpisodes: "기본 에피소드 수", defaultEpisodesDesc: "새 프로젝트의 기본 총 에피소드 수", temperature: "Temperature", temperatureDesc: "AI 생성의 창의성 수준 (0.0 = 정확, 1.0 = 창의적)", mobile: "모바일", web: "웹" },
  EN: { engineSettings: "Engine Settings", defaultPlatform: "Default Platform", defaultPlatformDesc: "Default output platform for new projects", defaultEpisodes: "Default Episodes", defaultEpisodesDesc: "Default total episodes for new projects", temperature: "Temperature", temperatureDesc: "AI generation creativity level (0.0 = precise, 1.0 = creative)", mobile: "Mobile", web: "Web" },
  JP: { engineSettings: "エンジン設定", defaultPlatform: "デフォルトプラットフォーム", defaultPlatformDesc: "新規プロジェクトのデフォルト出力プラットフォーム", defaultEpisodes: "デフォルトエピソード数", defaultEpisodesDesc: "新規プロジェクトのデフォルト総エピソード数", temperature: "Temperature", temperatureDesc: "AI生成の創造性レベル（0.0 = 正確、1.0 = 創造的）", mobile: "モバイル", web: "ウェブ" },
  CN: { engineSettings: "引擎设置", defaultPlatform: "默认平台", defaultPlatformDesc: "新项目的默认输出平台", defaultEpisodes: "默认集数", defaultEpisodesDesc: "新项目的默认总集数", temperature: "Temperature", temperatureDesc: "AI生成创意水平（0.0 = 精确，1.0 = 创意）", mobile: "移动端", web: "网页端" },
};

const SettingsView: React.FC<SettingsViewProps> = ({ language, onClearAll, onManageApiKey }) => {
  const isKO = language === 'KO';
  const l = LABELS[language];
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [defaultPlatform, setDefaultPlatform] = useState<string>(() => typeof window !== 'undefined' ? localStorage.getItem('noa_default_platform') || 'MOBILE' : 'MOBILE');
  const [defaultEpisodes, setDefaultEpisodes] = useState<number>(() => typeof window !== 'undefined' ? parseInt(localStorage.getItem('noa_default_episodes') || '25') : 25);
  const [temperature, setTemperature] = useState<number>(() => typeof window !== 'undefined' ? parseFloat(localStorage.getItem('noa_temperature') || '0.7') : 0.7);

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-12 animate-in fade-in duration-500 pb-32">
      <div>
        <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">{isKO ? "설정 및 계정" : "Settings & Account"}</h2>
        <p className="text-zinc-600 text-[10px] font-bold tracking-widest uppercase">System Control Center</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* Profile Card */}
        <ProfileCard isKO={isKO} />

        {/* Engine Status Card */}
        <div className="bg-zinc-900/20 border border-zinc-800 rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 space-y-6">
          <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-500" /> Narrative Engine
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-zinc-800">
              <span className="text-xs text-zinc-400">{isKO ? "엔진 버전" : "Engine Version"}</span>
              <span className="text-xs font-black text-blue-400">ANS {ENGINE_VERSION}</span>
            </div>
            <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-zinc-800">
              <span className="text-xs text-zinc-400">{isKO ? "AI 모델" : "AI Model"}</span>
              <span className="text-xs font-black text-white">Gemini 2.5 Pro</span>
            </div>
            <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-zinc-800">
              <span className="text-xs text-zinc-400">{isKO ? "지연 시간" : "Latency"}</span>
              <span className="text-xs font-black text-green-500">OPTIMAL</span>
            </div>
          </div>
        </div>

        {/* Global Settings */}
        <div className="md:col-span-2 bg-zinc-900/20 border border-zinc-800 rounded-3xl md:rounded-[2.5rem] p-6 md:p-10">
          <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-8 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500" /> {isKO ? "일반 설정" : "General Preferences"}
          </h3>

          <div className="space-y-2">
            <div
              onClick={onManageApiKey}
              className="flex items-center justify-between p-4 md:p-6 hover:bg-zinc-900/40 rounded-3xl transition-all cursor-pointer border border-transparent hover:border-zinc-800 active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-zinc-900 rounded-2xl"><Key className="w-5 h-5 text-zinc-500" /></div>
                <div>
                  <div className="text-sm font-bold">{isKO ? "API 키 관리" : "API Key Management"}</div>
                  <div className="text-[11px] text-zinc-500 hidden sm:block">{isKO ? "Gemini API 키를 설정하고 관리합니다." : "Configure and manage your Gemini API key."}</div>
                </div>
              </div>
              <div className="text-[10px] font-black text-blue-500 uppercase shrink-0 ml-2">
                {localStorage.getItem('noa_api_key') ? (isKO ? '설정됨' : 'Set') : (isKO ? '미설정' : 'Not Set')}
              </div>
            </div>

            <div
              onClick={() => setNotificationsOn(prev => !prev)}
              className="flex items-center justify-between p-4 md:p-6 hover:bg-zinc-900/40 rounded-3xl transition-all cursor-pointer border border-transparent hover:border-zinc-800"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-zinc-900 rounded-2xl"><Bell className="w-5 h-5 text-zinc-500" /></div>
                <div>
                  <div className="text-sm font-bold">{isKO ? "알림 설정" : "Notifications"}</div>
                  <div className="text-[11px] text-zinc-500 hidden sm:block">{isKO ? "엔진 정산 완료 및 시스템 업데이트 알림" : "Engine settlement and system update notifications"}</div>
                </div>
              </div>
              <div className={`relative w-10 h-6 rounded-full flex items-center transition-colors duration-300 shrink-0 ${notificationsOn ? 'bg-blue-600 justify-end' : 'bg-zinc-700 justify-start'}`}>
                <div className="w-4 h-4 bg-white rounded-full shadow-md transform transition-transform mx-1"></div>
              </div>
            </div>

            <div
              onClick={(e) => { e.stopPropagation(); onClearAll(); }}
              className="flex items-center justify-between p-4 md:p-6 hover:bg-red-500/10 rounded-3xl transition-all cursor-pointer border border-transparent hover:border-red-500/30 group active:scale-[0.98] active:bg-red-500/20"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-zinc-900 rounded-2xl group-hover:bg-red-500/20 transition-colors"><Trash2 className="w-5 h-5 text-red-500" /></div>
                <div>
                  <div className="text-sm font-bold text-red-500">{isKO ? "데이터 초기화" : "Reset Data"}</div>
                  <div className="text-[11px] text-zinc-500 hidden sm:block">{isKO ? "저장된 모든 소설 설계도와 아카이브를 영구 삭제합니다." : "Permanently delete all saved blueprints and archives."}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-red-500" />
            </div>
          </div>
        </div>

        {/* Engine Settings */}
        <div className="md:col-span-2 bg-zinc-900/20 border border-zinc-800 rounded-3xl md:rounded-[2.5rem] p-6 md:p-10">
          <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-8 flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-500" /> {l.engineSettings}
          </h3>
          <div className="space-y-2">
            {/* Default Platform */}
            <div className="flex items-center justify-between p-4 md:p-6 rounded-3xl border border-transparent">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-zinc-900 rounded-2xl">
                  {defaultPlatform === 'MOBILE' ? <Smartphone className="w-5 h-5 text-zinc-500" /> : <Monitor className="w-5 h-5 text-zinc-500" />}
                </div>
                <div>
                  <div className="text-sm font-bold">{l.defaultPlatform}</div>
                  <div className="text-[11px] text-zinc-500 hidden sm:block">{l.defaultPlatformDesc}</div>
                </div>
              </div>
              <div className="flex gap-2">
                {(['MOBILE', 'WEB'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => { setDefaultPlatform(p); localStorage.setItem('noa_default_platform', p); }}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${defaultPlatform === p ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-500 hover:text-white'}`}
                  >
                    {p === 'MOBILE' ? l.mobile : l.web}
                  </button>
                ))}
              </div>
            </div>

            {/* Default Episodes */}
            <div className="flex items-center justify-between p-4 md:p-6 rounded-3xl border border-transparent">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-zinc-900 rounded-2xl"><Hash className="w-5 h-5 text-zinc-500" /></div>
                <div>
                  <div className="text-sm font-bold">{l.defaultEpisodes}</div>
                  <div className="text-[11px] text-zinc-500 hidden sm:block">{l.defaultEpisodesDesc}</div>
                </div>
              </div>
              <input
                type="number"
                min={1}
                max={200}
                value={defaultEpisodes}
                onChange={e => { const v = parseInt(e.target.value) || 25; setDefaultEpisodes(v); localStorage.setItem('noa_default_episodes', String(v)); }}
                className="w-20 bg-black/50 border border-zinc-800 rounded-xl px-3 py-2 text-sm font-black text-center text-blue-400 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Temperature */}
            <div className="flex items-center justify-between p-4 md:p-6 rounded-3xl border border-transparent">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-zinc-900 rounded-2xl"><Thermometer className="w-5 h-5 text-zinc-500" /></div>
                <div>
                  <div className="text-sm font-bold">{l.temperature}</div>
                  <div className="text-[11px] text-zinc-500 hidden sm:block">{l.temperatureDesc}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={e => { const v = parseFloat(e.target.value); setTemperature(v); localStorage.setItem('noa_temperature', String(v)); }}
                  className="w-24 accent-blue-600 h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer"
                />
                <span className="text-sm font-black text-blue-400 w-8 text-right">{temperature.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="md:col-span-2 flex flex-col gap-4 md:flex-row justify-between items-center px-2 md:px-10">
          <div className="flex items-center gap-4">
            <Zap className="w-4 h-4 text-zinc-800" />
            <span className="text-[9px] font-black text-zinc-800 uppercase tracking-widest">Version {ENGINE_VERSION}-NEXUS</span>
          </div>
          <div className="flex gap-6 text-[9px] font-black text-zinc-700 uppercase tracking-widest">
            <button className="hover:text-zinc-500 transition-colors">Privacy</button>
            <button className="hover:text-zinc-500 transition-colors">Terms</button>
          </div>
        </div>
      </div>
    </div>
  );
};

function ProfileCard({ isKO }: { isKO: boolean }) {
  const { user, signInWithGoogle, signOut, isConfigured, error } = useAuth();

  if (user) {
    return (
      <div className="bg-zinc-900/20 border border-zinc-800 rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl overflow-hidden shrink-0 bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-xl font-black">{user.displayName?.[0] || '?'}</span>
            )}
          </div>
          <div>
            <h3 className="font-black text-base md:text-lg">{user.displayName || (isKO ? '작가' : 'Writer')}</h3>
            <p className="text-zinc-500 text-xs">{user.email}</p>
          </div>
        </div>
        <button onClick={signOut}
          className="w-full flex items-center justify-between px-6 py-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:border-red-500/50 hover:text-red-400 transition-all active:scale-[0.98]">
          {isKO ? '로그아웃' : 'Sign Out'} <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/20 border border-zinc-800 rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-2xl md:rounded-3xl flex items-center justify-center shrink-0">
          <User className="w-6 h-6 md:w-8 md:h-8 text-zinc-500" />
        </div>
        <div>
          <h3 className="font-black text-base md:text-lg">{isKO ? '게스트' : 'Guest'}</h3>
          <p className="text-zinc-600 text-xs">{isKO ? '로그인하면 세션이 계정에 연동됩니다' : 'Sign in to sync sessions to your account'}</p>
        </div>
      </div>
      <button onClick={() => {
        if (!isConfigured) {
          alert(isKO ? 'Firebase 설정이 필요합니다.' : 'Firebase configuration required.');
          return;
        }
        signInWithGoogle();
      }}
        className="w-full flex items-center justify-between px-6 py-4 bg-blue-600/10 border border-blue-500/30 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-600/20 transition-all active:scale-[0.98] text-blue-400">
        🔑 {isKO ? 'Google 로그인' : 'Sign in with Google'} <ChevronRight className="w-4 h-4" />
      </button>
      {error && (
        <p className="text-red-400 text-xs px-2">{error}</p>
      )}
    </div>
  );
}

export default SettingsView;

