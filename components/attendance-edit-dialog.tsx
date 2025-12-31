"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

interface AttendanceEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: {
    id: string
    name: string
    email: string
    roll_number: string
  } | null
  currentStatus?: string
  currentNotes?: string
  onSubmit: (status: string, notes: string) => Promise<void>
  loading?: boolean
}

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', color: 'bg-green-100 text-green-800' },
  { value: 'absent', label: 'Absent', color: 'bg-red-100 text-red-800' },
  { value: 'late', label: 'Late', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'on_duty', label: 'On Duty', color: 'bg-blue-100 text-blue-800' },
]

export function AttendanceEditDialog({
  open,
  onOpenChange,
  student,
  currentStatus = 'absent',
  currentNotes = '',
  onSubmit,
  loading = false,
}: AttendanceEditDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>(currentStatus)
  const [notes, setNotes] = useState<string>(currentNotes)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await onSubmit(selectedStatus, notes)
      setSelectedStatus('absent')
      setNotes('')
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Attendance</DialogTitle>
          <DialogDescription>
            Update attendance status for {student?.name}
          </DialogDescription>
        </DialogHeader>

        {student && (
          <div className="space-y-4">
            {/* Student Info */}
            <div className="bg-muted p-3 rounded-lg space-y-1">
              <p className="text-sm font-medium">{student.name}</p>
              <p className="text-xs text-muted-foreground">Roll: {student.roll_number}</p>
              <p className="text-xs text-muted-foreground">{student.email}</p>
            </div>

            {/* Status Selection */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Attendance Status</Label>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedStatus(option.value)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedStatus === option.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Badge className={`${option.color} w-full justify-center`}>
                      {option.label}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes" className="text-sm">
                Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this attendance record..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting || loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || loading}
          >
            {submitting ? 'Saving...' : 'Save Attendance'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
