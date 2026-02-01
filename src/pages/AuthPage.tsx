import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Activity, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useEffect } from 'react';

type AuthMode = 'landing' | 'login' | 'signup';

const AuthPage = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [mode, setMode] = useState<AuthMode>('landing');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      
      if (error) {
        toast({
          title: "Erreur de connexion",
          description: error.message || "Impossible de se connecter avec Google",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: "Compte existant",
              description: "Un compte existe déjà avec cet email. Connectez-vous.",
              variant: "destructive",
            });
          } else {
            throw error;
          }
        } else {
          toast({
            title: "Vérifiez votre email",
            description: "Un lien de confirmation a été envoyé à votre adresse.",
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: "Identifiants incorrects",
              description: "Email ou mot de passe invalide.",
              variant: "destructive",
            });
          } else {
            throw error;
          }
        } else {
          navigate('/', { replace: true });
        }
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur s'est produite",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Landing view
  if (mode === 'landing') {
    return (
      <div className="flex h-screen w-screen flex-col bg-gradient-to-br from-background via-background to-primary/5">
        {/* Hero Section */}
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          {/* Logo */}
          <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary shadow-lg shadow-primary/30">
            <Activity className="h-10 w-10 text-primary-foreground" />
          </div>
          
          {/* Title & Slogan */}
          <h1 className="mb-2 text-center text-3xl font-bold text-foreground">
            Votre Coach Santé
          </h1>
          <p className="mb-12 max-w-xs text-center text-muted-foreground">
            Nutrition, entraînement et récupération. Tout piloté par IA.
          </p>

          {/* Auth Buttons */}
          <div className="w-full max-w-sm space-y-4">
            {/* Google Button */}
            <Button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="h-14 w-full gap-3 rounded-2xl bg-card text-foreground shadow-md hover:bg-muted"
              variant="outline"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continuer avec Google
                </>
              )}
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">ou</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Email option */}
            <Button
              onClick={() => setMode('login')}
              variant="ghost"
              className="h-12 w-full text-muted-foreground hover:text-foreground"
            >
              <Mail className="mr-2 h-4 w-4" />
              Avec email et mot de passe
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="safe-bottom pb-8 text-center">
          <p className="text-xs text-muted-foreground">
            En continuant, vous acceptez nos conditions d'utilisation
          </p>
        </div>
      </div>
    );
  }

  // Email Login/Signup view
  return (
    <div className="flex h-screen w-screen flex-col bg-background">
      {/* Header */}
      <div className="safe-top flex items-center px-4 pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMode('landing')}
          className="text-muted-foreground"
        >
          ← Retour
        </Button>
      </div>

      {/* Form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Activity className="h-8 w-8 text-primary" />
        </div>

        <h2 className="mb-2 text-2xl font-bold text-foreground">
          {mode === 'login' ? 'Bon retour !' : 'Créer un compte'}
        </h2>
        <p className="mb-8 text-muted-foreground">
          {mode === 'login' ? 'Connectez-vous pour continuer' : 'Inscrivez-vous pour commencer'}
        </p>

        <Card className="w-full max-w-sm border-0 bg-transparent shadow-none">
          <CardContent className="p-0">
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-14 rounded-2xl border-border bg-card pl-12 text-base"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-14 rounded-2xl border-border bg-card pl-12 pr-12 text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="h-14 w-full rounded-2xl text-base font-semibold"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : mode === 'login' ? (
                  'Se connecter'
                ) : (
                  "S'inscrire"
                )}
              </Button>
            </form>

            {/* Toggle mode */}
            <div className="mt-6 text-center">
              <button
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-sm text-muted-foreground hover:text-primary"
              >
                {mode === 'login' ? (
                  <>Pas de compte ? <span className="font-medium text-primary">Inscrivez-vous</span></>
                ) : (
                  <>Déjà un compte ? <span className="font-medium text-primary">Connectez-vous</span></>
                )}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
