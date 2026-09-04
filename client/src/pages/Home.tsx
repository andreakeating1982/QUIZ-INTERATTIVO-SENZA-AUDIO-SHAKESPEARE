import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { School, Hash } from "lucide-react";
import { toast } from "sonner";

export default function Home() {
  const [code, setCode] = useState("");
  const [, navigate] = useLocation();

  /* Margini pareggiati della prima pagina (come LATINO-FACILE-APPLICAZIONE):
     vista autonoma (fuori dall'iframe del blog) — la pagina deve "terminare"
     subito sotto la card, senza il grande vuoto crema sotto il contenuto.
     La classe `lf-welcome-top` su <html> rende neutro (bianco) il canvas sotto
     il contenuto e aggiunge una dissolvenza morbida in fondo al blocco crema.
     Dentro la cornice (iframe) NON viene aggiunta: lì è heightSync a segnalare
     l'altezza reale del contenuto e la cornice dinamica si restringe da sola
     (regole html.lf-embedded .lf-welcome in index.css: 24px sopra e sotto). */
  useEffect(() => {
    if (window.self === window.top) {
      document.documentElement.classList.add("lf-welcome-top");
      return () => document.documentElement.classList.remove("lf-welcome-top");
    }
  }, []);

  const handleJoin = () => {
    if (code.length !== 4) {
      toast.error("Inserisci un codice di 4 cifre");
      return;
    }
    navigate(`/quiz?code=${code}`);
  };

  return (
    <div className="lf-welcome flex flex-col items-center bg-background paper-grain px-4 pb-8 sm:pb-12">
      {/* Layout compatto come le altre prime pagine: il contenuto sta subito
          sotto la barra di accessibilità (nella cornice: 20px + 4px della barra
          = 24px sopra, 24px sotto — simmetrici) e la pagina termina subito
          dopo la card (niente più grande spazio vuoto sotto, né in pagina né
          dentro l'iframe). */}
      <div className="flex w-full flex-col items-center pt-4 sm:pt-8">
        {/* Header */}
        <header className="w-full max-w-5xl">
          <div className="mb-4 flex flex-col items-center gap-3 sm:mb-5 sm:gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground text-center">
              QUIZ INTERATTIVO
            </h1>
            <a
              href="/docente"
              className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground shadow-sm transition hover:border-plum/40 hover:text-plum"
            >
              <School className="size-4" />
              Area docente
            </a>
          </div>
        </header>

        {/* Main */}
        <main className="w-full flex justify-center">
          <div className="w-full max-w-md">
            {/* Student Card */}
            <Card className="bg-card border border-border/60 shadow-sm hover:shadow-lg transition-shadow animate-pop-in">
              <CardContent className="p-6 sm:p-8 flex flex-col items-center gap-5">
                <div className="size-14 rounded-2xl bg-plum/10 flex items-center justify-center">
                  <School className="size-7 text-plum" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">TROVA LA TUA CLASSE</h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm text-center">
                  Inserisci il codice fornito dal docente per iniziare l'attività.
                </p>

                <div className="w-full space-y-3 mt-2">
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Codice classe (es. 4821)"
                      aria-label="Codice della classe (4 cifre)"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                      className="pl-9 h-12 text-base text-center tracking-widest"
                      maxLength={4}
                    />
                  </div>
                  <Button
                    onClick={handleJoin}
                    disabled={code.length !== 4}
                    className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
                  >
                    ENTRA COL CODICE
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
