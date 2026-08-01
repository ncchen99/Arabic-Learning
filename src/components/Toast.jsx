import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null);

  const show = useCallback((text) => setMsg({ text, at: Date.now() }), []);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2800);
    return () => clearTimeout(t);
  }, [msg]);

  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && (
        <div className="toast" role="status">
          {msg.text}
        </div>
      )}
    </ToastCtx.Provider>
  );
}
