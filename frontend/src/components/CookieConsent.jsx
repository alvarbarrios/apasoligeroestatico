import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const CONSENT_KEY = "apl_cookie_consent";

function readChoice() {
  try {
    const choice = window.localStorage.getItem(CONSENT_KEY);
    return choice === "accepted" || choice === "rejected" ? choice : null;
  } catch (error) {
    console.error("No se pudo leer la preferencia de cookies.", error);
    return null;
  }
}

function saveChoice(choice) {
  try {
    window.localStorage.setItem(CONSENT_KEY, choice);
  } catch (error) {
    console.error("No se pudo guardar la preferencia de cookies.", error);
  }
}

export default function CookieConsent() {
  const [choice, setChoice] = useState(readChoice);

  useEffect(() => {
    if (choice === "accepted") window.aplEnableAnalytics?.();
  }, [choice]);

  useEffect(() => {
    const manageConsent = () => setChoice(null);
    window.addEventListener("apl:manage-cookie-consent", manageConsent);
    return () => window.removeEventListener("apl:manage-cookie-consent", manageConsent);
  }, []);

  const choose = (nextChoice) => {
    saveChoice(nextChoice);
    if (nextChoice === "rejected") window.posthog?.opt_out_capturing?.();
    setChoice(nextChoice);
  };

  if (choice) return null;

  return (
    <aside
      role="region"
      aria-label="Preferencias de cookies"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[70] border-t border-brass/60 bg-obsidian p-4 shadow-2xl sm:p-6"
      data-testid="cookie-consent"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-3xl text-sm leading-relaxed text-sage">
          Usamos almacenamiento necesario para recordar esta elección y, solo si acepta, PostHog para analítica y
          grabación de sesiones. Puede rechazarlo o cambiar su decisión cuando quiera.{" "}
          <Link to="/privacidad-cookies" className="text-brass underline underline-offset-4">
            Política de privacidad y cookies
          </Link>
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => choose("rejected")}
            className="border border-olive-500 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-sage hover:border-brass hover:text-brass"
            data-testid="cookie-reject"
          >
            Rechazar opcionales
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="border border-brass bg-brass px-4 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-obsidian hover:bg-parchment"
            data-testid="cookie-accept"
          >
            Aceptar analítica
          </button>
        </div>
      </div>
    </aside>
  );
}
