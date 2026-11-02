import { adminApiRequest } from './client'
import type { ScanStatus, SiteScanDetail, SiteScanListResult } from '../../server/site-scan/types'

export interface ListSiteScansParams { q?: string; status?: ScanStatus | 'all'; page?: number; pageSize?: number }

export function listSiteScans({ q, status, page, pageSize }: ListSiteScansParams = {}) {
  const query = new URLSearchParams()
  if (q) query.set('q', q)
  if (status && status !== 'all') query.set('status', status)
  if (page) query.set('page', String(page))
  if (pageSize) query.set('pageSize', String(pageSize))
  const suffix = query.toString()
  return adminApiRequest<SiteScanListResult>(`/site-scans${suffix ? `?${suffix}` : ''}`)
}

export function getSiteScan(id: string) { return adminApiRequest<{ scan: SiteScanDetail }>(`/site-scans/${id}`) }
export function rescanSiteScan(id: string) { return adminApiRequest<{ status: 'running' }>(`/site-scans/${id}/rescan`, { method: 'POST' }) }
export function deleteSiteScan(id: string) { return adminApiRequest<void>(`/site-scans/${id}`, { method: 'DELETE' }) }
