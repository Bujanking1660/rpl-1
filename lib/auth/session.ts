import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { createClient } from '../supabase/server';
import { PeranPegawai } from '../types/database';

const GLOBAL_SESSION_COOKIE = 'pakresto_staff_session';

export interface StaffSession {
  id_pegawai: string;
  nama_pegawai: string;
  peran: PeranPegawai;
  username: string;
}

export function getRoleCookieName(peran: string): string {
  return `pakresto_session_${peran}`;
}

export async function setStaffSession(session: StaffSession) {
  const cookieStore = await cookies();
  const sessionData = JSON.stringify(session);
  
  const roleCookieName = getRoleCookieName(session.peran);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 12, // 12 hours
  };

  // Set role-scoped cookie and global active cookie
  cookieStore.set(roleCookieName, sessionData, cookieOptions);
  cookieStore.set(GLOBAL_SESSION_COOKIE, sessionData, cookieOptions);
}

export async function getStaffSession(requiredRole?: string): Promise<StaffSession | null> {
  const cookieStore = await cookies();

  if (requiredRole) {
    const roleCookie = cookieStore.get(getRoleCookieName(requiredRole));
    if (roleCookie?.value) {
      try {
        return JSON.parse(roleCookie.value) as StaffSession;
      } catch {
        // Fallthrough
      }
    }

    // Manager can access any role
    const managerCookie = cookieStore.get(getRoleCookieName('manajer'));
    if (managerCookie?.value) {
      try {
        return JSON.parse(managerCookie.value) as StaffSession;
      } catch {
        // Fallthrough
      }
    }
  }

  // Fallback to global active session cookie
  const globalCookie = cookieStore.get(GLOBAL_SESSION_COOKIE);
  if (globalCookie?.value) {
    try {
      return JSON.parse(globalCookie.value) as StaffSession;
    } catch {
      return null;
    }
  }

  return null;
}

export async function clearStaffSession(peran?: string) {
  const cookieStore = await cookies();

  if (peran) {
    cookieStore.delete(getRoleCookieName(peran));
  } else {
    const roles = ['pelayan', 'kasir', 'koki', 'manajer'];
    roles.forEach((r) => cookieStore.delete(getRoleCookieName(r)));
  }
  cookieStore.delete(GLOBAL_SESSION_COOKIE);
}

export async function verifyAndLoginStaff(
  username: string,
  passwordInput: string
): Promise<{ success: boolean; error?: string; session?: StaffSession }> {
  const supabase = await createClient();

  const { data: pegawai, error } = await supabase
    .from('pegawai')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !pegawai) {
    return { success: false, error: 'Username tidak ditemukan' };
  }

  let isValid = false;

  if (pegawai.password) {
    if (pegawai.password.startsWith('$2a$') || pegawai.password.startsWith('$2b$')) {
      isValid = await bcrypt.compare(passwordInput, pegawai.password);
    } else {
      // Plain-text password comparison
      isValid = pegawai.password === passwordInput;
    }
  }

  if (!isValid) {
    return { success: false, error: 'Password salah' };
  }

  const session: StaffSession = {
    id_pegawai: pegawai.id_pegawai,
    nama_pegawai: pegawai.nama_pegawai,
    peran: pegawai.peran as PeranPegawai,
    username: pegawai.username,
  };

  await setStaffSession(session);
  return { success: true, session };
}
