"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { QrCode, Mail, KeyRound, CheckCircle, AlertCircle, Loader2 } from "lucide-react"

interface AttendanceContentProps {
  initialSessionCode?: string
}

export function AttendanceContent({ initialSessionCode = "" }: AttendanceContentProps) {
  const searchParams = useSearchParams()
  const [step, setStep] = useState<"scan" | "email" | "otp" | "success">("scan")
  const [sessionCode, setSessionCode] = useState(initialSessionCode)
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [sessionId, setSessionId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [attendanceDetails, setAttendanceDetails] = useState<any>(null)

  // Check for session code in URL parameters (from QR code scan)
  useEffect(() => {
    const sessionFromUrl = searchParams.get('session')
    if (sessionFromUrl && sessionFromUrl.length === 8) {
      setSessionCode(sessionFromUrl)
      setStep("email")
      console.log("📲 Session code from QR scan:", sessionFromUrl)
    }
  }, [searchParams])

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (sessionCode.trim().length === 8) {
      setError("")
      setStep("email")
    } else {
      setError("Please enter a valid 8-character session code")
    }
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/student/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          session_code: sessionCode
        })
      })

      const data = await response.json()

      if (data.success) {
        setSessionId(data.session_id)
        setStep("otp")
        setSuccessMessage(`OTP sent to ${email}. Please check your email.`)
      } else {
        setError(data.error || "Failed to send OTP")
      }
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/student/mark-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          otp
        })
      })

      const data = await response.json()

      if (data.success) {
        setAttendanceDetails(data)
        setStep("success")
        setSuccessMessage("Attendance marked successfully!")
      } else {
        setError(data.error || "Failed to verify OTP")
      }
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setStep("scan")
    setSessionCode("")
    setEmail("")
    setOtp("")
    setError("")
    setSuccessMessage("")
  }

  return (
    <>
      {step === "scan" && (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Scan QR Code
            </CardTitle>
            <CardDescription>
              Scan the QR code from your teacher or enter the session code manually
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleScanSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="session-code">Session Code</Label>
                <Input
                  id="session-code"
                  placeholder="Enter 8-character code"
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                  maxLength={8}
                  className="text-center text-lg font-mono tracking-widest"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={sessionCode.length !== 8}
              >
                Continue
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {step === "email" && (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Enter Email
            </CardTitle>
            <CardDescription>
              We'll send an OTP to verify your identity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {successMessage && (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleReset}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={!email || loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send OTP
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {step === "otp" && (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Verify OTP
            </CardTitle>
            <CardDescription>
              Enter the OTP sent to {email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">One-Time Password</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  className="text-center text-2xl font-bold tracking-widest"
                  required
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleReset}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={otp.length < 6 || loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {step === "success" && (
        <Card className="w-full max-w-md border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              Success!
            </CardTitle>
            <CardDescription className="text-green-600">
              Your attendance has been recorded
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {attendanceDetails && (
              <div className="space-y-3 rounded-lg bg-white p-4">
                <div>
                  <p className="text-sm text-gray-600">Class</p>
                  <p className="font-semibold">
                    {attendanceDetails.class_name} {attendanceDetails.section}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Subject</p>
                  <p className="font-semibold">
                    {attendanceDetails.subject_code} - {attendanceDetails.subject_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Marked At</p>
                  <p className="font-semibold">
                    {new Date(attendanceDetails.marked_at).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            <Button
              onClick={handleReset}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Mark Attendance Again
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  )
}
