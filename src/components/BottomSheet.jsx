import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/** 手機優先的底部彈出選單，取代桌機式下拉選單 */
export default function BottomSheet({ open, onClose, title, children }) {
  const sheetRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    // 打開時鎖住背景捲動
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // 往下拖曳關閉
  useEffect(() => {
    const el = sheetRef.current;
    if (!open || !el) return;
    let startY = null;
    const down = (e) => {
      if (el.scrollTop > 0) return;
      startY = e.touches[0].clientY;
    };
    const move = (e) => {
      if (startY === null) return;
      const dy = e.touches[0].clientY - startY;
      if (dy > 0) el.style.transform = `translateY(${dy}px)`;
    };
    const up = (e) => {
      if (startY === null) return;
      const dy = e.changedTouches[0].clientY - startY;
      el.style.transform = '';
      startY = null;
      if (dy > 90) onClose();
    };
    el.addEventListener('touchstart', down, { passive: true });
    el.addEventListener('touchmove', move, { passive: true });
    el.addEventListener('touchend', up);
    return () => {
      el.removeEventListener('touchstart', down);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', up);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" ref={sheetRef} role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-grip" />
        {title && <h2>{title}</h2>}
        {children}
      </div>
    </>,
    document.body
  );
}
