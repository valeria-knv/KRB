"use client"

import React, { useContext } from 'react';
import Switch from 'react-switch';
import { type DefaultTheme, ThemeContext } from 'styled-components';
import { shade } from 'polished';
import { useLanguage } from "../../contexts/language-context"
import LanguageSelector from "../Language"
import UserProfile from "../UserProfile"

import { Container, ControlsWrapper, Navigation, NavButton } from './styles';

interface Props {
  toggleTheme(): void
  activeTab: "recorder" | "history"
  setActiveTab: (tab: "recorder" | "history") => void
}

const Header: React.FC<Props> = ({toggleTheme, activeTab, setActiveTab }) => {
  const { colors, title } = useContext(ThemeContext) as DefaultTheme;
  const { t } = useLanguage()

  return (
    <Container>
      <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
        {t("header.title")}

        <Navigation>
          <NavButton active={activeTab === "recorder"} onClick={() => setActiveTab("recorder")}>
            {t("navigation.recorder")}
          </NavButton>
          <NavButton active={activeTab === "history"} onClick={() => setActiveTab("history")}>
            {t("navigation.history")}
          </NavButton>
        </Navigation>
      </div>

      <ControlsWrapper>
        <UserProfile />
        <LanguageSelector />

        <Switch
          onChange={toggleTheme}
          checked={title === "dark"}
          checkedIcon={false}
          uncheckedIcon={false}
          height={10}
          width={40}
          handleDiameter={20}
          offColor={shade(0.15, colors.primary)}
          onColor={colors.secundary}
        />
      </ControlsWrapper>
    </Container>
  );
};

export default Header;