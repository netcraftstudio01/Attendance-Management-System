import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { sessionManager } from "@/lib/session-manager"

interface SessionUser {
  id: string
  email: string
  role: string
  name?: string
  sessionId: string
  loginTime: number
}

export function SessionSwitcher() {
  const router = useRouter()
  const [sessions, setSessions] = useState<SessionUser[]>([])
  const [activeSession, setActiveSession] = useState<SessionUser | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const updateSessions = () => {
      setSessions(sessionManager.getAllSessions())
      setActiveSession(sessionManager.getActiveSession())
    }

    updateSessions()

    // Listen for storage changes (for cross-tab communication)
    window.addEventListener('storage', updateSessions)
    return () => window.removeEventListener('storage', updateSessions)
  }, [isOpen])

  const handleSwitchSession = (sessionId: string) => {
    sessionManager.setActiveSession(sessionId)
    const session = sessions.find(s => s.sessionId === sessionId)
    if (session) {
      localStorage.setItem("user", JSON.stringify({
        id: session.id,
        email: session.email,
        role: session.role,
        name: session.name
      }))
    }
    setIsOpen(false)
    // Refresh page to apply new session
    router.refresh()
  }

  const handleLogout = (sessionId: string) => {
    sessionManager.removeSession(sessionId)
    setSessions(sessionManager.getAllSessions())
    
    if (activeSession?.sessionId === sessionId) {
      const remainingSessions = sessionManager.getAllSessions()
      if (remainingSessions.length > 0) {
        handleSwitchSession(remainingSessions[0].sessionId)
      } else {
        router.push("/login")
      }
    }
  }

  if (sessions.length <= 1) {
    return null
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs">Active Sessions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {sessions.map((session) => {
          const isActive = activeSession?.sessionId === session.sessionId
          const duration = sessionManager.getSessionDuration(session)
          
          return (
            <div key={session.sessionId} className="px-2 py-1.5">
              <button
                onClick={() => handleSwitchSession(session.sessionId)}
                className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-900'
                    : 'hover:bg-gray-100'
                }`}
              >
                <div className="font-medium">
                  {session.name || session.email.split('@')[0]}
                </div>
                <div className="text-xs text-gray-600">
                  {session.role.charAt(0).toUpperCase() + session.role.slice(1)} • {duration}m
                </div>
                <div className="text-xs text-gray-500 truncate">{session.email}</div>
              </button>
              <button
                onClick={() => handleLogout(session.sessionId)}
                className="w-full mt-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded flex items-center gap-1 justify-center"
              >
                <LogOut className="w-3 h-3" />
                Logout
              </button>
              {sessions.length > 1 && sessions.indexOf(session) < sessions.length - 1 && (
                <div className="my-1 border-t" />
              )}
            </div>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
