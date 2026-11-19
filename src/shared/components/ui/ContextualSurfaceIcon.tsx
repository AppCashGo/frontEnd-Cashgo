import {
  ArrowLeftRight,
  Boxes,
  BriefcaseBusiness,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Landmark,
  PackageSearch,
  PanelRightOpen,
  ReceiptText,
  Settings2,
  Tags,
  Truck,
  UploadCloud,
  UserRound,
  UsersRound,
  WalletCards,
} from 'lucide-react'

type ContextualSurfaceIconProps = {
  label?: string
}

export function ContextualSurfaceIcon({ label = '' }: ContextualSurfaceIconProps) {
  const normalizedLabel = label.toLocaleLowerCase('es')

  if (/venta|sale|comprobante/.test(normalizedLabel)) return <ReceiptText aria-hidden="true" />
  if (/inventario|existencia|stock/.test(normalizedLabel)) return <Boxes aria-hidden="true" />
  if (/producto|artículo/.test(normalizedLabel)) return <PackageSearch aria-hidden="true" />
  if (/cliente|customer/.test(normalizedLabel)) return <UserRound aria-hidden="true" />
  if (/proveedor|supplier/.test(normalizedLabel)) return <Truck aria-hidden="true" />
  if (/empleado|equipo|usuario/.test(normalizedLabel)) return <UsersRound aria-hidden="true" />
  if (/caja|pago|abono|cartera/.test(normalizedLabel)) return <WalletCards aria-hidden="true" />
  if (/gasto|egreso|expense/.test(normalizedLabel)) return <Landmark aria-hidden="true" />
  if (/factur|invoice/.test(normalizedLabel)) return <FileCheck2 aria-hidden="true" />
  if (/cotización|cotizacion|quote/.test(normalizedLabel)) return <FileText aria-hidden="true" />
  if (/categoría|categoria/.test(normalizedLabel)) return <Tags aria-hidden="true" />
  if (/conteo|auditoría|auditoria/.test(normalizedLabel)) return <ClipboardCheck aria-hidden="true" />
  if (/movimiento|transacción|transaccion/.test(normalizedLabel)) return <ArrowLeftRight aria-hidden="true" />
  if (/domicilio|entrega|pedido/.test(normalizedLabel)) return <Truck aria-hidden="true" />
  if (/importar|carga masiva|archivo/.test(normalizedLabel)) return <UploadCloud aria-hidden="true" />
  if (/configuración|configuracion|ajuste/.test(normalizedLabel)) return <Settings2 aria-hidden="true" />
  if (/negocio|empresa/.test(normalizedLabel)) return <BriefcaseBusiness aria-hidden="true" />
  return <PanelRightOpen aria-hidden="true" />
}
