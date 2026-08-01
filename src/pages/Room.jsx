import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Cancel01Icon, Cards01Icon, Door01Icon, Globe02Icon, MoreVerticalIcon, PlusSignIcon,
  Search01Icon, Settings02Icon, Share08Icon, SquareLock02Icon, StarIcon,
} from '@hugeicons/core-free-icons';
import AppBar from '../components/AppBar.jsx';
import BottomSheet from '../components/BottomSheet.jsx';
import PlayButton from '../components/PlayButton.jsx';
import ShareSheet from '../components/ShareSheet.jsx';
import { LoginSheet } from '../components/GoogleButton.jsx';
import { useToast } from '../components/Toast.jsx';
import { CATEGORIES, categoryIcon } from '../lib/categories.js';
import { emblemIcon } from '../lib/emblems.js';
import { searchKey } from '../lib/arabic.js';
import { forgetRoom } from '../lib/store.js';
import Loading from '../components/Loading.jsx';

/** 教室首頁：單字卡清單 + 搜尋 + 分類 */
export default function Room({ room, cards, loading, canEdit, isOwner, user, voice }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState(null);
  const [starOnly, setStarOnly] = useState(false);
  const [menu, setMenu] = useState(false);
  const [share, setShare] = useState(false);
  const [loginSheet, setLoginSheet] = useState(false);

  // 剛建立教室會帶 ?share=1 進來，直接把分享面板打開
  useEffect(() => {
    if (params.get('share')) {
      setShare(true);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  // 只顯示實際有卡片的分類，避免一長排空標籤
  const usedCategories = useMemo(() => {
    const set = new Set(cards.map((c) => c.category));
    return CATEGORIES.filter((c) => set.has(c));
  }, [cards]);

  const filtered = useMemo(() => {
    const key = searchKey(q);
    return cards.filter((c) => {
      if (starOnly && !c.starred) return false;
      if (cat && c.category !== cat) return false;
      if (!key) return true;
      // searchIndex 是新增時就算好的（阿拉伯文去母音符號 + 中文 + 拼音）
      return searchKey(c.searchIndex || `${c.arabic} ${c.chinese}`).includes(key);
    });
  }, [cards, q, cat, starOnly]);

  // 沒登入但教室開放編輯 → 引導登入；教室本來就唯讀 → 連按鈕都不顯示
  const showFab = canEdit || room.openEdit;
  function add() {
    if (canEdit) navigate(`/r/${room.id}/add`);
    else setLoginSheet(true);
  }

  async function leave() {
    await forgetRoom(user, room.id);
    navigate('/', { replace: true });
  }

  return (
    <>
      <AppBar
        title={room.name}
        icon={emblemIcon(room.emblem)}
        subtitle={
          <>
            {cards.length} 張單字卡
            <span aria-hidden>·</span>
            <HugeiconsIcon
              icon={room.openEdit ? Globe02Icon : SquareLock02Icon}
              size={12}
              strokeWidth={2}
            />
            {room.openEdit ? '開放編輯' : '唯讀'}
          </>
        }
        onBack={() => navigate('/')}
        action={
          <>
            <button className="icon-btn" onClick={() => setShare(true)} aria-label="分享教室">
              <HugeiconsIcon icon={Share08Icon} size={22} strokeWidth={2} />
            </button>
            <button className="icon-btn" onClick={() => setMenu(true)} aria-label="更多操作">
              <HugeiconsIcon icon={MoreVerticalIcon} size={22} strokeWidth={2} />
            </button>
          </>
        }
      />

      <div className="page">

        {/* 搜尋：中文、拼音或阿拉伯文都可以，阿拉伯文會自動忽略母音符號 */}
        <div style={{ position: 'relative', marginTop: 14 }}>
          <span
            style={{
              position: 'absolute', left: 14, top: '50%',
              transform: 'translateY(-50%)', color: 'var(--text-dim)', display: 'flex',
            }}
          >
            <HugeiconsIcon icon={Search01Icon} size={19} strokeWidth={2} />
          </span>
          <input
            className="field"
            style={{ paddingLeft: 43, paddingRight: q ? 43 : 16 }}
            placeholder="搜尋中文、拼音或阿拉伯文…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            enterKeyHint="search"
          />
          {q && (
            <button
              onClick={() => setQ('')}
              aria-label="清除"
              style={{
                position: 'absolute', right: 8, top: '50%',
                transform: 'translateY(-50%)', color: 'var(--text-dim)',
                display: 'flex', padding: 6,
              }}
            >
              <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={2} />
            </button>
          )}
        </div>

        {cards.length > 0 && (
          <div className="chip-row" style={{ marginTop: 12 }}>
            <button className="chip" aria-pressed={starOnly} onClick={() => setStarOnly((s) => !s)}>
              <HugeiconsIcon icon={StarIcon} size={14} strokeWidth={2.2} />
              重點
            </button>
            <button className="chip" aria-pressed={!cat} onClick={() => setCat(null)}>
              全部 {cards.length}
            </button>
            {usedCategories.map((c) => (
              <button
                key={c}
                className="chip"
                aria-pressed={cat === c}
                onClick={() => setCat(cat === c ? null : c)}
              >
                <HugeiconsIcon icon={categoryIcon(c)} size={14} strokeWidth={2} />
                {c}
              </button>
            ))}
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          {loading ? (
            <div className="empty">
              <Loading />
            </div>
          ) : cards.length === 0 ? (
            <div className="empty">
              <p className="ar">لَا شَيْء بَعْد</p>
              <p style={{ margin: '0 0 6px', color: 'var(--text-2)', fontSize: 16 }}>
                這間教室還沒有單字卡
              </p>
              <p className="muted">
                {canEdit
                  ? '按右下角的 ＋ 輸入中文或阿拉伯語，開始建立字庫'
                  : '等教室的人加入單字之後就會出現在這裡'}
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty">
              <p className="ar">لَا شَيْء</p>
              <p className="muted">找不到符合的單字卡</p>
            </div>
          ) : (
            <div className="list">
              {filtered.map((c) => (
                // 這一列裡面有播放鍵，不能用 <button> 包 <button>
                <div
                  key={c.id}
                  className="row"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/r/${room.id}/card/${c.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/r/${room.id}/card/${c.id}`);
                    }
                  }}
                >
                  <div className="row-main">
                    <div className="row-translit">
                      {c.starred && <span style={{ color: 'var(--gold)' }}>★ </span>}
                      {c.transliteration}
                    </div>
                    <div className="row-zh">{c.chinese}</div>
                    <div className="row-ar">{c.arabic}</div>
                  </div>
                  <PlayButton text={c.arabic} voice={voice} onError={toast} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showFab && (
        <button className="fab" onClick={add} aria-label="新增單字卡">
          <HugeiconsIcon icon={PlusSignIcon} size={28} strokeWidth={2.4} />
        </button>
      )}

      <BottomSheet open={menu} onClose={() => setMenu(false)} title={room.name}>
        <button
          className="sheet-item"
          onClick={() => {
            setMenu(false);
            navigate(`/r/${room.id}/study`);
          }}
        >
          <HugeiconsIcon icon={Cards01Icon} size={22} strokeWidth={2} />
          <span className="label">複習模式</span>
        </button>
        <button
          className="sheet-item"
          onClick={() => {
            setMenu(false);
            setShare(true);
          }}
        >
          <HugeiconsIcon icon={Share08Icon} size={22} strokeWidth={2} />
          <span className="label">分享學習教室</span>
        </button>
        <button
          className="sheet-item"
          onClick={() => {
            setMenu(false);
            navigate(`/r/${room.id}/manage`);
          }}
        >
          <HugeiconsIcon icon={Settings02Icon} size={22} strokeWidth={2} />
          <span className="label">{isOwner ? '教室設定' : '教室資訊'}</span>
        </button>
        <button className="sheet-item danger" onClick={leave}>
          <HugeiconsIcon icon={Door01Icon} size={22} strokeWidth={2} />
          <span className="label">
            從我的清單移除
            <div className="muted">教室不會被刪除，之後用連結還能再進來</div>
          </span>
        </button>
      </BottomSheet>

      <ShareSheet open={share} onClose={() => setShare(false)} room={room} />
      <LoginSheet open={loginSheet} onClose={() => setLoginSheet(false)} />
    </>
  );
}
