"use client";

import { useState, useEffect, createContext, useContext, type ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import type { AbstractIntlMessages } from "next-intl";
import esMessages from "../../messages/es.json";

type Locale = "es" | "en";

const LOCALE_KEY = "healthcore-locale";

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: "es",
  setLocale: () => {},
});

export function useLocale() {
  return useContext(LocaleContext);
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("es");
  const [messages, setMessages] = useState<AbstractIntlMessages>(esMessages);
  const [ready, setReady] = useState(true);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_KEY, newLocale);
    document.cookie = `${LOCALE_KEY}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = newLocale;

    if (newLocale === locale && ready) return;

    if (newLocale === "es") {
      setMessages(esMessages);
      setReady(true);
      return;
    }

    setReady(false);
    import(`../../messages/en.json`)
      .then((mod) => {
        setMessages(mod.default || mod);
        setReady(true);
      })
      .catch(() => {
        setMessages(esMessages);
        setReady(true);
      });
  };

  useEffect(() => {
    const saved = (localStorage.getItem(LOCALE_KEY) as Locale) || "es";
    document.documentElement.lang = saved;
    document.cookie = `${LOCALE_KEY}=${saved}; path=/; max-age=31536000; SameSite=Lax`;

    if (saved !== "es") {
      import(`../../messages/en.json`)
        .then((mod) => {
          setMessages(mod.default || mod);
          setReady(true);
        })
        .catch(() => {
          setMessages(esMessages);
          setReady(true);
        });
    }
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}