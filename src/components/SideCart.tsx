import { useState } from 'react';
import { ShoppingCart, X, Trash2, ChevronRight } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { formatPrice } from '@/lib/formatPrice';

const SideCart = () => {
  const { items, totalItems, totalPrice, removeItem } = useCart();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      {/* Floating trigger */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir carrito"
          className="fixed top-1/2 right-0 -translate-y-1/2 z-40 bg-primary text-primary-foreground rounded-l-xl shadow-lg px-3 py-4 flex flex-col items-center gap-1 hover:opacity-90 transition-opacity"
        >
          <ShoppingCart className="w-6 h-6" />
          {totalItems > 0 && (
            <span className="bg-accent text-accent-foreground text-xs font-bold rounded-full min-w-[22px] h-[22px] px-1 flex items-center justify-center">
              {totalItems}
            </span>
          )}
        </button>
      )}

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panel */}
      <aside
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-card text-card-foreground z-50 shadow-2xl border-l border-border transform transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        } flex flex-col`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary text-secondary-foreground">
          <div className="flex items-center gap-2 font-bold">
            <ShoppingCart className="w-5 h-5" /> Tu carrito ({totalItems})
          </div>
          <button onClick={() => setOpen(false)} aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <p className="text-center text-muted-foreground mt-10 text-sm">
              Tu carrito está vacío 🧸
            </p>
          ) : (
            items.map(i => (
              <div
                key={i.id}
                className="flex items-start justify-between gap-2 p-3 rounded-md bg-background border border-border"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{i.nombre}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {i.cantidad} × {formatPrice(i.precio_publico)}
                  </p>
                  <p className="text-sm font-bold text-primary mt-1">
                    {formatPrice(i.cantidad * i.precio_publico)}
                  </p>
                </div>
                <button
                  onClick={() => removeItem(i.id)}
                  className="p-1.5 rounded-md text-destructive hover:bg-destructive/10"
                  aria-label="Quitar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border p-4 space-y-3 bg-secondary/30">
          <div className="flex items-center justify-between text-base font-bold">
            <span>Total</span>
            <span className="text-primary">{formatPrice(totalPrice)}</span>
          </div>
          <button
            onClick={() => { setOpen(false); navigate('/cotizar'); }}
            disabled={items.length === 0}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Ir a cotizar <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
};

export default SideCart;
