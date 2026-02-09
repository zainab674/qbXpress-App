
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

import { WindowProvider } from './contexts/WindowContext';
import { DataProvider } from './contexts/DataContext';
import { DialogProvider } from './contexts/DialogContext';

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <DataProvider>
      <DialogProvider>
        <WindowProvider>
          <App />
        </WindowProvider>
      </DialogProvider>
    </DataProvider>
  </React.StrictMode>
);
