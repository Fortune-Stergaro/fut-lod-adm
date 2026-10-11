// Small shared building blocks. Their Tailwind styling lives in this file.
// Rule: never pass a class that fights one already in the base (e.g. a second border colour); use the props instead.
export const cx = (...a) => a.filter(Boolean).join(" ");

export const selectCls = "min-h-11 rounded-[10px] border border-plum/20 bg-white px-3 py-2 font-medium text-ink focus:border-violet";
export const inputCls = `${selectCls} w-full`;
export const labelCls = "flex flex-col gap-1.5 text-[0.85rem] font-semibold text-ink";

const BTN = "inline-flex items-center justify-center gap-2 rounded-[10px] border font-display text-[13px] font-bold no-underline cursor-pointer transition disabled:cursor-not-allowed disabled:border-line disabled:bg-line disabled:text-muted disabled:shadow-none";
const VARIANTS = {
  default: "border-plum/25 bg-white text-ink hover:bg-plum/5",
  primary: "border-plum bg-plum text-white shadow-[0_4px_14px_rgba(43,16,67,0.3)] hover:bg-plum-2",
  jade: "border-amber bg-amber text-plum shadow-[0_4px_14px_rgba(255,178,52,0.3)] hover:brightness-95",
  danger: "border-booked bg-white text-booked hover:bg-booked-soft",
  light: "border-white/30 bg-transparent text-white hover:bg-white/10",
};
const SIZES = { md: "min-h-12 px-5", sm: "min-h-10 px-3" };

export function Btn({ as: Tag = "button", variant = "default", size = "md", className, ...props }) {
  return <Tag className={cx(BTN, VARIANTS[variant], SIZES[size], className)} {...props} />;
}

const PANEL_BORDER = {
  default: "border border-plum/10 shadow-[0_2px_14px_rgba(43,16,67,0.06)]",
  green: "border-2 border-plum",
  premium: "border-2 border-amber",
};
const PANEL_PAD = { md: "p-5", sm: "px-4 py-3.5", xs: "p-3.5" };
export function Panel({ accent = "default", pad = "md", className, ...props }) {
  return <div className={cx("rounded-2xl bg-white", PANEL_BORDER[accent], PANEL_PAD[pad], className)} {...props} />;
}

const TAGS = {
  plain: "border-plum/15 bg-plum/5 text-ink",
  free: "border-transparent bg-[#22C55E1F] text-[#15803D]",
  booked: "border-transparent bg-booked-soft text-booked",
  premium: "border-amber bg-amber text-plum",
  sold: "border-transparent bg-amber/20 text-[#8A5A00]",
};
export function Tag({ tone = "plain", pill = false, className, ...props }) {
  return <span className={cx("border py-0.5 font-jet text-[10px] font-bold uppercase tracking-[0.25px]", pill ? "rounded-full px-2.5" : "rounded-md px-2", TAGS[tone], className)} {...props} />;
}

export function LinkBtn({ className, ...props }) {
  return <button type="button" className={cx("cursor-pointer underline disabled:cursor-default disabled:no-underline disabled:opacity-50", className)} {...props} />;
}

// Feature chip coloured by status: essential = plum tint, convenient = violet, premium = amber.
// Selected: filled with the status colour.
const CHIP = {
  essential: ["border-plum/20 bg-white text-plum-100", "border-plum bg-plum text-white"],
  convenient: ["border-violet/30 bg-white text-violet", "border-violet bg-violet text-white"],
  premium: ["border-amber/50 bg-white text-[#8A5A00]", "border-amber bg-amber text-plum"],
};
export const statChip = (status, on) =>
  cx("cursor-pointer rounded-full border px-3.5 py-1.5 font-jet text-[11px] font-semibold", (CHIP[status] ?? CHIP.essential)[on ? 1 : 0]);

export function Modal({ label, onClose, children }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-plum-2/70 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}
        className="grid max-h-full w-full max-w-[420px] gap-3.5 overflow-auto rounded-2xl border-t-4 border-amber bg-white p-6 shadow-[0_16px_60px_rgba(43,16,67,0.35)]">
        {children}
      </div>
    </div>
  );
}
