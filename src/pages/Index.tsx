import { useNavigate } from 'react-router-dom';
import { getDisplayName } from '@/lib/categoryLabels';
import munecasCard from '@/assets/munecas-card.jpg';

const categories = [
  { dbValue: 'Vehiculos', image: 'https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=400&q=80' },
  { dbValue: 'Muñecas', image: munecasCard },
  { dbValue: 'Juegos de Mesa', image: 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=400&q=80' },
  { dbValue: 'bebes_ALL', label: 'Bebés', image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&q=80' },
  { dbValue: 'Accion', image: 'https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=400&q=80' },
  { dbValue: 'Didacticos', image: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=400&q=80' },
];

const features = [
  { emoji: '⚡', title: 'Precios en tiempo real', desc: 'Nuestros precios se actualizan automáticamente desde nuestros proveedores' },
  { emoji: '📋', title: 'Cotización instantánea', desc: 'Seleccioná los productos y recibí tu presupuesto en segundos' },
  { emoji: '🏪', title: 'Amplio catálogo', desc: 'Más de 68 productos de las mejores marcas' },
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative w-full min-h-[60vh] flex items-center justify-center py-20 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=1920&q=80"
            alt="Fondo de juguetes minimalista"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm" />
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-6 flex flex-col items-center text-center">
          <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight max-w-4xl" style={{ color: '#1a1a2e' }}>
            ¡Cotizá tus juguetes{' '}
            <span style={{ color: '#1565C0' }}>favoritos</span>{' '}
            <span style={{ color: '#FFD600' }}>al instante!</span>
          </h1>
          <p className="text-lg md:text-xl lg:text-2xl max-w-2xl mb-10 font-medium text-gray-700">
            Armá tu lista de juguetes, elegí las cantidades y pedí tu cotización personalizada. ¡Es rápido y fácil!
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md">
            <button
              onClick={() => navigate('/catalogo')}
              className="w-full sm:w-auto px-10 py-4 rounded-full font-bold text-lg hover:scale-105 transition-all shadow-xl text-white"
              style={{ backgroundColor: '#1565C0' }}
            >
              🛍️ Cotizá ahora
            </button>
            <button
              onClick={() => navigate('/cotizar')}
              className="w-full sm:w-auto px-10 py-4 rounded-full bg-white font-bold text-lg border-2 hover:bg-gray-50 hover:scale-105 transition-all shadow-xl"
              style={{ borderColor: '#FFD600', color: '#1a1a2e' }}
            >
              💬 Ver mi cotización
            </button>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-extrabold text-center text-foreground mb-10">Explorá por categoría</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {categories.map(cat => (
            <button
              key={`${cat.dbValue}-${cat.image}`}
              onClick={() => navigate(`/catalogo?categoria=${encodeURIComponent(cat.dbValue)}`)}
              className="rounded-2xl overflow-hidden relative h-[200px] shadow-lg cursor-pointer group transition-transform duration-300 hover:scale-105"
            >
              <img
                src={cat.image}
                alt={cat.label || getDisplayName(cat.dbValue)}
                className="w-full h-full object-cover transition-all duration-300 group-hover:brightness-110"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.style.backgroundColor = '#1565C0';
                  }
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <span className="absolute bottom-3 left-3 right-3 text-white font-bold text-sm md:text-base drop-shadow-lg">
                {cat.label || getDisplayName(cat.dbValue)}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Why Us */}
      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-extrabold text-center text-foreground mb-10">¿Por qué JugueteAR?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {features.map(f => (
              <div key={f.title} className="bg-card rounded-lg p-8 text-center shadow-md">
                <span className="text-4xl mb-4 block">{f.emoji}</span>
                <h3 className="font-bold text-lg text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm mb-3">© 2026 JugueteAR — Todos los derechos reservados</p>
          <div className="flex items-center justify-center gap-4 text-sm">
            <button onClick={() => navigate('/catalogo')} className="hover:underline">Catálogo</button>
            <span>|</span>
            <button onClick={() => navigate('/cotizar')} className="hover:underline">Cotizar</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
