import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Hidden NFC verification entry: when URL has picc_data & cmac,
// index.html script will set window.__NFC_OVERRIDE__ and take over UI.
if (window.__NFC_OVERRIDE__) {
  // Do not mount React app.
} else {
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
}
