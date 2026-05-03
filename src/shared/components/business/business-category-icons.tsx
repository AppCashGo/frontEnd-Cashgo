import type { BusinessCategoryOption } from "@/shared/constants/business-categories";

type BusinessCategoryIconProps = {
  category: BusinessCategoryOption;
  className?: string;
};

type IconShellProps = {
  children: React.ReactNode;
  className?: string;
};

function IconShell({ children, className }: IconShellProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  );
}

function ShirtIcon({ className }: { className?: string }) {
  return (
    <IconShell className={className}>
      <path d="M8 6 10.2 3.5h3.6L16 6l3 1.5-2 4-2-1V20H9v-9.5l-2 1-2-4Z" />
    </IconShell>
  );
}

function UtensilsIcon({ className }: { className?: string }) {
  return (
    <IconShell className={className}>
      <path d="M6 4v7" />
      <path d="M4 4v3a2 2 0 0 0 4 0V4" />
      <path d="M6 11v9" />
      <path d="M15 4v16" />
      <path d="M15 4c2.2 1.1 3.3 3 3.3 5.6H15" />
    </IconShell>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <IconShell className={className}>
      <path d="m12 3 1.4 3.6L17 8l-3.6 1.4L12 13l-1.4-3.6L7 8l3.6-1.4Z" />
      <path d="m6 14 .8 2 .2.2 2 .8-2 .8-.2.2-.8 2-.8-2-.2-.2-2-.8 2-.8.2-.2Z" />
      <path d="m18 13 .6 1.5.2.2 1.5.6-1.5.6-.2.2-.6 1.5-.6-1.5-.2-.2-1.5-.6 1.5-.6.2-.2Z" />
    </IconShell>
  );
}

function StoreIcon({ className }: { className?: string }) {
  return (
    <IconShell className={className}>
      <path d="M4 9h16" />
      <path d="M5 9 6.5 4h11L19 9" />
      <path d="M6 9v10h12V9" />
      <path d="M9 13h6" />
    </IconShell>
  );
}

function MonitorIcon({ className }: { className?: string }) {
  return (
    <IconShell className={className}>
      <rect height="11" rx="2" width="16" x="4" y="4" />
      <path d="M9 20h6" />
      <path d="M12 15v5" />
    </IconShell>
  );
}

function FactoryIcon({ className }: { className?: string }) {
  return (
    <IconShell className={className}>
      <path d="M4 20V9l5 3V9l5 3V4h4v16Z" />
      <path d="M8 20v-4" />
      <path d="M12 20v-3" />
      <path d="M16 20v-5" />
    </IconShell>
  );
}

function PillIcon({ className }: { className?: string }) {
  return (
    <IconShell className={className}>
      <path d="M8.5 5.5a4 4 0 0 1 5.7 0l2.3 2.3a4 4 0 0 1 0 5.7l-2.3 2.3a4 4 0 0 1-5.7 0l-2.3-2.3a4 4 0 0 1 0-5.7Z" />
      <path d="m8.5 15.5 7-7" />
    </IconShell>
  );
}

function PawIcon({ className }: { className?: string }) {
  return (
    <IconShell className={className}>
      <circle cx="7.5" cy="8" r="1.5" />
      <circle cx="12" cy="6.5" r="1.5" />
      <circle cx="16.5" cy="8" r="1.5" />
      <path d="M12 19c3 0 5-1.8 5-4.2 0-2-1.4-3.3-3.2-3.3-1 0-1.5.4-1.8.9-.3-.5-.8-.9-1.8-.9C8.4 11.4 7 12.7 7 14.8 7 17.2 9 19 12 19Z" />
    </IconShell>
  );
}

function ToolIcon({ className }: { className?: string }) {
  return (
    <IconShell className={className}>
      <path d="m14 5 5 5" />
      <path d="m13 6 2-2a2.8 2.8 0 0 1 4 4l-2 2" />
      <path d="m4 20 7-7" />
      <path d="m9 20-5-5 5-5 5 5Z" />
    </IconShell>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <IconShell className={className}>
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21.5Z" />
      <path d="M5 5.5v16" />
      <path d="M9 7h6" />
      <path d="M9 11h6" />
    </IconShell>
  );
}

function BottleIcon({ className }: { className?: string }) {
  return (
    <IconShell className={className}>
      <path d="M10 3h4" />
      <path d="M11 3v4l-3 3.5V19a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-8.5L13 7V3" />
      <path d="M8 12h8" />
    </IconShell>
  );
}

function SuitcaseIcon({ className }: { className?: string }) {
  return (
    <IconShell className={className}>
      <rect height="13" rx="2" width="16" x="4" y="7" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M4 12h16" />
    </IconShell>
  );
}

function CupIcon({ className }: { className?: string }) {
  return (
    <IconShell className={className}>
      <path d="M5 7h10v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Z" />
      <path d="M15 9h2a2 2 0 0 1 0 4h-2" />
      <path d="M8 3c1 1 .7 2 .1 3" />
      <path d="M11 3c1 1 .7 2 .1 3" />
    </IconShell>
  );
}

function GlassIcon({ className }: { className?: string }) {
  return (
    <IconShell className={className}>
      <path d="M7 4h10l-3 7v5l2 4H8l2-4v-5Z" />
      <path d="M8 8h8" />
    </IconShell>
  );
}

function TruckIcon({ className }: { className?: string }) {
  return (
    <IconShell className={className}>
      <path d="M3 7h11v8H3Z" />
      <path d="M14 10h3l3 3v2h-6" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </IconShell>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <IconShell className={className}>
      <path d="m4 11 8-6 8 6" />
      <path d="M6 10.5V20h12v-9.5" />
      <path d="M10 20v-5h4v5" />
    </IconShell>
  );
}

function BreadIcon({ className }: { className?: string }) {
  return (
    <IconShell className={className}>
      <path d="M7 8a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4 3.5 3.5 0 0 1 2 3.2A4.8 4.8 0 0 1 14.2 16H7.8A4.8 4.8 0 0 1 3 11.2 3.5 3.5 0 0 1 5 8Z" />
      <path d="M9 8v1.2" />
      <path d="M12 7.4V9" />
      <path d="M15 8v1.2" />
    </IconShell>
  );
}

function MegaphoneIcon({ className }: { className?: string }) {
  return (
    <IconShell className={className}>
      <path d="M4 12h3l8-4v8l-8-4H4Z" />
      <path d="M7 12v5a2 2 0 0 0 2 2" />
      <path d="M17 10.5a3 3 0 0 1 0 3" />
    </IconShell>
  );
}

function DumbbellIcon({ className }: { className?: string }) {
  return (
    <IconShell className={className}>
      <path d="M4 9v6" />
      <path d="M7 8v8" />
      <path d="M17 8v8" />
      <path d="M20 9v6" />
      <path d="M7 12h10" />
    </IconShell>
  );
}

function ScissorsIcon({ className }: { className?: string }) {
  return (
    <IconShell className={className}>
      <circle cx="7" cy="7" r="2.2" />
      <circle cx="7" cy="17" r="2.2" />
      <path d="m9 8.2 9-5.2" />
      <path d="m9 15.8 9 5.2" />
    </IconShell>
  );
}

function CoinsIcon({ className }: { className?: string }) {
  return (
    <IconShell className={className}>
      <ellipse cx="12" cy="7" rx="5" ry="2.5" />
      <path d="M7 7v6c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V7" />
      <path d="M7 10c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5" />
    </IconShell>
  );
}

function LeafIcon({ className }: { className?: string }) {
  return (
    <IconShell className={className}>
      <path d="M18 6c-5 0-9 2.7-10.8 7.2C6.4 15.3 6 17.4 6 20c2.6 0 4.7-.4 6.8-1.2C17.3 17 20 13 20 8V6Z" />
      <path d="M9 15c1.2-1.5 2.8-2.7 5-3.8" />
    </IconShell>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <IconShell className={className}>
      <path d="m12 4 2.5 5.1 5.5.8-4 3.9.9 5.5L12 16.6 7.1 19.3l.9-5.5-4-3.9 5.5-.8Z" />
    </IconShell>
  );
}

function CarIcon({ className }: { className?: string }) {
  return (
    <IconShell className={className}>
      <path d="M5 15h14l-1.5-5H6.5Z" />
      <path d="M7 10 9 6h6l2 4" />
      <circle cx="8" cy="17" r="2" />
      <circle cx="16" cy="17" r="2" />
    </IconShell>
  );
}

function GemIcon({ className }: { className?: string }) {
  return (
    <IconShell className={className}>
      <path d="m7 5 2-2h6l2 2 3 4-8 11L4 9Z" />
      <path d="M9 3 7 9h10l-2-6" />
      <path d="m12 9 0 11" />
    </IconShell>
  );
}

function PackageIcon({ className }: { className?: string }) {
  return (
    <IconShell className={className}>
      <path d="m4 7 8-4 8 4-8 4Z" />
      <path d="M4 7v10l8 4 8-4V7" />
      <path d="M12 11v10" />
    </IconShell>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <IconShell className={className}>
      <rect height="5" rx="1" width="5" x="4" y="4" />
      <rect height="5" rx="1" width="5" x="15" y="4" />
      <rect height="5" rx="1" width="5" x="4" y="15" />
      <rect height="5" rx="1" width="5" x="15" y="15" />
    </IconShell>
  );
}

export function BusinessCategoryIcon({
  category,
  className,
}: BusinessCategoryIconProps) {
  switch (category) {
    case "clothing_footwear":
      return <ShirtIcon className={className} />;
    case "restaurant_fast_food":
      return <UtensilsIcon className={className} />;
    case "beauty":
    case "beauty_health":
      return <SparklesIcon className={className} />;
    case "corner_store":
    case "minimarket":
    case "wholesale_distributor":
    case "gift_store":
      return <StoreIcon className={className} />;
    case "electronics_it":
      return <MonitorIcon className={className} />;
    case "industry_manufacturing":
      return <FactoryIcon className={className} />;
    case "pharmacy_drugstore":
      return <PillIcon className={className} />;
    case "pet_store_vet":
      return <PawIcon className={className} />;
    case "hardware_construction":
    case "repairs_maintenance":
      return <ToolIcon className={className} />;
    case "stationery_books":
    case "educational_services":
      return <BookIcon className={className} />;
    case "liquor_store":
      return <BottleIcon className={className} />;
    case "hotels_tourism":
      return <SuitcaseIcon className={className} />;
    case "coffee_shop":
      return <CupIcon className={className} />;
    case "bar":
      return <GlassIcon className={className} />;
    case "transport_logistics":
      return <TruckIcon className={className} />;
    case "home_goods":
      return <HomeIcon className={className} />;
    case "bakery_pastry":
      return <BreadIcon className={className} />;
    case "auto_repair_workshop":
      return <ToolIcon className={className} />;
    case "marketing_advertising":
    case "event_planning":
      return <MegaphoneIcon className={className} />;
    case "sporting_goods":
    case "gym":
      return <DumbbellIcon className={className} />;
    case "tattoos_piercings":
    case "barbershop_beauty_salon":
      return <ScissorsIcon className={className} />;
    case "lending_financing":
      return <CoinsIcon className={className} />;
    case "natural_store_supplements":
    case "agricultural_supplies":
      return <LeafIcon className={className} />;
    case "entertainment_leisure":
      return <StarIcon className={className} />;
    case "auto_sales":
    case "auto_parts_accessories":
      return <CarIcon className={className} />;
    case "butcher_shop":
    case "deli_charcuterie":
      return <PackageIcon className={className} />;
    case "accessories_jewelry":
      return <GemIcon className={className} />;
    default:
      return <GridIcon className={className} />;
  }
}
