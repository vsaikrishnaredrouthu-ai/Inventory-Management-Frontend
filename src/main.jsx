import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@tabler/icons-webfont/dist/tabler-icons-outline.min.css';
import './styles.css';
import App from './App.jsx';
import { AuthProvider } from './auth.jsx';
import { ToastProvider } from './ui.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
