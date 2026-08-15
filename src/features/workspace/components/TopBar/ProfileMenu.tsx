import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../../../../shared/api/client";
import { logout } from "../../../auth/authApi";
import "./ProfileMenu.css";

type ProfileMenuProps = {
  email: string;
  name: string;
  onFeedback?: (message: string) => void;
};

export function ProfileMenu({ email, name, onFeedback }: ProfileMenuProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [localFeedback, setLocalFeedback] = useState("");
  const [logoutLoading, setLogoutLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const menuId = useId();
  const accountState = location.pathname.startsWith("/projects/")
    ? { from: `${location.pathname}${location.search}${location.hash}` }
    : undefined;

  useEffect(() => {
    if (!open) return;

    const focusFrame = window.requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    });

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const notify = (message: string) => {
    if (onFeedback) onFeedback(message);
    else setLocalFeedback(message);
  };

  const closeMenu = () => setOpen(false);

  const handleLogout = async () => {
    setLogoutLoading(true);
    closeMenu();

    try {
      await logout();
      navigate("/auth/login", {
        replace: true,
        state: { authFeedback: "로그아웃되었습니다." },
      });
    } catch (error) {
      const message = `${getApiErrorMessage(error, "서버 로그아웃 요청에 실패했습니다.")} 로컬 로그인 정보는 정리되었습니다.`;
      notify(message);
      navigate("/auth/login", {
        replace: true,
        state: {
          authFeedback: message,
        },
      });
    }
  };

  return (
    <div className="profile-menu" ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-label={`${name} 프로필 메뉴 ${open ? "닫기" : "열기"}`}
        className="profile-menu__trigger"
        onClick={() => {
          if (!open) setLocalFeedback("");
          setOpen((current) => !current);
        }}
        ref={triggerRef}
        type="button"
      >
        <span aria-hidden="true" className="profile-menu__trigger-avatar">{name.slice(0, 1)}</span>
        <span>{name}</span>
      </button>

      {open ? (
        <nav aria-label="프로필 메뉴" className="profile-menu__popover" id={menuId} ref={menuRef}>
          <h2>프로필 메뉴</h2>
          <div className="profile-menu__user">
            <span aria-hidden="true" className="profile-menu__avatar">{name.slice(0, 1)}</span>
            <div>
              <strong>{name}</strong>
              <span>{email}</span>
            </div>
          </div>
          <ul>
            <li>
              <Link onClick={closeMenu} state={accountState} to="/account">내 계정</Link>
            </li>
            <li>
              <Link onClick={closeMenu} to="/projects">프로젝트 선택</Link>
            </li>
            <li>
              <button
                className="profile-menu__logout"
                disabled={logoutLoading}
                onClick={handleLogout}
                type="button"
              >
                로그아웃
              </button>
            </li>
          </ul>
        </nav>
      ) : null}

      {!onFeedback ? (
        <span aria-live="polite" className="profile-menu__feedback">{localFeedback}</span>
      ) : null}
    </div>
  );
}
