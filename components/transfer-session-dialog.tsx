import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle2, Loader2, Send, Users } from 'lucide-react'

interface TransferSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: any
  currentTeacherId: string
  onTransferSuccess?: () => void
}

interface Teacher {
  id: string
  name: string
  email: string
  department?: string
}

export function TransferSessionDialog({
  open,
  onOpenChange,
  session,
  currentTeacherId,
  onTransferSuccess,
}: TransferSessionDialogProps) {
  const [availableTeachers, setAvailableTeachers] = useState<Teacher[]>([])
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [transferReason, setTransferReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchingTeachers, setFetchingTeachers] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (open && session?.class_id) {
      fetchAvailableTeachers()
    }
  }, [open, session])

  const fetchAvailableTeachers = async () => {
    try {
      setFetchingTeachers(true)
      setError('')
      
      const response = await fetch(
        `/api/teacher/transfer-session?classId=${session.class_id}&currentTeacherId=${currentTeacherId}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch available teachers')
      }

      const data = await response.json()
      setAvailableTeachers(data.teachers || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch teachers')
      console.error('Error fetching teachers:', err)
    } finally {
      setFetchingTeachers(false)
    }
  }

  const handleTransfer = async () => {
    if (!selectedTeacherId) {
      setError('Please select a teacher')
      return
    }

    try {
      setLoading(true)
      setError('')

      const response = await fetch('/api/teacher/transfer-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.id,
          transferToTeacherId: selectedTeacherId,
          transferReason: transferReason || 'Session transferred between teachers',
          transferredByTeacherId: currentTeacherId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to transfer session')
      }

      setSuccess(true)
      setTimeout(() => {
        onOpenChange(false)
        onTransferSuccess?.()
        // Reset state
        setSelectedTeacherId('')
        setTransferReason('')
        setSuccess(false)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transfer session')
      console.error('Error transferring session:', err)
    } finally {
      setLoading(false)
    }
  }

  const selectedTeacher = availableTeachers.find(t => t.id === selectedTeacherId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer Session</DialogTitle>
          <DialogDescription>
            Transfer this session to another teacher for {session?.classes?.class_name} 
            {session?.classes?.section && ` ${session.classes.section}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Session Info */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-semibold">Class:</span> {session?.classes?.class_name} {session?.classes?.section}
                </div>
                <div>
                  <span className="font-semibold">Subject:</span> {session?.subjects?.subject_code}
                </div>
                <div>
                  <span className="font-semibold">Session Code:</span> {session?.session_code}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-600">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md flex gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-green-600">Session transferred successfully!</span>
            </div>
          )}

          {/* Teachers Grid */}
          <div className="space-y-2">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" />
              Select Teacher
            </Label>
            {fetchingTeachers ? (
              <div className="flex items-center justify-center p-4 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading available teachers...
              </div>
            ) : availableTeachers.length === 0 ? (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-600">
                No other teachers available for this class
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                {availableTeachers.map(teacher => (
                  <button
                    key={teacher.id}
                    onClick={() => setSelectedTeacherId(teacher.id)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      selectedTeacherId === teacher.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-sm">{teacher.name}</div>
                    <div className="text-xs text-gray-600">{teacher.email}</div>
                    {teacher.department && (
                      <div className="text-xs text-gray-500 mt-1">Dept: {teacher.department}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Teacher Info */}
          {selectedTeacher && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4">
                <div className="space-y-1 text-sm">
                  <div className="font-semibold text-green-900">Transferring to:</div>
                  <div className="text-green-800 font-medium">{selectedTeacher.name}</div>
                  <div className="text-green-700 text-xs">{selectedTeacher.email}</div>
                  {selectedTeacher.department && (
                    <div className="text-green-600 text-xs">Department: {selectedTeacher.department}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Input
              id="reason"
              placeholder="e.g., Unable to attend, Sick leave, etc."
              value={transferReason}
              onChange={e => setTransferReason(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={loading || !selectedTeacherId || availableTeachers.length === 0}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Transferring...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Transfer Session
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
