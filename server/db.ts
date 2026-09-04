/**
 * Database Client & Query Helpers
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../drizzle/schema";
import { SHAKESPEARE_QUESTIONS } from "./questions";

// =============================================================================
// DATABASE CLIENT - DO NOT MODIFY THIS SECTION
// =============================================================================

const client = process.env.DATABASE_URL ? postgres(process.env.DATABASE_URL) : null;
export const db = client ? drizzle(client, { schema }) : null;

export function getDb() {
  return db;
}

export * from "../drizzle/schema";

// =============================================================================
// QUERY HELPERS
// =============================================================================

import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

// --- Classes ---

export async function createClass(data: {
  name: string;
  year?: string;
  date?: string;
  studentCount?: number;
  password?: string;
}) {
  if (!db) throw new Error("Database not available");
  const code = generateClassCode();
  const [cls] = await db.insert(schema.classes).values({
    id: nanoid(),
    name: data.name,
    year: data.year || '',
    date: data.date || new Date().toISOString().split('T')[0],
    studentCount: data.studentCount ?? 0,
    password: data.password || null,
    code,
    isActive: true,
  }).returning();
  return cls;
}

export async function getClassByCode(code: string) {
  if (!db) return null;
  const [cls] = await db.select().from(schema.classes).where(
    and(eq(schema.classes.code, code), eq(schema.classes.isActive, true))
  );
  return cls ?? null;
}

export async function getClassById(id: string) {
  if (!db) return null;
  const [cls] = await db.select().from(schema.classes).where(eq(schema.classes.id, id));
  return cls ?? null;
}

export async function startSession(classId: string) {
  if (!db) throw new Error("Database not available");
  const [cls] = await db.update(schema.classes).set({ sessionStarted: true, currentQuestion: 1 }).where(eq(schema.classes.id, classId)).returning();
  return cls;
}

export async function nextQuestion(classId: string) {
  if (!db) throw new Error("Database not available");
  const [cls] = await db.select().from(schema.classes).where(eq(schema.classes.id, classId));
  if (!cls) throw new Error("Class not found");
  const newQ = Math.min((cls.currentQuestion || 0) + 1, 10);
  const [updated] = await db.update(schema.classes).set({ currentQuestion: newQ }).where(eq(schema.classes.id, classId)).returning();
  return updated;
}

export async function prevQuestion(classId: string) {
  if (!db) throw new Error("Database not available");
  const [cls] = await db.select().from(schema.classes).where(eq(schema.classes.id, classId));
  if (!cls) throw new Error("Class not found");
  const newQ = Math.max((cls.currentQuestion || 1) - 1, 1);
  const [updated] = await db.update(schema.classes).set({ currentQuestion: newQ }).where(eq(schema.classes.id, classId)).returning();
  return updated;
}

export async function revealAnswer(classId: string, questionNumber: number, correctAnswer: string) {
  if (!db) throw new Error("Database not available");
  const [cls] = await db.select().from(schema.classes).where(eq(schema.classes.id, classId));
  if (!cls) throw new Error("Class not found");
  const revealed: Array<{q: number; a: string}> = JSON.parse(cls.revealedQuestions || "[]");
  if (!revealed.find(r => r.q === questionNumber)) {
    revealed.push({ q: questionNumber, a: correctAnswer });
  }
  const [updated] = await db.update(schema.classes).set({ revealedQuestions: JSON.stringify(revealed) }).where(eq(schema.classes.id, classId)).returning();
  return updated;
}

export async function endSession(id: string) {
  if (!db) throw new Error("Database not available");
  const [cls] = await db.update(schema.classes).set({ sessionStarted: false }).where(eq(schema.classes.id, id)).returning();
  return cls;
}

export async function closeClass(id: string) {
  if (!db) throw new Error("Database not available");
  const [cls] = await db.update(schema.classes).set({ isActive: false }).where(eq(schema.classes.id, id)).returning();
  return cls;
}

export async function deactivateClass(id: string) {
  if (!db) throw new Error("Database not available");
  const [cls] = await db.update(schema.classes).set({ isActive: false }).where(eq(schema.classes.id, id)).returning();
  return cls;
}

/** Reopen a closed class: find by code (any status), validate password, set active */
export async function reopenClass(code: string, password: string) {
  if (!db) throw new Error("Database not available");
  const [cls] = await db.select().from(schema.classes).where(eq(schema.classes.code, code));
  if (!cls) throw new Error("Classe non trovata.");
  if (cls.password !== password) throw new Error("Password errata.");
  const [updated] = await db.update(schema.classes).set({
    isActive: true,
    sessionStarted: false,
    currentQuestion: 0,
    revealedQuestions: "[]",
  }).where(eq(schema.classes.id, cls.id)).returning();
  return updated;
}

/** Reset a closed class to active state with fresh session */
export async function resetClass(id: string) {
  if (!db) throw new Error("Database not available");
  // Delete all answers for this class
  await db.delete(schema.answers).where(eq(schema.answers.classId, id));
  // Delete all students for this class
  await db.delete(schema.students).where(eq(schema.students.classId, id));
  // Reset the class to active, fresh state with new password
  const newPassword = Math.floor(1000 + Math.random() * 9000).toString();
  const [cls] = await db.update(schema.classes).set({
    isActive: true,
    sessionStarted: false,
    currentQuestion: 0,
    revealedQuestions: "[]",
    password: newPassword,
    studentCount: 0,
  }).where(eq(schema.classes.id, id)).returning();
  return cls;
}

// --- Students ---

export async function addStudent(data: { classId: string; name: string }) {
  if (!db) throw new Error("Database not available");

  // Se esiste già uno studente con lo stesso nome in questa classe, lo riutilizza
  const [existing] = await db.select()
    .from(schema.students)
    .where(and(
      eq(schema.students.classId, data.classId),
      eq(schema.students.name, data.name)
    ));

  if (existing) {
    return existing;
  }

  const [student] = await db.insert(schema.students).values({
    id: nanoid(),
    classId: data.classId,
    name: data.name,
    score: 0,
    completed: false,
  }).returning();
  return student;
}

export async function getStudentById(id: string) {
  if (!db) return null;
  const [student] = await db.select().from(schema.students).where(eq(schema.students.id, id));
  return student ?? null;
}

export async function getStudentsByClass(classId: string) {
  if (!db) return [];
  return db.select().from(schema.students).where(eq(schema.students.classId, classId));
}

export async function updateStudentScore(studentId: string, score: number) {
  if (!db) throw new Error("Database not available");
  const [student] = await db.update(schema.students).set({ score, completed: true }).where(eq(schema.students.id, studentId)).returning();
  return student;
}

// --- Answers ---

export async function saveAnswer(data: {
  studentId: string;
  classId: string;
  questionNumber: number;
  selectedAnswer: string;
  isCorrect: boolean;
}) {
  if (!db) throw new Error("Database not available");

  // Se esiste già una risposta per questo studente a questa domanda, la aggiorna
  const [existing] = await db.select()
    .from(schema.answers)
    .where(and(
      eq(schema.answers.studentId, data.studentId),
      eq(schema.answers.questionNumber, data.questionNumber)
    ));

  if (existing) {
    const [updated] = await db.update(schema.answers)
      .set({
        selectedAnswer: data.selectedAnswer,
        isCorrect: data.isCorrect,
        createdAt: new Date(),
      })
      .where(eq(schema.answers.id, existing.id))
      .returning();
    return updated;
  }

  const [answer] = await db.insert(schema.answers).values({
    id: nanoid(),
    ...data,
  }).returning();
  return answer;
}

export async function getStudentAnswers(studentId: string) {
  if (!db) return [];
  return db.select().from(schema.answers).where(eq(schema.answers.studentId, studentId)).orderBy(schema.answers.questionNumber);
}

// --- Stats ---

export async function getClassStats(classId: string) {
  if (!db) return null;
  const studentsList = await getStudentsByClass(classId);
  const allAnswers = await db.select().from(schema.answers).where(eq(schema.answers.classId, classId));
  
  const totalStudents = studentsList.length;
  const completedStudents = studentsList.filter(s => s.completed).length;
  const avgScore = completedStudents > 0
    ? Math.round(studentsList.filter(s => s.completed).reduce((sum, s) => sum + s.score, 0) / completedStudents)
    : 0;

  return {
    totalStudents,
    completedStudents,
    avgScore,
    students: studentsList,
    answers: allAnswers,
  };
}

// --- Helper: Generate 4-digit code ---
export async function getAllClasses() {
  if (!db) return [];
  return db.select().from(schema.classes).orderBy(desc(schema.classes.createdAt));
}

export async function deleteClass(id: string) {
  if (!db) throw new Error("Database not available");
  const [cls] = await db.delete(schema.classes).where(eq(schema.classes.id, id)).returning();
  return cls;
}

export async function removeStudent(studentId: string) {
  if (!db) throw new Error("Database not available");
  await db.delete(schema.answers).where(eq(schema.answers.studentId, studentId));
  const [student] = await db.delete(schema.students).where(eq(schema.students.id, studentId)).returning();
  return student;
}

export interface ReportStudentAnswer {
  questionNumber: number;
  selectedAnswer: string | null;
  isCorrect: boolean;
}

export interface ReportStudent {
  name: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  grade: number;
  answers: ReportStudentAnswer[];
}

export interface ReportData {
  className: string;
  schoolYear: string;
  classDate: string;
  classCode: string;
  questions: typeof SHAKESPEARE_QUESTIONS;
  students: ReportStudent[];
}

export async function getReportData(classId: string): Promise<ReportData> {
  if (!db) throw new Error("Database not available");

  const [cls] = await db.select().from(schema.classes).where(eq(schema.classes.id, classId));
  if (!cls) throw new Error("Class not found");

  const students = await db.select().from(schema.students).where(eq(schema.students.classId, classId));
  const answers = await db.select().from(schema.answers).where(eq(schema.answers.classId, classId));

  const questions = SHAKESPEARE_QUESTIONS;

  // Raggruppa per nome (gestisce duplicati da ingressi precedenti o multipli)
  const studentsByName = new Map<string, Array<{ id: string; name: string }>>();
  for (const student of students) {
    const group = studentsByName.get(student.name) || [];
    group.push(student);
    studentsByName.set(student.name, group);
  }

  const studentReports: ReportStudent[] = Array.from(studentsByName.entries()).map(([name, records]) => {
    const allStudentIds = new Set(records.map(s => s.id));
    const studentAnswers = answers.filter(a => allStudentIds.has(a.studentId));

    let correctCount = 0;
    const answerDetails: ReportStudentAnswer[] = questions.map(q => {
      const studentAns = studentAnswers.find(a => a.questionNumber === q.number);
      const selectedAnswer = studentAns?.selectedAnswer || null;
      const isCorrect = selectedAnswer === q.correctAnswer;
      if (isCorrect) correctCount++;
      return {
        questionNumber: q.number,
        selectedAnswer,
        isCorrect,
      };
    });

    const totalQuestions = questions.length;
    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const grade = Math.round((correctCount / totalQuestions) * 10 * 10) / 10;

    return {
      name,
      score: correctCount,
      totalQuestions,
      percentage,
      grade,
      answers: answerDetails,
    };
  });

  return {
    className: cls.name,
    schoolYear: cls.year,
    classDate: cls.date,
    classCode: cls.code,
    questions,
    students: studentReports,
  };
}

export async function getActiveClasses() {
  if (!db) return [];
  return db.select().from(schema.classes).where(eq(schema.classes.isActive, true)).orderBy(desc(schema.classes.createdAt));
}

function generateClassCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}
