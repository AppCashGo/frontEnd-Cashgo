import { Download, MessageCircle, Printer, RotateCcw, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { createCustomerCollectionActivity } from '@/modules/customers/services/customers-api'
import { useAuthSessionStore } from '@/modules/auth/hooks/use-auth-session-store'
import { downloadSaleReceipt } from '@/modules/sales/services/sales-api'
import type { SaleReceipt } from '@/modules/sales/types/sale'
import { routePaths } from '@/routes/route-paths'
import { AppButton } from '@/shared/components/ui/AppButton'
import { formatCurrency } from '@/shared/utils/format-currency'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import { normalizeWhatsAppPhone } from '@/shared/utils/normalize-whatsapp-phone'
import {
  downloadPdfBlob,
  openWhatsApp,
  printPdfBlob,
  sharePdfFile,
} from '@/shared/utils/pdf-document-actions'
import styles from './SaleCompletionActions.module.css'

export function SaleCompletionActions({
  sale,
  onRegisterAnother,
  onCorrectSale,
}: {
  sale: SaleReceipt
  onRegisterAnother: () => void
  onCorrectSale?: () => void
}) {
  const businessName = useAuthSessionStore((state) => state.user?.businessName ?? 'CashGo')
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  async function run(action: 'print' | 'download' | 'share') {
    setActiveAction(action)
    setFeedback(null)
    try {
      const { blob, filename } = await downloadSaleReceipt(sale.id)
      const resolvedFilename = filename ?? `${sale.saleNumber}.pdf`
      if (action === 'print') {
        printPdfBlob(blob)
      } else if (action === 'download') {
        downloadPdfBlob(blob, resolvedFilename)
      } else {
        if (!sale.customer?.phone) throw new Error('El cliente no tiene teléfono registrado.')
        const phone = normalizeWhatsAppPhone(sale.customer.phone)
        if (!/^\d{10,15}$/.test(phone)) throw new Error('El teléfono del cliente no tiene un formato válido.')
        const balance = sale.accountReceivable?.balance ?? 0
        const message = `Hola ${sale.customer.name}, te compartimos el comprobante de la venta ${sale.saleNumber} por ${formatCurrency(sale.total)}. Gracias, ${businessName}.`
        const result = await sharePdfFile({ blob, filename: resolvedFilename, title: `Venta ${sale.saleNumber}`, text: message })
        if (sale.accountReceivable) {
          await createCustomerCollectionActivity(sale.accountReceivable.id, {
            type: 'REMINDER',
            channel: 'WHATSAPP',
            notes: balance > 0 ? `${message} Saldo pendiente: ${formatCurrency(balance)}.` : message,
          })
        }
        if (result === 'downloaded') openWhatsApp(phone, message)
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setFeedback(getErrorMessage(error, 'No pudimos preparar el comprobante.'))
      }
    } finally {
      setActiveAction(null)
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.secondary}>
        <AppButton disabled={activeAction !== null && activeAction !== 'print'} isLoading={activeAction === 'print'} loadingLabel="Preparando…" startIcon={<Printer aria-hidden="true" />} variant="secondary" onClick={() => void run('print')}>Imprimir</AppButton>
        <AppButton disabled={activeAction !== null && activeAction !== 'download'} isLoading={activeAction === 'download'} loadingLabel="Descargando…" startIcon={<Download aria-hidden="true" />} variant="secondary" onClick={() => void run('download')}>Descargar</AppButton>
        {sale.customer ? <AppButton disabled={activeAction !== null && activeAction !== 'share'} isLoading={activeAction === 'share'} loadingLabel="Compartiendo…" startIcon={<MessageCircle aria-hidden="true" />} variant="secondary" onClick={() => void run('share')}>Compartir</AppButton> : null}
        {onCorrectSale ? <AppButton startIcon={<Undo2 aria-hidden="true" />} variant="warning" onClick={onCorrectSale}>Corregir o devolver</AppButton> : null}
      </div>
      <div className={styles.primary}>
        <AppButton startIcon={<RotateCcw aria-hidden="true" />} onClick={onRegisterAnother}>Registrar otra venta</AppButton>
        <Link to={routePaths.sales}>Volver al resumen de ventas</Link>
      </div>
      {feedback ? <p role="alert">{feedback}</p> : null}
    </div>
  )
}
