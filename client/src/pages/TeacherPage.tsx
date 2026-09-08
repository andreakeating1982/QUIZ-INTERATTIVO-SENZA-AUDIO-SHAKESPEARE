import { useState, useMemo, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Play, Users, User, KeyRound, Eye, EyeOff, Plus,
  Hash, Loader2, Check, CheckCircle2, X, XCircle, Clock, BarChart3, LogOut, FileText,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, BookOpen,
  RotateCcw
} from "lucide-react";
import { toast } from "sonner";
import { generateReportPdf, generateBlankQuestionsPdf } from "@/lib/reportPdf";

export default function TeacherPage() {
  // --- Create form state ---
  const [clsName, setClsName] = useState("");
  const [classDate, setClassDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // --- Active class ---
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [activeClassInfo, setActiveClassInfo] = useState<any>(null);

  // --- Reopen form state ---
  const [reopenCode, setReopenCode] = useState("");
  const [reopenPassword, setReopenPassword] = useState("");
  const [showReopenPassword, setShowReopenPassword] = useState(false);

  // --- Expanded student answers ---
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  // --- Tooltip nome studente: su touch mostra il nome completo al tap ---
  const [tooltipStudent, setTooltipStudent] = useState<string | null>(null);

  // Chiude il tooltip quando si tocca/clicca fuori dal nome
  useEffect(() => {
    if (!tooltipStudent) return;
    const close = () => setTooltipStudent(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [tooltipStudent]);

  // Fetch ALL classes (for the teacher list)
  const { data: allClasses, isLoading: loadingClasses } = trpc.classes.listAll.useQuery();

  // tRPC utils for imperative calls
  const utils = trpc.useUtils();

  // --- Mutations & Queries ---

  const createClass = trpc.classes.create.useMutation({
    onSuccess: (data) => {
      setActiveClassInfo(data);
      setActiveClassId(data.id);
      toast.success("Classe creata con successo!");
    },
    onError: (err) => toast.error(err.message),
  });

  const closeClass = trpc.classes.close.useMutation({
    onSuccess: () => {
      toast.success("Classe chiusa!");
      utils.classes.listAll.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // Session control mutations
  const startSessionMutation = trpc.classes.startSession.useMutation({
    onSuccess: () => {
      toast.success("Sessione avviata! Gli studenti ora vedono la domanda.");
      utils.classes.listAll.invalidate();
      utils.classes.getById.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const goNextQuestion = trpc.classes.nextQuestion.useMutation({
    onSuccess: () => {
      utils.classes.listAll.invalidate();
      utils.classes.getById.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const goPrevQuestion = trpc.classes.prevQuestion.useMutation({
    onSuccess: () => {
      utils.classes.listAll.invalidate();
      utils.classes.getById.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const removeStudentMutation = trpc.classes.removeStudent.useMutation({
    onSuccess: () => {
      toast.success("Studente rimosso dalla sessione");
      utils.classes.listAll.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const { data: shakespeareQuestions } = trpc.questions.listWithAnswers.useQuery();

  // Report download — use utils.fetch to get data on demand
  const [reportLoading, setReportLoading] = useState(false);
  const handleDownloadReport = useCallback(async () => {
    if (!activeClassId) return;
    setReportLoading(true);
    try {
      const data = await utils.classes.report.fetch({ id: activeClassId });
      await generateReportPdf(data);
    } catch (err: any) {
      toast.error(err.message || "Errore durante il download del report");
    } finally {
      setReportLoading(false);
    }
  }, [activeClassId, utils]);

  const handleDownloadBlankQuestions = useCallback(async () => {
    if (!activeClassInfo || !shakespeareQuestions) {
      toast.error("Dati non disponibili. Prova ad aprire prima una classe.");
      return;
    }
    try {
      await generateBlankQuestionsPdf({
        className: activeClassInfo.name,
        classDate: activeClassInfo.date,
        questions: shakespeareQuestions,
      });
    } catch (err: any) {
      toast.error(err.message || "Errore durante il download del quiz in bianco");
    }
  }, [activeClassInfo, shakespeareQuestions]);

  const { data: questionsWithAnswers } = trpc.questions.listWithAnswers.useQuery();

  const revealAnswerMutation = trpc.classes.revealAnswer.useMutation({
    onSuccess: () => {
      toast.success("Risposta esatta mostrata!");
      utils.classes.listAll.invalidate();
      utils.classes.getById.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetClassMutation = trpc.classes.reset.useMutation({
    onSuccess: (data) => {
      toast.success("Classe riavviata! Puoi iniziare una nuova sessione.");
      setActiveClassInfo(data);
      utils.classes.listAll.invalidate();
      utils.classes.getById.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const endSessionMutation = trpc.classes.endSession.useMutation({
    onSuccess: () => {
      toast.success("Sessione terminata! La classe rimane aperta.");
      utils.classes.getById.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleEndSession = () => {
    if (!activeClassId) return;
    endSessionMutation.mutate({ id: activeClassId });
  };

  const deleteClass = trpc.classes.delete.useMutation({
    onSuccess: () => {
      toast.success("Classe eliminata definitivamente");
      setActiveClassId(null);
      setActiveClassInfo(null);
      utils.classes.listAll.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // Fetch class stats (auto-refreshes every 5 seconds)
  const { data: stats, isFetching: statsLoading } = trpc.classes.stats.useQuery(
    { id: activeClassId! },
    { enabled: !!activeClassId, refetchInterval: 5000 }
  );

  // Fetch full class info
  const { data: classDetail } = trpc.classes.getById.useQuery(
    { id: activeClassId! },
    { enabled: !!activeClassId }
  );

  // --- Helpers ---

  const handleCreate = () => {
    if (!clsName.trim()) { toast.error("Inserisci il nome della classe"); return; }
    createClass.mutate({
      name: clsName.trim(), date: classDate,
      password: password.trim() || undefined,
    });
  };

  const reopenClassMutation = trpc.classes.reopen.useMutation();

  const handleReopen = async () => {
    if (reopenCode.length !== 4) { toast.error("Inserisci un codice valido di 4 cifre"); return; }
    if (!reopenPassword.trim()) { toast.error("Inserisci la password della classe."); return; }
    try {
      const cls = await reopenClassMutation.mutateAsync({ code: reopenCode, password: reopenPassword });
      setActiveClassInfo(cls);
      setActiveClassId(cls.id);
      toast.success(`Classe ${(cls as any).name} riaperta!`);
    } catch (err: any) {
      toast.error(err?.message || "Classe non trovata. Verifica codice e password.");
    }
  };

  const handleStartSession = () => {
    if (!activeClassId) return;
    startSessionMutation.mutate({ id: activeClassId });
  };

  const handleNextQuestion = () => {
    if (!activeClassId) return;
    goNextQuestion.mutate({ id: activeClassId });
  };

  const handlePrevQuestion = () => {
    if (!activeClassId) return;
    goPrevQuestion.mutate({ id: activeClassId });
  };

  const handleRemoveStudent = (studentId: string) => {
    removeStudentMutation.mutate({ studentId });
  };

  const handleRevealAnswer = () => {
    if (!activeClassId || !classDetail?.currentQuestion || !questionsWithAnswers) return;
    const qNum = classDetail.currentQuestion;
    const fullQ = questionsWithAnswers.find((qa: any) => qa.number === qNum);
    if (!fullQ) return;
    revealAnswerMutation.mutate({ id: activeClassId, questionNumber: qNum, correctAnswer: fullQ.correctAnswer });
  };

  // Track revealed questions
  const revealedData = useMemo(() => {
    try { return JSON.parse(classDetail?.revealedQuestions || "[]") as Array<{q: number; a: string}>; } catch { return []; }
  }, [classDetail?.revealedQuestions]);
  const currentRevealed = revealedData.find(r => r.q === (classDetail?.currentQuestion || 0));

  // ── Active students ──────────────────────────────────────────────────────
  // Tutti gli studenti iscritti alla classe vengono mostrati sempre.
  const activeStudents = useMemo(() => {
    if (!stats) return [];
    return stats.students as any[];
  }, [stats]);

  const handleRestartClass = () => {
    if (!activeClassId) return;
    resetClassMutation.mutate({ id: activeClassId });
  };

  const handleCloseClass = () => {
    if (!activeClassId) return;
    const classId = activeClassId;
    // Reset view immediately — no need to wait for the server
    setActiveClassId(null);
    setActiveClassInfo(null);
    setExpandedStudent(null);
    closeClass.mutate({ id: classId });
  };

  // --- Render helpers ---

  const scoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-amber-600";
    return "text-red-500";
  };

  const completedCount = activeStudents.filter((s: any) => s.completed).length;
  const totalStudents = activeStudents.length;

  return (
    <div className="lf-docente min-h-screen bg-background paper-grain flex items-start justify-center p-3 sm:p-4 overflow-x-hidden">
      <style>{`
        input[type="password"]::-ms-reveal,
        input[type="password"]::-webkit-credentials-auto-fill-button {
          display: none !important;
        }
      `}</style>

      <div className="lf-docente-card w-full max-w-6xl min-h-[580px] max-h-[92vh] bg-card rounded-2xl border border-border/60 shadow-xl flex flex-col overflow-hidden">

        {/* UPBAR */}
        <header className="shrink-0 border-b border-border/40 px-5 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold leading-tight text-foreground">
                QUIZ INTERATTIVO
              </h1>
            </div>
            <a href="/" className="inline-flex w-fit shrink-0 items-center gap-2 rounded-md border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground shadow-sm transition hover:border-plum/40 hover:text-plum">
              <Users className="size-4" />
              Area studenti
            </a>
          </div>
        </header>

        {/* MIDDLE ROW: sidebar + main */}
        <div className="lf-docente-body min-h-0 flex-1 flex flex-col sm:flex-row overflow-y-auto sm:overflow-hidden">
        {/* SIDEBAR */}
        <aside className="w-full sm:w-72 shrink-0 sm:border-r sm:border-l-0 border-b sm:border-b-0 border-border/40 bg-card/40 sm:overflow-y-auto block pb-4 sm:pb-0">
          <div className="p-4 space-y-5">
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Plus className="size-3.5 text-plum" />
                APRI UNA NUOVA CLASSE
              </h3>
              <div className="space-y-2">
                <Input placeholder="Nome classe" aria-label="Nome della classe" value={clsName} onChange={(e) => setClsName(e.target.value)} className="h-9 text-sm !text-center" />
                <Input type="date" aria-label="Data della lezione" value={classDate} onChange={(e) => setClassDate(e.target.value)} className="h-9 text-sm !text-center" />
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} placeholder="Password" aria-label="Password della classe" value={password} onChange={(e) => setPassword(e.target.value)} className={`h-9 text-sm pr-8 !text-center ${showPassword ? 'password-visible' : ''}`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Nascondi la password" : "Mostra la password"} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>
                <Button onClick={handleCreate} disabled={createClass.isPending} className="w-full h-9 text-sm font-semibold" size="sm">
                  {createClass.isPending ? <Loader2 className="size-4 animate-spin" /> : "CREA CLASSE"}
                </Button>
              </div>
            </div>
            <hr className="border-border/40" />
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <KeyRound className="size-3.5 text-plum" />
                RIAPRI UNA CLASSE
              </h3>
              <div className="space-y-2">
                <div className="relative">
                  <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input placeholder="Codice" aria-label="Codice della classe da riaprire (4 cifre)" value={reopenCode} onChange={(e) => setReopenCode(e.target.value.replace(/\D/g, "").slice(0, 4))} className="h-9 text-sm !text-center" maxLength={4} />
                </div>
                <div className="relative">
                  <Input type={showReopenPassword ? "text" : "password"} placeholder="Password" aria-label="Password della classe da riaprire" value={reopenPassword} onChange={(e) => setReopenPassword(e.target.value)} className={`h-9 text-sm pr-8 !text-center ${showReopenPassword ? 'password-visible' : ''}`} />
                  <button type="button" onClick={() => setShowReopenPassword(!showReopenPassword)} aria-label={showReopenPassword ? "Nascondi la password" : "Mostra la password"} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showReopenPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>
                <Button onClick={handleReopen} className="w-full h-9 text-sm font-semibold" size="sm">RIAPRI</Button>
              </div>
            </div>
            <hr className="border-border/40" />
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <BookOpen className="size-3.5 text-plum" />
                LE TUE CLASSI
                {loadingClasses && <Loader2 className="size-3 animate-spin text-muted-foreground ml-auto" />}
              </h3>
              {!allClasses || allClasses.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Nessuna classe ancora creata.</p>
              ) : (
                <div className="space-y-0.5">
                  {allClasses.map((cls: any) => (
                    <div
                      key={cls.id}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground"
                    >
                      <div className={`size-2 rounded-full shrink-0 ${cls.isActive ? "bg-green-500" : "bg-gray-300"}`} />
                      <span className="flex-1 truncate font-medium">{cls.name}</span>
                      <span className="text-xs font-mono text-muted-foreground">{cls.code}</span>

                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
        {/* MAIN CONTENT */}
        <main className="min-w-0 flex-1 sm:overflow-y-auto">
          <div className="w-full p-4 sm:p-5">

            {!activeClassInfo ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="size-20 rounded-3xl bg-muted/60 flex items-center justify-center mb-6">
                  <BookOpen className="size-10 text-muted-foreground/40" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Nessuna classe selezionata</h2>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Crea una nuova classe dalla barra laterale oppure riaprine una già esistente.
                </p>
              </div>
            ) : (
              <div className="animate-pop-in space-y-6">


                  {/* Class header */}
                  <Card className="bg-primary/5 border-2 border-primary/30 shadow-md">
                    <CardContent className="p-5 sm:p-6 space-y-4 sm:space-y-5">
                      {/* Riga 1: nome + data */}
                      <div className="flex items-center justify-center gap-3">
                        <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                          <BookOpen className="size-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-lg sm:text-xl font-bold text-foreground truncate">{activeClassInfo.name}</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {activeClassInfo.date && new Date(activeClassInfo.date + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      {/* Riga 2: codice + chiudi */}
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <div className="flex items-center gap-1.5 rounded-lg bg-card border border-border/50 px-3 py-1.5 shrink-0">
                          <Hash className="size-4 sm:size-5 text-primary" />
                          <span className="font-mono font-bold text-base sm:text-lg text-primary tracking-widest">{activeClassInfo.code}</span>
                        </div>
                        <Button onClick={handleCloseClass} disabled={closeClass.isPending} variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 rounded-xl h-auto min-h-9 px-3 py-2 text-xs sm:text-sm !whitespace-normal leading-tight text-center">
                          {closeClass.isPending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />} <span>CHIUDI</span>
                        </Button>
                        <Button onClick={() => { if (confirm('Eliminare definitivamente la classe \"' + activeClassInfo.name + '\" (' + activeClassInfo.code + ')?')) { deleteClass.mutate({ id: activeClassInfo.id }); } }} variant="outline" className="border-red-500 text-red-700 hover:bg-red-50 hover:border-red-600 rounded-xl h-auto min-h-9 px-3 py-2 text-xs sm:text-sm !whitespace-normal leading-tight text-center">
                          ELIMINA CLASSE
                        </Button>
                      </div>
                      {/* Riga 3: statistiche + pulsanti PDF */}
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <div className="flex flex-col rounded-lg bg-card border border-emerald-300 px-3 py-2">
                            <span className="text-[10px] leading-tight text-emerald-600">NUMERO STUDENTI ATTIVI<br/>NELLA SESSIONE IN CORSO</span>
                            <span className="font-bold text-sm text-emerald-700">{activeStudents.length}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <Button onClick={handleDownloadReport} disabled={reportLoading} variant="outline" className="border-plum/40 text-plum hover:bg-plum/5 hover:border-plum/60 rounded-xl h-auto min-h-9 px-3 py-2 text-xs sm:text-sm !whitespace-normal leading-tight text-center">
                            {reportLoading ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />} REPORT PDF
                          </Button>
                          <Button onClick={handleDownloadBlankQuestions} variant="outline" className="border-emerald-400 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-500 rounded-xl h-auto min-h-9 px-3 py-2 text-xs sm:text-sm !whitespace-normal leading-tight text-center">
                            <FileText className="size-4" /> QUIZ IN BIANCO PDF
                          </Button>
                        </div>
                      </div>

                    </CardContent>
                  </Card>

                  {/* Students */}
                  <Card className="bg-card border-2 border-border/70 shadow-md">
                    <CardContent className="p-4 sm:p-12">
                      <div className="flex items-center gap-3 mb-2">
                        <Users className="size-5 text-plum" />
                        <h3 className="text-lg font-bold text-foreground">Studenti attivi nella sessione</h3>
                        {statsLoading && <Loader2 className="size-4 animate-spin text-muted-foreground ml-auto" />}
                      </div>

                      {!stats ? (
                        <div className="flex items-center justify-center py-8 text-muted-foreground">
                          <Loader2 className="size-5 animate-spin mr-2" /><span className="text-sm">Caricamento studenti...</span>
                        </div>
                      ) : activeStudents.length === 0 ? (
                        <div className="p-6 rounded-2xl bg-muted/50 border border-dashed border-border/50">
                          <p className="text-muted-foreground text-sm text-center">Nessuno studente ancora presente.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {activeStudents.map((student: any) => {
                            const studentAnswers = stats.answers.filter((a: any) => a.studentId === student.id);
                            const correctAnswers = studentAnswers.filter((a: any) => a.isCorrect).length;
                            const isExpanded = expandedStudent === student.id;
                            const hasAnsweredCurrent = classDetail?.currentQuestion
                              ? studentAnswers.some((a: any) => a.questionNumber === classDetail.currentQuestion)
                              : studentAnswers.length > 0;
                            return (
                              <div key={student.id} className="rounded-xl border border-border/50">
                                <button onClick={() => setExpandedStudent(isExpanded ? null : student.id)} className={`w-full flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-muted/30 hover:bg-muted/60 transition-colors text-left ${isExpanded && studentAnswers.length > 0 ? 'rounded-t-xl' : 'rounded-xl'}`}>
                                  {/* Hotspot grigio singolo a sinistra */}
                                  <div className="size-2 rounded-full shrink-0 bg-gray-300" />
                                  <div className="flex-1 min-w-0">
                                    <span
                                      className="group relative block min-w-0 font-bold text-sm text-foreground text-center cursor-pointer"
                                      onClick={(e: any) => {
                                        // Su dispositivi touch (niente hover): tap = mostra/nasconde il nome completo
                                        if (window.matchMedia('(hover: none)').matches) {
                                          e.stopPropagation();
                                          setTooltipStudent(tooltipStudent === student.id ? null : student.id);
                                        }
                                      }}
                                    >
                                      <span className="block truncate uppercase">{student.name}</span>
                                      <span className={`pointer-events-none absolute left-1/2 top-full z-[100] mt-2 -translate-x-1/2 max-w-[85vw] rounded-md bg-black px-3 py-1.5 text-xs text-white shadow-lg transition-opacity duration-150 ${tooltipStudent === student.id ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-active:opacity-100 group-focus:opacity-100"}`}>
                                        {student.name}
                                      </span>
                                    </span>
                                  </div>
                                  <div className={`text-xs sm:text-sm font-bold shrink-0 whitespace-nowrap ${hasAnsweredCurrent ? scoreColor(correctAnswers) : 'text-orange-500'}`}>
                                    {hasAnsweredCurrent ? correctAnswers + '/10' : 'IN ATTESA DI INVIO'}
                                  </div>
                                  <div className="flex items-center gap-0.5 shrink-0">
                                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleRemoveStudent(student.id); }} disabled={removeStudentMutation.isPending} className="text-red-400 hover:text-red-600 hover:bg-red-50 px-1.5 h-7" title="Rimuovi lo studente">
                                      <XCircle className="size-4" />
                                    </Button>
                                    {studentAnswers.length > 0 && (
                                      <div className="text-muted-foreground ml-0.5">
                                        {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                                      </div>
                                    )}
                                  </div>
                                </button>
                                {isExpanded && studentAnswers.length > 0 && (
                                  <div className="border-t border-border/40 bg-muted/15 p-4 space-y-1.5 rounded-b-xl">
                                    {studentAnswers.sort((a: any, b: any) => a.questionNumber - b.questionNumber).map((answer: any) => {
                                      const qData = shakespeareQuestions?.find((q: any) => q.number === answer.questionNumber);
                                      const correctAns = qData?.correctAnswer || '';
                                      return (
                                        <div key={answer.id} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-white/70 border border-border/30">
                                          <span className="text-muted-foreground font-mono text-[11px] w-5 shrink-0 leading-4">#</span>
                                          {answer.isCorrect
                                            ? <CheckCircle2 className="size-4 text-green-600 shrink-0 mt-0.5" />
                                            : <XCircle className="size-4 text-red-500 shrink-0 mt-0.5" />}
                                          <div className="flex-1 min-w-0 space-y-0.5">
                                            <span className={`block text-xs font-medium break-words ${answer.isCorrect ? 'text-green-700' : 'text-red-600'}`} title={answer.selectedAnswer}>{answer.selectedAnswer}</span>
                                            {!answer.isCorrect && (
                                              <span className="block text-xs font-medium text-green-700 break-words" title={correctAns}>
                                                <span className="text-muted-foreground mr-1">→</span>{correctAns}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                {/* Session Control */}
                <Card className="bg-card border border-border/60 shadow-sm">
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex flex-col gap-2 mb-5">
                      {/* Riga titolo */}
                      <div className="flex items-center gap-3">
                        <Play className="size-5 text-plum shrink-0" />
                        <h3 className="text-lg font-bold text-foreground">SESSIONE DOMANDE</h3>
                      </div>

                      {classDetail && !classDetail.isActive ? (
                        /* Classe chiusa — mostra pulsante riavvio */
                        <div className="flex flex-col items-center gap-3 py-6">
                          <p className="text-sm text-muted-foreground">Questa classe è chiusa. Riavvia per iniziare una nuova sessione.</p>
                          <Button onClick={handleRestartClass} disabled={resetClassMutation.isPending} className="h-9 px-5 text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl">
                            {resetClassMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <><RotateCcw className="size-4 mr-1.5" /> RIAVVIA CLASSE</>}
                          </Button>
                        </div>
                      ) : (
                        <>
                          {/* Riga stato */}
                          <div className="flex justify-center">
                            {classDetail?.sessionStarted ? (
                              <div className="inline-flex items-center gap-3 flex-wrap justify-center">
                                <span className="inline-block text-xs font-medium text-green-700 bg-green-100 px-3 py-1 rounded-full">Sessione attiva · Domanda {classDetail.currentQuestion}/10</span>
                                <Button onClick={handleEndSession} disabled={endSessionMutation.isPending} className="h-auto min-h-8 px-3 py-1.5 text-xs font-semibold !whitespace-normal leading-tight bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm">
                                  {endSessionMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <XCircle className="size-3.5 mr-1" />}
                                  TERMINA SESSIONE
                                </Button>
                              </div>
                            ) : (
                              <span className="inline-block text-xs font-medium text-amber-700 bg-amber-100 px-3 py-1 rounded-full">Sessione in attesa</span>
                            )}
                          </div>
                          {/* Riga avvio */}
                          {!classDetail?.sessionStarted && (
                            <div className="flex justify-center">
                              <Button onClick={handleStartSession} disabled={startSessionMutation.isPending} className="h-auto min-h-8 px-3 py-1.5 text-xs font-semibold !whitespace-normal leading-tight bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl">
                                {startSessionMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <><Play className="size-3.5 mr-1" /> AVVIA SESSIONE</>}
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="space-y-5">
                        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                          <Button onClick={handlePrevQuestion} disabled={goPrevQuestion.isPending || (classDetail?.currentQuestion || 1) <= 1} variant="outline" className="h-11 px-4 rounded-xl shrink-0">
                            <ChevronLeft className="size-5" />
                          </Button>
                          <span className="font-bold text-lg text-foreground min-w-[120px] sm:min-w-[140px] text-center leading-tight">Domanda {classDetail?.currentQuestion || 1}/10</span>
                          <Button onClick={handleNextQuestion} disabled={goNextQuestion.isPending || (classDetail?.currentQuestion || 0) >= 10} variant="outline" className="h-11 px-4 rounded-xl">
                            <ChevronRight className="size-5" />
                          </Button>
                        </div>

                        {shakespeareQuestions && (() => {
                          const qNum = classDetail?.currentQuestion || 1;
                          const q = shakespeareQuestions.find((qa: any) => qa.number === qNum);
                          if (!q) return null;
                          const qAnswers = stats?.answers?.filter((a: any) => a.questionNumber === qNum) || [];
                          const totalQAnswers = qAnswers.length;
                          const isRevealed = currentRevealed?.q === qNum;
                          const activeStudentIds = new Set(activeStudents.map((s: any) => s.id));
                          const correctCount = isRevealed && currentRevealed?.a
                            ? qAnswers.filter((a: any) => activeStudentIds.has(a.studentId) && a.selectedAnswer === currentRevealed.a).length
                            : 0;
                          return (
                            <div className="rounded-2xl bg-muted/30 border border-border/50 p-5 space-y-4">
                              <div>
                                <p className="font-semibold text-foreground text-base">{q.question}</p>
                              </div>
                              {isRevealed && currentRevealed?.a && (
                                <div className="bg-green-100 border-2 border-green-400 rounded-xl px-4 py-3 text-center space-y-1">
                                  <div className="text-[13px] font-medium text-green-700">
                                    RISPOSTA ESATTA: <span className="font-bold text-green-800">{currentRevealed.a}</span>
                                  </div>
                                  <div className="text-[13px] font-medium text-green-700 uppercase">
                                    {correctCount} {correctCount === 1 ? 'STUDENTE HA' : 'STUDENTI HANNO'} RISPOSTO CORRETTAMENTE
                                  </div>
                                </div>
                              )}
                              <div className="space-y-2">
                                {q.options.map((option: string, idx: number) => {
                                  const count = qAnswers.filter((a: any) => a.selectedAnswer === option).length;
                                  const pct = totalQAnswers > 0 ? Math.round((count / totalQAnswers) * 100) : 0;
                                  return (
                                    <div key={idx} className={'flex items-center gap-3 p-3 rounded-xl border bg-card border-border/40'}>
                                      <span className={'size-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 bg-muted text-muted-foreground'}>
                                        {String.fromCharCode(65 + idx)}
                                      </span>
                                      <span className={'text-sm flex-1'}>{option}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="flex justify-center pt-1">
                                {isRevealed ? (
                                  <div className="flex items-center gap-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 px-4 py-2 rounded-xl">
                                    <Check className="size-4" /> Risposta esatta mostrata
                                  </div>
                                ) : (
                                  <Button onClick={handleRevealAnswer} disabled={revealAnswerMutation.isPending} variant="outline" className="h-auto min-h-10 px-4 py-2 text-sm font-medium rounded-xl border-plum/40 text-plum hover:bg-plum/5 !whitespace-normal leading-tight text-center max-w-full">
                                    {revealAnswerMutation.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <Eye className="size-4 mr-2" />} Mostra risposta esatta
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })()}


                      </div>
                  </CardContent>
                </Card>


              </div>
            )}
          </div>
        </main>
      </div>

      </div>
    </div>
  );
}
