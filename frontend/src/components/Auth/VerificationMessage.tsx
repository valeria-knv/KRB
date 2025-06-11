"use client"

import type React from "react"
import { useState } from "react"
import styled from "styled-components"
import { RefreshCw, LogOut } from "lucide-react"
import { useLanguage } from "../../contexts/language-context"

const VerificationContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
`

const VerificationCard = styled.div`
  width: 90%;
  max-width: 600px;
  background: white;
  padding: 3rem;
  border-radius: 1rem;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 2rem;
`

const IconContainer = styled.div`
  font-size: 80px;
  margin-bottom: 1rem;
  background: linear-gradient(45deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`

const Title = styled.h1`
  color: #333;
  font-size: 2rem;
  font-weight: 600;
  margin: 0;
`

const Description = styled.p`
  color: #666;
  line-height: 1.8;
  font-size: 1rem;
  margin: 0;
`

const EmailDisplay = styled.div`
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  padding: 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  color: #333;
  font-size: 1.1rem;
  border: 2px solid #e9ecef;
`

const WarningBox = styled.div`
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  color: #856404;
  padding: 1rem;
  border-radius: 0.5rem;
  font-size: 0.9rem;
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
`

const Button = styled.button<{ variant?: "primary" | "secondary" }>`
  background: ${(props) =>
    props.variant === "secondary"
      ? "linear-gradient(135deg, #6c757d 0%, #495057 100%)"
      : "linear-gradient(135deg, #007bff 0%, #0056b3 100%)"};
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: transform 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: ${(props) =>
    props.variant === "secondary" ? "0 4px 15px rgba(108,117,125,0.3)" : "0 4px 15px rgba(0,123,255,0.3)"};

  &:hover {
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`

const Footer = styled.div`
  font-size: 0.8rem;
  color: #999;
  line-height: 1.5;
`

interface VerificationMessageProps {
  userEmail: string
  onResendEmail: () => Promise<void>
  onLogout: () => void
}

const VerificationMessage: React.FC<VerificationMessageProps> = ({ userEmail, onResendEmail, onLogout }) => {
  const { t } = useLanguage()
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  const handleResendEmail = async () => {
    setIsResending(true)
    setResendMessage(null)

    try {
      await onResendEmail()
      setResendMessage("Лист верифікації відправлено успішно!")
    } catch (error) {
      setResendMessage("Помилка при відправці листа. Спробуйте пізніше.")
    } finally {
      setIsResending(false)
    }
  }

  return (
    <VerificationContainer>
      <VerificationCard>
        <div>
          <IconContainer>📧</IconContainer>
          <Title>{t("verificationMessage.title")}</Title>
        </div>

        <Description>{t("verificationMessage.message")}</Description>

        <EmailDisplay>{userEmail}</EmailDisplay>

        <WarningBox>
          <strong>💡 {t("verificationMessage.hint")}</strong> {t("verificationMessage.hintMessage")}
        </WarningBox>

        {resendMessage && (
          <div
            style={{
              padding: "1rem",
              borderRadius: "0.5rem",
              background: resendMessage.includes("успішно") ? "#d4edda" : "#f8d7da",
              color: resendMessage.includes("успішно") ? "#155724" : "#721c24",
              border: `1px solid ${resendMessage.includes("успішно") ? "#c3e6cb" : "#f5c6cb"}`,
            }}
          >
            {resendMessage}
          </div>
        )}

        <ButtonGroup>
          <Button onClick={handleResendEmail} disabled={isResending}>
            <RefreshCw size={16} />
            {isResending ? "Відправляємо..." : "Відправити повторно"}
          </Button>

          <Button variant="secondary" onClick={onLogout}>
            <LogOut size={16} />
            {t("verificationMessage.logout")}
          </Button>
        </ButtonGroup>

        <Footer>
          {t("verificationMessage.function")}
          <br />
          {t("verificationMessage.time")}
        </Footer>
      </VerificationCard>
    </VerificationContainer>
  )
}

export default VerificationMessage
