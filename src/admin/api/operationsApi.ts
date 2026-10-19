import { API_BASE_URL } from '../../config/api'
import { adminApiRequest, ApiError } from './client'
import type { AdminBlogPost, ReviewStatus } from './blogTypes'

export interface ActivityRecord { id: string; actorName: string; action: string; entityType: string; entityId: string | null; entityTitle: string | null; metadata: Record<string, string | number | boolean | null>; createdAt: string }

export function listActivity(limit = 100) { return adminApiRequest<{ activities: ActivityRecord[] }>(`/activity?limit=${limit}`) }
export function updateReview(id: string, reviewStatus: ReviewStatus, reviewNote: string | null = null) { return adminApiRequest<{ blog: AdminBlogPost }>(`/blogs/${id}/review`, { method: 'PATCH', body: { reviewStatus, reviewNote } }) }
export function getPreferences() { return adminApiRequest<{ preferences: NotificationPreferences }>('/preferences') }
export function savePreferences(preferences: NotificationPreferences) { return adminApiRequest<{ preferences: NotificationPreferences }>('/preferences', { method: 'PUT', body: preferences }) }
export interface NotificationPreferences { emailOnReview: boolean; emailOnPublishFailure: boolean; emailOnScheduledPublish: boolean }

export async function downloadBackup() {
  const response = await fetch(`${API_BASE_URL}/api/admin/backups`, { credentials: 'include' })
  if (!response.ok) throw new ApiError(response.status, 'Backup export failed.')
  return response.blob()
}

export function restoreBackup(backup: Record<string, unknown>) { return adminApiRequest<{ restored: { blogs: number; redirects: number } }>('/backups', { method: 'POST', body: backup }) }
