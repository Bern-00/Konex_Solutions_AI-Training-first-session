'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, ExternalLink, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { saveActivityProgress, getActivityProgress } from '@/lib/progress';

interface PromptEngineeringModuleProps {
    userId: string;
    onBack: () => void;
    onComplete: () => void;
}

export default function PromptEngineeringModule({ userId, onBack, onComplete }: PromptEngineeringModuleProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const [responses, setResponses] = useState({
        activity1: '',
        activity2: '',
        activity3_1: '',
        activity3_2: '',
        activity4_1: '',
        activity4_1: '',
        activity4_2: '',
        quiz: {
            part1_A: '',
            part1_B: '',
            part2_q1: '',
            part2_q2: '',
            part2_q3: '',
            part2_q4: '',
            part2_q5: '',
            part3_p1: '',
            part3_p2: '',
            part3_p3: '',
            status: 'pending', // pending, submitted, passed, failed
            submittedAt: null as string | null
        }
    });
    const [activity2Validated, setActivity2Validated] = useState(false);
    const [showActivity4Note, setShowActivity4Note] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<string>('idle'); // idle, saving, saved, error
    const [lastSaveTime, setLastSaveTime] = useState<string | null>(null);

    // AUTOSAVE EFFECT
    useEffect(() => {
        if (isInitialLoading || !userId) return;

        const timer = setTimeout(async () => {
            setSaveStatus('Autosaving...');
            try {
                // Utiliser module_id 2 toujours
                await saveActivityProgress(userId, 2, 11, currentStep, responses);
                setSaveStatus('Saved (Auto)');
                setLastSaveTime(new Date().toLocaleTimeString());
            } catch (err: any) {
                console.error("Autosave error:", err);
                setSaveStatus('Autosave Error');
            }
        }, 2000); // 2 secondes de délai

        return () => clearTimeout(timer);
    }, [responses, userId]); // Ne pas inclure currentStep pour éviter double save avec handleNext

    useEffect(() => {
        if (userId) {
            console.log("PromptEngineeringModule: Initializing for user", userId);
            loadSavedProgress();
        }
    }, [userId]);

    const loadSavedProgress = async () => {
        if (!userId) {
            setSaveStatus('Error: No User ID');
            return;
        }
        setIsInitialLoading(true);
        setSaveStatus('Loading data...');
        console.log("PromptEngineeringModule: Loading progress for chapter 11...");
        try {
            const savedData = await getActivityProgress(userId, 11);
            console.log("PromptEngineeringModule: Received savedData:", savedData);
            if (savedData) {
                if (savedData.step) {
                    console.log("PromptEngineeringModule: Restoring step", savedData.step);
                    setCurrentStep(savedData.step);
                }
                if (savedData.responses) {
                    console.log("PromptEngineeringModule: Restoring responses", Object.keys(savedData.responses).length);
                    setResponses(prev => ({ ...prev, ...savedData.responses }));
                    if (savedData.responses.activity2?.toLowerCase().includes('glacial')) {
                        setActivity2Validated(true);
                    }
                }
                setSaveStatus('Data Loaded');
            } else {
                setSaveStatus('No saved data found');
            }
        } catch (err: any) {
            console.error("Error loading progress:", err);
            setSaveStatus(`Load Error: ${err.message || 'Unknown'}`);
        } finally {
            setIsInitialLoading(false);
        }
    };

    const handleNext = async () => {
        const nextStep = currentStep + 1;

        // Sauvegarder systématiquement la progression
        try {
            setSaveStatus('Saving...');
            console.log(`PromptEngineeringModule: Saving progress - Step ${currentStep === 5 ? currentStep : nextStep}, Responses:`, responses);
            const result = await saveActivityProgress(userId, 2, 11, currentStep === 5 ? currentStep : nextStep, responses);
            console.log("PromptEngineeringModule: Save result:", result);
            setSaveStatus('Saved');
            setLastSaveTime(new Date().toLocaleTimeString());
        } catch (err: any) {
            console.error("Erreur lors de la sauvegarde de la progression:", err);
            setSaveStatus(`Save Error: ${err.message || 'Unknown'}`);
        }

        if (currentStep < 5) {
            setCurrentStep(nextStep);
        } else {
            // Marquer comme complété (déjà géré par saveActivityProgress avec step 5 si on veut, 
            // mais on garde l'appel explicite pour la clarté de l'upsert 'completed')
            const supabase = createClient();
            await supabase.from('user_progress').upsert({
                user_id: userId,
                chapter_id: 11,
                module_id: 2,
                completed: true,
                completed_at: new Date().toISOString()
            }, { onConflict: 'user_id,chapter_id' });

            onComplete();
        }
    };

    const handleActivity2Change = (val: string) => {
        setResponses({ ...responses, activity2: val });
        if (val.toLowerCase().includes('glacial')) {
            setActivity2Validated(true);
        } else {
            setActivity2Validated(false);
        }
    };

    const isStepComplete = () => {
        switch (currentStep) {
            case 1: return responses.activity1.length > 10;
            case 2: return activity2Validated;
            case 3: return responses.activity3_1.length > 5 && responses.activity3_2.length > 5;
            case 4: return responses.activity4_1.length > 10 && responses.activity4_2.length > 10;
            default: return true;
        }
    };

    if (isInitialLoading) {
        return <div className="text-neon font-mono text-center p-20 animate-pulse">SYNCHRONISATION_PROGRESSION...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto pb-20 font-mono">
            <div className="flex justify-between items-center mb-4">
                <button onClick={onBack} className="flex items-center gap-2 text-neon text-xs uppercase tracking-widest hover:opacity-100 opacity-60 transition-opacity cursor-pointer">
                    Back_to_grid
                </button>
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div
                            key={i}
                            className={`h-1 w-8 transition-all duration-500 ${i <= currentStep ? 'bg-neon shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-neon/10'}`}
                        />
                    ))}
                </div>
            </div>

            <div className="border border-neon/30 p-10 relative backdrop-blur-xl bg-card-bg shadow-lg">
                <div className="absolute top-4 right-6 text-neon opacity-10 text-4xl font-black italic select-none">
                    ACTIVITY_0{currentStep}
                </div>

                {/* DEBUG STATUS INDICATOR */}
                <div className="absolute top-2 right-2 flex flex-col items-end pointer-events-none">
                    <div className={`text-[10px] font-mono px-2 py-1 rounded border ${saveStatus === 'Saved' ? 'bg-green-500/20 text-green-500 border-green-500/30' :
                        saveStatus.includes('Error') ? 'bg-red-500/20 text-red-500 border-red-500/30' :
                            'bg-neon/10 text-neon border-neon/20'
                        }`}>
                        STATUS: {saveStatus.toUpperCase()}
                        {lastSaveTime && <span className="opacity-50 ml-2">({lastSaveTime})</span>}
                    </div>
                </div>

                {currentStep === 1 && (
                    <div className="space-y-6">
                        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-3">
                            <span className="text-neon">01</span> System Prompt vs User Prompt
                        </h2>

                        <div className="bg-neon/5 border-l-4 border-neon p-6 space-y-4">
                            <p className="text-foreground/80 text-sm leading-relaxed">
                                Dans cette activité, vous allez expérimenter la création d'un <span className="text-neon font-bold text-lg">Gems</span> personnalisé sur Gemini.
                            </p>
                            <a
                                href="https://gemini.google.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 bg-neon text-background px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all"
                            >
                                Ouvrir Gemini <ExternalLink size={14} />
                            </a>
                        </div>

                        <div className="space-y-4 text-sm text-foreground/70">
                            <p className="font-bold text-neon uppercase text-xs">Instructions pour votre Gems :</p>
                            <ul className="list-disc list-inside space-y-2 ml-2">
                                <li><span className="text-foreground font-bold">Nom :</span> Un nom de votre choix</li>
                                <li><span className="text-foreground font-bold">Description :</span> Assistant utile tri-lingual French, Haitian-Creole, English. Expert en Prompt engineering.</li>
                                <li><span className="text-foreground font-bold">Instructions :</span>
                                    <div className="mt-2 p-4 bg-foreground/5 border border-foreground/10 text-xs italic">
                                        "Tu es un assistant sarcastique qui fait des blagues dans chaque réponse.
                                        Assistant utile tri-lingual French, Haitian-Creole, English.
                                        Capable de repondre à n'importe quel question concernant le prompt engineering, en y affichant ta parfaite maitrise des trois langues et donner des exemples concret à l'appui en affichnat un niveau expert de prompt mastery qui propose des prompts assez interessant pour pousser les LLMs a leur niveau de rendement maximale selon l'utilisateur."
                                    </div>
                                </li>
                            </ul>
                        </div>

                        <div className="space-y-4 pt-6 border-t border-foreground/10">
                            <p className="text-sm font-bold text-neon">CAS PRATIQUE :</p>
                            <p className="text-xs text-foreground/60 italic">Posez la question suivante à votre Gems et collez la réponse ici :</p>
                            <div className="p-3 bg-neon/10 border border-neon/20 text-neon text-xs">
                                "Que veut dire un prompt a temperature basse et y'en a t'il d'autres types dans cette categorie?"
                            </div>
                            <textarea
                                value={responses.activity1}
                                onChange={(e) => setResponses({ ...responses, activity1: e.target.value })}
                                placeholder="Collez la réponse du modèle ici..."
                                className="w-full h-40 bg-background border border-foreground/10 p-4 text-xs text-foreground focus:border-neon outline-none transition-all"
                            />
                        </div>
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="space-y-6">
                        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-3">
                            <span className="text-neon">02</span> Few Shot Prompting
                        </h2>

                        <div className="space-y-4">
                            <p className="text-foreground/80 text-sm leading-relaxed">
                                Le "Few Shot Prompting" consiste à donner quelques exemples au modèle pour qu'il comprenne le pattern de réponse attendu.
                            </p>
                            <div className="p-6 bg-foreground/5 border border-foreground/10 space-y-2">
                                <p className="text-xs text-foreground/50 uppercase font-bold tracking-widest">Le Prompt :</p>
                                <pre className="text-neon text-sm font-bold">
                                    Grand -{">"} Geant{"\n"}
                                    Petit -{">"} Minuscule{"\n"}
                                    Chaud -{">"} Brûlant{"\n"}
                                    Froid -{">"}
                                </pre>
                            </div>
                        </div>

                        <div className="space-y-4 pt-6">
                            <p className="text-xs text-foreground/60">Quelle a été la réponse du modèle ?</p>
                            <input
                                type="text"
                                value={responses.activity2}
                                onChange={(e) => handleActivity2Change(e.target.value)}
                                placeholder="Entrez la réponse ici..."
                                className="w-full bg-background border border-foreground/10 p-4 text-sm text-foreground focus:border-neon outline-none transition-all"
                            />

                            {activity2Validated && (
                                <div className="flex items-center gap-3 p-4 bg-neon/10 border border-neon/30 text-neon text-xs animate-in fade-in slide-in-from-top-2">
                                    <CheckCircle2 size={16} />
                                    <p>En effet Il a compris qu'on veut des synonymes extrêmes sans qu'on lui ait dit.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {currentStep === 3 && (
                    <div className="space-y-6">
                        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-3">
                            <span className="text-neon">03</span> Chain of Thought (CoT)
                        </h2>

                        <p className="text-foreground/80 text-sm leading-relaxed">
                            Comparez les réponses du modèle entre un prompt direct et un prompt incitant à la réflexion étape par étape.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="p-4 bg-foreground/5 border border-foreground/10 min-h-[100px]">
                                    <p className="text-[10px] text-neon uppercase mb-2">Prompt 1 (Direct)</p>
                                    <p className="text-xs">"J'ai 3 pommes, j'en mange 1, j'en achète 5. Combien ? Concis et directe."</p>
                                </div>
                                <textarea
                                    value={responses.activity3_1}
                                    onChange={(e) => setResponses({ ...responses, activity3_1: e.target.value })}
                                    placeholder="Réponse du modèle (Prompt 1)..."
                                    className="w-full h-32 bg-background border border-foreground/10 p-4 text-xs text-foreground focus:border-neon outline-none"
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 bg-foreground/5 border border-foreground/10 min-h-[100px]">
                                    <p className="text-[10px] text-neon uppercase mb-2">Prompt 2 (CoT)</p>
                                    <p className="text-xs">"J'ai 3 pommes, j'en mange 1, j'en achète 5. Combien ? Réfléchissons étape par étape."</p>
                                </div>
                                <textarea
                                    value={responses.activity3_2}
                                    onChange={(e) => setResponses({ ...responses, activity3_2: e.target.value })}
                                    placeholder="Réponse du modèle (Prompt 2)..."
                                    className="w-full h-32 bg-background border border-foreground/10 p-4 text-xs text-foreground focus:border-neon outline-none"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 4 && (
                    <div className="space-y-6">
                        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-3">
                            <span className="text-neon">04</span> Security: Injection & Jailbreaking
                        </h2>

                        <p className="text-foreground/80 text-sm leading-relaxed">
                            Testez des exemples de détournement de prompt (Prompt Injection) et de contournement des sécurités (Jailbreaking).
                        </p>

                        <div className="space-y-8">
                            <div className="space-y-4">
                                <label className="text-xs font-bold text-neon uppercase tracking-widest">Exemple de Prompt Injection :</label>
                                <textarea
                                    value={responses.activity4_1}
                                    onChange={(e) => setResponses({ ...responses, activity4_1: e.target.value })}
                                    placeholder="Collez la réponse du modèle (Gemini) pour une injection de prompt..."
                                    className="w-full h-32 bg-background border border-foreground/10 p-4 text-xs text-foreground focus:border-neon outline-none"
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="text-xs font-bold text-neon uppercase tracking-widest">Exemple de Jailbreaking :</label>
                                <textarea
                                    value={responses.activity4_2}
                                    onChange={(e) => setResponses({ ...responses, activity4_2: e.target.value })}
                                    placeholder="Collez la réponse du modèle (Gemini) pour un jailbreaking..."
                                    className="w-full h-32 bg-background border border-foreground/10 p-4 text-xs text-foreground focus:border-neon outline-none"
                                />
                            </div>
                        </div>

                        {showActivity4Note && (
                            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-xs flex gap-3 items-center animate-in fade-in slide-in-from-bottom-2">
                                <Info size={16} />
                                <p>Ask your trainer about a canned responses</p>
                            </div>
                        )}
                    </div>
                )}

                {currentStep === 5 && (
                    <div className="space-y-10 py-10">
                        {/* VIEW: RESULTAT DU QUIZ (SI CORRIGÉ) */}
                        {responses.quiz?.status === 'passed' && (
                            <div className="p-10 border border-green-500/30 bg-green-500/5 text-center animate-in zoom-in duration-500">
                                <h3 className="text-4xl font-black uppercase italic text-green-500 mb-4 tracking-tighter">
                                    CONGRATULATIONS_AGENT
                                </h3>
                                <p className="text-foreground/80 text-sm mb-8 max-w-lg mx-auto">
                                    L'administrateur a validé votre examen final. Vous avez démontré une maîtrise exceptionnelle du Prompt Engineering.
                                </p>
                                <div className="text-6xl mb-8">🎓</div>
                                <button
                                    onClick={onComplete}
                                    className="bg-green-500 text-background px-12 py-4 font-black uppercase text-xs tracking-[0.3em] hover:scale-105 transition-all shadow-[0_0_30px_rgba(34,197,94,0.3)]"
                                >
                                    Retourner au Dashboard
                                </button>
                            </div>
                        )}

                        {responses.quiz?.status === 'failed' && (
                            <div className="p-10 border border-red-500/30 bg-red-500/5 text-center animate-in zoom-in duration-500">
                                <h3 className="text-4xl font-black uppercase italic text-red-500 mb-4 tracking-tighter">
                                    MISSION_FAILED
                                </h3>
                                <p className="text-foreground/80 text-sm mb-8 max-w-lg mx-auto">
                                    "Oops, nice try il va falloir faire plus d'effort..."
                                </p>
                                <div className="text-left max-w-2xl mx-auto bg-black/40 p-6 border border-white/5 mb-8 text-xs space-y-4">
                                    <h4 className="text-neon font-bold uppercase border-b border-white/10 pb-2 mb-4">CORRECTIF & EXPLICATION</h4>

                                    <div className="space-y-2">
                                        <p className="font-bold text-red-400">Q1 : C</p>
                                        <p className="text-foreground/60">Le rôle imposé (System Prompt) influence directement le ton, le vocabulaire et la posture.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="font-bold text-red-400">Q2 : C</p>
                                        <p className="text-foreground/60">Le Chain-of-Thought externalise les étapes intermédiaires du raisonnement.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="font-bold text-red-400">Q3 : B</p>
                                        <p className="text-foreground/60">Le prompt injection vise à faire ignorer ou contourner les règles initiales.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="font-bold text-red-400">Questions Ouvertes</p>
                                        <p className="text-foreground/60">Pour Q4, il fallait mentionner l'importance du contexte et des contraintes. Pour Q5, l'hallucination vient souvent d'un manque de contexte, pas juste de l'entraînement.</p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        // Reset quiz status to retry? Or just locked fail? 
                                        // User implied they can just see the result. "il verra vous avez reussi ... ou fail"
                                        // "les explications seront envoyer seulemtn a ceu qui ont fail"
                                        // Let's allow them to just go back.
                                        onBack();
                                    }}
                                    className="bg-red-500/10 text-red-500 border border-red-500/50 px-12 py-4 font-black uppercase text-xs tracking-[0.3em] hover:bg-red-500 hover:text-white transition-all"
                                >
                                    Fermer
                                </button>
                            </div>
                        )}

                        {responses.quiz?.status === 'submitted' && (
                            <div className="p-10 border border-neon/30 bg-neon/5 text-center">
                                <h3 className="text-3xl font-black uppercase italic text-neon mb-4 tracking-tighter">
                                    STATUS: PENDING_REVIEW
                                </h3>
                                <p className="text-foreground/60 text-sm mb-6 max-w-sm mx-auto">
                                    Vos réponses ont été transmises au QG. L'administrateur est en train d'analyser vos performances.
                                </p>
                                <div className="w-16 h-16 border-4 border-neon/30 border-t-neon rounded-full animate-spin mx-auto mb-8" />
                                <p className="text-xs font-mono opacity-40">Veuillez revenir consulter cette page plus tard.</p>
                                <button onClick={onBack} className="mt-8 text-neon text-xs hover:underline">Retour au Dashboard</button>
                            </div>
                        )}

                        {/* UTILS POUR LE FORMULAIRE */}
                        {(!responses.quiz?.status || responses.quiz?.status === 'pending') && (
                            <div className="max-w-3xl mx-auto text-left space-y-12">
                                <div className="text-center mb-10">
                                    <h3 className="text-4xl font-black uppercase italic text-neon tracking-tighter">FINAL_ASSESSMENT</h3>
                                    <p className="text-foreground/50 text-xs font-mono mt-2">MODULE 2: PROMPT ENGINEERING MASTERY</p>
                                </div>

                                {/* PARTIE 1 */}
                                <div className="space-y-6">
                                    <div className="border-l-4 border-neon pl-4">
                                        <h4 className="text-xl font-black uppercase italic text-foreground">PARTIE 1 – Prompts Volontairement Confus</h4>
                                        <p className="text-xs text-foreground/60 mt-1">Analysez la catégorie réelle du prompt.</p>
                                    </div>

                                    <div className="bg-card-bg border border-neon/10 p-6 space-y-4">
                                        <label className="text-xs font-bold text-neon uppercase">Prompt A : Extraction vs Résumé</label>
                                        <p className="text-xs italic text-foreground/70 p-4 bg-black/20 border-l-2 border-neon/50">
                                            "À partir du texte ci-dessous sur la crise énergétique européenne, identifie les trois pays mentionnés, puis explique brièvement leur rôle respectif dans la situation décrite."
                                        </p>
                                        <div className="space-y-2">
                                            <p className="text-[10px] uppercase font-bold text-foreground">Votre Analyse (Type de tâche & Pourquoi) :</p>
                                            <textarea
                                                className="w-full h-24 bg-background border border-foreground/10 p-3 text-xs text-foreground focus:border-neon outline-none"
                                                placeholder="Expliquez pourquoi ce n'est PAS un simple résumé..."
                                                value={responses.quiz?.part1_A || ''}
                                                onChange={(e) => setResponses({ ...responses, quiz: { ...responses.quiz, part1_A: e.target.value, status: 'pending' } })}
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-card-bg border border-neon/10 p-6 space-y-4">
                                        <label className="text-xs font-bold text-neon uppercase">Prompt B : Classification vs Sentiment</label>
                                        <p className="text-xs italic text-foreground/70 p-4 bg-black/20 border-l-2 border-neon/50">
                                            "Lis le passage suivant et indique si le ton général est alarmiste, neutre ou optimiste, en citant une phrase précise du texte pour justifier ton choix."
                                        </p>
                                        <div className="space-y-2">
                                            <p className="text-[10px] uppercase font-bold text-foreground">Votre Analyse :</p>
                                            <textarea
                                                className="w-full h-24 bg-background border border-foreground/10 p-3 text-xs text-foreground focus:border-neon outline-none"
                                                placeholder="Expliquez la nuance..."
                                                value={responses.quiz?.part1_B || ''}
                                                onChange={(e) => setResponses({ ...responses, quiz: { ...responses.quiz, part1_B: e.target.value, status: 'pending' } })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* PARTIE 2 */}
                                <div className="space-y-6">
                                    <div className="border-l-4 border-neon pl-4">
                                        <h4 className="text-xl font-black uppercase italic text-foreground">PARTIE 2 – Compréhension (QCM & Ouvertes)</h4>
                                    </div>

                                    {/* Q1 */}
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold">Q1. "Agis comme un professeur strict..." Quel élément influence le style ?</p>
                                        <select
                                            className="w-full bg-background border border-foreground/10 p-3 text-xs text-foreground focus:border-neon outline-none cursor-pointer"
                                            value={responses.quiz?.part2_q1 || ''}
                                            onChange={(e) => setResponses({ ...responses, quiz: { ...responses.quiz, part2_q1: e.target.value, status: 'pending' } })}
                                        >
                                            <option value="">Sélectionner une réponse</option>
                                            <option value="A">A. L’input data</option>
                                            <option value="B">B. Le format de sortie</option>
                                            <option value="C">C. Le System Prompt implicite</option>
                                            <option value="D">D. La température uniquement</option>
                                        </select>
                                    </div>

                                    {/* Q2 */}
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold">Q2. Pourquoi le Chain-of-Thought améliore la fiabilité ?</p>
                                        <select
                                            className="w-full bg-background border border-foreground/10 p-3 text-xs text-foreground focus:border-neon outline-none cursor-pointer"
                                            value={responses.quiz?.part2_q2 || ''}
                                            onChange={(e) => setResponses({ ...responses, quiz: { ...responses.quiz, part2_q2: e.target.value, status: 'pending' } })}
                                        >
                                            <option value="">Sélectionner une réponse</option>
                                            <option value="A">A. Augmente les tokens</option>
                                            <option value="B">B. Révèle les poids internes</option>
                                            <option value="C">C. Externalise les étapes du raisonnement</option>
                                            <option value="D">D. Empêche l'hallucination</option>
                                        </select>
                                    </div>

                                    {/* Q3 */}
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold">Q3. Quel risque est lié au prompt injection ?</p>
                                        <select
                                            className="w-full bg-background border border-foreground/10 p-3 text-xs text-foreground focus:border-neon outline-none cursor-pointer"
                                            value={responses.quiz?.part2_q3 || ''}
                                            onChange={(e) => setResponses({ ...responses, quiz: { ...responses.quiz, part2_q3: e.target.value, status: 'pending' } })}
                                        >
                                            <option value="">Sélectionner une réponse</option>
                                            <option value="A">A. Perte de créativité</option>
                                            <option value="B">B. Contournement des règles du System Prompt</option>
                                            <option value="C">C. Coût en tokens</option>
                                            <option value="D">D. Baisse de performance</option>
                                        </select>
                                    </div>

                                    {/* Q4 */}
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold">Q4. Pourquoi deux prompts identiques peuvent donner des réponses différentes ?</p>
                                        <textarea
                                            className="w-full h-20 bg-background border border-foreground/10 p-3 text-xs text-foreground focus:border-neon outline-none"
                                            value={responses.quiz?.part2_q4 || ''}
                                            onChange={(e) => setResponses({ ...responses, quiz: { ...responses.quiz, part2_q4: e.target.value, status: 'pending' } })}
                                        />
                                    </div>

                                    {/* Q5 */}
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold">Q5. "Si le modèle hallucine, c’est qu’il est mal entraîné." Pourquoi est-ce incomplet ?</p>
                                        <textarea
                                            className="w-full h-20 bg-background border border-foreground/10 p-3 text-xs text-foreground focus:border-neon outline-none"
                                            value={responses.quiz?.part2_q5 || ''}
                                            onChange={(e) => setResponses({ ...responses, quiz: { ...responses.quiz, part2_q5: e.target.value, status: 'pending' } })}
                                        />
                                    </div>
                                </div>

                                {/* PARTIE 3 */}
                                <div className="space-y-6">
                                    <div className="border-l-4 border-neon pl-4">
                                        <h4 className="text-xl font-black uppercase italic text-foreground">PARTIE 3 – Production de Prompts</h4>
                                        <p className="text-xs text-foreground/60 mt-1">Rédigez 3 prompts avec 3 à 5 contraintes explicites chacun.</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-neon uppercase">Prompt 1 : Brainstorming</label>
                                            <p className="text-[10px] opacity-60">Requis: Rôle explicite, Limite quantitative, Angle/Critère.</p>
                                            <textarea
                                                className="w-full h-24 bg-background border border-foreground/10 p-3 text-xs text-foreground focus:border-neon outline-none"
                                                value={responses.quiz?.part3_p1 || ''}
                                                onChange={(e) => setResponses({ ...responses, quiz: { ...responses.quiz, part3_p1: e.target.value, status: 'pending' } })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-neon uppercase">Prompt 2 : Creative Writing</label>
                                            <p className="text-[10px] opacity-60">Requis: Style/Tonalité, Contrainte narrative, Limite de longueur.</p>
                                            <textarea
                                                className="w-full h-24 bg-background border border-foreground/10 p-3 text-xs text-foreground focus:border-neon outline-none"
                                                value={responses.quiz?.part3_p2 || ''}
                                                onChange={(e) => setResponses({ ...responses, quiz: { ...responses.quiz, part3_p2: e.target.value, status: 'pending' } })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-neon uppercase">Prompt 3 : Open Question</label>
                                            <p className="text-[10px] opacity-60">Requis: Pas de sources externes, Raisonnement structuré, Position nuancée.</p>
                                            <textarea
                                                className="w-full h-24 bg-background border border-foreground/10 p-3 text-xs text-foreground focus:border-neon outline-none"
                                                value={responses.quiz?.part3_p3 || ''}
                                                onChange={(e) => setResponses({ ...responses, quiz: { ...responses.quiz, part3_p3: e.target.value, status: 'pending' } })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-10 flex justify-center">
                                    <button
                                        onClick={async () => {
                                            if (confirm("Êtes-vous sûr de vouloir soumettre votre examen final ? Vous ne pourrez plus le modifier.")) {
                                                const finalResponses = {
                                                    ...responses,
                                                    quiz: {
                                                        ...responses.quiz,
                                                        status: 'submitted',
                                                        submittedAt: new Date().toISOString()
                                                    }
                                                };
                                                setResponses(finalResponses); // UI optimistic update
                                                try {
                                                    await saveActivityProgress(userId, 2, 11, 5, finalResponses);
                                                    setSaveStatus('Quiz Submitted');
                                                } catch (e) {
                                                    alert("Erreur lors de la soumission. Veuillez réessayer.");
                                                    console.error(e);
                                                }
                                            }
                                        }}
                                        className="bg-neon text-background px-16 py-4 font-black uppercase text-sm tracking-widest hover:scale-105 transition-all shadow-[0_0_40px_rgba(34,197,94,0.4)]"
                                    >
                                        Soumettre l'Examen
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {currentStep < 5 && (
                    <div className="flex justify-end mt-12 pt-8 border-t border-foreground/10">
                        <button
                            onClick={() => {
                                if (currentStep === 4 && !showActivity4Note) {
                                    setShowActivity4Note(true);
                                    return;
                                }
                                if (isStepComplete()) handleNext();
                            }}
                            disabled={!isStepComplete()}
                            className={`
                                flex items-center gap-2 px-10 py-4 font-black uppercase text-[10px] tracking-widest transition-all
                                ${isStepComplete()
                                    ? 'bg-neon text-background hover:scale-105 shadow-[0_0_20px_rgba(34,197,94,0.2)] cursor-pointer'
                                    : 'bg-foreground/5 text-foreground/20 cursor-not-allowed'}
                            `}
                        >
                            Prochaine Activité <ChevronRight size={14} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
