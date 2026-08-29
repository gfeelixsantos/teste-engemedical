"use client";

import { getVisibleSettingsItems } from "./settings-navigation.mjs";
import { SectionId } from "./types";

interface SettingsSidebarProps {
  activeSection: SectionId;
  onSectionChange: (section: SectionId) => void;
  userPerfil?: string;
}

export function SettingsSidebar({
  activeSection,
  onSectionChange,
  userPerfil,
}: SettingsSidebarProps) {
  const visibleItems = getVisibleSettingsItems(userPerfil);

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    id: SectionId,
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSectionChange(id);
    }
  }

  return (
    <>
      <nav
        role="navigation"
        aria-label="Navegação de configurações"
        className="hidden md:flex"
      >
        <aside className="flex flex-col w-64 gap-1 py-2">
          {visibleItems.map(({ id, label, icon: Icon }) => {
            const isActive = id === activeSection;
            return (
              <button
                key={id}
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => onSectionChange(id as SectionId)}
                onKeyDown={(e) => handleKeyDown(e, id as SectionId)}
                className={[
                  "flex items-center gap-3 w-full px-4 py-2.5 rounded-md text-sm font-medium text-left transition-colors cursor-pointer",
                  isActive
                    ? "bg-[#44735e] text-white"
                    : "text-gray-700 hover:bg-gray-100",
                ].join(" ")}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </aside>
      </nav>

      <nav
        role="navigation"
        aria-label="Navegação de configurações"
        className="flex md:hidden overflow-x-auto border-b border-gray-200"
      >
        <div className="flex gap-1 px-2 py-2 min-w-max">
          {visibleItems.map(({ id, label, icon: Icon }) => {
            const isActive = id === activeSection;
            return (
              <button
                key={id}
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => onSectionChange(id as SectionId)}
                onKeyDown={(e) => handleKeyDown(e, id as SectionId)}
                className={[
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors cursor-pointer",
                  isActive
                    ? "bg-[#44735e] text-white"
                    : "text-gray-700 hover:bg-gray-100",
                ].join(" ")}
              >
                <Icon size={16} aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
