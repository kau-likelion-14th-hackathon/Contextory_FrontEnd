/// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { Modal } from "./Modal";

function Harness() {
  const [open, setOpen] = useState(true);
  const [value, setValue] = useState("");

  return (
    <>
      <button id="outside-trigger" type="button">Outside</button>
      <Modal
        onClose={() => setOpen(false)}
        open={open}
        title="Test modal"
      >
        <input
          id="modal-input"
          onChange={(event) => setValue(event.target.value)}
          value={value}
        />
      </Modal>
    </>
  );
}

describe("Modal focus lifecycle", () => {
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

  it("sets initial focus when opened", async () => {
    await act(async () => {
      root.render(<Harness />);
    });

    const closeButton = document.querySelector(".modal__header .ui-button");
    expect(closeButton).toBeTruthy();
    expect(document.activeElement).toBe(closeButton);
  });

  it("keeps focus on the active input when parent rerenders with a new onClose", async () => {
    await act(async () => {
      root.render(<Harness />);
    });

    const input = document.getElementById("modal-input") as HTMLInputElement;
    await act(async () => {
      input.focus();
    });

    expect(document.activeElement).toBe(input);

    await act(async () => {
      root.render(<Harness />);
    });

    expect(document.activeElement).toBe(input);
  });

  it("keeps focus on the active input when typing changes parent state", async () => {
    await act(async () => {
      root.render(<Harness />);
    });

    const input = document.getElementById("modal-input") as HTMLInputElement;
    await act(async () => {
      input.focus();
      input.value = "a";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    // React 19 controlled input - need to use native input value setter + input event
    // or click and use userEvent. Use React's change via act:
    await act(async () => {
      const currentInput = document.getElementById("modal-input") as HTMLInputElement;
      currentInput.focus();
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      nativeInputValueSetter?.call(currentInput, "a");
      currentInput.dispatchEvent(new Event("input", { bubbles: true }));
      currentInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    // Force rerender path through React onChange
    await act(async () => {
      root.render(<Harness />);
      const currentInput = document.getElementById("modal-input") as HTMLInputElement;
      currentInput.focus();
    });

    expect(document.activeElement).toBe(document.getElementById("modal-input"));
  });

  it("calls the latest onClose when Escape is pressed", async () => {
    const firstClose = vi.fn();
    const latestClose = vi.fn();

    await act(async () => {
      root.render(
        <Modal onClose={firstClose} open title="Escape test">
          <input id="modal-input" />
        </Modal>,
      );
    });

    await act(async () => {
      root.render(
        <Modal onClose={latestClose} open title="Escape test">
          <input id="modal-input" />
        </Modal>,
      );
    });

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(firstClose).not.toHaveBeenCalled();
    expect(latestClose).toHaveBeenCalledTimes(1);
  });

  it("restores focus to the previously focused element when closed", async () => {
    function ToggleModal() {
      const [open, setOpen] = useState(false);

      return (
        <>
          <button id="outside-trigger" type="button">Outside</button>
          <Modal onClose={() => setOpen(false)} open={open} title="Test modal">
            <input id="modal-input" />
          </Modal>
          <button id="open-modal" onClick={() => setOpen(true)} type="button">Open</button>
        </>
      );
    }

    await act(async () => {
      root.render(<ToggleModal />);
    });

    const outside = document.getElementById("outside-trigger") as HTMLButtonElement;
    const openButton = document.getElementById("open-modal") as HTMLButtonElement;

    await act(async () => {
      outside.focus();
      openButton.click();
    });

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(document.activeElement).toBe(outside);
  });
});
