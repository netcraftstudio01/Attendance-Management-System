"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardNav } from "@/components/dashboard-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatsCard } from "@/components/ui/stats-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts"
import { Users, TrendingUp, BookOpen } from "lucide-react"

interface User {
  id: string
  email: string
  role: string
  name?: string
}

interface AnalyticsData {
  className: string
  strength: number
  presentToday: number
  totalRecords: number
  attendancePercentage: number
  classId: string
}

interface Summary {
  totalClasses: number
  totalStudents: number
  averageAttendance: number
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export default function AnalyticsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([])
  const [summary, setSummary] = useState<Summary>({
    totalClasses: 0,
    totalStudents: 0,
    averageAttendance: 0,
  })
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [filtering, setFiltering] = useState(false)

  useEffect(() => {
    // Check authentication
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.replace("/login")
      return
    }

    const parsedUser = JSON.parse(userData)
    if (parsedUser.role !== "admin") {
      router.replace("/login")
      return
    }

    setIsAuthorized(true)
    setUser(parsedUser)
    fetchAnalytics(parsedUser.id)
  }, [])

  const fetchAnalytics = async (adminId: string, start?: string, end?: string) => {
    try {
      setFiltering(start || end ? true : false)
      const params = new URLSearchParams({ adminId })
      if (start) params.append("startDate", start)
      if (end) params.append("endDate", end)

      const response = await fetch(`/api/admin/analytics?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setAnalytics(data.analytics)
        setSummary(data.summary)
      } else {
        console.error("Error fetching analytics:", data.error)
      }
    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setFiltering(false)
      setLoading(false)
    }
  }

  const handleFilter = () => {
    if (user) {
      fetchAnalytics(user.id, startDate || undefined, endDate || undefined)
    }
  }

  const handleReset = () => {
    setStartDate("")
    setEndDate("")
    if (user) {
      fetchAnalytics(user.id)
    }
  }

  if (!isAuthorized) {
    return null
  }

  // Prepare data for chart
  const chartData = analytics.map((item) => ({
    name: item.className,
    attendance: item.attendancePercentage,
    strength: item.strength,
    present: item.presentToday,
  }))

  return (
    <div className="min-h-screen bg-muted/40">
      <DashboardNav userName={user?.name} userEmail={user?.email} userRole={user?.role} />

      <main className="container mx-auto p-3 sm:p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="px-2 sm:px-0">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Attendance Analytics</h2>
          <p className="text-muted-foreground mt-1">Daily attendance rate by class</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatsCard
            title="Total Classes"
            value={summary.totalClasses}
            icon={BookOpen}
            trend={undefined}
          />
          <StatsCard
            title="Total Students"
            value={summary.totalStudents}
            icon={Users}
            trend={undefined}
          />
          <StatsCard
            title="Average Attendance"
            value={`${summary.averageAttendance}%`}
            icon={TrendingUp}
            trend={undefined}
          />
        </div>

        {/* Date Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filter by Date Range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="startDate" className="text-sm mb-2 block">
                  Start Date
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={filtering || loading}
                />
              </div>
              <div>
                <Label htmlFor="endDate" className="text-sm mb-2 block">
                  End Date
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={filtering || loading}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  onClick={handleFilter}
                  disabled={filtering || loading}
                  className="flex-1"
                >
                  {filtering ? "Filtering..." : "Filter"}
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  disabled={filtering || loading}
                  className="flex-1"
                >
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Attendance Rate by Class</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Daily attendance percentage across all classes in your department
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    label={{ value: "Attendance (%)", angle: -90, position: "insideLeft" }}
                    domain={[0, 100]}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      padding: "12px",
                    }}
                    formatter={(value: any, name: string | undefined) => {
                      if (name === "attendance") return [`${value}%`, "Attendance Rate"]
                      if (name === "strength") return [value, "Total Students"]
                      if (name === "present") return [value, "Present Today"]
                      return [value, name]
                    }}
                    labelFormatter={(label) => `Class: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="attendance" fill="#3b82f6" name="Attendance Rate %" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-96 text-muted-foreground">
                <p className="text-sm">No attendance data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detailed Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Detailed Attendance Summary</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Class-wise attendance details and student strength
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-medium">Class</th>
                    <th className="text-center py-3 px-4 font-medium">Total Students</th>
                    <th className="text-center py-3 px-4 font-medium">Present Today</th>
                    <th className="text-center py-3 px-4 font-medium">Total Records</th>
                    <th className="text-center py-3 px-4 font-medium">Attendance %</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.map((item, index) => (
                    <tr key={item.classId} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">{item.className}</td>
                      <td className="text-center py-3 px-4 font-semibold">{item.strength}</td>
                      <td className="text-center py-3 px-4 text-green-600 font-semibold">
                        {item.presentToday}
                      </td>
                      <td className="text-center py-3 px-4">{item.totalRecords}</td>
                      <td className="text-center py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-24 bg-muted rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-green-500 to-blue-500 h-full rounded-full transition-all"
                              style={{ width: `${item.attendancePercentage}%` }}
                            />
                          </div>
                          <span className="font-semibold min-w-[50px] text-right">
                            {item.attendancePercentage}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
