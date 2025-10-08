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

// This is sample data.
const data = {
  navMain: [
    {
      title: "Navigation",
      url: "#",
      items: [
        {
          title: "Home",
          url: "/dashboard",
        },
        {
          title: "CVs",
          url: "/dashboard/cvs",
        },
        {
          title: "People",
          url: "/dashboard/people",
        },
        {
          title: "Chat",
          url: "/dashboard/chat",
        },
      ],
    },
    ...(process.env.NODE_ENV === 'development' ? [{
      title: "Admin",
      url: "#",
      items: [
        {
          title: "Admin Panel",
          url: "/dashboard/admin",
        },
      ],
    }] : []),
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
            <span className="text-xs font-bold">CV</span>
          </div>
          <div className="flex flex-col gap-0.5 leading-none">
            <span className="font-medium">CV-Tool</span>
            <span className="text-xs">v0.0.3</span>
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
                {item.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <a href={item.url}>{item.title}</a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
