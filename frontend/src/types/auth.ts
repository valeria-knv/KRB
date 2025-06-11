export interface User {
    id: string
    email: string
    username?: string
    is_active: boolean
    is_verified: boolean
    is_admin: boolean
    last_login_at?: string
    created_at: string
}
  
export interface AuthResponse {
    status: string
    message: string
    user?: User
    token?: string
}
  
export interface LoginCredentials {
    email: string
    password: string
}
  
export interface RegisterCredentials {
    email: string
    password: string
    confirmPassword: string
    username?: string
}
  
export interface AuthContextType {
    user: User | null
    token: string | null
    isAuthenticated: boolean
    isLoading: boolean
    login: (credentials: LoginCredentials) => Promise<void>
    register: (credentials: RegisterCredentials) => Promise<void>
    logout: () => void
}
  