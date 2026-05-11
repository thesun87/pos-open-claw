import * as React from 'react'

export type BootStatus = 'loading' | 'ready'
export const BootStatusContext = React.createContext<BootStatus>('loading')
