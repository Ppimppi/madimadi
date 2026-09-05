import { AudioLines, BarChart3, MessageSquareText, Mic2 } from "lucide-react";

import { AuthLogo } from "@/components/auth/auth-logo";
import { LogoutButton } from "@/components/auth/logout-button";

type DashboardSidebarProps = {
  active: "dashboard" | "analysis" | "practice" | "report";
};

export function DashboardSidebar({ active }: DashboardSidebarProps) {
  return (
    <aside className="dashboard-sidebar">
      <AuthLogo />
      <nav aria-label="대시보드 메뉴">
        <a className={active === "dashboard" ? "active" : undefined} href="/dashboard">
          <BarChart3 />대시보드
        </a>
        <a className={active === "analysis" ? "active" : undefined} href="/practice">
          <Mic2 />음성 분석
        </a>
        <a className={active === "practice" ? "active" : undefined} href="/practice">
          <MessageSquareText />상황별 연습
        </a>
        <a className={active === "report" ? "active" : undefined} href="/dashboard#report">
          <AudioLines />성장 리포트
        </a>
      </nav>
      <LogoutButton />
    </aside>
  );
}
