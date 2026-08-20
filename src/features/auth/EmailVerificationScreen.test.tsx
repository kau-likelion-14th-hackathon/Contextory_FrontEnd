/// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EmailVerificationScreen } from "./EmailVerificationScreen";

describe("EmailVerificationScreen", () => {
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

  function render(initialEntry = "/auth/verify-email") {
    act(() => {
      root.render(
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/auth/verify-email" element={<EmailVerificationScreen />} />
          </Routes>
        </MemoryRouter>,
      );
    });
  }

  it("shows unavailable guidance on default access", () => {
    render();

    expect(container.textContent).toContain("이메일 인증 기능 준비 중");
    expect(container.textContent).toContain("현재 이메일 인증 기능을 준비하고 있습니다.");
    expect(container.textContent).toContain("인증 메일 발송 및 확인은 아직 사용할 수 없습니다.");
  });

  it("does not show a real success state for ?status=success", () => {
    render("/auth/verify-email?status=success");

    expect(container.textContent).toContain("이메일 인증 기능 준비 중");
    expect(container.textContent).not.toContain("이메일 인증이 완료되었습니다");
    expect(container.textContent).not.toContain("계정이 활성화되었습니다");
    expect(container.textContent).not.toContain("프로젝트 시작하기");
  });

  it("does not treat ?status=expired as a real server expiry state", () => {
    render("/auth/verify-email?status=expired");

    expect(container.textContent).toContain("이메일 인증 기능 준비 중");
    expect(container.textContent).not.toContain("인증 링크가 만료되었습니다");
    expect(container.textContent).not.toContain("인증 메일 다시 보내기");
  });

  it("does not expose mock email or fake resend actions", () => {
    render("/auth/verify-email?status=pending");

    expect(container.textContent).not.toContain("hong@example.com");
    expect(container.textContent).not.toContain("mock으로 요청했습니다");
    expect(container.textContent).not.toContain("인증 메일 다시 보내기");
    expect(container.querySelector("button")).toBeNull();
  });

  it("keeps links to login and signup", () => {
    render();

    expect(container.querySelector('a[href="/auth/login"]')).not.toBeNull();
    expect(container.querySelector('a[href="/auth/signup"]')).not.toBeNull();
  });
});
