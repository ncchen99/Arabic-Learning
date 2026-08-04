import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete02Icon, Globe02Icon, Share08Icon, SquareLock02Icon } from '@hugeicons/core-free-icons';
import AppBar from '../components/AppBar.jsx';
import BottomSheet from '../components/BottomSheet.jsx';
import ShareSheet from '../components/ShareSheet.jsx';
import { useToast } from '../components/Toast.jsx';
import { EMBLEMS, emblemIcon } from '../lib/emblems.js';
import { deleteRoom, forgetRoom, updateRoom } from '../lib/store.js';

/** 教室設定：擁有者可以改名、換徽章、切換編輯權限、刪除教室 */
export default function RoomSettings({ room, cards, isOwner, user }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState(room.name);
  const [share, setShare] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const back = () => navigate(`/r/${room.id}`);

  async function patch(data) {
    try {
      await updateRoom(room.id, data);
    } catch {
      toast('沒有權限修改這間教室');
    }
  }

  async function saveName() {
    const v = name.trim().slice(0, 40);
    if (!v || v === room.name) {
      setName(room.name);
      return;
    }
    await patch({ name: v });
    toast('已更名');
  }

  async function remove() {
    setBusy(true);
    try {
      await deleteRoom(room.id);
      await forgetRoom(user, room.id);
      navigate('/', { replace: true });
    } catch {
      toast('刪除失敗');
      setBusy(false);
    }
  }

  return (
    <>
      <AppBar title={isOwner ? '教室設定' : '教室資訊'} onBack={back} />

      <div className="page">
        <div className="band lead" style={{ padding: '22px 2px', textAlign: 'center' }}>
          <span className="emblem lg" style={{ margin: '0 auto 10px' }}>
            <HugeiconsIcon icon={emblemIcon(room.emblem)} size={30} strokeWidth={1.7} />
          </span>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{room.name}</div>
          <div className="muted" style={{ marginTop: 4 }}>
            {cards.length} 張單字卡
            {room.ownerName && ` · 由 ${room.ownerName} 建立`}
          </div>
        </div>

        <div className="band tight" style={{ borderTop: 'none' }}>
          <button className="sheet-item" onClick={() => setShare(true)}>
            <HugeiconsIcon icon={Share08Icon} size={22} strokeWidth={2} />
            <span className="label">分享學習教室</span>
          </button>
        </div>

        {!isOwner ? (
          <p className="muted" style={{ textAlign: 'center', marginTop: 26, lineHeight: 1.9 }}>
            這間教室不是你建立的，
            <br />
            {room.openEdit
              ? '你可以新增和修改單字卡，但設定只有建立者能改。'
              : '目前是唯讀模式，只有建立者能編輯。'}
          </p>
        ) : (
          <>
            <div className="section-title">教室名稱</div>
            <input
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              maxLength={40}
              enterKeyHint="done"
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />

            <div className="section-title">徽章</div>
            <div className="emblem-grid">
              {EMBLEMS.map((e) => (
                <button
                  key={e.id}
                  className="emblem-pick"
                  aria-pressed={room.emblem === e.id}
                  onClick={() => patch({ emblem: e.id })}
                >
                  <HugeiconsIcon icon={e.icon} size={26} strokeWidth={1.8} />
                </button>
              ))}
            </div>

            <div className="section-title">誰可以編輯</div>
            <div className="band tight">
              {[
                {
                  id: true,
                  icon: Globe02Icon,
                  label: '拿到連結的人都能編輯',
                  hint: '他們要先用 Google 登入',
                },
                {
                  id: false,
                  icon: SquareLock02Icon,
                  label: '只有我能編輯',
                  hint: '其他人只能看和聽',
                },
              ].map((o) => (
                <button
                  key={String(o.id)}
                  className="sheet-item"
                  onClick={() => patch({ openEdit: o.id })}
                >
                  <HugeiconsIcon icon={o.icon} size={22} strokeWidth={2} />
                  <span className="label">
                    {o.label}
                    <div className="muted">{o.hint}</div>
                  </span>
                  {room.openEdit === o.id && <span style={{ color: 'var(--gold)' }}>✓</span>}
                </button>
              ))}
            </div>

            <div className="section-title">危險區</div>
            <div className="band tight">
              <button className="sheet-item danger" onClick={() => setConfirm(true)}>
                <HugeiconsIcon icon={Delete02Icon} size={22} strokeWidth={2} />
                <span className="label">
                  刪除這間教室
                  <div className="muted">裡面的單字卡會一起消失</div>
                </span>
              </button>
            </div>
          </>
        )}
      </div>

      <ShareSheet open={share} onClose={() => setShare(false)} room={room} />

      <BottomSheet open={confirm} onClose={() => setConfirm(false)} title="確定要刪除教室嗎？">
        <p className="muted" style={{ margin: '0 8px 16px', lineHeight: 1.9 }}>
          「{room.name}」和裡面的 {cards.length} 張單字卡都會被刪除，
          分享出去的連結也會失效。這個動作無法復原。
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setConfirm(false)}>
            取消
          </button>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={remove} disabled={busy}>
            {busy ? <span className="spin" /> : '刪除'}
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
