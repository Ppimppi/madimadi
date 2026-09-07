import { Award, BarChart3, Bot, ChartNoAxesCombined, MessageSquareText, Mic2, Settings } from "lucide-react";

import { AuthLogo } from "@/components/auth/auth-logo";
import { LogoutButton } from "@/components/auth/logout-button";

export type WorkspacePage = "dashboard" | "analysis" | "practice" | "coach" | "report" | "badges" | "settings";

type DashboardSidebarProps = { active: WorkspacePage };

const links: Array<{ id: WorkspacePage; href: string; label: string; icon: typeof BarChart3 }> = [
  { id: "dashboard", href: "/dashboard", label: "대시보드", icon: BarChart3 },
  { id: "analysis", href: "/practice", label: "음성 분석", icon: Mic2 },
  { id: "practice", href: "/situational-practice", label: "상황별 연습", icon: MessageSquareText },
  { id: "report", href: "/report", label: "성장 리포트", icon: ChartNoAxesCombined },
  { id: "coach", href: "/coach", label: "AI 코치", icon: Bot },
  { id: "badges", href: "/badges", label: "배지", icon: Award },
  { id: "settings", href: "/settings", label: "설정", icon: Settings },
];

export function DashboardSidebar({ active }: DashboardSidebarProps) {
  return (
    <aside className="mm-sidebar">
      <AuthLogo />
      <nav className="mm-nav" aria-label="마디마디 메뉴">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <a key={item.id} className={active === item.id ? "active" : undefined} href={item.href} aria-current={active === item.id ? "page" : undefined}>
              <Icon /> <span>{item.label}</span>
            </a>
          );
        })}
      </nav>
      <LogoutButton />
    </aside>
  );
}
