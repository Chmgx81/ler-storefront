import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { config } from './config';
import { db, kysely, recordEvent } from './db';
import { sendMail, textMail } from './mail';

const { publicUrl, origins, secret } = config;

const verificationLink = (url: string) =>
  textMail(
    '',
    'Verify your email',
    `Verify your LER email address:\n\n${url}\n\nThe link expires in one hour. If you did not create an account, ignore this message.`,
  );

export const authConfig = {
  appName: 'LER',
  database: { db: kysely, type: 'sqlite' },
  secret,
  baseURL: publicUrl,
  trustedOrigins: origins,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: !config.requireVerification,
    requireEmailVerification: config.requireVerification,
    resetPasswordTokenExpiresIn: 30 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendMail(
        textMail(
          user.email,
          'Reset your LER password',
          `Reset your password:\n\n${url}\n\nThe link expires in 30 minutes. If you did not request this, ignore this message.`,
        ),
      );
      recordEvent('password_reset_requested', 'reset link issued', user.email);
    },
  },
  emailVerification: {
    sendOnSignUp: config.requireVerification,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url }) => {
      await sendMail({ ...verificationLink(url), to: user.email });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    freshAge: 60 * 60,
  },
  user: {
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        // Full erasure: the order rows carry name, email and address.
        await db.prepare('DELETE FROM orders WHERE user_id = ?').run(user.id);
        await db.prepare('DELETE FROM subscribers WHERE email = ?').run(user.email.toLowerCase());
        recordEvent('account_deleted', 'orders and subscriptions removed', user.email);
      },
    },
  },
  rateLimit: {
    enabled: true,
    storage: 'database',
    window: 60,
    max: 60,
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/sign-up/email': { window: 60 * 60, max: 20 },
      '/request-password-reset': { window: 60 * 60, max: 3 },
      '/send-verification-email': { window: 60 * 60, max: 3 },
      '/delete-user': { window: 60 * 60, max: 3 },
    },
  },
  advanced: {
    useSecureCookies: config.isProduction && publicUrl.startsWith('https://'),
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.isProduction && publicUrl.startsWith('https://'),
      path: '/',
    },
    ipAddress: {
      ipAddressHeaders: config.trustProxy ? ['x-forwarded-for', 'x-real-ip'] : [],
      ...(config.trustedProxies.length ? { trustedProxies: config.trustedProxies } : {}),
    },
  },
  telemetry: { enabled: false },
} satisfies BetterAuthOptions;

export const auth = betterAuth(authConfig);
