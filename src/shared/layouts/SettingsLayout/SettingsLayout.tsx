import "./SettingsLayout.css";

export type SettingsNavItem = {
  label: string;
  active?: boolean;
  onClick?: () => void;
};

export type SettingsLayoutProps = {
  title: string;
  description?: string;
  navItems: SettingsNavItem[];
  children: React.ReactNode;
};

export function SettingsLayout({
  title,
  description,
  navItems,
  children,
}: SettingsLayoutProps) {
  return (
    <section className="settings-layout">
      <header className="settings-layout__header">
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </header>
      <div className="settings-layout__body">
        <nav className="settings-layout__nav" aria-label="Settings navigation">
          {navItems.map((item) => (
            <button
              className={
                item.active
                  ? "settings-layout__nav-item settings-layout__nav-item--active"
                  : "settings-layout__nav-item"
              }
              key={item.label}
              onClick={item.onClick}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="settings-layout__content">{children}</div>
      </div>
    </section>
  );
}
