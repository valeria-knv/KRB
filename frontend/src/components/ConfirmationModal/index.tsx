"use client"

import type React from "react"
import styled from "styled-components"

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
`

const ModalContent = styled.div`
  background: ${(props) => props.theme.colors.primary};
  border-radius: 1rem;
  padding: 2rem;
  width: 100%;
  max-width: 450px;
  margin: 1rem;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.4);
  border: 2px solid rgba(255, 255, 255, 0.1);
`

const ModalTitle = styled.h3`
  color: ${(props) => props.theme.colors.text};
  margin: 0 0 1rem 0;
  font-size: 1.3rem;
  font-weight: 600;
  text-align: center;
`

const ModalMessage = styled.p`
  color: ${(props) => props.theme.colors.text};
  margin: 0 0 2rem 0;
  line-height: 1.5;
  text-align: center;
  opacity: 0.9;
`

const ButtonGroup = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
`

const Button = styled.button<{ variant?: "primary" | "danger" | "secondary" }>`
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.2s ease;
  min-width: 100px;
  
  background: ${(props) => {
    switch (props.variant) {
      case "danger":
        return "#ef4444"
      case "primary":
        return props.theme.colors.accent
      default:
        return "rgba(255, 255, 255, 0.1)"
    }
  }};
  
  color: ${(props) => {
    switch (props.variant) {
      case "danger":
      case "primary":
        return "white"
      default:
        return props.theme.colors.text
    }
  }};
  
  border: 2px solid ${(props) => {
    switch (props.variant) {
      case "danger":
        return "#ef4444"
      case "primary":
        return props.theme.colors.accent
      default:
        return "rgba(255, 255, 255, 0.2)"
    }
  }};
  
  &:hover {
    transform: translateY(-1px);
    background: ${(props) => {
      switch (props.variant) {
        case "danger":
          return "#dc2626"
        case "primary":
          return props.theme.colors.accentDark
        default:
          return "rgba(255, 255, 255, 0.15)"
      }
    }};
  }
`

interface ConfirmationModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  isDanger?: boolean
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = "Підтвердити",
  cancelText = "Скасувати",
  onConfirm,
  onCancel,
  isDanger = false,
}) => {
  if (!isOpen) return null

  return (
    <ModalOverlay onClick={onCancel}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalTitle>{title}</ModalTitle>
        <ModalMessage>{message}</ModalMessage>
        <ButtonGroup>
          <Button onClick={onCancel}>{cancelText}</Button>
          <Button variant={isDanger ? "danger" : "primary"} onClick={onConfirm}>
            {confirmText}
          </Button>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>
  )
}

export default ConfirmationModal
