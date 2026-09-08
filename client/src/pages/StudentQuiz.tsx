import { useState, useMemo, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Check, X, XCircle, RotateCcw, Award, Loader2, BookOpen, Clock, Play, User, House
} from "lucide-react";
import { toast } from "sonner";

type Question = {
  number: number;
  question: string;
  options: string[];
};

export default function StudentQuiz() {
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const code = params.get("code") || "";

  const [, navigate] = useLocation();

  // Student state
  const [studentSurname, setStudentSurname] = useState("");
  const [studentGivenName, setStudentGivenName] = useState("");
  const [joined, setJoined] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [classInfo, setClassInfo] = useState<any>(null);

  // Selected answer tracking
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [answerIsCorrect, setAnswerIsCorrect] = useState(false);

  // Saved answers from DB (for re-entry detection)
  const [savedAnswers, setSavedAnswers] = useState<Record<number, string>>({});
  const [savedResults, setSavedResults] = useState<Record<number, boolean>>({});
  const [savedAnswersLoaded, setSavedAnswersLoaded] = useState(false);

  // Results after quiz ends
  const [studentAnswers, setStudentAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<Record<number, boolean>>({});
  const [finalScore, setFinalScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [classClosed, setClassClosed] = useState(false);

  // API
  const joinClass = trpc.classes.join.useMutation({
    onSuccess: (data) => {
      setStudentId(data.student.id);
      setClassInfo(data.class);
      setJoined(true);
      toast.success("Sei entrato nella classe!");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const submitAnswer = trpc.answers.submit.useMutation();
  const completeQuiz = trpc.answers.complete.useMutation();

  // Fetch previous answers from DB when student joins
  const myAnswersQuery = trpc.answers.getMyAnswers.useQuery(
    { studentId, classId: classInfo?.id || "" },
    { enabled: !!studentId && !!classInfo }
  );
  const questionsQuery = trpc.questions.list.useQuery();
  const questions: Question[] = questionsQuery.data || [];

  // Poll the class state every 2 seconds
  const { data: currentClass } = trpc.classes.getById.useQuery(
    { id: classInfo?.id || "" },
    { enabled: !!classInfo, refetchInterval: 2000 }
  );

  const sessionStarted = currentClass?.sessionStarted || false;
  const currentQNum = currentClass?.currentQuestion || 0;
  const isActive = currentClass?.isActive ?? true;

  // Track if session was ever active (to detect teacher ending it)
  const [sessionWasActive, setSessionWasActive] = useState(false);
  useEffect(() => {
    if (sessionStarted && !sessionWasActive) {
      setSessionWasActive(true);
    }
  }, [sessionStarted, sessionWasActive]);

  // Populate saved answers from DB (when student re-enters)
  useEffect(() => {
    if (myAnswersQuery.data && !savedAnswersLoaded) {
      const prevAnswers: Record<number, string> = {};
      const prevResults: Record<number, boolean> = {};
      for (const a of myAnswersQuery.data as any[]) {
        prevAnswers[a.questionNumber] = a.selectedAnswer;
        prevResults[a.questionNumber] = !!a.isCorrect;
      }
      setSavedAnswers(prevAnswers);
      setSavedResults(prevResults);
      setSavedAnswersLoaded(true);
    }
  }, [myAnswersQuery.data, savedAnswersLoaded]);

  const fullName = `${studentGivenName.trim()} ${studentSurname.trim()}`.trim();

  // Track revealed answers from teacher
  const revealedData = useMemo(() => {
    try { return JSON.parse(currentClass?.revealedQuestions || "[]") as Array<{q: number; a: string}>; } catch { return []; }
  }, [currentClass?.revealedQuestions]);
  const currentRevealed = revealedData.find(r => r.q === currentQNum);

  // Find current question data
  const currentQ = questions.find((q) => q.number === currentQNum);

  // Reset answer selection when teacher moves to a new question
  useEffect(() => {
    const prevAnswer = studentAnswers[currentQNum];
    const savedAnswer = savedAnswers[currentQNum];
    const existingAnswer = prevAnswer || savedAnswer;
    if (existingAnswer !== undefined) {
      // Already answered this question before (in current session or from DB)
      setSelectedAnswer(existingAnswer);
      setAnswerSubmitted(true);
      setAnswerIsCorrect(results[currentQNum] || savedResults[currentQNum] || false);
    } else {
      // New question, reset
      setSelectedAnswer("");
      setAnswerSubmitted(false);
      setAnswerIsCorrect(false);
    }
  }, [currentQNum]);

  // Handle answer selection - auto-save
  const handleSelectAnswer = async (option: string) => {
    if (!currentQ || answerSubmitted || currentRevealed) return;
    setSelectedAnswer(option);
    setAnswerSubmitted(true);
    try {
      const result = await submitAnswer.mutateAsync({
        studentId,
        classId: classInfo.id,
        questionNumber: currentQNum,
        selectedAnswer: option,
      });
      setAnswerIsCorrect(result.isCorrect);
      setResults((prev) => ({ ...prev, [currentQNum]: result.isCorrect }));
      setStudentAnswers((prev) => ({ ...prev, [currentQNum]: option }));
    } catch {
      toast.error("Errore nell'invio della risposta");
    }
  };

  // When teacher ends the session (sessionStarted goes from true to false), show results
  useEffect(() => {
    if (!showResults && !sessionStarted && sessionWasActive && joined && studentId) {
      const correctCount = Object.values(results).filter(Boolean).length;
      setFinalScore(correctCount);
      completeQuiz.mutate({ studentId, score: correctCount });
      setShowResults(true);
    }
  }, [sessionStarted, sessionWasActive]);

  // When teacher closes the class (isActive becomes false), show closed screen
  useEffect(() => {
    if (!classClosed && !isActive && joined) {
      setClassClosed(true);
    }
  }, [isActive]);

  const getFullName = () => fullName;

  const handleJoin = async () => {
    if (!fullName) {
      toast.error("Inserisci cognome e nome");
      return;
    }
    if (!code) {
      toast.error("Codice classe non valido");
      return;
    }
    joinClass.mutate({ code, studentName: fullName });
  };

  // ========== RENDER ==========

  // No code
  if (!code) {
    return (
      <div className="min-h-screen bg-background paper-grain flex flex-col items-center justify-center gap-4 p-4">
        <BookOpen className="size-16 text-plum/50" />
        <h1 className="text-2xl font-bold text-foreground">CODICE NON VALIDO</h1>
        <p className="text-muted-foreground text-sm">Nessun codice classe fornito.</p>
        <Button onClick={() => navigate("/")} className="mt-4">
          TORNA ALLA HOME
        </Button>
      </div>
    );
  }

  // Join screen
  if (!joined) {
    return (
      <div className="min-h-screen bg-background paper-grain flex flex-col">
        <header className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-9">
          <div className="mb-6 flex flex-col items-center gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground text-center">
              QUIZ INTERATTIVO SENZA AUDIO
            </h1>
            <a
              href="/"
              className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground shadow-sm transition hover:border-plum/40 hover:text-plum"
            >
              <House className="size-4" />
              HOME
            </a>
          </div>
        </header>

        <main className="flex-1 flex items-start justify-center px-4 pb-16">
          <Card className="bg-card border border-border/60 shadow-sm max-w-md w-full animate-pop-in">
            <CardContent className="p-6 sm:p-8 flex flex-col items-center gap-5">
              <div className="size-14 rounded-2xl bg-plum/10 flex items-center justify-center">
                <BookOpen className="size-7 text-plum" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">ENTRA NELLA CLASSE</h2>
              <p className="text-sm text-muted-foreground">
                Codice classe: <strong className="text-plum tracking-widest">{code}</strong>
              </p>

              <div className="w-full space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Cognome"
                    aria-label="Cognome"
                    value={studentSurname}
                    onChange={(e) => setStudentSurname(e.target.value)}
                    className="h-12 text-base text-center"
                  />
                  <Input
                    placeholder="Nome"
                    aria-label="Nome"
                    value={studentGivenName}
                    onChange={(e) => setStudentGivenName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                    className="h-12 text-base text-center"
                  />
                </div>
                <Button
                  onClick={handleJoin}
                  disabled={joinClass.isPending || !getFullName()}
                  className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
                >
                  {joinClass.isPending ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    "ENTRA"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Waiting screen (session not started)
  if (!sessionStarted && isActive && !sessionWasActive) {
    return (
      <div className="min-h-screen bg-background paper-grain flex flex-col">
        <header className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-9">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground">
              QUIZ INTERATTIVO SENZA AUDIO
            </h1>
          </div>
        </header>

        <main className="flex-1 flex items-start justify-center px-4 pb-16">
          <Card className="bg-card border border-border/60 shadow-sm max-w-md w-full animate-pop-in">
            <CardContent className="p-8 sm:p-10 flex flex-col items-center gap-6">
              <div className="size-20 rounded-2xl bg-amber-100 flex items-center justify-center animate-pulse">
                <Clock className="size-10 text-amber-600" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground text-center">IN ATTESA DEL DOCENTE</h2>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                Ciao <strong>{getFullName()}</strong>! La sessione non è ancora iniziata.
                Attendi che il docente avvii le domande.
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="size-2 rounded-full bg-plum animate-pulse" />
                In ascolto...
              </div>
              <div className="w-full p-4 rounded-2xl bg-muted/50 border border-border/50 flex items-center justify-center gap-3">
                <BookOpen className="size-5 text-plum/60" />
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{classInfo.name}</p>
                  <p className="text-xs text-muted-foreground">Codice: {classInfo.code}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>


      </div>
    );
  }

  // Class closed by teacher — show this even after results
  if (classClosed) {
    return (
      <div className="min-h-screen bg-background paper-grain flex flex-col">
        <header className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-9">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground">
              QUIZ INTERATTIVO SENZA AUDIO
            </h1>
          </div>
        </header>
        <main className="flex-1 flex items-start justify-center px-4 pb-16">
          <Card className="bg-card border border-border/60 shadow-sm max-w-md w-full animate-pop-in">
            <CardContent className="p-8 sm:p-10 flex flex-col items-center gap-6">
              <div className="size-20 rounded-2xl bg-red-50 flex items-center justify-center">
                <XCircle className="size-10 text-red-500" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground text-center">IL DOCENTE HA CHIUSO LA CLASSE</h2>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                La sessione è terminata. Grazie per aver partecipato!
              </p>
              <Button
                onClick={() => navigate("/")}
                className="w-full h-12 text-base bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
              >
                HOME
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Session terminated by teacher — NO results shown, just the message
  if (showResults) {
    return (
      <div className="min-h-screen bg-background paper-grain flex flex-col justify-center">
        <main className="flex items-center justify-center px-4">
          <Card className="bg-card border border-border/60 shadow-sm max-w-md w-full animate-pop-in">
            <CardContent className="p-10 sm:p-12 flex flex-col items-center gap-6">
              <div className="size-20 rounded-2xl bg-amber-50 flex items-center justify-center">
                <Clock className="size-10 text-amber-500" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center">SESSIONE TERMINATA</h2>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                Il docente ha terminato la sessione.<br />Grazie per aver partecipato!
              </p>
              <Button
                onClick={() => navigate("/")}
                className="w-full h-12 text-base bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
              >
                HOME
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Quiz in progress (session started, class active)
  // Show the current question - student just selects an answer
  return (
    <div className="min-h-screen bg-background paper-grain flex flex-col">
      {/* Header */}
      <header className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-9">
        <div className="flex flex-col gap-2 text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground">
            QUIZ INTERATTIVO SENZA AUDIO
          </h1>
        </div>
      </header>

      {/* Student info + progress */}
      <div className="container max-w-2xl mx-auto px-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground tracking-wider flex items-center gap-1.5">
            <User className="size-3" />
            {getFullName()}
          </span>
          <span className="text-xs text-muted-foreground tracking-wider">
            DOMANDA {currentQNum}/10
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 ease-in-out"
            style={{ width: `${(currentQNum / 10) * 100}%` }}
          />
        </div>
      </div>

      {/* Question display */}
      <main className="flex-1 px-4 pb-16">
        <div className="w-full max-w-2xl mx-auto">
          {currentQ ? (
            <Card className="bg-card border border-border/60 shadow-sm animate-pop-in" key={currentQNum}>
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col items-center gap-6">
                  <div className="text-center">
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-snug">
                      QUESTION {currentQNum}
                    </h2>
                  </div>

                  <div className="w-full space-y-3">
                    {currentQ.options.map((option, idx) => {
                      let optionClass = "border-border/60 hover:border-plum/40 hover:bg-plum/5 hover:shadow-md cursor-pointer";
                      let letterClass = "bg-muted text-muted-foreground";
                      let showIcon = null;

                      if (currentRevealed && option === currentRevealed.a) {
                        // Teacher revealed - option stays neutral, text shown below
                        optionClass = "border-border/60 cursor-default";
                        letterClass = "bg-muted text-muted-foreground";
                        showIcon = null;
                      } else if (currentRevealed && selectedAnswer === option && answerSubmitted) {
                        // Teacher revealed - student's wrong answer in red
                        optionClass = "border-red-400 bg-red-50 shadow-md text-red-600 cursor-default";
                        letterClass = "bg-red-500 text-white";
                        showIcon = <X className="size-5 ml-auto text-red-500" />;
                      } else if (selectedAnswer === option && answerSubmitted) {
                        // Selected but not revealed yet - neutral plum
                        optionClass = "border-plum/50 bg-plum/5 shadow-md text-plum cursor-default";
                        letterClass = "bg-plum/60 text-white";
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => handleSelectAnswer(option)}
                          disabled={answerSubmitted || submitAnswer.isPending || !!currentRevealed}
                          className={`w-full p-4 rounded-xl border-2 text-left transition-all ${optionClass} ${
                            answerSubmitted ? "cursor-default" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`size-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${letterClass}`}>
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span className="text-sm sm:text-base font-medium">{option}</span>
                            {showIcon}
                            {submitAnswer.isPending && selectedAnswer === option && (
                              <Loader2 className="size-4 animate-spin ml-auto text-muted-foreground" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Revealed answer indicator */}
                  {currentRevealed && (
                    <div className="w-full p-4 rounded-xl text-center text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                      ✅ Risposta esatta: <strong>{currentRevealed.a}</strong>
                    </div>
                  )}

                  {/* Pending confirmation message (before revealing) */}
                  {answerSubmitted && !currentRevealed && (
                    <p className="text-xs text-muted-foreground text-center">
                      {savedAnswers[currentQNum]
                        ? "Hai già risposto a questa domanda."
                        : "Risposta inviata. Attendi che il docente riveli la risposta esatta."}
                    </p>
                  )}

                  {!answerSubmitted && !submitAnswer.isPending && !currentRevealed && (
                    <p className="text-xs text-muted-foreground text-center">
                      Seleziona una risposta per confermare
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border border-border/60 shadow-sm">
              <CardContent className="p-8 flex flex-col items-center gap-4">
                <Loader2 className="size-8 animate-spin text-plum" />
                <p className="text-muted-foreground text-sm">Caricamento domanda...</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>


    </div>
  );
}
