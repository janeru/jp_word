import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { AuthProvider } from './auth/AuthContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* AuthProvider 要包在最外層:App 一開始就要知道有沒有登入 */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
