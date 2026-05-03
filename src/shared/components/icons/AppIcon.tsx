import type { SVGProps } from "react";

export type AppIconName =
  | "billing"
  | "cash"
  | "customers"
  | "dashboard"
  | "deliveries"
  | "employees"
  | "expenses"
  | "inventory"
  | "menu"
  | "money"
  | "panelClose"
  | "panelOpen"
  | "products"
  | "quotes"
  | "reports"
  | "sales"
  | "settings"
  | "suppliers";

type AppIconProps = SVGProps<SVGSVGElement> & {
  name: AppIconName;
};

function renderIconPath(name: AppIconName) {
  switch (name) {
    case "dashboard":
      return <path d="M4 13h6v7H4zM14 4h6v16h-6zM4 4h6v5H4z" />;
    case "sales":
      return <path d="M7 7h10l3 5-8 8-8-8 3-5zM9 7l3 13M15 7l-3 13" />;
    case "deliveries":
      return <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7zM7 18a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM18 18a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />;
    case "cash":
    case "money":
      return (
        <>
          <path d="M4 7h16v10H4zM8 12h8M12 9v6" />
          <circle cx="12" cy="12" r="2.5" />
        </>
      );
    case "billing":
      return <path d="M7 3h10v18l-2-1-2 1-2-1-2 1-2-1zM9 8h6M9 12h6M9 16h4" />;
    case "quotes":
      return <path d="M7 4h10v16H7zM9 8h6M9 12h6M9 16h4M5 8h2M5 12h2M5 16h2" />;
    case "reports":
      return <path d="M5 19V9M12 19V5M19 19v-8M3 19h18" />;
    case "inventory":
      return <path d="M4 7 12 3l8 4-8 4-8-4ZM4 7v10l8 4 8-4V7M8 9l8 4" />;
    case "products":
      return <path d="M7 5h10l2 4-7 11L5 9l2-4ZM9 9h6" />;
    case "expenses":
      return <path d="M4 7h16v10H4zM8 12h8M12 9v6" />;
    case "employees":
      return <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM17 12a2.5 2.5 0 1 0 0-5M4 19a5 5 0 0 1 10 0M14 19a4 4 0 0 1 6 0" />;
    case "customers":
      return <path d="M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM5 20a7 7 0 0 1 14 0M18.5 8.5h3M20 7v3" />;
    case "suppliers":
      return <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7zM7 18a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM18 18a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />;
    case "settings":
      return <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM4 13v-2l2.3-.6.7-1.7-1.2-2 1.4-1.4 2 1.2 1.7-.7L11 4h2l.6 2.3 1.7.7 2-1.2 1.4 1.4-1.2 2 .7 1.7L20 11v2l-2.3.6-.7 1.7 1.2 2-1.4 1.4-2-1.2-1.7.7L13 20h-2l-.6-2.3-1.7-.7-2 1.2-1.4-1.4 1.2-2-.7-1.7z" />;
    case "menu":
      return <path d="M4 7h16M4 12h16M4 17h16" />;
    case "panelOpen":
      return <path d="M4 5h16v14H4zM9 5v14M14 9l3 3-3 3" />;
    case "panelClose":
      return <path d="M4 5h16v14H4zM9 5v14M17 9l-3 3 3 3" />;
    default:
      return null;
  }
}

export function AppIcon({ name, ...props }: AppIconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
      viewBox="0 0 24 24"
      {...props}
    >
      {renderIconPath(name)}
    </svg>
  );
}
