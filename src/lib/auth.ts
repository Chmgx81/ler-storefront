import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: typeof window === 'undefined' ? undefined : window.location.origin,
  basePath: '/api/auth',
});

export const { useSession, signIn, signUp, signOut } = authClient;

function message(error: { message?: string } | undefined, fallback: string) {
  if (!error) return fallback;
  return error.message || fallback;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const result = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
  if (result.error) throw new Error(message(result.error, 'Your password could not be changed.'));
}

export async function requestPasswordReset(email: string) {
  const result = await authClient.requestPasswordReset({ email, redirectTo: '/account/reset' });
  if (result.error) throw new Error(message(result.error, 'That request could not be sent.'));
}

export async function resetPassword(token: string, newPassword: string) {
  const result = await authClient.resetPassword({ token, newPassword });
  if (result.error) throw new Error(message(result.error, 'That password could not be saved. Request a new link.'));
}

export async function deleteAccount(password: string) {
  const result = await authClient.deleteUser({ password });
  if (result.error) throw new Error(message(result.error, 'The account could not be deleted.'));
}

export async function revokeOtherSessions() {
  const result = await authClient.revokeOtherSessions();
  if (result.error) throw new Error(message(result.error, 'Those sessions could not be closed.'));
}

export async function updateName(name: string) {
  const result = await authClient.updateUser({ name });
  if (result.error) throw new Error(message(result.error, 'Your name could not be saved.'));
}

export async function sendVerificationEmail(email: string) {
  const result = await authClient.sendVerificationEmail({ email, callbackURL: '/account' });
  if (result.error) throw new Error(message(result.error, 'That email could not be sent.'));
}
