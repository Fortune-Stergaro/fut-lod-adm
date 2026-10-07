// Small shared building blocks. Their Tailwind styling lives in this file.
// Rule: never pass a class that fights one already in the base (e.g. a second border colour); use the props instead.
export const cx = (...a) => a.filter(Boolean).join(" ");

export const selectCls = "min-h-11 rounded-lg border border-line bg-white px-3 py-2 font-medium";
export const inputCls = `${selectCls} w-full`;
export const labelCls = "flex flex-col gap-1 text-[0.85rem] font-bold";

const BTN = "inline-flex items-center justify-center gap-2 rounded-[10px] border-2 font-bold no-underline cursor-pointer disabled:cursor-not-allowed disabled:border-line disabled:bg-line disabled:text-muted";
const VARIANTS = {
  default: "border-ink bg-white text-ink",
  primary: "border-green bg-green text-white",
  jade: "border-jade bg-jade text-white",
  danger: "border-booked bg-white text-booked",
  light: "border-[#6f8a81] bg-transparent text-white",
};
const SIZES = { md: "min-h-12 px-5", sm: "min-h-10 px-3 text-sm" };

export function Btn({ as: Tag = "button", variant = "default", size = "md", className, ...props }) {
  return <Tag className={cx(BTN, VARIANTS[variant], SIZES[size], className)} {...props} />;
}

const PANEL_BORDER = { default: "border border-line", green: "border-2 border-green", premium: "border-2 border-premium" };
const PANEL_PAD = { md: "p-5", sm: "px-4 py-3.5", xs: "p-3.5" };
export function Panel({ accent = "default", pad = "md", className, ...props }) {
  return <div className={cx("rounded-[14px] bg-white", PANEL_BORDER[accent], PANEL_PAD[pad], className)} {...props} />;
}

const TAGS = {
  plain: "border-line bg-paper text-ink",
  free: "border-transparent bg-green-soft text-green",
  booked: "border-transparent bg-booked-soft text-booked",
  premium: "border-premium bg-premium text-white",
  sold: "border-transparent bg-sold-soft text-sold",
};
export function Tag({ tone = "plain", pill = false, className, ...props }) {
  return <span className={cx("border py-0.5 text-xs font-bold", pill ? "rounded-full px-2.5" : "rounded-md px-2", TAGS[tone], className)} {...props} />;
}

export function LinkBtn({ className, ...props }) {
  return <button type="button" className={cx("cursor-pointer underline disabled:cursor-default disabled:no-underline disabled:opacity-50", className)} {...props} />;
}

// Stat chip coloured by status: essential = silver, convenient = gold, premium = purple.
// Selected: the border colour becomes the background and the text turns white.
const CHIP = {
  essential: ["border-silver bg-white text-[#4b555c]", "border-silver bg-silver text-white"],
  convenient: ["border-gold-line bg-white text-gold", "border-gold-line bg-gold-line text-white"],
  premium: ["border-premium bg-white text-premium", "border-premium bg-premium text-white"],
};
export const statChip = (status, on) =>
  cx("cursor-pointer rounded-full border px-3.5 py-1.5 text-[0.85rem]", (CHIP[status] ?? CHIP.essential)[on ? 1 : 0]);

export function Modal({ label, onClose, children }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}
        className="grid max-h-full w-full max-w-[420px] gap-3.5 overflow-auto rounded-[10px] bg-white p-6">
        {children}
      </div>
    </div>
  );
}
