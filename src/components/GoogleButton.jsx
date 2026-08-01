import { useState } from 'react';
import BottomSheet from './BottomSheet.jsx';
import { login } from '../lib/firebase.js';

/** 「使用 Google 登入」按鈕，登入中會轉圈 */
export default function GoogleButton({ label = '使用 Google 登入', onDone }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function go() {
    setBusy(true);
    setErr('');
    try {
      await login();
      onDone?.();
    } catch (e) {
      setErr(e.message || '登入失敗，請再試一次');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="btn btn-primary btn-block" onClick={go} disabled={busy}>
        {busy ? <span className="spin" /> : <GoogleMark />}
        {busy ? '登入中…' : label}
      </button>
      {err && (
        <p style={{ color: 'var(--danger)', fontSize: 14, marginTop: 10, textAlign: 'center' }}>
          {err}
        </p>
      )}
    </>
  );
}

/** 訪客想編輯時跳出來的登入提示 */
export function LoginSheet({ open, onClose, reason }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="登入才能編輯">
      <p className="muted" style={{ margin: '0 8px 18px', lineHeight: 1.9 }}>
        {reason || '看和聽都不用登入，但要新增或修改單字卡，需要一個 Google 帳號，這樣大家才知道是誰改的。'}
      </p>
      <div style={{ padding: '0 8px 6px' }}>
        <GoogleButton onDone={onClose} />
      </div>
    </BottomSheet>
  );
}

export function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h11.8c-.5 2.7-2 5-4.4 6.6v5.500h7.1c4.2-3.8 6.6-9.5 6.6-16.3z" />
      <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.2 15.5 46 24 46z" />
      <path fill="#FBBC05" d="M11.8 28.3c-.4-1.3-.7-2.7-.7-4.3s.3-3 .7-4.3v-5.7H4.5C2.9 17.2 2 20.5 2 24s.9 6.8 2.5 10l7.3-5.7z" />
      <path fill="#EA4335" d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.2 29.9 2 24 2 15.5 2 8.1 6.8 4.5 14l7.3 5.7c1.7-5.2 6.5-8.9 12.2-8.9z" />
    </svg>
  );
}
