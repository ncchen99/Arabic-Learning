import { useMemo, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Copy01Icon, Share08Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import encodeQR from '@paulmillr/qr';
import BottomSheet from './BottomSheet.jsx';
import { roomUrl } from '../lib/store.js';

/** 分享學習教室：連結、系統分享選單、以及當面掃的 QR Code（預設顯示） */
export default function ShareSheet({ open, onClose, room }) {
  const [copied, setCopied] = useState(false);

  const url = room ? roomUrl(room.id) : '';
  const qr = useMemo(
    () => (url ? encodeQR(url, 'svg', { ecc: 'medium', border: 2 }) : ''),
    [url]
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // 舊瀏覽器或非 https 沒有 clipboard API，退回選取
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      el.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function share() {
    try {
      await navigator.share({
        title: room.name,
        text: `一起來學阿拉伯語：${room.name}`,
        url,
      });
    } catch {
      /* 使用者取消，不用處理 */
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="分享學習教室">
      <p className="muted" style={{ margin: '0 8px 10px', fontSize: 13, lineHeight: 1.6 }}>
        拿到連結的人不用註冊就能進來看單字、聽發音。
        {room?.openEdit
          ? '要新增或修改單字卡，登入 Google 帳號就可以。'
          : '目前設定成只有你能編輯，其他人是唯讀。'}
      </p>

      <div className="share-link" onClick={copy} role="button" tabIndex={0}>
        <span>{url.replace(/^https?:\/\//, '')}</span>
        <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} size={20} strokeWidth={2} />
      </div>

      <div className="qr-box">
        <div className="qr" dangerouslySetInnerHTML={{ __html: qr }} />
        <p className="muted" style={{ margin: '8px 0 0', fontSize: 12 }}>
          用相機掃一下就能加入
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, padding: '10px 8px 0' }}>
        {typeof navigator !== 'undefined' && navigator.share ? (
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={share}>
            <HugeiconsIcon icon={Share08Icon} size={20} strokeWidth={2} />
            分享
          </button>
        ) : (
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={copy}>
            <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} size={20} strokeWidth={2} />
            {copied ? '已複製' : '複製連結'}
          </button>
        )}
      </div>
    </BottomSheet>
  );
}
