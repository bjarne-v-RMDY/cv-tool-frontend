import Link from "next/link"
import { Upload, Users, MessageCircle } from "lucide-react"
import { ActivityLog } from "@/components/activity-log"

export default function Page() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 h-full overflow-hidden">
      <div className="grid auto-rows-min gap-4 md:grid-cols-3 flex-shrink-0">
        {/* CVs Card */}
        <Link href="/dashboard/cvs" className="group">
          <div className="bg-card border rounded-xl p-6 h-full flex flex-col items-center justify-center gap-4 hover:bg-accent transition-colors">
            <div className="bg-primary/10 p-3 rounded-lg">
              <Upload className="h-6 w-6 text-primary" />
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
          <div className="bg-card border rounded-xl p-6 h-full flex flex-col items-center justify-center gap-4 hover:bg-accent transition-colors">
            <div className="bg-primary/10 p-3 rounded-lg">
              <Users className="h-6 w-6 text-primary" />
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
          <div className="bg-card border rounded-xl p-6 h-full flex flex-col items-center justify-center gap-4 hover:bg-accent transition-colors">
            <div className="bg-primary/10 p-3 rounded-lg">
              <MessageCircle className="h-6 w-6 text-primary" />
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
