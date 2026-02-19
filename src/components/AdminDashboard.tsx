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

// ─── Small helpers ────────────────────────────────────────────────────────────
function SectionBlock({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="p-4 bg-black/40 border border-white/5 space-y-1">
            <p className="text-neon font-bold uppercase text-[9px] tracking-widest mb-2">{label}</p>
            {children}
        </div>
    );
}

function JsonBlock({ label, value }: { label: string; value: any }) {
    if (!value) return null;
    return (
        <SectionBlock label={label}>
            <pre className="text-[8px] opacity-70 whitespace-pre-wrap break-all">{JSON.stringify(value, null, 2)}</pre>
        </SectionBlock>
    );
}

function TextField({ label, value }: { label: string; value?: string }) {
    if (!value) return null;
    return (
        <SectionBlock label={label}>
            <p className="text-xs italic opacity-80 leading-relaxed">{value}</p>
        </SectionBlock>
    );
}

function StatusBadge({ status }: { status?: string }) {
    const colors: Record<string, string> = {
        pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
        submitted: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
        passed: 'bg-green-500/20 text-green-400 border-green-500/40',
        failed: 'bg-red-500/20 text-red-400 border-red-500/40',
    };
    if (!status) return null;
    return (
        <span className={`inline-block px-3 py-1 text-[9px] font-black border uppercase tracking-widest ${colors[status] || ''}`}>
            {status}
        </span>
    );
}
// ─────────────────────────────────────────────────────────────────────────────

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

            let updatedResponses: ModuleResponses;
            let moduleId = 2;
            let chapterId = 11;
            let currentStep = 1;

            if (m4Data?.section1?.gradingA || m4Data?.section3?.audioEn) {
                const m4Prog = selectedStudent.user_progress.find((p: any) => p.module_id === 6);
                moduleId = m4Prog?.module_id || 6;
                chapterId = m4Prog?.chapter_id || 21;
                currentStep = selectedStudent.module_metadata?.m4?.step || 5;
                updatedResponses = { ...m4Data, status, feedback: suggestedFeedback, score: suggestedScore };
            } else if (m3Data?.exam) {
                moduleId = 5;
                chapterId = 16;
                currentStep = selectedStudent.module_metadata?.m3?.step || 5;
                updatedResponses = { ...m3Data, exam: { ...m3Data.exam, status, feedback: suggestedFeedback, score: suggestedScore } };
            } else if (m2Data?.quiz) {
                moduleId = 2;
                chapterId = 11;
                currentStep = selectedStudent.module_metadata?.m2?.step || 5;
                updatedResponses = { ...m2Data, quiz: { ...m2Data.quiz, status, feedback: suggestedFeedback, score: suggestedScore } };
            } else {
                alert("Impossible de déterminer le module à noter.");
                return;
            }

            await saveActivityProgress(userId, moduleId, chapterId, currentStep, updatedResponses);

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
                quiz: { status: 'passed', score: 100, feedback: "ACCÈS_SPÉCIAL_ADMIN_ACCORDÉ", submittedAt: new Date().toISOString() }
            });
            await supabase.from('user_progress').upsert({
                user_id: userId, chapter_id: 11, module_id: 2,
                completed: true, score: 100, completed_at: new Date().toISOString()
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

            let moduleId: number, chapterId: number, step: number;
            let updatedResponses: ModuleResponses;

            if (m4Data?.section1?.gradingA || m4Data?.section3?.audioEn) {
                const m4Prog = student.user_progress.find((p: any) => p.module_id === 6);
                moduleId = m4Prog?.module_id || 6;
                chapterId = m4Prog?.chapter_id || 21;
                step = student.module_metadata?.m4?.step || 1;
                updatedResponses = { ...m4Data, status: 'pending' } as ModuleResponses;
            } else if (m3Data?.exam) {
                moduleId = 5; chapterId = 16;
                step = student.module_metadata?.m3?.step || 5;
                updatedResponses = { ...m3Data, exam: { ...m3Data.exam, status: 'pending' } };
            } else if (m2Data?.quiz) {
                moduleId = 2; chapterId = 11;
                step = student.module_metadata?.m2?.step || 5;
                updatedResponses = { ...m2Data, quiz: { ...m2Data.quiz, status: 'pending' } };
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
            const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
            if (!apiKey) throw new Error("Clé API Gemini manquante dans .env.local");

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const m3Data = selectedStudent.module_metadata?.m3?.responses;
            const m4Data = selectedStudent.module_metadata?.m4?.responses;
            const m2Data = selectedStudent.module_metadata?.m2?.responses;

            let prompt = "";

            if (m4Data?.section1?.gradingA || m4Data?.section3?.audioEn) {
                prompt = `Tu es un expert en Data Annotation et RLHF (Niveau Expert Senior). Évalue sans pitié ce travail (Model Evaluation).
                SECTION 1 (SbS) - Grille A: ${JSON.stringify(m4Data.section1?.gradingA)}, Grille B: ${JSON.stringify(m4Data.section1?.gradingB)}
                SECTION 2 (Localization) - Fr_CA: ${m4Data.section2?.exo2a?.translation}, Fr_FR: ${m4Data.section2?.exo2b?.translation}
                SECTION 3 (Audio) - Prompt: ${m4Data.section3?.randomPrompt || 'N/A'}
                Réponds UNIQUEMENT en JSON: {"score": number, "feedback": "critique froide et technique"}`;
            } else if (m3Data?.exam) {
                prompt = `Tu es un expert en Data Annotation et RLHF. Évalue ce travail (Data Annotation Final).
                SECTION 1 - Ranking justif: ${m3Data.section1?.t1_1_justification}, Hallucinations: ${m3Data.section1?.t1_2_errors}
                SECTION 5 - Poème (doit avoir 4 lignes, 7 mots/ligne, pas de lettre 'a'): ${m3Data.section5?.t5_1_poem}
                EXAMEN - Issues A: ${m3Data.exam?.part1_a_issues}, Issues B: ${m3Data.exam?.part1_b_issues}, Justification: ${m3Data.exam?.part2_justification}
                Si le poème ne respecte pas les contraintes, pénalise sévèrement.
                Réponds UNIQUEMENT en JSON: {"score": number, "feedback": "critique froide et technique"}`;
            } else if (m2Data?.quiz) {
                prompt = `Tu es un expert en Prompt Engineering. Évalue ce quiz Module 2 strictement: ${JSON.stringify(m2Data.quiz)}
                Réponds UNIQUEMENT en JSON: {"score": number, "feedback": "critique froide et technique"}`;
            } else {
                alert("Aucune soumission compatible trouvée pour l'analyse IA.");
                setIsAnalyzing(false);
                return;
            }

            const result = await model.generateContent(prompt);
            const text = result.response.text();
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

    // Determine if any module has a pending/submitted evaluation for grading panel
    const getGradingTarget = (s: StudentProgress) => {
        const m4 = s.module_metadata?.m4?.responses;
        const m3 = s.module_metadata?.m3?.responses;
        const m2 = s.module_metadata?.m2?.responses;
        if (m4?.status === 'submitted' || m4?.section1?.gradingA) return 'm4';
        if (m3?.exam?.status === 'submitted') return 'm3';
        if (m2?.quiz?.status === 'submitted') return 'm2';
        return null;
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
                        {messages.filter((m: any) => !m.is_read).length > 0 && <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[8px] text-white">{messages.filter((m: any) => !m.is_read).length}</span>}
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
                                            <tr key={s.id} onClick={() => { setSelectedStudent(s); setSuggestedFeedback(''); setSuggestedScore(null); }} className="border-b border-neon/5 hover:bg-neon/5 cursor-pointer transition-colors">
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
                                <div>
                                    <h3 className="text-2xl font-black uppercase text-foreground">{selectedStudent.full_name || selectedStudent.email}</h3>
                                    <p className="text-xs font-mono text-neon opacity-60">// {selectedStudent.email}</p>
                                </div>
                                <div className="flex gap-4">
                                    {((selectedStudent.module_metadata?.m4?.responses?.section1?.gradingA) ||
                                        (selectedStudent.module_metadata?.m3?.responses?.exam?.status && ['submitted', 'passed', 'failed'].includes(selectedStudent.module_metadata.m3.responses.exam.status)) ||
                                        (selectedStudent.module_metadata?.m2?.responses?.quiz?.status && ['submitted', 'passed', 'failed'].includes(selectedStudent.module_metadata.m2.responses.quiz.status))
                                    ) && (
                                            <button onClick={() => handleRollbackPhase(selectedStudent)} className="bg-blue-500/20 text-blue-500 px-4 py-2 text-[10px] font-black border border-blue-500/50 hover:bg-blue-500 hover:text-white transition-all flex items-center gap-2"><RotateCcw size={12} /> AUTORISER_MODIFICATION</button>
                                        )}
                                    <button onClick={() => handleForceUnlock(selectedStudent.id)} className="bg-yellow-500/20 text-yellow-500 px-4 py-2 text-[10px] font-black border border-yellow-500/50 hover:bg-yellow-500 hover:text-background transition-all flex items-center gap-2"><ShieldAlert size={12} /> ACCÈS_SPÉCIAL</button>
                                    <button onClick={() => setSelectedStudent(null)} className="bg-neon/10 text-neon px-4 py-2 text-[10px] font-mono border border-neon/20 hover:bg-neon/20">FERMER_DETAIL</button>
                                </div>
                            </div>

                            {/* Progress Overview */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-neon mb-6 flex items-center gap-2"><BookOpen size={14} /> Progression_Détaillée</h4>
                                    <div className="space-y-2">
                                        {selectedStudent.user_progress.map((p: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center p-3 border border-neon/10 bg-neon/5 rounded">
                                                <div><p className="text-xs font-bold text-foreground">Chapitre_{p.chapter_id % 100} (M{p.module_id})</p><p className="text-[9px] opacity-60">Score: {p.score !== null ? `${p.score}%` : 'N/A'} | Tentatives: {p.attempts}/2</p></div>
                                                <div className="flex items-center gap-3">
                                                    {p.completed ? <UserCheck size={16} className="text-green-500" /> : <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                                                    {p.attempts >= 2 && !p.completed && <button onClick={() => handleReset(selectedStudent.id, p.chapter_id)} className="bg-neon text-background p-1.5 rounded hover:scale-110 transition-transform"><RotateCcw size={10} /></button>}
                                                </div>
                                            </div>
                                        ))}
                                        {selectedStudent.user_progress.length === 0 && <p className="text-[10px] font-mono opacity-40 italic">Aucune progression enregistrée.</p>}
                                    </div>
                                </div>
                                <div className="bg-neon/5 border border-neon/20 p-6 flex flex-col justify-center items-center text-center">
                                    <BarChart3 size={40} className="text-neon/30 mb-4" /><h4 className="text-sm font-bold uppercase tracking-widest text-neon mb-2">Performance_Analytique</h4>
                                    <p className="text-[10px] font-mono opacity-60 leading-relaxed">
                                        Unités complétées: {selectedStudent.user_progress.filter((p: any) => p.completed).length}<br />
                                        Score moyen: {selectedStudent.user_progress.length > 0 ? Math.round(selectedStudent.user_progress.reduce((acc: number, p: any) => acc + (p.score || 0), 0) / selectedStudent.user_progress.length) : 0}%
                                    </p>
                                </div>
                            </div>

                            {/* ─── MODULE DATA SECTION ─── */}
                            <div className="border-t border-neon/20 pt-10">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-neon mb-8 flex items-center gap-2"><Brain size={14} /> Travaux_Soumis_Par_Module</h4>

                                {/* ── MODULE 2: Prompt Engineering ── */}
                                {selectedStudent.module_metadata?.m2?.responses && (
                                    <div className="mb-10 border border-neon/20 rounded p-6 space-y-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="border-l-2 border-neon pl-4"><h4 className="text-neon font-black uppercase text-sm tracking-widest">M02 · Prompt Engineering</h4></div>
                                            <StatusBadge status={selectedStudent.module_metadata.m2.responses.quiz?.status} />
                                        </div>

                                        {/* Activities */}
                                        {selectedStudent.module_metadata.m2.responses.activity1 && (
                                            <TextField label="Activité 1" value={selectedStudent.module_metadata.m2.responses.activity1} />
                                        )}
                                        {selectedStudent.module_metadata.m2.responses.activity2 && (
                                            <TextField label="Activité 2" value={selectedStudent.module_metadata.m2.responses.activity2} />
                                        )}
                                        {selectedStudent.module_metadata.m2.responses.activity3_1 && (
                                            <TextField label="Activité 3.1" value={selectedStudent.module_metadata.m2.responses.activity3_1} />
                                        )}
                                        {selectedStudent.module_metadata.m2.responses.activity3_2 && (
                                            <TextField label="Activité 3.2" value={selectedStudent.module_metadata.m2.responses.activity3_2} />
                                        )}
                                        {selectedStudent.module_metadata.m2.responses.activity4_1 && (
                                            <TextField label="Activité 4.1" value={selectedStudent.module_metadata.m2.responses.activity4_1} />
                                        )}
                                        {selectedStudent.module_metadata.m2.responses.activity4_2 && (
                                            <TextField label="Activité 4.2" value={selectedStudent.module_metadata.m2.responses.activity4_2} />
                                        )}

                                        {/* Quiz Answers */}
                                        {selectedStudent.module_metadata.m2.responses.quiz && (() => {
                                            const q = selectedStudent.module_metadata.m2.responses.quiz!;
                                            return (
                                                <div className="bg-neon/5 border border-neon/20 p-4 space-y-3 mt-2">
                                                    <p className="text-[9px] font-black text-neon uppercase tracking-widest">Quiz Final</p>
                                                    {q.part1_A && <TextField label="Part 1 – Prompt A" value={q.part1_A} />}
                                                    {q.part1_B && <TextField label="Part 1 – Prompt B" value={q.part1_B} />}
                                                    {q.part2_q1 && <TextField label="Q2.1" value={q.part2_q1} />}
                                                    {q.part2_q2 && <TextField label="Q2.2" value={q.part2_q2} />}
                                                    {q.part2_q3 && <TextField label="Q2.3" value={q.part2_q3} />}
                                                    {q.part2_q4 && <TextField label="Q2.4" value={q.part2_q4} />}
                                                    {q.part2_q5 && <TextField label="Q2.5" value={q.part2_q5} />}
                                                    {q.part3_p1 && <TextField label="Prompt 3.1" value={q.part3_p1} />}
                                                    {q.part3_p2 && <TextField label="Prompt 3.2" value={q.part3_p2} />}
                                                    {q.part3_p3 && <TextField label="Prompt 3.3" value={q.part3_p3} />}
                                                    {q.feedback && <div className="p-3 bg-blue-500/10 border border-blue-500/20"><p className="text-[9px] font-black text-blue-400 uppercase mb-1">Feedback Admin</p><p className="text-xs">{q.feedback}</p></div>}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                {/* ── MODULE 3: Data Annotation ── */}
                                {selectedStudent.module_metadata?.m3?.responses && (
                                    <div className="mb-10 border border-neon/20 rounded p-6 space-y-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="border-l-2 border-neon pl-4"><h4 className="text-neon font-black uppercase text-sm tracking-widest">M03 · Data Annotation</h4></div>
                                            <StatusBadge status={selectedStudent.module_metadata.m3.responses.exam?.status} />
                                        </div>

                                        {/* Section 1 */}
                                        {selectedStudent.module_metadata.m3.responses.section1 && (() => {
                                            const s1 = selectedStudent.module_metadata.m3.responses.section1;
                                            return (
                                                <div className="space-y-3">
                                                    <p className="text-[9px] font-black text-neon/60 uppercase tracking-widest">Section 1 – Ranking & Hallucinations</p>
                                                    {s1.t1_1_ratingA !== undefined && <SectionBlock label="Notes SbS (A / B / Choix)"><p className="text-xs opacity-80">A: {s1.t1_1_ratingA} · B: {s1.t1_1_ratingB} · Choix: {s1.t1_1_best}</p></SectionBlock>}
                                                    <TextField label="Justification ranking" value={s1.t1_1_justification} />
                                                    <TextField label="Détection hallucinations (1.2)" value={s1.t1_2_errors} />
                                                </div>
                                            );
                                        })()}

                                        {/* Section 2 */}
                                        {selectedStudent.module_metadata.m3.responses.section2 && (() => {
                                            const s2 = selectedStudent.module_metadata.m3.responses.section2;
                                            return (
                                                <div className="space-y-3 mt-2">
                                                    <p className="text-[9px] font-black text-neon/60 uppercase tracking-widest">Section 2</p>
                                                    <JsonBlock label="Section 2 – données" value={s2} />
                                                </div>
                                            );
                                        })()}

                                        {/* Section 3 */}
                                        {selectedStudent.module_metadata.m3.responses.section3 && (
                                            <JsonBlock label="Section 3" value={selectedStudent.module_metadata.m3.responses.section3} />
                                        )}

                                        {/* Section 4 */}
                                        {selectedStudent.module_metadata.m3.responses.section4 && (
                                            <JsonBlock label="Section 4" value={selectedStudent.module_metadata.m3.responses.section4} />
                                        )}

                                        {/* Section 5 */}
                                        {selectedStudent.module_metadata.m3.responses.section5 && (() => {
                                            const s5 = selectedStudent.module_metadata.m3.responses.section5;
                                            return (
                                                <div className="space-y-3 mt-2">
                                                    <p className="text-[9px] font-black text-neon/60 uppercase tracking-widest">Section 5 – Instruction Following</p>
                                                    <TextField label="Poème (4 lignes, 7 mots, sans 'a')" value={s5.t5_1_poem} />
                                                    {Object.entries(s5).filter(([k]) => k !== 't5_1_poem').map(([k, v]) => (
                                                        <TextField key={k} label={k} value={String(v)} />
                                                    ))}
                                                </div>
                                            );
                                        })()}

                                        {/* Exam */}
                                        {selectedStudent.module_metadata.m3.responses.exam && (() => {
                                            const ex = selectedStudent.module_metadata.m3.responses.exam!;
                                            return (
                                                <div className="bg-neon/10 border border-neon p-6 space-y-4 mt-4">
                                                    <p className="text-[9px] font-black text-neon uppercase tracking-widest flex items-center gap-2"><Sparkles size={12} /> Examen Final</p>
                                                    <TextField label="Issues Modèle A" value={ex.part1_a_issues} />
                                                    <TextField label="Issues Modèle B" value={ex.part1_b_issues} />
                                                    <TextField label="Justification Globale" value={ex.part2_justification} />
                                                    {ex.feedback && <div className="p-3 bg-blue-500/10 border border-blue-500/20"><p className="text-[9px] font-black text-blue-400 uppercase mb-1">Feedback Admin</p><p className="text-xs">{ex.feedback}</p></div>}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                {/* ── MODULE 4: Model Evaluation ── */}
                                {selectedStudent.module_metadata?.m4?.responses && (
                                    <div className="mb-10 border border-neon/20 rounded p-6 space-y-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="border-l-2 border-neon pl-4"><h4 className="text-neon font-black uppercase text-sm tracking-widest">M04 · Model Evaluation Protocol</h4></div>
                                            <StatusBadge status={selectedStudent.module_metadata.m4.responses.status} />
                                        </div>

                                        {/* Section 1 – SbS */}
                                        {selectedStudent.module_metadata.m4.responses.section1 && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <JsonBlock label="Grille Modèle A" value={selectedStudent.module_metadata.m4.responses.section1?.gradingA} />
                                                <JsonBlock label="Grille Modèle B" value={selectedStudent.module_metadata.m4.responses.section1?.gradingB} />
                                            </div>
                                        )}

                                        {/* Section 2 – Localization */}
                                        {selectedStudent.module_metadata.m4.responses.section2 && (
                                            <div className="space-y-3">
                                                <p className="text-[9px] font-black text-neon/60 uppercase tracking-widest">Section 2 – Localization</p>
                                                <TextField label="Traduction 2.1 (Fr_CA)" value={selectedStudent.module_metadata.m4.responses.section2?.exo2a?.translation} />
                                                <TextField label="Traduction 2.2 (Fr_FR)" value={selectedStudent.module_metadata.m4.responses.section2?.exo2b?.translation} />
                                            </div>
                                        )}

                                        {/* Section 3 – Audio */}
                                        {selectedStudent.module_metadata.m4.responses.section3 && (
                                            <div className="space-y-3">
                                                <p className="text-[9px] font-black text-neon/60 uppercase tracking-widest">Section 3 – Audio Role Play</p>
                                                {selectedStudent.module_metadata.m4.responses.section3?.randomPrompt && (
                                                    <SectionBlock label="Prompt aléatoire">{selectedStudent.module_metadata.m4.responses.section3.randomPrompt}</SectionBlock>
                                                )}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="p-4 bg-blue-500/10 border border-blue-500/20">
                                                        <p className="text-[8px] font-black text-blue-500 uppercase mb-2">Recording_EN</p>
                                                        {selectedStudent.module_metadata.m4.responses.section3?.audioEn
                                                            ? <audio src={selectedStudent.module_metadata.m4.responses.section3.audioEn} controls className="w-full h-8" />
                                                            : <span className="text-[8px] opacity-30">Aucun enregistrement</span>}
                                                    </div>
                                                    <div className="p-4 bg-orange-500/10 border border-orange-500/20">
                                                        <p className="text-[8px] font-black text-orange-500 uppercase mb-2">Recording_FR</p>
                                                        {selectedStudent.module_metadata.m4.responses.section3?.audioFr
                                                            ? <audio src={selectedStudent.module_metadata.m4.responses.section3.audioFr} controls className="w-full h-8" />
                                                            : <span className="text-[8px] opacity-30">Aucun enregistrement</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {selectedStudent.module_metadata.m4.responses.feedback && (
                                            <div className="p-3 bg-blue-500/10 border border-blue-500/20"><p className="text-[9px] font-black text-blue-400 uppercase mb-1">Feedback Admin</p><p className="text-xs">{selectedStudent.module_metadata.m4.responses.feedback}</p></div>
                                        )}
                                    </div>
                                )}

                                {/* If no module data at all */}
                                {!selectedStudent.module_metadata?.m2?.responses && !selectedStudent.module_metadata?.m3?.responses && !selectedStudent.module_metadata?.m4?.responses && (
                                    <div className="p-10 border border-dashed border-neon/20 text-center">
                                        <p className="text-[10px] font-mono text-neon/40 italic uppercase">Aucun travail soumis pour cet étudiant.</p>
                                    </div>
                                )}

                                {/* ─── AI GRADING PANEL ─── */}
                                {getGradingTarget(selectedStudent) && (
                                    <div className="mt-10 border-t border-neon/30 pt-8 flex flex-col items-center">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-neon mb-6 flex items-center gap-2"><Sparkles size={14} /> Notation_IA</h4>
                                        <button onClick={analyzeWithAI} disabled={isAnalyzing} className={`px-10 py-3 text-xs font-black border uppercase tracking-widest ${isAnalyzing ? 'bg-neon/10 text-neon/40 border-neon/10' : 'bg-neon text-background border-neon shadow-[0_0_20px_rgba(var(--neon-rgb),0.2)]'}`}>
                                            {isAnalyzing ? 'ANALYSE_EN_COURS...' : 'GÉNÉRER ANALYSE IA'}
                                        </button>
                                        {(suggestedScore !== null || suggestedFeedback) && (
                                            <div className="w-full mt-10 space-y-6 animate-in slide-in-from-top-5">
                                                <div className="flex items-center gap-4 justify-center">
                                                    <span className="text-neon font-black text-xs">SCORE:</span>
                                                    <input type="number" value={suggestedScore || 0} onChange={e => setSuggestedScore(parseInt(e.target.value))} className="bg-neon/5 border border-neon/30 p-2 text-2xl font-black text-neon w-24 text-center" />
                                                    <span className="text-neon/30 text-2xl font-black">/ 100</span>
                                                </div>
                                                <textarea value={suggestedFeedback} onChange={e => setSuggestedFeedback(e.target.value)} className="w-full h-40 bg-black/60 border border-neon/30 p-4 text-xs font-mono text-foreground focus:border-neon outline-none" />
                                                <div className="flex gap-6 justify-center">
                                                    <button onClick={() => handleGradeQuiz(selectedStudent.id, 'failed')} className="px-10 py-4 bg-red-600 text-white font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-red-600/30 hover:scale-105 transition-all">REJETER</button>
                                                    <button onClick={() => handleGradeQuiz(selectedStudent.id, 'passed')} className="px-10 py-4 bg-green-600 text-white font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-green-600/30 hover:scale-105 transition-all">VALIDER_EXPERT</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
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
                                <div className="flex justify-between mb-4">
                                    <div><h4 className="font-bold text-foreground text-sm uppercase">{msg.user_full_name}</h4><span className="text-[9px] font-mono text-neon/40"><Clock size={10} className="inline mr-1" />{new Date(msg.created_at).toLocaleString()}</span></div>
                                    {!msg.is_read && <button onClick={async () => { await markMessageAsRead(msg.id); fetchMessages(); }} className="text-[9px] font-mono text-neon hover:underline">MARQUER_LU</button>}
                                </div>
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
