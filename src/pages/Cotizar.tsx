import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/formatPrice';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, X, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Cotizar = () => {
  const { items, removeItem, updateQuantity, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ nombre_completo: '', email: '', telefono: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast({ title: 'El carrito está vacío', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      // 1. Check/create user
      const { data: existingUser } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', form.email)
        .maybeSingle();

      let userId: number;
      if (existingUser) {
        userId = existingUser.id;
      } else {
        const { data: newUser, error: userErr } = await supabase
          .from('usuarios')
          .insert({
            nombre_completo: form.nombre_completo,
            email: form.email,
            telefono: form.telefono || null,
          })
          .select('id')
          .single();
        if (userErr) throw userErr;
        userId = newUser.id;
      }

      // 2. Create quote
      const { data: quote, error: quoteErr } = await supabase
        .from('cotizaciones_globales')
        .insert({
          id_usuario: userId,
          fecha_cotizacion: new Date().toISOString(),
          estado: 'pendiente',
          total: totalPrice,
          canal: 'web',
          notas: null,
        })
        .select('id')
        .single();
      if (quoteErr) throw quoteErr;

      // 3. Insert items
      const quoteItems = items.map(i => ({
        id_cotizacion_global: quote.id,
        id_usuario: userId,
        fecha_cotizacion: new Date().toISOString(),
        id_producto: i.id,
        cantidad_productos: i.cantidad,
        precio_publico: i.precio_publico,
      }));
      const { error: itemsErr } = await supabase.from('cotizacion_productos').insert(quoteItems);
      if (itemsErr) throw itemsErr;

      toast({
        title: '✅ ¡Cotización enviada!',
        description: 'Nos contactaremos a la brevedad.',
      });
      clearCart();
      navigate('/');
    } catch (err: any) {
      toast({ title: 'Error al enviar cotización', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <button onClick={() => navigate('/catalogo')} className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline mb-4">
        <ArrowLeft className="w-4 h-4" /> Volver al catálogo
      </button>

      <h2 className="text-2xl font-extrabold text-foreground mb-4">Tu cotización</h2>

      {items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">El carrito está vacío 🛒</p>
          <button onClick={() => navigate('/catalogo')} className="mt-4 px-4 py-2 rounded-md bg-primary text-primary-foreground font-semibold text-sm">Ver catálogo</button>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-lg shadow overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="text-left p-3 font-semibold">Producto</th>
                  <th className="text-center p-3 font-semibold">Cantidad</th>
                  <th className="text-right p-3 font-semibold">Precio unit.</th>
                  <th className="text-right p-3 font-semibold">Subtotal</th>
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="p-3 font-medium capitalize">{item.nombre}</td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        min={1}
                        value={item.cantidad}
                        onChange={e => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                        className="w-16 text-center rounded border border-input bg-background py-1"
                      />
                    </td>
                    <td className="p-3 text-right">{formatPrice(item.precio_publico)}</td>
                    <td className="p-3 text-right font-bold">{formatPrice(item.cantidad * item.precio_publico)}</td>
                    <td className="p-3">
                      <button onClick={() => removeItem(item.id)} className="text-accent hover:opacity-70">
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4 border-t border-border flex justify-between items-center">
              <span className="text-xs text-muted-foreground">* Los precios pueden variar al momento de confirmar la cotización</span>
              <span className="text-lg font-extrabold text-primary">Total estimado: {formatPrice(totalPrice)}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bg-card rounded-lg shadow p-6 space-y-4">
            <h3 className="text-lg font-bold text-foreground">Datos de contacto</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1 text-foreground">Nombre completo *</label>
                <input required value={form.nombre_completo} onChange={e => setForm(f => ({ ...f, nombre_completo: e.target.value }))} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-foreground">Email *</label>
                <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold mb-1 text-foreground">Teléfono (opcional)</label>
                <input value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-md bg-primary text-primary-foreground font-bold text-base hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? 'Enviando...' : (
                <><CheckCircle className="w-5 h-5" /> Solicitar cotización</>
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
};

export default Cotizar;
