import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import { StrictMode } from "react";
import App from "./App.tsx";
import "./index.css";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./components/LoginPage.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <App />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
