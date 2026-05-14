import { useConnectivity } from './shared/hooks/use-connectivity'

export function ConnectivityRegistrar() {
  useConnectivity()
  return null
}
