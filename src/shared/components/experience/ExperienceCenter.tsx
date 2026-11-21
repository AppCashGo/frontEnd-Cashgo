import {
  ArrowRight,
  Bell,
  Bot,
  Boxes,
  CheckCircle2,
  CircleHelp,
  MessageCircleMore,
  PackagePlus,
  RefreshCw,
  Send,
  ShoppingCart,
  TriangleAlert,
  UserRoundPlus,
  WalletCards,
} from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useDashboardSummaryQuery } from '@/modules/dashboard/hooks/use-dashboard-summary-query'
import { routePaths } from '@/routes/route-paths'
import { AppDrawer } from '@/shared/components/ui/AppDrawer'
import { AppButton } from '@/shared/components/ui/AppButton'
import { joinClassNames } from '@/shared/utils/join-class-names'
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
}

type AssistantAnswer = {
  actionLabel: string
  path: string
  text: string
}

const initialMessages: AssistantMessage[] = [
  {
    id: 'welcome',
    role: 'assistant',
    text: 'Hola. Puedo orientarte para vender, controlar inventario, revisar caja, gestionar cartera o registrar compras.',
  },
]

const quickQuestions = [
  'Registrar una venta',
  'Revisar inventario',
  'Controlar caja',
  'Cobrar una deuda',
]

function getAssistantAnswer(question: string): AssistantAnswer {
  const normalizedQuestion = question.toLocaleLowerCase('es')

  if (/venta|vender|factura|cobrar una compra/.test(normalizedQuestion)) {
    return {
      actionLabel: 'Ir a nueva venta',
      path: routePaths.salesNew,
      text: 'Abre Nueva venta, busca o escanea los productos, confirma las cantidades y elige el medio de pago. Puedes dejar una venta suspendida si el cliente aún no termina.',
    }
  }

  if (/inventario|stock|producto|agot/.test(normalizedQuestion)) {
    return {
      actionLabel: 'Revisar inventario',
      path: routePaths.inventory,
      text: 'En Inventario puedes revisar existencias, alertas, compras, conteos físicos, producción y mermas desde un mismo lugar.',
    }
  }

  if (/caja|turno|arqueo|efectivo/.test(normalizedQuestion)) {
    return {
      actionLabel: 'Abrir control de caja',
      path: routePaths.money,
      text: 'En Caja puedes abrir el turno, registrar entradas o salidas, revisar medios de pago y comparar el efectivo esperado con el contado.',
    }
  }

  if (/cartera|deuda|cliente|crédito|credito/.test(normalizedQuestion)) {
    return {
      actionLabel: 'Ir a clientes y cartera',
      path: routePaths.customers,
      text: 'Abre Clientes para consultar saldos, registrar abonos, acuerdos de pago y compartir recordatorios o estados de cuenta.',
    }
  }

  if (/compra|proveedor|abaste|reponer/.test(normalizedQuestion)) {
    return {
      actionLabel: 'Ir a proveedores',
      path: routePaths.suppliers,
      text: 'Desde Proveedores puedes registrar compras, pagos parciales, devoluciones y consultar el historial de abastecimiento.',
    }
  }

  return {
    actionLabel: 'Abrir centro de ayuda',
    path: routePaths.help,
    text: 'Todavía no tengo una respuesta específica para esa consulta. El centro de ayuda reúne las guías disponibles y los accesos a cada módulo.',
  }
}

export function ExperienceCenter() {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeView, setActiveView] = useState<CenterView>(null)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<AssistantMessage[]>(initialMessages)
  const [lastAnswer, setLastAnswer] = useState<AssistantAnswer | null>(null)
  const summaryQuery = useDashboardSummaryQuery()
  const summary = summaryQuery.data

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

  function navigateFromCenter(path: string) {
    setActiveView(null)
    if (location.pathname === path) return
    navigate(path)
  }

  function askAssistant(rawQuestion: string) {
    const trimmedQuestion = rawQuestion.trim()
    if (!trimmedQuestion) return

    const answer = getAssistantAnswer(trimmedQuestion)
    const timestamp = Date.now()
    setMessages((currentMessages) => [
      ...currentMessages,
      { id: `user-${timestamp}`, role: 'user', text: trimmedQuestion },
      { id: `assistant-${timestamp}`, role: 'assistant', text: answer.text },
    ])
    setLastAnswer(answer)
    setQuestion('')
  }

  function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    askAssistant(question)
  }

  return (
    <>
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
        description="Orientación rápida y accesos directos a los procesos de CashGo."
        isOpen={activeView === 'assistant'}
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
              aria-label="Escribe tu pregunta"
              placeholder="Ej: ¿Cómo registro una compra?"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <AppButton
              aria-label="Enviar pregunta"
              disabled={!question.trim()}
              iconOnly
              startIcon={<Send aria-hidden="true" />}
              type="submit"
            />
          </form>
        }
        onClose={() => setActiveView(null)}
      >
        <div className={styles.assistantStatus}>
          <span><CircleHelp aria-hidden="true" /></span>
          <div>
            <strong>Ayuda contextual</strong>
            <p>No modifica información ni ejecuta acciones sin tu intervención.</p>
          </div>
        </div>

        <div className={styles.quickQuestions}>
          {quickQuestions.map((quickQuestion) => (
            <button key={quickQuestion} type="button" onClick={() => askAssistant(quickQuestion)}>
              {quickQuestion}
            </button>
          ))}
        </div>

        <div className={styles.conversation} aria-live="polite">
          {messages.map((message) => (
            <div className={joinClassNames(styles.message, styles[message.role])} key={message.id}>
              {message.role === 'assistant' ? <Bot aria-hidden="true" /> : null}
              <p>{message.text}</p>
            </div>
          ))}
        </div>

        {lastAnswer ? (
          <AppButton
            className={styles.answerAction}
            startIcon={lastAnswer.path === routePaths.inventory ? <Boxes aria-hidden="true" /> : <WalletCards aria-hidden="true" />}
            type="button"
            variant="secondary"
            onClick={() => navigateFromCenter(lastAnswer.path)}
          >
            {lastAnswer.actionLabel}
          </AppButton>
        ) : null}
      </AppDrawer>
    </>
  )
}
