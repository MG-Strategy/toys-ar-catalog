import { useNavigate } from 'react-router-dom';

const categories = [
  { emoji: '🚗', name: 'Vehículos', color: 'bg-blue-100' },
  { emoji: '🧸', name: 'Peluches', color: 'bg-pink-100' },
  { emoji: '👧', name: 'Muñecas', color: 'bg-purple-100' },
  { emoji: '🎲', name: 'Juegos de Mesa', color: 'bg-green-100' },
  { emoji: '🤖', name: 'Muñecos', color: 'bg-orange-100' },
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
      <section className="relative overflow-hidden bg-gradient-to-br from-secondary/30 via-secondary/10 to-background py-20 md:py-28">
        {/* Floating shapes */}
        <div className="absolute top-10 left-10 w-16 h-16 rounded-full bg-toy-yellow/30 animate-bounce" style={{ animationDuration: '3s' }} />
        <div className="absolute top-32 right-20 w-10 h-10 rounded-full bg-toy-blue/20 animate-bounce" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-16 left-1/4 w-12 h-12 rotate-45 bg-toy-red/15 animate-bounce" style={{ animationDuration: '3.5s' }} />
        <div className="absolute top-20 right-1/3 w-8 h-8 bg-toy-green/20 rounded-full animate-bounce" style={{ animationDuration: '2.5s' }} />
        <div className="absolute bottom-10 right-10 text-5xl animate-bounce" style={{ animationDuration: '2s' }}>⭐</div>
        <div className="absolute top-10 right-10 text-4xl animate-bounce" style={{ animationDuration: '3s' }}>🎈</div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-extrabold text-foreground mb-4 leading-tight">
            Los mejores juguetes,<br />al mejor precio
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-8">
            Cotizá en segundos, recibí tu presupuesto al instante
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/catalogo')}
              className="px-8 py-4 rounded-lg bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition-opacity shadow-lg"
            >
              🧸 Ver catálogo
            </button>
            <button
              onClick={() => navigate('/cotizar')}
              className="px-8 py-4 rounded-lg bg-card text-foreground font-bold text-lg border-2 border-primary hover:bg-primary/10 transition-colors shadow-lg"
            >
              💬 Pedir cotización
            </button>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-extrabold text-center text-foreground mb-10">Explorá por categoría</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {categories.map(cat => (
            <button
              key={cat.name}
              onClick={() => navigate(`/catalogo?categoria=${encodeURIComponent(cat.name)}`)}
              className={`${cat.color} rounded-lg p-8 flex flex-col items-center gap-3 hover:scale-105 transition-transform shadow-md cursor-pointer`}
            >
              <span className="text-5xl">{cat.emoji}</span>
              <span className="font-bold text-foreground text-lg">{cat.name}</span>
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
