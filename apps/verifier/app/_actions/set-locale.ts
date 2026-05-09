'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { SUPPORTED_LOCALES, type Locale } from '../../i18n/locales';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function setLocale(locale: Locale): Promise<void> {
  if (!(SUPPORTED_LOCALES as readonly string[]).includes(locale)) return;
  const store = await cookies();
  store.set('NEXT_LOCALE', locale, {
    maxAge: ONE_YEAR_SECONDS,
    path: '/',
    sameSite: 'lax',
  });
  revalidatePath('/', 'layout');
}
