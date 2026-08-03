import { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import "./ProjectSidebar.css";

export type ProjectSidebarItem = {
  label: string;
  to?: string;
  href?: string;
  active?: boolean;
  onClick?: () => void;
};

export type ProjectSidebarProps = {
  projectName: string;
  repositoryLabel?: string;
  items: ProjectSidebarItem[];
  open?: boolean;
  onClose?: () => void;
};

export function ProjectSidebar({
  projectName,
  repositoryLabel,
  items,
  open = false,
  onClose,
}: ProjectSidebarProps) {
  const sidebarRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const isDrawer = Boolean(onClose);

  useEffect(() => {
    if (!isDrawer || !open) {
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebarRef.current?.querySelector<HTMLElement>("button, a")?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isDrawer, onClose, open]);

  return (
    <>
      {isDrawer && open ? (
        <button
          aria-label="프로젝트 내비게이션 닫기"
          className="project-sidebar-backdrop"
          onClick={onClose}
          type="button"
        />
      ) : null}
    <aside
      className={open ? "project-sidebar project-sidebar--open" : "project-sidebar"}
      ref={sidebarRef}
    >
      <div className="project-sidebar__summary">
        <strong>{projectName}</strong>
        {repositoryLabel ? <span>{repositoryLabel}</span> : null}
      </div>
      {onClose ? (
        <button
          aria-label="프로젝트 내비게이션 닫기"
          className="project-sidebar__close"
          onClick={onClose}
          type="button"
        >
          닫기
        </button>
      ) : null}
      <nav className="project-sidebar__nav" aria-label="Project navigation">
        {items.map((item) => {
          const baseClassName = item.active
            ? "project-sidebar__link project-sidebar__link--active"
            : "project-sidebar__link";

          if (item.to) {
            return (
              <NavLink
                className={({ isActive }) =>
                  isActive || item.active
                    ? "project-sidebar__link project-sidebar__link--active"
                    : "project-sidebar__link"
                }
                key={item.label}
                onClick={() => {
                  item.onClick?.();
                  onClose?.();
                }}
                to={item.to}
              >
                {item.label}
              </NavLink>
            );
          }

          if (item.href) {
            return (
              <a
                className={baseClassName}
                href={item.href}
                key={item.label}
                onClick={() => {
                  item.onClick?.();
                  onClose?.();
                }}
              >
                {item.label}
              </a>
            );
          }

          return (
            <button
              className={baseClassName}
              key={item.label}
              onClick={item.onClick}
              type="button"
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
    </>
  );
}
