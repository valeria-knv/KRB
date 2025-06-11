import styled, { keyframes } from "styled-components";

interface ButtonProps {
  variant?: "main" | "secondary" | "upload" | "recording";
}

interface TranscriptBoxProps {
  hasScroll?: boolean;
}

interface PlaceholderProps {
  hasText?: boolean;
  isPlaceholder?: boolean;
}

interface ModalButtonProps {
  variant?: "primary" | "secondary";
}

const pulse = keyframes`
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
`;

export const RecorderContainer = styled.div`
  width: 100%;
  height: 85vh;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const RecorderCard = styled.div`
  width: 90%;
  max-width: 600px;
  min-width: 350px;
  background-color: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.text};
  padding: 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.3);
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const IconButton = styled.button<{ top?: boolean; bottom?: boolean }>`
  position: absolute;
  ${({ top }) => top && "top: 15px;"}
  ${({ bottom }) => bottom && "bottom: 15px;"}
  left: 15px; /* Отступ слева */
  color: ${({ theme }) => theme.colors.text};
  opacity: 0.6;
  cursor: pointer;
  background: transparent;
  border: none;
  outline: none;
  padding: 8px;
  box-shadow: none;
  z-index: 1;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 1;
  }
`;

export const TranscriptBox = styled.div<TranscriptBoxProps>`
  height: 30vh;
  margin-top: 1rem;
  overflow-y: auto;
  padding: 1rem;
  color: ${({ theme }) => theme.colors.text};
  border-radius: 0.5rem;
  display: flex;
  align-items: ${({ hasScroll }) => (hasScroll ? 'flex-start' : 'center')};
  justify-content: center;
  font-size: clamp(0.9rem, 2vw, 1.2rem);

  /* Scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.primary};
    border-radius: 10px;
    margin: 5px 0;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.secundary};
    border-radius: 10px;
    transition: all 0.3s ease;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.secundaryHover};
    transform: scaleY(1.1);
  }

  &::-webkit-scrollbar-thumb:active {
    background: ${({ theme }) => theme.colors.secundaryHover};
  }

  /* Scrollbar Firefox */
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.colors.secundary} ${({ theme }) => theme.colors.primary};
`;

export const Placeholder = styled.div<PlaceholderProps>`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: ${({ isPlaceholder }) => (isPlaceholder ? 'center' : 'flex-start')};
  justify-content: ${({ isPlaceholder }) => (isPlaceholder ? 'center' : 'flex-start')};
  word-break: break-word;
  white-space: pre-wrap;
  line-height: 1.2;
  text-align: ${({ isPlaceholder }) => (isPlaceholder ? 'center' : 'left')};
  
  ${({ isPlaceholder }) => isPlaceholder && `
    font-size: 1.5rem;
    opacity: 0.5;
  `}
  
  ${({ isPlaceholder }) => !isPlaceholder && `
    font-size: 0.95rem;
    opacity: 1;
  `}
`;

export const CharCount = styled.div`
  margin-top: 1rem;
  opacity: 0.5;
  font-size: 0.8rem;
`;

export const ButtonGroup = styled.div`
  display: flex;
  width: 100%;
  gap: 1rem;
`;

export const RecordingIndicator = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  background-color: #ff4444;
  border-radius: 50%;
  animation: ${pulse} 1s infinite;
`;

export const Button = styled.button<ButtonProps>`
  flex: ${({ variant }) => (variant === "main" ? "2.5" : "1")};
  padding: 0.75rem;
  border-radius: 0.5rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  gap: 0.5rem;
  color: #fff;

  background-color: ${({ theme, variant }) => {
    switch (variant) {
      case "secondary":
        return theme.colors.secundary;
      case "upload":
        return theme.colors.accent;
      default:
        return theme.colors.accent;
    }
  }};

  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease-in-out;

  &:hover {
    background-color: ${({ theme, variant }) => {
      switch (variant) {
        case "secondary":
          return theme.colors.secundaryHover;
        case "upload":
          return theme.colors.accentDark;
        default:
          return theme.colors.accentDark;
      }
    }};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

export const ModalContent = styled.div`
  background-color: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.text};
  padding: 2rem;
  border-radius: 1rem;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
  min-width: 300px;
  max-width: 90vw;

  h3 {
    margin: 0 0 1rem 0;
    text-align: center;
  }
`;

export const ModalButton = styled.button<ModalButtonProps>`
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 1rem;
  color: #fff;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease-in-out;

  background-color: ${({ theme, variant }) => {
    switch (variant) {
      case "secondary":
        return theme.colors.secundary;
      default:
        return theme.colors.accent;
    }
  }};

  &:hover {
    background-color: ${({ theme, variant }) => {
      switch (variant) {
        case "secondary":
          return theme.colors.secundaryHover;
        default:
          return theme.colors.accentDark;
      }
    }};
  }
`;
