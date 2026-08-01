import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import AppBar from '../components/AppBar.jsx';
import Room from './Room.jsx';
import Add from './Add.jsx';
import CardDetail from './CardDetail.jsx';
import Study from './Study.jsx';
import RoomSettings from './RoomSettings.jsx';
import { isGuest } from '../lib/firebase.js';
import { rememberRoom, watchCards, watchRoom } from '../lib/store.js';
import Loading from '../components/Loading.jsx';

/** 一間教室底下的所有頁面共用同一份資料訂閱 */
export default function RoomShell({ user, voice }) {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(undefined); // undefined = 還在載入
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setRoom(undefined);
    return watchRoom(roomId, setRoom, () => setRoom(null));
  }, [roomId]);

  useEffect(() => {
    setLoading(true);
    return watchCards(
      roomId,
      (list) => {
        setCards(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, [roomId]);

  // 進來過的教室記到清單裡，下次打開 App 直接看得到
  useEffect(() => {
    if (room && user) rememberRoom(user, room);
  }, [room?.id, room?.name, room?.emblem, user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  if (room === undefined) {
    return (
      <div className="page">
        <Loading size="lg" fullPage />
      </div>
    );
  }

  if (room === null) {
    return (
      <>
        <AppBar title="學習教室" onBack={() => navigate('/')} />
        <div className="page">
          <div className="empty" style={{ paddingTop: 50 }}>
            <p className="ar">لَا يُوجَد</p>
            <p style={{ margin: '0 0 6px', color: 'var(--text-2)', fontSize: 16 }}>
              找不到這間教室
            </p>
            <p className="muted">連結可能打錯了，或是教室已經被建立者刪除。</p>
          </div>
        </div>
      </>
    );
  }

  const account = !isGuest(user);
  const isOwner = account && room.ownerUid === user.uid;
  const canEdit = account && (isOwner || room.openEdit === true);
  const shared = { room, cards, loading, user, voice, canEdit, isOwner };
  const home = `/r/${room.id}`;

  return (
    <Routes>
      <Route index element={<Room {...shared} loading={loading} />} />
      <Route
        path="add"
        element={canEdit ? <Add room={room} uid={user.uid} voice={voice} /> : <Navigate to={home} replace />}
      />
      <Route path="card/:id" element={<CardDetail {...shared} />} />
      <Route path="study" element={<Study {...shared} />} />
      <Route path="manage" element={<RoomSettings {...shared} />} />
      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  );
}
