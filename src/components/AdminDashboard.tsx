'use client';

import { useState, useEffect } from 'react';
import { Users, BookOpen, RotateCcw, ChevronRight, BarChart3, Search, UserCheck, MessageSquare, Clock, Brain, Sparkles, ShieldAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getAllStudentsProgress, resetStudentAttempts, saveActivityProgress } from '@/lib/progress';
import { getMessages, markMessageAsRead } from '@/lib/messages';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface ModuleResponses {
    [key: string]: any;
    status?: 'pending' | 'submitted' | 'passed' | 'failed';
    score?: number | null;
    feedback?: string;
    quiz?: {
        status: 'pending' | 'submitted' | 'passed' | 'failed';
        score?: number | null;
        submittedAt?: string | null;
        feedback?: string;
        [key: string]: any;
    };
    exam?: {
        status: 'pending' | 'submitted' | 'passed' | 'failed';
        score?: number | null;
        submittedAt?: string | null;
        feedback?: string;
        [key: string]: any;
    };
}

interface ModuleData {
    step: number;
    responses: ModuleResponses;
}

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
    module_metadata: {
        m2?: ModuleData;
        m3?: ModuleData;
        m4?: ModuleData;
        [key: string]: any;
    };
    activity_metadata: {
        step: number;
        responses: ModuleResponses;
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
        if (!selectedStudent) return;

        try {
            const m4Data = selectedStudent.module_metadata?.m4?.responses;
            const m3Data = selectedStudent.module_metadata?.m3?.responses;
            const m2Data = selectedStudent.module_metadata?.m2?.responses;

            let updatedResponses;
            let moduleId = 2; // Default
            let chapterId = 11;
            let currentStep = 1;

            if (m4Data?.section1?.gradingA || m4Data?.section3?.audioEn) {
                // Module 4: Model Evaluation
                const m4Prog = selectedStudent.user_progress.find((p: any) => p.module_id === 6);
                moduleId = m4Prog?.module_id || 6;
                chapterId = m4Prog?.chapter_id || 21;
                currentStep = selectedStudent.module_metadata?.m4?.step || 5;

                updatedResponses = {
                    ...m4Data,
                    status: status,
                    feedback: suggestedFeedback,
                    score: suggestedScore
                };
            } else if (m3Data?.exam) {
                // Module 3: Data Annotation
                moduleId = 5;
                chapterId = 16;
                currentStep = selectedStudent.module_metadata?.m3?.step || 5;

                updatedResponses = {
                    ...m3Data,
                    exam: {
                        ...m3Data.exam,
                        status: status,
                        feedback: suggestedFeedback,
                        score: suggestedScore
                    }
                };
            } else if (m2Data?.quiz) {
                // Module 2: Prompt Engineering
                moduleId = 2;
                chapterId = 11;
                currentStep = selectedStudent.module_metadata?.m2?.step || 5;

                updatedResponses = {
                    ...m2Data,
                    quiz: {
                        ...m2Data.quiz,
                        status: status,
                        feedback: suggestedFeedback,
                        score: suggestedScore
                    }
                };
            } else {
                alert("Impossible de déterminer le module à noter.");
                return;
            }

            await saveActivityProgress(userId, moduleId, chapterId, currentStep, updatedResponses);

            // SYNC COMPLETION STATUS TO DATABASE
            const supabase = createClient();
            await supabase.from('user_progress').upsert({
                user_id: userId,
                chapter_id: chapterId,
                module_id: moduleId,
                completed: status === 'passed',
                score: suggestedScore,
                completed_at: status === 'passed' ? new Date().toISOString() : null
            }, { onConflict: 'user_id,chapter_id' });

            alert(`Evaluation marquée comme ${status.toUpperCase()} ${status === 'passed' ? 'et module débloqué' : ''}`);
            fetchData();
            setSelectedStudent(null);
            setSuggestedFeedback('');
            setSuggestedScore(null);
        } catch (e) {
            console.error("Erreur grading:", e);
            alert("Erreur lors de la notation.");
        }
    }

    async function handleForceUnlock(userId: string) {
        if (!confirm("Voulez-vous forcer l'accès au Module 3 pour cet étudiant ? Cela marquera le Module 2 comme complété.")) return;

        try {
            const supabase = createClient();
            await saveActivityProgress(userId, 2, 11, 4, {
                quiz: {
                    status: 'passed',
                    score: 100,
                    feedback: "ACCÈS_SPÉCIAL_ADMIN_ACCORDÉ",
                    submittedAt: new Date().toISOString()
                }
            });

            await supabase.from('user_progress').upsert({
                user_id: userId,
                chapter_id: 11,
                module_id: 2,
                completed: true,
                score: 100,
                completed_at: new Date().toISOString()
            }, { onConflict: 'user_id,chapter_id' });

            alert("Accès spécial accordé. Le Module 3 est maintenant déverrouillé pour cet étudiant.");
            fetchData();
            setSelectedStudent(null);
        } catch (e) {
            console.error("Erreur force unlock:", e);
            alert("Erreur lors de l'attribution de l'accès spécial.");
        }
    }

    async function handleRollbackPhase(student: StudentProgress) {
        if (!confirm("Voulez-vous autoriser cet étudiant à modifier sa soumission ? Ses réponses seront conservées.")) return;

        try {
            const m4Data = student.module_metadata?.m4?.responses;
            const m3Data = student.module_metadata?.m3?.responses;
            const m2Data = student.module_metadata?.m2?.responses;

            let moduleId, chapterId, step;
            let updatedResponses;

            if (m4Data?.section1?.gradingA || m4Data?.section3?.audioEn) {
                // Module 4
                const m4Prog = student.user_progress.find((p: any) => p.module_id === 6);
                moduleId = m4Prog?.module_id || 6;
                chapterId = m4Prog?.chapter_id || 21;
                step = student.module_metadata?.m4?.step || 1;

                updatedResponses = {
                    ...m4Data,
                    status: 'pending'
                };
            } else if (m3Data?.exam) {
                // Module 3
                moduleId = 5;
                chapterId = 16;
                step = student.module_metadata?.m3?.step || 5;

                updatedResponses = {
                    ...m3Data,
                    exam: {
                        ...m3Data.exam,
                        status: 'pending'
                    }
                };
            } else if (m2Data?.quiz) {
                // Module 2
                moduleId = 2;
                chapterId = 11;
                step = student.module_metadata?.m2?.step || 5;

                updatedResponses = {
                    ...m2Data,
                    quiz: {
                        ...m2Data.quiz,
                        status: 'pending'
                    }
                };
            } else {
                alert("Impossible de déterminer le module pour le rollback.");
                return;
            }

            await saveActivityProgress(student.id, moduleId, chapterId, step, updatedResponses);

            alert("L'étudiant peut maintenant modifier sa soumission.");
            fetchData();
            setSelectedStudent(null);
        } catch (e) {
            console.error("Erreur rollback:", e);
            alert("Erreur lors du rollback.");
        }
    }

    async function analyzeWithAI() {
        if (!selectedStudent) return;

        setIsAnalyzing(true);
        try {
            const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const m3Data = selectedStudent.module_metadata?.m3?.responses;
            const m4Data = selectedStudent.module_metadata?.m4?.responses;
            const m2Data = selectedStudent.module_metadata?.m2?.responses;

            let prompt = "";

            if (m4Data?.section1?.gradingA || m4Data?.section3?.audioEn) {
                // Module 4 (Model Evaluation)
                const s1 = m4Data.section1;
                const s2 = m4Data.section2;
                const s3 = m4Data.section3;
                prompt = `
                    Tu es un expert en Data Annotation et RLHF (Niveau Expert Senior). 
                    TON RÔLE : Évaluer sans pitié la qualité du travail d'un candidat. Tu dois être froid, technique et extrêmement exigeant.
                    CRITÈRES : Précision factuelle absolue, respect total des contraintes, finesse de l'analyse, qualité de la localisation et de l'improvisation audio.
                    
                    TRAVAUX DE L'ÉTUDIANT (MODEL EVALUATION) :
                    
                    SECTION 1 (SbS Evaluation) : 
                    Grille Modèle A: ${JSON.stringify(s1?.gradingA || {})}
                    Grille Modèle B: ${JSON.stringify(s1?.gradingB || {})}
                    
                    SECTION 2 (Localization) :
                    Traduction UK->CA: ${s2?.exo2a?.translation || 'N/A'}
                    Traduction US->FR: ${s2?.exo2b?.translation || 'N/A'}
                    
                    SECTION 3 (Audio Role) : ${s3?.randomPrompt || 'N/A'}
                    (L'audio a été enregistré dans les deux langues).
                    
                    CONSIGNE : Évalue la pertinence des critères SbS et la qualité des localisations (termes politiques au Québec, termes de consommation en France).
                    Réponds au format JSON uniquement : {"score": number, "feedback": "Ton froid et critique..."}
                `;
            } else if (m3Data?.exam) {
                // Module 3 (Data Annotation)
                const s1 = m3Data.section1;
                const s5 = m3Data.section5;
                const exam = m3Data.exam;
                prompt = `
                    Tu es un expert en Data Annotation et RLHF (Niveau Expert Senior). 
                    TON RÔLE : Évaluer sans pitié la qualité du travail d'un candidat. Tu dois être froid, technique et extrêmement exigeant.
                    CRITÈRES : Précision factuelle absolue, respect total des contraintes, finesse de l'analyse.
                    
                    TRAVAUX DE L'ÉTUDIANT (DATA ANNOTATION) :
                    
                    SECTION 1.1 (Ranking) : Note A: ${s1?.t1_1_ratingA || 0}, Note B: ${s1?.t1_1_ratingB || 0}, Choix: ${s1?.t1_1_best || 'N/A'}, Justification: ${s1?.t1_1_justification || 'N/A'}
                    SECTION 5.1 (Instruction Following) : Poème (doit faire 4 lignes, 7 mots/ligne, NO letter 'a'): ${s5?.t5_1_poem || 'N/A'}
                    EXAMEN FINAL : Issues A: ${exam?.part1_a_issues || 'N/A'}, Issues B: ${exam?.part1_b_issues || 'N/A'}, Justification: ${exam?.part2_justification || 'N/A'}
                    
                    CONSIGNE : Si le poème en 5.1 ne respecte pas STRICTEMENT les contraintes (4 lignes, 7 mots, pas de 'a'), le score global doit être sévèrement pénalisé.
                    Réponds au format JSON uniquement : {"score": number, "feedback": "Ton froid et critique..."}
                `;
            } else if (m2Data?.quiz) {
                prompt = `Évaluation stricte du Quiz Module 2 (Prompt Engineering). Analyse la pertinence technique : ${JSON.stringify(m2Data.quiz)}. Réponds en JSON uniquement : {"score": number, "feedback": "Ton froid et critique..."}`;
            } else {
                alert("Erreur: Aucune donnée de soumission compatible trouvée.");
                setIsAnalyzing(false);
                return;
            }

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            const jsonStr = text.replace(/```json|```/g, '').trim();
            const analysis = JSON.parse(jsonStr);

            setSuggestedScore(analysis.score);
            setSuggestedFeedback(analysis.feedback);
        } catch (error: any) {
            console.error("AI Analysis Error:", error);
            alert(`Erreur AI: ${error.message}`);
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
                    <button onClick={() => setActiveTab('students')} className={`px-6 py-2 text-[10px] font-black border tracking-widest uppercase transition-all ${activeTab === 'students' ? 'bg-neon text-background border-neon' : 'bg-neon/5 text-neon border-neon/20 hover:bg-neon/10'}`}>Etudiants</button>
                    <button onClick={() => setActiveTab('messages')} className={`px-6 py-2 text-[10px] font-black border tracking-widest uppercase transition-all relative ${activeTab === 'messages' ? 'bg-neon text-background border-neon' : 'bg-neon/5 text-neon border-neon/20 hover:bg-neon/10'}`}>
                        Messages
                        {messages.filter((m: any) => !m.is_read).length > 0 && <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[8px] text-white underline">{messages.filter((m: any) => !m.is_read).length}</span>}
                    </button>
                </div>
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neon/50" />
                    <input type="text" placeholder="Rechercher_email_ou_nom..." className="bg-neon/5 border border-neon/20 p-3 pl-10 text-[10px] font-mono text-neon w-64 focus:outline-none focus:border-neon transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </header>

            {activeTab === 'students' && (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-card-bg border border-neon/20 p-6 backdrop-blur-md">
                                <div className="flex justify-between items-center mb-4"><span className="text-[10px] uppercase font-black opacity-50 text-neon tracking-widest">Total_Etudiants</span><Users size={16} className="text-neon opacity-50" /></div>
                                <div className="text-4xl font-black text-foreground">{students.length}</div>
                            </div>
                            <div className="bg-card-bg border border-neon/20 p-6 backdrop-blur-md">
                                <div className="flex justify-between items-center mb-4"><span className="text-[10px] uppercase font-black opacity-50 text-neon tracking-widest">Taux_Moyen_Progression</span><BarChart3 size={16} className="text-neon opacity-50" /></div>
                                <div className="text-4xl font-black text-neon">{students.length > 0 ? Math.round(students.reduce((acc, s) => acc + calculateOverallProgress(s.user_progress), 0) / students.length) : 0}%</div>
                            </div>
                        </div>

                        <div className="lg:col-span-2">
                            <div className="bg-card-bg border border-neon/20 overflow-hidden backdrop-blur-md shadow-2xl">
                                <table className="w-full text-left border-collapse">
                                    <thead><tr className="border-b border-neon/10 bg-neon/5"><th className="p-4 text-[10px] uppercase font-black tracking-widest text-neon/60">Etudiant</th><th className="p-4 text-[10px] uppercase font-black tracking-widest text-neon/60">Progrès</th><th className="p-4 text-[10px] uppercase font-black tracking-widest text-neon/60">Action</th></tr></thead>
                                    <tbody>
                                        {filteredStudents.map((s: any) => (
                                            <tr key={s.id} onClick={() => setSelectedStudent(s)} className="border-b border-neon/5 hover:bg-neon/5 cursor-pointer transition-colors">
                                                <td className="p-4"><div className="font-bold text-foreground text-sm">{s.full_name || 'Utilisateur'}</div><div className="text-[10px] font-mono text-neon/50">{s.email}</div></td>
                                                <td className="p-4"><div className="flex items-center gap-2"><div className="w-20 h-1 bg-neon/10 overflow-hidden"><div className="h-full bg-neon transition-all" style={{ width: `${calculateOverallProgress(s.user_progress)}%` }} /></div><span className="text-neon">{calculateOverallProgress(s.user_progress)}%</span></div></td>
                                                <td className="p-4"><ChevronRight size={14} className="text-neon" /></td>
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
                                <div><h3 className="text-2xl font-black uppercase text-foreground">{selectedStudent.full_name || selectedStudent.email}</h3><p className="text-xs font-mono text-neon opacity-60">// {selectedStudent.email}</p></div>
                                <div className="flex gap-4">
                                    {(
                                        (selectedStudent.module_metadata?.m4?.responses?.section1?.gradingA) ||
                                        (selectedStudent.module_metadata?.m3?.responses?.exam?.status && ['submitted', 'passed', 'failed'].includes(selectedStudent.module_metadata.m3.responses.exam.status)) ||
                                        (selectedStudent.module_metadata?.m2?.responses?.quiz?.status && ['submitted', 'passed', 'failed'].includes(selectedStudent.module_metadata.m2.responses.quiz.status))
                                    ) && (
                                            <button onClick={() => handleRollbackPhase(selectedStudent)} className="bg-blue-500/20 text-blue-500 px-4 py-2 text-[10px] font-black border border-blue-500/50 hover:bg-blue-500 hover:text-white transition-all flex items-center gap-2"><RotateCcw size={12} /> AUTORISER_MODIFICATION</button>
                                        )}
                                    <button onClick={() => handleForceUnlock(selectedStudent.id)} className="bg-yellow-500/20 text-yellow-500 px-4 py-2 text-[10px] font-black border border-yellow-500/50 hover:bg-yellow-500 hover:text-background transition-all flex items-center gap-2"><ShieldAlert size={12} /> ACCÈS_SPÉCIAL</button>
                                    <button onClick={() => setSelectedStudent(null)} className="bg-neon/10 text-neon px-4 py-2 text-[10px] font-mono border border-neon/20 hover:bg-neon/20">FERMER_DETAIL</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-neon mb-6 flex items-center gap-2"><BookOpen size={14} /> Progression_Détaillée</h4>
                                    <div className="space-y-4">
                                        {selectedStudent.user_progress.map((p: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center p-4 border border-neon/10 bg-neon/5 rounded">
                                                <div><p className="text-xs font-bold text-foreground">Chapitre_{p.chapter_id % 100}</p><p className="text-[9px] opacity-60">Score: {p.score !== null ? `${p.score}%` : 'N/A'} | Tentatives: {p.attempts}/2</p></div>
                                                <div className="flex items-center gap-4">{p.completed ? <UserCheck size={16} className="text-green-500" /> : <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}{p.attempts >= 2 && !p.completed && <button onClick={() => handleReset(selectedStudent.id, p.chapter_id)} className="bg-neon text-background p-2 rounded hover:scale-110 transistion-transform"><RotateCcw size={12} /></button>}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-neon/5 border border-neon/20 p-6 flex flex-col justify-center items-center text-center">
                                    <BarChart3 size={40} className="text-neon/30 mb-4" /><h4 className="text-sm font-bold uppercase tracking-widest text-neon mb-2">Performance_Analytique</h4><p className="text-[10px] font-mono opacity-60 leading-relaxed">L'étudiant a complété {selectedStudent.user_progress.filter((p: any) => p.completed).length} unités.<br />Score moyen: {selectedStudent.user_progress.length > 0 ? Math.round(selectedStudent.user_progress.reduce((acc: number, p: any) => acc + (p.score || 0), 0) / selectedStudent.user_progress.length) : 0}%</p>
                                </div>
                            </div>

                            {selectedStudent.module_metadata && (
                                <div className="mt-12 pt-10 border-t border-neon/20">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-neon mb-8 flex items-center gap-2"><Brain size={14} /> Travaux_Expert_Analyse</h4>
                                    <div className="grid grid-cols-1 gap-6">
                                        {/* SECTION 4: MODEL EVALUATION (M04) */}
                                        {selectedStudent.module_metadata.m4?.responses && (
                                            <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
                                                <div className="border-l-2 border-neon pl-4"><h4 className="text-neon font-black uppercase text-sm tracking-widest">M04: Model Evaluation Protocol</h4></div>

                                                {/* SbS Recap */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-neon/5 border border-neon/20 p-4">
                                                        <h5 className="text-[10px] font-black text-neon mb-2">GRILLE_MODÈLE_A</h5>
                                                        <pre className="text-[8px] opacity-70">{JSON.stringify(selectedStudent.module_metadata.m4.responses.section1?.gradingA, null, 2)}</pre>
                                                    </div>
                                                    <div className="bg-neon/5 border border-neon/20 p-4">
                                                        <h5 className="text-[10px] font-black text-neon mb-2">GRILLE_MODÈLE_B</h5>
                                                        <pre className="text-[8px] opacity-70">{JSON.stringify(selectedStudent.module_metadata.m4.responses.section1?.gradingB, null, 2)}</pre>
                                                    </div>
                                                </div>

                                                {/* Localization Recap */}
                                                <div className="space-y-4">
                                                    <div className="p-4 bg-black/40 border border-white/5">
                                                        <p className="text-[9px] font-bold text-neon uppercase mb-1">Traduction 2.1 (Fr_CA) :</p>
                                                        <p className="text-[10px] italic opacity-80">{selectedStudent.module_metadata.m4.responses.section2?.exo2a?.translation || 'N/A'}</p>
                                                    </div>
                                                    <div className="p-4 bg-black/40 border border-white/5">
                                                        <p className="text-[9px] font-bold text-neon uppercase mb-1">Traduction 2.2 (Fr_FR) :</p>
                                                        <p className="text-[10px] italic opacity-80">{selectedStudent.module_metadata.m4.responses.section2?.exo2b?.translation || 'N/A'}</p>
                                                    </div>
                                                </div>

                                                {/* Audio Recordings */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="p-4 bg-blue-500/10 border border-blue-500/20">
                                                        <p className="text-[8px] font-black text-blue-500 uppercase mb-2">Recording_EN</p>
                                                        {selectedStudent.module_metadata.m4.responses.section3?.audioEn ? (
                                                            <audio src={selectedStudent.module_metadata.m4.responses.section3.audioEn} controls className="w-full h-8" />
                                                        ) : <span className="text-[8px] opacity-30">Aucun enregistrement</span>}
                                                    </div>
                                                    <div className="p-4 bg-orange-500/10 border border-orange-500/20">
                                                        <p className="text-[8px] font-black text-orange-500 uppercase mb-2">Recording_FR</p>
                                                        {selectedStudent.module_metadata.m4.responses.section3?.audioFr ? (
                                                            <audio src={selectedStudent.module_metadata.m4.responses.section3.audioFr} controls className="w-full h-8" />
                                                        ) : <span className="text-[8px] opacity-30">Aucun enregistrement</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* SECTION 1: DATA ANNOTATION (M03) */}
                                        {selectedStudent.module_metadata.m3?.responses?.section1 && (
                                            <div className="p-6 bg-neon/5 border border-neon/10">
                                                <p className="text-[10px] text-neon font-black uppercase tracking-widest mb-4">Module 3: Data Annotation</p>
                                                <div className="p-4 bg-black/40 border border-white/5 space-y-2"><p className="text-neon font-bold uppercase text-[9px]">Justification Ranking</p><p>{selectedStudent.module_metadata.m3.responses.section1.t1_1_justification}</p></div>
                                                <div className="p-4 bg-black/40 border border-white/5 space-y-2"><p className="text-neon font-bold uppercase text-[9px]">Détection Hallucinations</p><p>{selectedStudent.module_metadata.m3.responses.section1.t1_2_errors}</p></div>
                                            </div>
                                        )}
                                        {/* FINAL EXAM: DATA ANNOTATION (M03) */}
                                        {selectedStudent.module_metadata.m3?.responses?.exam?.status === 'submitted' && (
                                            <div className="p-6 bg-neon/10 border border-neon pt-8 mt-8">
                                                <h4 className="text-xl font-black uppercase text-neon mb-6 flex items-center gap-2"><Sparkles size={24} /> RÉPONSES_EXAMEN_EXPERT (M03)</h4>
                                                <div className="grid grid-cols-2 gap-4 mb-8">
                                                    <div className="p-4 bg-black/40 border border-neon/20"><p className="text-neon font-bold uppercase text-[9px] mb-2">Modèle A</p><p className="text-xs italic">{selectedStudent.module_metadata.m3.responses.exam.part1_a_issues}</p></div>
                                                    <div className="p-4 bg-black/40 border border-neon/20"><p className="text-neon font-bold uppercase text-[9px] mb-2">Modèle B</p><p className="text-xs italic">{selectedStudent.module_metadata.m3.responses.exam.part1_b_issues}</p></div>
                                                </div>
                                                <div className="p-6 border border-neon bg-black/40 mb-8"><p className="text-neon font-bold uppercase text-[9px] mb-2">Justification Globale</p><p className="text-sm">{selectedStudent.module_metadata.m3.responses.exam.part2_justification}</p></div>
                                                <div className="border-t border-neon/30 pt-8 flex flex-col items-center">
                                                    <button onClick={analyzeWithAI} disabled={isAnalyzing} className={`px-10 py-3 text-xs font-black border uppercase tracking-widest ${isAnalyzing ? 'bg-neon/10 text-neon/40' : 'bg-neon text-background border-neon shadow-[0_0_20px_rgba(var(--neon-rgb),0.2)]'}`}>{isAnalyzing ? 'ANALYSE_EN_COURS...' : 'GÉNÉRER ANALYSE IA'}</button>
                                                    {(suggestedScore !== null || suggestedFeedback) && (
                                                        <div className="w-full mt-10 space-y-6 animate-in slide-in-from-top-5">
                                                            <div className="flex items-center gap-4 justify-center"><span className="text-neon font-black text-xs">SCORE:</span><input type="number" value={suggestedScore || 0} onChange={e => setSuggestedScore(parseInt(e.target.value))} className="bg-neon/5 border border-neon/30 p-2 text-2xl font-black text-neon w-24 text-center" /><span className="text-neon/30 text-2xl font-black">/ 100</span></div>
                                                            <textarea value={suggestedFeedback} onChange={e => setSuggestedFeedback(e.target.value)} className="w-full h-40 bg-black/60 border border-neon/30 p-4 text-xs font-mono text-foreground focus:border-neon outline-none" />
                                                            <div className="flex gap-6 justify-center"><button onClick={() => handleGradeQuiz(selectedStudent.id, 'failed')} className="px-10 py-4 bg-red-600 text-white font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-red-600/30 hover:scale-105 transition-all">REJETER</button><button onClick={() => handleGradeQuiz(selectedStudent.id, 'passed')} className="px-10 py-4 bg-green-600 text-white font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-green-600/30 hover:scale-105 transition-all">VALIDER_EXPERT</button></div>
                                                        </div>
                                                    )}
                                                </div>
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
                    <h3 className="text-2xl font-black uppercase italic text-foreground flex items-center gap-4"><MessageSquare className="text-neon" /> Inbox_Feedback</h3>
                    <div className="grid grid-cols-1 gap-4">
                        {messages.map(msg => (
                            <div key={msg.id} className={`p-6 border transition-all ${msg.is_read ? 'bg-card-bg/50 border-neon/10 opacity-70' : 'bg-card-bg border-neon/30 border-l-4 border-l-neon shadow-[0_0_20px_rgba(var(--neon-rgb),0.05)]'}`}>
                                <div className="flex justify-between mb-4"><div><h4 className="font-bold text-foreground text-sm uppercase">{msg.user_full_name}</h4><span className="text-[9px] font-mono text-neon/40"><Clock size={10} className="inline mr-1" /> {new Date(msg.created_at).toLocaleString()}</span></div>{!msg.is_read && <button onClick={async () => { await markMessageAsRead(msg.id); fetchMessages(); }} className="text-[9px] font-mono text-neon hover:underline">MARQUER_LU</button>}</div>
                                <p className="text-foreground/80 text-sm leading-relaxed bg-black/20 p-4 border border-white/5 font-mono">{msg.content}</p>
                            </div>
                        ))}
                        {messages.length === 0 && <div className="p-20 text-center border border-dashed border-neon/20"><p className="text-[10px] font-mono text-neon/40 italic uppercase">Aucun message reçu.</p></div>}
                    </div>
                </div>
            )}
        </div>
    );
}
