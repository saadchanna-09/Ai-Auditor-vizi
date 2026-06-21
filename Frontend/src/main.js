import { jsx as _jsx } from "react/jsx-runtime";
import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.js'; // Agar NodeNext set hai toh TypeScript compiled source (.js) ka path mangta hai
createRoot(document.getElementById('root')).render(_jsx(StrictMode, { children: _jsx(App, {}) }));
//# sourceMappingURL=main.js.map