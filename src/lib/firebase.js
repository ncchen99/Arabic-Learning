import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  linkWithPopup,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/* 這些值是公開識別碼，不是秘密。真正的秘密（OpenAI／ElevenLabs 金鑰）
   只存在於 Vercel 伺服器端。 */
const app = initializeApp({
  apiKey: 'AIzaSyAGH6UvBV0CPIBa23kAfpzFK6GDehqNbgo',
  authDomain: 'kalima-arabic.firebaseapp.com',
  projectId: 'kalima-arabic',
  storageBucket: 'kalima-arabic.firebasestorage.app',
  messagingSenderId: '597765182201',
  appId: '1:597765182201:web:2a1dbb29a0899a18f20828',
});

export const auth = getAuth(app);
export const db = getFirestore(app);

// 開發時方便從 console 操作登入狀態；正式版不會包含這段
if (import.meta.env.DEV) window.__auth = auth;

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

/** 有 Google 帳號才算「可編輯的使用者」，匿名訪客只能看 */
export const isGuest = (user) => !user || user.isAnonymous;

/* 訪客不需要註冊也要能讀教室、聽發音，所以背景幫他們開一個匿名身分。
   使用者不會看到任何登入畫面，但安全規則仍然看得到 request.auth，
   可以把「讀」和「寫」清楚分開。 */
export function watchAuth(cb) {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      cb(user);
      return;
    }
    signInAnonymously(auth).catch(() => cb(null)); // 失敗就當完全未登入
  });
}

export async function login() {
  const current = auth.currentUser;
  try {
    // 訪客已經有匿名身分，直接升級成 Google 帳號，uid 不變
    if (current?.isAnonymous) {
      await linkWithPopup(current, provider);
    } else {
      await signInWithPopup(auth, provider);
    }
  } catch (e) {
    // 這個 Google 帳號之前登入過（有自己的 uid），就直接切過去
    if (e.code === 'auth/credential-already-in-use' || e.code === 'auth/email-already-in-use') {
      await signInWithPopup(auth, provider);
      return;
    }
    // 手機瀏覽器（尤其是 PWA standalone 模式）常常擋彈出視窗，退回轉址登入
    if (
      e.code === 'auth/popup-blocked' ||
      e.code === 'auth/operation-not-supported-in-this-environment' ||
      e.code === 'auth/cancelled-popup-request'
    ) {
      await signInWithRedirect(auth, provider);
      return;
    }
    if (e.code === 'auth/popup-closed-by-user') return;
    throw e;
  }
}

export function logout() {
  return signOut(auth); // watchAuth 會馬上補一個新的匿名身分
}
