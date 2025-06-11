"use client"

import type React from "react"
import styled from "styled-components"
import { CheckCircle, ArrowLeft, Mail } from "lucide-react"
import { useLanguage } from "../../contexts/language-context"

const SuccessCard = styled.div`
  width: 90%;
  max-width: 500px;
  background-color: ${(props) => props.theme.colors.primary};
  color: ${(props) => props.theme.colors.text};
  padding: 3rem 2rem;
  border-radius: 1rem;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.3);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 2rem;
`

const IconContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
`

const SuccessIcon = styled(CheckCircle)`
  color: #4caf50;
  width: 80px;
  height: 80px;
`

const Title = styled.h2`
  color: ${(props) => props.theme.colors.text};
  font-size: 2rem;
  font-weight: 600;
  margin: 0;
`

const Message = styled.p`
  color: ${(props) => props.theme.colors.text};
  font-size: 1.1rem;
  line-height: 1.6;
  margin: 0;
  opacity: 0.9;
`

const EmailBox = styled.div`
  background: rgba(255, 255, 255, 0.1);
  padding: 1rem;
  border-radius: 0.5rem;
  border: 2px solid ${(props) => props.theme.colors.accent};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 600;
`

const InfoBox = styled.div`
  background: rgba(76, 175, 80, 0.1);
  border: 1px solid rgba(76, 175, 80, 0.3);
  padding: 1rem;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  line-height: 1.5;
`

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 1rem;
  color: #fff;
  background-color: ${(props) => props.theme.colors.accent};
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover {
    background-color: ${(props) => props.theme.colors.accentDark};
    transform: translateY(-1px);
  }
`

interface SuccessMessageProps {
  email: string
  message: string
  onBackToLogin: () => void
}

const SuccessMessage: React.FC<SuccessMessageProps> = ({ email, message, onBackToLogin }) => {
  const { t } = useLanguage()

  return (
    <SuccessCard>
      <div>
        <IconContainer>
          <SuccessIcon />
        </IconContainer>
        <Title>{t("verificationSuccess.title")}</Title>
      </div>

      <Message>{message}</Message>

      <EmailBox>
        <Mail size={20} />
        {email}
      </EmailBox>

      <InfoBox>
        <strong>📧 {t("verificationSuccess.checkEmail")}</strong>
        <br />
        {t("verificationSuccess.message")}
        <br />
        <br />
        <em>{t("verificationSuccess.emphasis")}</em>
      </InfoBox>

      <Button onClick={onBackToLogin}>
        <ArrowLeft size={16} />
        {t("verificationSuccess.login")}
      </Button>
    </SuccessCard>
  )
}

export default SuccessMessage
