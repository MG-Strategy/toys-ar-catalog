import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from 'recharts';

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

const Badge = ({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) => (
  <span
    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
    style={{ background: bg, color }}
  >
    {children}
  </span>
);

type ProductoOpt = { id: string; nombre: string; codigo_proveedor?: string | null };

const formatFechaCorta = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
};

const Dashboard = () => {
  const [kpis, setKpis] = useState<KPIs>({});
  const [estados, setEstados] = useState<{ name: string; value: number }[]>([]);
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
  const [stockAll, setStockAll] = useState<{ id: string; nombre: string; stock: number }[]>([]);

  // KPIs
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('vista_dashboard_kpis').select('*').limit(1).maybeSingle();
      if (data) setKpis(data as any);
    })();
  }, []);

  // Estados donut
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('cotizaciones_globales').select('estado');
      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((r: any) => {
          const k = r.estado || 'desconocido';
          counts[k] = (counts[k] || 0) + 1;
        });
        setEstados(Object.entries(counts).map(([name, value]) => ({ name, value })));
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
          .select('id, nombre')
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
        opts.push({ id: r.id, nombre: r.nombre, codigo_proveedor: codigoMap.get(r.id) ?? null });
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
        (p.codigo_proveedor || '').toLowerCase().includes(q)
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
      const { data } = await supabase
        .from('vista_ranking_productos')
        .select('*')
        .order('veces_cotizado', { ascending: false })
        .limit(10);
      if (data) setRanking(data);
    })();
  }, []);

  // Clientes frecuentes (desde misma vista)
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('vista_ranking_productos')
        .select('cliente_frecuente, total_cotizaciones_cliente')
        .order('total_cotizaciones_cliente', { ascending: false });
      if (data) {
        const seen = new Set<string>();
        const dedup: any[] = [];
        for (const r of data as any[]) {
          if (!r.cliente_frecuente) continue;
          if (seen.has(r.cliente_frecuente)) continue;
          seen.add(r.cliente_frecuente);
          dedup.push(r);
          if (dedup.length >= 10) break;
        }
        setClientes(dedup);
      }
    })();
  }, []);

  // Reglas
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('reglas_negocio').select('*');
      if (data) setReglas(data);
    })();
  }, []);

  // Equipo
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('usuarios_dashboard')
        .select('nombre_completo, email, activo, roles_dashboard(rol)')
        .eq('activo', true);
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
      const { data } = await supabase
        .from('vista_catalogo_vigente')
        .select('id, nombre, stock')
        .order('nombre', { ascending: true });
      if (data) {
        const seen = new Set<string>();
        const arr: { id: string; nombre: string; stock: number }[] = [];
        for (const r of data as any[]) {
          if (!r?.id || seen.has(r.id)) continue;
          seen.add(r.id);
          arr.push({ id: r.id, nombre: r.nombre, stock: Number(r.stock ?? 0) });
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
      .select('*, usuarios(nombre_completo)')
      .eq('estado', 'pendiente');
    if (error) {
      const r = await supabase.from('cotizaciones_globales').select('*').eq('estado', 'pendiente');
      data = r.data as any;
    }
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

  return (
    <div style={{ background: BG, minHeight: '100vh', color: TEXT, fontFamily: 'Inter, Poppins, system-ui, sans-serif' }}>
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: TEXT }}>JugueteAR · Dashboard</h1>
            <p style={{ color: MUTED }} className="text-sm mt-1">Panel interno de control</p>
          </div>
          <div className="text-xs px-3 py-1 rounded-full" style={{ background: CARD, border: `1px solid ${BORDER}`, color: MUTED }}>
            modo administrador
          </div>
        </header>

        {/* SECTION 1 — KPIs */}
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

        {/* SECTION 2 + 3 */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <SectionTitle>Cotizaciones por estado</SectionTitle>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={estados}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {estados.map((e, i) => (
                      <Cell key={i} fill={STATE_COLORS[e.name] || '#64748b'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ color: TEXT }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <SectionTitle>Histórico de precios</SectionTitle>
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
                        <div className="text-[10px]" style={{ color: MUTED }}>
                          Código: {p.codigo_proveedor || '—'}
                        </div>
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
            <div style={{ width: '100%', height: 260 }}>
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

        {/* SECTION 3.5 — Estado de stock */}
        <section>
          <Card>
            <SectionTitle>Estado de stock</SectionTitle>
            {(() => {
              const sinStock = stockAll.filter((p) => p.stock === 0);
              const critico = stockAll.filter((p) => p.stock >= 1 && p.stock <= 10);
              const bajo = stockAll.filter((p) => p.stock >= 11 && p.stock <= 50);
              const enStock = stockAll.filter((p) => p.stock > 50);
              const Col = ({ title, items, bg, color }: { title: string; items: typeof stockAll; bg: string; color: string }) => (
                <div className="rounded-xl p-3" style={{ background: BG, border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-sm" style={{ color: TEXT }}>{title}</span>
                    <Badge color={color} bg={bg}>{items.length}</Badge>
                  </div>
                  <ul className="space-y-2 max-h-72 overflow-auto pr-1">
                    {items.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-2 text-xs" style={{ color: TEXT }}>
                        <span className="truncate" title={p.nombre}>{p.nombre}</span>
                        <Badge color={color} bg={bg}>{p.stock}</Badge>
                      </li>
                    ))}
                    {items.length === 0 && (
                      <li className="text-xs text-center py-2" style={{ color: MUTED }}>—</li>
                    )}
                  </ul>
                </div>
              );
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Col title="Sin stock" items={sinStock} bg="#ef4444" color="#fff" />
                  <Col title="Stock crítico" items={critico} bg="#f97316" color="#fff" />
                  <Col title="Stock bajo" items={bajo} bg={YELLOW} color="#0f172a" />
                  <Col title="En stock" items={enStock} bg="#16a34a" color="#fff" />
                </div>
              );
            })()}
          </Card>
        </section>
        <section>
          <Card>
            <SectionTitle>Ranking de productos más cotizados</SectionTitle>
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

        {/* SECTION 5 — Clientes frecuentes */}
        <section>
          <Card>
            <SectionTitle>Clientes frecuentes</SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: MUTED, borderBottom: `1px solid ${BORDER}` }}>
                    <th className="text-left py-2 px-3">Cliente</th>
                    <th className="text-right py-2 px-3">Total cotizaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((c, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td className="py-2 px-3">{c.cliente_frecuente}</td>
                      <td className="py-2 px-3 text-right font-semibold">{c.total_cotizaciones_cliente}</td>
                    </tr>
                  ))}
                  {clientes.length === 0 && (
                    <tr><td colSpan={2} className="py-4 px-3 text-center" style={{ color: MUTED }}>Sin datos</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        {/* SECTION 6 — Reglas de negocio */}
        <section>
          <Card>
            <SectionTitle>Reglas de negocio vigentes</SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: MUTED, borderBottom: `1px solid ${BORDER}` }}>
                    <th className="text-left py-2 px-3">Nombre</th>
                    <th className="text-right py-2 px-3">Margen %</th>
                    <th className="text-right py-2 px-3">Precio mín</th>
                    <th className="text-right py-2 px-3">Precio máx</th>
                    <th className="text-center py-2 px-3">Activa</th>
                  </tr>
                </thead>
                <tbody>
                  {reglas.map((r: any, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td className="py-2 px-3">{r.nombre_regla}</td>
                      <td className="py-2 px-3 text-right">{r.margen_porcentaje}%</td>
                      <td className="py-2 px-3 text-right">{r.condicion_precio_min ?? '—'}</td>
                      <td className="py-2 px-3 text-right">{r.condicion_precio_max ?? '—'}</td>
                      <td className="py-2 px-3 text-center">{activoBadge(!!r.activa)}</td>
                    </tr>
                  ))}
                  {reglas.length === 0 && (
                    <tr><td colSpan={5} className="py-4 px-3 text-center" style={{ color: MUTED }}>Sin reglas</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        {/* SECTION 7 — Equipo */}
        <section>
          <Card>
            <SectionTitle>Equipo con acceso al sistema</SectionTitle>
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
                <button
                  onClick={() => setShowPendientes(false)}
                  className="px-3 py-1 rounded-lg text-sm"
                  style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT }}
                >
                  Cerrar ✕
                </button>
              </div>
              <div className="overflow-auto p-5">
                {loadingPendientes ? (
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
