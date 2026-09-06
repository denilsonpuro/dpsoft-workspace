"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { translations } from "./translations";
import { additionalTranslations } from "./translations-extra";
export const languages = ["en", "pt", "fr", "es", "de"] as const;
export type Language = typeof languages[number];
const names: Record<Language, string> = { en: "English", pt: "Português", fr: "Français", es: "Español", de: "Deutsch" };
const countryCurrency: Record<string, string> = { US: "USD", PT: "EUR", DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", BE: "EUR", IE: "EUR", AT: "EUR", BR: "BRL", AO: "AOA", MZ: "MZN", CV: "CVE", BW: "BWP", ZA: "ZAR", NG: "NGN", GH: "GHS", KE: "KES", GB: "GBP", CA: "CAD", MX: "MXN", CH: "CHF", SN: "XOF", CI: "XOF" };
export function detectPreferences(preferences: readonly string[], fallback: Language = "en") { let language = fallback; let currency: string | undefined; for (const tag of preferences) { try { const locale = new Intl.Locale(tag); if (!currency && locale.region) currency = countryCurrency[locale.region]; if (languages.includes(locale.language as Language)) { language = locale.language as Language; break; } } catch { /* Ignore malformed browser language tags. */ } } return { language, currency }; }
type LocaleContextValue = { language: Language; currency: string; currencies: string[]; changeLanguage: (value: Language) => void; changeCurrency: (value: string) => void; t: (value: string) => string; localize: (value: ReactNode) => ReactNode };
const Context = createContext<LocaleContextValue | null>(null);
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en"); const [currency, setCurrency] = useState("USD"); const [currencies, setCurrencies] = useState(["USD", "EUR"]);
  useEffect(() => {
    let active = true;
    async function initialize() {
      let config = { defaultLanguage: "en" as Language, defaultCurrency: "USD", displayCurrencies: ["USD", "EUR", "GBP", "BRL", "AOA", "MZN", "CVE", "BWP", "ZAR", "NGN", "GHS", "KES", "XOF", "CAD", "MXN", "CHF"] };
      try { const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1/commerce`); if (response.ok) config = await response.json(); } catch { /* Locale preference still works while API is unavailable. */ }
      let savedLanguage: string | null = null; let savedCurrency: string | null = null;
      try { savedLanguage = localStorage.getItem("dpsoft.language"); savedCurrency = localStorage.getItem("dpsoft.currency"); } catch { /* Storage can be disabled. */ }
      const detected = detectPreferences(navigator.languages, config.defaultLanguage);
      if (active) { setLanguage(languages.includes(savedLanguage as Language) ? savedLanguage as Language : detected.language); setCurrencies(config.displayCurrencies); const selected = savedCurrency ?? detected.currency ?? config.defaultCurrency; setCurrency(config.displayCurrencies.includes(selected) ? selected : config.defaultCurrency); }
    }
    void initialize(); return () => { active = false; };
  }, []);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const changeLanguage = (value: Language) => { setLanguage(value); try { localStorage.setItem("dpsoft.language", value); } catch {} };
  const changeCurrency = (value: string) => { setCurrency(value); try { localStorage.setItem("dpsoft.currency", value); } catch {} };
  const t = useCallback((value: string) => { if (language === "en") return value; const translated = translations[value.trim()]?.[language] ?? additionalTranslations[value.trim()]?.[language]; return translated ? value.replace(value.trim(), translated) : value; }, [language]);
  const localize = useCallback((value: ReactNode) => typeof value === "string" ? t(value) : value, [t]);
  return <Context.Provider value={{ language, currency, currencies, changeLanguage, changeCurrency, t, localize }}>{children}</Context.Provider>;
}
export function useLocale() { const context = useContext(Context); if (!context) throw new Error("LocaleProvider is required"); return context; }
export function LocaleControls() { const { language, currency, currencies, changeLanguage, changeCurrency } = useLocale(); return <div className="locale-controls"><select aria-label="Language / Idioma" value={language} onChange={e => changeLanguage(e.target.value as Language)}>{languages.map(code => <option key={code} value={code}>{names[code]}</option>)}</select><select aria-label="Display currency / Moeda" value={currency} onChange={e => changeCurrency(e.target.value)}>{currencies.map(code => <option key={code}>{code}</option>)}</select></div>; }
export function LocalPrice({ amountMinor, baseCurrency }: { amountMinor: number; baseCurrency: string }) {
  const { currency, language, t } = useLocale(); const [rate, setRate] = useState<{ rate: number; date: string; base: string; quote: string } | null>(null);
  useEffect(() => { let active = true; if (currency !== baseCurrency) void fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1/commerce/rate?base=${encodeURIComponent(baseCurrency)}&quote=${encodeURIComponent(currency)}`).then(async response => { if (!response.ok) return; const data = await response.json(); if (active) setRate(data); }).catch(() => {}); return () => { active = false; }; }, [currency, baseCurrency]);
  const digits = new Intl.NumberFormat(language, { style: "currency", currency: baseCurrency }).resolvedOptions().maximumFractionDigits ?? 2;
  const base = amountMinor / 10 ** digits;
  const valid = rate?.base === baseCurrency && rate.quote === currency;
  const display = new Intl.NumberFormat(language, { style: "currency", currency: valid ? currency : baseCurrency }).format(valid ? base * rate.rate : base);
  return <span className="localized-price"><strong>{valid ? "≈ " : ""}{display}</strong>{currency !== baseCurrency && <small>{valid ? `${t("Indicative exchange rate")} · ${rate.date}` : t("Conversion unavailable; showing billing currency.")}</small>}<small>{t("Charged in")} {baseCurrency}: {new Intl.NumberFormat(language, { style: "currency", currency: baseCurrency }).format(base)}</small></span>;
}
