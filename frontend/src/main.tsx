import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { WalletProvider } from './context/WalletContext';
import { ProposalProvider } from './context/ProposalContext';
import './index.css';
import './responsive.css'; // issue #12 — mobile-responsive layout

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
