import { Outlet } from "react-router-dom";

export function AuthBoundary() {
  return <Outlet />;
}

export function ProjectBoundary() {
  return <Outlet />;
}
