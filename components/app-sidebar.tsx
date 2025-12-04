"use client"

import * as React from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  Home,
  FileText,
  Users,
  MessageCircle,
  Briefcase,
  Building2,
  type LucideIcon
} from "lucide-react"
import { usePathname } from "next/navigation"

// Navigation data with icons
interface NavItem {
  title: string
  url: string
  icon?: LucideIcon
}

interface NavGroup {
  title: string
  url: string
  items: NavItem[]
}

const data: { navMain: NavGroup[] } = {
  navMain: [
    {
      title: "Navigation",
      url: "#",
      items: [
        {
          title: "Home",
          url: "/dashboard",
          icon: Home,
        },
        {
          title: "CVs",
          url: "/dashboard/cvs",
          icon: FileText,
        },
        {
          title: "Projects",
          url: "/dashboard/projects",
          icon: Briefcase,
        },
        {
          title: "Vacancies",
          url: "/dashboard/vacancies",
          icon: Building2,
        },
        {
          title: "People",
          url: "/dashboard/people",
          icon: Users,
        },
        {
          title: "Chat",
          url: "/dashboard/chat",
          icon: MessageCircle,
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  // Function to check if a nav item is active
  const isActive = (url: string) => {
    if (url === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname.startsWith(url)
  }

  return (
    <Sidebar {...props} variant="inset">
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-4" >
          <div className="bg-primary text-primary-foreground flex aspect-square size-10 items-center justify-center rounded-lg shadow-sm">
            <span className="text-xs font-bold tracking-tight">RMDY</span>
          </div>
          <div className="flex flex-col gap-0.5 leading-none">
            <span className="font-semibold text-base">RMDY CV-Tool</span>
            <span className="text-xs text-muted-foreground">Talent Management</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* We create a SidebarGroup for each parent. */}
        {data.navMain.map((item) => (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {item.items.map((navItem) => {
                  const Icon = navItem.icon
                  const active = isActive(navItem.url)
                  return (
                    <SidebarMenuItem key={navItem.title}>
                      <SidebarMenuButton asChild isActive={active}>
                        <a href={navItem.url} className="flex items-center gap-2">
                          {Icon && <Icon className="h-4 w-4" />}
                          <span>{navItem.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
