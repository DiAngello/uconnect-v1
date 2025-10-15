import React, { useState, useEffect } from "react";
import Calendario from "./components/calendario";
import Login from "./components/login";
import { validateSession, logout as apiLogout } from "./services/api";

import Chat from "./components/Chat";

function App() {
  return (
    <div className="App">
      <Chat />
    </div>
  );
}

export default App;