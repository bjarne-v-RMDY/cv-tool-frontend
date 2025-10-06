"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
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

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
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
                    <div className="ml-auto">
                        <ThemeToggle />
                    </div>
                </header>
                <div className="flex flex-1 flex-col">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
