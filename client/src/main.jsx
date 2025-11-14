import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LicenseManager } from 'ag-grid-enterprise';
import App from './App.jsx';
import './index.css';

// Set AG Grid Enterprise license
const AG_GRID_LICENSE = import.meta.env.VITE_AG_GRID_LICENSE_KEY;
if (AG_GRID_LICENSE && AG_GRID_LICENSE !== 'your-ag-grid-enterprise-license-key-here') {
  LicenseManager.setLicenseKey(AG_GRID_LICENSE);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        className: 'toast-notification',
        duration: 4000,
        style: {
          background: '#21222C',
          color: '#68FF8E',
          border: '1px solid #429356'
        }
      }}
    />
  </BrowserRouter>
);
