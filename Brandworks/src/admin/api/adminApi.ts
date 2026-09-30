import { adminApiRequest } from './client'
import type { AdminAccount } from './types'

export function login(username: string, password: string) {
  return adminApiRequest<{ admin: AdminAccount }>('/auth/login', {
    method: 'POST',
    body: { username, password },
  })
}

export function logout() {
  return adminApiRequest<{ ok: true }>('/auth/logout', { method: 'POST' })
}

export function fetchCurrentAdmin() {
  return adminApiRequest<{ admin: AdminAccount }>('/auth/me')
}

export function updateUsername(username: string, currentPassword: string) {
  return adminApiRequest<{ admin: AdminAccount }>('/profile/username', {
    method: 'PUT',
    body: { username, currentPassword },
  })
}

export function updatePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
) {
  return adminApiRequest<{ ok: true }>('/profile/password', {
    method: 'PUT',
    body: { currentPassword, newPassword, confirmPassword },
  })
}

export function listAdminUsers() {
  return adminApiRequest<{ admins: AdminAccount[] }>('/users')
}

export function createSubAdmin(username: string, password: string) {
  return adminApiRequest<{ admin: AdminAccount }>('/users', {
    method: 'POST',
    body: { username, password },
  })
}

export function setSubAdminEnabled(id: string, enabled: boolean) {
  return adminApiRequest<{ admin: AdminAccount }>(`/users/${id}/status`, {
    method: 'PATCH',
    body: { enabled },
  })
}

export function deleteSubAdmin(id: string) {
  return adminApiRequest<undefined>(`/users/${id}`, { method: 'DELETE' })
}
