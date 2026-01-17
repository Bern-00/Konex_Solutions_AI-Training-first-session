'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, BookOpen, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { createClient } from '@/lib/supabase/client';
import { submitQuizAttempt } from '@/lib/progress';

interface Question {
    id: number;
    question_text: string;
    options: string[];
    correct_answer: number;
    explanation: string;
}

interface Chapter {
    id: number;
    title: string;
    content: string;
    order_index: number;
}

interface ChapterViewProps {
    moduleSlug: string;
    userId: string;
    onBack: () => void;
    onComplete: () => void;
}

export default function ChapterView({ moduleSlug, userId, onBack, onComplete }: ChapterViewProps) {
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [resolvedModuleId, setResolvedModuleId] = useState<number | null>(null);
    const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [quizResults, setQuizResults] = useState<{ passed: boolean; score: number; attemptsRemaining: number } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showQuiz, setShowQuiz] = useState(false);
    const [userProgress, setUserProgress] = useState<any>(null);
    const [requiredScore, setRequiredScore] = useState(75);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        resolveModuleAndFetchChapters();
    }, [moduleSlug]);

    useEffect(() => {
        if (chapters.length > 0) {
            fetchChapterDetails(chapters[currentChapterIndex].id);
        }
    }, [currentChapterIndex, chapters]);

    async function resolveModuleAndFetchChapters() {
        setIsLoading(true);
        setError(null);

        // 1. Resolve Slug to ID
        const { data: mData, error: mError } = await supabase
            .from('modules')
            .select('id, required_score')
            .eq('slug', moduleSlug)
            .maybeSingle();

        if (mError) {
            setError("Erreur lors de la récupération du module: " + mError.message);
            setIsLoading(false);
            return;
        }

        if (!mData) {
            // Debug: Lister tous les modules existants pour aider l'utilisateur
            const { data: allModules } = await supabase.from('modules').select('slug');
            const availableSlugs = allModules?.map(m => m.slug).join(', ') || 'AUCUN';

            setError(`Module introuvable (slug: ${moduleSlug}). Slugs disponibles: [${availableSlugs}]`);
            setIsLoading(false);
            return;
        }

        const mId = mData.id;
        setResolvedModuleId(mId);
        setRequiredScore(mData.required_score || 75);

        // 2. Fetch Chapters
        const { data, error: cError } = await supabase
            .from('chapters')
            .select('*')
            .eq('module_id', mId)
            .order('order_index', { ascending: true });

        if (cError) {
            setError(cError.message);
        } else {
            const fetchedChapters = data || [];
            setChapters(fetchedChapters);

            // 3. Find student's last position
            if (fetchedChapters.length > 0) {
                const { data: pAll } = await supabase
                    .from('user_progress')
                    .select('chapter_id, completed')
                    .eq('user_id', userId)
                    .in('chapter_id', fetchedChapters.map(c => c.id));

                if (pAll && pAll.length > 0) {
                    // Find the first chapter that is NOT completed
                    const firstUncompletedIndex = fetchedChapters.findIndex(c => {
                        const progress = pAll.find(p => p.chapter_id === c.id);
                        return !progress || !progress.completed;
                    });

                    if (firstUncompletedIndex !== -1) {
                        setCurrentChapterIndex(firstUncompletedIndex);
                    } else {
                        // All chapters completed, go to the last one
                        setCurrentChapterIndex(fetchedChapters.length - 1);
                    }
                }
            }
        }
        setIsLoading(false);
    }

    async function fetchChapterDetails(chapterId: number) {
        const { data: qData, error: qError } = await supabase
            .from('questions')
            .select('*')
            .eq('chapter_id', chapterId);

        if (qError) {
            setError(qError.message);
        } else {
            // Parse options if they are stored as stringified JSON
            const formattedQuestions = qData.map(q => ({
                ...q,
                options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
            }));
            setQuestions(formattedQuestions);
        }

        const { data: pData } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('chapter_id', chapterId)
            .maybeSingle();

        setUserProgress(pData);
        setAnswers({});
        setQuizResults(null);
        setShowQuiz(false);
    }

    const handleAnswerSelect = (questionId: number, optionIndex: number) => {
        if (quizResults) return;
        setAnswers((prev: any) => ({ ...prev, [questionId]: optionIndex }));
    };

    const calculateScore = () => {
        let correct = 0;
        questions.forEach(q => {
            if (answers[q.id] === q.correct_answer) {
                correct++;
            }
        });
        return Math.round((correct / questions.length) * 100);
    };

    const handleQuizSubmit = async () => {
        if (Object.keys(answers).length < questions.length) {
            alert("Veuillez répondre à toutes les questions.");
            return;
        }

        const score = calculateScore();
        const passed = score >= requiredScore;

        setIsSubmitting(true);
        try {
            const result = await submitQuizAttempt(userId, chapters[currentChapterIndex].id, answers, score, passed);
            setQuizResults({
                passed,
                score,
                attemptsRemaining: result.attemptsRemaining
            });

            if (passed) {
                // Mettre à jour la progression locale
                setUserProgress((prev: any) => ({ ...prev, completed: true }));
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const currentChapter = chapters[currentChapterIndex];

    if (isLoading) return <div className="text-neon font-mono text-center p-20 animate-pulse">CHARGEMENT_SYSTÈME...</div>;
    if (error) return <div className="text-red-500 font-mono text-center p-20">ERREUR: {error}</div>;
    if (!currentChapter) return (
        <div className="text-neon font-mono text-center p-20">
            AUCUN CHAPITRE TROUVÉ (Slug: {moduleSlug})
            <p className="text-[10px] opacity-50 mt-4">Vérifiez que le module avec ce slug existe et possède des chapitres dans la base de données.</p>
        </div>
    );

    const progressPercentage = ((currentChapterIndex + 1) / chapters.length) * 100;

    return (
        <div className="max-w-4xl mx-auto pb-20">
            <div className="flex justify-between items-center mb-4">
                <button onClick={onBack} className="flex items-center gap-2 text-neon font-mono text-xs uppercase tracking-widest hover:opacity-100 opacity-60 transition-opacity cursor-pointer">
                    Back_to_grid
                </button>
                <div className="flex gap-1">
                    {chapters.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1 w-8 transition-all duration-500 ${i <= currentChapterIndex ? 'bg-neon shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-neon/10'}`}
                        />
                    ))}
                </div>
            </div>

            <div className="border border-neon/30 p-10 relative backdrop-blur-xl bg-card-bg shadow-lg">
                <div className="absolute top-4 right-6 font-mono text-neon opacity-10 text-4xl font-black italic select-none">CHAPTER_0{currentChapter.order_index}</div>

                <div className="flex items-center gap-4 mb-10 text-neon">
                    <BookOpen size={24} />
                    <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
                        {currentChapter.title}
                    </h2>
                </div>

                {!showQuiz ? (
                    <div className="space-y-10">
                        <div className="prose prose-invert max-w-none text-foreground/90 font-mono leading-relaxed">
                            <ReactMarkdown>{currentChapter.content}</ReactMarkdown>
                        </div>

                        <div className="flex justify-between items-center border-t border-foreground/10 mt-16 pt-8">
                            <span className="font-mono text-[10px] opacity-40 uppercase text-foreground tracking-widest">
                                Chapitre {currentChapterIndex + 1} / {chapters.length}
                            </span>
                            <button
                                onClick={() => setShowQuiz(true)}
                                className="bg-neon text-background px-10 py-4 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:scale-105 transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] cursor-pointer"
                            >
                                Passer au Quiz <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-10">
                        <h3 className="text-xl font-black uppercase text-neon italic mb-6">ÉVALUATION_TECHNIQUE</h3>

                        <div className="space-y-8">
                            {questions.map((q, idx) => (
                                <div key={q.id} className="p-6 border border-foreground/10 bg-foreground/[0.03]">
                                    <p className="font-mono text-sm mb-4 text-foreground">
                                        <span className="text-neon">Q{idx + 1}.</span> {q.question_text}
                                    </p>
                                    <div className="space-y-3">
                                        {q.options.map((opt, optIdx) => (
                                            <button
                                                key={optIdx}
                                                onClick={() => handleAnswerSelect(q.id, optIdx)}
                                                className={`w-full text-left p-4 font-mono text-xs transition-all border ${answers[q.id] === optIdx
                                                    ? 'border-neon bg-neon/10 text-neon'
                                                    : 'border-foreground/10 hover:border-foreground/30 text-foreground/70'
                                                    }`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                    {quizResults && (
                                        <div className={`mt-4 p-4 text-[10px] font-mono flex gap-2 items-start ${answers[q.id] === q.correct_answer ? 'text-neon bg-neon/5' : 'text-red-500 bg-red-500/5'
                                            }`}>
                                            {answers[q.id] === q.correct_answer ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                                            <span>{q.explanation}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {quizResults ? (
                            <div className="mt-10 p-8 border border-neon/30 bg-neon/5 text-center">
                                <h4 className="text-2xl font-black uppercase italic text-neon mb-2">
                                    {quizResults.passed ? "PROTOCOLE_RÉUSSI" : "PROTOCOLE_ÉCHOUÉ"}
                                </h4>
                                <p className="font-mono text-sm mb-4">SCORE: {quizResults.score}%</p>
                                {quizResults.passed ? (
                                    <p className="text-neon text-xs font-mono uppercase tracking-widest">Le chapitre suivant a été déverrouillé.</p>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-red-500 text-xs font-mono uppercase tracking-widest">
                                            Échec. Tentatives restantes : {quizResults.attemptsRemaining}
                                        </p>
                                        {quizResults.attemptsRemaining > 0 && (
                                            <button
                                                onClick={() => { setQuizResults(null); setAnswers((prev: any) => ({})); }}
                                                className="flex items-center gap-2 mx-auto text-neon font-mono text-[10px] hover:underline uppercase cursor-pointer"
                                            >
                                                <RotateCcw size={14} /> Réessayer le quiz
                                            </button>
                                        )}
                                    </div>
                                )}

                                <div className="flex justify-center gap-4 mt-8">
                                    <button
                                        onClick={() => setShowQuiz(false)}
                                        className="border border-foreground/30 text-foreground px-6 py-3 font-black uppercase text-[10px] tracking-widest hover:bg-foreground/10"
                                    >
                                        Retour au cours
                                    </button>
                                    {(quizResults.passed || (userProgress?.completed)) && currentChapterIndex < chapters.length - 1 && (
                                        <button
                                            onClick={() => setCurrentChapterIndex(prev => prev + 1)}
                                            className="bg-neon text-background px-8 py-3 font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all"
                                        >
                                            Chapitre Suivant
                                        </button>
                                    )}
                                    {(quizResults.passed || userProgress?.completed) && currentChapterIndex === chapters.length - 1 && (
                                        <button
                                            onClick={onComplete}
                                            className="bg-neon text-background px-8 py-3 font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all"
                                        >
                                            Terminer Module
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-between items-center border-t border-foreground/10 mt-16 pt-8">
                                <button
                                    onClick={() => setShowQuiz(false)}
                                    className="text-foreground/50 font-mono text-[10px] hover:text-foreground uppercase tracking-widest cursor-pointer"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleQuizSubmit}
                                    disabled={isSubmitting}
                                    className={`bg-neon text-background px-10 py-4 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:scale-105 transition-all cursor-pointer ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isSubmitting ? 'TRAITEMENT EN COURS...' : 'Soumettre les réponses'} <ChevronRight size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
