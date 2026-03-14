import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useCallback, useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Game from './pages/Game';
import * as api from './services/api';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check for existing valid token on mount, or accept a matrixToken query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const matrixToken = params.get('matrixToken');

    // If arriving from the Matrix widget with a fresh JWT, store it and clean URL
    if (matrixToken) {
      api.loginWithToken(matrixToken);
      // Remove the token from the URL to prevent leaking in history/referrer
      const url = new URL(window.location.href);
      url.searchParams.delete('matrixToken');
      window.history.replaceState({}, '', url.pathname + url.search);
    }

    const token = localStorage.getItem('token');
    if (token) {
      api.getStatus()
        .then(() => setIsLoggedIn(true))
        .catch(() => setIsLoggedIn(false))
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  const handleLogin = useCallback(async (username: string, password: string) => {
    const { data } = await api.login(username, password);
    setIsLoggedIn(true);
    return data.player;
  }, []);

  const handleRegister = useCallback(async (username: string, email: string, password: string, race: string, gameMode?: string) => {
    const { data } = await api.register(username, email, password, race, gameMode);
    setIsLoggedIn(true);
    return data.player;
  }, []);

  const handleLogout = useCallback(async () => {
    await api.logout();
    setIsLoggedIn(false);
  }, []);

  if (checking) return null;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/register" element={<Register onRegister={handleRegister} />} />
        <Route path="/game" element={isLoggedIn ? <Game onLogout={handleLogout} /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to={isLoggedIn ? '/game' : '/login'} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
