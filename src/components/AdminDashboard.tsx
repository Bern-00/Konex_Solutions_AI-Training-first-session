'use client';

import { useState, useEffect } from 'react';
import { Users, BookOpen, RotateCcw, ChevronRight, BarChart3, Search, UserCheck, MessageSquare, Trash2, Clock } from 'lucide-react';
import { getAllStudentsProgress, resetStudentAttempts } from '@/lib/progress';
import { getMessages, markMessageAsRead } from '@/lib/messages';

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
            console.log('Admin Dashboard Data Fetched:', data);
            if (data && data.length > 0) {
                setStudents(data as any);
            } else {
                console.warn('No students found in the database or filtered out.');
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
            fetchData(); // Refresh
        } catch (error) {
            alert('Erreur lors de la réinitialisation.');
        }
    }

    const filteredStudents = students.filter(s =>
        s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const calculateOverallProgress = (progress: StudentProgress['user_progress']) => {
        const completed = progress.filter(p => p.completed).length;
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
                        {messages.filter(m => !m.is_read).length > 0 && (
                            <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[8px] text-white animate-pulse">
                                {messages.filter(m => !m.is_read).length}
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
                        {/* Statistics Cards */}
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

                        {/* Student List Table */}
                        <div className="lg:col-span-2">
                            <div className="bg-card-bg border border-neon/20 overflow-hidden backdrop-blur-md">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-neon/10 bg-neon/5">
                                            <th className="p-4 text-[10px] uppercase font-black tracking-widest text-neon/60">Etudiant</th>
                                            <th className="p-4 text-[10px] uppercase font-black tracking-widest text-neon/60">Module_1</th>
                                            <th className="p-4 text-[10px] uppercase font-black tracking-widest text-neon/60">Dernière_Activité</th>
                                            <th className="p-4 text-[10px] uppercase font-black tracking-widest text-neon/60">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredStudents.map((student) => (
                                            <tr
                                                key={student.id}
                                                onClick={() => setSelectedStudent(student)}
                                                className="border-b border-neon/5 hover:bg-neon/5 cursor-pointer transition-colors group"
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
                                                <td className="p-4 text-foreground/60">
                                                    {student.user_progress.length > 0
                                                        ? new Date(student.user_progress.sort((a, b) => new Date(b.completed_at || '').getTime() - new Date(a.completed_at || '').getTime())[0].completed_at || '').toLocaleDateString()
                                                        : 'Jamais'}
                                                </td>
                                                <td className="p-4">
                                                    <ChevronRight size={14} className="text-neon" />
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredStudents.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="p-10 text-center text-neon/40 italic">
                                                    AUCUN ETUDIANT DETECTE DANS LA BASE DE DONNEES.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Selection View */}
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
                                        {selectedStudent.user_progress.map((p, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-4 border border-neon/10 bg-neon/5 rounded">
                                                <div>
                                                    <p className="text-xs font-bold text-foreground">Chapitre_{p.chapter_id % 100}</p>
                                                    <p className="text-[9px] opacity-60">Score: {p.score !== null ? `${p.score}%` : 'N/A'} | Tentatives: {p.attempts}/2</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {p.completed ? (
                                                        <UserCheck size={16} className="text-green-500" />
                                                    ) : (
                                                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                                    )}

                                                    {p.attempts >= 2 && !p.completed && (
                                                        <button
                                                            onClick={() => handleReset(selectedStudent.id, p.chapter_id)}
                                                            className="bg-neon text-background p-2 rounded hover:scale-110 transition-transform"
                                                            title="Ré-attribuer des tentatives"
                                                        >
                                                            <RotateCcw size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {selectedStudent.user_progress.length === 0 && (
                                            <p className="text-[10px] font-mono opacity-50 italic">Aucune donnée de progression enregistrée.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-neon/5 border border-neon/20 p-6 flex flex-col justify-center items-center text-center">
                                    <BarChart3 size={40} className="text-neon/30 mb-4" />
                                    <h4 className="text-sm font-bold uppercase tracking-widest text-neon mb-2">Performance_Analytique</h4>
                                    <p className="text-[10px] font-mono opacity-60 leading-relaxed">
                                        L'étudiant a complété {selectedStudent.user_progress.filter(p => p.completed).length} unités.<br />
                                        Son score moyen est de {
                                            selectedStudent.user_progress.length > 0
                                                ? Math.round(selectedStudent.user_progress.reduce((acc, p) => acc + (p.score || 0), 0) / selectedStudent.user_progress.length)
                                                : 0
                                        }%.
                                    </p>
                                </div>
                            </div>
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
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`p-6 border transition-all ${msg.is_read ? 'bg-card-bg/50 border-neon/10 opacity-70' : 'bg-card-bg border-neon/30 border-l-4 border-l-neon shadow-[0_0_20px_rgba(var(--neon-rgb),0.05)]'}`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="font-bold text-foreground text-sm uppercase">{msg.user_full_name}</h4>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[9px] font-mono text-neon/40 flex items-center gap-1">
                                                <Clock size={10} /> {new Date(msg.created_at).toLocaleString()}
                                            </span>
                                            {!msg.is_read && (
                                                <span className="text-[8px] bg-neon text-background px-1.5 py-0.5 font-bold uppercase tracking-tighter">New_Signal</span>
                                            )}
                                        </div>
                                    </div>
                                    {!msg.is_read && (
                                        <button
                                            onClick={async () => {
                                                await markMessageAsRead(msg.id);
                                                fetchMessages();
                                            }}
                                            className="text-[9px] font-mono text-neon hover:underline"
                                        >
                                            MARQUER_LU
                                        </button>
                                    )}
                                </div>
                                <p className="text-foreground/80 text-sm leading-relaxed bg-black/20 p-4 border border-white/5 font-mono">
                                    {msg.content}
                                </p>
                            </div>
                        ))}

                        {messages.length === 0 && (
                            <div className="p-20 text-center border border-dashed border-neon/20">
                                <p className="text-[10px] uppercase font-mono text-neon/40 italic">Aucun message reçu dans le canal sécurisé.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
