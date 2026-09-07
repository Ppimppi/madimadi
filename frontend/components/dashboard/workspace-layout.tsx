import type { ReactNode } from "react";

import { DashboardSidebar, type WorkspacePage } from "@/components/dashboard/sidebar";
import type { CurrentUser } from "@/lib/workspace";

type WorkspaceLayoutProps = {
  active: WorkspacePage;
  user: CurrentUser;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function WorkspaceLayout({ active, user, eyebrow, title, description, children }: WorkspaceLayoutProps) {
  return (
    <main className="mm-shell">
      <DashboardSidebar active={active} />
      <section className="mm-main">
        <header className="mm-topbar">
          <div className="mm-heading">
            <span>{eyebrow}</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <div className="mm-user-card">
            <span className="mm-avatar">{user.name.slice(0, 1)}</span>
            <div><strong>{user.name}</strong><small>{user.email}</small></div>
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}

export function WorkspaceLoading({ label = "화면을 불러오는 중입니다…" }: { label?: string }) {
  return <main className="mm-loading"><span className="mm-loading-dot" />{label}</main>;
}

export function WorkspaceError({ message }: { message: string }) {
  return (
    <main className="mm-loading mm-error-state">
      <strong>{message}</strong>
      <button type="button" onClick={() => window.location.reload()}>다시 시도</button>
    </main>
  );
}
