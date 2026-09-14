import React, { useState, useEffect, useMemo } from "react";
import {
  Wind, LayoutGrid, Users, AlertTriangle, Wallet, Package, CalendarClock,
  Plus, Search, Trash2, Pencil, X, CheckCircle2, Phone, MapPin,
  ArrowLeft, TriangleAlert, PackageX, ReceiptText, Wrench, LogOut, Image, 
  FileText, Download,
} from "lucide-react";
import { supabase } from "./supabaseClient";
import Auth from "./Auth";

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

const money = (n) => "$" + Math.round(Number(n) || 0).toLocaleString("es-CO");

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const addMonths = (iso, months) => {
  const d = new Date(iso + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
};

const daysBetween = (isoA, isoB) => {
  const a = new Date(isoA + "T00:00:00");
  const b = new Date(isoB + "T00:00:00");
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
};

// Genera el calendario de mantenimientos (cada 6 meses) para una instalación.
// `completions` es el arreglo completo de filas de maintenance_completions.
function buildMaintenanceSchedule(installation, completions) {
  if (!installation?.install_date) return [];
  const done = completions.filter((c) => c.installation_id === installation.id).map((c) => c.scheduled_date);
  const today = todayISO();
  const schedule = [];
  let n = 1;
  let cursor = addMonths(installation.install_date, 6);
  while (
    daysBetween(cursor, addMonths(today, 6)) >= 0 ||
    (done.length && n <= done.length + 1)
  ) {
    const isCompleted = done.includes(cursor);
    const diff = daysBetween(today, cursor);
    let status = "programado";
    if (isCompleted) status = "completado";
    else if (diff < 0) status = "vencido";
    else if (diff <= 30) status = "proximo";
    schedule.push({ n, date: cursor, status });
    if (schedule.length > 40) break;
    cursor = addMonths(cursor, 6);
    n++;
  }
  return schedule;
}

// ---------------------------------------------------------------------------
// Acceso a datos (Supabase)
// ---------------------------------------------------------------------------

async function fetchAll(table, orderCol = "created_at") {
  const { data, error } = await supabase.from(table).select("*").order(orderCol, { ascending: false });
  if (error) { console.error(table, error); return []; }
  return data;
}

// ---------------------------------------------------------------------------
// Componentes reutilizables
// ---------------------------------------------------------------------------

function StatCard({ icon: Icon, label, value, tone = "slate", onClick }) {
  const tones = {
    slate: "bg-slate-800 text-cyan-300",
    amber: "bg-amber-500/15 text-amber-400",
    rose: "bg-rose-500/15 text-rose-400",
    emerald: "bg-emerald-500/15 text-emerald-400",
  };
  return (
    <button onClick={onClick} className="text-left bg-white rounded-lg border border-slate-200 p-4 flex items-center gap-3 hover:border-slate-300 transition-colors">
      <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${tones[tone]}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-semibold text-slate-900 tabular-nums leading-tight">{value}</div>
        <div className="text-sm text-slate-500 truncate">{label}</div>
      </div>
    </button>
  );
}

function Badge({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
    emerald: "bg-emerald-100 text-emerald-700",
    cyan: "bg-cyan-100 text-cyan-700",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-start sm:items-center justify-center z-50 p-3 overflow-y-auto">
      <div className={`bg-white rounded-xl shadow-xl w-full ${wide ? "max-w-2xl" : "max-w-md"} my-6`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-medium text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500";

function Btn({ children, onClick, tone = "primary", type = "button", size = "md", disabled }) {
  const tones = {
    primary: "bg-cyan-600 text-white hover:bg-cyan-700",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
    danger: "bg-rose-50 text-rose-600 hover:bg-rose-100",
    dark: "bg-slate-900 text-white hover:bg-slate-800",
  };
  const sizes = { md: "px-4 py-2 text-sm", sm: "px-3 py-1.5 text-xs" };
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      className={`rounded-md font-medium transition-colors inline-flex items-center gap-1.5 disabled:opacity-40 ${tones[tone]} ${sizes[size]}`}>
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// App principal
// ---------------------------------------------------------------------------

const TABS = [
  { id: "dashboard", label: "Panel", icon: LayoutGrid },
  { id: "installations", label: "Instalaciones", icon: Users },
  { id: "quotes", label: "Cotizaciones", icon: FileText },
  { id: "accounting", label: "Contabilidad", icon: Wallet },
  { id: "logs", label: "Logs de manejadoras", icon: AlertTriangle },
  { id: "materials", label: "Materiales", icon: Package },
  { id: "maintenance", label: "Mantenimientos", icon: CalendarClock },
];

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = cargando, null = sin sesión
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("dashboard");

  const [installations, setInstallations] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [accounting, setAccounting] = useState([]);
  const [logs, setLogs] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [quotes, setQuotes] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const [inst, mats, acc, lg, comp, qts] = await Promise.all([
        fetchAll("installations"),
        fetchAll("materials"),
        fetchAll("accounting"),
        fetchAll("logs"),
        fetchAll("maintenance_completions"),
        fetchAll("quotes"),
      ]);
      setInstallations(inst);
      setMaterials(mats);
      setAccounting(acc);
      setLogs(lg);
      setCompletions(comp);
      setQuotes(qts);
      setReady(true);
    })();
  }, [session]);

  const lowStockMaterials = materials.filter((m) => Number(m.quantity) <= 5);

  const allSchedules = useMemo(
    () => installations.flatMap((inst) => buildMaintenanceSchedule(inst, completions).map((s) => ({ ...s, installation: inst }))),
    [installations, completions]
  );
  const overdueMaintenance = allSchedules.filter((s) => s.status === "vencido");
  const upcomingMaintenance = allSchedules.filter((s) => s.status === "proximo");

  const pendingAmount = accounting.reduce((sum, a) => {
    if (a.payment_status === "Pagado") return sum;
    if (a.payment_status === "Parcial") return sum + (Number(a.total) - Number(a.paid_amount || 0));
    return sum + Number(a.total);
  }, 0);

  if (session === undefined) {
    return <div className="min-h-[400px] flex items-center justify-center text-slate-400 text-sm">Cargando…</div>;
  }
  if (!session) return <Auth />;

  if (!ready) {
    return <div className="min-h-[400px] flex items-center justify-center text-slate-400 text-sm">Cargando datos…</div>;
  }

  return (
    <div className="min-h-[600px] bg-slate-50 text-slate-900 rounded-xl overflow-hidden border border-slate-200">
      <div className="bg-slate-900 px-5 py-4 flex items-center gap-3">
        <img 
          src="https://rdwxhhxfcqcnekstyjws.supabase.co/storage/v1/object/public/fotos-mantenimiento/WhatsApp%20Image%202026-07-28%20at%207.13.06%20PM.jpeg" 
          alt="Logo" 
          className="w-12 h-12 object-contain rounded-lg bg-white/10 p-1"
        />
        <div className="flex-1">
          <div className="text-white font-semibold leading-tight">MANTENIMIENTO DEL VALLE</div>
          <div className="text-slate-400 text-xs">Servicio de Electricidad y Refrigeracion</div>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="text-slate-400 hover:text-white p-2" title="Cerrar sesión">
          <LogOut size={16} />
        </button>
      </div>

      <div className="bg-slate-900 px-3 pb-2 flex gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-t-md text-sm font-medium transition-colors ${active ? "bg-slate-50 text-slate-900" : "text-slate-400 hover:text-slate-200"}`}>
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="p-4 sm:p-6">
        {tab === "dashboard" && (
          <Dashboard installations={installations} lowStockMaterials={lowStockMaterials}
            overdueMaintenance={overdueMaintenance} upcomingMaintenance={upcomingMaintenance}
            pendingAmount={pendingAmount} goTo={setTab} />
        )}
        {tab === "installations" && (
          <InstallationsTab installations={installations} setInstallations={setInstallations}
            accounting={accounting} setAccounting={setAccounting} logs={logs} setLogs={setLogs}
            completions={completions} setCompletions={setCompletions} />
        )}
        {tab === "quotes" && (
          <QuotesTab quotes={quotes} setQuotes={setQuotes} installations={installations} />
        )}
        {tab === "accounting" && (
          <AccountingTab installations={installations} accounting={accounting} setAccounting={setAccounting}
            materials={materials} setMaterials={setMaterials} />
        )}
        {tab === "logs" && <LogsTab installations={installations} logs={logs} setLogs={setLogs} />}
        {tab === "materials" && <MaterialsTab materials={materials} setMaterials={setMaterials} />}
        {tab === "maintenance" && (
          <MaintenanceTab installations={installations} completions={completions} setCompletions={setCompletions} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel (Dashboard)
// ---------------------------------------------------------------------------

function Dashboard({ installations, lowStockMaterials, overdueMaintenance, upcomingMaintenance, pendingAmount, goTo }) {
  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Users} label="Instalaciones activas" value={installations.length} onClick={() => goTo("installations")} />
        <StatCard icon={TriangleAlert} label="Mantenimientos vencidos" value={overdueMaintenance.length} tone="rose" onClick={() => goTo("maintenance")} />
        <StatCard icon={PackageX} label="Materiales con bajo stock" value={lowStockMaterials.length} tone="amber" onClick={() => goTo("materials")} />
        <StatCard icon={ReceiptText} label="Por cobrar" value={money(pendingAmount)} tone="emerald" onClick={() => goTo("accounting")} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><TriangleAlert size={16} className="text-rose-500" /> Mantenimientos vencidos o próximos</h3>
          {overdueMaintenance.length + upcomingMaintenance.length === 0 ? (
            <p className="text-sm text-slate-400">No hay mantenimientos pendientes por ahora.</p>
          ) : (
            <ul className="space-y-2">
              {[...overdueMaintenance, ...upcomingMaintenance].slice(0, 6).map((s, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{s.installation.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-mono text-xs">{fmtDate(s.date)}</span>
                    <Badge tone={s.status === "vencido" ? "rose" : "amber"}>{s.status === "vencido" ? "Vencido" : "Próximo"}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><PackageX size={16} className="text-amber-500" /> Bajo stock en bodega</h3>
          {lowStockMaterials.length === 0 ? (
            <p className="text-sm text-slate-400">El inventario está en buen nivel.</p>
          ) : (
            <ul className="space-y-2">
              {lowStockMaterials.slice(0, 6).map((m) => (
                <li key={m.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{m.name}</span>
                  <span className="font-mono text-xs text-amber-600">{m.quantity} {m.unit}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Instalaciones
// ---------------------------------------------------------------------------

function emptyInstallation() {
  return { id: null, name: "", phone: "", address: "", equipment_type: "", install_date: todayISO(), notes: "" };
}

function InstallationsTab({ installations, setInstallations, accounting, setAccounting, logs, setLogs, completions, setCompletions }) {
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const filtered = installations.filter((i) => [i.name, i.address, i.phone].join(" ").toLowerCase().includes(query.toLowerCase()));

  async function save() {
    if (!form.name.trim()) return;
    const { id, ...payload } = form;
    if (id) {
      const { data, error } = await supabase.from("installations").update(payload).eq("id", id).select().single();
      if (!error) setInstallations(installations.map((i) => (i.id === id ? data : i)));
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("installations").insert({ ...payload, owner_id: user.id }).select().single();
      if (!error) setInstallations([data, ...installations]);
    }
    setForm(null);
  }

  async function remove(id) {
    if (!confirm("¿Eliminar esta instalación y sus registros asociados?")) return;
    await supabase.from("installations").delete().eq("id", id);
    setInstallations(installations.filter((i) => i.id !== id));
    setAccounting(accounting.filter((a) => a.installation_id !== id));
    setLogs(logs.filter((l) => l.installation_id !== id));
    setCompletions(completions.filter((c) => c.installation_id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  const selected = installations.find((i) => i.id === selectedId);

  if (selected) {
    return (
      <InstallationDetail
        installation={selected}
        onBack={() => setSelectedId(null)}
        accounting={accounting.filter((a) => a.installation_id === selected.id)}
        logs={logs.filter((l) => l.installation_id === selected.id)}
        schedule={buildMaintenanceSchedule(selected, completions)}
        onEdit={() => setForm(selected)}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input className={inputCls + " pl-8"} placeholder="Buscar por nombre, dirección o teléfono" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Btn onClick={() => setForm(emptyInstallation())}><Plus size={15} /> Nueva instalación</Btn>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-400">No hay instalaciones registradas todavía.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((i) => (
            <div key={i.id} className="bg-white rounded-lg border border-slate-200 p-4 hover:border-cyan-300 transition-colors">
              <button className="text-left w-full" onClick={() => setSelectedId(i.id)}>
                <div className="font-semibold text-slate-900">{i.name}</div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1"><MapPin size={12} /> {i.address}</div>
                <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 font-mono"><Phone size={12} /> {i.phone}</div>
              </button>
              <div className="flex items-center justify-between mt-3">
                <Badge tone="cyan">{i.equipment_type || "Equipo sin especificar"}</Badge>
                <div className="flex gap-1">
                  <button onClick={() => setForm(i)} className="text-slate-400 hover:text-slate-600 p-1"><Pencil size={14} /></button>
                  <button onClick={() => remove(i.id)} className="text-slate-400 hover:text-rose-500 p-1"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {form && (
        <Modal title={form.id ? "Editar instalación" : "Nueva instalación"} onClose={() => setForm(null)}>
          <Field label="Nombre del cliente"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Teléfono"><input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Dirección"><input className={inputCls} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <Field label="Tipo / modelo de equipo"><input className={inputCls} value={form.equipment_type} onChange={(e) => setForm({ ...form, equipment_type: e.target.value })} placeholder="Ej: Split 12000 BTU Inverter" /></Field>
          <Field label="Fecha de instalación"><input type="date" className={inputCls} value={form.install_date} onChange={(e) => setForm({ ...form, install_date: e.target.value })} /></Field>
          <Field label="Notas"><textarea className={inputCls} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 mt-4">
            <Btn tone="ghost" onClick={() => setForm(null)}>Cancelar</Btn>
            <Btn onClick={save}>Guardar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function InstallationDetail({ installation, onBack, accounting, logs, schedule, onEdit }) {
  const totalFacturado = accounting.reduce((s, a) => s + Number(a.total || 0), 0);
  const nextMaintenance = schedule.find((s) => s.status !== "completado");

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"><ArrowLeft size={15} /> Volver a instalaciones</button>

      <div className="bg-white rounded-lg border border-slate-200 p-5 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{installation.name}</h2>
            <div className="text-sm text-slate-500 mt-1 flex items-center gap-1"><MapPin size={13} /> {installation.address}</div>
            <div className="text-sm text-slate-500 mt-0.5 flex items-center gap-1 font-mono"><Phone size={13} /> {installation.phone}</div>
          </div>
          <Btn tone="ghost" size="sm" onClick={onEdit}><Pencil size={13} /> Editar</Btn>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 text-sm">
          <div><div className="text-slate-400 text-xs">Equipo</div><div className="font-medium text-slate-700">{installation.equipment_type || "—"}</div></div>
          <div><div className="text-slate-400 text-xs">Instalado el</div><div className="font-medium text-slate-700 font-mono">{fmtDate(installation.install_date)}</div></div>
          <div><div className="text-slate-400 text-xs">Próximo mantenimiento</div><div className="font-medium text-slate-700 font-mono">{nextMaintenance ? fmtDate(nextMaintenance.date) : "—"}</div></div>
        </div>
        {installation.notes && <p className="text-sm text-slate-500 mt-3">{installation.notes}</p>}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Wallet size={15} className="text-emerald-500" /> Contabilidad ({money(totalFacturado)} facturado)</h3>
          {accounting.length === 0 ? <p className="text-sm text-slate-400">Sin registros de contabilidad.</p> : (
            <ul className="space-y-2">
              {accounting.map((a) => (
                <li key={a.id} className="flex items-center justify-between text-sm">
                  <span className="font-mono text-xs text-slate-400">{fmtDate(a.date)}</span>
                  <span className="text-slate-700">{money(a.total)}</span>
                  <Badge tone={a.payment_status === "Pagado" ? "emerald" : a.payment_status === "Parcial" ? "amber" : "rose"}>{a.payment_status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><AlertTriangle size={15} className="text-rose-500" /> Logs de la manejadora</h3>
          {logs.length === 0 ? <p className="text-sm text-slate-400">Sin errores registrados.</p> : (
            <ul className="space-y-2">
              {logs.map((l) => (
                <li key={l.id} className="text-sm flex items-center justify-between">
                  <span className="font-mono text-xs text-slate-400">{fmtDate(l.date)}</span>
                  <span className="text-slate-700 truncate max-w-[140px]">{l.error_code}</span>
                  <Badge tone={l.resolved ? "emerald" : "rose"}>{l.resolved ? "Resuelto" : "Abierto"}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4 mt-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><CalendarClock size={15} className="text-cyan-500" /> Calendario de mantenimientos</h3>
        <ul className="grid sm:grid-cols-2 gap-2">
          {schedule.map((s) => (
            <li key={s.n} className="flex items-center justify-between text-sm border border-slate-100 rounded px-3 py-2">
              <span className="text-slate-500 text-xs">Mant. #{s.n}</span>
              <span className="font-mono text-xs text-slate-600">{fmtDate(s.date)}</span>
              <Badge tone={s.status === "completado" ? "emerald" : s.status === "vencido" ? "rose" : s.status === "proximo" ? "amber" : "slate"}>
                {{ completado: "Completado", vencido: "Vencido", proximo: "Próximo", programado: "Programado" }[s.status]}
              </Badge>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Contabilidad
// ---------------------------------------------------------------------------

function emptyAccountingEntry(installationId) {
  return { id: null, installation_id: installationId || "", date: todayISO(), labor_cost: 0, items: [], payment_status: "Pendiente", paid_amount: 0, notes: "" };
}

function AccountingTab({ installations, accounting, setAccounting, materials, setMaterials }) {
  const [installationFilter, setInstallationFilter] = useState("all");
  const [form, setForm] = useState(null);

  const list = accounting.filter((a) => installationFilter === "all" || a.installation_id === installationFilter).sort((a, b) => (a.date < b.date ? 1 : -1));

  function computeTotal(entry) {
    const itemsTotal = entry.items.reduce((s, it) => s + Number(it.qty) * Number(it.unit_cost), 0);
    return itemsTotal + Number(entry.labor_cost || 0);
  }

  function addItemRow() { setForm({ ...form, items: [...form.items, { material_id: "", name: "", qty: 1, unit_cost: 0 }] }); }
  function updateItem(idx, patch) { setForm({ ...form, items: form.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) }); }
  function removeItem(idx) { setForm({ ...form, items: form.items.filter((_, i) => i !== idx) }); }

  async function save() {
    if (!form.installation_id) return;
    const total = computeTotal(form);
    const { id, ...payload } = { ...form, total };

    if (!id) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("accounting").insert({ ...payload, owner_id: user.id }).select().single();
      if (!error) {
        setAccounting([data, ...accounting]);
        // Descuenta del inventario los materiales usados
        for (const it of payload.items) {
          if (!it.material_id) continue;
          const mat = materials.find((m) => m.id === it.material_id);
          if (!mat) continue;
          const newQty = Math.max(0, Number(mat.quantity) - Number(it.qty));
          const { data: updated } = await supabase.from("materials").update({ quantity: newQty }).eq("id", mat.id).select().single();
          if (updated) setMaterials((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        }
      }
    } else {
      const { data, error } = await supabase.from("accounting").update(payload).eq("id", id).select().single();
      if (!error) setAccounting(accounting.map((a) => (a.id === id ? data : a)));
    }
    setForm(null);
  }

  async function remove(id) {
    if (!confirm("¿Eliminar este registro de contabilidad?")) return;
    await supabase.from("accounting").delete().eq("id", id);
    setAccounting(accounting.filter((a) => a.id !== id));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select className={inputCls + " max-w-xs"} value={installationFilter} onChange={(e) => setInstallationFilter(e.target.value)}>
          <option value="all">Todas las instalaciones</option>
          {installations.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <Btn onClick={() => setForm(emptyAccountingEntry(installationFilter !== "all" ? installationFilter : ""))} disabled={installations.length === 0}>
          <Plus size={15} /> Nuevo registro
        </Btn>
      </div>

      {installations.length === 0 && <p className="text-sm text-slate-400">Registra primero una instalación para poder facturarla.</p>}

      {list.length === 0 && installations.length > 0 ? (
        <p className="text-sm text-slate-400">No hay registros de contabilidad para este filtro.</p>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Fecha</th>
                <th className="text-left px-4 py-2 font-medium">Instalación</th>
                <th className="text-left px-4 py-2 font-medium">Materiales</th>
                <th className="text-right px-4 py-2 font-medium">Total</th>
                <th className="text-left px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-mono text-xs">{fmtDate(a.date)}</td>
                  <td className="px-4 py-2">{installations.find((i) => i.id === a.installation_id)?.name || "—"}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">{a.items.length} ítem(s)</td>
                  <td className="px-4 py-2 text-right font-medium">{money(a.total)}</td>
                  <td className="px-4 py-2"><Badge tone={a.payment_status === "Pagado" ? "emerald" : a.payment_status === "Parcial" ? "amber" : "rose"}>{a.payment_status}</Badge></td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => setForm(a)} className="text-slate-400 hover:text-slate-600 p-1"><Pencil size={14} /></button>
                      <button onClick={() => remove(a.id)} className="text-slate-400 hover:text-rose-500 p-1"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <Modal title={form.id ? "Editar registro" : "Nuevo registro de contabilidad"} onClose={() => setForm(null)} wide>
          <Field label="Instalación">
            <select className={inputCls} value={form.installation_id} onChange={(e) => setForm({ ...form, installation_id: e.target.value })}>
              <option value="">Selecciona una instalación</option>
              {installations.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </Field>
          <Field label="Fecha"><input type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>

          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Materiales utilizados</span>
            <Btn size="sm" tone="ghost" onClick={addItemRow}><Plus size={13} /> Agregar material</Btn>
          </div>
          <div className="space-y-2 mb-4">
            {form.items.map((it, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <select className={inputCls} value={it.material_id} onChange={(e) => {
                  const mat = materials.find((m) => m.id === e.target.value);
                  updateItem(idx, { material_id: e.target.value, name: mat?.name || "", unit_cost: mat?.unit_cost || 0 });
                }}>
                  <option value="">Material…</option>
                  {materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.quantity} {m.unit} en bodega)</option>)}
                </select>
                <input type="number" min="0" className={inputCls + " w-20"} value={it.qty} onChange={(e) => updateItem(idx, { qty: e.target.value })} />
                <input type="number" min="0" className={inputCls + " w-28"} value={it.unit_cost} onChange={(e) => updateItem(idx, { unit_cost: e.target.value })} />
                <button onClick={() => removeItem(idx)} className="text-slate-400 hover:text-rose-500 shrink-0"><X size={16} /></button>
              </div>
            ))}
            {materials.length === 0 && <p className="text-xs text-slate-400">No hay materiales en el inventario. Agrégalos en la pestaña Materiales.</p>}
          </div>

          <Field label="Costo de mano de obra"><input type="number" min="0" className={inputCls} value={form.labor_cost} onChange={(e) => setForm({ ...form, labor_cost: e.target.value })} /></Field>

          <Field label="Estado de pago">
            <select className={inputCls} value={form.payment_status} onChange={(e) => setForm({ ...form, payment_status: e.target.value })}>
              <option>Pendiente</option><option>Parcial</option><option>Pagado</option>
            </select>
          </Field>

          {form.payment_status === "Parcial" && (
            <Field label="Monto abonado"><input type="number" min="0" className={inputCls} value={form.paid_amount} onChange={(e) => setForm({ ...form, paid_amount: e.target.value })} /></Field>
          )}

          <Field label="Notas"><textarea rows={2} className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-2">
            <span className="text-sm text-slate-500">Total</span>
            <span className="text-lg font-semibold">{money(computeTotal(form))}</span>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Btn tone="ghost" onClick={() => setForm(null)}>Cancelar</Btn>
            <Btn onClick={save}>Guardar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Logs de manejadoras
// ---------------------------------------------------------------------------

function emptyLog(installationId) {
  return { id: null, installation_id: installationId || "", date: todayISO(), error_code: "", description: "", resolved: false };
}

function LogsTab({ installations, logs, setLogs }) {
  const [installationFilter, setInstallationFilter] = useState("all");
  const [form, setForm] = useState(null);

  const list = logs.filter((l) => installationFilter === "all" || l.installation_id === installationFilter).sort((a, b) => (a.date < b.date ? 1 : -1));

  async function save() {
    if (!form.installation_id || !form.error_code.trim()) return;
    const { id, ...payload } = form;
    if (id) {
      const { data, error } = await supabase.from("logs").update(payload).eq("id", id).select().single();
      if (!error) setLogs(logs.map((l) => (l.id === id ? data : l)));
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("logs").insert({ ...payload, owner_id: user.id }).select().single();
      if (!error) setLogs([data, ...logs]);
    }
    setForm(null);
  }

  async function toggleResolved(l) {
    const { data, error } = await supabase.from("logs").update({ resolved: !l.resolved }).eq("id", l.id).select().single();
    if (!error) setLogs(logs.map((x) => (x.id === l.id ? data : x)));
  }

  async function remove(id) {
    if (!confirm("¿Eliminar este log?")) return;
    await supabase.from("logs").delete().eq("id", id);
    setLogs(logs.filter((l) => l.id !== id));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select className={inputCls + " max-w-xs"} value={installationFilter} onChange={(e) => setInstallationFilter(e.target.value)}>
          <option value="all">Todas las manejadoras</option>
          {installations.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <Btn onClick={() => setForm(emptyLog(installationFilter !== "all" ? installationFilter : ""))} disabled={installations.length === 0}>
          <Plus size={15} /> Registrar error
        </Btn>
      </div>

      {installations.length === 0 && <p className="text-sm text-slate-400">Registra primero una instalación para poder anotarle errores.</p>}

      {list.length === 0 && installations.length > 0 ? (
        <p className="text-sm text-slate-400">No hay errores registrados para este filtro.</p>
      ) : (
        <div className="space-y-2">
          {list.map((l) => (
            <div key={l.id} className="bg-white rounded-lg border border-slate-200 p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-slate-400">{fmtDate(l.date)}</span>
                  <span className="font-semibold text-slate-900">{l.error_code}</span>
                  <Badge tone={l.resolved ? "emerald" : "rose"}>{l.resolved ? "Resuelto" : "Abierto"}</Badge>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{installations.find((i) => i.id === l.installation_id)?.name}</div>
                {l.description && <p className="text-sm text-slate-600 mt-1">{l.description}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => toggleResolved(l)} className="text-slate-400 hover:text-emerald-500 p-1" title="Marcar resuelto/abierto"><CheckCircle2 size={15} /></button>
                <button onClick={() => setForm(l)} className="text-slate-400 hover:text-slate-600 p-1"><Pencil size={14} /></button>
                <button onClick={() => remove(l.id)} className="text-slate-400 hover:text-rose-500 p-1"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {form && (
        <Modal title={form.id ? "Editar log" : "Registrar error de manejadora"} onClose={() => setForm(null)}>
          <Field label="Instalación">
            <select className={inputCls} value={form.installation_id} onChange={(e) => setForm({ ...form, installation_id: e.target.value })}>
              <option value="">Selecciona una instalación</option>
              {installations.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </Field>
          <Field label="Fecha"><input type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Código o tipo de error"><input className={inputCls} value={form.error_code} onChange={(e) => setForm({ ...form, error_code: e.target.value })} placeholder="Ej: E4 - Sensor de temperatura" /></Field>
          <Field label="Descripción"><textarea rows={3} className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm text-slate-600 mb-2">
            <input type="checkbox" checked={form.resolved} onChange={(e) => setForm({ ...form, resolved: e.target.checked })} /> Marcado como resuelto
          </label>
          <div className="flex justify-end gap-2 mt-4">
            <Btn tone="ghost" onClick={() => setForm(null)}>Cancelar</Btn>
            <Btn onClick={save}>Guardar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Materiales / Inventario
// ---------------------------------------------------------------------------

function emptyMaterial() {
  return { id: null, name: "", category: "", unit: "unidad", quantity: 0, unit_cost: 0, sale_price: 0 };
}

function MaterialsTab({ materials, setMaterials }) {
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(null);

  const filtered = materials.filter((m) => m.name.toLowerCase().includes(query.toLowerCase()));

  async function save() {
    if (!form.name.trim()) return;
    const { id, ...payload } = form;
    if (id) {
      const { data, error } = await supabase.from("materials").update(payload).eq("id", id).select().single();
      if (!error) setMaterials(materials.map((m) => (m.id === id ? data : m)));
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("materials").insert({ ...payload, owner_id: user.id }).select().single();
      if (!error) setMaterials([data, ...materials]);
    }
    setForm(null);
  }

  async function remove(id) {
    if (!confirm("¿Eliminar este material del inventario?")) return;
    await supabase.from("materials").delete().eq("id", id);
    setMaterials(materials.filter((m) => m.id !== id));
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input className={inputCls + " pl-8"} placeholder="Buscar material" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Btn onClick={() => setForm(emptyMaterial())}><Plus size={15} /> Nuevo material</Btn>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-400">No hay materiales en bodega todavía.</p>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Material</th>
                <th className="text-left px-4 py-2 font-medium">Categoría</th>
                <th className="text-right px-4 py-2 font-medium">Stock</th>
                <th className="text-right px-4 py-2 font-medium">Costo</th>
                <th className="text-right px-4 py-2 font-medium">Precio venta</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium">{m.name}</td>
                  <td className="px-4 py-2 text-slate-500 text-xs">{m.category || "—"}</td>
                  <td className={`px-4 py-2 text-right font-mono ${Number(m.quantity) <= 5 ? "text-amber-600 font-semibold" : ""}`}>{m.quantity} {m.unit}</td>
                  <td className="px-4 py-2 text-right">{money(m.unit_cost)}</td>
                  <td className="px-4 py-2 text-right">{money(m.sale_price)}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => setForm(m)} className="text-slate-400 hover:text-slate-600 p-1"><Pencil size={14} /></button>
                      <button onClick={() => remove(m.id)} className="text-slate-400 hover:text-rose-500 p-1"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <Modal title={form.id ? "Editar material" : "Nuevo material"} onClose={() => setForm(null)}>
          <Field label="Nombre"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Categoría"><input className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Ej: Refrigerante, Tubería, Eléctrico" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Unidad de medida"><input className={inputCls} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="unidad, metro, kg…" /></Field>
            <Field label="Cantidad en bodega"><input type="number" className={inputCls} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Costo de compra"><input type="number" className={inputCls} value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} /></Field>
            <Field label="Precio de venta"><input type="number" className={inputCls} value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} /></Field>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Btn tone="ghost" onClick={() => setForm(null)}>Cancelar</Btn>
            <Btn onClick={save}>Guardar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mantenimientos
// ---------------------------------------------------------------------------

function MaintenanceTab({ installations, completions, setCompletions }) {
  const [filter, setFilter] = useState("todos");
  const [completing, setCompleting] = useState(null); 
  const [foto, setFoto] = useState(null); 
  const [subiendo, setSubiendo] = useState(false); 

  const rows = installations
    .flatMap((inst) => buildMaintenanceSchedule(inst, completions).map((s) => ({ ...s, installation: inst })))
    .filter((r) => filter === "todos" || r.status === filter)
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  const subirFoto = async (archivo) => {
    setSubiendo(true);
    const nombreArchivo = `${Date.now()}-${archivo.name.replace(/\s/g, '-')}`;
    
    const { data, error } = await supabase.storage
      .from('fotos-mantenimiento')
      .upload(`public/${nombreArchivo}`, archivo);

    if (error) {
      alert('Error al subir la foto: ' + error.message);
      setSubiendo(false);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('fotos-mantenimiento')
      .getPublicUrl(`public/${nombreArchivo}`);

    setSubiendo(false);
    return urlData.publicUrl;
  };

  const guardarCompletado = async () => {
    let urlFoto = null;

    if (foto) {
      urlFoto = await subirFoto(foto);
      if (!urlFoto) return; 
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from("maintenance_completions")
      .insert({
        installation_id: completing.installation.id,
        scheduled_date: completing.date,
        owner_id: user.id,
        photo_url: urlFoto 
      })
      .select()
      .single();

    if (!error) {
      setCompletions([...completions, data]);
      setCompleting(null);
      setFoto(null);
    } else {
      alert('Error al guardar el mantenimiento');
    }
  };

  const desmarcar = async (row) => {
    const existing = completions.find((c) => c.installation_id === row.installation.id && c.scheduled_date === row.date);
    if (existing) {
      if (!confirm("¿Desmarcar este mantenimiento? Se perderá el registro y la foto asociada.")) return;
      
      await supabase.from("maintenance_completions").delete().eq("id", existing.id);
      setCompletions(completions.filter((c) => c.id !== existing.id));
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {[["todos", "Todos"], ["vencido", "Vencidos"], ["proximo", "Próximos"], ["programado", "Programados"], ["completado", "Completados"]].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} className={`px-3 py-1.5 rounded-md text-xs font-medium ${filter === id ? "bg-cyan-600 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
            {label}
          </button>
        ))}
      </div>

      {installations.length === 0 ? (
        <p className="text-sm text-slate-400">Registra instalaciones para generar su calendario de mantenimiento cada 6 meses.</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-400">No hay mantenimientos en esta categoría.</p>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Cliente</th>
                <th className="text-left px-4 py-2 font-medium">Mant. #</th>
                <th className="text-left px-4 py-2 font-medium">Fecha</th>
                <th className="text-left px-4 py-2 font-medium">Estado</th>
                <th className="text-left px-4 py-2 font-medium">Foto</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const completion = completions.find(c => c.installation_id === r.installation.id && c.scheduled_date === r.date);
                
                return (
                  <tr key={idx} className="border-t border-slate-100">
                    <td className="px-4 py-2">{r.installation.name}</td>
                    <td className="px-4 py-2 text-slate-500">{r.n}</td>
                    <td className="px-4 py-2 font-mono text-xs">{fmtDate(r.date)}</td>
                    <td className="px-4 py-2">
                      <Badge tone={r.status === "completado" ? "emerald" : r.status === "vencido" ? "rose" : r.status === "proximo" ? "amber" : "slate"}>
                        {{ completado: "Completado", vencido: "Vencido", proximo: "Próximo", programado: "Programado" }[r.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-2">
                      {completion?.photo_url ? (
                        <a href={completion.photo_url} target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:text-cyan-800 flex items-center gap-1 text-xs">
                          <Image size={14} /> Ver foto
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {r.status === "completado" ? (
                        <button onClick={() => desmarcar(r)} className="text-xs text-rose-600 hover:text-rose-800 font-medium inline-flex items-center gap-1">
                          <X size={12} /> Desmarcar
                        </button>
                      ) : (
                        <button onClick={() => setCompleting(r)} className="text-xs text-cyan-600 hover:text-cyan-800 font-medium inline-flex items-center gap-1">
                          <Wrench size={12} /> Marcar hecho
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {completing && (
        <Modal title={`Completar Mantenimiento #${completing.n} - ${completing.installation.name}`} onClose={() => { setCompleting(null); setFoto(null); }}>
          <Field label="Foto del mantenimiento (opcional)">
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              onChange={(e) => setFoto(e.target.files[0])}
              className={inputCls}
            />
          </Field>
          {foto && (
            <div className="mt-2 text-xs text-slate-500 bg-slate-50 p-2 rounded">
              Archivo seleccionado: {foto.name}
            </div>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Btn tone="ghost" onClick={() => { setCompleting(null); setFoto(null); }}>Cancelar</Btn>
            <Btn onClick={guardarCompletado} disabled={subiendo}>
              {subiendo ? 'Subiendo foto...' : 'Guardar y Completar'}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cotizaciones
// ---------------------------------------------------------------------------

function QuotesTab({ quotes, setQuotes, installations }) {
  const [form, setForm] = useState(null);
  const [preview, setPreview] = useState(null);

  const emptyQuote = () => {
    const nextNumber = quotes.length > 0 
      ? Math.max(...quotes.map(q => Number(q.quote_number) || 0)) + 1 
      : 1;
    return {
      id: null,
      quote_number: nextNumber,
      date: todayISO(),
      client_nit: "",
      client_name: "",
      client_contact: "",
      client_phone: "",
      client_address: "",
      client_email: "",
      city: "",
      payment_terms: "a convenir",
      discount_percent: 0,
      tax_percent: 19,
      items: [{ description: "", qty: 1, unit: "UND", unit_price: 0 }],
      notes: "",
    };
  };

  const computeTotals = (q) => {
    const items = q.items || [];
    const subtotal = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unit_price) || 0), 0);
    const tax_amount = subtotal * (Number(q.tax_percent) || 0) / 100;
    const discount_amount = subtotal * (Number(q.discount_percent) || 0) / 100;
    const total = subtotal + tax_amount - discount_amount;
    return { subtotal, tax_amount, discount_amount, total };
  };

  function addItem() {
    setForm({ ...form, items: [...form.items, { description: "", qty: 1, unit: "UND", unit_price: 0 }] });
  }
  function updateItem(idx, patch) {
    setForm({ ...form, items: form.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) });
  }
  function removeItem(idx) {
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  }

  async function save() {
    if (!form.client_name.trim()) {
      alert("El nombre del cliente es obligatorio");
      return;
    }
    const totals = computeTotals(form);
    const { id, ...payload } = { ...form, ...totals };

    if (id) {
      const { data, error } = await supabase.from("quotes").update(payload).eq("id", id).select().single();
      if (!error) setQuotes(quotes.map(q => q.id === id ? data : q));
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("quotes").insert({ ...payload, owner_id: user.id }).select().single();
      if (!error) setQuotes([data, ...quotes]);
    }
    setForm(null);
  }

  async function remove(id) {
    if (!confirm("¿Eliminar esta cotización?")) return;
    await supabase.from("quotes").delete().eq("id", id);
    setQuotes(quotes.filter(q => q.id !== id));
  }

  const downloadPDF = (quote) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const totals = computeTotals(quote);
    
    // Encabezado
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("MANTENIMIENTO DEL VALLE", 14, 12);
    doc.setFontSize(9);
    doc.text("Servicio de Electricidad y Refrigeración", 14, 18);
    doc.setTextColor(0, 0, 0);
    
    // Título
    doc.setFontSize(14);
    doc.text("COTIZACIÓN", 160, 35);
    doc.setFontSize(10);
    doc.text(`N° ${quote.quote_number}`, 160, 41);
    doc.text(`Fecha: ${fmtDate(quote.date)}`, 160, 47);
    
    // Datos del cliente
    doc.setFontSize(10);
    doc.text(`Cliente: ${quote.client_name || ""}`, 14, 40);
    if (quote.client_nit) doc.text(`NIT: ${quote.client_nit}`, 14, 46);
    if (quote.client_contact) doc.text(`Contacto: ${quote.client_contact}`, 14, 52);
    if (quote.client_phone) doc.text(`Tel: ${quote.client_phone}`, 14, 58);
    if (quote.client_address) doc.text(`Dirección: ${quote.client_address}`, 14, 64);
    if (quote.client_email) doc.text(`Email: ${quote.client_email}`, 14, 70);
    if (quote.city) doc.text(`Ciudad: ${quote.city}`, 14, 76);
    if (quote.payment_terms) doc.text(`Forma de pago: ${quote.payment_terms}`, 14, 82);

    // Tabla de items
    const rows = (quote.items || []).filter(it => it.description).map((it, i) => [
      i + 1,
      it.description,
      it.qty,
      it.unit,
      money(it.unit_price),
      money((Number(it.qty) || 0) * (Number(it.unit_price) || 0))
    ]);

    doc.autoTable({
      startY: 90,
      head: [["#", "Descripción", "Cant.", "Unidad", "V. Unitario", "V. Total"]],
      body: rows,
      theme: "striped",
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 10 },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 28, halign: 'right' },
        5: { cellWidth: 30, halign: 'right' },
      }
    });

    // Totales
    let finalY = doc.lastAutoTable.finalY + 10;
    const totalsData = [
      ["SUBTOTAL", money(totals.subtotal)],
      [`IMPUESTOS (${quote.tax_percent}%)`, money(totals.tax_amount)],
    ];
    if (Number(quote.discount_percent) > 0) {
      totalsData.push([`DESCUENTO (${quote.discount_percent}%)`, `- ${money(totals.discount_amount)}`]);
    }
    totalsData.push(["TOTAL A PAGAR", money(totals.total)]);

    doc.autoTable({
      startY: finalY,
      body: totalsData,
      theme: "plain",
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: 'bold' },
        1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: 130 }
    });

    // Observaciones
    if (quote.notes) {
      doc.setFontSize(10);
      doc.text("OBSERVACIONES:", 14, finalY + 5);
      doc.setFontSize(9);
      doc.text(quote.notes, 14, finalY + 11);
    }

    doc.save(`Cotizacion_${quote.quote_number}_${quote.client_name.replace(/\s/g, '_')}.pdf`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="font-semibold text-slate-900">Cotizaciones ({quotes.length})</h2>
        <Btn onClick={() => setForm(emptyQuote())}>
          <Plus size={15} /> Nueva cotización
        </Btn>
      </div>

      {quotes.length === 0 ? (
        <p className="text-sm text-slate-400">Aún no has creado ninguna cotización.</p>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>
                <th className="text-left px-4 py-2 font-medium">N°</th>
                <th className="text-left px-4 py-2 font-medium">Fecha</th>
                <th className="text-left px-4 py-2 font-medium">Cliente</th>
                <th className="text-left px-4 py-2 font-medium">Ciudad</th>
                <th className="text-right px-4 py-2 font-medium">Total</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => {
                const totals = computeTotals(q);
                return (
                  <tr key={q.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-mono text-xs">#{q.quote_number}</td>
                    <td className="px-4 py-2 font-mono text-xs">{fmtDate(q.date)}</td>
                    <td className="px-4 py-2 font-medium">{q.client_name}</td>
                    <td className="px-4 py-2 text-slate-500">{q.city || "—"}</td>
                    <td className="px-4 py-2 text-right font-semibold">{money(totals.total)}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => downloadPDF(q)} className="text-slate-400 hover:text-cyan-600 p-1" title="Descargar PDF">
                          <Download size={14} />
                        </button>
                        <button onClick={() => setForm(q)} className="text-slate-400 hover:text-slate-600 p-1"><Pencil size={14} /></button>
                        <button onClick={() => remove(q.id)} className="text-slate-400 hover:text-rose-500 p-1"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <Modal title={form.id ? `Editar Cotización #${form.quote_number}` : `Nueva Cotización #${form.quote_number}`} onClose={() => setForm(null)} wide>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field label="N° Cotización">
              <input type="number" className={inputCls} value={form.quote_number} onChange={(e) => setForm({ ...form, quote_number: e.target.value })} />
            </Field>
            <Field label="Fecha">
              <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Cliente *"><input className={inputCls} value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></Field>
            <Field label="NIT"><input className={inputCls} value={form.client_nit} onChange={(e) => setForm({ ...form, client_nit: e.target.value })} /></Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Contacto"><input className={inputCls} value={form.client_contact} onChange={(e) => setForm({ ...form, client_contact: e.target.value })} /></Field>
            <Field label="Teléfono"><input className={inputCls} value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} /></Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Dirección"><input className={inputCls} value={form.client_address} onChange={(e) => setForm({ ...form, client_address: e.target.value })} /></Field>
            <Field label="Email"><input className={inputCls} value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} /></Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Ciudad"><input className={inputCls} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
            <Field label="Forma de pago"><input className={inputCls} value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} /></Field>
          </div>

          <div className="mb-2 flex items-center justify-between mt-4">
            <span className="text-xs font-medium text-slate-500">Ítems de la cotización</span>
            <Btn size="sm" tone="ghost" onClick={addItem}><Plus size={13} /> Agregar ítem</Btn>
          </div>

          <div className="space-y-2 mb-4">
            {form.items.map((it, idx) => (
              <div key={idx} className="flex gap-2 items-start bg-slate-50 p-2 rounded">
                <span className="text-xs text-slate-400 pt-2 w-6">{idx + 1}</span>
                <input className={inputCls + " flex-1"} placeholder="Descripción" value={it.description} onChange={(e) => updateItem(idx, { description: e.target.value })} />
                <input type="number" min="0" className={inputCls + " w-16"} placeholder="Cant." value={it.qty} onChange={(e) => updateItem(idx, { qty: e.target.value })} />
                <input className={inputCls + " w-16"} placeholder="Und" value={it.unit} onChange={(e) => updateItem(idx, { unit: e.target.value })} />
                <input type="number" min="0" className={inputCls + " w-24"} placeholder="V. Unit" value={it.unit_price} onChange={(e) => updateItem(idx, { unit_price: e.target.value })} />
                <button onClick={() => removeItem(idx)} className="text-slate-400 hover:text-rose-500 pt-2 shrink-0"><X size={16} /></button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Impuestos (%)"><input type="number" className={inputCls} value={form.tax_percent} onChange={(e) => setForm({ ...form, tax_percent: e.target.value })} /></Field>
            <Field label="Descuento (%)"><input type="number" className={inputCls} value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} /></Field>
          </div>

          <Field label="Observaciones"><textarea rows={3} className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>

          <div className="border-t border-slate-100 pt-3 mt-2 space-y-1">
            <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span>{money(computeTotals(form).subtotal)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Impuestos ({form.tax_percent}%)</span><span>{money(computeTotals(form).tax_amount)}</span></div>
            {Number(form.discount_percent) > 0 && (
              <div className="flex justify-between text-sm"><span className="text-slate-500">Descuento ({form.discount_percent}%)</span><span className="text-rose-600">- {money(computeTotals(form).discount_amount)}</span></div>
            )}
            <div className="flex justify-between text-base font-semibold border-t border-slate-100 pt-2"><span>Total a pagar</span><span>{money(computeTotals(form).total)}</span></div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Btn tone="ghost" onClick={() => setForm(null)}>Cancelar</Btn>
            <Btn onClick={save}>Guardar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
