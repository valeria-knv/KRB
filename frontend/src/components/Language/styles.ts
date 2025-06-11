import styled from "styled-components"

export const LanguageSelectorContainer = styled.div`
  position: relative;
  display: inline-block;
`

export const LanguageButton = styled.button<{ isOpen: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: ${({ theme }) => theme.colors.secundary};
  color: ${({ theme }) => theme.colors.text};
  border: none;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-weight: 500;
  font-size: 0.9rem;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;
  min-width: 70px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  &:hover {
    background-color: ${({ theme }) => theme.colors.secundaryHover};
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  ${({ isOpen, theme }) =>
    isOpen &&
    `
    background-color: ${theme.colors.secundaryHover};
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  `}
`

export const LanguageIcon = styled.div`
  display: flex;
  align-items: center;
  opacity: 0.8;
`

export const FlagIcon = styled.span`
  font-size: 1.2rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`

export const DropdownIcon = styled.div<{ isOpen: boolean }>`
  display: flex;
  align-items: center;
  transition: transform 0.2s ease;
  opacity: 0.7;

  ${({ isOpen }) =>
    isOpen &&
    `
    transform: rotate(180deg);
  `}
`

export const DropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  right: 0;
  background-color: ${({ theme }) => theme.colors.primary};
  border: 1px solid ${({ theme }) => theme.colors.secundary};
  border-radius: 0.5rem;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  overflow: hidden;
  animation: slideDown 0.2s ease;

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`

export const DropdownItem = styled.div<{ isSelected: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s ease;

  background-color: ${({ isSelected, theme }) => (isSelected ? theme.colors.secundary : "transparent")};

  &:hover {
    background-color: ${({ theme }) => theme.colors.secundary};
  }

  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.colors.secundary}33;
  }
`