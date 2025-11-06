import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import Chat from './components/Chat';
import Login from './components/login';
import ProtectedRoute from './components/ProtectedRoute';
import MuralComunicados from './components/MuralComunicados';
import CriarEditarPublicacao from './components/CriarEditarPublicacao';
import Calendario from './components/calendario';
import NotificationProvider from './components/NotificationProvider';

// --- NOVO COMPONENTE IMPORTADO ---
import CriarEditarAviso from './components/CriarEditarAviso';
// --- FIM DA ALTERAÇÃO ---

import { logout as apiLogout } from './services/api';
import 'bootstrap/dist/css/bootstrap.min.css';

const LoginPage = () => {
    const navigate = useNavigate();
    const handleLoginSuccess = () => {
        navigate('/calendario'); 
    };
    return <Login onLoginSuccess={handleLoginSuccess} />;
};

const ChatPage = () => {
    const navigate = useNavigate();
    const handleLogout = async () => {
        await apiLogout();
        navigate('/login');
    };
    return <Chat onLogout={handleLogout} />;
};

function App() {
    return ( 
        <BrowserRouter>
            <div className="App">
                <Routes>
                    <Route path="/login" element={<LoginPage />} />

                    <Route element={<ProtectedRoute />}>
                        <Route
                            path="/*"
                            element={
                                <NotificationProvider>
                                    <Routes>
                                        <Route path="/chat" element={<ChatPage />} />
                                        <Route path="/calendario" element={<Calendario />} />
                                        
                                        {/* Rotas de Comunicados (Posts) */}
                                        <Route path="/comunicados" element={<MuralComunicados />} />
                                        <Route path="/comunicados/novo" element={<CriarEditarPublicacao />} />
                                        <Route path="/comunicados/editar/:postId" element={<CriarEditarPublicacao />} />
                                        
                                        {/* --- NOVAS ROTAS ADICIONADAS --- */}
                                        <Route path="/avisos/novo" element={<CriarEditarAviso />} />
                                        <Route path="/avisos/editar/:avisoId" element={<CriarEditarAviso />} />
                                        {/* --- FIM DA ALTERAÇÃO --- */}

                                        <Route path="/" element={<Navigate to="/calendario" replace />} />
                                    </Routes>
                                </NotificationProvider>
                            }
                        />
                    </Route>

                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
}

export default App;