import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import ProductCard from '@/components/ProductCard';
import { Search, X } from 'lucide-react';

interface Product {
  id: number;
  nombre: string;
  marca: string;
  categoria: string;
  stock: number;
  proveedor: string;
  precio_publico: number;
}

const Index = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState('');
  const [marca, setMarca] = useState('');

  useEffect(() => {
    supabase.from('vista_catalogo_vigente').select('id, nombre, marca, categoria, stock, proveedor, precio_publico')
      .then(({ data }) => {
        setProducts((data as Product[]) || []);
        setLoading(false);
      });
  }, []);

  const categorias = useMemo(() => [...new Set(products.map(p => p.categoria).filter(Boolean))].sort(), [products]);
  const marcas = useMemo(() => [...new Set(products.map(p => p.marca).filter(Boolean))].sort(), [products]);

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (search && !p.nombre.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoria && p.categoria !== categoria) return false;
      if (marca && p.marca !== marca) return false;
      return true;
    });
  }, [products, search, categoria, marca]);

  const clearFilters = () => { setSearch(''); setCategoria(''); setMarca(''); };
  const hasFilters = search || categoria || marca;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Filters */}
      <div className="bg-card rounded-lg shadow p-4 mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select value={categoria} onChange={e => setCategoria(e.target.value)} className="px-3 py-2 rounded-md border border-input bg-background text-sm min-w-[150px]">
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={marca} onChange={e => setMarca(e.target.value)} className="px-3 py-2 rounded-md border border-input bg-background text-sm min-w-[150px]">
          <option value="">Todas las marcas</option>
          {marcas.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 rounded-md bg-accent text-accent-foreground text-sm font-semibold hover:opacity-90">
            <X className="w-4 h-4" /> Limpiar filtros
          </button>
        )}
        <span className="text-sm text-muted-foreground font-semibold ml-auto">{filtered.length} productos encontrados</span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-card rounded-lg shadow h-48 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground text-lg">
          No encontramos productos con esos filtros 🧸
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filtered.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
};

export default Index;
