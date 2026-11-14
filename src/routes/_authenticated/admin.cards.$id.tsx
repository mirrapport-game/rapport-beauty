import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { REQUIRED, TYPE_LABEL, type CardInsert, type CardType } from "@/lib/library";

export const Route = createFileRoute("/_authenticated/admin/cards/$id")({
  head: () => ({ meta: [{ title: "Карточка — админка" }] }),
  component: CardEdit,
});

type Opt = { id: string; title: string };
type Form = Record<string, string>;
const LISTS = ["how_to_apply", "steps", "criteria", "tags"];

const FIELDS: Record<CardType, string[]> = {
  role: ["title", "description", "category_id", "direction_id", "tags"],
  situation: ["title", "description", "opening_line", "task", "claim_type", "level", "category_id", "direction_id", "scenario_id", "paired_with", "tags"],
  skill: ["title", "formula", "description", "how_to_apply", "why_learn", "categories", "tags"],
  solution: ["title", "scenario_id", "category_id", "direction_id", "linked_skill_id", "task", "steps", "criteria", "example_dialogue"],
};
const LABEL: Record<string, string> = {
  title: "Название", description: "Описание", opening_line: "Первая реплика", task: "Задача",
  claim_type: "Тип претензии", level: "Уровень (1–3)", category_id: "Рубрика", direction_id: "Направление",
  scenario_id: "ID сценария", paired_with: "Парная карточка (id)", tags: "Теги (по одному в строке)",
  formula: "Формула", how_to_apply: "Как применять (по шагу в строке)", why_learn: "Зачем учить",
  categories: "Рубрики", linked_skill_id: "Навык", steps: "Шаги (по одному в строке)",
  criteria: "Критерии (по одному в строке)", example_dialogue: "Пример диалога / решение",
};
const LONG = ["description", "opening_line", "task", "why_learn", "example_dialogue", ...LISTS];

function CardEdit() {
  const { id } = Route.useParams();
  const isNew = id === "new";
  const nav = useNavigate();
  const [type, setType] = useState<CardType>("situation");
  const [form, setForm] = useState<Form>({ id: "" });
  const [cats, setCats] = useState<Opt[]>([]);
  const [dirs, setDirs] = useState<Opt[]>([]);
  const [skills, setSkills] = useState<Opt[]>([]);
  const [catsSel, setCatsSel] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("categories").select("id,title").order("sort_order").then(({ data }) => setCats(data ?? []));
    supabase.from("directions").select("id,title").order("title").then(({ data }) => setDirs(data ?? []));
    supabase.from("cards").select("id,title").eq("type", "skill").order("title").then(({ data }) => setSkills(data ?? []));
    if (!isNew) supabase.from("cards").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (!data) return;
      setType(data.type as CardType);
      const f: Form = {};
      for (const [k, v] of Object.entries(data)) f[k] = v == null ? "" : Array.isArray(v) ? (v as string[]).join("\n") : String(v);
      setForm(f);
      setCatsSel((data.categories as string[] | null) ?? []);
    });
  }, [id, isNew]);

  const v = (k: string) => form[k] ?? "";
  const set = (k: string, val: string) => setForm({ ...form, [k]: val });

  const save = async () => {
    const need = REQUIRED[type].filter((k) => !v(k).trim());
    if (need.length) return toast.error(`Заполните: ${need.map((k) => LABEL[k] ?? k).join(", ")}`);
    const lvl = v("level") ? Number(v("level")) : null;
    if (lvl !== null && !(lvl >= 1 && lvl <= 3)) return toast.error("Уровень должен быть от 1 до 3");
    setBusy(true);
    // Reference checks
    for (const ref of ["linked_skill_id", "paired_with"]) {
      if (FIELDS[type].includes(ref) && v(ref)) {
        const { data } = await supabase.from("cards").select("id").eq("id", v(ref)).maybeSingle();
        if (!data) { setBusy(false); return toast.error(`${LABEL[ref]}: карточка «${v(ref)}» не найдена`); }
      }
    }
    if (FIELDS[type].includes("scenario_id") && v("scenario_id")) {
      const { data } = await supabase.from("scenarios").select("id").eq("id", v("scenario_id")).maybeSingle();
      if (!data) { setBusy(false); return toast.error(`Сценарий «${v("scenario_id")}» не найден`); }
    }
    const row: Record<string, unknown> = { id: v("id").trim(), type };
    for (const k of FIELDS[type]) {
      if (k === "categories") row["categories"] = catsSel;
      else if (LISTS.includes(k)) row[k] = v(k).split("\n").map((s) => s.trim()).filter(Boolean);
      else if (k === "level") row["level"] = lvl;
      else row[k] = v(k).trim() || null;
    }
    const { error } = isNew
      ? await supabase.from("cards").insert(row as CardInsert)
      : await supabase.from("cards").update(row as CardInsert).eq("id", id);
    setBusy(false);
    if (error) return toast.error(error.code === "23505" ? "Карточка с таким id уже есть" : "Не удалось сохранить");
    toast.success("Сохранено");
    nav({ to: "/admin/cards" });
    return undefined;
  };

  const inp = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
  const field = (k: string) => {
    if (k === "category_id") return <select className={inp} value={v(k)} onChange={(e) => set(k, e.target.value)}><option value="">—</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>;
    if (k === "direction_id") return <select className={inp} value={v(k)} onChange={(e) => set(k, e.target.value)}><option value="">—</option>{dirs.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>;
    if (k === "linked_skill_id") return <select className={inp} value={v(k)} onChange={(e) => set(k, e.target.value)}><option value="">—</option>{skills.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>;
    if (k === "claim_type") return <select className={inp} value={v(k)} onChange={(e) => set(k, e.target.value)}><option value="">—</option><option value="justified">Обоснованная</option><option value="unjustified">Необоснованная</option></select>;
    if (k === "level") return <select className={inp} value={v(k)} onChange={(e) => set(k, e.target.value)}><option value="">—</option>{[1, 2, 3].map((l) => <option key={l}>{l}</option>)}</select>;
    if (k === "categories") return (
      <div className="flex flex-wrap gap-1.5">{cats.map((c) => (
        <button type="button" key={c.id} onClick={() => setCatsSel(catsSel.includes(c.id) ? catsSel.filter((x) => x !== c.id) : [...catsSel, c.id])}
          className={`rounded-full px-2.5 py-1 text-xs ${catsSel.includes(c.id) ? "bg-primary text-primary-foreground" : "border border-input"}`}>{c.title}</button>
      ))}</div>
    );
    if (LONG.includes(k)) return <textarea rows={k === "example_dialogue" ? 6 : 3} className={inp} value={v(k)} onChange={(e) => set(k, e.target.value)} />;
    return <input className={inp} value={v(k)} onChange={(e) => set(k, e.target.value)} />;
  };

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">{isNew ? "Новая карточка" : `Карточка ${id}`}</h1>
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(TYPE_LABEL) as CardType[]).map((t) => (
          <button key={t} disabled={!isNew} onClick={() => setType(t)}
            className={`rounded-full px-3 py-1 text-sm disabled:opacity-60 ${type === t ? "bg-primary text-primary-foreground" : "border border-input"}`}>{TYPE_LABEL[t]}</button>
        ))}
      </div>
      <label className="block space-y-1"><span className="text-sm font-medium">ID *</span>
        <input disabled={!isNew} className={inp} placeholder="например, sit_reg_j01" value={v("id")} onChange={(e) => set("id", e.target.value)} />
      </label>
      {FIELDS[type].map((k) => (
        <label key={k} className="block space-y-1">
          <span className="text-sm font-medium">{LABEL[k]}{REQUIRED[type].includes(k) ? " *" : ""}</span>
          {field(k)}
        </label>
      ))}
      <div className="flex gap-2 pt-2">
        <button disabled={busy} onClick={save} className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">Сохранить</button>
        <Link to="/admin/cards" className="rounded-md border border-input px-5 py-2 text-sm">Отмена</Link>
      </div>
    </div>
  );
}
