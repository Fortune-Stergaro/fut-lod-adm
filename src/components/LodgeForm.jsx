import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AGENT, naira } from "../lib/constants.js";
import { uploadVideo, removeVideo } from "../lib/video.js";
import StatEditor from "./StatEditor.jsx";
import { Btn, cx, inputCls, labelCls } from "./ui.jsx";

const blank = { lodge_name: "", name: "", location: "", rooms: 1, units_total: 1, price_first_year: "", price_yearly: "", agent_id: "", stats: [] };
const hint = "text-[0.92rem] text-muted";

// One lodge form for the owner (add / edit / review) and for agents (submit / resend).
// onSave(row, actionKey) must return an error message, or nothing on success.
// actions: [{ key, label, variant }]; the first one is the submit button. The "reject" key skips validation.
export default function LodgeForm({
  mode = "admin", initial = null, agents = [], lockedAgent = null, categories = [], onCategoriesChanged,
  onSave, onCancel, title, top, actions, canDeleteVideos = false,
}) {
  const isAgent = mode === "agent";
  const list = actions ?? [{ key: "save", label: initial ? "Save changes" : "Add lodge", variant: "primary" }];
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState("");
  const [active, setActive] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState(() =>
    initial
      ? {
          lodge_name: initial.lodge_name ?? "", name: initial.name, location: initial.location ?? "", rooms: initial.rooms,
          units_total: initial.units_total,
          // an agent editing a rejected lodge sees their own base price, not the owner's adjusted one
          price_first_year: isAgent && initial.agent_price_first_year != null ? initial.agent_price_first_year : initial.price_first_year,
          price_yearly: isAgent && initial.agent_price_yearly != null ? initial.agent_price_yearly : initial.price_yearly,
          agent_id: initial.agent_id ?? "", stats: initial.stats ?? [],
        }
      : blank
  );
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  function validate() {
    const rooms = Number(form.rooms), units = Number(form.units_total);
    const first = Number(form.price_first_year), yearly = Number(form.price_yearly);
    if (form.lodge_name.trim().length < 2) return "Enter the lodge's name.";
    if (form.name.trim().length < 2) return "Enter the apartment type, e.g. Single room self-contain.";
    if (!Number.isInteger(rooms) || rooms < 1) return "Rooms must be a whole number, 1 or more.";
    if (!Number.isInteger(units) || units < 1) return "Apartments available must be a whole number, 1 or more.";
    const taken = (initial?.booked_count ?? 0) + (initial?.sold_count ?? 0);
    if (initial && units < taken) return `${initial.booked_count} are booked and ${initial.sold_count} sold, so this can't be below ${taken}.`;
    if (form.price_first_year === "" || form.price_yearly === "" || !(first >= 0) || !(yearly >= 0)) return "Enter both prices.";
    if (!isAgent && !form.agent_id) return "Choose an agent for this lodge.";
    if (!initial && !file) return "Choose a video of the lodge.";
    return {
      lodge_name: form.lodge_name.trim(), name: form.name.trim(), location: form.location.trim() || null,
      rooms, units_total: units, price_first_year: first, price_yearly: yearly, stats: form.stats,
      ...(isAgent ? {} : { agent_id: form.agent_id }),
    };
  }

  async function run(key) {
    setError(""); setActive(key);
    let row = null;
    if (key !== "reject") {
      const v = validate();
      if (typeof v === "string") return setError(v);
      row = v;
    }
    try {
      if (row && file) { setBusy("Uploading video…"); row.video_url = await uploadVideo(file); }
      setBusy("Saving…");
      const err = await onSave(row, key);
      if (err) {
        if (row?.video_url && canDeleteVideos) await removeVideo(row.video_url);
        throw new Error(err);
      }
      if (row?.video_url && initial?.video_url && canDeleteVideos) await removeVideo(initial.video_url);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); run(list[0].key); }} className="grid content-start gap-4">
      {title && <h2 className="font-display text-xl">{title}</h2>}
      {top}

      {!isAgent && agents.length === 0 && (
        <p className="rounded-lg bg-sold-soft px-4 py-3 text-[#6b4600]">Add an agent first on the <Link to="/admin/agents" className="underline">Agents</Link> page.</p>
      )}

      <label className={labelCls}>Lodge name
        <input className={inputCls} value={form.lodge_name} onChange={(e) => set({ lodge_name: e.target.value })} placeholder="Fortune Lodge" />
      </label>
      <label className={labelCls}>Apartment type
        <input className={inputCls} value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Single room self-contain" />
      </label>
      <label className={labelCls}>Area
        <input className={inputCls} value={form.location} onChange={(e) => set({ location: e.target.value })} placeholder="Bosso Estate" />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>Rooms per apartment
          <input className={inputCls} type="number" min="1" value={form.rooms} onChange={(e) => set({ rooms: e.target.value })} />
        </label>
        <label className={labelCls}>Apartments available
          <input className={inputCls} type="number" min="1" value={form.units_total} onChange={(e) => set({ units_total: e.target.value })} />
        </label>
      </div>
      {initial && !isAgent && <p className={hint}>Raise "Apartments available" when a vacancy opens up in this lodge.</p>}

      {isAgent && (
        <p className="rounded-lg bg-sold-soft px-4 py-3 text-[0.92rem] text-[#6b4600]">
          <strong>About pricing:</strong> enter your own base price. {AGENT.name} will add a fee on top before the lodge goes live, and the fee varies with the lodge's base price.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>{isAgent ? "Your first-year price (₦)" : "First-year price (₦)"}
          <input className={inputCls} type="number" min="0" value={form.price_first_year} onChange={(e) => set({ price_first_year: e.target.value })} />
        </label>
        <label className={labelCls}>{isAgent ? "Your yearly price after (₦)" : "Yearly price after (₦)"}
          <input className={inputCls} type="number" min="0" value={form.price_yearly} onChange={(e) => set({ price_yearly: e.target.value })} />
        </label>
      </div>
      {!isAgent && initial?.agent_price_first_year != null && (
        <p className="rounded-lg bg-paper px-3 py-2.5 text-[0.9rem]">
          Agent asked for <strong>{naira(initial.agent_price_first_year)}</strong> first year and <strong>{naira(initial.agent_price_yearly)}</strong> per year. Add your fee in the fields above before approving.
        </p>
      )}

      <label className={labelCls}>Agent
        {isAgent ? (
          <>
            <input className={cx(inputCls, "bg-paper")} value={lockedAgent?.name ?? ""} disabled readOnly />
            <span className={cx(hint, "font-normal")}>This is you. It can't be changed.</span>
          </>
        ) : (
          <select className={inputCls} value={form.agent_id} onChange={(e) => set({ agent_id: e.target.value })}>
            <option value="">Select an agent</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
      </label>

      <StatEditor stats={form.stats} onChange={(stats) => set({ stats })} categories={categories}
        onCategoriesChanged={onCategoriesChanged} local={isAgent} />

      <label className={labelCls}>{initial ? "Replace video (optional)" : "Video"}
        <input ref={fileRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="font-medium"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <span className={cx(hint, "font-normal")}>MP4 or WebM, up to 50 MB. Short clips (30 to 60 seconds) load fastest.</span>
      </label>
      {initial?.video_url && !file && <video className="max-h-[220px] w-full rounded-[10px] bg-black" src={initial.video_url} controls muted playsInline />}
      {file && <p className={hint}>Selected: {file.name} ({(file.size / 1048576).toFixed(1)} MB)</p>}

      {error && <p className="text-booked" role="alert">{error}</p>}
      <div className="flex flex-wrap gap-2.5">
        {list.map((a, i) => (
          <Btn key={a.key} type={i === 0 ? "submit" : "button"} variant={a.variant ?? "default"} disabled={!!busy}
            onClick={i === 0 ? undefined : () => run(a.key)}>
            {busy && active === a.key ? busy : a.label}
          </Btn>
        ))}
        {onCancel && <Btn type="button" onClick={onCancel} disabled={!!busy}>Cancel</Btn>}
      </div>
    </form>
  );
}
