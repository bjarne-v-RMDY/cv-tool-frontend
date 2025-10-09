import Link from "next/link"
import { Upload, Users, MessageCircle } from "lucide-react"
import { ActivityLog } from "@/components/activity-log"

export default function Page() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-8 h-full overflow-hidden">
      {/* Welcome Header */}
      <div className="flex-shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome to <span className="rmdy-accent">RMDY</span> CV-Tool
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage candidates, upload CVs, and discover talent with AI-powered search
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid auto-rows-min gap-4 md:grid-cols-3 flex-shrink-0">
        {/* CVs Card */}
        <Link href="/dashboard/cvs" className="group">
          <div className="rmdy-card bg-card border rounded-xl p-6 h-full flex flex-col items-center justify-center gap-4 hover:bg-accent">
            <div className="bg-primary/10 p-4 rounded-xl group-hover:bg-primary/20 transition-colors">
              <Upload className="h-7 w-7 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-lg">CVs</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Upload and manage CV files
              </p>
            </div>
          </div>
        </Link>

        {/* People Card */}
        <Link href="/dashboard/people" className="group">
          <div className="rmdy-card bg-card border rounded-xl p-6 h-full flex flex-col items-center justify-center gap-4 hover:bg-accent">
            <div className="bg-primary/10 p-4 rounded-xl group-hover:bg-primary/20 transition-colors">
              <Users className="h-7 w-7 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-lg">People</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Browse candidate profiles
              </p>
            </div>
          </div>
        </Link>

        {/* Chat Card */}
        <Link href="/dashboard/chat" className="group">
          <div className="rmdy-card bg-card border rounded-xl p-6 h-full flex flex-col items-center justify-center gap-4 hover:bg-accent">
            <div className="bg-primary/10 p-4 rounded-xl group-hover:bg-primary/20 transition-colors">
              <MessageCircle className="h-7 w-7 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-lg">Chat</h3>
              <p className="text-sm text-muted-foreground mt-1">
                AI-powered candidate search
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Activity Log */}
      <div className="flex-1 min-h-0">
        <ActivityLog />
      </div>
    </div>
  )
}
