"use client"

import type React from "react"
import { useState } from "react"
import styled from "styled-components"
import LoginForm from "./LoginForm"
import RegisterForm from "./RegisterForm"
import SuccessMessage from "./SuccessMessage"

const AuthContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${(props) => props.theme.colors.background};
  padding: 2rem;
`

const AuthPage: React.FC = () => {
  const [currentView, setCurrentView] = useState<"login" | "register" | "success">("login")
  const [registrationData, setRegistrationData] = useState<{
    email: string
    message: string
  } | null>(null)

  const handleRegistrationSuccess = (email: string, message: string) => {
    setRegistrationData({ email, message })
    setCurrentView("success")
  }

  const handleBackToLogin = () => {
    setCurrentView("login")
    setRegistrationData(null)
  }

  return (
    <AuthContainer>
      {currentView === "login" && <LoginForm onSwitchToRegister={() => setCurrentView("register")} />}
      {currentView === "register" && (
        <RegisterForm
          onSwitchToLogin={() => setCurrentView("login")}
          onRegistrationSuccess={handleRegistrationSuccess}
        />
      )}
      {currentView === "success" && registrationData && (
        <SuccessMessage
          email={registrationData.email}
          message={registrationData.message}
          onBackToLogin={handleBackToLogin}
        />
      )}
    </AuthContainer>
  )
}

export default AuthPage
