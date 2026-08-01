import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Logout03Icon, Moon02Icon, Sun03Icon, UserCircleIcon, VolumeHighIcon, InformationCircleIcon,
} from '@hugeicons/core-free-icons';
import AppBar from '../components/AppBar.jsx';
import BottomSheet from '../components/BottomSheet.jsx';
import PlayButton from '../components/PlayButton.jsx';
import GoogleButton from '../components/GoogleButton.jsx';
import { useToast } from '../components/Toast.jsx';
import { isGuest, logout } from '../lib/firebase.js';
import { DIALECT_LABEL, VOICES, voiceLabel } from '../lib/voices.js';

/* 讓使用者試聽用的短句：「你好」 */
const SAMPLE = 'مَرْحَباً';

export default function Settings({ user, theme, setTheme, voice, setVoice }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [voiceSheet, setVoiceSheet] = useState(false);
  const [themeSheet, setThemeSheet] = useState(false);
  const [aboutSheet, setAboutSheet] = useState(false);

  const guest = isGuest(user);
  const themeLabel = { auto: '跟隨系統', dark: '深色', light: '淺色' }[theme];

  return (
    <>
      <AppBar title="設定" onBack={() => navigate('/')} />

      <div className="page">
        {guest ? (
          <div className="card" style={{ padding: 20, marginTop: 16, textAlign: 'center' }}>
            <HugeiconsIcon icon={UserCircleIcon} size={44} strokeWidth={1.5} />
            <p style={{ margin: '10px 0 4px', fontWeight: 600 }}>你現在是訪客</p>
            <p className="muted" style={{ margin: '0 0 16px', lineHeight: 1.9 }}>
              看單字、聽發音都不用登入。
              <br />
              登入之後才能建立教室、編輯單字卡。
            </p>
            <GoogleButton />
          </div>
        ) : (
          <div
            className="card"
            style={{ padding: 18, marginTop: 16, display: 'flex', gap: 14, alignItems: 'center' }}
          >
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                width={48}
                height={48}
                style={{ borderRadius: '50%', border: '1px solid var(--line-strong)' }}
                referrerPolicy="no-referrer"
              />
            ) : (
              <HugeiconsIcon icon={UserCircleIcon} size={48} strokeWidth={1.6} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.displayName || '學習者'}
              </div>
              <div className="muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email}
              </div>
            </div>
          </div>
        )}

        <div className="section-title">偏好</div>
        <div className="card" style={{ padding: '4px 8px' }}>
          <button className="sheet-item" onClick={() => setVoiceSheet(true)}>
            <HugeiconsIcon icon={VolumeHighIcon} size={22} strokeWidth={2} />
            <span className="label">發音聲音</span>
            <span className="muted">{voiceLabel(voice)}</span>
          </button>
          <button className="sheet-item" onClick={() => setThemeSheet(true)}>
            <HugeiconsIcon icon={theme === 'light' ? Sun03Icon : Moon02Icon} size={22} strokeWidth={2} />
            <span className="label">外觀主題</span>
            <span className="muted">{themeLabel}</span>
          </button>
          <button className="sheet-item" onClick={() => setAboutSheet(true)}>
            <HugeiconsIcon icon={InformationCircleIcon} size={22} strokeWidth={2} />
            <span className="label">關於 Kalima</span>
          </button>
        </div>

        {!guest && (
          <>
            <div className="section-title">帳號</div>
            <div className="card" style={{ padding: '4px 8px' }}>
              <button className="sheet-item danger" onClick={() => logout()}>
                <HugeiconsIcon icon={Logout03Icon} size={22} strokeWidth={2} />
                <span className="label">登出</span>
              </button>
            </div>
          </>
        )}

        <p className="muted" style={{ textAlign: 'center', marginTop: 26 }}>
          教室存在雲端，換裝置登入同一個 Google 帳號就看得到。
        </p>
      </div>

      <BottomSheet open={voiceSheet} onClose={() => setVoiceSheet(false)} title="發音聲音">
        <p className="muted" style={{ margin: '0 8px 10px', lineHeight: 1.8 }}>
          全部都是阿拉伯語母語者的聲音。點右邊的播放鍵可以先試聽。
        </p>
        {VOICES.map((v, i) => (
          <div key={v.id}>
            {(i === 0 || VOICES[i - 1].dialect !== v.dialect) && (
              <div className="section-title" style={{ margin: '14px 8px 6px' }}>
                {DIALECT_LABEL[v.dialect]}
              </div>
            )}
            <div className="sheet-item" style={{ gap: 4 }}>
              <button
                onClick={() => {
                  setVoice(v.id);
                  setVoiceSheet(false);
                }}
                style={{ flex: 1, textAlign: 'start', display: 'flex', alignItems: 'center', gap: 10 }}
              >
                <span className="label">
                  {v.name}
                  <div className="muted">{v.hint}</div>
                </span>
                {voice === v.id && <span style={{ color: 'var(--gold)' }}>✓</span>}
              </button>
              <PlayButton text={SAMPLE} voice={v.id} label={`試聽 ${v.name}`} onError={toast} />
            </div>
          </div>
        ))}
      </BottomSheet>

      <BottomSheet open={themeSheet} onClose={() => setThemeSheet(false)} title="外觀主題">
        {[
          { id: 'auto', label: '跟隨系統' },
          { id: 'dark', label: '深色 · 午夜沙漠' },
          { id: 'light', label: '淺色 · 羊皮紙' },
        ].map((t) => (
          <button
            key={t.id}
            className="sheet-item"
            onClick={() => {
              setTheme(t.id);
              setThemeSheet(false);
            }}
          >
            <span className="label">{t.label}</span>
            {theme === t.id && <span style={{ color: 'var(--gold)' }}>✓</span>}
          </button>
        ))}
      </BottomSheet>

      <BottomSheet open={aboutSheet} onClose={() => setAboutSheet(false)} title="關於 Kalima">
        <p style={{ margin: '0 8px 12px', color: 'var(--text-2)', lineHeight: 1.9, fontSize: 15 }}>
          <span className="ar" style={{ fontSize: 22, color: 'var(--gold)' }}>كَلِمَة</span>{' '}
          (kalima) 在阿拉伯語裡就是「字」的意思。
        </p>
        <p style={{ margin: '0 8px 12px', color: 'var(--text-2)', lineHeight: 1.9, fontSize: 15 }}>
          單字內容由 OpenAI 產生（現代標準阿拉伯語 MSA，含完整母音符號），
          發音由 ElevenLabs 的阿拉伯語母語者聲音合成。每個字只會產生一次，
          之後所有教室共用，所以第二次查同樣的字是瞬間完成的。
        </p>
        <p className="muted" style={{ margin: '0 8px' }}>
          語音會存在裝置上，已經聽過的字離線也能播放。
        </p>
      </BottomSheet>
    </>
  );
}
