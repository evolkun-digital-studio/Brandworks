import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ObjectId } from 'mongodb'

vi.mock('server-only',()=>({}))
vi.mock('argon2',()=>({default:{verify:vi.fn(),hash:vi.fn()}}))
vi.mock('../repositories/admin.repository',()=>({
  deleteAdminById:vi.fn(),findAdminById:vi.fn(),findAdminByUsername:vi.fn(),insertAdmin:vi.fn(),
  listAdmins:vi.fn(),recordAdminLogin:vi.fn(),updateAdminById:vi.fn(),countAdminsByRole:vi.fn(),
}))

import argon2 from 'argon2'
import { findAdminByUsername, recordAdminLogin, insertAdmin } from '../repositories/admin.repository'
import { createSubAdmin, loginAdmin, validatePassword, validateUsername, verifyAdminToken } from './auth'

const id = new ObjectId('64b000000000000000000001')
const account = (overrides: Record<string,unknown> = {}) => ({
  _id:id,username:'admin.test',passwordHash:'argon-hash',role:'admin',enabled:true,isPrimary:false,
  createdAt:new Date('2025-01-01T00:00:00Z'),updatedAt:new Date('2025-01-01T00:00:00Z'),lastLoginAt:null,...overrides,
})

describe('admin authentication service',()=>{
  beforeEach(()=>{vi.clearAllMocks();process.env.JWT_SECRET='test-only-jwt-secret-for-unit-tests'})

  it('normalizes usernames and applies the established password policy',()=>{
    expect(validateUsername('  Editor_One ')).toBeNull()
    expect(validateUsername('x')).toContain('Login ID')
    expect(validatePassword('lettersOnly')).toBe('Password must include at least one letter and one number.')
    expect(validatePassword('Phase7cPassword42')).toBeNull()
  })

  it('issues a subject-only token after Argon2 verification and records login',async()=>{
    vi.mocked(findAdminByUsername).mockResolvedValue(account() as never)
    vi.mocked(argon2.verify).mockResolvedValue(true)
    vi.mocked(recordAdminLogin).mockResolvedValue(undefined)
    const result=await loginAdmin(' ADMIN.TEST ','Phase7cPassword42')
    expect(result.admin).toMatchObject({username:'admin.test',role:'admin'})
    expect(verifyAdminToken(result.token)).toEqual({sub:id.toHexString()})
    expect(recordAdminLogin).toHaveBeenCalledWith(id.toHexString())
  })

  it('does not disclose unknown users, wrong passwords, or disabled accounts',async()=>{
    vi.mocked(findAdminByUsername).mockResolvedValue(null)
    await expect(loginAdmin('nobody','wrong')).rejects.toMatchObject({status:401,message:'Invalid username or password.'})
    vi.mocked(findAdminByUsername).mockResolvedValue(account({enabled:false}) as never)
    vi.mocked(argon2.verify).mockResolvedValue(true)
    await expect(loginAdmin('admin.test','wrong')).rejects.toMatchObject({status:401,message:'Invalid username or password.'})
  })

  it('creates only sub-admin accounts regardless of client role fields',async()=>{
    const actor=account() as never
    vi.mocked(findAdminByUsername).mockResolvedValue(null)
    vi.mocked(argon2.hash).mockResolvedValue('new-hash')
    vi.mocked(insertAdmin).mockImplementation(async(input)=>account({username:input.username,passwordHash:input.passwordHash,role:input.role}) as never)
    const created=await createSubAdmin(actor,'Writer.One','Phase7cPassword42')
    expect(created.role).toBe('sub_admin')
    expect(created.passwordHash).toBe('new-hash')
  })
})
