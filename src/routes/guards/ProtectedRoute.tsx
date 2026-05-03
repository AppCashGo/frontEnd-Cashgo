import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthSessionStore } from '@/modules/auth/hooks/use-auth-session-store'
import { routePaths } from '@/routes/route-paths'

export function ProtectedRoute() {
  const location = useLocation()
  const accessToken = useAuthSessionStore((state) => state.accessToken)
  const user = useAuthSessionStore((state) => state.user)

  if (!accessToken || !user) {
    return (
      <Navigate
        replace
        state={{ from: location.pathname }}
        to={routePaths.auth}
      />
    )
  }

  return <Outlet />
}
