import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import Admin from "./Admin.jsx";

const isAdmin = window.location.pathname === "/admin" ||
  new URLSearchParams(window.location.search).has("admin");

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {isAdmin ? <Admin /> : <App />}
  </StrictMode>
);
