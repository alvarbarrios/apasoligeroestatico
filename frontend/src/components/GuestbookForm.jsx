import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { PenLine, Loader2 } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;
const EMPTY = { nombre: "", lugar: "", uco: "", mensaje: "", email: "", website: "" };
const inputCls =
  "w-full border border-olive-600 bg-olive-900 px-3 py-2.5 text-sm text-parchment placeholder:text-khaki/60 focus:border-brass focus:outline-none";
const labelCls = "mb-1.5 block font-mono text-[10px] uppercase tracking-[0.25em] text-khaki";

export default function GuestbookForm({ onSigned }) {
  const [form, setForm] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.nombre.trim().length < 2) return toast.error("Indique su nombre.");
    if (form.mensaje.trim().length < 5) return toast.error("Escriba un mensaje (mínimo 5 caracteres).");
    setSending(true);
    try {
      await axios.post(`${API}/api/guestbook`, { ...form, email: form.email.trim() || null });
      toast.success("¡Firma registrada! Gracias por dejar su huella.");
      setForm(EMPTY);
      onSigned?.();
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "No se pudo registrar la firma.");
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="relative border border-olive-600/70 bg-olive-950 p-6 sm:p-8" data-testid="guestbook-form">
      <span className="absolute left-0 top-0 h-5 w-5 border-l-2 border-t-2 border-brass" />
      <span className="absolute bottom-0 right-0 h-5 w-5 border-b-2 border-r-2 border-brass" />
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-brass">Deje su huella</p>
      <h2 className="mt-2 font-display text-2xl font-extrabold uppercase tracking-tight text-parchment">Firmar el libro</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="gb-nombre">Nombre *</label>
          <input id="gb-nombre" value={form.nombre} onChange={set("nombre")} className={inputCls} required minLength={2} maxLength={80} data-testid="gb-input-nombre" />
        </div>
        <div>
          <label className={labelCls} htmlFor="gb-lugar">Lugar</label>
          <input id="gb-lugar" value={form.lugar} onChange={set("lugar")} className={inputCls} maxLength={80} placeholder="Ciudad, país" data-testid="gb-input-lugar" />
        </div>
      </div>
      <div className="mt-4">
        <label className={labelCls} htmlFor="gb-uco">UCO / Unidad (opcional)</label>
        <input id="gb-uco" value={form.uco} onChange={set("uco")} className={inputCls} maxLength={120} data-testid="gb-input-uco" />
      </div>
      <div className="mt-4">
        <label className={labelCls} htmlFor="gb-mensaje">Mensaje *</label>
        <textarea id="gb-mensaje" rows={5} value={form.mensaje} onChange={set("mensaje")} className={inputCls} required minLength={5} maxLength={1500} data-testid="gb-input-mensaje" />
        <p className="mt-1 text-right font-mono text-[9px] text-khaki">{form.mensaje.length} / 1500</p>
      </div>
      <div className="mt-2">
        <label className={labelCls} htmlFor="gb-email">E-mail (no se publica)</label>
        <input id="gb-email" type="email" value={form.email} onChange={set("email")} className={inputCls} data-testid="gb-input-email" />
      </div>
      <input
        type="text"
        name="website"
        value={form.website}
        onChange={set("website")}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
        data-testid="gb-input-honeypot"
      />
      <button
        type="submit"
        disabled={sending}
        data-testid="guestbook-submit"
        className="mt-6 flex w-full items-center justify-center gap-2 bg-brass px-6 py-3.5 font-mono text-xs uppercase tracking-[0.25em] text-obsidian transition-colors hover:bg-parchment disabled:opacity-60"
      >
        {sending ? <Loader2 size={14} className="animate-spin" /> : <PenLine size={14} />}
        {sending ? "Registrando…" : "Firmar"}
      </button>
      <p className="mt-3 text-xs leading-relaxed text-sage">
        El nombre, lugar, unidad y mensaje se publican; el correo no se muestra.{" "}
        <Link to="/privacidad-cookies" className="text-brass underline">Política de privacidad.</Link>
      </p>
    </form>
  );
}
