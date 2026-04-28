import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

type DashboardUser = { auth_user_id: string; nombre_completo: string | null; activo: boolean };

type Ctx = { user: DashboardUser | null };

export const DashboardAuthGuard = ({ children }: { children: (ctx: Ctx) => React.ReactNode }) => {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [user, setUser] = useState<DashboardUser | null>(null);

  useEffect(() => {
    let mounted = true;

    const verify = async (sessionUserId: string | undefined) => {
      if (!sessionUserId) {
        navigate('/login', { replace: true });
        return;
      }
      const { data, error } = await supabase
        .from('usuarios_dashboard')
        .select('auth_user_id, nombre_completo, activo')
        .eq('auth_user_id', sessionUserId)
        .maybeSingle();
      if (error || !data || !data.activo) {
        await supabase.auth.signOut();
        if (mounted) navigate('/login', { replace: true });
        return;
      }
      if (mounted) {
        setUser(data as DashboardUser);
        setChecked(true);
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/login', { replace: true });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      verify(session?.user.id);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  if (!checked) {
    return (
      <div style={{ background: '#0f172a', minHeight: '100vh', color: '#94a3b8' }}
           className="flex items-center justify-center text-sm">
        Verificando acceso…
      </div>
    );
  }

  return <>{children({ user })}</>;
};

export default DashboardAuthGuard;
