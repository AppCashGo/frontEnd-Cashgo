import { RouterProvider } from 'react-router-dom'
import { appRouter } from '@/routes/app-router'
import { PwaInstallPrompt } from '@/app/PwaInstallPrompt'

export function App() {
  return (
    <>
      <RouterProvider router={appRouter} />
      <PwaInstallPrompt />
    </>
  )
}
