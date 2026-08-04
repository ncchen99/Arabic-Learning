import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon, ArrowRight01Icon, ShuffleIcon, StarIcon,
} from '@hugeicons/core-free-icons';
import AppBar from '../components/AppBar.jsx';
import PlayButton from '../components/PlayButton.jsx';
import { useToast } from '../components/Toast.jsx';
import { prefetch } from '../lib/audio.js';
import { prefetchTurkish, useTurkish } from '../lib/turkish.js';
import { turkishVoiceFor } from '../lib/voices.js';

/** 翻卡複習：先看阿拉伯文，點一下才翻出中文 */
export default function Study({ room, cards, voice, turkish }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [starOnly, setStarOnly] = useState(false);
  const [seed, setSeed] = useState(0);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const touch = useRef(null);

  const deck = useMemo(() => {
    const pool = cards.filter((c) => !starOnly || c.starred);
    // seed 改變就重洗（Fisher–Yates）
    const a = [...pool];
    let s = seed * 9301 + 49297;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let k = a.length - 1; k > 0; k--) {
      const j = Math.floor(rnd() * (k + 1));
      [a[k], a[j]] = [a[j], a[k]];
    }
    return a;
  }, [cards, starOnly, seed]);

  useEffect(() => {
    setI(0);
    setFlipped(false);
  }, [starOnly, seed]);

  const card = deck[i];

  // 預抓下一張的語音
  useEffect(() => {
    if (deck[i]) prefetch(deck[i].arabic, voice);
    if (deck[i + 1]) prefetch(deck[i + 1].arabic, voice);
  }, [deck, i, voice]);

  // 這張卡的土耳其語先備好，翻面時就不用等
  useEffect(() => {
    if (turkish && deck[i]) prefetchTurkish(deck[i]);
  }, [deck, i, turkish]);

  const { tr } = useTurkish(card, turkish && flipped);

  const go = (d) => {
    setFlipped(false);
    setI((v) => Math.min(Math.max(v + d, 0), Math.max(deck.length - 1, 0)));
  };

  // 鍵盤（電腦版）：空白翻卡、左右換卡
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === ' ') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deck.length]);

  if (!cards.length) {
    return (
      <>
        <AppBar title="複習" onBack={() => navigate(`/r/${room.id}`)} />
        <div className="page">
          <div className="empty">
            <p className="ar">لَا شَيْء</p>
            <p className="muted">先加入一些單字卡才能複習</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AppBar
        title={`複習 ${deck.length ? i + 1 : 0} / ${deck.length}`}
        onBack={() => navigate(`/r/${room.id}`)}
        action={
          <button
            className={`icon-btn${seed ? ' accent' : ''}`}
            onClick={() => setSeed((s) => s + 1)}
            aria-label="重新洗牌"
          >
            <HugeiconsIcon icon={ShuffleIcon} size={22} strokeWidth={2} />
          </button>
        }
      />

      <div className="page">
        <div className="chip-row" style={{ marginTop: 14 }}>
          <button className="chip" aria-pressed={starOnly} onClick={() => setStarOnly((s) => !s)}>
            <HugeiconsIcon icon={StarIcon} size={14} strokeWidth={2.2} />
            只複習重點
          </button>
        </div>

        {!card ? (
          <div className="empty">
            <p className="muted">收藏夾裡還沒有單字卡</p>
          </div>
        ) : (
          <>
            <div
              className="mihrab"
              style={{ marginTop: 16, minHeight: 320, cursor: 'pointer', userSelect: 'none' }}
              onClick={() => setFlipped((f) => !f)}
              onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
              onTouchEnd={(e) => {
                if (touch.current === null) return;
                const dx = e.changedTouches[0].clientX - touch.current;
                touch.current = null;
                // 阿拉伯文是右到左，但這裡沿用一般手勢：左滑下一張
                if (dx < -55) go(1);
                else if (dx > 55) go(-1);
              }}
            >
              <p className="translit-hero">{card.transliteration}</p>
              <p className="ar-sub">{card.arabic}</p>

              {flipped ? (
                <>
                  <div className="divider-ornament">✦</div>
                  <p style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 600 }}>
                    {card.chinese}
                  </p>
                  <p className="muted" style={{ margin: 0 }}>{card.pos}</p>
                  {tr && (
                    <div className="tr-inline" onClick={(e) => e.stopPropagation()}>
                      {tr.turkish}
                      <PlayButton
                        text={tr.turkish}
                        voice={turkishVoiceFor(voice)}
                        size={20}
                        label="播放土耳其語發音"
                        onError={toast}
                      />
                    </div>
                  )}
                </>
              ) : (
                <p className="muted" style={{ marginTop: 22 }}>
                  點一下看答案
                </p>
              )}

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                <PlayButton text={card.arabic} voice={voice} size={26} onError={toast} />
              </div>
            </div>

            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 12, marginTop: 18,
              }}
            >
              <button
                className="btn btn-ghost"
                onClick={() => go(-1)}
                disabled={i === 0}
                aria-label="上一張"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={22} strokeWidth={2} />
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => setFlipped((f) => !f)}
              >
                {flipped ? '蓋起來' : '看答案'}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => go(1)}
                disabled={i >= deck.length - 1}
                aria-label="下一張"
              >
                <HugeiconsIcon icon={ArrowRight01Icon} size={22} strokeWidth={2} />
              </button>
            </div>

            <p className="muted" style={{ textAlign: 'center', marginTop: 14 }}>
              左右滑動換卡 · 電腦可用空白鍵與方向鍵
            </p>
          </>
        )}
      </div>
    </>
  );
}
