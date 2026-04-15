import { useNavigate } from 'react-router-dom';
import { getDisplayName } from '@/lib/categoryLabels';

const categories = [
  { dbValue: 'Vehiculos', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400' },
  { dbValue: 'Peluches', image: 'https://images.unsplash.com/photo-1558679908-541bcf1249ff?w=400' },
  { dbValue: 'Muñecas', image: 'https://images.unsplash.com/photo-1603356033288-acfcb54801e6?w=400' },
  { dbValue: 'Muñecos', image: 'https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=400' },
  { dbValue: 'Juegos de Mesa', image: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=400' },
  { dbValue: 'juguetes_educativos', image: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=400' },
  { dbValue: 'bebes', image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400' },
  { dbValue: 'exterior', image: 'https://images.unsplash.com/photo-1575783970733-1aaedde1db74?w=400' },
  { dbValue: 'manualidades', image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400' },
  { dbValue: 'electronicos', image: 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=400' },
  { dbValue: 'Accion', image: 'https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=400' },
  { dbValue: 'Didacticos', image: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=400' },
  { dbValue: 'Bebes', image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400' },
  { dbValue: 'otros', image: 'https://images.unsplash.com/photo-1472162072942-cd5147eb3902?w=400' },
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {categories.map(cat => (
            <button
              key={cat.dbValue}
              onClick={() => navigate(`/catalogo?categoria=${encodeURIComponent(cat.dbValue)}`)}
              className="rounded-2xl overflow-hidden relative h-[200px] shadow-lg cursor-pointer group transition-transform duration-300 hover:scale-105"
            >
              <img
                src={cat.image}
                alt={getDisplayName(cat.dbValue)}
                className="w-full h-full object-cover transition-all duration-300 group-hover:brightness-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <span className="absolute bottom-3 left-3 right-3 text-white font-bold text-sm md:text-base drop-shadow-lg">
                {getDisplayName(cat.dbValue)}
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
