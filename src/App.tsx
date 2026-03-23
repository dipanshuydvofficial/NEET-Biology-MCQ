/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp,
  Timestamp,
  increment,
  writeBatch
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Trophy, 
  AlertCircle, 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  Zap, 
  History, 
  Filter,
  RefreshCw,
  Home,
  Target,
  Flame,
  User as UserIcon,
  Sun,
  Moon
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { auth, db, googleProvider, OperationType, handleFirestoreError } from './firebase';
import { UserProfile, Question, UserProgress, Mistake, CHAPTERS } from './types';
import { generateQuestion } from './services/gemini';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  size = 'md', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) => {
  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
    secondary: 'bg-slate-800 text-white hover:bg-slate-900',
    outline: 'border-2 border-slate-200 text-slate-700 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-100',
    danger: 'bg-rose-500 text-white hover:bg-rose-600',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg font-medium',
    xl: 'px-8 py-4 text-xl font-bold',
  };
  return (
    <button 
      className={cn(
        'rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={cn(
      'bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm transition-all hover:shadow-md',
      onClick && 'cursor-pointer active:scale-[0.98]',
      className
    )}
  >
    {children}
  </div>
);

const ProgressBar = ({ current, total, color = 'bg-emerald-500' }: { current: number; total: number; color?: string }) => {
  const percentage = Math.min(100, (current / total) * 100);
  return (
    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        className={cn('h-full rounded-full', color)}
      />
    </div>
  );
};

// --- Screens ---

const AuthScreen = () => {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center transition-colors">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-200 dark:shadow-emerald-900/20">
          <BookOpen className="text-white w-10 h-10" />
        </div>
        <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">NEET Biology</h1>
        <p className="text-slate-500 dark:text-slate-400 text-lg mb-12">The most addictive way to master Biology MCQs for NEET.</p>
        
        <Button size="xl" className="w-full mb-4" onClick={handleLogin}>
          <UserIcon className="w-6 h-6" />
          Sign in with Google
        </Button>
        <p className="text-slate-400 text-sm">Join thousands of students practicing daily.</p>
      </motion.div>
    </div>
  );
};

const HomeScreen = ({ user, onNavigate }: { user: UserProfile; onNavigate: (screen: string) => void }) => {
  return (
    <div className="p-6 space-y-6 pb-24">
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Hello, {user.name.split(' ')[0]}!</h2>
          <p className="text-slate-500 dark:text-slate-400">Ready for today's goal?</p>
        </div>
        <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-3 py-1.5 rounded-full font-bold">
          <Flame className="w-5 h-5" />
          {user.streak}
        </div>
      </header>

      <Card className="bg-emerald-600 dark:bg-emerald-600 text-white border-none shadow-xl shadow-emerald-100 dark:shadow-emerald-900/20">
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-emerald-100 text-sm font-medium mb-1">Daily Goal</p>
            <h3 className="text-3xl font-black">{Math.min(user.totalQuestions, user.dailyGoal)}/{user.dailyGoal}</h3>
          </div>
          <Trophy className="w-10 h-10 text-emerald-200 opacity-50" />
        </div>
        <ProgressBar current={user.totalQuestions} total={user.dailyGoal} color="bg-white" />
        <p className="mt-4 text-emerald-50 text-sm">
          {user.totalQuestions >= user.dailyGoal 
            ? "Goal achieved! Keep going for extra points." 
            : `${user.dailyGoal - user.totalQuestions} more to reach your goal.`}
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="flex flex-col items-center justify-center py-8" onClick={() => onNavigate('practice')}>
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-3">
            <Zap className="w-6 h-6" />
          </div>
          <span className="font-bold text-slate-800 dark:text-slate-200">Practice</span>
        </Card>
        <Card className="flex flex-col items-center justify-center py-8" onClick={() => onNavigate('mistakes')}>
          <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <span className="font-bold text-slate-800 dark:text-slate-200">Mistakes</span>
        </Card>
      </div>

      <Button size="xl" className="w-full py-6 text-xl shadow-lg shadow-emerald-100 dark:shadow-emerald-900/20" onClick={() => onNavigate('practice-mode')}>
        Start Practice
        <ArrowRight className="w-6 h-6" />
      </Button>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Activity</h3>
        {user.totalQuestions === 0 ? (
          <div className="text-center py-8 text-slate-400 italic">No activity yet. Start your first session!</div>
        ) : (
          <Card className="flex items-center gap-4 py-4">
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-800 dark:text-slate-200">Accuracy</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Based on {user.totalQuestions} questions</p>
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {user.totalQuestions > 0 ? Math.round((user.correctQuestions / user.totalQuestions) * 100) : 0}%
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

const PracticeScreen = ({ onStartPractice }: { onStartPractice: (chapter: string | null) => void }) => {
  return (
    <div className="p-6 space-y-6 pb-24">
      <header>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Practice Mode</h2>
        <p className="text-slate-500 dark:text-slate-400">Choose a chapter or go random.</p>
      </header>

      <Card 
        className="bg-slate-900 dark:bg-slate-800 text-white border-none flex items-center justify-between"
        onClick={() => onStartPractice(null)}
      >
        <div>
          <h3 className="text-xl font-bold mb-1">Random Mode</h3>
          <p className="text-slate-400 text-sm">Questions from all chapters</p>
        </div>
        <Zap className="w-8 h-8 text-emerald-400" />
      </Card>

      <div className="space-y-3">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Chapters</h3>
        {CHAPTERS.map((chapter, idx) => (
          <div 
            key={idx}
            onClick={() => onStartPractice(chapter)}
            className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 active:bg-slate-50 dark:active:bg-slate-700 transition-colors cursor-pointer"
          >
            <span className="text-slate-700 dark:text-slate-300 font-medium line-clamp-1">{chapter}</span>
            <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600" />
          </div>
        ))}
      </div>
    </div>
  );
};

const QuestionScreen = ({ 
  chapter, 
  onComplete,
  user
}: { 
  chapter: string | null; 
  onComplete: () => void;
  user: UserProfile;
}) => {
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNextQuestion = useCallback(async () => {
    setLoading(true);
    setSelectedOption(null);
    setIsSubmitted(false);
    setError(null);

    try {
      // Try to find an unattempted question in Firestore first
      const qRef = collection(db, 'questions');
      const targetChapter = chapter || CHAPTERS[Math.floor(Math.random() * CHAPTERS.length)];
      
      const firestoreQuery = query(
        qRef, 
        where('chapter', '==', targetChapter),
        limit(10)
      );
      
      const snapshot = await getDocs(firestoreQuery);
      let foundQuestion = null;

      if (!snapshot.empty) {
        // Pick a random one from the cached results
        const docs = snapshot.docs;
        foundQuestion = docs[Math.floor(Math.random() * docs.length)].data() as Question;
        foundQuestion.id = docs[Math.floor(Math.random() * docs.length)].id;
      }

      // If no cached question or just to keep it fresh, generate new one
      if (!foundQuestion || Math.random() > 0.7) {
        const aiQuestion = await generateQuestion(targetChapter, 'Medium');
        const docRef = await addDoc(collection(db, 'questions'), aiQuestion);
        foundQuestion = { ...aiQuestion, id: docRef.id } as Question;
      }

      setQuestion(foundQuestion);
    } catch (err) {
      console.error(err);
      setError("Failed to load question. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [chapter]);

  useEffect(() => {
    fetchNextQuestion();
  }, [fetchNextQuestion]);

  const handleSubmit = async () => {
    if (!selectedOption || !question) return;
    setIsSubmitted(true);

    const isCorrect = selectedOption === question.correctAnswer;

    try {
      const batch = writeBatch(db);

      // Record progress
      const progressRef = doc(collection(db, 'userProgress'));
      batch.set(progressRef, {
        userId: auth.currentUser?.uid,
        questionId: question.id,
        isCorrect,
        chapter: question.chapter,
        attemptedAt: serverTimestamp()
      });

      // Update user stats
      const userRef = doc(db, 'users', auth.currentUser!.uid);
      batch.update(userRef, {
        totalQuestions: increment(1),
        correctQuestions: isCorrect ? increment(1) : increment(0),
        lastAttemptedAt: serverTimestamp()
      });

      // If incorrect, add to mistakes
      if (!isCorrect) {
        const mistakeRef = doc(collection(db, 'mistakes'));
        batch.set(mistakeRef, {
          userId: auth.currentUser?.uid,
          questionId: question.id,
          attemptedAt: serverTimestamp()
        });
      }

      await batch.commit();
    } catch (err) {
      console.error("Failed to save progress:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-white dark:bg-slate-950 transition-colors">
        <RefreshCw className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
        <p className="text-slate-500 dark:text-slate-400 font-medium">AI is crafting your next challenge...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-white dark:bg-slate-950 transition-colors">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <p className="text-slate-800 dark:text-white font-bold mb-4">{error}</p>
        <Button onClick={fetchNextQuestion}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col transition-colors">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onComplete}>Exit</Button>
        <div className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate px-4">{question?.chapter}</div>
        <div className="w-10" />
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <motion.div 
          key={question?.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-8"
        >
          <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
            {question?.question}
          </h3>

          <div className="space-y-3">
            {question?.options.map((option, idx) => {
              const isCorrect = option === question.correctAnswer;
              const isSelected = option === selectedOption;
              
              let stateClass = "border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800 text-slate-700 dark:text-slate-300";
              if (isSubmitted) {
                if (isCorrect) stateClass = "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-950";
                else if (isSelected) stateClass = "border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 ring-2 ring-rose-500 ring-offset-2 dark:ring-offset-slate-950";
                else stateClass = "opacity-50 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-600";
              } else if (isSelected) {
                stateClass = "border-emerald-600 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400";
              }

              return (
                <button
                  key={idx}
                  disabled={isSubmitted}
                  onClick={() => setSelectedOption(option)}
                  className={cn(
                    "w-full p-5 text-left rounded-2xl border-2 transition-all font-medium flex items-center justify-between",
                    stateClass
                  )}
                >
                  <span>{option}</span>
                  {isSubmitted && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
                  {isSubmitted && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
                </button>
              );
            })}
          </div>

          <AnimatePresence>
            {isSubmitted && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 space-y-3"
              >
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Explanation
                </h4>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {question?.explanation}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 transition-colors">
        {!isSubmitted ? (
          <Button 
            size="xl" 
            className="w-full" 
            disabled={!selectedOption}
            onClick={handleSubmit}
          >
            Submit Answer
          </Button>
        ) : (
          <Button size="xl" className="w-full" onClick={fetchNextQuestion}>
            Next Question
            <ArrowRight className="w-6 h-6" />
          </Button>
        )}
      </div>
    </div>
  );
};

const MistakesScreen = ({ onPracticeMistake }: { onPracticeMistake: (questionId: string) => void }) => {
  const [mistakes, setMistakes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'mistakes'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('attemptedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const mistakeData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Fetch question details for each mistake
      const detailedMistakes = await Promise.all(mistakeData.map(async (m: any) => {
        const qDoc = await getDoc(doc(db, 'questions', m.questionId));
        return { ...m, question: qDoc.data() };
      }));

      setMistakes(detailedMistakes);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div className="p-6 text-center dark:text-slate-400">Loading mistakes...</div>;

  return (
    <div className="p-6 space-y-6 pb-24">
      <header>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Mistake Tracker</h2>
        <p className="text-slate-500 dark:text-slate-400">Review and fix your weak areas.</p>
      </header>

      {mistakes.length === 0 ? (
        <div className="text-center py-20">
          <CheckCircle2 className="w-16 h-16 text-emerald-200 dark:text-emerald-900/40 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Clean Slate!</h3>
          <p className="text-slate-500 dark:text-slate-400">No mistakes tracked yet. Keep practicing!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {mistakes.map((m, idx) => (
            <Card key={idx} className="space-y-3">
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{m.question?.chapter}</div>
              <p className="font-medium text-slate-800 dark:text-slate-200 line-clamp-2">{m.question?.question}</p>
              <Button variant="outline" size="sm" className="w-full dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700" onClick={() => onPracticeMistake(m.questionId)}>
                Retry Question
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const DashboardScreen = ({ user, theme, onToggleTheme }: { user: UserProfile, theme: 'light' | 'dark', onToggleTheme: () => void }) => {
  const [stats, setStats] = useState({
    total: 0,
    correct: 0,
    chapters: {} as Record<string, { total: number, correct: number }>
  });

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'userProgress'), where('userId', '==', auth.currentUser.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as UserProgress);
      const newStats = {
        total: data.length,
        correct: data.filter(d => d.isCorrect).length,
        chapters: {} as Record<string, { total: number, correct: number }>
      };

      data.forEach(d => {
        if (!newStats.chapters[d.chapter]) newStats.chapters[d.chapter] = { total: 0, correct: 0 };
        newStats.chapters[d.chapter].total++;
        if (d.isCorrect) newStats.chapters[d.chapter].correct++;
      });

      setStats(newStats);
    });

    return () => unsubscribe();
  }, []);

  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

  return (
    <div className="p-6 space-y-6 pb-24">
      <header className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Performance</h2>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => signOut(auth)}>
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <Card className="text-center dark:bg-slate-800 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Attempted</p>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats.total}</h3>
        </Card>
        <Card className="text-center dark:bg-slate-800 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Accuracy</p>
          <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{accuracy}%</h3>
        </Card>
      </div>

      <Card className="space-y-4 dark:bg-slate-800 dark:border-slate-700">
        <h3 className="font-bold text-slate-900 dark:text-white">Chapter-wise Performance</h3>
        {Object.entries(stats.chapters).length === 0 ? (
          <p className="text-slate-400 text-sm italic">Start practicing to see detailed stats.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(stats.chapters).sort((a, b) => b[1].total - a[1].total).map(([name, data], idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate pr-4">{name}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{Math.round((data.correct / data.total) * 100)}%</span>
                </div>
                <ProgressBar current={data.correct} total={data.total} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
              {theme === 'light' ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-indigo-400" />}
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Dark Mode</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Switch app theme</p>
            </div>
          </div>
          <button 
            onClick={onToggleTheme}
            className={cn(
              "w-12 h-6 rounded-full transition-colors relative",
              theme === 'dark' ? "bg-emerald-500" : "bg-slate-200"
            )}
          >
            <motion.div 
              animate={{ x: theme === 'dark' ? 24 : 2 }}
              className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
            />
          </button>
        </div>
      </Card>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('home');
  const [activeChapter, setActiveChapter] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Fetch or create profile
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          setProfile({ uid: firebaseUser.uid, ...userDoc.data() } as UserProfile);
        } else {
          const newProfile = {
            name: firebaseUser.displayName || 'Student',
            email: firebaseUser.email || '',
            createdAt: serverTimestamp(),
            dailyGoal: 50,
            streak: 0,
            lastAttemptedAt: serverTimestamp(),
            totalQuestions: 0,
            correctQuestions: 0
          };
          await setDoc(userRef, newProfile);
          setProfile({ uid: firebaseUser.uid, ...newProfile } as UserProfile);
        }

        // Listen for profile updates
        onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            setProfile({ uid: firebaseUser.uid, ...doc.data() } as UserProfile);
          }
        });
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className={cn("min-h-screen flex items-center justify-center", theme === 'dark' ? "bg-slate-900" : "bg-slate-50")}>
        <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!user || !profile) {
    return <AuthScreen />;
  }

  if (currentScreen === 'practice-mode') {
    return (
      <div className={theme === 'dark' ? 'dark' : ''}>
        <QuestionScreen 
          chapter={activeChapter} 
          user={profile}
          onComplete={() => {
            setCurrentScreen('home');
            setActiveChapter(null);
          }} 
        />
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen transition-colors duration-300", theme === 'dark' ? "bg-slate-950 dark" : "bg-slate-50")}>
      <div className="min-h-screen max-w-md mx-auto relative shadow-2xl bg-inherit">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {currentScreen === 'home' && (
              <HomeScreen 
                user={profile} 
                onNavigate={(screen) => {
                  if (screen === 'practice-mode') {
                    setActiveChapter(null);
                    setCurrentScreen('practice-mode');
                  } else {
                    setCurrentScreen(screen);
                  }
                }} 
              />
            )}
            {currentScreen === 'practice' && (
              <PracticeScreen 
                onStartPractice={(chapter) => {
                  setActiveChapter(chapter);
                  setCurrentScreen('practice-mode');
                }} 
              />
            )}
            {currentScreen === 'mistakes' && (
              <MistakesScreen 
                onPracticeMistake={(qId) => {
                  setCurrentScreen('practice-mode');
                }} 
              />
            )}
            {currentScreen === 'dashboard' && (
              <DashboardScreen 
                user={profile} 
                theme={theme} 
                onToggleTheme={toggleTheme} 
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 flex justify-around items-center py-4 px-6 z-50">
          <NavButton 
            active={currentScreen === 'home'} 
            onClick={() => setCurrentScreen('home')} 
            icon={Home} 
            label="Home" 
          />
          <NavButton 
            active={currentScreen === 'practice'} 
            onClick={() => setCurrentScreen('practice')} 
            icon={Target} 
            label="Practice" 
          />
          <NavButton 
            active={currentScreen === 'mistakes'} 
            onClick={() => setCurrentScreen('mistakes')} 
            icon={AlertCircle} 
            label="Mistakes" 
          />
          <NavButton 
            active={currentScreen === 'dashboard'} 
            onClick={() => setCurrentScreen('dashboard')} 
            icon={LayoutDashboard} 
            label="Stats" 
          />
        </nav>
      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all",
        active 
          ? "text-emerald-600 dark:text-emerald-400 scale-110" 
          : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
      )}
    >
      <Icon className="w-6 h-6" />
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}
