import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { reissue } from "../auth/authApi";
import {
  getAccessToken,
  subscribeToSession,
} from "../../shared/api/session";

type AuthStatus = "checking" | "authenticated" | "unauthenticated";

export function AuthBoundary() {
  const location = useLocation();
  const [status, setStatus] = useState<AuthStatus>(() =>
    getAccessToken() ? "authenticated" : "checking",
  );

  useEffect(() => {
    let active = true;

    const syncStatus = () => {
      if (active) setStatus(getAccessToken() ? "authenticated" : "unauthenticated");
    };
    const unsubscribe = subscribeToSession(syncStatus);

    if (!getAccessToken()) {
      reissue()
        .then(() => {
          if (active) setStatus("authenticated");
        })
        .catch(() => {
          if (active) setStatus("unauthenticated");
        });
    }

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
