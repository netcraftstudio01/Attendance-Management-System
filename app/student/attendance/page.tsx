"use client"

import { Suspense } from "react"
import { AttendanceContent } from "./attendance-content"

export default function StudentAttendance() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
      <Suspense fallback={<div>Loading...</div>}>
        <AttendanceContent />
      </Suspense>
    </div>
  )
}

