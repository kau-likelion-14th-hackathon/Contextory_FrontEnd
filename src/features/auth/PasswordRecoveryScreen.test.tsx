/// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PasswordRecoveryScreen } from "./PasswordRecoveryScreen";

describe("PasswordRecoveryScreen", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    document.body.innerHTML = "";
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  function render(mode: "request" | "reset") {
    act(() => {
      root.render(
        <MemoryRouter>
          <PasswordRecoveryScreen mode={mode} />
        </MemoryRouter>,
      );
    });
  }

  it("shows unavailable guidance for forgot-password request mode", () => {
    render("request");

    expect(container.textContent).toContain("비밀번호 찾기");
    expect(container.textContent).toContain("비밀번호 재설정 기능을 준비하고 있습니다.");
    expect(container.textContent).toContain("현재는 비밀번호 재설정 메일을 발송할 수 없습니다.");
  });

  it("does not expose a submit form or fake API controls in request mode", () => {
    const setTimeoutSpy = vi.spyOn(window, "setTimeout");
    render("request");

    expect(container.querySelector("form")).toBeNull();
    expect(container.querySelector('button[type="submit"]')).toBeNull();
    expect(container.textContent).not.toContain("재설정 링크 보내기");
    expect(setTimeoutSpy).not.toHaveBeenCalled();
  });

  it("does not show mock verified email in request mode", () => {
    render("request");
    expect(container.textContent).not.toContain("hong@example.com");
  });

  it("shows unavailable guidance for reset mode without verified state", () => {
    render("reset");

    expect(container.textContent).toContain("비밀번호 재설정 기능 준비 중");
    expect(container.textContent).toContain("현재 재설정 링크를 통한 비밀번호 변경은 지원하지 않습니다.");
    expect(container.textContent).not.toContain("인증 완료");
    expect(container.textContent).not.toContain("hong@example.com");
  });

  it("does not expose a password change submit in reset mode", () => {
    render("reset");

    expect(container.querySelector("form")).toBeNull();
    expect(container.querySelector('button[type="submit"]')).toBeNull();
    expect(container.querySelector("button")).toBeNull();
    expect(container.querySelector('input[type="password"]')).toBeNull();
  });

  it("keeps a link back to login", () => {
    render("request");
    const loginLink = container.querySelector('a[href="/auth/login"]');
    expect(loginLink).not.toBeNull();
    expect(loginLink?.textContent).toContain("로그인으로 돌아가기");
  });
});
