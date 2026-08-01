import {
  ArrowUpDown,
  Banknote,
  BookOpen,
  Boxes,
  ChartColumnIncreasing,
  CircleHelp,
  FileText,
  Gem,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  ScrollText,
  Settings,
  Shield,
  Tags,
  Truck,
  UserRoundPlus,
  UsersRound,
  Wallet,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

export type AppIconName =
  | "billing"
  | "cash"
  | "customers"
  | "dashboard"
  | "deliveries"
  | "employees"
  | "expenses"
  | "help"
  | "inventory"
  | "learn"
  | "logout"
  | "menu"
  | "money"
  | "movements"
  | "panelClose"
  | "panelOpen"
  | "privacy"
  | "products"
  | "quotes"
  | "reports"
  | "sales"
  | "settings"
  | "suppliers"
  | "terms";

type AppIconProps = LucideProps & {
  name: AppIconName;
};

const iconMap: Record<AppIconName, LucideIcon> = {
  billing: ReceiptText,
  cash: Banknote,
  customers: UserRoundPlus,
  dashboard: LayoutDashboard,
  deliveries: Truck,
  employees: UsersRound,
  expenses: Wallet,
  help: CircleHelp,
  inventory: Boxes,
  learn: BookOpen,
  logout: LogOut,
  menu: Menu,
  money: Banknote,
  movements: ArrowUpDown,
  panelClose: PanelLeftClose,
  panelOpen: PanelLeftOpen,
  privacy: Shield,
  products: Gem,
  quotes: ScrollText,
  reports: ChartColumnIncreasing,
  sales: Tags,
  settings: Settings,
  suppliers: Truck,
  terms: FileText,
};

export function AppIcon({ name, ...props }: AppIconProps) {
  const Icon = iconMap[name];

  return <Icon aria-hidden="true" strokeWidth={1.9} {...props} />;
}
