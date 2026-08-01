'use server';

import { verifyAndLoginStaff, clearStaffSession, getStaffSession } from '../auth/session';

export async function loginStaffAction(formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  if (!username || !password) {
    return { success: false, error: 'Username dan password wajib diisi' };
  }

  const result = await verifyAndLoginStaff(username.trim(), password);
  return result;
}

export async function logoutStaffAction(peran?: string) {
  await clearStaffSession(peran);
  return { success: true };
}

export async function getStaffSessionAction(peran?: string) {
  return await getStaffSession(peran);
}
