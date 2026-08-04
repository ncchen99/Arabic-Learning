import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Delete02Icon, MoreVerticalIcon, StarIcon, SnailIcon, Copy01Icon, VolumeHighIcon,
} from '@hugeicons/core-free-icons';
import AppBar from '../components/AppBar.jsx';
import BottomSheet from '../components/BottomSheet.jsx';
import PlayButton from '../components/PlayButton.jsx';
import TurkishBlock from '../components/TurkishBlock.jsx';
import Loading from '../components/Loading.jsx';
import { useToast } from '../components/Toast.jsx';
import { deleteCard, setStarred } from '../lib/store.js';
import { categoryIcon, normalizeCategory } from '../lib/categories.js';
import { play, prefetch } from '../lib/audio.js';

export default function CardDetail({ room, cards, loading, canEdit, voice, turkish }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [menu, setMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const card = cards.find((c) => c.id === id);

  // 進頁面就先把各種詞形的語音抓下來，按播放時是瞬間的
  useEffect(() => {
    if (!card) return;
    [card.arabic, card.plural, card.root].forEach((t) => t && prefetch(t, voice));
  }, [card, voice]);

  if (loading) {
    return (
      <div className="page">
        <Loading size="lg" fullPage />
      </div>
    );
  }

  if (!card) {
    return <Navigate to={`/r/${room.id}`} replace />;
  }

  async function speak(text, rate = 1) {
    if (!text) return;
    try {
      await play(text, voice, rate);
    } catch (e) {
      toast(e.message || '發音失敗');
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(
        `${card.transliteration}\n${card.arabic}\n${card.chinese}`
      );
      toast('已複製');
    } catch {
      toast('複製失敗');
    }
    setMenu(false);
  }

  async function toggleStar() {
    try {
      await setStarred(room.id, card.id, !card.starred);
    } catch {
      toast('操作失敗');
    }
    setMenu(false);
  }

  async function remove() {
    try {
      navigate(`/r/${room.id}`, { replace: true });
      await deleteCard(room.id, card.id);
    } catch {
      toast('刪除失敗');
    }
  }

  return (
    <>
      <AppBar
        title={card.chinese}
        onBack={() => navigate(-1)}
        action={
          <button className="icon-btn" onClick={() => setMenu(true)} aria-label="更多操作">
            <HugeiconsIcon icon={MoreVerticalIcon} size={22} strokeWidth={2} />
          </button>
        }
      />

      <div className="page">
        {/* 主視覺：拼音最大，阿拉伯文在下面當參考 */}
        <div className="mihrab" style={{ marginTop: 16 }}>
          <p className="translit-hero">{card.transliteration}</p>
          <p className="ar-sub">{card.arabic}</p>

          <div className="divider-ornament">✦</div>

          <p style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 600 }}>{card.chinese}</p>
          {card.chinese_alt && (
            <p className="muted" style={{ margin: '0 0 10px' }}>
              也可以是：{card.chinese_alt}
            </p>
          )}

          <div
            style={{
              display: 'flex', justifyContent: 'center', gap: 8,
              flexWrap: 'wrap', margin: '12px 0 6px',
            }}
          >
            <span className="tag">
              <HugeiconsIcon icon={categoryIcon(card.category)} size={14} strokeWidth={2} />
              {normalizeCategory(card.category)}
            </span>
            <span className="tag">{card.pos}</span>
            {card.starred && <span className="tag">★ 重點</span>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 6 }}>
            <PlayButton text={card.arabic} voice={voice} size={28} onError={toast} />
            <button className="icon-btn" onClick={() => speak(card.arabic, 0.6)} aria-label="慢速播放">
              <HugeiconsIcon icon={SnailIcon} size={24} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* 詞形：整列都可以點來發音 */}
        {(card.plural || card.root) && (
          <>
            <div className="section-title">構詞</div>
            <div className="band tight">
              {card.plural && (
                <button className="speakable" onClick={() => speak(card.plural)}>
                  <span>
                    <span className="muted" style={{ fontSize: 13 }}>複數</span>
                    <div className="form-translit">{card.plural_translit || card.plural}</div>
                    {card.plural_translit && <div className="form-ar">{card.plural}</div>}
                  </span>
                  <HugeiconsIcon icon={VolumeHighIcon} size={22} strokeWidth={2} />
                </button>
              )}
              {card.root && (
                <button className="speakable" onClick={() => speak(card.root)}>
                  <span>
                    <span className="muted" style={{ fontSize: 13 }}>詞根</span>
                    <div className="form-ar" style={{ letterSpacing: 6 }}>{card.root}</div>
                  </span>
                  <HugeiconsIcon icon={VolumeHighIcon} size={22} strokeWidth={2} />
                </button>
              )}
            </div>
            <p className="muted" style={{ marginTop: 8, textAlign: 'center' }}>
              點任何一列都可以聽發音
            </p>
          </>
        )}

        {/* 文化／用法提示 */}
        {card.note && (
          <>
            <div className="section-title">小知識</div>
            <div className="band">
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.85, color: 'var(--text-2)' }}>
                {card.note}
              </p>
            </div>
          </>
        )}

        {/* 順便學土耳其語：同一個意思在土耳其官方標準語怎麼說 */}
        <TurkishBlock card={card} voice={voice} enabled={turkish} onError={toast} />
      </div>

      {/* 更多操作用 Bottom Sheet，不是桌機式下拉選單 */}
      <BottomSheet open={menu} onClose={() => setMenu(false)} title="更多操作">
        {canEdit && (
          <button className="sheet-item" onClick={toggleStar}>
            <HugeiconsIcon icon={StarIcon} size={22} strokeWidth={2} />
            <span className="label">
              {card.starred ? '取消重點標記' : '標記為重點'}
              <div className="muted">教室裡的人都看得到</div>
            </span>
          </button>
        )}
        <button className="sheet-item" onClick={copy}>
          <HugeiconsIcon icon={Copy01Icon} size={22} strokeWidth={2} />
          <span className="label">複製內容</span>
        </button>
        {canEdit && (
          <button
            className="sheet-item danger"
            onClick={() => {
              setMenu(false);
              setConfirmDelete(true);
            }}
          >
            <HugeiconsIcon icon={Delete02Icon} size={22} strokeWidth={2} />
            <span className="label">從教室刪除這張卡</span>
          </button>
        )}
      </BottomSheet>

      <BottomSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="確定要刪除嗎？"
      >
        <p className="muted" style={{ margin: '0 8px 16px' }}>
          「{card.chinese}」{card.transliteration} 會從「{room.name}」移除，
          教室裡的每個人都會看不到，而且無法復原。
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-ghost"
            style={{ flex: 1 }}
            onClick={() => setConfirmDelete(false)}
          >
            取消
          </button>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={remove}>
            刪除
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
