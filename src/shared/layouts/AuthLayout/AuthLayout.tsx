import "./AuthLayout.css";

export type AuthLayoutProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function AuthLayout({ title, description, children }: AuthLayoutProps) {
  return (
    <main className="auth-layout-shell">
      <section className="auth-layout-shell__brand" aria-labelledby="auth-layout-title">
        <p className="eyebrow">Contextory</p>
        <h1 id="auth-layout-title">{title}</h1>
        {description ? <p>{description}</p> : null}
      </section>
      <section className="auth-layout-shell__form">{children}</section>
    </main>
  );
}
