"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { ChatToggle } from "@/components/chat-toggle"
import { ChatPanel } from "@/components/chat-panel"
import { SettingsDialog } from "@/components/settings-dialog"
import { useSidebarChatStore } from "@/lib/sidebar-chat-store"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import { usePathname } from "next/navigation"

interface BreadcrumbItem {
    title: string
    href?: string
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = []

    // Always start with Dashboard
    breadcrumbs.push({
        title: "Dashboard",
        href: "/dashboard"
    })

    // Skip the dashboard segment and build the rest
    const dashboardIndex = segments.indexOf('dashboard')
    if (dashboardIndex !== -1 && segments.length > dashboardIndex + 1) {
        const remainingSegments = segments.slice(dashboardIndex + 1)

        let currentPath = "/dashboard"

        remainingSegments.forEach((segment, index) => {
            currentPath += `/${segment}`
            const isLast = index === remainingSegments.length - 1

            // Capitalize first letter of segment
            const title = segment.charAt(0).toUpperCase() + segment.slice(1)

            breadcrumbs.push({
                title,
                href: isLast ? undefined : currentPath
            })
        })
    }

    return breadcrumbs
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const breadcrumbs = generateBreadcrumbs(pathname)
    const { isOpen: isChatOpen, toggle: toggleChat, setOpen: setChatOpen } = useSidebarChatStore()
    const [settingsOpen, setSettingsOpen] = React.useState(false)

    // Close sidebar chat when on the chat page
    React.useEffect(() => {
        if (pathname === '/dashboard/chat') {
            setChatOpen(false)
        }
    }, [pathname, setChatOpen])

    return (
        <SidebarProvider
            style={{
                "--sidebar-transition-duration": "0ms",
                "--sidebar-transition-easing": "linear"
            } as React.CSSProperties}
            className="[&_*]:!transition-none [&_*]:!duration-0"
        >
            <AppSidebar />
            <SidebarInset className="h-screen flex flex-col">
                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator
                        orientation="vertical"
                        className="mr-2 data-[orientation=vertical]:h-4"
                    />
                    <Breadcrumb>
                        <BreadcrumbList>
                            {breadcrumbs.map((breadcrumb, index) => (
                                <React.Fragment key={breadcrumb.title}>
                                    {index > 0 && <BreadcrumbSeparator />}
                                    <BreadcrumbItem className={index === 0 ? "hidden md:block" : ""}>
                                        {breadcrumb.href ? (
                                            <BreadcrumbLink href={breadcrumb.href}>
                                                {breadcrumb.title}
                                            </BreadcrumbLink>
                                        ) : (
                                            <BreadcrumbPage>{breadcrumb.title}</BreadcrumbPage>
                                        )}
                                    </BreadcrumbItem>
                                </React.Fragment>
                            ))}
                        </BreadcrumbList>
                    </Breadcrumb>
                    <div className="ml-auto flex items-center gap-2">
                        {pathname !== '/dashboard/chat' && (
                            <div className="hidden md:block">
                                <ChatToggle isOpen={isChatOpen} onToggle={toggleChat} />
                            </div>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSettingsOpen(true)}
                            title="Settings"
                        >
                            <Settings className="h-[1.2rem] w-[1.2rem]" />
                            <span className="sr-only">Settings</span>
                        </Button>
                        <ThemeToggle />
                    </div>
                </header>
                <div className="flex flex-1 min-h-0">
                    <div className={`flex-1 flex flex-col transition-all duration-300 ${isChatOpen ? 'mr-0' : 'mr-0'}`}>
                        {children}
                    </div>
                    {/* Chat panel hidden on mobile - users should use the dedicated chat page instead */}
                    <div className="hidden md:block">
                        <ChatPanel isOpen={isChatOpen} onClose={() => setChatOpen(false)} />
                    </div>
                </div>
            </SidebarInset>
            <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
        </SidebarProvider>
    )
}
