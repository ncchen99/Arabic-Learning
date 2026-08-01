import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';

/** 手機習慣的頂端列：左上返回鍵、置中標題、右側動作
 *  可選 icon + subtitle → 教室內頁用的左對齊佈局 */
export default function AppBar({ title, brand, action, onBack, icon, subtitle }) {
  const navigate = useNavigate();

  return (
    <header className="appbar">
      <div className="appbar-inner">
        {brand ? (
          <div className="brand">
            <span className="ar">كَلِمَة</span>
            <span className="zh">阿拉伯語單字卡</span>
          </div>
        ) : icon ? (
          /* 教室內頁：返回 + emblem icon + 標題/副標題，左對齊 */
          <>
            <button
              className="icon-btn"
              onClick={() => (onBack ? onBack() : navigate(-1))}
              aria-label="返回"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={24} strokeWidth={2} />
            </button>
            <div className="appbar-info">
              <span className="appbar-icon">
                <HugeiconsIcon icon={icon} size={18} strokeWidth={1.7} />
              </span>
              <div className="appbar-titles">
                <div className="appbar-title">{title}</div>
                {subtitle && <div className="appbar-subtitle">{subtitle}</div>}
              </div>
            </div>
          </>
        ) : (
          <>
            <button
              className="icon-btn"
              onClick={() => (onBack ? onBack() : navigate(-1))}
              aria-label="返回"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={24} strokeWidth={2} />
            </button>
            <h1>{title}</h1>
          </>
        )}
        {/* 動作鍵區域：沒有 brand 時至少佔位讓標題置中 */}
        <div style={{ minWidth: brand || icon ? 0 : 42, flex: 'none', display: 'flex' }}>{action}</div>
      </div>
    </header>
  );
}
