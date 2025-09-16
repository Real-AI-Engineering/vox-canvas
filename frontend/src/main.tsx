import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App"; // Use main App with WebSocket and audio
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
