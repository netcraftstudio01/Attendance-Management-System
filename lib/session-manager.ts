/**
 * Multi-Session Management Utility
 * Allows concurrent logins for different users/roles
 */

interface SessionUser {
  id: string
  email: string
  role: string
  name?: string
  sessionId: string
  loginTime: number
}

const SESSIONS_STORAGE_KEY = 'sessions'
const ACTIVE_SESSION_KEY = 'activeSession'
const MAX_CONCURRENT_SESSIONS = 5

export const sessionManager = {
  /**
   * Get all active sessions
   */
  getAllSessions(): SessionUser[] {
    try {
      const data = localStorage.getItem(SESSIONS_STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  },

  /**
   * Get current active session
   */
  getActiveSession(): SessionUser | null {
    try {
      const sessionId = localStorage.getItem(ACTIVE_SESSION_KEY)
      if (!sessionId) return null

      const sessions = this.getAllSessions()
      return sessions.find(s => s.sessionId === sessionId) || null
    } catch {
      return null
    }
  },

  /**
   * Add new session (login)
   */
  addSession(user: Omit<SessionUser, 'sessionId' | 'loginTime'>): SessionUser {
    const sessions = this.getAllSessions()
    
    // Check if user already logged in from different device/browser
    const existingSessionIndex = sessions.findIndex(
      s => s.email === user.email && s.role === user.role
    )

    if (existingSessionIndex !== -1) {
      // Update existing session
      sessions[existingSessionIndex] = {
        ...user,
        sessionId: sessions[existingSessionIndex].sessionId,
        loginTime: Date.now()
      }
    } else {
      // Create new session
      if (sessions.length >= MAX_CONCURRENT_SESSIONS) {
        // Remove oldest session
        sessions.shift()
      }

      sessions.push({
        ...user,
        sessionId: this.generateSessionId(),
        loginTime: Date.now()
      })
    }

    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions))
    return sessions[sessions.length - 1]
  },

  /**
   * Set active session
   */
  setActiveSession(sessionId: string): boolean {
    const sessions = this.getAllSessions()
    const exists = sessions.some(s => s.sessionId === sessionId)
    
    if (exists) {
      localStorage.setItem(ACTIVE_SESSION_KEY, sessionId)
      return true
    }
    return false
  },

  /**
   * Remove session (logout)
   */
  removeSession(sessionId: string): void {
    const sessions = this.getAllSessions()
    const filtered = sessions.filter(s => s.sessionId !== sessionId)
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(filtered))

    // If this was active session, switch to most recent
    const activeSession = localStorage.getItem(ACTIVE_SESSION_KEY)
    if (activeSession === sessionId) {
      if (filtered.length > 0) {
        localStorage.setItem(ACTIVE_SESSION_KEY, filtered[filtered.length - 1].sessionId)
      } else {
        localStorage.removeItem(ACTIVE_SESSION_KEY)
      }
    }
  },

  /**
   * Clear all sessions (logout all)
   */
  clearAllSessions(): void {
    localStorage.removeItem(SESSIONS_STORAGE_KEY)
    localStorage.removeItem(ACTIVE_SESSION_KEY)
  },

  /**
   * Get sessions by role
   */
  getSessionsByRole(role: string): SessionUser[] {
    return this.getAllSessions().filter(s => s.role === role)
  },

  /**
   * Check if specific role is logged in
   */
  isRoleActive(role: string): boolean {
    return this.getSessionsByRole(role).length > 0
  },

  /**
   * Get user by role (for quick access to specific role)
   */
  getUserByRole(role: string): SessionUser | null {
    const sessions = this.getSessionsByRole(role)
    return sessions.length > 0 ? sessions[sessions.length - 1] : null
  },

  /**
   * Generate unique session ID
   */
  generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  },

  /**
   * Get session duration in minutes
   */
  getSessionDuration(session: SessionUser): number {
    return Math.floor((Date.now() - session.loginTime) / 60000)
  }
}

/**
 * Hook-style usage for components
 */
export function useCurrentUser() {
  return sessionManager.getActiveSession()
}

export function useAllSessions() {
  return sessionManager.getAllSessions()
}

export function useIsRoleActive(role: string) {
  return sessionManager.isRoleActive(role)
}
