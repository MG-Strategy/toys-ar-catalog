import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/lib/formatPrice';
import { getCategoryColor } from '@/lib/categoryColors';
import { Plus, Minus, Image } from 'lucide-react';

interface Product {
  id: number;
  nombre: string;
  marca: string;
  categoria: string;
  stock: number;
  proveedor: string;
  precio_publico: number;
  url_imagen?: string | null;
  descripcion?: string | null;
}

const ProductCard = ({ product }: { product: Product }) => {
  const { items, addItem, updateQuantity, removeItem } = useCart();
  const inStock = product.stock > 0;
  const cartItem = items.find(i => i.id === product.id);
  const qty = cartItem?.cantidad ?? 0;

  const handleDecrease = () => {
    if (qty <= 1) removeItem(product.id);
    else updateQuantity(product.id, qty - 1);
  };

  const handleIncrease = () => {
    updateQuantity(product.id, qty + 1);
  };

  return (
    <div className="bg-card rounded-lg shadow-lg hover:shadow-xl transition-shadow flex flex-col overflow-hidden border border-border">
      {/* Product Image */}
      <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
        {product.url_imagen ? (
          <img 
            src={product.url_imagen} 
            alt={product.nombre}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground/50">
            <Image className="w-12 h-12 mb-2" />
            <span className="text-xs">Sin imagen</span>
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1 gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-lg text-card-foreground capitalize leading-tight">{product.nombre}</h3>
          <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full ${getCategoryColor(product.categoria)}`}>
            {product.categoria}
          </span>
        </div>
        {product.descripcion && (
          <p className="text-xs text-muted-foreground line-clamp-2">{product.descripcion}</p>
        )}
        <p className="text-sm text-muted-foreground">{product.marca}</p>
        <p className="text-xs text-muted-foreground/70">{product.proveedor}</p>

        <div className="mt-auto pt-3 flex items-end justify-between gap-2">
          <div>
            <p className="text-xl font-extrabold text-primary">{formatPrice(product.precio_publico)}</p>
            <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${inStock ? 'bg-toy-green/15 text-toy-green' : 'bg-accent/15 text-accent'}`}>
              {inStock ? 'En stock' : 'Sin stock'}
            </span>
          </div>
          {qty > 0 ? (
            <div className="flex items-center gap-0 rounded-md overflow-hidden border border-primary">
              <button
                onClick={handleDecrease}
                className="flex items-center justify-center w-8 h-9 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="flex items-center justify-center w-8 h-9 text-sm font-bold text-card-foreground bg-card select-none">
                {qty}
              </span>
              <button
                onClick={handleIncrease}
                className="flex items-center justify-center w-8 h-9 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              disabled={!inStock}
              onClick={() => addItem({ id: product.id, nombre: product.nombre, precio_publico: product.precio_publico })}
              className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" /> Agregar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
