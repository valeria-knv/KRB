"use client"

import type React from "react"
import { useState } from "react"
import styled from "styled-components"
import { LogIn, Mail, Lock } from "lucide-react"
import { useAuth } from "../../contexts/auth-context"
import { useLanguage } from "../../contexts/language-context"
import type { LoginCredentials } from "../../types/auth"

const FormCard = styled.div`
  width: 90%;
  max-width: 450px;
  min-width: 350px;
  background-color: ${(props) => props.theme.colors.primary};
  color: ${(props) => props.theme.colors.text};
  padding: 2rem;
  border-radius: 1rem;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.3);
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`

const Title = styled.h2`
  text-align: center;
  margin: 0;
  color: ${(props) => props.theme.colors.text};
  font-size: 1.8rem;
  font-weight: 600;
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const Label = styled.label`
  font-weight: 500;
  color: ${(props) => props.theme.colors.text};
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const Input = styled.input`
  padding: 0.75rem 1rem;
  border: 2px solid transparent;
  border-radius: 0.5rem;
  font-size: 1rem;
  background: rgba(255, 255, 255, 0.1);
  color: ${(props) => props.theme.colors.text};
  transition: all 0.2s ease;

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  &:focus {
    outline: none;
    border-color: ${(props) => props.theme.colors.accent};
    background: rgba(255, 255, 255, 0.15);
  }

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }
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

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`

const ErrorMessage = styled.div`
  color: #ff6b6b;
  text-align: center;
  font-size: 0.9rem;
  padding: 0.5rem;
  background: rgba(255, 107, 107, 0.1);
  border-radius: 0.5rem;
  border: 1px solid rgba(255, 107, 107, 0.3);
`

const SwitchText = styled.p`
  text-align: center;
  margin: 0;
  color: ${(props) => props.theme.colors.text};
  font-size: 0.9rem;
`

const SwitchLink = styled.span`
  color: ${(props) => props.theme.colors.accent};
  cursor: pointer;
  font-weight: 600;
  transition: color 0.2s ease;

  &:hover {
    color: ${(props) => props.theme.colors.accentDark};
    text-decoration: underline;
  }
`

interface LoginFormProps {
  onSwitchToRegister: () => void
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const { login } = useAuth()
  const { t } = useLanguage()
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: "",
    password: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!credentials.email || !credentials.password) {
      setError(t("auth.fillAllFields"))
      return
    }

    setIsLoading(true)
    try {
      await login(credentials)
    } catch (error) {
      setError(error instanceof Error ? error.message : t("auth.loginFailed"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  return (
    <FormCard>
      <Title>{t("auth.login")}</Title>
      <Form onSubmit={handleSubmit}>
        <InputGroup>
          <Label htmlFor="email">
            <Mail size={16} />
            {t("auth.email")}
          </Label>
          <Input
            type="email"
            id="email"
            name="email"
            value={credentials.email}
            onChange={handleChange}
            placeholder="your@email.com"
            required
          />
        </InputGroup>
        <InputGroup>
          <Label htmlFor="password">
            <Lock size={16} />
            {t("auth.password")}
          </Label>
          <Input
            type="password"
            id="password"
            name="password"
            value={credentials.password}
            onChange={handleChange}
            placeholder="••••••••"
            required
          />
        </InputGroup>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            "..."
          ) : (
            <>
              <LogIn size={16} />
              {t("auth.login")}
            </>
          )}
        </Button>
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </Form>
      <SwitchText>
        {t("auth.noAccount")} <SwitchLink onClick={onSwitchToRegister}>{t("auth.register")}</SwitchLink>
      </SwitchText>
    </FormCard>
  )
}

export default LoginForm
