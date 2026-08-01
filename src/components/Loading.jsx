/**
 * Loading — 阿拉伯幾何星紋 (Rub el Hizb ۞) SVG 載入動畫
 *
 * Props:
 *   size      — 'sm' (20px) | 'md' (36px) | 'lg' (56px)   預設 'md'
 *   label     — 可選提示文字
 *   fullPage  — 是否佔滿頁面置中（用於全頁 Loading）
 */
export default function Loading({ size = 'md', label, fullPage = false }) {
  const dims = { sm: 20, md: 36, lg: 56 };
  const px = dims[size] || dims.md;

  const cls = [
    'arabic-loading',
    fullPage && 'arabic-loading--full-page',
  ]
    .filter(Boolean)
    .join(' ');

  // 動畫速度依大小微調，大的慢一些更從容
  const cwDur = size === 'lg' ? '4.5s' : size === 'sm' ? '2.5s' : '3.5s';
  const ccwDur = size === 'lg' ? '6s' : size === 'sm' ? '3s' : '4.5s';
  const pulseDur = '2.2s';

  return (
    <div className={cls}>
      <svg
        className="arabic-loading__svg"
        width={px}
        height={px}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* ── 外圈：八角齒環，順時針旋轉 ── */}
        <g style={{ transformOrigin: '50px 50px', animation: `arabic-cw ${cwDur} linear infinite` }}>
          <path
            d={octagonalRing(50, 50, 46, 38)}
            stroke="var(--gold)"
            strokeWidth={size === 'sm' ? 1.2 : 1.6}
            strokeLinejoin="round"
            opacity="0.5"
          />
          {/* 齒環上的裝飾小菱形 */}
          {Array.from({ length: 8 }, (_, i) => {
            const angle = (i * 45 * Math.PI) / 180;
            const cx = 50 + 46 * Math.cos(angle);
            const cy = 50 + 46 * Math.sin(angle);
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={size === 'sm' ? 1.2 : 1.8}
                fill="var(--gold)"
                opacity="0.6"
              />
            );
          })}
        </g>

        {/* ── 中層：交錯八角星（Rub el Hizb），逆時針旋轉 + 呼吸 ── */}
        <g
          style={{
            transformOrigin: '50px 50px',
            animation: `arabic-ccw ${ccwDur} linear infinite, arabic-pulse ${pulseDur} ease-in-out infinite`,
          }}
        >
          {/* 第一個正方形旋轉 0° */}
          <rect
            x={50 - 22}
            y={50 - 22}
            width={44}
            height={44}
            rx={2}
            transform="rotate(0 50 50)"
            stroke="var(--gold)"
            strokeWidth={size === 'sm' ? 1 : 1.4}
            fill="none"
            opacity="0.7"
          />
          {/* 第二個正方形旋轉 45° 形成八角星 */}
          <rect
            x={50 - 22}
            y={50 - 22}
            width={44}
            height={44}
            rx={2}
            transform="rotate(45 50 50)"
            stroke="var(--gold-soft)"
            strokeWidth={size === 'sm' ? 1 : 1.4}
            fill="none"
            opacity="0.7"
          />
        </g>

        {/* ── 內核：呼吸光點 ── */}
        <circle
          cx="50"
          cy="50"
          r={size === 'sm' ? 3 : size === 'lg' ? 5.5 : 4.5}
          fill="var(--gold)"
          style={{
            transformOrigin: '50px 50px',
            animation: `arabic-pulse ${pulseDur} ease-in-out infinite`,
            animationDelay: '0.3s',
          }}
        />
      </svg>

      {label && <span className="arabic-loading__label">{label}</span>}
    </div>
  );
}

/**
 * 產生八角環路徑（外半徑 R, 內半徑 r 交替）
 */
function octagonalRing(cx, cy, R, r) {
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const angle = ((i * 22.5 - 90) * Math.PI) / 180;
    const radius = i % 2 === 0 ? R : r;
    pts.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
  }
  return `M${pts.join('L')}Z`;
}
