import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { bootstrapAuthSession } from "../auth/authApi";
import {
  hasAuthenticatedSession,
  subscribeToSession,
} from "../../shared/api/session";

type AuthStatus = "checking" | "authenticated" | "unauthenticated";

export function AuthBoundary() {
  const location = useLocation();
  const [status, setStatus] = useState<AuthStatus>(() =>
    hasAuthenticatedSession() ? "authenticated" : "checking",
  );

  useEffect(() => {
    let active = true;
    let bootstrapping = true;

    const unsubscribe = subscribeToSession(() => {
      if (!active) return;
      if (hasAuthenticatedSession()) {
        setStatus("authenticated");
        return;
      }
      // cold-start bootstrap 중 token-only 상태를 unauthenticated로 만들지 않는다.
      if (!bootstrapping) setStatus("unauthenticated");
    });

    void bootstrapAuthSession().then((next) => {
      bootstrapping = false;
      if (active) setStatus(next);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  if (status === "checking") {
    return <main aria-live="polite" role="status">인증 상태를 확인하고 있습니다.</main>;
  }

  if (status === "unauthenticated") {
    return (
      <Navigate
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
        to="/auth/login"
      />
    );
  }

  return <Outlet />;
}

export function ProjectBoundary() {
  return <Outlet />;
}
