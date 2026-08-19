/// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PullRequestBodyMarkdown } from "./PullRequestBodyMarkdown";

const originalScrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollHeight");

function mockMarkdownScrollHeight(height: number) {
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    get(this: HTMLElement) {
      if (this.classList.contains("pull-request-review__markdown")) {
        return height;
      }
      return originalScrollHeight?.get?.call(this) ?? 0;
    },
  });
}

function restoreScrollHeight() {
  if (originalScrollHeight) {
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", originalScrollHeight);
  }
}

describe("PullRequestBodyMarkdown", () => {
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
    restoreScrollHeight();
  });

  it("renders common markdown elements", async () => {
    await act(async () => {
      root.render(
        <PullRequestBodyMarkdown
          body={[
            "## Heading",
            "",
            "Paragraph with `inline code`.",
            "",
            "- item",
            "1. ordered",
            "",
            "> quote",
            "",
            "~~strike~~",
            "",
            "```",
            "const x = 1;",
            "```",
            "",
            "![alt text](https://example.com/image.png)",
          ].join("\n")}
        />,
      );
    });

    expect(container.querySelector("h2")?.textContent).toBe("Heading");
    expect(container.querySelector("p")?.textContent).toContain("Paragraph with");
    expect(container.querySelector("code")?.textContent).toBe("inline code");
    expect(container.querySelector("ul")).toBeTruthy();
    expect(container.querySelector("ol")).toBeTruthy();
    expect(container.querySelector("blockquote")?.textContent).toContain("quote");
    expect(container.querySelector("del")?.textContent).toBe("strike");
    expect(container.querySelector("pre code")?.textContent).toContain("const x = 1;");
    expect(container.querySelector("img")?.getAttribute("alt")).toBe("alt text");
    expect(container.querySelector("img")?.getAttribute("src")).toBe("https://example.com/image.png");
  });

  it("renders GFM task lists and tables", async () => {
    await act(async () => {
      root.render(
        <PullRequestBodyMarkdown
          body={[
            "- [x] done",
            "- [ ] todo",
            "",
            "| A | B |",
            "| --- | --- |",
            "| 1 | 2 |",
          ].join("\n")}
        />,
      );
    });

    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(2);
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(true);
    expect((checkboxes[1] as HTMLInputElement).checked).toBe(false);

    expect(container.querySelector("table")).toBeTruthy();
    expect(container.querySelector("th")?.textContent).toBe("A");
    expect(container.querySelector("td")?.textContent).toBe("1");
  });

  it("opens links in a new tab with safe rel", async () => {
    await act(async () => {
      root.render(
        <PullRequestBodyMarkdown body="See [docs](https://example.com/docs)." />,
      );
    });

    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe("https://example.com/docs");
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("shows fallback copy for empty body", async () => {
    await act(async () => {
      root.render(<PullRequestBodyMarkdown body={"   \n\t  "} />);
    });

    expect(container.textContent).toBe("PR 설명이 없습니다.");
    expect(container.querySelector(".pull-request-review__markdown")).toBeNull();
  });

  it("hides expand control for short body", async () => {
    mockMarkdownScrollHeight(120);

    await act(async () => {
      root.render(<PullRequestBodyMarkdown body="짧은 설명" />);
    });

    expect(container.querySelector(".pull-request-review__markdown-toggle")).toBeNull();
    expect(container.querySelector(".pull-request-review__markdown--collapsed")).toBeTruthy();
  });

  it("shows expand control for long body and expands on click", async () => {
    mockMarkdownScrollHeight(480);
    const longBody = "긴 설명\n\n".repeat(40);

    await act(async () => {
      root.render(<PullRequestBodyMarkdown body={longBody} />);
    });

    const toggle = container.querySelector(".pull-request-review__markdown-toggle") as HTMLButtonElement;
    expect(toggle).toBeTruthy();
    expect(toggle.textContent).toBe("더 보기");
    expect(container.querySelector(".pull-request-review__markdown--collapsed")).toBeTruthy();

    await act(async () => {
      toggle.click();
    });

    expect(toggle.textContent).toBe("접기");
    expect(container.querySelector(".pull-request-review__markdown--collapsed")).toBeNull();
  });

  it("resets expanded state when PR body changes", async () => {
    mockMarkdownScrollHeight(480);
    const longBody = "긴 설명\n\n".repeat(40);

    await act(async () => {
      root.render(<PullRequestBodyMarkdown body={longBody} />);
    });

    const toggle = container.querySelector(".pull-request-review__markdown-toggle") as HTMLButtonElement;
    await act(async () => {
      toggle.click();
    });
    expect(toggle.textContent).toBe("접기");

    const nextBody = `${longBody}\n추가 내용`;
    await act(async () => {
      root.render(<PullRequestBodyMarkdown body={nextBody} />);
    });

    const nextToggle = container.querySelector(".pull-request-review__markdown-toggle") as HTMLButtonElement;
    expect(nextToggle.textContent).toBe("더 보기");
    expect(container.querySelector(".pull-request-review__markdown--collapsed")).toBeTruthy();
  });
});
