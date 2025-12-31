"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardNav } from "@/components/dashboard-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { TransferSessionDialog } from "@/components/transfer-session-dialog"
import { ArrowRight, Calendar, Send, Loader2, AlertCircle } from "lucide-react"

interface User {
  id: string
  email: string
  role: string
  name?: string
}

interface TransferredSession {
  id: string
  session_code: string
  class_id: string
  subject_id: string
  teacher_id: string
  transferred_to: string | null
  original_teacher_id: string | null
  transferred_at: string | null
  status: string
  created_at: string
  classes?: { class_name: string; section: string }
  subjects?: { subject_code: string; subject_name: string }
  originalTeacher?: { name: string; email: string }
  currentHandler?: { name: string; email: string }
}

export default function ManageSessionTransfers() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<TransferredSession[]>([])
  const [selectedSession, setSelectedSession] = useState<TransferredSession | null>(null)
  const [showTransferDialog, setShowTransferDialog] = useState(false)
  const [transferringSessionId, setTransferringSessionId] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user) {
      fetchSessions()
    }
  }, [user])

  const checkAuth = () => {
    const storedUser = localStorage.getItem("user")
    if (!storedUser) {
      router.push("/login")
      return
    }
    const parsedUser = JSON.parse(storedUser)
    if (parsedUser.role !== "teacher") {
      router.push("/")
      return
    }
    setUser(parsedUser)
  }

  const getRelativeTime = (date: string) => {
    const now = new Date()
    const past = new Date(date)
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    return `${Math.floor(diffInSeconds / 86400)} days ago`
  }

  const fetchSessions = async () => {
    try {
      setLoading(true)

      // Fetch sessions where user is the teacher
      const { data: teacherSessions, error: teacherError } = await supabase
        .from("attendance_sessions")
        .select(`
          id, session_code, class_id, subject_id, teacher_id,
          status, created_at, classes (class_name, section),
          subjects (subject_code, subject_name)
        `)
        .eq("teacher_id", user!.id)
        .order("created_at", { ascending: false })

      if (teacherError) {
        console.error("Error fetching teacher sessions:", teacherError.message || teacherError)
      }

      // Try to fetch transferred sessions (if the columns exist)
      let transferredSessions: any[] = []
      const { data: transferredData, error: transferredError } = await supabase
        .from("attendance_sessions")
        .select(`
          id, session_code, class_id, subject_id, teacher_id,
          transferred_to, original_teacher_id, transferred_at,
          status, created_at, classes (class_name, section),
          subjects (subject_code, subject_name)
        `)
        .eq("transferred_to", user!.id)
        .order("created_at", { ascending: false })

      if (transferredError) {
        console.warn("Could not fetch transferred sessions (columns may not exist yet):", transferredError.message)
      } else {
        transferredSessions = transferredData || []
      }

      // Combine and deduplicate sessions
      const allSessions = [...(teacherSessions || []), ...transferredSessions]
      const uniqueSessionsMap = new Map(allSessions.map(s => [s.id, s]))
      const data = Array.from(uniqueSessionsMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      const sessionsWithTeacherInfo = await Promise.all(
        (data || []).map(async (session: any) => {
          let originalTeacher = null
          let currentHandler = null

          if (session.original_teacher_id) {
            const { data: teacher } = await supabase
              .from("users")
              .select("id, name, email")
              .eq("id", session.original_teacher_id)
              .single()
            originalTeacher = teacher
          }

          if (session.transferred_to) {
            const { data: teacher } = await supabase
              .from("users")
              .select("id, name, email")
              .eq("id", session.transferred_to)
              .single()
            currentHandler = teacher
          }

          return {
            ...session,
            originalTeacher,
            currentHandler
          } as TransferredSession
        })
      )

      setSessions(sessionsWithTeacherInfo)
    } catch (error) {
      console.error("Error in fetchSessions:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleTransferClick = (session: TransferredSession) => {
    setSelectedSession(session)
    setTransferringSessionId(session.id)
    setShowTransferDialog(true)
  }

  const handleTransferSuccess = () => {
    fetchSessions()
    setTransferringSessionId(null)
  }

  const getStatusColor = (status: string, transferred_to: string | null) => {
    if (transferred_to) return "bg-blue-100 text-blue-800"
    if (status === "active") return "bg-green-100 text-green-800"
    if (status === "expired") return "bg-red-100 text-red-800"
    return "bg-gray-100 text-gray-800"
  }

  const getStatusLabel = (status: string, transferred_to: string | null) => {
    if (transferred_to) return "Transferred"
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Manage Session Transfers</h1>
          <p className="text-gray-600">
            Transfer your sessions to other teachers when you can't attend class
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Active & Transferred Sessions</CardTitle>
                <CardDescription>Sessions you created or are currently handling</CardDescription>
              </div>
              <Button onClick={() => router.push("/teacher")} variant="outline">
                Back to Dashboard
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center p-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-gray-600">No sessions found</p>
                <p className="text-sm text-gray-500">Create a new session to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Class</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Session Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Transfer Info</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow key={session.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          {session.classes?.class_name} {session.classes?.section}
                        </TableCell>
                        <TableCell>
                          {session.subjects?.subject_code} - {session.subjects?.subject_name}
                        </TableCell>
                        <TableCell>
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                            {session.session_code}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(session.status, session.transferred_to)}>
                            {getStatusLabel(session.status, session.transferred_to)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {getRelativeTime(session.created_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {session.transferred_to && session.currentHandler ? (
                            <div className="text-sm">
                              <div className="text-gray-600">{session.originalTeacher?.name || "Unknown"}</div>
                              <div className="flex items-center gap-1 text-blue-600 font-medium my-1">
                                <ArrowRight className="w-3 h-3" />
                                {session.currentHandler.name}
                              </div>
                              <div className="text-xs text-gray-500">{getRelativeTime(session.transferred_at || "")}</div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">Not transferred</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {(session.transferred_to === user.id || session.teacher_id === user.id) &&
                          session.status === "active" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTransferClick(session)}
                              disabled={transferringSessionId === session.id}
                              className="gap-1"
                            >
                              {transferringSessionId === session.id ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Transferring...
                                </>
                              ) : (
                                <>
                                  <Send className="w-3 h-3" />
                                  Transfer
                                </>
                              )}
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-500">
                              {session.status === "active" ? "Handled by other teacher" : "Inactive"}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg">How Session Transfers Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>✓ <strong>Transfer Your Sessions:</strong> Transfer sessions to another teacher who teaches the same class.</p>
            <p>✓ <strong>Original Teacher Name:</strong> Original teacher name is always recorded for audit purposes.</p>
            <p>✓ <strong>Who Marks Attendance:</strong> Current handler marks attendance, recorded under original teacher's class.</p>
            <p>✓ <strong>Transfer History:</strong> All transfers are logged for record-keeping and compliance.</p>
          </CardContent>
        </Card>
      </div>

      {selectedSession && (
        <TransferSessionDialog
          open={showTransferDialog}
          onOpenChange={setShowTransferDialog}
          session={selectedSession}
          currentTeacherId={user.id}
          onTransferSuccess={handleTransferSuccess}
        />
      )}
    </div>
  )
}
