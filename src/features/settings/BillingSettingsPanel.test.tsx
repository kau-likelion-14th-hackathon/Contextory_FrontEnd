/// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  createMemoryRouter,
  RouterProvider,
} from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BillingSettingsPanel } from "./BillingSettingsPanel";
import { TeamProjectSettingsScreen } from "./TeamProjectSettingsScreen";

describe("BillingSettingsPanel", () => {
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
  });

  it("shows coming-soon and example-data guidance", () => {
    act(() => {
      root.render(<BillingSettingsPanel />);
    });

    expect(container.textContent).toContain("결제 기능 준비 중");
    expect(container.textContent).toContain("준비 중");
    expect(container.textContent).toContain("예시 데이터");
    expect(container.textContent).toContain("실제 구독 또는 결제 상태를 의미하지 않습니다.");
  });

  it("does not present fake current subscription state", () => {
    act(() => {
      root.render(<BillingSettingsPanel />);
    });

    expect(container.textContent).not.toContain("현재 구독 정보");
    expect(container.querySelector(".billing-plan-card--current")).toBeNull();
    expect(container.textContent).not.toMatch(/(^|[^가-힣])활성([^가-힣]|$)/);
    expect(container.textContent).not.toContain("12명 · 2명 초과");
    expect(container.textContent).toContain("구독 정보");
    expect(container.textContent).toContain("결제 시스템 연동 준비 중");
    expect(
      Array.from(container.querySelectorAll(".ui-badge"))
        .some((badge) => badge.textContent === "현재 플랜"),
    ).toBe(false);
  });

  it("does not present fake credit balances", () => {
    act(() => {
      root.render(<BillingSettingsPanel />);
    });

    expect(container.textContent).not.toContain("2,340");
    expect(container.textContent).not.toContain("2340");
    expect(container.textContent).not.toContain("660 Credit 사용");
    expect(container.textContent).not.toContain("이번 달 사용량");
    expect(container.textContent).toContain("크레딧 사용량 조회 기능은 준비 중입니다.");
  });

  it("shows plan and credit packs as examples without current-plan badges", () => {
    act(() => {
      root.render(<BillingSettingsPanel />);
    });

    expect(container.textContent).toContain("플랜 예시");
    expect(container.textContent).toContain("추가 크레딧 예시");
    expect(container.textContent).toContain("Free");
    expect(container.textContent).toContain("Team");
    expect(container.textContent).toContain("500 Credit");
    expect(
      Array.from(container.querySelectorAll(".ui-badge"))
        .some((badge) => badge.textContent === "현재 플랜"),
    ).toBe(false);

    const buttons = Array.from(container.querySelectorAll("button"));
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons.every((button) => button.disabled)).toBe(true);
    expect(buttons.every((button) => button.textContent?.includes("준비 중"))).toBe(true);
  });
});

describe("billing tab ignores billingState query", () => {
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
  });

  async function renderBilling(query: string) {
    const router = createMemoryRouter(
      [
        {
          path: "/projects/:projectId/settings",
          element: <TeamProjectSettingsScreen />,
        },
      ],
      { initialEntries: [`/projects/39/settings?tab=billing&${query}`] },
    );

    await act(async () => {
      root.render(<RouterProvider router={router} />);
    });
  }

  it("does not show payment-success fake result", async () => {
    await renderBilling("billingState=payment-success");

    expect(container.textContent).toContain("결제 기능 준비 중");
    expect(container.textContent).not.toContain("결제가 완료되었습니다");
    expect(container.textContent).not.toContain("2,000 Credits 추가 · 결제 금액 $50");
  });

  it("does not show payment-failed fake result", async () => {
    await renderBilling("billingState=payment-failed");

    expect(container.textContent).not.toContain("결제를 완료하지 못했습니다");
    expect(container.textContent).not.toContain("카드 승인 실패");
  });

  it("does not show trial-ended fake result", async () => {
    await renderBilling("billingState=trial-ended");

    expect(container.textContent).not.toContain("Team 무료 체험이 종료되었습니다");
    expect(container.textContent).not.toContain("Free 플랜으로 자동 전환");
    expect(
      Array.from(container.querySelectorAll(".ui-badge"))
        .some((badge) => badge.textContent === "현재 플랜"),
    ).toBe(false);
  });

  it("keeps payment history unavailable", async () => {
    await renderBilling("billingState=payment-success");

    const historyButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.className.includes("billing-settings__history-button"));
    expect(historyButton).toBeTruthy();
    expect(historyButton?.disabled).toBe(true);
    expect(historyButton?.textContent).toContain("준비 중");
  });
});
