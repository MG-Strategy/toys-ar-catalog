import { useNavigate } from 'react-router-dom';

// dbValue = exact Supabase categoria value, label = display name
const categories = [
  { dbValue: 'Vehiculos', label: 'Vehículos', image: '/categorias/vehiculos.jpg' },
  { dbValue: 'Peluches', label: 'Peluches', emoji: '🧸', gradient: 'linear-gradient(135deg, #E91E63, #F48FB1)' },
  { dbValue: 'Muñecas', label: 'Muñecas', image: '/categorias/munecas.jpg' },
  { dbValue: 'Juegos de Mesa', label: 'Juegos de Mesa', emoji: '🎲', gradient: 'linear-gradient(135deg, #2E7D32, #81C784)' },
  { dbValue: 'Muñecos', label: 'Muñecos', emoji: '🤖', gradient: 'linear-gradient(135deg, #E65100, #FFB74D)' },
  { dbValue: 'bebes', label: 'Bebés', image: '/categorias/bebes.jpg' },
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
      {/* Hero - pastel gradient style */}
      <section 
        className="relative overflow-hidden py-20 md:py-28"
        style={{ 
          background: 'linear-gradient(135deg, #E0F7FA 0%, #FCE4EC 50%, #FFF3E0 100%)' 
        }}
      >
        {/* Floating decorative elements */}
        <div className="absolute top-10 left-10 w-16 h-16 rounded-full bg-sky-300/40 animate-bounce" style={{ animationDuration: '3s' }} />
        <div className="absolute top-32 right-20 w-10 h-10 rounded-full bg-pink-300/40 animate-bounce" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-16 left-1/4 w-12 h-12 rotate-45 bg-rose-200/30 animate-bounce" style={{ animationDuration: '3.5s' }} />
        <div className="absolute top-20 right-1/3 w-8 h-8 bg-cyan-300/40 rounded-full animate-bounce" style={{ animationDuration: '2.5s' }} />
        <div className="absolute bottom-10 right-10 text-5xl animate-bounce" style={{ animationDuration: '2s' }}>⭐</div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          {/* Balloon emoji */}
          <div className="text-6xl mb-4">🎈</div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-800 mb-4 leading-tight">
            ¡Cotizá tus juguetes{' '}
            <span style={{ color: '#26C6DA' }}>favoritos</span>{' '}
            <span style={{ color: '#F48FB1' }}>al instante!</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-xl mx-auto mb-8">
            Armá tu lista de juguetes, elegí las cantidades y pedí tu cotización personalizada. ¡Es rápido y fácil!
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/catalogo')}
              className="px-8 py-4 rounded-full font-bold text-lg hover:opacity-90 transition-opacity shadow-lg"
              style={{ backgroundColor: '#26C6DA', color: 'white' }}
            >
              🛍️ Cotizá ahora
            </button>
            <button
              onClick={() => navigate('/cotizar')}
              className="px-8 py-4 rounded-full bg-white/80 text-gray-700 font-bold text-lg border-2 hover:bg-white transition-colors shadow-lg"
              style={{ borderColor: '#F48FB1' }}
            >
              💬 Ver mi cotización
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
              key={cat.dbValue}
              onClick={() => navigate(`/catalogo?categoria=${encodeURIComponent(cat.dbValue)}`)}
              className="rounded-2xl overflow-hidden flex flex-col items-center hover:scale-105 transition-transform shadow-lg cursor-pointer text-white relative h-48"
              style={cat.gradient ? { background: cat.gradient } : undefined}
            >
              {cat.image ? (
                <>
                  <img src={cat.image} alt={cat.label} className="w-full h-full object-contain p-2" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                    <span className="font-bold text-base">{cat.label}</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full w-full p-8 gap-3">
                  <span style={{ fontSize: '5rem', lineHeight: 1 }}>{cat.emoji}</span>
                  <span className="font-bold text-lg">{cat.label}</span>
                </div>
              )}
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
