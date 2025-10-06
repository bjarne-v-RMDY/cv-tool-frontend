import Link from "next/link"
import { Upload } from "lucide-react"

export default function Page() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        {/* Upload Card */}
        <Link href="/dashboard/upload" className="group">
          <div className="bg-card border rounded-xl p-6 h-full flex flex-col items-center justify-center gap-4 hover:bg-accent transition-colors">
            <div className="bg-primary/10 p-3 rounded-lg">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-lg">Upload Files</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Upload text files to get started
              </p>
            </div>
          </div>
        </Link>

        {/* Placeholder skeletons */}
        <div className="bg-muted/50 aspect-video rounded-xl" />
        <div className="bg-muted/50 aspect-video rounded-xl" />
      </div>
      <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
    </div>
  )
}
