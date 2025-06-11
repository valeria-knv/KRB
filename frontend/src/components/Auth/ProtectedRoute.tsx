"use client"

import type React from "react"
import { useAuth } from "../../contexts/auth-context"
import { useLanguage } from "../../contexts/language-context"
import AuthPage from "./AuthPage"
import VerificationMessage from "./VerificationMessage"

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const { t } = useLanguage()

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          fontSize: "1.2rem",
        }}
      >
        Завантаження...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <AuthPage />
  }

  if (user && !user.is_verified) {
    const handleResendEmail = async () => {
      const response = await fetch("http://localhost:5070/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: user.email }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to resend verification email")
      }
    }

    return <VerificationMessage userEmail={user.email} onResendEmail={handleResendEmail} onLogout={logout} />
  }

  return <>{children}</>
}

export default ProtectedRoute
