import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { InformationCircleIcon, Link02Icon, TulipIcon } from '@hugeicons/core-free-icons';
import BottomSheet from './BottomSheet.jsx';
import PlayButton from './PlayButton.jsx';
import { useTurkish } from '../lib/turkish.js';
import { turkishVoiceFor } from '../lib/voices.js';

/* 「كِتَاب kitāb」拆成阿拉伯文與拉丁轉寫兩段：
   最後一個阿拉伯字母以前是阿拉伯文，後面剩下的就是轉寫。 */
function splitSource(s = '') {
  const chars = [...s];
  let last = -1;
  chars.forEach((c, i) => {
    if (/[؀-ۿ]/.test(c)) last = i;
  });
  if (last < 0) return { ar: '', latin: s.trim() };
  return {
    ar: chars.slice(0, last + 1).join('').trim(),
    latin: chars.slice(last + 1).join('').trim(),
  };
}

/* 土耳其文用拉丁字母，但有幾個字母跟英文念法差很多，
   學習者第一次看到 kütüphane 一定會卡住，所以放一張對照表。
   說明刻意寫得很短 —— 這張表要能一次塞進手機一屏，不用捲動。 */
const SOUNDS = [
  ['ı / I', '沒有點的 i，像悶住的「呃」'],
  ['i / İ', '有點的 i，就是「一」'],
  ['ö', '嘴型念「ㄛ」，舌頭念「ㄝ」'],
  ['ü', '就是注音的「ㄩ」'],
  ['c', '英文 jam 的 j（cami＝ㄐㄚㄇㄧ）'],
  ['ç', '注音的「ㄑ」、英文 ch'],
  ['ş', '注音的「ㄕ」、英文 sh'],
  ['ğ', '不發音，把前面母音拉長'],
];

/** 單字卡的土耳其語對照。內容是需要時才產生，之後全站共用。 */
export default function TurkishBlock({ card, voice, enabled = true, onError }) {
  const [help, setHelp] = useState(false);
  const { tr, loading, error, retry } = useTurkish(card, enabled);

  if (!enabled) return null;

  const trVoice = turkishVoiceFor(voice);
  const source = tr?.from_arabic ? splitSource(tr.arabic_source) : null;

  return (
    <>
      {/* 自己就是一張卡；裡面的分區一律用線切開，不再套第二層卡片 */}
      <section className="tr-card">
        <div className="tr-card-head">
          <span className="lbl">
            <HugeiconsIcon icon={TulipIcon} size={16} strokeWidth={2} />
            土耳其語
          </span>
          <button className="icon-btn" onClick={() => setHelp(true)} aria-label="土耳其語字母怎麼念">
            <HugeiconsIcon icon={InformationCircleIcon} size={20} strokeWidth={2} />
          </button>
        </div>

        {loading ? (
          <div className="tr-skeleton">
            <span className="spin" />
            正在查土耳其語說法…
          </div>
        ) : error ? (
          <div className="tr-skeleton" style={{ justifyContent: 'space-between' }}>
            <span>{error}</span>
            <button className="chip" onClick={retry}>
              重試
            </button>
          </div>
        ) : tr ? (
          <>
            <div className="tr-main">
              <div style={{ minWidth: 0 }}>
                <p className="tr-word">{tr.turkish}</p>
                {tr.pos && <span className="muted">{tr.pos}</span>}
              </div>
              <PlayButton
                text={tr.turkish}
                voice={trVoice}
                size={26}
                label="播放土耳其語發音"
                onError={onError}
              />
            </div>

            {tr.turkish_alt && (
              <p className="tr-alt">
                也可以說：<b>{tr.turkish_alt}</b>
              </p>
            )}

            {source && (
              <div className="tr-loan">
                <HugeiconsIcon icon={Link02Icon} size={18} strokeWidth={2} />
                <div style={{ minWidth: 0 }}>
                  <span className="muted">這個字是從阿拉伯語借來的</span>
                  <div className="tr-bridge">
                    <span className="ar">{source.ar}</span>
                    {source.latin && <span className="latin">{source.latin}</span>}
                    <span className="arrow" aria-hidden>
                      →
                    </span>
                    <b>{tr.turkish}</b>
                  </div>
                </div>
              </div>
            )}

            {tr.note && <p className="tr-note">{tr.note}</p>}
          </>
        ) : null}
      </section>

      <BottomSheet open={help} onClose={() => setHelp(false)} title="土耳其語字母怎麼念">
        <p className="muted" style={{ margin: '0 8px 6px', lineHeight: 1.7 }}>
          土耳其語拼字幾乎等於發音，只有這幾個字母例外：
        </p>
        <table className="tr-table">
          <tbody>
            {SOUNDS.map(([letter, hint]) => (
              <tr key={letter}>
                <td>{letter}</td>
                <td>{hint}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ margin: '10px 8px 0', lineHeight: 1.7 }}>
          重音多半落在最後一個音節。
        </p>
      </BottomSheet>
    </>
  );
}
