import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  db,
  createClass,
  getClassByCode,
  getClassById,
  getActiveClasses,
  getAllClasses,
  deleteClass,
  addStudent,
  getStudentById,
  saveAnswer,
  updateStudentScore,
  getClassStats,
  closeClass,
  endSession,
  reopenClass,
  startSession,
  nextQuestion,
  prevQuestion,
  removeStudent,
  revealAnswer,
  getReportData,
  resetClass,
} from "./db";
import { SHAKESPEARE_QUESTIONS } from "./questions";

export const appRouter = router({
  system: systemRouter,

  // ==========================================================================
  // CLASS SESSIONS
  // ==========================================================================

  classes: router({
    /** Create a new class session */
    create: publicProcedure
      .input(z.object({
        name: z.string().min(1).max(50),
        year: z.string().max(20).optional(),
        date: z.string().optional(),
        studentCount: z.number().int().min(0).max(60).optional().default(0),
        password: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return createClass(input);
      }),

    /** Join a class by code */
    join: publicProcedure
      .input(z.object({
        code: z.string().length(4),
        studentName: z.string().min(1).max(50),
      }))
      .mutation(async ({ input }) => {
        const cls = await getClassByCode(input.code);
        if (!cls) throw new Error("Classe non trovata. Il codice non è valido.");
        const student = await addStudent({ classId: cls.id, name: input.studentName });
        return { class: cls, student };
      }),

    /** Get class info by code */
    getByCode: publicProcedure
      .input(z.object({ code: z.string().length(4) }))
      .query(async ({ input }) => {
        return getClassByCode(input.code);
      }),

    /** List all active classes */
    listActive: publicProcedure.query(async () => {
      return getActiveClasses();
    }),

    /** Get class by ID */
    getById: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        return getClassById(input.id);
      }),

    /** Get class report data */
    report: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        return getReportData(input.id);
      }),

    /** Get class stats */
    stats: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        return getClassStats(input.id);
      }),

    /** Reopen a closed class by code + password */
    reopen: publicProcedure
      .input(z.object({ code: z.string().length(4), password: z.string() }))
      .mutation(async ({ input }) => {
        return reopenClass(input.code, input.password);
      }),

    /** End the current session but keep class active/visible */
    endSession: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        return endSession(input.id);
      }),

    /** Close (deactivate) a class session */
    close: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        return closeClass(input.id);
      }),

    /** List all classes (for teacher dashboard) */
    listAll: publicProcedure.query(async () => {
      return getAllClasses();
    }),

    /** Start the quiz session (teacher controls questions) */
    startSession: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        return startSession(input.id);
      }),

    /** Go to next question */
    nextQuestion: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        return nextQuestion(input.id);
      }),

    /** Go to previous question */
    prevQuestion: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        return prevQuestion(input.id);
      }),

    /** Remove a student from the session */
    removeStudent: publicProcedure
      .input(z.object({ studentId: z.string() }))
      .mutation(async ({ input }) => {
        return removeStudent(input.studentId);
      }),

    /** Reveal correct answer for a question */
    revealAnswer: publicProcedure
      .input(z.object({ id: z.string(), questionNumber: z.number(), correctAnswer: z.string() }))
      .mutation(async ({ input }) => {
        return revealAnswer(input.id, input.questionNumber, input.correctAnswer);
      }),

    /** Reset a closed class to active state with fresh session */
    reset: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        return resetClass(input.id);
      }),

    /** Delete a class permanently */
    delete: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        return deleteClass(input.id);
      }),
  }),

  // ==========================================================================
  // QUESTIONS
  // ==========================================================================

  questions: router({
    /** Get all questions (without answers for students) */
    list: publicProcedure.query(() => {
      return SHAKESPEARE_QUESTIONS.map(q => ({
        number: q.number,
        question: q.question,
        options: q.options,
      }));
    }),

    /** Get a single question by number */
    get: publicProcedure
      .input(z.object({ number: z.number().int().min(1).max(10) }))
      .query(async ({ input }) => {
        const q = SHAKESPEARE_QUESTIONS.find(q => q.number === input.number);
        if (!q) throw new Error("Question not found");
        return { number: q.number, question: q.question, options: q.options };
      }),

    /** Get the correct answer (for checking) */
    check: publicProcedure
      .input(z.object({ questionNumber: z.number().int().min(1).max(10), selectedAnswer: z.string() }))
      .query(async ({ input }) => {
        const q = SHAKESPEARE_QUESTIONS.find(q => q.number === input.questionNumber);
        if (!q) throw new Error("Question not found");
        return {
          isCorrect: q.correctAnswer === input.selectedAnswer,
          correctAnswer: q.correctAnswer,
        };
      }),

    /** Get all questions with correct answers (teacher only) */
    listWithAnswers: publicProcedure.query(() => {
      return SHAKESPEARE_QUESTIONS;
    }),

    /** Get a single question with correct answer */
    getCorrectAnswer: publicProcedure
      .input(z.object({ questionNumber: z.number().int().min(1).max(10) }))
      .query(async ({ input }) => {
        const q = SHAKESPEARE_QUESTIONS.find(q => q.number === input.questionNumber);
        return q?.correctAnswer || null;
      }),
  }),

  // ==========================================================================
  // ANSWERS
  // ==========================================================================

  answers: router({
    /** Submit an answer */
    submit: publicProcedure
      .input(z.object({
        studentId: z.string(),
        classId: z.string(),
        questionNumber: z.number().int().min(1).max(10),
        selectedAnswer: z.string(),
      }))
      .mutation(async ({ input }) => {
        const q = SHAKESPEARE_QUESTIONS.find(q => q.number === input.questionNumber);
        if (!q) throw new Error("Question not found");
        const isCorrect = q.correctAnswer === input.selectedAnswer;
        return saveAnswer({
          studentId: input.studentId,
          classId: input.classId,
          questionNumber: input.questionNumber,
          selectedAnswer: input.selectedAnswer,
          isCorrect,
        });
      }),

    /** Complete quiz and save score */
    complete: publicProcedure
      .input(z.object({
        studentId: z.string(),
        score: z.number().int().min(0).max(10),
      }))
      .mutation(async ({ input }) => {
        return updateStudentScore(input.studentId, input.score);
      }),
  }),
});

export type AppRouter = typeof appRouter;
