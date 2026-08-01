import { AsyncStateBlock } from '@/shared/components/states/AsyncStateBlock'

type PageLoadingStateProps = {
  title?: string
  description?: string
}

export function PageLoadingState({
  description = 'Estamos preparando la información.',
  title = 'Cargando pantalla',
}: PageLoadingStateProps) {
  return (
    <AsyncStateBlock
      description={description}
      title={title}
      tone="loading"
      variant="page"
    />
  )
}
