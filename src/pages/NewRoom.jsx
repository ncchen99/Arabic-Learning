import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { Globe02Icon, SquareLock02Icon } from '@hugeicons/core-free-icons';
import AppBar from '../components/AppBar.jsx';
import GoogleButton from '../components/GoogleButton.jsx';
import { useToast } from '../components/Toast.jsx';
import { DEFAULT_EMBLEM, EMBLEMS } from '../lib/emblems.js';
import { isGuest } from '../lib/firebase.js';
import { createRoom } from '../lib/store.js';

export default function NewRoom({ user }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState('');
  const [emblem, setEmblem] = useState(DEFAULT_EMBLEM);
  const [openEdit, setOpenEdit] = useState(true);
  const [busy, setBusy] = useState(false);

  if (isGuest(user)) {
    return (
      <>
        <AppBar title="建立學習教室" onBack={() => navigate('/')} />
        <div className="page">
          <div className="empty" style={{ paddingTop: 50 }}>
            <p className="muted" style={{ marginBottom: 22 }}>
              建立教室需要一個 Google 帳號，
              <br />
              這樣換裝置也找得回你的教室。
            </p>
            <div style={{ maxWidth: 300, margin: '0 auto' }}>
              <GoogleButton />
            </div>
          </div>
        </div>
      </>
    );
  }

  async function create(e) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const id = await createRoom(user, { name, emblem, openEdit });
      navigate(`/r/${id}?share=1`, { replace: true });
    } catch (err) {
      toast(err.message || '建立失敗');
      setBusy(false);
    }
  }

  return (
    <>
      <AppBar title="建立學習教室" onBack={() => navigate('/')} />

      <form className="page" onSubmit={create}>
        <div className="section-title">教室名稱</div>
        <input
          className="field"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：阿拉伯語入門班"
          maxLength={40}
          enterKeyHint="done"
        />

        <div className="section-title">徽章</div>
        <div className="emblem-grid">
          {EMBLEMS.map((e) => (
            <button
              key={e.id}
              type="button"
              className="emblem-pick"
              aria-pressed={emblem === e.id}
              onClick={() => setEmblem(e.id)}
            >
              <HugeiconsIcon icon={e.icon} size={26} strokeWidth={1.8} />
            </button>
          ))}
        </div>

        <div className="section-title">誰可以編輯</div>
        <div className="card" style={{ padding: '4px 8px' }}>
          {[
            {
              id: true,
              icon: Globe02Icon,
              label: '拿到連結的人都能編輯',
              hint: '他們要先用 Google 登入。適合一起共筆',
            },
            {
              id: false,
              icon: SquareLock02Icon,
              label: '只有我能編輯',
              hint: '其他人只能看和聽。適合老師發教材',
            },
          ].map((o) => (
            <button
              key={String(o.id)}
              type="button"
              className="sheet-item"
              onClick={() => setOpenEdit(o.id)}
            >
              <HugeiconsIcon icon={o.icon} size={22} strokeWidth={2} />
              <span className="label">
                {o.label}
                <div className="muted">{o.hint}</div>
              </span>
              {openEdit === o.id && <span style={{ color: 'var(--gold)' }}>✓</span>}
            </button>
          ))}
        </div>

        <button
          className="btn btn-primary btn-block"
          style={{ marginTop: 24 }}
          disabled={!name.trim() || busy}
        >
          {busy ? <span className="spin" /> : '建立教室'}
        </button>

        <p className="muted" style={{ textAlign: 'center', marginTop: 16 }}>
          建立後會拿到一條分享連結，隨時可以在教室設定裡改。
        </p>
      </form>
    </>
  );
}
