import React from "react";
import "./AuthLayout.css";

export type AuthLayoutProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
};

const brandFeatures = [
  { icon: "↗", label: "변경사항 수집", description: "PR·커밋·이슈 흐름을 프로젝트에 연결" },
  { icon: "✦", label: "AI 맥락 분석", description: "변경 이유와 역할별 영향을 구조화" },
  { icon: "☰", label: "팀 메모리", description: "검토한 기록을 팀 지식으로 축적" },
];

export function AuthLayout({ title, description, children }: AuthLayoutProps) {
  return (
    <main className="auth-layout-shell">
      <section className="auth-layout-shell__brand" aria-labelledby="auth-layout-title">
        <div className="auth-layout-shell__brand-content">
          <p className="auth-layout-shell__brand-logo">Contextory</p>
          <div className="auth-layout-shell__brand-headers">
            <div className="auth-layout-shell__brand-heading" id="auth-layout-title">{title}</div>
            {description ? <p className="auth-layout-shell__brand-description">{description}</p> : null}
          </div>
          <ul className="auth-layout-shell__features">
            {brandFeatures.map((feature) => (
              <li key={feature.label}>
                <span className="auth-layout-shell__feature-icon">{feature.icon}</span>
                <div>
                  <strong>{feature.label}</strong>
                  <p>{feature.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <footer className="auth-layout-shell__brand-copyright">© Contextory</footer>
      </section>
      <section className="auth-layout-shell__form">{children}</section>
    </main>
  );
}
