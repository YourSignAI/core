import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type Locale,
} from './locales';

function isSupported(value: string | undefined): value is Locale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get('NEXT_LOCALE')?.value;
  if (isSupported(fromCookie)) return fromCookie;

  const acceptLanguage = (await headers()).get('accept-language') ?? '';
  if (acceptLanguage.toLowerCase().startsWith('pt')) return 'pt';

  return DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  const messages = (await import(`../messages/${locale}.json`)).default as Record<string, unknown>;
  return { locale, messages };
});
