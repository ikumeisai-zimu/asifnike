
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LayoutDashboard, Users, Briefcase, Calendar, LogOut, User } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { base44 } from "@/api/base44Client";

const navigationItems = [
  {
    title: "ダッシュボード",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "マイページ",
    url: createPageUrl("MyPage"),
    icon: User,
  },
  {
    title: "委員管理",
    url: createPageUrl("Committees"),
    icon: Users,
  },
  {
    title: "仕事管理",
    url: createPageUrl("Jobs"),
    icon: Briefcase,
  },
  {
    title: "シフト管理",
    url: createPageUrl("ShiftManagement"),
    icon: Calendar,
  },
];

const bureauColors = {
  "執行": "#EF4444",
  "事務": "#3B82F6",
  "広報": "#8B5CF6",
  "施設": "#10B981",
  "企画": "#F59E0B",
  "装飾": "#EC4899"
};

export default function Layout({ children }) {
  const location = useLocation();

  return (
    <SidebarProvider>
      <style>{`
        :root {
          --bureau-executive: ${bureauColors["執行"]};
          --bureau-affairs: ${bureauColors["事務"]};
          --bureau-pr: ${bureauColors["広報"]};
          --bureau-facilities: ${bureauColors["施設"]};
          --bureau-planning: ${bureauColors["企画"]};
          --bureau-decoration: ${bureauColors["装飾"]};
        }
      `}</style>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-orange-50 via-white to-pink-50">
        <Sidebar className="border-r border-gray-200">
          <SidebarHeader className="border-b border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <Calendar className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-lg">生明祭</h2>
                <p className="text-xs text-gray-600 font-medium">シフト管理システム</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                メニュー
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-orange-50 hover:text-orange-700 transition-all duration-200 rounded-xl mb-1 ${
                          location.pathname === item.url ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md' : ''
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-4">
              <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                局カラーコード
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-3 py-2 space-y-2">
                  {Object.entries(bureauColors).map(([bureau, color]) => (
                    <div key={bureau} className="flex items-center gap-2 text-sm">
                      <div 
                        className="w-4 h-4 rounded-full shadow-sm border-2 border-white"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-gray-700 font-medium">{bureau}</span>
                    </div>
                  ))}
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-gray-200 p-4">
            <button
              onClick={() => base44.auth.logout()}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-100 transition-colors text-gray-700"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">ログアウト</span>
            </button>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-6 py-4 lg:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                生明祭シフト管理
              </h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
