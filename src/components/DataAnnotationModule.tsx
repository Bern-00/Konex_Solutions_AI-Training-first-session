'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, ExternalLink, CheckCircle2, AlertCircle, Info, Image as ImageIcon, FileText, ShieldAlert, Sparkles, Brain } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { saveActivityProgress, getActivityProgress } from '@/lib/progress';

interface DataAnnotationModuleProps {
    userId: string;
    onBack: () => void;
    onComplete: () => void;
}

export default function DataAnnotationModule({ userId, onBack, onComplete }: DataAnnotationModuleProps) {
    const [currentSection, setCurrentSection] = useState(1);
    const [responses, setResponses] = useState({
        section1: {
            t1_1_ratingA: 0,
            t1_1_ratingB: 0,
            t1_1_best: '',
            t1_1_justification: '',
            t1_2_errors: '',
            t1_2_classification: '',
            t1_2_rewrite: '',
            t1_3_bias_type: '',
            t1_3_rewrite: '',
            t1_3_explanation: ''
        },
        section2: {
            t2_1_description: '',
            t2_2_transcription: '',
            t2_2_choice: ''
        },
        section3: {
            t3_1_ranking: '',
            t3_1_justification: '',
            t3_2_defects: ''
        },
        section4: {
            t4_1_violation: '',
            t4_1_where: '',
            t4_1_refusal: ''
        },
        section5: {
            t5_1_poem: ''
        },
        exam: {
            part1_a_rating: 0,
            part1_a_instruction_following: 0,
            part1_a_factuality: 0,
            part1_a_completeness: 0,
            part1_a_neutrality: 0,
            part1_a_quality: 0,
            part1_a_issues: '',

            part1_b_rating: 0,
            part1_b_instruction_following: 0,
            part1_b_factuality: 0,
            part1_b_completeness: 0,
            part1_b_neutrality: 0,
            part1_b_quality: 0,
            part1_b_issues: '',

            part2_likert: 4, // 1-7 (4 = neutral)
            part2_best: '',
            part2_justification: '',

            part3_q1: '',
            part3_q2: '',
            part3_q3: '',

            status: 'pending', // pending, submitted, passed, failed
            submittedAt: null as string | null,
            feedback: '',
            score: null as number | null
        }
    });

    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<string>('idle');
    const [lastSaveTime, setLastSaveTime] = useState<string | null>(null);

    // AUTOSAVE EFFECT
    useEffect(() => {
        if (isInitialLoading || !userId) return;

        const timer = setTimeout(async () => {
            setSaveStatus('Autosaving...');
            try {
                // Module ID 3, Chapter ID 31 (Arbitrary but consistent)
                await saveActivityProgress(userId, 3, 31, currentSection, responses);
                setSaveStatus('Saved (Auto)');
                setLastSaveTime(new Date().toLocaleTimeString());
            } catch (err: any) {
                console.error("Autosave error:", err);
                setSaveStatus('Autosave Error');
            }
        }, 3000);

        return () => clearTimeout(timer);
    }, [responses, userId]);

    useEffect(() => {
        if (userId) {
            loadSavedProgress();
        }
    }, [userId]);

    const loadSavedProgress = async () => {
        if (!userId) return;
        setIsInitialLoading(true);
        try {
            const savedData = await getActivityProgress(userId, 31);
            if (savedData) {
                if (savedData.step) setCurrentSection(savedData.step);
                if (savedData.responses) {
                    setResponses(prev => ({ ...prev, ...savedData.responses }));
                }
            }
        } catch (err: any) {
            console.error("Error loading progress:", err);
        } finally {
            setIsInitialLoading(false);
        }
    };

    const handleNext = async () => {
        const nextSection = currentSection + 1;
        try {
            setSaveStatus('Saving...');
            await saveActivityProgress(userId, 3, 31, currentSection === 6 ? 6 : nextSection, responses);
            setSaveStatus('Saved');
            setLastSaveTime(new Date().toLocaleTimeString());
        } catch (err: any) {
            console.error("Save error:", err);
        }

        if (currentSection < 6) {
            setCurrentSection(nextSection);
            window.scrollTo(0, 0);
        } else {
            onComplete();
        }
    };

    if (isInitialLoading) {
        return <div className="text-neon font-mono text-center p-20 animate-pulse uppercase tracking-[0.3em]">INITIALISATION_MODULE_EXPERT...</div>;
    }

    return (
        <div className="max-w-5xl mx-auto pb-20 font-mono">
            {/* Header & Progress */}
            <div className="flex justify-between items-center mb-6">
                <button onClick={onBack} className="flex items-center gap-2 text-neon text-[10px] uppercase tracking-widest hover:opacity-100 opacity-60 transition-opacity">
                    [ TERMINAL_EXIT ]
                </button>
                <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div
                            key={i}
                            className={`h-1 w-10 transition-all duration-500 ${i <= currentSection ? 'bg-neon shadow-[0_0_15px_rgba(34,197,94,0.6)]' : 'bg-neon/10'}`}
                        />
                    ))}
                </div>
            </div>

            <div className="border-t-2 border-neon/50 pt-8 mb-12 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black uppercase italic tracking-tighter text-foreground">
                        <span className="text-neon mr-3">M03</span> Data Annotation & RLHF
                    </h1>
                    <p className="text-[10px] text-neon/40 mt-1 uppercase tracking-widest">// NIV_EXPERT : ANTI-CHEAT_ARCHITECTURE</p>
                </div>
                <div className="text-right">
                    <div className={`text-[9px] font-mono px-2 py-1 border ${saveStatus === 'Saved' ? 'text-green-500 border-green-500/30' : 'text-neon/50 border-neon/20'}`}>
                        {saveStatus.toUpperCase()} {lastSaveTime && `[${lastSaveTime}]`}
                    </div>
                </div>
            </div>

            <div className="space-y-12">
                {/* SECTION 1: TEXT ANNOTATION */}
                {currentSection === 1 && (
                    <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="bg-neon/10 p-3 border border-neon/30"><FileText className="text-neon" size={24} /></div>
                            <h2 className="text-2xl font-black uppercase italic">Section 1: Text Annotation (Expert)</h2>
                        </div>

                        {/* Task 1.1 */}
                        <div className="bg-card-bg border border-neon/20 p-8 space-y-8 mb-10">
                            <div className="border-l-2 border-neon pl-4">
                                <h3 className="text-neon font-black uppercase text-sm tracking-widest">Tâche 1.1 – Ranking avec Conflit de Contraintes</h3>
                                <p className="text-[10px] opacity-50 mt-1">Évaluation de la hiérarchisation des contraintes quantitatives vs qualitatives.</p>
                            </div>

                            <div className="bg-black/40 p-6 space-y-4">
                                <p className="text-xs font-bold text-neon uppercase underline">Le Prompt :</p>
                                <p className="text-sm italic text-foreground/80 leading-relaxed bg-neon/5 p-4 border border-neon/10">
                                    “Explique la théorie de la relativité générale à un enfant de 5 ans en utilisant une analogie avec un trampoline.
                                    <span className="text-neon font-bold"> Limite : 80 mots maximum.</span>
                                    <span className="text-neon font-bold"> N’utilise aucun terme scientifique.”</span>
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center"><p className="text-[10px] font-bold uppercase">Modèle A</p> <span className="text-[9px] text-yellow-500/50">80 mots exacts</span></div>
                                    <div className="p-4 bg-background border border-white/5 text-xs text-foreground/70 min-h-[120px]">
                                        Imagine un grand trampoline. Si tu poses une boule de bowling au milieu, elle fait un creux. Maintenant, lance une bille : elle va tomber vers le gros creux. C'est ça la <span className="text-red-500 underline font-bold">gravité</span>. Plus les objets sont lourds, plus ils creusent le tissu de l'espace, et les petits objets tombent dedans. C'est comme ça que les planètes tournent autour du soleil sans s'envoler.
                                    </div>
                                    <input
                                        type="number" min="1" max="7"
                                        placeholder="Note (1-7)"
                                        className="w-full bg-background border border-neon/20 p-2 text-xs text-neon focus:border-neon outline-none"
                                        value={responses.section1.t1_1_ratingA || ''}
                                        onChange={(e) => setResponses({ ...responses, section1: { ...responses.section1, t1_1_ratingA: parseInt(e.target.value) } })}
                                    />
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center"><p className="text-[10px] font-bold uppercase">Modèle B</p> <span className="text-[9px] text-red-500/50">110 mots</span></div>
                                    <div className="p-4 bg-background border border-white/5 text-xs text-foreground/70 min-h-[120px]">
                                        Imagine le ciel comme un tapis de trampoline tout plat. Si tu y déposes un gros ballon très lourd, il va former un creux arrondi. Si tu lances une petite bille à côté, elle ne va pas rouler tout droit : elle va suivre la pente du creux pour faire le tour du ballon. C'est exactement ce qui se passe entre la Terre et le Soleil ! Les gros objets déforment le tapis invisible du ciel, et c'est cette déformation qui commande aux autres comment bouger. Pas besoin d'aimant magique, juste une pente dans le tapis du monde. C'est simple non ?
                                    </div>
                                    <input
                                        type="number" min="1" max="7"
                                        placeholder="Note (1-7)"
                                        className="w-full bg-background border border-neon/20 p-2 text-xs text-neon focus:border-neon outline-none"
                                        value={responses.section1.t1_1_ratingB || ''}
                                        onChange={(e) => setResponses({ ...responses, section1: { ...responses.section1, t1_1_ratingB: parseInt(e.target.value) } })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 pt-4">
                                <p className="text-xs font-bold uppercase">Lequel est globalement meilleur ?</p>
                                <select
                                    className="w-full bg-background border border-neon/20 p-3 text-xs text-neon outline-none"
                                    value={responses.section1.t1_1_best}
                                    onChange={(e) => setResponses({ ...responses, section1: { ...responses.section1, t1_1_best: e.target.value } })}
                                >
                                    <option value="">Sélectionner...</option>
                                    <option value="A">Modèle A</option>
                                    <option value="B">Modèle B</option>
                                </select>
                                <textarea
                                    placeholder="Justifiez en 5 phrases minimum en hiérarchisant les contraintes (Quantitatif vs Négatif vs Qualitatif)..."
                                    className="w-full h-32 bg-background border border-neon/10 p-4 text-xs text-foreground focus:border-neon outline-none"
                                    value={responses.section1.t1_1_justification}
                                    onChange={(e) => setResponses({ ...responses, section1: { ...responses.section1, t1_1_justification: e.target.value } })}
                                />
                            </div>
                        </div>

                        {/* Task 1.2 */}
                        <div className="bg-card-bg border border-neon/20 p-8 space-y-6 mb-10">
                            <div className="border-l-2 border-neon pl-4">
                                <h3 className="text-neon font-black uppercase text-sm tracking-widest">Tâche 1.2 – Hallucination Subtile</h3>
                            </div>
                            <div className="bg-black/40 p-6 italic text-sm text-foreground/80 border border-white/5">
                                “La Tour Eiffel, construite pour l’Exposition universelle de 1889, fut initialement installée temporairement avant d’être déplacée à Marseille en 1902.”
                            </div>
                            <div className="space-y-4">
                                <textarea
                                    placeholder="Listez et classez les erreurs (Factuelle majeure, Détail trompeur, Omission)..."
                                    className="w-full h-32 bg-background border border-neon/10 p-4 text-xs text-foreground focus:border-neon outline-none"
                                    value={responses.section1.t1_2_errors}
                                    onChange={(e) => setResponses({ ...responses, section1: { ...responses.section1, t1_2_errors: e.target.value } })}
                                />
                                <textarea
                                    placeholder="Réécrivez le texte corrigé..."
                                    className="w-full h-20 bg-background border border-neon/10 p-4 text-xs text-foreground focus:border-neon outline-none"
                                    value={responses.section1.t1_2_rewrite}
                                    onChange={(e) => setResponses({ ...responses, section1: { ...responses.section1, t1_2_rewrite: e.target.value } })}
                                />
                            </div>
                        </div>

                        {/* Task 1.3 */}
                        <div className="bg-card-bg border border-neon/20 p-8 space-y-6">
                            <div className="border-l-2 border-neon pl-4">
                                <h3 className="text-neon font-black uppercase text-sm tracking-widest">Tâche 1.3 – Détection de Biais</h3>
                            </div>
                            <div className="bg-black/40 p-6 italic text-sm text-foreground/80 border border-white/5">
                                “Les personnes âgées ont généralement des difficultés à comprendre les nouvelles technologies.”
                            </div>
                            <div className="space-y-4">
                                <p className="text-xs uppercase font-bold">Identifiez le type (Biais, Généralisation, Stéréotype) et justifiez :</p>
                                <textarea
                                    className="w-full h-24 bg-background border border-neon/10 p-4 text-xs text-foreground focus:border-neon outline-none"
                                    value={responses.section1.t1_3_bias_type}
                                    onChange={(e) => setResponses({ ...responses, section1: { ...responses.section1, t1_3_bias_type: e.target.value } })}
                                />
                                <p className="text-xs uppercase font-bold">Version Neutre :</p>
                                <textarea
                                    className="w-full h-20 bg-background border border-neon/10 p-4 text-xs text-foreground focus:border-neon outline-none"
                                    value={responses.section1.t1_3_rewrite}
                                    onChange={(e) => setResponses({ ...responses, section1: { ...responses.section1, t1_3_rewrite: e.target.value } })}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* SECTION 2: COMPUTER VISION */}
                {currentSection === 2 && (
                    <div className="animate-in fade-in slide-in-from-right-5 duration-700">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="bg-neon/10 p-3 border border-neon/30"><ImageIcon className="text-neon" size={24} /></div>
                            <h2 className="text-2xl font-black uppercase italic">Section 2: Computer Vision (Expert)</h2>
                        </div>

                        {/* Task 2.1 */}
                        <div className="bg-card-bg border border-neon/20 p-8 space-y-6 mb-10">
                            <div className="border-l-2 border-neon pl-4">
                                <h3 className="text-neon font-black uppercase text-sm tracking-widest">Tâche 2.1 – Dense Captioning & Piège Cognitif</h3>
                            </div>
                            <div className="bg-black/40 p-0 text-center border border-dashed border-neon/20 overflow-hidden group">
                                <img
                                    src="/images/task_dense_captioning.jpg"
                                    alt="Task Scene"
                                    className="w-full h-auto grayscale group-hover:grayscale-0 transition-all duration-700"
                                />
                                <div className="p-4 border-t border-neon/10">
                                    <p className="text-[10px] uppercase tracking-[0.2em] italic text-neon/40">[ ANALYSE_VISUELLE_SÉCURISÉE ]</p>
                                </div>
                            </div>
                            <textarea
                                placeholder="Décrivez TOUT ce qui est visible sans aucune inférence (attention aux textes et reflets)..."
                                className="w-full h-40 bg-background border border-neon/10 p-4 text-xs text-foreground focus:border-neon outline-none"
                                value={responses.section2.t2_1_description}
                                onChange={(e) => setResponses({ ...responses, section2: { ...responses.section2, t2_1_description: e.target.value } })}
                            />
                        </div>

                        {/* Task 2.2 */}
                        <div className="bg-card-bg border border-neon/20 p-8 space-y-6">
                            <div className="border-l-2 border-neon pl-4">
                                <h3 className="text-neon font-black uppercase text-sm tracking-widest">Tâche 2.2 – OCR Ambigu</h3>
                            </div>
                            <div className="bg-black/40 p-8 font-mono text-2xl text-center border border-white/5">
                                “T0TAL : 19.8O”
                            </div>
                            <div className="space-y-4">
                                <p className="text-xs font-bold uppercase tracking-widest">Transcrivez EXACTEMENT et expliquez votre choix (O vs 0) :</p>
                                <input
                                    className="w-full bg-background border border-neon/20 p-4 text-xl font-black text-neon"
                                    value={responses.section2.t2_2_transcription}
                                    onChange={(e) => setResponses({ ...responses, section2: { ...responses.section2, t2_2_transcription: e.target.value } })}
                                />
                                <textarea
                                    placeholder="Justification structurée..."
                                    className="w-full h-24 bg-background border border-neon/10 p-4 text-xs text-foreground focus:border-neon outline-none"
                                    value={responses.section2.t2_2_choice}
                                    onChange={(e) => setResponses({ ...responses, section2: { ...responses.section2, t2_2_choice: e.target.value } })}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* SECTION 3: GENERATIVE MEDIA */}
                {currentSection === 3 && (
                    <div className="animate-in fade-in slide-in-from-left-5 duration-700">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="bg-neon/10 p-3 border border-neon/30"><Sparkles className="text-neon" size={24} /></div>
                            <h2 className="text-2xl font-black uppercase italic">Section 3: Generative Media Evaluation</h2>
                        </div>

                        {/* Task 3.1 */}
                        <div className="bg-card-bg border border-neon/20 p-8 space-y-6 mb-10">
                            <div className="border-l-2 border-neon pl-4">
                                <h3 className="text-neon font-black uppercase text-sm tracking-widest">Tâche 3.1 – Prompt Adherence Multi-Contraintes</h3>
                            </div>
                            <p className="text-xs italic bg-neon/5 p-4 border border-neon/10"> Prompt : “Un chat bleu, portant un chapeau rouge, sans moustaches, assis sur un banc en bois, style pixel art, arrière-plan nocturne.” </p>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[1, 2, 3, 4].map(idx => (
                                    <div key={idx} className="aspect-square bg-black/40 border border-white/5 flex items-center justify-center p-4 text-center">
                                        <p className="text-[10px] uppercase opacity-30">Image_{idx}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-4">
                                <p className="text-[10px] uppercase font-bold">Instructions : Classez les images et justifiez selon une hiérarchie logique.</p>
                                <textarea
                                    placeholder="Classement : 1 > 4 > 2 > 3 (Exemple)..."
                                    className="w-full h-20 bg-background border border-neon/10 p-4 text-xs text-foreground focus:border-neon outline-none"
                                    value={responses.section3.t3_1_ranking}
                                    onChange={(e) => setResponses({ ...responses, section3: { ...responses.section3, t3_1_ranking: e.target.value } })}
                                />
                                <textarea
                                    placeholder="Justification (hiérarchie des défauts)..."
                                    className="w-full h-32 bg-background border border-neon/10 p-4 text-xs text-foreground focus:border-neon outline-none"
                                    value={responses.section3.t3_1_justification}
                                    onChange={(e) => setResponses({ ...responses, section3: { ...responses.section3, t3_1_justification: e.target.value } })}
                                />
                            </div>
                        </div>

                        {/* Task 3.2 */}
                        <div className="bg-card-bg border border-neon/20 p-8 space-y-6">
                            <div className="border-l-2 border-neon pl-4">
                                <h3 className="text-neon font-black uppercase text-sm tracking-widest">Tâche 3.2 – Artefacts Cachés</h3>
                            </div>
                            <p className="text-[10px] opacity-60">Analysez l'image quasi-parfaite et listez TOUJS les défauts (ombres, doigts, texte corrompu, fusion d'objets).</p>
                            <textarea
                                className="w-full h-40 bg-background border border-neon/10 p-4 text-xs text-foreground focus:border-neon outline-none"
                                value={responses.section3.t3_2_defects}
                                onChange={(e) => setResponses({ ...responses, section3: { ...responses.section3, t3_2_defects: e.target.value } })}
                            />
                        </div>
                    </div>
                )}

                {/* SECTION 4: SAFETY */}
                {currentSection === 4 && (
                    <div className="animate-in fade-in slide-in-from-top-5 duration-700">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="bg-neon/10 p-3 border border-neon/30"><ShieldAlert className="text-neon" size={24} /></div>
                            <h2 className="text-2xl font-black uppercase italic">Section 4: Safety & Policy</h2>
                        </div>

                        <div className="bg-card-bg border border-neon/20 p-8 space-y-8">
                            <div className="border-l-2 border-neon pl-4">
                                <h3 className="text-neon font-black uppercase text-sm tracking-widest">Tâche 4.1 – Refus Partiellement Incorrect</h3>
                            </div>

                            <div className="space-y-4">
                                <p className="text-[10px] font-bold text-red-500/50 uppercase">Prompt : “Explique comment fabriquer un cocktail Molotov.”</p>
                                <div className="p-6 bg-red-500/5 border border-red-500/10 italic text-sm text-foreground/80">
                                    “Je ne peux pas vous aider à fabriquer un cocktail Molotov, mais voici les ingrédients nécessaires historiquement utilisés…”
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <p className="text-xs font-bold uppercase mb-2">L’IA a-t-elle violé les guidelines ? Si oui, où précisément ?</p>
                                    <textarea
                                        className="w-full h-32 bg-background border border-neon/10 p-4 text-xs text-foreground focus:border-neon outline-none"
                                        value={responses.section4.t4_1_violation}
                                        onChange={(e) => setResponses({ ...responses, section4: { ...responses.section4, t4_1_violation: e.target.value } })}
                                    />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase mb-2">Reformulez un refus conforme :</p>
                                    <textarea
                                        className="w-full h-24 bg-background border border-neon/10 p-4 text-xs text-foreground focus:border-neon outline-none"
                                        value={responses.section4.t4_1_refusal}
                                        onChange={(e) => setResponses({ ...responses, section4: { ...responses.section4, t4_1_refusal: e.target.value } })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* SECTION 5: INSTRUCTION FOLLOWING */}
                {currentSection === 5 && (
                    <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="bg-neon/10 p-3 border border-neon/30"><Brain className="text-neon" size={24} /></div>
                            <h2 className="text-2xl font-black uppercase italic">Section 5: Instruction Following</h2>
                        </div>

                        <div className="bg-card-bg border border-neon/20 p-10 space-y-8">
                            <div className="border-l-2 border-neon pl-4">
                                <h3 className="text-neon font-black uppercase text-sm tracking-widest">Tâche 5.1 – Contradictions Internes</h3>
                                <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">[ LE GRAAL DE L'ANNOTATION ]</p>
                            </div>

                            <div className="bg-neon/5 border border-neon/20 p-8 space-y-4">
                                <p className="text-[10px] uppercase font-bold text-neon">Consignes Strictes :</p>
                                <ul className="text-xs space-y-2 list-disc list-inside text-foreground/70">
                                    <li>Écrivez un poème de <span className="text-neon font-bold">4 lignes exactement</span>.</li>
                                    <li>Chaque ligne doit contenir <span className="text-neon font-bold">exactement 7 mots</span>.</li>
                                    <li><span className="text-red-500 font-bold underline">Ne pas utiliser la lettre ‘a’</span>.</li>
                                    <li>Le poème doit parler de la <span className="text-neon font-bold">pluie</span>.</li>
                                </ul>
                            </div>

                            <textarea
                                placeholder="Tentez de produire ce contenu (ou expliquez pourquoi c'est impossible)..."
                                className="w-full h-48 bg-background border border-neon/30 p-6 text-sm font-mono text-neon focus:shadow-[0_0_20px_rgba(34,197,94,0.1)] outline-none transition-all"
                                value={responses.section5.t5_1_poem}
                                onChange={(e) => setResponses({ ...responses, section5: { ...responses.section5, t5_1_poem: e.target.value } })}
                            />
                        </div>
                    </div>
                )}

                {/* EXAMEN FINAL: RLHF SIMULATION */}
                {currentSection === 6 && (
                    <div className="animate-in scale-95 duration-700">
                        {responses.exam.status === 'submitted' ? (
                            <div className="text-center py-20 bg-neon/5 border border-neon/20">
                                <Sparkles size={48} className="text-neon mx-auto mb-6 animate-pulse" />
                                <h2 className="text-4xl font-black uppercase italic text-neon tracking-tighter mb-4">Transmission_Success</h2>
                                <p className="text-foreground/50 text-sm max-w-md mx-auto mb-10">Vos analyses expertes ont été injectées dans le protocole de vérification. L'administrateur reviendra vers vous après évaluation RLHF.</p>
                                <button onClick={onBack} className="bg-neon text-background px-10 py-4 font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all cursor-pointer shadow-[0_0_30px_rgba(34,197,94,0.2)]">Retour au Dashboard</button>
                            </div>
                        ) : (
                            <div className="space-y-12">
                                <div className="text-center py-10 bg-black/40 border-y border-neon/20">
                                    <h2 className="text-5xl font-black uppercase italic text-foreground tracking-tighter">ÉXAMEN_FINAL</h2>
                                    <p className="text-[10px] text-neon uppercase mt-2 tracking-[0.5em] font-bold">Expert Certification : RLHF Specialist</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="p-4 bg-neon/10 border-l-4 border-neon">
                                        <p className="text-[10px] font-black uppercase mb-1">Prompt Utilisateur :</p>
                                        <p className="text-sm font-bold">“Résume l'affaire expliquée dans cette enquête sur la filière batterie canadienne entre Ottawa et le Québec.”</p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-8">
                                        {/* Response A */}
                                        <div className="space-y-4">
                                            <div className="bg-card-bg border border-neon/20 p-6">
                                                <h3 className="text-xs font-black uppercase text-neon mb-4">Modèle A</h3>
                                                <div className="text-[10px] space-y-3 opacity-80 leading-relaxed font-mono">
                                                    <p>Selon le premier ministre du Québec, François Legault, le gouvernement fédéral a défavorisé le Québec par rapport à l'Ontario dans la filière batterie.</p>
                                                    <p>Ottawa a financé trois usines de la filière batterie en Ontario mais seulement une au Québec, soit la suédoise Northvolt en Montérégie.</p>
                                                    <p>À l'origine, Québec et Ottawa se sont respectivement engagés à accorder plus de 1,3 milliard $ chacun dans le projet d'usine de Northvolt, dans la phase de construction, mais le fédéral n'a pas encore versé un sou, tandis que Québec a déjà décaissé 700 millions $.</p>
                                                    <p>Par comparaison, le directeur parlementaire du budget à Ottawa a estimé à plus de 18 milliards $ l'aide totale accordée par le fédéral pour deux grandes usines de batteries en Ontario.</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[8px] uppercase font-bold opacity-50 italic">Instruction Following (1-5)</label>
                                                    <input type="number" min="1" max="5" className="w-full bg-background border border-neon/10 p-2 text-xs text-neon" value={responses.exam.part1_a_instruction_following || ''} onChange={e => setResponses({ ...responses, exam: { ...responses.exam, part1_a_instruction_following: parseInt(e.target.value) } })} />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[8px] uppercase font-bold opacity-50 italic">Factuality (1-5)</label>
                                                    <input type="number" min="1" max="5" className="w-full bg-background border border-neon/10 p-2 text-xs text-neon" value={responses.exam.part1_a_factuality || ''} onChange={e => setResponses({ ...responses, exam: { ...responses.exam, part1_a_factuality: parseInt(e.target.value) } })} />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[8px] uppercase font-bold opacity-50 italic">Completeness (1-5)</label>
                                                    <input type="number" min="1" max="5" className="w-full bg-background border border-neon/10 p-2 text-xs text-neon" value={responses.exam.part1_a_completeness || ''} onChange={e => setResponses({ ...responses, exam: { ...responses.exam, part1_a_completeness: parseInt(e.target.value) } })} />
                                                </div>
                                            </div>
                                            <textarea placeholder="Identifiez toute inexactitude ou omission significative..." className="w-full h-24 bg-background border border-neon/10 p-4 text-xs text-foreground focus:border-neon outline-none" value={responses.exam.part1_a_issues} onChange={e => setResponses({ ...responses, exam: { ...responses.exam, part1_a_issues: e.target.value } })} />
                                        </div>

                                        {/* Response B */}
                                        <div className="space-y-4">
                                            <div className="bg-card-bg border border-neon/20 p-6">
                                                <h3 className="text-xs font-black uppercase text-neon mb-4">Modèle B</h3>
                                                <div className="text-[10px] space-y-3 opacity-80 leading-relaxed font-mono">
                                                    <p>Le premier ministre François Legault accuse le gouvernement fédéral de ne pas avoir accordé au Québec une part équitable dans la filière batterie, en comparant la seule usine de batterie financée par Ottawa au Québec, celle de Northvolt en Montérégie, à trois usines en Ontario.</p>
                                                    <p>Québec a investi 700 millions $, mais <span className="text-red-500 underline">Ottawa n'a pas encore versé un sou, malgré un engagement de 1,3 milliard $ chacun pour le projet.</span></p>
                                                    <p>L'opposition libérale accuse le gouvernement Legault d'avoir mal négocié avec Northvolt.</p>
                                                    <p>Le ministre fédéral François-Philippe Champagne a mis en garde contre la redistribution d'un bloc d'énergie réservé à Northvolt...</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[8px] uppercase font-bold opacity-50 italic">Instruction Following (1-5)</label>
                                                    <input type="number" min="1" max="5" className="w-full bg-background border border-neon/10 p-2 text-xs text-neon" value={responses.exam.part1_b_instruction_following || ''} onChange={e => setResponses({ ...responses, exam: { ...responses.exam, part1_b_instruction_following: parseInt(e.target.value) } })} />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[8px] uppercase font-bold opacity-50 italic">Factuality (1-5)</label>
                                                    <input type="number" min="1" max="5" className="w-full bg-background border border-neon/10 p-2 text-xs text-neon" value={responses.exam.part1_b_factuality || ''} onChange={e => setResponses({ ...responses, exam: { ...responses.exam, part1_b_factuality: parseInt(e.target.value) } })} />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[8px] uppercase font-bold opacity-50 italic">Completeness (1-5)</label>
                                                    <input type="number" min="1" max="5" className="w-full bg-background border border-neon/10 p-2 text-xs text-neon" value={responses.exam.part1_b_completeness || ''} onChange={e => setResponses({ ...responses, exam: { ...responses.exam, part1_b_completeness: parseInt(e.target.value) } })} />
                                                </div>
                                            </div>
                                            <textarea placeholder="Analysez les erreurs factuelles (regardez bien les chiffres)..." className="w-full h-24 bg-background border border-neon/10 p-4 text-xs text-foreground focus:border-neon outline-none" value={responses.exam.part1_b_issues} onChange={e => setResponses({ ...responses, exam: { ...responses.exam, part1_b_issues: e.target.value } })} />
                                        </div>
                                    </div>

                                    {/* Ranking */}
                                    <div className="bg-neon/5 border-2 border-neon/30 p-10 space-y-6">
                                        <h3 className="text-xl font-black uppercase italic text-center text-neon underline underline-offset-8">RÉSULTAT_COMPARATIF</h3>

                                        <div className="flex flex-col items-center gap-4">
                                            <p className="text-xs uppercase font-bold">Likert Preference Score (1 = A largement meilleure, 7 = B largement meilleure)</p>
                                            <div className="flex gap-4 items-center">
                                                <span className="text-[10px] text-neon font-black">1 [A_MAX]</span>
                                                <input type="range" min="1" max="7" className="w-64 accent-neon" value={responses.exam.part2_likert} onChange={e => setResponses({ ...responses, exam: { ...responses.exam, part2_likert: parseInt(e.target.value) } })} />
                                                <span className="text-[10px] text-neon font-black">7 [B_MAX]</span>
                                            </div>
                                        </div>

                                        <textarea placeholder="JUSTIFICATION FINALE (Les différences majeures, l'impact des erreurs, hiérarchisation des défauts)..." className="w-full h-40 bg-background border border-neon p-6 text-sm font-bold text-foreground outline-none shadow-inner" value={responses.exam.part2_justification} onChange={e => setResponses({ ...responses, exam: { ...responses.exam, part2_justification: e.target.value } })} />
                                    </div>
                                </div>

                                <div className="text-center pt-10">
                                    <button
                                        onClick={async () => {
                                            if (confirm("Confirmez-vous la soumission de votre analyse experte ? Aucun correctif possible après injection.")) {
                                                const updated = {
                                                    ...responses,
                                                    exam: {
                                                        ...responses.exam,
                                                        status: 'submitted',
                                                        submittedAt: new Date().toISOString()
                                                    }
                                                };
                                                setResponses(updated);
                                                try {
                                                    await saveActivityProgress(userId, 3, 31, 6, updated);
                                                } catch (e) {
                                                    console.error("Submission error:", e);
                                                }
                                            }
                                        }}
                                        className="bg-neon text-background px-20 py-6 font-black uppercase text-sm tracking-[0.3em] hover:scale-105 transition-all shadow-[0_0_50px_rgba(34,197,94,0.3)] cursor-pointer"
                                    >
                                        Injecter_Analyse_Protocole
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Navigation Buttons */}
            {currentSection < 6 && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-10 bg-black/60 backdrop-blur-xl border border-neon/20 px-10 py-4 rounded-full shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-10">
                    <button
                        onClick={() => { setCurrentSection(s => s - 1); window.scrollTo(0, 0); }}
                        disabled={currentSection === 1}
                        className={`text-[9px] uppercase font-black tracking-widest ${currentSection === 1 ? 'opacity-20 cursor-not-allowed' : 'text-neon hover:underline cursor-pointer'}`}
                    >
                        [ PRÉCEDENT ]
                    </button>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className={`h-1.5 w-1.5 rounded-full ${i === currentSection ? 'bg-neon shadow-[0_0_10px_#22c55e]' : 'bg-neon/20'}`} />
                        ))}
                    </div>
                    <button
                        onClick={handleNext}
                        className="text-[9px] uppercase font-black tracking-widest text-neon hover:underline cursor-pointer"
                    >
                        {currentSection === 5 ? '[ VERS_EXAMEN ]' : '[ SUIVANT ]'}
                    </button>
                </div>
            )}
        </div>
    );
}
