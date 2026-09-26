import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n';
import './index.css';
import './responsive.css'; // issue #12 — mobile-responsive layout
import './skeleton.css';   // issue #13 — skeleton loading states

if (import.meta.env.DEV) {
  await import('@axe-core/react').then(({ default: axe }) => {
    axe(React, ReactDOM, 1000);
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* issue #10 — both contexts available application-wide */}
    <WalletProvider>
      <ProposalProvider>
        <App />
      </ProposalProvider>
    </WalletProvider>
  </React.StrictMode>
);
