import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const BG = '#0f172a';
const CARD = '#1e293b';
const BORDER = '#334155';
const TEXT = '#f1f5f9';
const MUTED = '#94a3b8';
const BLUE = '#1565C0';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // si ya hay sesión válida, redirigir
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: u } = await supabase
        .from('usuarios_dashboard')
        .select('activo')
        .eq('auth_user_id', session.user.id)
        .maybeSingle();
      if (u?.activo) navigate('/dashboard', { replace: true });
    })();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError || !data.user) {
        setError('Credenciales incorrectas');
        setLoading(false);
        return;
      }
      const { data: u, error: uErr } = await supabase
        .from('usuarios_dashboard')
        .select('activo')
        .eq('auth_user_id', data.user.id)
        .maybeSingle();
      if (uErr || !u || !u.activo) {
        await supabase.auth.signOut();
        setError('No tenés permisos para acceder al dashboard');
        setLoading(false);
        return;
      }
      navigate('/dashboard', { replace: true });
    } catch {
      setError('Ocurrió un error. Intentá nuevamente.');
      setLoading(false);
    }
  };

  return (
    <div style={{ background: BG, minHeight: '100vh', color: TEXT, fontFamily: 'Inter, Poppins, system-ui, sans-serif' }}
         className="flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: TEXT }}>JugueteAR</h1>
          <p style={{ color: MUTED }} className="text-sm mt-2">Acceso al panel interno</p>
        </div>
        <form onSubmit={handleSubmit}
              className="rounded-2xl border p-6 space-y-4"
              style={{ background: CARD, borderColor: BORDER }}>
          <div>
            <label className="block text-sm mb-1" style={{ color: MUTED }}>Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md px-3 py-2 outline-none"
              style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT }}
            />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: MUTED }}>Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md px-3 py-2 pr-10 outline-none"
                style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:opacity-80"
                style={{ color: MUTED, background: 'transparent' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {error && (
            <div className="text-sm rounded-md px-3 py-2"
                 style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#fca5a5' }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md py-2 font-semibold transition-opacity disabled:opacity-60"
            style={{ background: BLUE, color: '#fff' }}
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
