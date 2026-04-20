import { ShoppingCart, Home } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useNavigate, useLocation } from 'react-router-dom';

const Header = () => {
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const onCatalogo = location.pathname === '/catalogo';

  return (
    <header className="sticky top-0 z-50 bg-card shadow-md">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <button onClick={() => navigate('/')} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <span className="text-3xl">🧸</span>
          <h1 className="text-2xl font-extrabold text-primary tracking-tight">JugueteAR</h1>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/catalogo')}
            className="hidden sm:inline-flex px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
          >
            Ver catálogo
          </button>
          <button
            onClick={() => navigate('/cotizar')}
            className="relative p-2 rounded-full bg-secondary text-secondary-foreground hover:opacity-90 transition-opacity"
            aria-label="Ver carrito"
          >
            <ShoppingCart className="w-6 h-6" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-bounce-in">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
