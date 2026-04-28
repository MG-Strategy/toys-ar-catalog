import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from 'recharts';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const BG = '#0f172a';
const CARD = '#1e293b';
const BORDER = '#334155';
const BLUE = '#1565C0';
const YELLOW = '#FFD600';
const TEXT = '#f1f5f9';
const MUTED = '#94a3b8';

const formatARS = (n: number) =>
  `$ ${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ARS`;

const STATE_COLORS: Record<string, string> = {
  pendiente: '#FFD600',
  enviada: '#1565C0',
  aceptada: '#22c55e',
  rechazada: '#ef4444',
  vencida: '#94a3b8',
};

type KPIs = {
  total_cotizaciones?: number;
  cotizaciones_pendientes?: number;
  valor_total_cotizado?: number;
  tiempo_respuesta_promedio?: number;
  tiempo_respuesta_promedio_minutos?: number;
};

const formatTiempoRespuesta = (mins: number | null | undefined): string => {
  if (mins == null || mins === 0) return 'Sin datos';
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins - h * 60);
  return `${h}h ${m}m`;
};

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div
    className={`rounded-2xl border p-5 ${className}`}
    style={{ background: CARD, borderColor: BORDER }}
  >
    {children}
  </div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-lg font-semibold mb-4" style={{ color: TEXT }}>{children}</h2>
);

const SectionHeader = ({ emoji, title, question }: { emoji: string; title: string; question: string }) => (
  <div className="pt-4 border-t" style={{ borderColor: BORDER }}>
    <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: TEXT }}>
      <span>{emoji}</span>
      <span>{title}</span>
    </h2>
    <p className="text-sm mt-1" style={{ color: MUTED }}>{question}</p>
  </div>
);

const ErrorMsg = () => (
  <p className="text-center py-6 text-sm" style={{ color: '#f97316' }}>
    ⚠️ Error al cargar los datos. Intentá recargar.
  </p>
);

const Badge = ({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) => (
  <span
    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
    style={{ background: bg, color }}
  >
    {children}
  </span>
);

type ProductoOpt = { id: string; nombre: string; codigo_proveedor?: string | null; sku?: string | null };

const formatFechaCorta = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
};

const todayStamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const slugify = (s: string) =>
  (s || 'export')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const csvCell = (v: any) => {
  if (v == null) return '';
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const downloadCSV = (filename: string, headers: string[], rows: any[][]) => {
  const lines = [headers.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))];
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const exportBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: `1px solid ${'#334155'}`,
  color: '#f1f5f9',
  padding: '6px 12px',
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
};

type SimProducto = {
  id: string;
  nombre: string;
  marca?: string | null;
  precio_proveedor: number;
  precio_publico: number;
  margen_diferencial: number;
};

const SimuladorPricing = ({ reglas }: { reglas: any[] }) => {
  const defaults = useMemo(() => {
    const get = (tipo: string) => {
      const r = reglas.find((x: any) => x.tipo_regla === tipo && x.activo);
      const v = Number(r?.valor);
      return isNaN(v) ? 0 : Math.round(v * 100);
    };
    return {
      cf: get('costo_fijo'),
      cv: get('costo_variable'),
      mg: get('margen_ganancia'),
    };
  }, [reglas]);

  const cf = defaults.cf;
  const cv = defaults.cv;
  const mg = defaults.mg;

  const [items, setItems] = useState<SimProducto[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [margenSlider, setMargenSlider] = useState(0); // percent units, e.g. 10 = +10%
  const [applying, setApplying] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // Load products with vigente price
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('precios')
        .select('precio_proveedor, precio_publico, margen_diferencial, productos:id_producto(id, nombre, marca)')
        .eq('es_precio_vigente', true);
      if (error || !data) return;
      const list: SimProducto[] = (data as any[])
        .filter((r) => r.productos)
        .map((r) => ({
          id: r.productos.id,
          nombre: r.productos.nombre,
          marca: r.productos.marca,
          precio_proveedor: Number(r.precio_proveedor || 0),
          precio_publico: Number(r.precio_publico || 0),
          margen_diferencial: Number(r.margen_diferencial || 0),
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
      setItems(list);
      if (list.length > 0 && !selectedId) {
        setSelectedId(list[0].id);
        setMargenSlider(Math.round(list[0].margen_diferencial * 100));
      }
    })();
  }, []);

  const selected = useMemo(() => items.find((x) => x.id === selectedId) || null, [items, selectedId]);

  // When product changes, reset slider to its saved margen_diferencial
  useEffect(() => {
    if (selected) {
      setMargenSlider(Math.round(selected.margen_diferencial * 100));
      setErrMsg(null);
    }
  }, [selectedId]);

  const proveedor = selected?.precio_proveedor ?? 0;
  const publicoActual = selected?.precio_publico ?? 0;
  const margenGuardadoPct = selected ? Math.round(selected.margen_diferencial * 100) : 0;

  // Simulated price uses DB formula: proveedor * 2.00 * (1 + margenDiferencial)
  const simulado = proveedor * 2.0 * (1 + margenSlider / 100);
  const diff = simulado - publicoActual;
  const diffPct = publicoActual > 0 ? (diff / publicoActual) * 100 : 0;

  const sliderClassReadOnly = "opacity-50 [&_[role=slider]]:border-[#64748b] [&>:first-child>:first-child]:bg-[#64748b] [&>:first-child]:bg-[#1e293b]";
  const sliderClassMargen = "[&_[role=slider]]:border-[#F97316] [&>:first-child>:first-child]:bg-[#F97316] [&>:first-child]:bg-[#1e293b]";

  const hasChange = selected ? margenSlider !== margenGuardadoPct : false;

  const handleApply = async () => {
    if (!selected || !hasChange || applying) return;
    setApplying(true);
    setErrMsg(null);
    try {
      const { data, error } = await supabase.rpc('admin_set_margen_diferencial', {
        p_id_producto: selected.id,
        p_margen_diferencial: margenSlider / 100,
      });
      if (error) throw error;
      const row: any = Array.isArray(data) ? data[0] : data;
      const newPublico = Number(row?.precio_publico ?? simulado);
      const newMargen = Number(row?.margen_diferencial ?? margenSlider / 100);
      setItems((prev) =>
        prev.map((p) =>
          p.id === selected.id
            ? { ...p, precio_publico: newPublico, margen_diferencial: newMargen }
            : p
        )
      );
      setMargenSlider(Math.round(newMargen * 100));
      toast.success('✓ Margen diferencial actualizado');
    } catch (e: any) {
      setErrMsg(e?.message || 'Error al aplicar el cambio');
    } finally {
      setApplying(false);
    }
  };

  return (
    <section>
      <Card>
        <SectionTitle>Simulador de pricing</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: selector + sliders */}
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: MUTED }}>Producto</label>
            <div className="mb-4">
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger
                  className="w-full"
                  style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT }}
                >
                  <SelectValue placeholder="Seleccionar producto…" />
                </SelectTrigger>
                <SelectContent style={{ background: CARD, border: `1px solid ${BORDER}`, color: TEXT }}>
                  {items.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}{p.marca ? ` — ${p.marca}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selected && (
              <div className="mb-4 p-3 rounded-md" style={{ background: BG, border: `1px solid ${BORDER}` }}>
                <div className="text-sm font-semibold" style={{ color: TEXT }}>{selected.nombre}</div>
                <div className="text-xs mt-1" style={{ color: MUTED }}>
                  Precio proveedor actual: <span style={{ color: TEXT }}>{formatARS(proveedor)}</span>
                </div>
              </div>
            )}

            <div className="space-y-5">
              {/* Info box: business rules in effect */}
              <div
                className="p-3 rounded-md text-xs leading-relaxed"
                style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT }}
              >
                <div className="font-semibold mb-1" style={{ color: TEXT }}>
                  ℹ Reglas de negocio vigentes
                </div>
                <div style={{ color: MUTED }}>
                  Costo Fijo <span className="font-semibold" style={{ color: BLUE }}>{cf}%</span>
                  {' · '}Costo Variable <span className="font-semibold" style={{ color: BLUE }}>{cv}%</span>
                  {' · '}Margen Ganancia <span className="font-semibold" style={{ color: BLUE }}>{mg}%</span>
                </div>
                <div className="mt-1" style={{ color: MUTED }}>
                  → Estas reglas se aplican automáticamente
                </div>
              </div>

              {/* Interactive Margen Diferencial */}
              <div>
                <div className="flex justify-between mb-2 text-sm">
                  <span style={{ color: TEXT }}>Margen Diferencial</span>
                  <span className="font-semibold" style={{ color: '#F97316' }}>
                    {margenSlider > 0 ? '+' : ''}{margenSlider}%
                  </span>
                </div>
                <Slider
                  value={[margenSlider]}
                  min={-50}
                  max={100}
                  step={1}
                  onValueChange={(v) => setMargenSlider(v[0])}
                  className={sliderClassMargen}
                  disabled={!selected}
                />
              </div>
            </div>
          </div>

          {/* RIGHT: results */}
          <div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-md" style={{ background: BG, border: `1px solid ${BORDER}` }}>
                <span className="text-sm" style={{ color: MUTED }}>Precio proveedor</span>
                <span className="font-semibold" style={{ color: MUTED }}>{formatARS(proveedor)}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-md" style={{ background: BG, border: `1px solid ${BORDER}` }}>
                <span className="text-sm" style={{ color: TEXT }}>Precio público actual</span>
                <span className="font-semibold" style={{ color: BLUE }}>{formatARS(publicoActual)}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-md" style={{ background: BG, border: `1px solid #16a34a` }}>
                <span className="text-sm" style={{ color: TEXT }}>Precio público simulado</span>
                <span className="font-bold text-lg" style={{ color: '#16a34a' }}>{formatARS(simulado)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-md" style={{ background: BG, border: `1px solid ${BORDER}` }}>
                  <div className="text-xs mb-1" style={{ color: MUTED }}>Diferencia</div>
                  <div className="font-semibold" style={{ color: diff >= 0 ? '#16a34a' : '#ef4444' }}>
                    {diff >= 0 ? '+ ' : '- '}{formatARS(Math.abs(diff))}
                  </div>
                </div>
                <div className="p-3 rounded-md" style={{ background: BG, border: `1px solid ${BORDER}` }}>
                  <div className="text-xs mb-1" style={{ color: MUTED }}>Diferencia %</div>
                  <div className="font-semibold" style={{ color: diffPct >= 0 ? '#16a34a' : '#ef4444' }}>
                    {diffPct >= 0 ? '+' : ''}{diffPct.toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="text-xs" style={{ color: MUTED }}>
                Margen diferencial actual guardado en DB:{' '}
                <span className="font-semibold">
                  {margenGuardadoPct > 0 ? '+' : ''}{margenGuardadoPct}%
                </span>
              </div>
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={handleApply}
                disabled={!hasChange || applying || !selected}
                className="w-full py-2.5 rounded-md font-semibold text-sm transition-colors"
                style={{
                  background: !hasChange || applying || !selected ? '#475569' : '#22C55E',
                  color: '#fff',
                  cursor: !hasChange || applying || !selected ? 'not-allowed' : 'pointer',
                  opacity: !hasChange || applying || !selected ? 0.7 : 1,
                }}
              >
                {applying ? 'Aplicando…' : 'Aplicar cambio de precio'}
              </button>
              {errMsg && (
                <p className="text-xs mt-2" style={{ color: '#ef4444' }}>
                  {errMsg}
                </p>
              )}
              <p className="text-xs mt-3" style={{ color: MUTED }}>
                El margen diferencial se aplica sobre el precio base calculado por las reglas de negocio. Un valor de 0% no genera ajuste.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
};

type DashboardUser = { auth_user_id: string; nombre_completo: string | null; activo: boolean } | null;

const Dashboard = ({ dashboardUser }: { dashboardUser?: DashboardUser } = {}) => {
  const [kpis, setKpis] = useState<KPIs>({});
  const [estados, setEstados] = useState<{ name: string; value: number }[]>([]);
  const [canales, setCanales] = useState<{ name: string; value: number }[]>([]);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const setErr = (k: string, v: boolean) => setErrors((e) => ({ ...e, [k]: v }));
  const [productos, setProductos] = useState<ProductoOpt[]>([]);
  const [selectedProducto, setSelectedProducto] = useState<ProductoOpt | null>(null);
  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [historico, setHistorico] = useState<any[]>([]);
  const [margenActual, setMargenActual] = useState<number | null>(null);
  const [stock, setStock] = useState<number | null>(null);
  const [ranking, setRanking] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [reglas, setReglas] = useState<any[]>([]);
  const [equipo, setEquipo] = useState<any[]>([]);
  const [showPendientes, setShowPendientes] = useState(false);
  const [pendientes, setPendientes] = useState<any[]>([]);
  const [loadingPendientes, setLoadingPendientes] = useState(false);
  const [stockAll, setStockAll] = useState<{ id: string; nombre: string; stock: number; proveedor: string; categoria: string; marca: string; sku: string | null }[]>([]);
  const [stockSearch, setStockSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'todos' | 'sin' | 'critico' | 'bajo' | 'en'>('todos');
  const [cotizacionesFechas, setCotizacionesFechas] = useState<string[]>([]);
  const [cotizacionesRows, setCotizacionesRows] = useState<{ fecha: string; total: number }[]>([]);
  const [cotChartType, setCotChartType] = useState<'bar' | 'line'>('bar');
  const [cotPeriodo, setCotPeriodo] = useState<'7d' | '30d' | '3m' | '1y'>('30d');
  const [ticketPromedio, setTicketPromedio] = useState<{ mes_label: string; ticket_promedio: number; cantidad_cotizaciones: number }[]>([]);

  // Evolución del ticket promedio
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('vista_ticket_promedio_mensual')
        .select('mes, ticket_promedio, cantidad_cotizaciones');
      if (error) { setErr('ticketPromedio', true); return; }
      if (data) {
        const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        const mapped = (data as any[])
          .map((r) => {
            const d = new Date(r.mes);
            const valid = !isNaN(d.getTime());
            return {
              sortKey: valid ? d.getFullYear() * 12 + d.getMonth() : 0,
              mes_label: valid ? `${meses[d.getMonth()]} ${d.getFullYear()}` : String(r.mes ?? ''),
              ticket_promedio: Number(r.ticket_promedio || 0),
              cantidad_cotizaciones: Number(r.cantidad_cotizaciones || 0),
            };
          })
          .sort((a, b) => a.sortKey - b.sortKey)
          .map(({ sortKey, ...rest }) => rest);
        setTicketPromedio(mapped);
      }
    })();
  }, []);

  // KPIs
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('vista_dashboard_kpis').select('*').limit(1).maybeSingle();
      if (error) { setErr('kpis', true); return; }
      if (data) setKpis(data as any);
    })();
  }, []);

  // Cotizaciones por canal (bar)
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('vista_cotizaciones_canal').select('canal, total');
      if (error) { setErr('canales', true); return; }
      if (data) {
        setCanales(
          (data as any[])
            .filter((r) => {
              const c = (r.canal || '').toString().trim().toLowerCase();
              return c && c !== 'sin_canal';
            })
            .map((r) => ({
              name: (r.canal || '').toString().trim().toLowerCase(),
              value: Number(r.total) || 0,
            }))
            .filter((r) => r.value > 0)
        );
      }
    })();
  }, []);

  // Cotizaciones por día — fechas
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('cotizaciones_globales')
        .select('fecha_cotizacion, total');
      if (error) { setErr('cotizaciones', true); return; }
      if (data) {
        const rows = (data as any[])
          .filter((r) => r.fecha_cotizacion)
          .map((r) => ({ fecha: r.fecha_cotizacion as string, total: Number(r.total || 0) }));
        setCotizacionesRows(rows);
        setCotizacionesFechas(rows.map((r) => r.fecha));
      }
    })();
  }, []);

  // Productos para histórico — cargar TODOS desde vista_catalogo_vigente,
  // y enriquecer con codigo_proveedor desde vista_historico_precios (vigente).
  useEffect(() => {
    (async () => {
      const [catRes, histRes] = await Promise.all([
        supabase
          .from('vista_catalogo_vigente')
          .select('id, nombre, sku')
          .order('nombre', { ascending: true }),
        supabase
          .from('vista_historico_precios')
          .select('id_producto, codigo_proveedor')
          .eq('es_precio_vigente', true),
      ]);
      const codigoMap = new Map<string, string | null>();
      for (const r of (histRes.data as any[]) || []) {
        if (r?.id_producto && !codigoMap.has(r.id_producto)) {
          codigoMap.set(r.id_producto, r.codigo_proveedor ?? null);
        }
      }
      const seen = new Set<string>();
      const opts: ProductoOpt[] = [];
      for (const r of (catRes.data as any[]) || []) {
        if (!r?.id || !r?.nombre || seen.has(r.id)) continue;
        seen.add(r.id);
        opts.push({ id: r.id, nombre: r.nombre, codigo_proveedor: codigoMap.get(r.id) ?? null, sku: r.sku ?? null });
      }
      setProductos(opts);
      setShowResults(true);
      setSelectedProducto((current) => current ?? opts[0] ?? null);
    })();
  }, []);

  // Histórico precios + stock + margen vigente del producto seleccionado
  useEffect(() => {
    if (!selectedProducto) return;
    (async () => {
      const [hist, cat, vigente] = await Promise.all([
        supabase
          .from('vista_historico_precios')
          .select('*')
          .eq('id_producto', selectedProducto.id)
          .order('fecha_precio', { ascending: true }),
        supabase
          .from('vista_catalogo_vigente')
          .select('stock')
          .eq('id', selectedProducto.id)
          .maybeSingle(),
        supabase
          .from('vista_historico_precios')
          .select('margen_porcentaje')
          .eq('id_producto', selectedProducto.id)
          .eq('es_precio_vigente', true)
          .maybeSingle(),
      ]);
      if (hist.error || cat.error || vigente.error) { setErr('historico', true); return; }
      setErr('historico', false);
      if (hist.data) {
        const mapped = (hist.data as any[]).map((r) => ({
          ...r,
          fecha_label: formatFechaCorta(r.fecha_precio),
        }));
        setHistorico(mapped);
      } else {
        setHistorico([]);
      }
      setMargenActual((vigente.data as any)?.margen_porcentaje ?? null);
      setStock((cat.data as any)?.stock ?? null);
    })();
  }, [selectedProducto]);

  const filteredProductos = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        (p.codigo_proveedor || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q)
    );
  }, [search, productos]);

  const stockBadge = () => {
    if (stock == null) return null;
    if (stock === 0) return <Badge color="#fff" bg="#ef4444">Sin stock</Badge>;
    if (stock <= 10) return <Badge color="#fff" bg="#f97316">Stock crítico ({stock} unidades)</Badge>;
    if (stock <= 50) return <Badge color="#0f172a" bg={YELLOW}>Stock bajo ({stock} unidades)</Badge>;
    return <Badge color="#fff" bg="#16a34a">En stock ({stock} unidades)</Badge>;
  };

  // Ranking productos
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('vista_ranking_productos')
        .select('*')
        .order('veces_cotizado', { ascending: false })
        .limit(10);
      if (error) { setErr('ranking', true); return; }
      if (data) setRanking(data);
    })();
  }, []);

  // Clientes frecuentes (desde vistas accesibles a anon: vista_ranking_productos + vista_historial_cliente)
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('vista_ranking_productos')
        .select('cliente_frecuente, total_cotizaciones_cliente, nombre, categoria')
        .order('total_cotizaciones_cliente', { ascending: false });
      if (error) { setErr('clientes', true); return; }
      if (!data) return;

      // Dedupe top 10 clientes por total_cotizaciones_cliente
      const seen = new Set<string>();
      const dedup: any[] = [];
      for (const r of data as any[]) {
        if (!r.cliente_frecuente) continue;
        if (seen.has(r.cliente_frecuente)) continue;
        seen.add(r.cliente_frecuente);
        dedup.push(r);
        if (dedup.length >= 10) break;
      }
      const nombres = dedup.map((d) => d.cliente_frecuente);

      // Contactos (email/telefono) desde vista_historial_cliente
      const contactMap = new Map<string, { email: string | null; telefono: string | null }>();
      if (nombres.length > 0) {
        const { data: hist } = await supabase
          .from('vista_historial_cliente')
          .select('nombre_completo, email, telefono')
          .in('nombre_completo', nombres);
        for (const u of (hist as any[]) || []) {
          if (!u?.nombre_completo) continue;
          const prev = contactMap.get(u.nombre_completo);
          // Mantener primer registro con email/teléfono no nulo
          if (!prev) {
            contactMap.set(u.nombre_completo, { email: u.email ?? null, telefono: u.telefono ?? null });
          } else {
            contactMap.set(u.nombre_completo, {
              email: prev.email ?? u.email ?? null,
              telefono: prev.telefono ?? u.telefono ?? null,
            });
          }
        }
      }

      // Categoría favorita: cruzar historial (nombre_producto + cantidad) con ranking (nombre -> categoria)
      const prodToCat = new Map<string, string>();
      for (const r of data as any[]) {
        if (r?.nombre && r?.categoria && !prodToCat.has(r.nombre)) {
          prodToCat.set(r.nombre, r.categoria);
        }
      }
      const favByCliente = new Map<string, string>();
      if (nombres.length > 0) {
        const { data: histProds } = await supabase
          .from('vista_historial_cliente')
          .select('nombre_completo, nombre_producto, cantidad_productos')
          .in('nombre_completo', nombres)
          .not('nombre_producto', 'is', null);
        const counts = new Map<string, Map<string, number>>(); // cliente -> categoria -> unidades
        for (const r of (histProds as any[]) || []) {
          const cliente = r?.nombre_completo;
          const cat = r?.nombre_producto ? prodToCat.get(r.nombre_producto) : null;
          if (!cliente || !cat) continue;
          if (!counts.has(cliente)) counts.set(cliente, new Map());
          const m = counts.get(cliente)!;
          m.set(cat, (m.get(cat) || 0) + (r.cantidad_productos || 1));
        }
        for (const [cliente, m] of counts.entries()) {
          let bestCat = '', bestN = -1;
          for (const [cat, n] of m.entries()) {
            if (n > bestN) { bestN = n; bestCat = cat; }
          }
          if (bestCat) favByCliente.set(cliente, bestCat);
        }
      }

      setClientes(
        dedup.map((d) => {
          const ct = contactMap.get(d.cliente_frecuente);
          return {
            cliente_frecuente: d.cliente_frecuente,
            total_cotizaciones_cliente: d.total_cotizaciones_cliente,
            email: ct?.email ?? null,
            telefono: ct?.telefono ?? null,
            categoria_favorita: favByCliente.get(d.cliente_frecuente) ?? null,
          };
        })
      );
    })();
  }, []);

  // Categorías más pedidas
  const [categoriasPedidas, setCategoriasPedidas] = useState<{ categoria: string; veces_pedida: number; unidades_totales: number }[]>([]);
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('vista_ranking_productos')
        .select('categoria, veces_cotizado, total_unidades_cotizadas');
      if (error) { setErr('categoriasPedidas', true); return; }
      const acc = new Map<string, { veces_pedida: number; unidades_totales: number }>();
      for (const r of (data as any[]) || []) {
        const cat = r?.categoria;
        if (!cat) continue;
        const cur = acc.get(cat) || { veces_pedida: 0, unidades_totales: 0 };
        cur.veces_pedida += Number(r.veces_cotizado || 0);
        cur.unidades_totales += Number(r.total_unidades_cotizadas || 0);
        acc.set(cat, cur);
      }
      const arr = Array.from(acc.entries())
        .map(([categoria, v]) => ({ categoria, ...v }))
        .sort((a, b) => b.veces_pedida - a.veces_pedida);
      setCategoriasPedidas(arr);
    })();
  }, []);

  // Reglas
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('reglas_negocio').select('*');
      if (error) { setErr('reglas', true); return; }
      if (data) setReglas(data);
    })();
  }, []);

  // Equipo
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('usuarios_dashboard')
        .select('nombre_completo, email, activo, roles_dashboard(rol)')
        .eq('activo', true);
      if (error) { setErr('equipo', true); return; }
      if (data) {
        setEquipo(
          (data as any[]).map((u) => ({
            nombre_completo: u.nombre_completo,
            email: u.email,
            activo: u.activo,
            rol: u.roles_dashboard?.rol ?? '—',
          }))
        );
      }
  })();
  }, []);

  // Stock overview — todos los productos con stock
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('vista_catalogo_vigente')
        .select('id, nombre, stock, proveedor, categoria, marca, sku')
        .order('nombre', { ascending: true });
      if (error) { setErr('stockAll', true); return; }
      if (data) {
        const seen = new Set<string>();
        const arr: { id: string; nombre: string; stock: number; proveedor: string; categoria: string; marca: string; sku: string | null }[] = [];
        for (const r of data as any[]) {
          if (!r?.id || seen.has(r.id)) continue;
          seen.add(r.id);
          arr.push({
            id: r.id,
            nombre: r.nombre,
            stock: Number(r.stock ?? 0),
            proveedor: r.proveedor ?? '—',
            categoria: r.categoria ?? '—',
            marca: r.marca ?? '—',
            sku: r.sku ?? null,
          });
        }
        setStockAll(arr);
      }
    })();
  }, []);

  // Pendientes (lazy on click)
  const openPendientes = async () => {
    setShowPendientes(true);
    if (pendientes.length > 0) return;
    setLoadingPendientes(true);
    let { data, error } = await supabase
      .from('cotizaciones_globales')
      .select('*, usuarios(nombre_completo, email)')
      .eq('estado', 'pendiente');
    if (error) {
      const r = await supabase.from('cotizaciones_globales').select('*').eq('estado', 'pendiente');
      if (r.error) { setErr('pendientes', true); setLoadingPendientes(false); return; }
      data = r.data as any;
    }
    setErr('pendientes', false);
    setPendientes((data as any[]) || []);
    setLoadingPendientes(false);
  };

  const rolBadge = (rol: string) => {
    const r = (rol || '').toLowerCase();
    if (r === 'admin') return <Badge color="#fff" bg={BLUE}>{rol}</Badge>;
    if (r === 'operador') return <Badge color="#0f172a" bg={YELLOW}>{rol}</Badge>;
    return <Badge color="#0f172a" bg="#cbd5e1">{rol || '—'}</Badge>;
  };

  const activoBadge = (a: boolean) =>
    a ? <Badge color="#fff" bg="#16a34a">Activo</Badge> : <Badge color="#fff" bg="#ef4444">Inactivo</Badge>;

  const pendientesAlta = (kpis.cotizaciones_pendientes || 0) > 0;

  const tooltipStyle = useMemo(
    () => ({
      background: CARD,
      border: `1px solid ${BORDER}`,
      borderRadius: 8,
      color: TEXT,
    }),
    []
  );

  // Cotizaciones agrupadas según período seleccionado
  const cotizacionesData = useMemo(() => {
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const now = new Date();
    let from = new Date(now);
    let groupBy: 'day' | 'week' | 'month' = 'day';
    if (cotPeriodo === '7d') { from.setDate(now.getDate() - 6); groupBy = 'day'; }
    else if (cotPeriodo === '30d') { from.setDate(now.getDate() - 29); groupBy = 'day'; }
    else if (cotPeriodo === '3m') { from.setMonth(now.getMonth() - 3); groupBy = 'week'; }
    else { from.setFullYear(now.getFullYear() - 1); groupBy = 'month'; }
    from.setHours(0, 0, 0, 0);

    const getWeek = (d: Date) => {
      const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const dayNum = (target.getUTCDay() + 6) % 7;
      target.setUTCDate(target.getUTCDate() - dayNum + 3);
      const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
      const diff = (target.getTime() - firstThursday.getTime()) / 86400000;
      return 1 + Math.round((diff - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
    };

    const buckets = new Map<string, { label: string; sortKey: number; total: number }>();
    const parseLocal = (iso: string): Date => {
      // Soporta 'YYYY-MM-DD' y 'YYYY-MM-DDTHH:mm:ss...' interpretándolos en zona local
      const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      return new Date(iso);
    };
    for (const iso of cotizacionesFechas) {
      const d = parseLocal(iso);
      if (isNaN(d.getTime()) || d < from) continue;
      let key = '', label = '', sortKey = 0;
      if (groupBy === 'day') {
        key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        label = `${d.getDate()} ${meses[d.getMonth()]}`;
        sortKey = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      } else if (groupBy === 'week') {
        const w = getWeek(d);
        key = `${d.getFullYear()}-W${w}`;
        label = `Sem ${w}`;
        sortKey = d.getFullYear() * 100 + w;
      } else {
        key = `${d.getFullYear()}-${d.getMonth()}`;
        label = `${meses[d.getMonth()]} ${d.getFullYear()}`;
        sortKey = d.getFullYear() * 12 + d.getMonth();
      }
      const cur = buckets.get(key);
      if (cur) cur.total += 1;
      else buckets.set(key, { label, sortKey, total: 1 });
    }
    return Array.from(buckets.values()).sort((a, b) => a.sortKey - b.sortKey);
  }, [cotizacionesFechas, cotPeriodo]);

  const estadoStockLabel = (s: number) => {
    if (s === 0) return 'Sin stock';
    if (s <= 10) return 'Stock crítico';
    if (s <= 50) return 'Stock bajo';
    return 'En stock';
  };

  const exportHistorico = () => {
    if (!selectedProducto || historico.length === 0) return;
    downloadCSV(
      `juguetear_precios_${slugify(selectedProducto.nombre)}_${todayStamp()}.csv`,
      ['nombre', 'sku', 'codigo_proveedor', 'fecha_precio', 'precio_proveedor', 'precio_publico', 'margen_porcentaje', 'proveedor'],
      historico.map((r: any) => [
        r.nombre ?? selectedProducto.nombre,
        r.sku ?? selectedProducto.sku ?? '',
        r.codigo_proveedor ?? '',
        r.fecha_precio ?? '',
        r.precio_proveedor ?? '',
        r.precio_publico ?? '',
        r.margen_porcentaje ?? '',
        r.proveedor ?? '',
      ])
    );
  };

  const exportClientes = () => {
    if (clientes.length === 0) return;
    downloadCSV(
      `juguetear_clientes_frecuentes_${todayStamp()}.csv`,
      ['nombre_completo', 'email', 'telefono', 'total_cotizaciones', 'categoria_favorita'],
      clientes.map((c) => [
        c.cliente_frecuente ?? '',
        c.email ?? '',
        c.telefono ?? '',
        c.total_cotizaciones_cliente ?? 0,
        c.categoria_favorita ?? '',
      ])
    );
  };

  const exportPendientes = () => {
    if (pendientes.length === 0) return;
    downloadCSV(
      `juguetear_pendientes_${todayStamp()}.csv`,
      ['cliente', 'email', 'fecha_cotizacion', 'total', 'canal'],
      pendientes.map((c: any) => [
        c.usuarios?.nombre_completo ?? c.nombre_completo ?? c.cliente ?? c.nombre_cliente ?? '',
        c.usuarios?.email ?? c.email ?? '',
        c.fecha_cotizacion ?? c.fecha_creacion ?? c.created_at ?? '',
        c.total_ars ?? c.total ?? c.monto_total ?? '',
        c.canal ?? c.origen ?? '',
      ])
    );
  };

  const exportStock = (rows: { nombre: string; proveedor: string; stock: number; categoria: string; marca: string; sku: string | null }[]) => {
    if (rows.length === 0) return;
    downloadCSV(
      `juguetear_stock_${todayStamp()}.csv`,
      ['nombre', 'sku', 'proveedor', 'stock', 'estado_stock', 'categoria', 'marca'],
      rows.map((p) => [p.nombre, p.sku ?? '', p.proveedor, p.stock, estadoStockLabel(p.stock), p.categoria, p.marca])
    );
  };

  // Hero stats: month / week / total month
  const heroStats = useMemo(() => {
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startWeek = new Date(now);
    startWeek.setDate(now.getDate() - 6);
    startWeek.setHours(0, 0, 0, 0);
    const parseLocal = (iso: string): Date => {
      const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      return new Date(iso);
    };
    let mes = 0, semana = 0, historico = 0;
    let totalMes = 0, totalSemana = 0, totalHistorico = 0;
    for (const r of cotizacionesRows) {
      const d = parseLocal(r.fecha);
      if (isNaN(d.getTime())) continue;
      historico += 1;
      totalHistorico += r.total;
      if (d >= startMonth) { mes += 1; totalMes += r.total; }
      if (d >= startWeek) { semana += 1; totalSemana += r.total; }
    }
    return { mes, semana, historico, totalMes, totalSemana, totalHistorico };
  }, [cotizacionesRows]);

  // Ticket promedio SEMANAL — calculado desde cotizacionesRows
  const ticketPromedioSemanal = useMemo(() => {
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const parseLocal = (iso: string): Date => {
      const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      return new Date(iso);
    };
    // Inicio de semana = lunes local
    const startOfWeek = (d: Date): Date => {
      const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dow = (x.getDay() + 6) % 7; // 0 = lunes
      x.setDate(x.getDate() - dow);
      return x;
    };
    const buckets = new Map<string, { sortKey: number; mes_label: string; suma: number; cantidad: number }>();
    for (const r of cotizacionesRows) {
      const d = parseLocal(r.fecha);
      if (isNaN(d.getTime())) continue;
      const ws = startOfWeek(d);
      const key = `${ws.getFullYear()}-${ws.getMonth()}-${ws.getDate()}`;
      const label = `${ws.getDate()} ${meses[ws.getMonth()]}`;
      const cur = buckets.get(key);
      if (cur) { cur.suma += r.total; cur.cantidad += 1; }
      else buckets.set(key, { sortKey: ws.getTime(), mes_label: label, suma: r.total, cantidad: 1 });
    }
    return Array.from(buckets.values())
      .sort((a, b) => a.sortKey - b.sortKey)
      .map((b) => ({
        mes_label: b.mes_label,
        ticket_promedio: b.cantidad > 0 ? b.suma / b.cantidad : 0,
        cantidad_cotizaciones: b.cantidad,
      }));
  }, [cotizacionesRows]);

  // ============ Section JSX blocks (defined here, rendered in order below) ============

  const sectionKPIs = (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <div className="text-sm" style={{ color: MUTED }}>📋 Total cotizaciones</div>
        <div className="text-3xl font-bold mt-2" style={{ color: TEXT }}>
          {kpis.total_cotizaciones ?? 0}
        </div>
      </Card>
      <div
        role="button"
        tabIndex={0}
        onClick={openPendientes}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openPendientes(); }}
        className="rounded-2xl border p-5 cursor-pointer transition hover:opacity-90"
        style={{ background: CARD, borderColor: BORDER }}
      >
        <div className="text-sm flex items-center justify-between" style={{ color: MUTED }}>
          <span>⏳ Pendientes</span>
          <span className="text-[10px] uppercase tracking-wide" style={{ color: MUTED }}>ver detalle →</span>
        </div>
        <div
          className="text-3xl font-bold mt-2"
          style={{ color: pendientesAlta ? YELLOW : TEXT }}
        >
          {kpis.cotizaciones_pendientes ?? 0}
        </div>
      </div>
      <Card>
        <div className="text-sm" style={{ color: MUTED }}>💰 Valor total cotizado</div>
        <div className="text-2xl font-bold mt-2" style={{ color: BLUE }}>
          {formatARS(kpis.valor_total_cotizado || 0)}
        </div>
      </Card>
      <Card>
        <div className="text-sm" style={{ color: MUTED }}>⚡ Tiempo respuesta promedio</div>
        <div className="text-3xl font-bold mt-2" style={{ color: TEXT }}>
          {formatTiempoRespuesta(kpis.tiempo_respuesta_promedio_minutos ?? kpis.tiempo_respuesta_promedio)}
        </div>
      </Card>
    </section>
  );

  const sectionCotizacionesDia = (
    <section>
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <SectionTitle>Cotizaciones por día</SectionTitle>
            {errors.cotizaciones && <ErrorMsg />}
          <div className="flex flex-wrap gap-2">
            {([
              { k: 'bar', label: 'Barras' },
              { k: 'line', label: 'Línea' },
            ] as const).map((b) => {
              const active = cotChartType === b.k;
              return (
                <button
                  key={b.k}
                  onClick={() => setCotChartType(b.k)}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
                  style={{
                    background: active ? BLUE : BG,
                    color: active ? '#fff' : TEXT,
                    border: `1px solid ${active ? BLUE : BORDER}`,
                  }}
                >
                  {b.label}
                </button>
              );
            })}
            <span className="mx-1" style={{ color: BORDER }}>|</span>
            {([
              { k: '7d', label: '7 días' },
              { k: '30d', label: '30 días' },
              { k: '3m', label: '3 meses' },
              { k: '1y', label: '1 año' },
            ] as const).map((p) => {
              const active = cotPeriodo === p.k;
              return (
                <button
                  key={p.k}
                  onClick={() => setCotPeriodo(p.k)}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
                  style={{
                    background: active ? BLUE : BG,
                    color: active ? '#fff' : TEXT,
                    border: `1px solid ${active ? BLUE : BORDER}`,
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            {cotChartType === 'bar' ? (
              <BarChart data={cotizacionesData}>
                <CartesianGrid stroke={BORDER} strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke={MUTED} tick={{ fontSize: 11 }} />
                <YAxis stroke={MUTED} tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="total" fill={BLUE} name="Cotizaciones" />
              </BarChart>
            ) : (
              <LineChart data={cotizacionesData}>
                <CartesianGrid stroke={BORDER} strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke={MUTED} tick={{ fontSize: 11 }} />
                <YAxis stroke={MUTED} tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke={YELLOW}
                  strokeWidth={2}
                  dot={{ r: 3, fill: YELLOW, stroke: YELLOW }}
                  activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                  name="Cotizaciones"
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </Card>
    </section>
  );

  const sectionCanal = (
    <section>
      <Card>
        <SectionTitle>Cotizaciones por canal</SectionTitle>
        {errors.canales ? (
          <ErrorMsg />
        ) : (
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={canales} margin={{ top: 24, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid stroke={BORDER} strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke={MUTED} />
                <YAxis stroke={MUTED} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} formatter={(v: any) => [v, 'Cantidad']} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} label={{ position: 'top', fill: TEXT, fontSize: 12, fontWeight: 700 }}>
                  {canales.map((c, i) => (
                    <Cell key={i} fill={c.name?.toLowerCase() === 'web' ? BLUE : c.name?.toLowerCase() === 'chatbot' ? YELLOW : '#64748b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </section>
  );

  const sectionTicket = (
    <section>
      <Card>
        <SectionTitle>Evolución del ticket promedio (semanal)</SectionTitle>
        {errors.ticketPromedio && ticketPromedioSemanal.length === 0 ? (
          <ErrorMsg />
        ) : (
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={ticketPromedioSemanal} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
                <CartesianGrid stroke={BORDER} strokeDasharray="3 3" />
                <XAxis dataKey="mes_label" stroke={MUTED} />
                <YAxis
                  stroke={MUTED}
                  tickFormatter={(v: number) =>
                    `$ ${Number(v || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
                  }
                  width={100}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ stroke: BORDER }}
                  labelFormatter={(label: any) => String(label)}
                  formatter={(value: any, name: any) => {
                    if (name === 'ticket_promedio') return [formatARS(Number(value)), 'Ticket promedio'];
                    return [value, name];
                  }}
                  content={({ active, payload, label }: any) => {
                    if (!active || !payload || !payload.length) return null;
                    const p = payload[0].payload;
                    return (
                      <div style={{ ...tooltipStyle, padding: '8px 12px' }}>
                        <div style={{ color: TEXT, fontWeight: 600, marginBottom: 4 }}>{label}</div>
                        <div style={{ color: '#22c55e', fontSize: 13 }}>
                          Ticket promedio: {formatARS(p.ticket_promedio)}
                        </div>
                        <div style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>
                          Cotizaciones: {p.cantidad_cotizaciones}
                        </div>
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="ticket_promedio"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#22c55e', stroke: '#22c55e' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </section>
  );

  const sectionRanking = (
    <section>
      <Card>
        <SectionTitle>Ranking de productos más cotizados</SectionTitle>
        {errors.ranking && <ErrorMsg />}
        <div style={{ width: '100%', height: Math.max(320, ranking.length * 36) }}>
          <ResponsiveContainer>
            <BarChart data={ranking} layout="vertical" margin={{ left: 40, right: 30 }}>
              <CartesianGrid stroke={BORDER} strokeDasharray="3 3" />
              <XAxis type="number" stroke={MUTED} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="nombre" stroke={MUTED} width={160} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: TEXT }} />
              <Bar dataKey="veces_cotizado" fill={BLUE} name="Veces cotizado" />
              <Bar dataKey="total_unidades_cotizadas" fill={YELLOW} name="Unidades cotizadas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </section>
  );

  const sectionCategorias = (
    <section>
      <Card>
        <SectionTitle>Categorías más pedidas</SectionTitle>
        <p className="text-xs mb-4" style={{ color: MUTED }}>Útil para campañas de marketing</p>
        {errors.categoriasPedidas && <ErrorMsg />}
        <div style={{ width: '100%', height: Math.max(260, categoriasPedidas.length * 44) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={categoriasPedidas}
              layout="vertical"
              margin={{ top: 8, right: 24, left: 24, bottom: 8 }}
            >
              <CartesianGrid stroke={BORDER} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" stroke={MUTED} tick={{ fill: MUTED, fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="categoria"
                stroke={MUTED}
                tick={{ fill: TEXT, fontSize: 12 }}
                width={140}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Legend wrapperStyle={{ color: TEXT }} />
              <Bar dataKey="veces_pedida" fill={BLUE} name="Veces pedida" />
              <Bar dataKey="unidades_totales" fill={YELLOW} name="Unidades totales" />
            </BarChart>
          </ResponsiveContainer>
          {categoriasPedidas.length === 0 && !errors.categoriasPedidas && (
            <p className="py-4 text-center text-sm" style={{ color: MUTED }}>Sin datos</p>
          )}
        </div>
      </Card>
    </section>
  );

  const sectionClientes = (
    <section>
      <Card>
        <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
          <SectionTitle>Clientes frecuentes</SectionTitle>
          {errors.clientes && <ErrorMsg />}
          <button
            onClick={exportClientes}
            disabled={clientes.length === 0}
            style={{ ...exportBtnStyle, opacity: clientes.length === 0 ? 0.5 : 1 }}
          >
            ↓ Exportar CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: MUTED, borderBottom: `1px solid ${BORDER}` }}>
                <th className="text-left py-2 px-3">Nombre</th>
                <th className="text-left py-2 px-3">Email</th>
                <th className="text-left py-2 px-3">Teléfono</th>
                <th className="text-left py-2 px-3">Categoría favorita</th>
                <th className="text-right py-2 px-3">Total cotizaciones</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c, i) => {
                const catColors: Record<string, { bg: string; color: string }> = {
                  Didacticos: { bg: '#1565C0', color: '#fff' },
                  Muñecas: { bg: '#9333ea', color: '#fff' },
                  Accion: { bg: '#f97316', color: '#fff' },
                  'Juegos de Mesa': { bg: '#16a34a', color: '#fff' },
                  Bebes: { bg: '#ec4899', color: '#fff' },
                  bebes: { bg: '#ec4899', color: '#fff' },
                  Vehiculos: { bg: '#06b6d4', color: '#0f172a' },
                };
                const cat = c.categoria_favorita;
                const cc = cat ? catColors[cat] : null;
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td className="py-2 px-3">{c.cliente_frecuente}</td>
                    <td className="py-2 px-3" style={{ color: MUTED }}>{c.email ?? '—'}</td>
                    <td className="py-2 px-3" style={{ color: MUTED }}>{c.telefono ?? '—'}</td>
                    <td className="py-2 px-3">
                      {cat ? (
                        <Badge color={cc?.color ?? '#fff'} bg={cc?.bg ?? '#64748b'}>{cat}</Badge>
                      ) : (
                        <span style={{ color: MUTED }}>—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold">{c.total_cotizaciones_cliente}</td>
                  </tr>
                );
              })}
              {clientes.length === 0 && (
                <tr><td colSpan={5} className="py-4 px-3 text-center" style={{ color: MUTED }}>Sin datos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );

  const sectionHistorico = (
    <section>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Histórico de precios</SectionTitle>
          {errors.historico && <ErrorMsg />}
          <button
            onClick={exportHistorico}
            disabled={!selectedProducto || historico.length === 0}
            style={{ ...exportBtnStyle, opacity: !selectedProducto || historico.length === 0 ? 0.5 : 1 }}
          >
            ↓ Exportar CSV
          </button>
        </div>
        <div className="mb-4 flex items-center gap-3 flex-wrap">
          <div className="relative" style={{ minWidth: 280 }}>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShowResults(true); }}
              onFocus={() => setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 150)}
              placeholder={selectedProducto?.nombre || 'Buscar por nombre o código...'}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT }}
            />
            {showResults && filteredProductos.length > 0 && (
              <ul
                className="absolute z-10 mt-1 w-full max-h-64 overflow-auto rounded-lg text-sm"
                style={{ background: CARD, border: `1px solid ${BORDER}` }}
              >
                {filteredProductos.map((p) => (
                  <li
                    key={p.id}
                    onMouseDown={() => {
                      setSelectedProducto(p);
                      setSearch('');
                      setShowResults(false);
                    }}
                    className="px-3 py-2 cursor-pointer hover:opacity-80"
                    style={{ color: TEXT, borderBottom: `1px solid ${BORDER}` }}
                  >
                    <div className="text-sm font-medium">{p.nombre}</div>
                    {p.sku && (
                      <div className="text-[11px]" style={{ color: MUTED }}>
                        SKU: {p.sku}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {margenActual != null && (
            <Badge color="#0f172a" bg={YELLOW}>
              Margen actual: {Number(margenActual).toFixed(2)}%
            </Badge>
          )}
          {stockBadge()}
        </div>
        <div style={{ width: '100%', height: 400 }}>
          <ResponsiveContainer>
            <LineChart data={historico}>
              <CartesianGrid stroke={BORDER} strokeDasharray="3 3" />
              <XAxis dataKey="fecha_label" stroke={MUTED} tick={{ fontSize: 11 }} />
              <YAxis stroke={MUTED} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => String(l)} />
              <Legend wrapperStyle={{ color: TEXT }} />
              <Line type="monotone" dataKey="precio_publico" stroke={BLUE} strokeWidth={2} dot={{ r: 3, fill: BLUE, stroke: BLUE }} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} name="Precio público" />
              <Line type="monotone" dataKey="precio_proveedor" stroke={YELLOW} strokeWidth={2} dot={{ r: 3, fill: YELLOW, stroke: YELLOW }} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} name="Precio proveedor" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </section>
  );

  const sectionStock = (() => {
    const getEstado = (s: number) => {
      if (s === 0) return { key: 'sin', label: 'Sin stock', bg: '#ef4444', color: '#fff' };
      if (s <= 10) return { key: 'critico', label: 'Stock crítico', bg: '#f97316', color: '#fff' };
      if (s <= 50) return { key: 'bajo', label: 'Stock bajo', bg: YELLOW, color: '#0f172a' };
      return { key: 'en', label: 'En stock', bg: '#16a34a', color: '#fff' };
    };
    const filtered = stockAll
      .filter((p) => {
        if (stockSearch) {
          const q = stockSearch.toLowerCase();
          if (!p.nombre.toLowerCase().includes(q) && !(p.sku || '').toLowerCase().includes(q)) return false;
        }
        if (stockFilter === 'todos') return true;
        return getEstado(p.stock).key === stockFilter;
      })
      .sort((a, b) => a.stock - b.stock);
    const filters: { key: typeof stockFilter; label: string }[] = [
      { key: 'todos', label: 'Todos' },
      { key: 'sin', label: 'Sin stock' },
      { key: 'critico', label: 'Stock crítico' },
      { key: 'bajo', label: 'Stock bajo' },
      { key: 'en', label: 'En stock' },
    ];
    return (
      <section>
        <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
              <SectionTitle>Estado de stock</SectionTitle>
              {errors.stockAll && <ErrorMsg />}
              <button
                onClick={() => exportStock(filtered)}
                disabled={filtered.length === 0}
                style={{ ...exportBtnStyle, opacity: filtered.length === 0 ? 0.5 : 1 }}
              >
                ↓ Exportar CSV
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <input
                type="text"
                placeholder="Buscar por nombre o SKU..."
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                className="px-3 py-2 rounded-md text-sm w-full sm:w-72 outline-none"
                style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT }}
              />
              <div className="flex flex-wrap gap-2">
                {filters.map((f) => {
                  const active = stockFilter === f.key;
                  return (
                    <button
                      key={f.key}
                      onClick={() => setStockFilter(f.key)}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
                      style={{
                        background: active ? BLUE : BG,
                        color: active ? '#fff' : TEXT,
                        border: `1px solid ${active ? BLUE : BORDER}`,
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${BORDER}` }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: MUTED, background: BG, borderBottom: `1px solid ${BORDER}` }}>
                    <th className="text-left py-2 px-3 font-medium">Producto</th>
                    <th className="text-left py-2 px-3 font-medium">SKU</th>
                    <th className="text-left py-2 px-3 font-medium">Proveedor</th>
                    <th className="text-right py-2 px-3 font-medium">Stock</th>
                    <th className="text-left py-2 px-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const est = getEstado(p.stock);
                    return (
                      <tr key={p.id} style={{ borderBottom: `1px solid ${BORDER}`, color: TEXT }}>
                        <td className="py-2 px-3">{p.nombre}</td>
                        <td className="py-2 px-3" style={{ color: MUTED, fontSize: 11 }}>{p.sku || '—'}</td>
                        <td className="py-2 px-3" style={{ color: MUTED }}>{p.proveedor}</td>
                        <td className="py-2 px-3 text-right font-semibold">{p.stock}</td>
                        <td className="py-2 px-3"><Badge color={est.color} bg={est.bg}>{est.label}</Badge></td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={5} className="py-4 px-3 text-center" style={{ color: MUTED }}>Sin resultados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </section>
    );
  })();

  const sectionReglas = (
    <section>
      <Card>
        <SectionTitle>Reglas de negocio vigentes</SectionTitle>
        {errors.reglas && <ErrorMsg />}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: MUTED, borderBottom: `1px solid ${BORDER}` }}>
                <th className="text-left py-2 px-3">Nombre</th>
                <th className="text-left py-2 px-3">Tipo</th>
                <th className="text-right py-2 px-3">Valor</th>
                <th className="text-left py-2 px-3">Descripción</th>
                <th className="text-left py-2 px-3">Vigente desde</th>
                <th className="text-center py-2 px-3">Activo</th>
              </tr>
            </thead>
            <tbody>
              {reglas.map((r: any, i) => {
                const tipoMap: Record<string, string> = {
                  costo_fijo: 'Costo Fijo',
                  costo_variable: 'Costo Variable',
                  margen_ganancia: 'Margen de Ganancia',
                };
                const tipoLabel = tipoMap[r.tipo_regla] ?? (r.tipo_regla ?? '—');
                const valorNum = Number(r.valor);
                const valorLabel = isNaN(valorNum) ? '—' : `${Math.round(valorNum * 100)}%`;
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td className="py-2 px-3">{r.nombre_regla}</td>
                    <td className="py-2 px-3">{tipoLabel}</td>
                    <td className="py-2 px-3 text-right">{valorLabel}</td>
                    <td className="py-2 px-3 text-xs" style={{ color: MUTED }}>{r.descripcion ?? '—'}</td>
                    <td className="py-2 px-3">{r.fecha_vigencia ? formatFechaCorta(r.fecha_vigencia) : '—'}</td>
                    <td className="py-2 px-3 text-center">{activoBadge(!!r.activo)}</td>
                  </tr>
                );
              })}
              {reglas.length === 0 && (
                <tr><td colSpan={6} className="py-4 px-3 text-center" style={{ color: MUTED }}>Sin reglas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );

  const sectionEquipo = (
    <section>
      <Card>
        <SectionTitle>Equipo con acceso al sistema</SectionTitle>
        {errors.equipo && <ErrorMsg />}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: MUTED, borderBottom: `1px solid ${BORDER}` }}>
                <th className="text-left py-2 px-3">Nombre</th>
                <th className="text-left py-2 px-3">Email</th>
                <th className="text-left py-2 px-3">Rol</th>
                <th className="text-center py-2 px-3">Activo</th>
              </tr>
            </thead>
            <tbody>
              {equipo.map((u: any, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td className="py-2 px-3">{u.nombre_completo}</td>
                  <td className="py-2 px-3" style={{ color: MUTED }}>{u.email}</td>
                  <td className="py-2 px-3">{rolBadge(u.rol)}</td>
                  <td className="py-2 px-3 text-center">{activoBadge(!!u.activo)}</td>
                </tr>
              ))}
              {equipo.length === 0 && (
                <tr><td colSpan={4} className="py-4 px-3 text-center" style={{ color: MUTED }}>Sin usuarios</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );

  return (
    <div style={{ background: BG, minHeight: '100vh', color: TEXT, fontFamily: 'Inter, Poppins, system-ui, sans-serif' }}>
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-12">
        {/* HERO */}
        <header className="space-y-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <span className="text-5xl leading-none" aria-hidden="true">🧸</span>
              <div>
                <h1 className="text-4xl font-bold tracking-tight" style={{ color: TEXT }}>
                  JugueteAR · Dashboard Comercial
                </h1>
                <p style={{ color: MUTED }} className="text-sm mt-2">
                  Panel de control en tiempo real · Análisis de ventas, productos y pricing
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {dashboardUser?.nombre_completo && (
                <div className="text-sm px-3 py-1.5 rounded-full"
                     style={{ background: CARD, border: `1px solid ${BORDER}`, color: TEXT }}>
                  {dashboardUser.nombre_completo}
                </div>
              )}
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = '/login';
                }}
                className="text-sm px-3 py-1.5 rounded-md font-medium transition-opacity hover:opacity-90"
                style={{ background: BLUE, color: '#fff' }}
              >
                Cerrar sesión
              </button>
            </div>
          </div>

          {/* Hero stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border p-5" style={{ background: CARD, borderColor: BORDER }}>
              <div className="text-xs uppercase tracking-wide" style={{ color: MUTED }}>📅 Cotizaciones del mes</div>
              <div className="text-3xl font-bold mt-2" style={{ color: TEXT }}>{heroStats.mes}</div>
            </div>
            <div className="rounded-2xl border p-5" style={{ background: CARD, borderColor: BORDER }}>
              <div className="text-xs uppercase tracking-wide" style={{ color: MUTED }}>📈 Cotizaciones esta semana</div>
              <div className="text-3xl font-bold mt-2" style={{ color: TEXT }}>{heroStats.semana}</div>
            </div>
            <div className="rounded-2xl border p-5" style={{ background: CARD, borderColor: BORDER }}>
              <div className="text-xs uppercase tracking-wide" style={{ color: MUTED }}>💰 Total cotizado del mes</div>
              <div className="text-2xl font-bold mt-2" style={{ color: BLUE }}>{formatARS(heroStats.totalMes)}</div>
            </div>
          </div>

          <div style={{ borderBottom: `1px solid ${BORDER}` }} />
        </header>

        {/* 📊 RESUMEN EJECUTIVO */}
        <SectionHeader emoji="📊" title="RESUMEN EJECUTIVO" question="¿Cómo estamos?" />
        {sectionKPIs}

        {/* 📈 ACTIVIDAD COMERCIAL */}
        <SectionHeader emoji="📈" title="ACTIVIDAD COMERCIAL" question="¿Cómo va la actividad?" />
        {sectionCotizacionesDia}
        {sectionCanal}
        {sectionTicket}

        {/* 🛒 PRODUCTOS MÁS COTIZADOS */}
        <SectionHeader emoji="🛒" title="PRODUCTOS MÁS COTIZADOS" question="¿Qué se vende?" />
        {sectionRanking}

        {/* 🎯 INTELIGENCIA DE MARKETING */}
        <SectionHeader emoji="🎯" title="INTELIGENCIA DE MARKETING" question="¿A quién y qué le gusta?" />
        {sectionCategorias}
        {sectionClientes}

        {/* 💰 ANÁLISIS DE PRICING */}
        <SectionHeader emoji="💰" title="ANÁLISIS DE PRICING" question="¿A qué precio?" />
        {sectionHistorico}
        <SimuladorPricing reglas={reglas} />

        {/* 📦 STOCK E INVENTARIO */}
        <SectionHeader emoji="📦" title="STOCK E INVENTARIO" question="¿Tenemos para vender?" />
        {sectionStock}

        {/* ⚙️ ADMINISTRACIÓN */}
        <SectionHeader emoji="⚙️" title="ADMINISTRACIÓN" question="¿Quién maneja el sistema?" />
        {sectionReglas}
        {sectionEquipo}

        {/* Modal Pendientes */}
        {showPendientes && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setShowPendientes(false)}
          >
            <div
              className="w-full max-w-4xl rounded-2xl border max-h-[85vh] overflow-hidden flex flex-col"
              style={{ background: CARD, borderColor: BORDER }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: BORDER }}>
                <h3 className="text-lg font-semibold" style={{ color: TEXT }}>Cotizaciones pendientes</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={exportPendientes}
                    disabled={pendientes.length === 0}
                    style={{ ...exportBtnStyle, opacity: pendientes.length === 0 ? 0.5 : 1 }}
                  >
                    ↓ Exportar CSV
                  </button>
                  <button
                    onClick={() => setShowPendientes(false)}
                    className="px-3 py-1 rounded-lg text-sm"
                    style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT }}
                  >
                    Cerrar ✕
                  </button>
                </div>
              </div>
              <div className="overflow-auto p-5">
                {errors.pendientes ? (
                  <ErrorMsg />
                ) : loadingPendientes ? (
                  <div className="text-center py-8" style={{ color: MUTED }}>Cargando…</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ color: MUTED, borderBottom: `1px solid ${BORDER}` }}>
                        <th className="text-left py-2 px-3">Cliente</th>
                        <th className="text-left py-2 px-3">Fecha de cotización</th>
                        <th className="text-right py-2 px-3">Total ARS</th>
                        <th className="text-left py-2 px-3">Canal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendientes.map((c: any, i) => {
                        const cliente =
                          c.usuarios?.nombre_completo ||
                          c.nombre_completo ||
                          c.cliente ||
                          c.nombre_cliente ||
                          '—';
                        const fechaIso =
                          c.fecha_cotizacion || c.fecha_creacion || c.created_at || c.fecha || '';
                        const total = Number(c.total_ars ?? c.total ?? c.monto_total ?? 0);
                        const canal = c.canal || c.origen || '—';
                        return (
                          <tr key={c.id ?? i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                            <td className="py-2 px-3">{cliente}</td>
                            <td className="py-2 px-3">{formatFechaCorta(fechaIso)}</td>
                            <td className="py-2 px-3 text-right font-semibold" style={{ color: BLUE }}>{formatARS(total)}</td>
                            <td className="py-2 px-3">{canal}</td>
                          </tr>
                        );
                      })}
                      {pendientes.length === 0 && (
                        <tr><td colSpan={4} className="py-6 px-3 text-center" style={{ color: MUTED }}>Sin cotizaciones pendientes</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        <footer className="text-center text-xs pb-4" style={{ color: MUTED }}>
          JugueteAR · Dashboard interno · acceso solo por URL
        </footer>
      </div>
    </div>
  );
};

export default Dashboard;
