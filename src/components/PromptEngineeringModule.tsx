'use client';

import { useState } from 'react';
import { ChevronRight, ExternalLink, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

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
        activity4_2: '',
    });
    const [activity2Validated, setActivity2Validated] = useState(false);
    const [showActivity4Note, setShowActivity4Note] = useState(false);

    const handleNext = async () => {
        if (currentStep < 5) {
            setCurrentStep(currentStep + 1);
        } else {
            // Sauvegarder la complétion dans la base de données
            const supabase = createClient();
            try {
                await supabase.from('user_progress').upsert({
                    user_id: userId,
                    chapter_id: 11, // ID créé pour ce module
                    module_id: 4,   // ID du module Prompt Engineering
                    completed: true,
                    completed_at: new Date().toISOString()
                }, { onConflict: 'user_id,chapter_id' });
            } catch (err) {
                console.error("Erreur lors de la sauvegarde de la progression:", err);
            }
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
                    <div className="space-y-10 py-10 text-center">
                        <div className="p-10 border border-neon/30 bg-neon/5 inline-block mx-auto">
                            <h3 className="text-4xl font-black uppercase italic text-neon mb-4 tracking-tighter">
                                PROMPT_MASTER_CHALLENGE
                            </h3>
                            <p className="text-foreground/60 text-sm mb-10 max-w-sm mx-auto">
                                Vous avez complété les 4 activités pratiques. Il est temps de valider vos connaissances théoriques.
                            </p>

                            <div className="flex flex-col gap-4 items-center">
                                <div className="text-xs text-neon/40 font-mono animate-pulse">
                                    {"//"} ATTENTE_DU_CONTENU_QUIZZ_SYSTEM
                                </div>
                                <button
                                    onClick={onComplete}
                                    className="bg-neon text-background px-12 py-4 font-black uppercase text-xs tracking-[0.3em] hover:scale-105 transition-all shadow-[0_0_30px_rgba(34,197,94,0.3)]"
                                >
                                    Lancer le Quizz
                                </button>
                            </div>
                        </div>
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
