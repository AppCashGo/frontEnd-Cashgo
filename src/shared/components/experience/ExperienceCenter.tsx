import {
  ArrowRight,
  Bell,
  Bot,
  Camera,
  Check,
  CheckCircle2,
  CircleHelp,
  Clock3,
  HandCoins,
  LoaderCircle,
  MessageCircleMore,
  Package,
  PackagePlus,
  Pencil,
  RefreshCw,
  ReceiptText,
  Send,
  ShoppingCart,
  Trash2,
  TriangleAlert,
  UserRoundPlus,
  X,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useDashboardSummaryQuery } from '@/modules/dashboard/hooks/use-dashboard-summary-query'
import { resolveProductImageUrl } from '@/modules/products/utils/resolve-product-image-url'
import { routePaths } from '@/routes/route-paths'
import { AppDrawer } from '@/shared/components/ui/AppDrawer'
import { AppButton } from '@/shared/components/ui/AppButton'
import { getApiErrorMessage } from '@/shared/services/api-client'
import { joinClassNames } from '@/shared/utils/join-class-names'
import { formatCurrency } from '@/shared/utils/format-currency'
import { confirmAssistantAction, analyzePurchaseInvoice, sendAssistantMessage, type AssistantProductPreview, type AssistantPendingAction } from './assistant-api'
import styles from './ExperienceCenter.module.css'

type CenterView = 'activity' | 'assistant' | null

type ActivityItem = {
  actionLabel: string
  description: string
  icon: React.ReactNode
  id: string
  path: string
  title: string
  tone: 'danger' | 'info' | 'success' | 'warning'
}

type AssistantMessage = {
  id: string
  role: 'assistant' | 'user'
  text: string
  action?: AssistantPendingAction & {
    status: 'cancelled' | 'completed' | 'executing' | 'pending'
  }
  products?: AssistantProductPreview[]
  attachment?: {
    name: string
    previewUrl: string
  }
}

function cleanAssistantText(text: string) {
  return text.replace(/\*\*/g, '')
}

function ProductPreviewList({ products, mode = 'sale' }: { products: AssistantProductPreview[]; mode?: 'purchase' | 'sale' }) {
  return (
    <div className={styles.productPreviews}>
      {products.map((product) => {
        const imageUrl = resolveProductImageUrl(product.imageUrl ? [product.imageUrl] : null)
        return (
          <article className={styles.productPreview} key={product.id}>
            <div className={styles.productPreviewImage}>{imageUrl ? <img alt="" src={imageUrl} /> : <Package aria-hidden="true" />}</div>
            <div className={styles.productPreviewContent}>
              <strong>{product.name}</strong>
              <span>
                {product.quantity ? `${product.quantity} × ${formatCurrency(product.price)}${mode === 'purchase' ? ' costo unitario' : ''}` : formatCurrency(product.price)}
              </span>
              <small>{product.quantity ? `Subtotal ${formatCurrency(product.lineTotal ?? product.price * product.quantity)}` : `${product.stock} disponibles`}</small>
            </div>
          </article>
        )
      })}
    </div>
  )
}

const initialMessages: AssistantMessage[] = [
  {
    id: 'welcome',
    role: 'assistant',
    text: 'Hola. Puedo consultar tu inventario, preparar ventas y registrar compras leyendo una foto de la factura. Antes de modificar información siempre te pediré confirmación.',
  },
]

const quickQuestions = ['¿Qué productos están agotados?', '¿Cuáles tienen stock bajo?', '¿Cuánta comida para perro hay?']

function readImagePreview(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function ExperienceCenter() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const [activeView, setActiveView] = useState<CenterView>(null)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<AssistantMessage[]>(initialMessages)
  const [isAssistantThinking, setAssistantThinking] = useState(false)
  const [isAnalyzingInvoice, setAnalyzingInvoice] = useState(false)
  const invoiceInputRef = useRef<HTMLInputElement>(null)
  const conversationEndRef = useRef<HTMLDivElement>(null)
  const summaryQuery = useDashboardSummaryQuery()
  const summary = summaryQuery.data
  const hasAssistantConversation = messages.length > 1

  useEffect(() => {
    if (activeView !== 'assistant') return
    if (!hasAssistantConversation && !isAssistantThinking) return

    conversationEndRef.current?.scrollIntoView({
      behavior: isAssistantThinking ? 'smooth' : 'auto',
      block: 'end',
    })
  }, [activeView, hasAssistantConversation, isAssistantThinking, messages])

  const activityItems = useMemo<ActivityItem[]>(() => {
    if (!summary) return []

    const items: ActivityItem[] = []

    if (summary.activeProductsCount === 0) {
      items.push({
        actionLabel: 'Crear producto',
        description: 'Necesitas al menos un producto activo para comenzar a vender.',
        icon: <PackagePlus aria-hidden="true" />,
        id: 'products-empty',
        path: `${routePaths.products}?mode=create&tab=basic`,
        title: 'Configura tu catálogo',
        tone: 'info',
      })
    }

    if (summary.lowStockAlerts.length > 0) {
      items.push({
        actionLabel: 'Revisar stock',
        description: `${summary.lowStockAlerts.length} producto${summary.lowStockAlerts.length === 1 ? '' : 's'} necesita${summary.lowStockAlerts.length === 1 ? '' : 'n'} reposición o ajuste.`,
        icon: <TriangleAlert aria-hidden="true" />,
        id: 'low-stock',
        path: routePaths.inventory,
        title: 'Inventario requiere atención',
        tone: 'warning',
      })
    }

    if (summary.salesToday === 0 && summary.activeProductsCount > 0) {
      items.push({
        actionLabel: 'Registrar venta',
        description: 'Todavía no hay ventas registradas para el día de hoy.',
        icon: <ShoppingCart aria-hidden="true" />,
        id: 'sales-today',
        path: routePaths.salesNew,
        title: 'Comienza la operación del día',
        tone: 'info',
      })
    }

    if (summary.customersCount === 0) {
      items.push({
        actionLabel: 'Crear cliente',
        description: 'Registrar clientes te permitirá llevar cartera e historial de compras.',
        icon: <UserRoundPlus aria-hidden="true" />,
        id: 'customers-empty',
        path: routePaths.customers,
        title: 'Construye tu base de clientes',
        tone: 'info',
      })
    }

    if (items.length === 0) {
      items.push({
        actionLabel: 'Ver resumen',
        description: 'No encontramos alertas prioritarias en este momento.',
        icon: <CheckCircle2 aria-hidden="true" />,
        id: 'all-clear',
        path: routePaths.dashboard,
        title: 'Tu operación está al día',
        tone: 'success',
      })
    }

    return items
  }, [summary])

  const priorityCount = activityItems.filter((item) => item.tone !== 'success').length
  const isSalesWorkspace = location.pathname === routePaths.salesNew

  function navigateFromCenter(path: string) {
    setActiveView(null)
    if (location.pathname === path) return
    navigate(path)
  }

  async function askAssistant(rawQuestion: string) {
    const trimmedQuestion = rawQuestion.trim()
    if (!trimmedQuestion || isAssistantThinking) return

    const timestamp = Date.now()
    const history = messages
      .filter((message) => message.id !== 'welcome')
      .slice(-10)
      .map((message) => ({ role: message.role, content: message.text }))

    setMessages((currentMessages) => [...currentMessages, { id: `user-${timestamp}`, role: 'user', text: trimmedQuestion }])
    setQuestion('')
    setAssistantThinking(true)

    try {
      const response = await sendAssistantMessage({
        message: trimmedQuestion,
        history,
      })
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `assistant-${timestamp}`,
          role: 'assistant',
          text: response.message,
          action: response.action ? { ...response.action, status: 'pending' } : undefined,
          products: response.products,
        },
      ])
    } catch (error) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `assistant-error-${timestamp}`,
          role: 'assistant',
          text: getApiErrorMessage(error, 'No pude consultar la información en este momento. Intenta nuevamente.'),
        },
      ])
    } finally {
      setAssistantThinking(false)
    }
  }

  async function handleInvoiceSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || isAssistantThinking) return

    const timestamp = Date.now()
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `assistant-invoice-error-${timestamp}`,
          role: 'assistant',
          text: 'La factura debe ser una foto JPG, PNG o WEBP.',
        },
      ])
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `assistant-invoice-error-${timestamp}`,
          role: 'assistant',
          text: 'La foto de la factura debe pesar máximo 5 MB.',
        },
      ])
      return
    }

    setAssistantThinking(true)
    setAnalyzingInvoice(true)
    try {
      const previewUrl = await readImagePreview(file)
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `user-invoice-${timestamp}`,
          role: 'user',
          text: 'Registrar esta factura de compra',
          attachment: { name: file.name, previewUrl },
        },
      ])

      const response = await analyzePurchaseInvoice(file)
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `assistant-invoice-${timestamp}`,
          role: 'assistant',
          text: response.message,
          action: response.action ? { ...response.action, status: 'pending' } : undefined,
          products: response.products,
        },
      ])
    } catch (error) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `assistant-invoice-error-${timestamp}`,
          role: 'assistant',
          text: getApiErrorMessage(error, 'No pude leer la factura. Toma una foto completa y nítida e intenta nuevamente.'),
        },
      ])
    } finally {
      setAnalyzingInvoice(false)
      setAssistantThinking(false)
    }
  }

  async function confirmAction(messageId: string, token: string) {
    if (isAssistantThinking) return

    setAssistantThinking(true)
    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === messageId && message.action
          ? {
              ...message,
              action: { ...message.action, status: 'executing' },
            }
          : message,
      ),
    )

    try {
      const response = await confirmAssistantAction(token)
      setMessages((currentMessages) => [
        ...currentMessages.map((message) =>
          message.id === messageId && message.action
            ? {
                ...message,
                action: { ...message.action, status: 'completed' as const },
              }
            : message,
        ),
        {
          id: `assistant-confirmed-${Date.now()}`,
          role: 'assistant',
          text: response.message,
        },
      ])
      await queryClient.invalidateQueries()
    } catch (error) {
      setMessages((currentMessages) => [
        ...currentMessages.map((message) =>
          message.id === messageId && message.action
            ? {
                ...message,
                action: { ...message.action, status: 'pending' as const },
              }
            : message,
        ),
        {
          id: `assistant-action-error-${Date.now()}`,
          role: 'assistant',
          text: getApiErrorMessage(error, 'No pude completar el cambio. Revisa los datos e intenta nuevamente.'),
        },
      ])
    } finally {
      setAssistantThinking(false)
    }
  }

  function cancelAction(messageId: string) {
    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === messageId && message.action
          ? {
              ...message,
              action: { ...message.action, status: 'cancelled' },
            }
          : message,
      ),
    )
  }

  function getActionIcon(action: AssistantPendingAction) {
    if (action.kind === 'CREATE_PRODUCT') {
      return <PackagePlus aria-hidden="true" />
    }
    if (action.kind === 'UPDATE_PRODUCT') {
      return <Pencil aria-hidden="true" />
    }
    if (
      action.kind === 'CREATE_SALE' ||
      action.kind === 'COMPLETE_HELD_SALE'
    ) {
      return <ShoppingCart aria-hidden="true" />
    }
    if (action.kind === 'HOLD_SALE') {
      return <Clock3 aria-hidden="true" />
    }
    if (action.kind === 'CREATE_PURCHASE') {
      return <ReceiptText aria-hidden="true" />
    }
    if (action.kind === 'REGISTER_RECEIVABLE_PAYMENT') {
      return <HandCoins aria-hidden="true" />
    }
    return <Trash2 aria-hidden="true" />
  }

  function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void askAssistant(question)
  }

  return (
    <>
      {!isSalesWorkspace ? (
        <div className={styles.launchers}>
          <button
            aria-label="Registrar una nueva venta"
            data-label="Nueva venta"
            className={joinClassNames(styles.launcher, styles.saleLauncher)}
            type="button"
            onClick={() => navigate(routePaths.salesNew)}
          >
            <ShoppingCart aria-hidden="true" />
          </button>
          <button
            aria-expanded={activeView === 'activity'}
            aria-label="Abrir centro de actividad"
            data-label="Actividad"
            className={joinClassNames(styles.launcher, styles.activityLauncher)}
            type="button"
            onClick={() => setActiveView('activity')}
          >
            <Bell aria-hidden="true" />
            {priorityCount > 0 ? <span>{Math.min(priorityCount, 9)}</span> : null}
          </button>
          <button
            aria-expanded={activeView === 'assistant'}
            aria-label="Abrir asistente de ayuda"
            data-label="Asistente"
            className={joinClassNames(styles.launcher, styles.helpLauncher)}
            type="button"
            onClick={() => setActiveView('assistant')}
          >
            <MessageCircleMore aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <AppDrawer
        description="Prioridades calculadas con la información actual de tu negocio."
        isOpen={activeView === 'activity'}
        size="md"
        title="Centro de actividad"
        titleAccessory={
          <span className={styles.drawerTitleIcon}>
            <Bell aria-hidden="true" />
          </span>
        }
        onClose={() => setActiveView(null)}
      >
        <div className={styles.activityHeader}>
          <div>
            <span>Acciones pendientes</span>
            <strong>{priorityCount}</strong>
          </div>
          <AppButton
            isLoading={summaryQuery.isFetching}
            loadingLabel="Actualizando"
            size="sm"
            startIcon={<RefreshCw aria-hidden="true" />}
            type="button"
            variant="secondary"
            onClick={() => void summaryQuery.refetch()}
          >
            Actualizar
          </AppButton>
        </div>

        {summaryQuery.isError ? (
          <div className={styles.activityError}>
            <TriangleAlert aria-hidden="true" />
            <div>
              <strong>No pudimos actualizar las prioridades</strong>
              <span>Revisa tu conexión e intenta nuevamente.</span>
            </div>
          </div>
        ) : (
          <div className={styles.activityList}>
            {activityItems.map((item) => (
              <article className={joinClassNames(styles.activityItem, styles[item.tone])} key={item.id}>
                <span className={styles.activityIcon}>{item.icon}</span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                  <AppButton
                    className={styles.activityAction}
                    endIcon={<ArrowRight aria-hidden="true" size={15} />}
                    size="sm"
                    type="button"
                    variant="link"
                    onClick={() => navigateFromCenter(item.path)}
                  >
                    {item.actionLabel}
                  </AppButton>
                </div>
              </article>
            ))}
          </div>
        )}
      </AppDrawer>

      <AppDrawer
        bodyClassName={styles.assistantBody}
        description="Consulta productos, prepara ventas y registra compras desde una foto."
        footerClassName={styles.assistantFooter}
        isOpen={activeView === 'assistant'}
        panelClassName={styles.assistantPanel}
        size="md"
        title="Asistente CashGo"
        titleAccessory={
          <span className={styles.drawerTitleIcon}>
            <Bot aria-hidden="true" />
          </span>
        }
        footer={
          <form className={styles.assistantForm} onSubmit={submitQuestion}>
            <input
              ref={invoiceInputRef}
              accept="image/jpeg,image/png,image/webp"
              aria-label="Seleccionar foto de factura"
              className={styles.hiddenFileInput}
              type="file"
              onChange={(event) => void handleInvoiceSelected(event)}
            />
            <AppButton
              aria-label="Escanear factura de compra"
              disabled={isAssistantThinking}
              iconOnly
              startIcon={<Camera aria-hidden="true" />}
              type="button"
              variant="secondary"
              onClick={() => invoiceInputRef.current?.click()}
            />
            <input
              aria-label="Escribe tu pregunta"
              disabled={isAssistantThinking}
              placeholder="Ej: ¿Cuánta comida para perro hay?"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <AppButton
              aria-label="Enviar pregunta"
              disabled={!question.trim() || isAssistantThinking}
              iconOnly
              isLoading={isAssistantThinking}
              loadingLabel="Consultando"
              startIcon={<Send aria-hidden="true" />}
              type="submit"
            />
          </form>
        }
        onClose={() => setActiveView(null)}
      >
        {!hasAssistantConversation ? (
          <div className={styles.assistantIntro}>
            <div className={styles.assistantStatus}>
              <span>
                <CircleHelp aria-hidden="true" />
              </span>
              <div>
                <strong>Asistente con confirmación</strong>
                <p>Consulta datos y prepara cambios. Nada se modifica hasta que confirmes.</p>
              </div>
            </div>

            <div className={styles.quickQuestions}>
              <button className={styles.invoiceQuickAction} disabled={isAssistantThinking} type="button" onClick={() => invoiceInputRef.current?.click()}>
                <Camera aria-hidden="true" />
                Registrar compra con foto
              </button>
              {quickQuestions.map((quickQuestion) => (
                <button disabled={isAssistantThinking} key={quickQuestion} type="button" onClick={() => void askAssistant(quickQuestion)}>
                  {quickQuestion}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className={styles.conversation} aria-live="polite">
          {messages.map((message) => (
            <div className={styles.messageGroup} key={message.id}>
              <div className={joinClassNames(styles.message, styles[message.role])}>
                {message.role === 'assistant' ? <Bot aria-hidden="true" /> : null}
                <p>{cleanAssistantText(message.text)}</p>
              </div>
              {message.attachment ? (
                <figure className={styles.invoiceAttachment}>
                  <img alt={`Factura ${message.attachment.name}`} src={message.attachment.previewUrl} />
                  <figcaption>
                    <ReceiptText aria-hidden="true" />
                    <span>{message.attachment.name}</span>
                  </figcaption>
                </figure>
              ) : null}
              {message.products?.length ? <ProductPreviewList products={message.products} /> : null}
              {message.action ? (
                <article className={joinClassNames(styles.actionCard, message.action.tone === 'danger' ? styles.actionDanger : undefined)}>
                  <header>
                    <span>{getActionIcon(message.action)}</span>
                    <div>
                      <strong>{message.action.title}</strong>
                      <p>{message.action.description}</p>
                    </div>
                  </header>
                  <dl>
                    {message.action.details.map((detail) => (
                      <div key={detail.label}>
                        <dt>{detail.label}</dt>
                        <dd>{detail.value}</dd>
                      </div>
                    ))}
                  </dl>
                  {message.action.products?.length ? (
                    <ProductPreviewList mode={message.action.kind === 'CREATE_PURCHASE' ? 'purchase' : 'sale'} products={message.action.products} />
                  ) : null}
                  {message.action.status === 'pending' || message.action.status === 'executing' ? (
                    <footer>
                      <AppButton
                        disabled={message.action.status === 'executing'}
                        size="sm"
                        startIcon={<X aria-hidden="true" />}
                        type="button"
                        variant="secondary"
                        onClick={() => cancelAction(message.id)}
                      >
                        Cancelar
                      </AppButton>
                      <AppButton
                        isLoading={message.action.status === 'executing'}
                        loadingLabel="Procesando"
                        size="sm"
                        startIcon={message.action.tone === 'danger' ? <Trash2 aria-hidden="true" /> : <Check aria-hidden="true" />}
                        type="button"
                        variant={message.action.tone === 'danger' ? 'danger' : 'primary'}
                        onClick={() => void confirmAction(message.id, message.action?.token ?? '')}
                      >
                        {message.action.confirmLabel}
                      </AppButton>
                    </footer>
                  ) : (
                    <div className={joinClassNames(styles.actionStatus, message.action.status === 'completed' ? styles.actionCompleted : styles.actionCancelled)}>
                      {message.action.status === 'completed' ? <CheckCircle2 aria-hidden="true" /> : <X aria-hidden="true" />}
                      {message.action.status === 'completed' ? 'Cambio realizado' : 'Acción cancelada'}
                    </div>
                  )}
                </article>
              ) : null}
            </div>
          ))}
          {isAssistantThinking ? (
            <div className={joinClassNames(styles.message, styles.assistant)}>
              <Bot aria-hidden="true" />
              <p className={styles.thinkingMessage}>
                <LoaderCircle aria-hidden="true" />
                {isAnalyzingInvoice ? 'Leyendo la factura y buscando productos…' : 'Consultando tu negocio…'}
              </p>
            </div>
          ) : null}
          <div aria-hidden="true" className={styles.conversationEnd} ref={conversationEndRef} />
        </div>
      </AppDrawer>
    </>
  )
}
