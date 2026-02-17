'use client';

import { useState, useEffect } from 'react';
import { Users, BookOpen, RotateCcw, ChevronRight, BarChart3, Search, UserCheck, MessageSquare, Clock, Brain, Sparkles } from 'lucide-react';
import { getAllStudentsProgress, resetStudentAttempts, saveActivityProgress } from '@/lib/progress';
import { getMessages, markMessageAsRead } from '@/lib/messages';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface StudentProgress {
    id: string;
    email: string;
    full_name: string | null;
    user_progress: {
        module_id: number;
        chapter_id: number;
        completed: boolean;
        score: number | null;
        attempts: number;
        completed_at: string | null;
    }[];
    activity_metadata: {
        step: number;
        responses: {
            activity1: string;
            activity2: string;
            activity3_1: string;
            activity3_2: string;
            activity4_1: string;
            activity4_2: string;
            quiz?: {
                part1_A: string;
                part1_B: string;
                part2_q1: string;
                part2_q2: string;
                part2_q3: string;
                part2_q4: string;
                part2_q5: string;
                part3_p1: string;
                part3_p2: string;
                part3_p3: string;
                status: 'pending' | 'submitted' | 'passed' | 'failed';
                submittedAt: string | null;
                feedback?: string;
                score?: number | null;
            };
            section1?: any;
            section2?: any;
            section3?: any;
            section4?: any;
            section5?: any;
            exam?: {
                status: 'pending' | 'submitted' | 'passed' | 'failed';
                submittedAt: string | null;
                feedback?: string;
                score?: number | null;
                part1_a_issues: string;
                part1_b_issues: string;
                part2_justification: string;
                [key: string]: any;
            };
        };
    } | null;
}

interface Message {
    id: number;
    user_id: string;
    user_full_name: string;
    content: string;
    created_at: string;
    is_read: boolean;
}

export default function AdminDashboard() {
    const [students, setStudents] = useState<StudentProgress[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<StudentProgress | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [activeTab, setActiveTab] = useState<'students' | 'messages'>('students');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [suggestedFeedback, setSuggestedFeedback] = useState('');
    const [suggestedScore, setSuggestedScore] = useState<number | null>(null);

    useEffect(() => {
        fetchData();
        fetchMessages();
    }, []);

    async function fetchMessages() {
        try {
            const data = await getMessages();
            setMessages(data as any);
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    }

    async function fetchData() {
        setIsLoading(true);
        try {
            const data = await getAllStudentsProgress();
            if (data && data.length > 0) {
                setStudents(data as any);
            }
        } catch (error) {
            console.error('Error fetching admin data:', error);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleReset(userId: string, chapterId: number) {
        if (!confirm('Voulez-vous vraiment ré-attribuer les tentatives pour ce chapitre ?')) return;
        try {
            await resetStudentAttempts(userId, chapterId);
            alert('Tentatives réinitialisées avec succès.');
            fetchData();
        } catch (error) {
            alert('Erreur lors de la réinitialisation.');
        }
    }

    async function handleGradeQuiz(userId: string, status: 'passed' | 'failed') {
        if (!selectedStudent || !selectedStudent.activity_metadata) return;

        try {
            const responses = selectedStudent.activity_metadata.responses;
            let updatedResponses;
            let moduleId = 2; // Default Module 2
            let chapterId = 11;

            if (responses.exam) {
                // It's Module 3
                moduleId = 3;
                chapterId = 31;
                updatedResponses = {
                    ...responses,
                    exam: {
                        ...responses.exam,
                        status: status,
                        feedback: suggestedFeedback,
                        score: suggestedScore
                    }
                };
            } else {
                // It's Module 2
                updatedResponses = {
                    ...responses,
                    quiz: {
                        ...responses.quiz,
                        status: status,
                        feedback: suggestedFeedback,
                        score: suggestedScore
                    }
                };
            }

            await saveActivityProgress(userId, moduleId, chapterId, selectedStudent.activity_metadata.step, updatedResponses);

            alert(`Evaluation marquée comme ${status.toUpperCase()}`);
            fetchData();
            setSelectedStudent(null);
            setSuggestedFeedback('');
            setSuggestedScore(null);
        } catch (e) {
            console.error("Erreur grading:", e);
            alert("Erreur lors de la notation.");
        }
    }

    async function analyzeWithAI() {
        if (!selectedStudent || !selectedStudent.activity_metadata) return;

        setIsAnalyzing(true);
        try {
            const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const responses = selectedStudent.activity_metadata.responses;
            const quiz = responses.quiz;

            if (!quiz) {
                alert("Erreur: Le quiz n'est pas présent dans les données de l'étudiant.");
                setIsAnalyzing(false);
                return;
            }

            let prompt = "";

            if (responses.exam) {
                // Module 3 Expert Annotation Grading
                const exam = responses.exam;
                const s1 = responses.section1;
                const s5 = responses.section5;

                prompt = `
                    Tu es un expert en Data Annotation et RLHF (Niveau Expert). Tu corriges l'examen final et les activités d'un étudiant.
                    
                    TRAVAUX DE L'ÉTUDIANT:
                    ---
                    SECTION 1.1 (Ranking): 
                    Note A: ${s1.t1_1_ratingA}, Note B: ${s1.t1_1_ratingB}, Choix: ${s1.t1_1_best}
                    Justification: ${s1.t1_1_justification}
                    (Contexte: A respecte les 80 mots mais utilise "gravité". B fait 110 mots mais est très clair. L'humain doit pénaliser B pour la limite de mots stricte).

                    SECTION 5.1 (Contraintes Poème):
                    Poème: ${s5.t5_1_poem}
                    (Contraintes: 4 lignes, 7 mots/ligne, PAS DE 'A', sujet pluie).

                    EXAMEN FINAL (RLHF Batteries):
                    Issues Modèle A: ${exam.part1_a_issues}
                    Issues Modèle B: ${exam.part1_b_issues} 
                    Likert (1-7): ${exam.part2_likert}
                    Justification: ${exam.part2_justification}
                    
                    CORRIGÉ RLHF (Batteries):
                    - Modèle A: Score 4/5. Fidèle mais manque des détails sur Northvolt et l'énergie.
                    - Modèle B: Score 3/5. Fautes d'instructions ("plus de 1.3" vs "1.3"), erreurs de véracité (superlatifs relatifs).
                    - Ranking: A est légèrement meilleur que B.
                    ---

                    Consignes:
                    1. Évalue la capacité de l'étudiant à détecter les micro-violations et les hallucinations.
                    2. Donne un score sur 100. Un score > 75 est requis.
                    3. Rédige un feedback technique, froid et professionnel (Style Expert).
                    
                    Réponds UNIQUEMENT au format JSON:
                    {
                      "score": 85,
                      "feedback": "..."
                    }
                `;
            } else if (responses.quiz) {
                // Module 2 Prompt Engineering
                const quiz = responses.quiz;
                prompt = `
                    Tu es un expert en Prompt Engineering et tu corriges l'examen final d'un étudiant.
                    
                    Voici les réponses de l'étudiant :
                    ---
                    PARTIE 1:
                    Prompt A (Extraction vs Résumé): ${quiz.part1_A}
                    Prompt B (Classification vs Sentiment): ${quiz.part1_B}
                    
                    PARTIE 2 (QCM):
                    Q1: ${quiz.part2_q1} (Réponse attendue: C)
                    Q2: ${quiz.part2_q2} (Réponse attendue: C)
                    Q3: ${quiz.part2_q3} (Réponse attendue: B)
                    Q4: ${quiz.part2_q4}
                    Q5: ${quiz.part2_q5}
                    
                    PARTIE 3 (Production de Prompts):
                    Prompt 1: ${quiz.part3_p1}
                    Prompt 2: ${quiz.part3_p2}
                    Prompt 3: ${quiz.part3_p3}
                    ---
                    
                    Consignes de correction:
                    1. Q1, Q2, Q3 sont sur 10 points chacune.
                    2. Les questions ouvertes et les prompts produits doivent être évalués sur la précision technique, le respect des contraintes et la clarté.
                    3. Donne un score total sur 100.
                    4. Rédige un feedback constructif et premium en français.
                    
                    IMPORTANT: Réponds UNIQUEMENT au format JSON:
                    {
                      "score": 85,
                      "feedback": "..."
                    }
                `;
            } else {
                alert("Type de quiz inconnu.");
                setIsAnalyzing(false);
                return;
            }

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Nettoyer le JSON si nécessaire (certains modèles ajoutent des backticks)
            const jsonStr = text.replace(/```json|```/g, '').trim();
            const analysis = JSON.parse(jsonStr);

            setSuggestedScore(analysis.score);
            setSuggestedFeedback(analysis.feedback);
        } catch (error: any) {
            console.error("AI Analysis Error details:", error);
            const errorMessage = error?.message || "Erreur inconnue";
            alert(`Erreur lors de l'analyse AI: ${errorMessage}\n\nVeuillez vérifier la clé API et la configuration Vercel.`);
        } finally {
            setIsAnalyzing(false);
        }
    }

    const filteredStudents = students.filter(s =>
        s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const calculateOverallProgress = (progress: any[]) => {
        const completed = progress.filter((p: any) => p.completed).length;
        return Math.min(Math.round((completed / 25) * 100), 100);
    };

    if (isLoading) return <div className="text-neon font-mono text-center p-20 animate-pulse">ACCÈS_ADMIN_SÉCURISÉ...</div>;

    return (
        <div className="max-w-7xl mx-auto pb-20 p-6">
            <header className="mb-12 flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black italic text-neon uppercase tracking-tighter flex items-center gap-4">
                        <Users size={40} /> Admin_Console
                    </h2>
                    <p className="text-foreground/50 font-mono text-xs mt-2">// MONITORING_ETUDIANTS & GESTION_PROTOCOLE</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setActiveTab('students')}
                        className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest border transition-all ${activeTab === 'students' ? 'bg-neon text-background border-neon' : 'bg-neon/5 text-neon border-neon/20 hover:bg-neon/10'}`}
                    >
                        Etudiants
                    </button>
                    <button
                        onClick={() => setActiveTab('messages')}
                        className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest border transition-all relative ${activeTab === 'messages' ? 'bg-neon text-background border-neon' : 'bg-neon/5 text-neon border-neon/20 hover:bg-neon/10'}`}
                    >
                        Messages
                        {messages.filter((m: any) => !m.is_read).length > 0 && (
                            <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[8px] text-white animate-pulse">
                                {messages.filter((m: any) => !m.is_read).length}
                            </span>
                        )}
                    </button>
                </div>
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neon/50" />
                    <input
                        type="text"
                        placeholder="Rechercher_email_ou_nom..."
                        className="bg-neon/5 border border-neon/20 p-3 pl-10 text-[10px] font-mono text-neon w-64 focus:outline-none focus:border-neon transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </header>

            {activeTab === 'students' && (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-card-bg border border-neon/20 p-6 backdrop-blur-md">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-[10px] uppercase font-black opacity-50 text-neon tracking-widest">Total_Etudiants</span>
                                    <Users size={16} className="text-neon opacity-50" />
                                </div>
                                <div className="text-4xl font-black text-foreground">{students.length}</div>
                            </div>
                            <div className="bg-card-bg border border-neon/20 p-6 backdrop-blur-md">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-[10px] uppercase font-black opacity-50 text-neon tracking-widest">Taux_Moyen_Progression</span>
                                    <BarChart3 size={16} className="text-neon opacity-50" />
                                </div>
                                <div className="text-4xl font-black text-neon">
                                    {students.length > 0
                                        ? Math.round(students.reduce((acc, s) => acc + calculateOverallProgress(s.user_progress), 0) / students.length)
                                        : 0}%
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-2">
                            <div className="bg-card-bg border border-neon/20 overflow-hidden backdrop-blur-md">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-neon/10 bg-neon/5">
                                            <th className="p-4 text-[10px] uppercase font-black tracking-widest text-neon/60">Etudiant</th>
                                            <th className="p-4 text-[10px] uppercase font-black tracking-widest text-neon/60">Module_1</th>
                                            <th className="p-4 text-[10px] uppercase font-black tracking-widest text-neon/60">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredStudents.map((student: any) => (
                                            <tr
                                                key={student.id}
                                                onClick={() => setSelectedStudent(student)}
                                                className="border-b border-neon/5 hover:bg-neon/5 cursor-pointer transition-colors"
                                            >
                                                <td className="p-4">
                                                    <div className="font-bold text-foreground text-sm">{student.full_name || 'Utilisateur'}</div>
                                                    <div className="text-[10px] font-mono text-neon/50">{student.email}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-20 h-1 bg-neon/10 overflow-hidden">
                                                            <div
                                                                className="h-full bg-neon transition-all"
                                                                style={{ width: `${calculateOverallProgress(student.user_progress)}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-neon">{calculateOverallProgress(student.user_progress)}%</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <ChevronRight size={14} className="text-neon" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {selectedStudent && (
                        <div className="mt-12 border border-neon/30 p-10 bg-card-bg relative animate-in fade-in slide-in-from-bottom-5">
                            <div className="absolute top-4 right-6 font-mono text-neon opacity-10 text-4xl font-black italic select-none">STUDENT_DETAIL</div>

                            <div className="flex justify-between items-start mb-10">
                                <div>
                                    <h3 className="text-2xl font-black uppercase text-foreground">{selectedStudent.full_name || selectedStudent.email}</h3>
                                    <p className="text-xs font-mono text-neon opacity-60">// {selectedStudent.email}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedStudent(null)}
                                    className="bg-neon/10 text-neon px-4 py-2 text-[10px] font-mono border border-neon/20 hover:bg-neon/20"
                                >
                                    FERMER_DETAIL
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-neon mb-6 flex items-center gap-2">
                                        <BookOpen size={14} /> Progression_Détaillée
                                    </h4>
                                    <div className="space-y-4">
                                        {selectedStudent.user_progress.map((p: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center p-4 border border-neon/10 bg-neon/5 rounded">
                                                <div>
                                                    <p className="text-xs font-bold text-foreground">Chapitre_{p.chapter_id % 100}</p>
                                                    <p className="text-[9px] opacity-60">Score: {p.score !== null ? `${p.score}%` : 'N/A'} | Tentatives: {p.attempts}/2</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {p.completed ? <UserCheck size={16} className="text-green-500" /> : <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                                                    {p.attempts >= 2 && !p.completed && (
                                                        <button onClick={() => handleReset(selectedStudent.id, p.chapter_id)} className="bg-neon text-background p-2 rounded hover:scale-110 transistion-transform">
                                                            <RotateCcw size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-neon/5 border border-neon/20 p-6 flex flex-col justify-center items-center text-center">
                                    <BarChart3 size={40} className="text-neon/30 mb-4" />
                                    <h4 className="text-sm font-bold uppercase tracking-widest text-neon mb-2">Performance_Analytique</h4>
                                    <p className="text-[10px] font-mono opacity-60 leading-relaxed">
                                        L'étudiant a complété {selectedStudent.user_progress.filter((p: any) => p.completed).length} unités.<br />
                                        Score moyen: {selectedStudent.user_progress.length > 0 ? Math.round(selectedStudent.user_progress.reduce((acc: number, p: any) => acc + (p.score || 0), 0) / selectedStudent.user_progress.length) : 0}%
                                    </p>
                                </div>
                            </div>

                            {selectedStudent.activity_metadata && (
                                <div className="mt-12 pt-10 border-t border-neon/20">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-neon mb-8 flex items-center gap-2">
                                        <BarChart3 size={14} /> Analyse_Des_Activités_Module_2
                                    </h4>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="p-6 bg-neon/5 border border-neon/10 space-y-4">
                                            <p className="text-[10px] text-neon font-black uppercase tracking-widest">Activité 1: Gems Description</p>
                                            <div className="text-xs p-4 bg-black/40 border border-white/5 font-mono text-foreground/80 whitespace-pre-wrap">
                                                {selectedStudent.activity_metadata.responses.activity1 || 'Pas de réponse'}
                                            </div>
                                        </div>
                                        <div className="p-6 bg-neon/5 border border-neon/10 space-y-4">
                                            <p className="text-[10px] text-neon font-black uppercase tracking-widest">Activité 2: Few Shot ( Patterns )</p>
                                            <div className="text-xs p-4 bg-black/40 border border-white/5 font-mono text-foreground/80">
                                                Réponse: <span className="text-neon">{selectedStudent.activity_metadata.responses.activity2 || 'N/A'}</span>
                                            </div>
                                        </div>
                                        <div className="p-6 bg-neon/5 border border-neon/10 space-y-4 md:col-span-2">
                                            <p className="text-[10px] text-neon font-black uppercase tracking-widest">Activité 3: Chain of Thought (CoT)</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <p className="text-[8px] opacity-40 uppercase tracking-tighter italic">Prompt Direct</p>
                                                    <div className="text-[10px] p-4 bg-black/40 border border-white/5 font-mono text-foreground/80 min-h-[80px] whitespace-pre-wrap">
                                                        {selectedStudent.activity_metadata.responses.activity3_1}
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="text-[8px] opacity-40 uppercase tracking-tighter italic">Prompt CoT</p>
                                                    <div className="text-[10px] p-4 bg-black/40 border border-white/5 font-mono text-foreground/80 min-h-[80px] whitespace-pre-wrap">
                                                        {selectedStudent.activity_metadata.responses.activity3_2}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-6 bg-neon/5 border border-neon/10 space-y-4 md:col-span-2">
                                            <p className="text-[10px] text-neon font-black uppercase tracking-widest">Activité 4: Security (Injection & Jailbreaking)</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <p className="text-[8px] opacity-40 uppercase tracking-tighter italic">Injection</p>
                                                    <div className="text-[10px] p-4 bg-black/40 border border-white/5 font-mono text-foreground/80 min-h-[80px] whitespace-pre-wrap">
                                                        {selectedStudent.activity_metadata.responses.activity4_1}
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="text-[8px] opacity-40 uppercase tracking-tighter italic">Jailbreaking</p>
                                                    <div className="text-[10px] p-4 bg-black/40 border border-white/5 font-mono text-foreground/80 min-h-[80px] whitespace-pre-wrap">
                                                        {selectedStudent.activity_metadata.responses.activity4_2}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* MODULE 3: DATA ANNOTATION & RLHF DISPLAY */}
                                        {selectedStudent.activity_metadata.responses.section1 && (
                                            <div className="md:col-span-2 mt-12 pt-10 border-t-2 border-neon/10">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-neon mb-8 flex items-center gap-2">
                                                    <Brain size={14} /> Analyse_Des_Activités_Module_3_Expert
                                                </h4>
                                                <div className="space-y-6">
                                                    {/* Section 1 */}
                                                    <div className="p-6 bg-neon/5 border border-neon/10 space-y-4">
                                                        <p className="text-[10px] text-neon font-black uppercase tracking-widest">Section 1: Text Annotation (Ranking & Bias)</p>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="text-[10px] p-4 bg-black/40 border border-white/5 font-mono">
                                                                <p className="text-neon mb-2">1.1 Ranking Justification:</p>
                                                                {selectedStudent.activity_metadata.responses.section1.t1_1_justification}
                                                            </div>
                                                            <div className="text-[10px] p-4 bg-black/40 border border-white/5 font-mono">
                                                                <p className="text-neon mb-2">1.2 Hallucination Detection:</p>
                                                                {selectedStudent.activity_metadata.responses.section1.t1_2_errors}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* Section 5 */}
                                                    <div className="p-6 bg-neon/5 border border-neon/10 space-y-4">
                                                        <p className="text-[10px] text-neon font-black uppercase tracking-widest">Section 5: Instruction Following (Constraints)</p>
                                                        <div className="text-xs p-4 bg-black/40 border border-white/5 font-mono text-neon italic">
                                                            {selectedStudent.activity_metadata.responses.section5?.t5_1_poem}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* MODULE 3 EXAM GRADING SECTION */}
                                        {selectedStudent.activity_metadata.responses.exam?.status === 'submitted' && (
                                            <div className="md:col-span-2 border-t-2 border-neon pt-8 mt-8 bg-neon/5 p-6">
                                                <h4 className="text-xl font-black uppercase text-neon mb-6 flex items-center gap-2">
                                                    <Sparkles size={24} /> RÉPONSES_EXAMEN_EXPERT_RLHF (GRADING_REQUIRED)
                                                </h4>

                                                <div className="space-y-8 mb-8">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="p-4 border border-neon/20 bg-black/40">
                                                            <p className="font-bold text-neon text-[10px] uppercase mb-2">Analyse Modèle A</p>
                                                            <p className="text-xs italic">{selectedStudent.activity_metadata.responses.exam.part1_a_issues}</p>
                                                        </div>
                                                        <div className="p-4 border border-neon/20 bg-black/40">
                                                            <p className="font-bold text-neon text-[10px] uppercase mb-2">Analyse Modèle B</p>
                                                            <p className="text-xs italic">{selectedStudent.activity_metadata.responses.exam.part1_b_issues}</p>
                                                        </div>
                                                    </div>
                                                    <div className="p-6 border border-neon bg-neon/5">
                                                        <div className="flex justify-between items-center mb-4">
                                                            <p className="font-black text-neon text-xs uppercase">Justification Comparative RLHF</p>
                                                            <span className="text-[10px] font-mono text-neon/50">Likert: {selectedStudent.activity_metadata.responses.exam.part2_likert}/7</span>
                                                        </div>
                                                        <p className="text-sm font-bold text-foreground leading-relaxed whitespace-pre-wrap">
                                                            {selectedStudent.activity_metadata.responses.exam.part2_justification}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-8 border-t border-neon/30 pt-8">
                                                    <div className="flex justify-between items-center mb-6">
                                                        <h5 className="text-sm font-black uppercase text-neon tracking-widest flex items-center gap-2">
                                                            <Sparkles size={16} /> AUTO-CORRECTION AI EXPERT
                                                        </h5>
                                                        <button
                                                            onClick={analyzeWithAI}
                                                            disabled={isAnalyzing}
                                                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-all ${isAnalyzing ? 'bg-neon/10 text-neon/40 border-neon/10 cursor-not-allowed' : 'bg-neon text-background border-neon hover:scale-105'}`}
                                                        >
                                                            {isAnalyzing ? 'ANALYSE_EN_COURS...' : 'GÉNÉRER ANALYSE IA'}
                                                        </button>
                                                    </div>

                                                    {(suggestedScore !== null || suggestedFeedback) && (
                                                        <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                                                            <div className="flex items-center gap-4">
                                                                <div className="text-[10px] font-mono text-neon opacity-60">SCORE_PROPOSÉ:</div>
                                                                <input
                                                                    type="number"
                                                                    value={suggestedScore || 0}
                                                                    onChange={(e) => setSuggestedScore(parseInt(e.target.value))}
                                                                    className="bg-neon/10 border border-neon/20 p-2 text-xl font-black text-neon w-24 text-center"
                                                                />
                                                                <span className="text-neon/50 text-xl font-black">/ 100</span>
                                                            </div>
                                                            <textarea
                                                                value={suggestedFeedback}
                                                                onChange={(e) => setSuggestedFeedback(e.target.value)}
                                                                className="w-full h-40 bg-black/40 border border-neon/20 p-4 text-xs font-mono text-foreground focus:border-neon outline-none"
                                                            />
                                                            <div className="flex gap-4 justify-center">
                                                                <button onClick={() => handleGradeQuiz(selectedStudent.id, 'failed')} className="px-8 py-3 bg-red-500/20 text-red-500 border border-red-500/50 uppercase text-[10px] font-black tracking-widest hover:bg-red-500 hover:text-white transition-all">REJETER</button>
                                                                <button onClick={() => handleGradeQuiz(selectedStudent.id, 'passed')} className="px-8 py-3 bg-neon text-background uppercase text-[10px] font-black tracking-widest hover:scale-105 transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)]">VALIDER_EXPERT</button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* QUIZ GRADING SECTION (MODULE 2) */}
                                        {selectedStudent.activity_metadata.responses.quiz?.status === 'submitted' && (
                                            <div className="md:col-span-2 border-t-2 border-neon pt-8 mt-8 bg-neon/5 p-6 animate-pulse">
                                                <h4 className="text-xl font-black uppercase text-neon mb-6 flex items-center gap-2">
                                                    <BookOpen size={24} /> RÉPONSES_EXAMEN_FINAL (GRADING_REQUIRED)
                                                </h4>

                                                <div className="space-y-8 mb-8">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="p-4 border border-neon/20">
                                                            <p className="font-bold text-neon text-xs">Part 1 A</p>
                                                            <p className="text-xs">{selectedStudent.activity_metadata.responses.quiz.part1_A}</p>
                                                        </div>
                                                        <div className="p-4 border border-neon/20">
                                                            <p className="font-bold text-neon text-xs">Part 1 B</p>
                                                            <p className="text-xs">{selectedStudent.activity_metadata.responses.quiz.part1_B}</p>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-5 gap-2 text-center">
                                                        <div className="p-2 border border-neon/20"><p className="text-[10px]">Q1</p><p className="font-bold">{selectedStudent.activity_metadata.responses.quiz.part2_q1}</p></div>
                                                        <div className="p-2 border border-neon/20"><p className="text-[10px]">Q2</p><p className="font-bold">{selectedStudent.activity_metadata.responses.quiz.part2_q2}</p></div>
                                                        <div className="p-2 border border-neon/20"><p className="text-[10px]">Q3</p><p className="font-bold">{selectedStudent.activity_metadata.responses.quiz.part2_q3}</p></div>
                                                        <div className="p-2 border border-neon/20"><p className="text-[10px]">Q4 (Open)</p><p className="text-[8px] truncate" title={selectedStudent.activity_metadata.responses.quiz.part2_q4}>{selectedStudent.activity_metadata.responses.quiz.part2_q4.substring(0, 20)}...</p></div>
                                                        <div className="p-2 border border-neon/20"><p className="text-[10px]">Q5 (Open)</p><p className="text-[8px] truncate" title={selectedStudent.activity_metadata.responses.quiz.part2_q5}>{selectedStudent.activity_metadata.responses.quiz.part2_q5.substring(0, 20)}...</p></div>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-4">
                                                        <div className="p-4 border border-neon/20">
                                                            <p className="font-bold text-neon text-xs">Prompt 1 (Brainstorm)</p>
                                                            <pre className="text-[10px] whitespace-pre-wrap font-mono">{selectedStudent.activity_metadata.responses.quiz.part3_p1}</pre>
                                                        </div>
                                                        <div className="p-4 border border-neon/20">
                                                            <p className="font-bold text-neon text-xs">Prompt 2 (Creative)</p>
                                                            <pre className="text-[10px] whitespace-pre-wrap font-mono">{selectedStudent.activity_metadata.responses.quiz.part3_p2}</pre>
                                                        </div>
                                                        <div className="p-4 border border-neon/20">
                                                            <p className="font-bold text-neon text-xs">Prompt 3 (Open)</p>
                                                            <pre className="text-[10px] whitespace-pre-wrap font-mono">{selectedStudent.activity_metadata.responses.quiz.part3_p3}</pre>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-8 border-t border-neon/30 pt-8">
                                                    <div className="flex justify-between items-center mb-6">
                                                        <h5 className="text-sm font-black uppercase text-neon tracking-widest flex items-center gap-2">
                                                            <BarChart3 size={16} /> AUTO-CORRECTION AI
                                                        </h5>
                                                        <button
                                                            onClick={analyzeWithAI}
                                                            disabled={isAnalyzing}
                                                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-all ${isAnalyzing ? 'bg-neon/10 text-neon/40 border-neon/10 cursor-not-allowed' : 'bg-neon text-background border-neon hover:scale-105'}`}
                                                        >
                                                            {isAnalyzing ? 'ANALYSE_EN_COURS...' : 'GÉNÉRER ANALYSE AI'}
                                                        </button>
                                                    </div>

                                                    {(suggestedScore !== null || suggestedFeedback) && (
                                                        <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                                                            <div className="flex items-center gap-4">
                                                                <div className="text-[10px] font-mono text-neon opacity-60">SCORE_SUGGÉRÉ:</div>
                                                                <input
                                                                    type="number"
                                                                    value={suggestedScore || 0}
                                                                    onChange={(e) => setSuggestedScore(parseInt(e.target.value))}
                                                                    className="bg-neon/10 border border-neon/20 p-2 text-xl font-black text-neon w-24 text-center"
                                                                />
                                                                <span className="text-neon/50 text-xl font-black">/ 100</span>
                                                            </div>

                                                            <div className="space-y-2">
                                                                <div className="text-[10px] font-mono text-neon opacity-60 uppercase tracking-widest">Feedback_Constructif (Modifiable)</div>
                                                                <textarea
                                                                    value={suggestedFeedback}
                                                                    onChange={(e) => setSuggestedFeedback(e.target.value)}
                                                                    className="w-full h-40 bg-black/40 border border-neon/20 p-4 text-xs font-mono text-foreground focus:border-neon outline-none"
                                                                    placeholder="L'IA génère un feedback ici..."
                                                                />
                                                            </div>

                                                            <div className="flex gap-4 justify-center pt-4">
                                                                <button
                                                                    onClick={() => handleGradeQuiz(selectedStudent.id, 'failed')}
                                                                    className="px-8 py-4 bg-red-500 text-white font-black uppercase text-xs tracking-widest hover:bg-red-600 shadow-lg shadow-red-500/20"
                                                                >
                                                                    REJETER (FAIL)
                                                                </button>
                                                                <button
                                                                    onClick={() => handleGradeQuiz(selectedStudent.id, 'passed')}
                                                                    className="px-8 py-4 bg-green-500 text-white font-black uppercase text-xs tracking-widest hover:bg-green-600 shadow-lg shadow-green-500/20"
                                                                >
                                                                    VALIDER (PASS)
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {/* SHOW STATUS IF GRADED */}
                                        {selectedStudent.activity_metadata.responses.quiz?.status && selectedStudent.activity_metadata.responses.quiz.status !== 'submitted' && (
                                            <div className="md:col-span-2 mt-8 text-center p-4 border border-white/10 opacity-50">
                                                <p className="text-xs font-mono uppercase">
                                                    QUIZ STATUS: <span className={selectedStudent.activity_metadata.responses.quiz.status === 'passed' ? 'text-green-500' : 'text-red-500'}>
                                                        {selectedStudent.activity_metadata.responses.quiz.status.toUpperCase()}
                                                    </span>
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {activeTab === 'messages' && (
                <div className="mt-8 space-y-6">
                    <h3 className="text-2xl font-black uppercase italic text-foreground mb-8 flex items-center gap-4">
                        <MessageSquare className="text-neon" /> Inbox_Feedback
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                        {messages.map((msg: any) => (
                            <div key={msg.id} className={`p-6 border transition-all ${msg.is_read ? 'bg-card-bg/50 border-neon/10 opacity-70' : 'bg-card-bg border-neon/30 border-l-4 border-l-neon shadow-[0_0_20px_rgba(var(--neon-rgb),0.05)]'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="font-bold text-foreground text-sm uppercase">{msg.user_full_name}</h4>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[9px] font-mono text-neon/40 flex items-center gap-1"><Clock size={10} /> {new Date(msg.created_at).toLocaleString()}</span>
                                            {!msg.is_read && <span className="text-[8px] bg-neon text-background px-1.5 py-0.5 font-bold uppercase tracking-tighter">New_Signal</span>}
                                        </div>
                                    </div>
                                    {!msg.is_read && (
                                        <button onClick={async () => { await markMessageAsRead(msg.id); fetchMessages(); }} className="text-[9px] font-mono text-neon hover:underline">MARQUER_LU</button>
                                    )}
                                </div>
                                <p className="text-foreground/80 text-sm leading-relaxed bg-black/20 p-4 border border-white/5 font-mono">{msg.content}</p>
                            </div>
                        ))}
                        {messages.length === 0 && <div className="p-20 text-center border border-dashed border-neon/20"><p className="text-[10px] uppercase font-mono text-neon/40 italic">Aucun message reçu.</p></div>}
                    </div>
                </div>
            )}
        </div>
    );
}
