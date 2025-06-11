"use client"

import React from "react"
import styled from "styled-components"
import { LogOut, UserIcon, History } from "lucide-react"
import { useAuth } from "../../contexts/auth-context"
import { useLanguage } from "../../contexts/language-context"

const ProfileContainer = styled.div`
  position: relative;
  display: inline-block;
`

const ProfileButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: ${(props) => props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;

  &:hover {
    background: ${(props) => props.theme.colors.secundary};
  }
`

const DropdownMenu = styled.div<{ isOpen: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  background: ${(props) => props.theme.colors.background};
  border: 1px solid ${(props) => props.theme.colors.primary};
  border-radius: 4px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  min-width: 200px;
  z-index: 1000;
  display: ${(props) => (props.isOpen ? "block" : "none")};
`

const UserInfo = styled.div`
  padding: 1rem;
  border-bottom: 1px solid ${(props) => props.theme.colors.primary};
`

const UserEmail = styled.div`
  font-weight: 500;
  color: ${(props) => props.theme.colors.text};
  margin-bottom: 0.25rem;
`

const UserName = styled.div`
  font-size: 0.8rem;
  color: ${(props) => props.theme.colors.text};
  opacity: 0.7;
`

const MenuButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  color: ${(props) => props.theme.colors.text};
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;

  &:hover {
    background: ${(props) => props.theme.colors.primary};
    color: white;
  }
`

interface Props {
  onHistoryClick?: () => void
}

const UserProfile: React.FC<Props> = ({ onHistoryClick }) => {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false)

  const handleLogout = () => {
    logout()
    setIsDropdownOpen(false)
  }

  const handleHistoryClick = () => {
    if (onHistoryClick) {
      onHistoryClick()
    }
    setIsDropdownOpen(false)
  }

  if (!user) return null

  return (
    <ProfileContainer>
      <ProfileButton onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
        <UserIcon size={16} />
        {user.username || user.email.split("@")[0]}
      </ProfileButton>

      <DropdownMenu isOpen={isDropdownOpen}>
        <UserInfo>
          <UserEmail>{user.email}</UserEmail>
          {user.username && <UserName>@{user.username}</UserName>}
        </UserInfo>

        {onHistoryClick && (
          <MenuButton onClick={handleHistoryClick}>
            <History size={16} />
            {t("navigation.history")}
          </MenuButton>
        )}

        <MenuButton onClick={handleLogout}>
          <LogOut size={16} />
          {t("auth.logout")}
        </MenuButton>
      </DropdownMenu>
    </ProfileContainer>
  )
}

export default UserProfile
