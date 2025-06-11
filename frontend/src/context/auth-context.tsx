"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { User, AuthContextType, LoginCredentials, RegisterCredentials, AuthResponse } from "../types/auth"

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem("auth_token")
    const savedUser = localStorage.getItem("auth_user")

    if (savedToken && savedUser) {
      try {
        setToken(savedToken)
        setUser(JSON.parse(savedUser))
        checkUserStatus(savedToken)
      } catch (error) {
        console.error("Error parsing saved user data:", error)
        localStorage.removeItem("auth_token")
        localStorage.removeItem("auth_user")
      }
    }
    setIsLoading(false)
  }, [])

  const checkUserStatus = async (authToken: string) => {
    try {
      const response = await fetch("http://localhost:5070/auth/me", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.status === "success") {
          setUser(data.user)
          localStorage.setItem("auth_user", JSON.stringify(data.user))
        }
      }
    } catch (error) {
      console.error("Error checking user status:", error)
    }
  }

  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      const response = await fetch("http://localhost:5070/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      })

      const data: AuthResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Login failed")
      }

      if (data.user && data.token) {
        setUser(data.user)
        setToken(data.token)
        localStorage.setItem("auth_token", data.token)
        localStorage.setItem("auth_user", JSON.stringify(data.user))
      }
    } catch (error) {
      console.error("Login error:", error)
      throw error
    }
  }

  const register = async (credentials: RegisterCredentials): Promise<void> => {
    if (credentials.password !== credentials.confirmPassword) {
      throw new Error("Passwords do not match")
    }

    try {
      const response = await fetch("http://localhost:5070/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
          username: credentials.username,
        }),
      })

      const data: AuthResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Registration failed")
      }

      // if (data.user && data.token) {
      //   setUser(data.user)
      //   setToken(data.token)
      //   localStorage.setItem("auth_token", data.token)
      //   localStorage.setItem("auth_user", JSON.stringify(data.user))
      // }
    } catch (error) {
      console.error("Registration error:", error)
      throw error
    }
  }

  const logout = (): void => {
    setUser(null)
    setToken(null)
    localStorage.removeItem("auth_token")
    localStorage.removeItem("auth_user")
  }

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
