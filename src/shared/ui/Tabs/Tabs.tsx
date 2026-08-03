import type { KeyboardEvent } from "react";
import "./Tabs.css";

export type TabItem = {
  id: string;
  label: string;
  disabled?: boolean;
};

export type TabsProps = {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  ariaLabel: string;
};

export function Tabs({ tabs, activeTab, onChange, ariaLabel }: TabsProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, tabId: string) {
    const enabledTabs = tabs.filter((tab) => !tab.disabled);
    const currentIndex = enabledTabs.findIndex((tab) => tab.id === tabId);

    if (enabledTabs.length === 0 || currentIndex < 0) {
      return;
    }

    if (
      event.key !== "ArrowRight" &&
      event.key !== "ArrowLeft" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }

    event.preventDefault();
    let nextIndex = currentIndex;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % enabledTabs.length;
    }

    if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + enabledTabs.length) % enabledTabs.length;
    }

    if (event.key === "Home") {
      nextIndex = 0;
    }

    if (event.key === "End") {
      nextIndex = enabledTabs.length - 1;
    }

    onChange(enabledTabs[nextIndex].id);
  }

  return (
    <div className="tabs" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <button
          aria-selected={activeTab === tab.id}
          className={activeTab === tab.id ? "tabs__tab tabs__tab--active" : "tabs__tab"}
          disabled={tab.disabled}
          key={tab.id}
          onKeyDown={(event) => handleKeyDown(event, tab.id)}
          onClick={() => onChange(tab.id)}
          role="tab"
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
