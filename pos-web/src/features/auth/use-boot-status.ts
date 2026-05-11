import * as React from 'react'
import { BootStatusContext } from './session-boot-context'

export function useBootStatus() {
  return React.useContext(BootStatusContext)
}
