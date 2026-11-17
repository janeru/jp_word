import { useState, type FormEvent } from 'react';
import { PASSWORD_MIN_LENGTH } from '@jp-word/shared';
import { useAuth } from '../auth/AuthContext.tsx';

type Tab = 'login' | 'register';

/** 登入 / 註冊畫面。未登入時取代整個遊戲畫面。 */
export function LoginScreen() {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (tab === 'login') {
        await login({ email, password });
      } else {
        await register({ email, password, name });
      }
      // 成功後 AuthProvider 會更新 user,App 自然切到遊戲畫面
    } catch (err) {
      setError(err instanceof Error ? err.message : '發生未知錯誤');
    } finally {
      setBusy(false);
    }
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    setError(null);
  };

  return (
    <div className="screen center">
      <header className="app-header">
        <h1>🇯🇵 日文單字射擊</h1>
      </header>

      <div className="auth-card">
        <div className="auth-tabs">
          <button
            type="button"
            className={`mode-btn ${tab === 'login' ? 'active' : ''}`}
            onClick={() => switchTab('login')}
          >
            登入
          </button>
          <button
            type="button"
            className={`mode-btn ${tab === 'register' ? 'active' : ''}`}
            onClick={() => switchTab('register')}
          >
            註冊
          </button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {tab === 'register' && (
            <label className="auth-field">
              <span>顯示名稱</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={32}
                required
                placeholder="排行榜上顯示的名字"
              />
            </label>
          )}

          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </label>

          <label className="auth-field">
            <span>密碼</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              minLength={tab === 'register' ? PASSWORD_MIN_LENGTH : undefined}
              required
              placeholder={tab === 'register' ? `至少 ${PASSWORD_MIN_LENGTH} 個字元` : ''}
            />
          </label>

          {error && <p className="auth-error">⚠️ {error}</p>}

          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? '處理中…' : tab === 'login' ? '登入' : '註冊並開始'}
          </button>
        </form>
      </div>

      <p className="subtitle">登入後才能遊玩與上傳成績</p>
    </div>
  );
}
