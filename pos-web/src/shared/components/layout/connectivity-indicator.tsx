import { STATUS_ONLINE } from '../../i18n/messages'

export function ConnectivityIndicator() {
  return <span aria-label="Trạng thái kết nối" className="rounded-full bg-success px-3 py-1 text-sm font-semibold text-white">{STATUS_ONLINE}</span>
}
