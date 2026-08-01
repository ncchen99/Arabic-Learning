import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  getRedirectResult,
  linkWithPopup,
  linkWithRedirect,
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
   使用者不會看到任何登入畫面，但安全規則狀態仍然包含 request.auth。 */
export function watchAuth(cb) {
  // 若從轉址登入（redirect login）回來，處理轉址結果與潛在錯誤
  getRedirectResult(auth).catch((err) => {
    console.error('Redirect sign-in error:', err);
  });

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

  const executeLogin = async () => {
    if (current?.isAnonymous) {
      try {
        return await linkWithPopup(current, provider);
      } catch (err) {
        // 如果匿名帳號要連結的 Google 帳號之前已經註冊過，直接切換到該帳號登入
        if (err.code === 'auth/credential-already-in-use' || err.code === 'auth/email-already-in-use') {
          return await signInWithPopup(auth, provider);
        }
        throw err;
      }
    }
    return await signInWithPopup(auth, provider);
  };

  try {
    await executeLogin();
  } catch (e) {
    // 手機瀏覽器、PWA 獨立模式或非同步操作延遲可能觸發 auth/popup-blocked，自動退回轉址登入
    if (
      e.code === 'auth/popup-blocked' ||
      e.code === 'auth/operation-not-supported-in-this-environment' ||
      e.code === 'auth/cancelled-popup-request'
    ) {
      if (current?.isAnonymous) {
        try {
          await linkWithRedirect(current, provider);
          return;
        } catch {
          await signInWithRedirect(auth, provider);
          return;
        }
      }
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

