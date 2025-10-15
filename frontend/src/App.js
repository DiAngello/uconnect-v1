import React, { useState, useEffect } from "react";
import Calendario from "./components/calendario";
import Login from "./components/login";
import Chat from "./components/Chat";
import { validateSession, logout as apiLogout } from "./services/api";

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
      
        await validateSession();
        setAuthenticated(true);
      } catch (error) {
        console.error("Sessão inválida ou expirada.");
        setAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []); 

  const handleLoginSuccess = () => {
    setAuthenticated(true);
  };

  const handleLogout = async () => {
    await apiLogout();
    setAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: "100vh" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {authenticated ? (
        <Calendario onLogout={handleLogout} />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}

export default App;