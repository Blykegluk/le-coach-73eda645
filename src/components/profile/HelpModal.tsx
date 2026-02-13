import { X, HelpCircle, MessageCircle, Mail, ExternalLink } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  const helpItems = [
    {
      icon: MessageCircle,
      label: 'Parler au coach',
      desc: 'Pose tes questions directement au coach IA',
      action: 'coach',
    },
    {
      icon: Mail,
      label: 'Nous contacter',
      desc: 'support@theperfectcoach.app',
      action: 'email',
    },
  ];

  const faqItems = [
    { q: 'Comment modifier mes macros ?', a: 'Va dans Mes objectifs depuis ton profil pour ajuster calories, protéines, etc.' },
    { q: 'Les données sont-elles sécurisées ?', a: 'Oui, toutes tes données sont chiffrées et accessibles uniquement par toi.' },
    { q: 'Comment connecter ma montre ?', a: 'Cette fonctionnalité sera disponible prochainement via Appareils connectés.' },
    { q: 'Comment supprimer mon compte ?', a: 'Contacte le support par email pour demander la suppression de ton compte.' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-background p-6 sm:rounded-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <HelpCircle className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Aide & Support</h2>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Contact options */}
        <div className="mb-6 space-y-2">
          {helpItems.map(item => (
            <button
              key={item.action}
              className="flex w-full items-center gap-3 rounded-xl bg-muted/30 p-4 text-left transition-all hover:bg-muted/50"
              onClick={() => {
                if (item.action === 'email') {
                  window.open('mailto:support@theperfectcoach.app');
                }
              }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* FAQ */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">Questions fréquentes</h3>
          <div className="space-y-3">
            {faqItems.map((faq, i) => (
              <div key={i} className="rounded-xl bg-muted/20 p-3">
                <p className="text-sm font-medium text-foreground">{faq.q}</p>
                <p className="mt-1 text-xs text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <button onClick={onClose} className="w-full rounded-xl bg-muted py-3 font-semibold text-foreground transition-all hover:bg-muted/80">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
