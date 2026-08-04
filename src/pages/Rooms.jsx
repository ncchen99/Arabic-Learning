import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { PlusSignIcon, Settings02Icon, UserCircleIcon } from '@hugeicons/core-free-icons';
import AppBar from '../components/AppBar.jsx';
import GoogleButton from '../components/GoogleButton.jsx';
import { emblemIcon } from '../lib/emblems.js';
import { isGuest } from '../lib/firebase.js';
import { getRoom, localRooms, watchMyRooms } from '../lib/store.js';
import Loading from '../components/Loading.jsx';

/** 首頁：我的學習教室 */
export default function Rooms({ user }) {
  const navigate = useNavigate();
  const guest = isGuest(user);
  const [cloud, setCloud] = useState(null); // 登入者的雲端清單
  const [local, setLocal] = useState(() => localRooms());

  useEffect(() => {
    setLocal(localRooms());
    if (guest || !user) return undefined;
    return watchMyRooms(user.uid, setCloud, () => setCloud([]));
  }, [user, guest]);

  // 雲端清單優先，再補上只在這台裝置逛過的教室
  const rooms = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const r of [...(cloud || []), ...local]) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      out.push(r);
    }
    return out;
  }, [cloud, local]);

  // 本機已經記得的教室先顯示，不用等雲端清單回來
  const loading = !guest && cloud === null && local.length === 0;

  // 清單裡的張數要是即時的（教室名稱可能也被改過），所以開 App 時各讀一次
  const [live, setLive] = useState({});
  const ids = rooms.map((r) => r.id).join(',');
  useEffect(() => {
    let alive = true;
    Promise.all(rooms.map(async (r) => [r.id, await getRoom(r.id).catch(() => null)])).then(
      (pairs) => alive && setLive(Object.fromEntries(pairs))
    );
    return () => {
      alive = false;
    };
  }, [ids]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <AppBar
        brand
        action={
          <Link to="/settings" className="icon-btn" aria-label="設定">
            <HugeiconsIcon
              icon={guest ? UserCircleIcon : Settings02Icon}
              size={22}
              strokeWidth={2}
            />
          </Link>
        }
      />

      <div className="page">
        {loading ? (
          <div className="empty">
            <Loading size="lg" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="empty" style={{ paddingTop: 40 }}>
            <p className="ar">أَهْلاً وَسَهْلاً</p>
            <p style={{ margin: '0 0 8px', color: 'var(--text-2)', fontSize: 16 }}>
              歡迎來到 Kalima
            </p>
            <p className="muted" style={{ marginBottom: 26 }}>
              建立一間敘利亞阿拉伯語學習教室，把單字卡整理在一起，
              <br />
              再把連結分享給朋友或學生 —— 他們不用註冊就能進來學。
            </p>
            {guest ? (
              <>
                <div style={{ maxWidth: 300, margin: '0 auto' }}>
                  <GoogleButton label="登入並建立教室" />
                </div>
                <p className="muted" style={{ marginTop: 14, fontSize: 13 }}>
                  收到別人的連結？直接打開就能學，不需要登入。
                </p>
              </>
            ) : (
              <button className="btn btn-primary" onClick={() => navigate('/new')}>
                <HugeiconsIcon icon={PlusSignIcon} size={20} strokeWidth={2.4} />
                建立第一間教室
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="section-title">我的教室</div>
            <div className="list">
              {rooms.map((r) => {
                const now = live[r.id];
                const gone = r.id in live && now === null;
                return (
                  <button
                    key={r.id}
                    className="row room-row"
                    onClick={() => navigate(`/r/${r.id}`)}
                  >
                    <span className="emblem">
                      <HugeiconsIcon
                        icon={emblemIcon(now?.emblem || r.emblem)}
                        size={24}
                        strokeWidth={1.8}
                      />
                    </span>
                    <div className="row-main">
                      <div className="room-name">{now?.name || r.name}</div>
                      <div className="muted" style={{ fontSize: 13 }}>
                        {gone
                          ? '教室已被刪除'
                          : now
                            ? `${now.cardCount || 0} 張單字卡${
                                now.ownerUid === user?.uid ? ' · 我建立的' : ''
                              }`
                            : '載入中…'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {guest && (
              <div className="band" style={{ padding: '20px 2px', marginTop: 22, textAlign: 'center' }}>
                <p className="muted" style={{ margin: '0 0 14px', lineHeight: 1.9 }}>
                  你現在是訪客，可以看和聽。
                  <br />
                  登入之後就能編輯單字卡、開自己的教室。
                </p>
                <GoogleButton />
              </div>
            )}
          </>
        )}
      </div>

      {!guest && rooms.length > 0 && (
        <Link to="/new" className="fab" aria-label="建立學習教室">
          <HugeiconsIcon icon={PlusSignIcon} size={28} strokeWidth={2.4} />
        </Link>
      )}
    </>
  );
}
