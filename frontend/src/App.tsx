import React, { useState } from 'react';
import { ThemeProvider, DefaultTheme } from 'styled-components';
import usePersistedState from './utils/usePersistedState';
import { LanguageProvider } from "./contexts/language-context"

import light from './styles/themes/light';
import dark from './styles/themes/dark';

import GlobalStyle from './styles/global';
import Header from './components/Header';
import Recorder from './components/Recorder';
import TranscriptionHistory from "./components/TranscriptionHistory"
import ProtectedRoute from "./components/Auth/ProtectedRoute"
import { AuthProvider } from "./contexts/auth-context"

type ActiveTab = "recorder" | "history"

function App() {
  const [theme, setTheme] = usePersistedState<DefaultTheme>('theme', light);
  const [activeTab, setActiveTab] = useState<ActiveTab>("recorder")

  const toggleTheme = () => {
    setTheme(theme.title === 'light' ? dark : light);
  };

  return (
    <LanguageProvider>
      <AuthProvider>
        <ThemeProvider theme={theme}>
          <div className="App">
            <GlobalStyle />
            <ProtectedRoute>
            <Header toggleTheme={toggleTheme} activeTab={activeTab} setActiveTab={setActiveTab} />
              {activeTab === "recorder" && <Recorder />}
              {activeTab === "history" && <TranscriptionHistory />}
            </ProtectedRoute>
          </div>
        </ThemeProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
