"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { QrCode, Mail, KeyRound, CheckCircle, AlertCircle, Loader2 } from "lucide-react"

export default function StudentAttendance() {
  const [step, setStep] = useState<"scan" | "email" | "otp" | "success">("scan")
  const [sessionCode, setSessionCode] = useState("")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [sessionId, setSessionId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [attendanceDetails, setAttendanceDetails] = useState<any>(null)

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
        alert("OTP sent to your email! Please check your inbox.")
      } else {
        setError(data.error || "Failed to send OTP")
      }
    } catch (error) {
      console.error("Error:", error)
      setError("Failed to send OTP. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // First verify OTP
      const verifyResponse = await fetch("/api/student/verify-otp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp,
          session_id: sessionId
        })
      })

      const verifyData = await verifyResponse.json()

      if (!verifyData.success) {
        setError(verifyData.error || "Invalid OTP")
        setLoading(false)
        return
      }

      // Then mark attendance
      const attendanceResponse = await fetch("/api/student/mark-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          session_id: sessionId
        })
      })

      const attendanceData = await attendanceResponse.json()

      if (attendanceData.success) {
        setAttendanceDetails(attendanceData.record)
        setSuccessMessage(attendanceData.message)
        setStep("success")
      } else {
        setError(attendanceData.error || "Failed to mark attendance")
      }
    } catch (error) {
      console.error("Error:", error)
      setError("Failed to mark attendance. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setStep("scan")
    setSessionCode("")
    setEmail("")
    setOtp("")
    setSessionId("")
    setError("")
    setSuccessMessage("")
    setAttendanceDetails(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
          <CardTitle className="text-2xl font-bold text-center">
            Mark Your Attendance
          </CardTitle>
          <CardDescription className="text-blue-100 text-center">
            Scan QR code and verify your email
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Step 1: Scan QR / Enter Code */}
          {step === "scan" && (
            <form onSubmit={handleScanSubmit} className="space-y-4">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 mb-4">
                  <QrCode className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Scan QR Code</h3>
                <p className="text-sm text-muted-foreground">
                  Or manually enter the session code displayed by your teacher
                </p>
              </div>

              <div>
                <Label htmlFor="session_code">Session Code</Label>
                <Input
                  id="session_code"
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                  placeholder="Enter 8-character code"
                  maxLength={8}
                  required
                  className="text-center text-lg font-mono tracking-widest"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Example: ABC12345
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full" size="lg">
                Continue
              </Button>
            </form>
          )}

          {/* Step 2: Enter Email */}
          {step === "email" && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-100 mb-4">
                  <Mail className="h-10 w-10 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Verify Your Email</h3>
                <p className="text-sm text-muted-foreground">
                  We&apos;ll send an OTP to verify your identity
                </p>
              </div>

              <div>
                <Label htmlFor="email">Student Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use your registered college email
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("scan")}
                  disabled={loading}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send OTP"
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Step 3: Enter OTP */}
          {step === "otp" && (
            <form onSubmit={handleOTPSubmit} className="space-y-4">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
                  <KeyRound className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Enter OTP</h3>
                <p className="text-sm text-muted-foreground">
                  Check your email <strong>{email}</strong> for the OTP
                </p>
              </div>

              <div>
                <Label htmlFor="otp">One-Time Password</Label>
                <Input
                  id="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  required
                  disabled={loading}
                  className="text-center text-lg font-mono tracking-widest"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  OTP is valid for 10 minutes
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("email")}
                  disabled={loading}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="flex-1"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Mark Attendance"
                  )}
                </Button>
              </div>

              <Button
                type="button"
                variant="link"
                onClick={() => setStep("email")}
                disabled={loading}
                className="w-full"
                size="sm"
              >
                Resend OTP
              </Button>
            </form>
          )}

          {/* Step 4: Success */}
          {step === "success" && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-green-600 mb-2">
                  Attendance Marked Successfully!
                </h3>
                <p className="text-sm text-muted-foreground">
                  {successMessage}
                </p>
              </div>

              {attendanceDetails && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Student:</span>
                    <span className="text-sm font-medium">{attendanceDetails.student_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Class:</span>
                    <span className="text-sm font-medium">{attendanceDetails.class}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Subject:</span>
                    <span className="text-sm font-medium">{attendanceDetails.subject}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Time:</span>
                    <span className="text-sm font-medium">
                      {new Date(attendanceDetails.marked_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <span className="text-sm font-medium text-green-600 uppercase">
                      {attendanceDetails.status}
                    </span>
                  </div>
                </div>
              )}

              <Button onClick={handleReset} className="w-full" size="lg">
                Mark Another Attendance
              </Button>
            </div>
          )}

          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <div
              className={`h-2 w-2 rounded-full ${
                step === "scan" ? "bg-blue-600" : "bg-gray-300"
              }`}
            />
            <div
              className={`h-2 w-2 rounded-full ${
                step === "email" ? "bg-blue-600" : "bg-gray-300"
              }`}
            />
            <div
              className={`h-2 w-2 rounded-full ${
                step === "otp" ? "bg-blue-600" : "bg-gray-300"
              }`}
            />
            <div
              className={`h-2 w-2 rounded-full ${
                step === "success" ? "bg-green-600" : "bg-gray-300"
              }`}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
