import React from "react";
import ReactDOM, { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import {Provider} from 'react-redux'
import { store, persistor } from './redux/store.jsx'
import { PersistGate } from 'redux-persist/integration/react'
import { Toaster } from "react-hot-toast";

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <App />
      <Toaster position="top-right" />
    </PersistGate>
    </Provider>
  </BrowserRouter>
)
