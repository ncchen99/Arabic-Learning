import { useState, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { useNavigate } from 'react-router-dom';
import AppBar from '../components/AppBar.jsx';
import PlayButton from '../components/PlayButton.jsx';
import TurkishBlock from '../components/TurkishBlock.jsx';
import { useToast } from '../components/Toast.jsx';
import { generateCard } from '../lib/api.js';
import { addCard, getLexicon, saveLexicon } from '../lib/store.js';
import { categoryIcon, normalizeCategory } from '../lib/categories.js';
import { prefetch } from '../lib/audio.js';
import Loading from '../components/Loading.jsx';

/* 三種輸入語言都給範例，讓人一眼看出土耳其文也可以直接打 */
const SUGGESTIONS = ['你好', '謝謝', '我想喝咖啡', 'مَرْحَبَا', 'بِدِّي', 'kitap', 'teşekkürler'];

export default function Add({ room, uid, voice, turkish }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showHint] = useState(() => !localStorage.getItem('arabic_add_hint_seen'));

  useEffect(() => {
    if (showHint) {
      localStorage.setItem('arabic_add_hint_seen', 'true');
    }
  }, [showHint]);

  async function generate(input) {
    const value = (input ?? text).trim();
    if (!value || busy) return;
    setBusy(true);
    setPreview(null);
    try {
      // 別人查過的字直接用快取，不再呼叫 OpenAI
      let card = await getLexicon(value);
      if (!card) {
        card = await generateCard(value);
        saveLexicon(value, card);
      }
      setPreview({ card, source: value });
      prefetch(card.arabic, voice);
    } catch (e) {
      toast(e.message || '產生失敗');
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!preview || saving) return;
    setSaving(true);
    try {
      const id = await addCard(room.id, uid, preview.card, preview.source);
      navigate(`/r/${room.id}/card/${id}`, { replace: true });
    } catch (e) {
      toast(e.message || '儲存失敗');
      setSaving(false);
    }
  }

  return (
    <>
      <AppBar title="新增單字卡" onBack={() => navigate(`/r/${room.id}`)} />

      <div className="page">
        {showHint && (
          <p className="muted" style={{ marginTop: 16 }}>
            輸入中文、阿拉伯語或土耳其語都可以，AI 會補上敘利亞方言拼音、母音符號、複數、詞根、
            文化小知識和土耳其語對照，做好的卡片會加進「{room.name}」給大家一起用。
          </p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            generate();
          }}
          style={{ display: 'flex', gap: 10, marginTop: showHint ? 6 : 16 }}
        >
          <input
            className="field"
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="例如：謝謝、قَهْوَة、kahve"
            enterKeyHint="go"
            maxLength={40}
          />
          <button className="btn btn-primary" disabled={!text.trim() || busy} style={{ flex: 'none' }}>
            {busy ? <span className="spin" /> : '產生'}
          </button>
        </form>

        {!preview && !busy && (
          <>
            <div className="section-title">試試看</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="chip"
                  onClick={() => {
                    setText(s);
                    generate(s);
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}

        {busy && (
          <div className="empty">
            <Loading label="正在請 AI 製作單字卡…" />
          </div>
        )}

        {preview && (
          <>
            <div className="section-title">預覽</div>
            <div className="mihrab">
              <p className="translit-hero">{preview.card.transliteration}</p>
              <p className="ar-sub">{preview.card.arabic}</p>
              <div className="divider-ornament">✦</div>
              <p style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 600 }}>
                {preview.card.chinese}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className="tag">
                  <HugeiconsIcon icon={categoryIcon(preview.card.category)} size={14} strokeWidth={2} />
                  {normalizeCategory(preview.card.category)}
                </span>
                <span className="tag">{preview.card.pos}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                <PlayButton text={preview.card.arabic} voice={voice} size={26} onError={toast} />
              </div>
            </div>

            {preview.card.note && (
              <div className="band" style={{ marginTop: 14 }}>
                <p className="muted" style={{ margin: 0, lineHeight: 1.8 }}>
                  {preview.card.note}
                </p>
              </div>
            )}

            {/* 存進教室之前就先看到土耳其語對照，而不是等卡片建好才知道 */}
            <TurkishBlock card={preview.card} voice={voice} enabled={turkish} onError={toast} />

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button className="btn btn-ghost" onClick={() => generate()} disabled={saving}>
                重新產生
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={save}
                disabled={saving}
              >
                {saving ? <span className="spin" /> : '加入教室字庫'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
