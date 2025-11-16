import { GalleryVerticalEnd, School } from "lucide-react"

import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-4 sm:gap-6 p-4 sm:p-6 md:p-10 safe-area-insets">
      <div className="flex w-full max-w-xs sm:max-w-sm flex-col gap-4 sm:gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium text-sm sm:text-base">
          <div className="bg-primary text-primary-foreground flex size-6 sm:size-7 items-center justify-center rounded-md flex-shrink-0">
            <School className="size-3.5 sm:size-4" />
          </div>
          <span className="hidden sm:inline">KPRCAS Attendance</span>
          <span className="sm:hidden">KPRCAS</span>
        </a>
        <LoginForm />
      </div>
    </div>
  )
}
