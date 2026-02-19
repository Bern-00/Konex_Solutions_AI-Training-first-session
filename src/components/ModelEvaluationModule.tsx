'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronRight, ExternalLink, CheckCircle2, AlertCircle, Info, Image as ImageIcon, FileText, ShieldAlert, Sparkles, Brain, Mic, Square, Play, RotateCcw, Globe, Languages } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { saveActivityProgress, getActivityProgress } from '@/lib/progress';

interface ModelEvaluationModuleProps {
    userId: string;
    onBack: () => void;
    onComplete: () => void;
}

export default function ModelEvaluationModule({ userId, onBack, onComplete }: ModelEvaluationModuleProps) {
    const [currentSection, setCurrentSection] = useState(1);
    const [responses, setResponses] = useState({
        section1: {
            prompt: "Je viens de terminer un entretien pour un post de consultante junior dans un grand cabinet de conseil en stratégie. J'ai vraiment apprécié l'entretien avec la manager Mathilde qui a été très bienveillante et m'a mise à l'aise. Je voudrais la remercier pour ses conseils et son ouverture d'esprit et redire que j'aimerais beaucoup travailler avec elle sans être trop insistante.\n\nAide-moi à rédiger un court mail de 300 mots au plus pour la remercier.",
            responseA: {
                title: "Modèle A",
                content: "Objet : Remerciements pour l'entretien du poste de consultante junior\n\nChère Mathilde,\n\nJe tenais à vous remercier sincèrement pour l'entretien d'hier concernant le poste de consultante junior au sein de votre cabinet. J'ai beaucoup apprécié notre échange et la bienveillance dont vous avez fait preuve. Vous m'avez permis de me sentir à l'aise et d'en apprendre davantage sur les enjeux passionnants que porte votre équipe en stratégie.\n\nJe suis particulièrement touchée par vos conseils sur l'importance de développer une pensée critique et d'agir avec agilité. Ces éléments résonnent profondément avec mes valeurs et mon approche professionnelle. Votre ouverture d'esprit sur les différentes perspectives a été inspirante et m'a encouragée à envisager les défis sous un angle renouvelé.\n\nBien que l'idée de collaborer avec vous et votre équipe soit très attractive, je souhaite exprimer ma décision sans insistance. Je tiens simplement à vous remercier encore une fois pour cette opportunité et pour avoir partagé votre vision. Je reste pleinement ouverte à d'éventuelles opportunités à l'avenir et espère que nos chemins se croiseront de nouveau.\n\nJe vous souhaite et à votre équipe une excellente continuation de votre travail. Je vous remercie à nouveau pour votre temps et votre disponibilité.\n\nAvec toute ma considération,\n[Votre Prénom et Nom]\n[Votre LinkedIn (si applicable)]\n[Votre Numéro de Téléphone]"
            },
            responseB: {
                title: "Modèle B",
                content: "Objet : Remerciements pour l'entretien du poste de consultante junior\n\nChère Mathilde,\n\nJe tenais à vous remercier sincèrement pour l'entretien d'hier concernant le poste de consultante junior au sein de votre cabinet. J'ai beaucoup apprécié notre échange et la manière dont vous avez présenté l'équipe et les projets en cours. Vous avez su me mettre à l'aise et m'offrir une perspective très éclairante sur le rôle, ce qui a renforcé mon intérêt pour la position.\n\nJ'ai particulièrement apprécié vos conseils sur les compétences à développer et sur l'importance de l'ouverture d'esprit dans ce type de conseil. Votre approche bienveillante et votre ouverture d'esprit m'ont inspirée et m'ont motivée à apporter le meilleur de moi-même.\n\nBien que je ne sois pas encore à 100 % convaincue, je reste très intéressée par l'idée de collaborer avec vous et d'apprendre au sein de votre équipe dynamique. Je serais honorée de pouvoir contribuer à vos projets et de participer à l'évolution de votre cabinet.\n\nJe vous remercie encore pour votre temps et votre disponibilité. N'hésitez pas à me recontacter si vous avez besoin de plus d'informations ou d'exemples de mon travail.\n\nDans l'attente de votre retour, je vous souhaite une excellente journée.\n\nCordialement,\n[Votre prénom et nom]\n[Votre LinkedIn (si applicable)]\n[Votre numéro de téléphone]"
            },
            gradingA: {
                localisation: 0,
                instructionFollowing: 0,
                truthfulness: 0,
                length: 0,
                structure: 0,
                styleTone: 0,
                harmfulness: 0,
                overall: 0
            },
            gradingB: {
                localisation: 0,
                instructionFollowing: 0,
                truthfulness: 0,
                length: 0,
                structure: 0,
                styleTone: 0,
                harmfulness: 0,
                overall: 0
            }
        },
        section2: {
            exo2a: {
                source: "The UK Prime Minister met with the Chancellor of the Exchequer to discuss the fiscal policy and the impact of the cost-of-living crisis on families in the Midlands and London.",
                translation: ""
            },
            exo2b: {
                source: "I'm heading to McDonald's for a Big Mac and then to a typical American supermarket like Kroger to buy some ranch dressing and s'mores ingredients.",
                translation: ""
            }
        },
        section3: {
            randomPrompt: "",
            audioEn: null as string | null, // Base64 or Blob URL for now
            audioFr: null as string | null,
            status: 'pending' // pending, submitted
        }
    });

    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<string>('idle');
    const [lastSaveTime, setLastSaveTime] = useState<string | null>(null);
    const [activeChapterId, setActiveChapterId] = useState<number>(0);
    const [activeModuleId, setActiveModuleId] = useState<number>(0);

    // Audio states
    const [isRecordingEn, setIsRecordingEn] = useState(false);
    const [isRecordingFr, setIsRecordingFr] = useState(false);
    const mediaRecorderEn = useRef<MediaRecorder | null>(null);
    const mediaRecorderFr = useRef<MediaRecorder | null>(null);
    const audioChunksEn = useRef<Blob[]>([]);
    const audioChunksFr = useRef<Blob[]>([]);

    const improvisationPrompts = [
        "Un client mécontent qui a reçu un produit cassé mais qui a désespérément besoin de ce produit pour son mariage demain.",
        "Un astronaute qui découvre que sa réserve d'oxygène est limitée, parlant à sa famille une dernière fois.",
        "Un détective des années 40 qui explique à un suspect pourquoi il est le coupable, en utilisant des métaphores culinaires.",
        "Un professeur d'université excentrique qui explique pourquoi les chats sont secrètement des espions d'une autre galaxie."
    ];

    useEffect(() => {
        if (!responses.section3.randomPrompt) {
            const random = improvisationPrompts[Math.floor(Math.random() * improvisationPrompts.length)];
            setResponses(prev => ({
                ...prev,
                section3: { ...prev.section3, randomPrompt: random }
            }));
        }
    }, []);

    // KNOWN FALLBACK IDs for module-evaluation (module_id=6, chapter_id=21)
    const FALLBACK_MODULE_ID = 6;
    const FALLBACK_CHAPTER_ID = 21;

    // RESOLVE ID — with fallback to known IDs
    useEffect(() => {
        async function resolveIDs() {
            try {
                const supabase = createClient();
                const { data: moduleData } = await supabase
                    .from('modules')
                    .select('id')
                    .eq('slug', 'model-evaluation')
                    .maybeSingle();

                if (moduleData) {
                    setActiveModuleId(moduleData.id);
                    const { data: chapterData } = await supabase
                        .from('chapters')
                        .select('id')
                        .eq('module_id', moduleData.id)
                        .order('order_index', { ascending: true })
                        .limit(1)
                        .maybeSingle();

                    if (chapterData) {
                        setActiveChapterId(chapterData.id);
                        return; // useEffect below will trigger loadSavedProgress
                    }
                }
                // Fallback to hardcoded IDs if slug lookup fails
                console.warn("ModelEval: slug lookup failed, using fallback IDs");
                setActiveModuleId(FALLBACK_MODULE_ID);
                setActiveChapterId(FALLBACK_CHAPTER_ID);
            } catch (err) {
                console.error("Error resolving ids:", err);
                setActiveModuleId(FALLBACK_MODULE_ID);
                setActiveChapterId(FALLBACK_CHAPTER_ID);
            }
        }
        resolveIDs();
    }, []);

    // AUTOSAVE — every 2 seconds after a change
    useEffect(() => {
        if (isInitialLoading || !userId || !activeChapterId) return;
        const timer = setTimeout(async () => {
            setSaveStatus('Autosaving...');
            try {
                await saveActivityProgress(userId, activeModuleId, activeChapterId, currentSection, responses);
                setSaveStatus('Saved (Auto)');
                setLastSaveTime(new Date().toLocaleTimeString());
            } catch (err: any) {
                console.error("Autosave error:", err);
                setSaveStatus('Error');
            }
        }, 2000); // Reduced from 5s to 2s for better UX
        return () => clearTimeout(timer);
    }, [responses, currentSection, userId, isInitialLoading, activeChapterId]);

    const loadSavedProgress = async (chapId: number) => {
        if (!userId) return;
        setIsInitialLoading(true);
        try {
            const savedData = await getActivityProgress(userId, chapId);
            if (savedData) {
                if (savedData.step) setCurrentSection(savedData.step);
                if (savedData.responses) {
                    // Deep merge to preserve static fields (prompt, responseA, responseB)
                    setResponses(prev => ({
                        ...prev,
                        ...savedData.responses,
                        section1: {
                            ...prev.section1, // keep full static prompt/responses
                            ...savedData.responses.section1,
                            prompt: prev.section1.prompt,
                            responseA: prev.section1.responseA,
                            responseB: prev.section1.responseB,
                        }
                    }));
                }
            }
        } catch (err) {
            console.error("Error loading progress:", err);
        } finally {
            setIsInitialLoading(false);
        }
    };

    useEffect(() => {
        if (userId && activeChapterId) loadSavedProgress(activeChapterId);
    }, [userId, activeChapterId]);

    const handleNext = async () => {
        const nextSection = currentSection + 1;
        try {
            setSaveStatus('Saving...');
            await saveActivityProgress(userId, activeModuleId, activeChapterId, currentSection === 3 ? 3 : nextSection, responses);
            setSaveStatus('Saved');
        } catch (err) {
            console.error("Save error:", err);
        }

        if (currentSection < 3) {
            setCurrentSection(nextSection);
            window.scrollTo(0, 0);
        } else {
            onComplete();
        }
    };

    // AUDIO LOGIC
    const startRecording = async (lang: 'en' | 'fr') => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);

            if (lang === 'en') {
                mediaRecorderEn.current = mediaRecorder;
                audioChunksEn.current = [];
                mediaRecorder.ondataavailable = (e) => audioChunksEn.current.push(e.data);
                mediaRecorder.onstop = () => {
                    const blob = new Blob(audioChunksEn.current, { type: 'audio/webm' });
                    const reader = new FileReader();
                    reader.readAsDataURL(blob);
                    reader.onloadend = () => {
                        setResponses(prev => ({
                            ...prev,
                            section3: { ...prev.section3, audioEn: reader.result as string }
                        }));
                    };
                };
                mediaRecorder.start();
                setIsRecordingEn(true);
            } else {
                mediaRecorderFr.current = mediaRecorder;
                audioChunksFr.current = [];
                mediaRecorder.ondataavailable = (e) => audioChunksFr.current.push(e.data);
                mediaRecorder.onstop = () => {
                    const blob = new Blob(audioChunksFr.current, { type: 'audio/webm' });
                    const reader = new FileReader();
                    reader.readAsDataURL(blob);
                    reader.onloadend = () => {
                        setResponses(prev => ({
                            ...prev,
                            section3: { ...prev.section3, audioFr: reader.result as string }
                        }));
                    };
                };
                mediaRecorder.start();
                setIsRecordingFr(true);
            }
        } catch (err) {
            alert("Erreur micro: " + err);
        }
    };

    const stopRecording = (lang: 'en' | 'fr') => {
        if (lang === 'en' && mediaRecorderEn.current) {
            mediaRecorderEn.current.stop();
            setIsRecordingEn(false);
        } else if (lang === 'fr' && mediaRecorderFr.current) {
            mediaRecorderFr.current.stop();
            setIsRecordingFr(false);
        }
    };

    if (isInitialLoading) return <div className="text-neon font-mono text-center p-20 animate-pulse uppercase tracking-[0.3em]">INITIALISATION_EVAL_SYSTEM...</div>;

    const criteria = [
        { key: 'localisation', label: 'Localisation (Langue/Culture)' },
        { key: 'instructionFollowing', label: 'Instruction Following' },
        { key: 'truthfulness', label: 'Truthfulness (Exactitude)' },
        { key: 'length', label: 'Response length' },
        { key: 'structure', label: 'Structure' },
        { key: 'styleTone', label: 'Writing style and tone' },
        { key: 'harmfulness', label: 'Harmfulness' },
    ];

    return (
        <div className="max-w-5xl mx-auto pb-20 font-mono">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <button onClick={onBack} className="flex items-center gap-2 text-neon text-[10px] uppercase opacity-60 hover:opacity-100 transition-opacity">
                    [ EXIT_EVAL_TERMINAL ]
                </button>
                <div className="flex gap-1.5">
                    {[1, 2, 3].map(i => (
                        <div key={i} className={`h-1 w-12 transition-all duration-500 ${i <= currentSection ? 'bg-neon shadow-[0_0_15px_rgba(34,197,94,0.6)]' : 'bg-neon/10'}`} />
                    ))}
                </div>
            </div>

            <div className="border-t-2 border-neon/50 pt-8 mb-12 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black uppercase italic tracking-tighter text-foreground">
                        <span className="text-neon mr-3">M04</span> Model Evaluation
                    </h1>
                    <p className="text-[10px] text-neon/40 mt-1 uppercase tracking-widest">// NIV_EXPERT : QUALITY_ASSURANCE_PROTOCOL</p>
                </div>
                <div className="text-right">
                    <div className={`text-[9px] font-mono px-2 py-1 border ${saveStatus.includes('Saved') ? 'text-green-500 border-green-500/30' : 'text-neon/50 border-neon/20'}`}>
                        {saveStatus.toUpperCase()} {lastSaveTime && `[${lastSaveTime}]`}
                    </div>
                </div>
            </div>

            <div className="space-y-12">
                {/* SECTION 1: SIDE-BY-SIDE */}
                {currentSection === 1 && (
                    <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="bg-neon/10 p-3 border border-neon/30"><Sparkles className="text-neon" size={24} /></div>
                            <h2 className="text-2xl font-black uppercase italic">Exo 1: Comparative Evaluation (SbS)</h2>
                        </div>

                        <div className="bg-card-bg border border-neon/20 p-8 mb-10">
                            <h3 className="text-neon font-black uppercase text-xs tracking-widest mb-4">// LE_PROMPT</h3>
                            <div className="bg-black/40 p-6 italic text-sm text-foreground/80 border border-white/5 leading-relaxed">
                                "{responses.section1.prompt}"
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {['A', 'B'].map(mod => {
                                const modKey = mod === 'A' ? 'gradingA' : 'gradingB';
                                const content = mod === 'A' ? responses.section1.responseA.content : responses.section1.responseB.content;
                                return (
                                    <div key={mod} className="space-y-6">
                                        <div className="bg-neon/5 border-l-4 border-neon p-6 min-h-[400px]">
                                            <h4 className="text-sm font-black uppercase text-neon mb-4">Modèle {mod}</h4>
                                            <div className="text-[11px] leading-relaxed whitespace-pre-wrap opacity-90">{content}</div>
                                        </div>

                                        <div className="bg-black/20 border border-neon/10 p-6 space-y-4">
                                            <p className="text-[10px] font-black uppercase text-neon/60 tracking-widest">Grille de notation (1-5)</p>
                                            {criteria.map(c => (
                                                <div key={c.key} className="flex justify-between items-center group">
                                                    <span className="text-[10px] opacity-70 group-hover:opacity-100 transition-opacity">{c.label}</span>
                                                    <div className="flex gap-1">
                                                        {[1, 2, 3, 4, 5].map(v => (
                                                            <button
                                                                key={v}
                                                                onClick={() => {
                                                                    setResponses(prev => ({
                                                                        ...prev,
                                                                        section1: {
                                                                            ...prev.section1,
                                                                            [modKey]: { ...prev.section1[modKey as 'gradingA' | 'gradingB'], [c.key]: v }
                                                                        }
                                                                    }));
                                                                }}
                                                                className={`w-6 h-6 text-[10px] font-bold transition-all border ${(responses.section1[modKey as 'gradingA' | 'gradingB'] as any)[c.key] === v
                                                                    ? 'bg-neon text-background border-neon shadow-[0_0_10px_rgba(34,197,94,0.4)]'
                                                                    : 'text-neon/40 border-neon/10 hover:border-neon/40'
                                                                    }`}
                                                            >
                                                                {v}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="pt-4 border-t border-neon/10 flex justify-between items-center">
                                                <span className="text-xs font-black uppercase text-neon">OVERALL_SCORE</span>
                                                <div className="flex gap-1">
                                                    {[1, 2, 3, 4, 5].map(v => (
                                                        <button
                                                            key={v}
                                                            onClick={() => {
                                                                setResponses(prev => ({
                                                                    ...prev,
                                                                    section1: {
                                                                        ...prev.section1,
                                                                        [modKey]: { ...prev.section1[modKey as 'gradingA' | 'gradingB'], overall: v }
                                                                    }
                                                                }));
                                                            }}
                                                            className={`w-8 h-8 text-xs font-black transition-all border ${(responses.section1[modKey as 'gradingA' | 'gradingB']).overall === v
                                                                ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                                                                : 'text-white/20 border-white/10 hover:border-white/40'
                                                                }`}
                                                        >
                                                            {v}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* SECTION 2: LOCALIZATION */}
                {currentSection === 2 && (
                    <div className="animate-in fade-in slide-in-from-right-5 duration-700">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="bg-neon/10 p-3 border border-neon/30"><Globe className="text-neon" size={24} /></div>
                            <h2 className="text-2xl font-black uppercase italic">Exo 2: Experts en Localisation</h2>
                        </div>

                        <div className="grid grid-cols-1 gap-10">
                            <div className="bg-card-bg border border-neon/20 p-8 space-y-6">
                                <div className="flex justify-between items-start">
                                    <div className="border-l-2 border-neon pl-4">
                                        <h3 className="text-neon font-black uppercase text-sm tracking-widest">{'Tâche 2.1 – Political Localisation (UK -> Fr_CA)'}</h3>
                                        <p className="text-[10px] opacity-50 mt-1">Traduisez et adaptez le texte suivant pour un public québécois en conservant la précision institutionnelle.</p>
                                    </div>
                                    <div className="px-2 py-1 bg-neon/10 border border-neon/30 text-[9px] text-neon font-bold uppercase tracking-tighter">{'UK_EN → FR_CA'}</div>
                                </div>
                                <div className="bg-black/40 p-6 italic text-sm text-foreground/80 border border-white/5 font-serif">
                                    "{responses.section2.exo2a.source}"
                                </div>
                                <textarea
                                    placeholder="Saisissez votre traduction localisée... (utilisez les termes équivalents au Canada/Québec)"
                                    className="w-full h-40 bg-background border border-neon/10 p-6 text-sm text-foreground focus:border-neon outline-none transition-shadow"
                                    value={responses.section2.exo2a.translation}
                                    onChange={e => setResponses(prev => ({
                                        ...prev,
                                        section2: { ...prev.section2, exo2a: { ...prev.section2.exo2a, translation: e.target.value } }
                                    }))}
                                />
                            </div>

                            <div className="bg-card-bg border border-neon/20 p-8 space-y-6">
                                <div className="flex justify-between items-start">
                                    <div className="border-l-2 border-neon pl-4">
                                        <h3 className="text-neon font-black uppercase text-sm tracking-widest">{'Tâche 2.2 – Consumer Localisation (US -> Fr_FR)'}</h3>
                                        <p className="text-[10px] opacity-50 mt-1">Traduisez et adaptez les références culturelles américaines pour un public en France métropolitaine.</p>
                                    </div>
                                    <div className="px-2 py-1 bg-neon/10 border border-neon/30 text-[9px] text-neon font-bold uppercase tracking-tighter">{'US_EN → FR_FR'}</div>
                                </div>
                                <div className="bg-black/40 p-6 italic text-sm text-foreground/80 border border-white/5 font-serif">
                                    "{responses.section2.exo2b.source}"
                                </div>
                                <textarea
                                    placeholder="Saisissez votre traduction localisée... (trouvez les équivalents parisiens/français)"
                                    className="w-full h-40 bg-background border border-neon/10 p-6 text-sm text-foreground focus:border-neon outline-none transition-shadow"
                                    value={responses.section2.exo2b.translation}
                                    onChange={e => setResponses(prev => ({
                                        ...prev,
                                        section2: { ...prev.section2, exo2b: { ...prev.section2.exo2b, translation: e.target.value } }
                                    }))}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* SECTION 3: AUDIO IMPROV */}
                {currentSection === 3 && (
                    <div className="animate-in fade-in slide-in-from-top-5 duration-700">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="bg-neon/10 p-3 border border-neon/30"><Languages className="text-neon" size={24} /></div>
                            <h2 className="text-2xl font-black uppercase italic">Exo 3: Drama & Audio Improvisation</h2>
                        </div>

                        <div className="bg-neon/5 border-2 border-neon p-12 text-center mb-12">
                            <p className="text-[10px] uppercase font-bold text-neon mb-4 tracking-[0.5em]">// PROMPT_DRAMATIQUE_GÉNÉRÉ</p>
                            <h3 className="text-3xl font-black uppercase italic text-foreground leading-tight max-w-2xl mx-auto">
                                "{responses.section3.randomPrompt}"
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {/* Record English */}
                            <div className="bg-card-bg border border-neon/20 p-10 flex flex-col items-center justify-center space-y-6 hover:border-blue-500/50 transition-all group">
                                <div className="text-[10px] uppercase font-bold text-blue-500 mb-2">Panel 01: English Recording</div>
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center border-2 transition-all ${isRecordingEn ? 'border-red-500 animate-pulse bg-red-500/10' : 'border-blue-500 group-hover:scale-110 bg-blue-500/10'}`}>
                                    {isRecordingEn ? <Square className="text-red-500 fill-red-500" size={24} /> : <Mic className="text-blue-500" size={30} />}
                                </div>
                                <div className="flex gap-4">
                                    {!isRecordingEn ? (
                                        <button onClick={() => startRecording('en')} className="bg-blue-600 text-white px-6 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-colors">Start_Rec</button>
                                    ) : (
                                        <button onClick={() => stopRecording('en')} className="bg-red-600 text-white px-6 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 transition-colors">Stop_Rec</button>
                                    )}
                                </div>
                                {responses.section3.audioEn && (
                                    <div className="w-full pt-6 border-t border-blue-500/20">
                                        <audio src={responses.section3.audioEn} controls className="w-full h-8" />
                                    </div>
                                )}
                            </div>

                            {/* Record French */}
                            <div className="bg-card-bg border border-neon/20 p-10 flex flex-col items-center justify-center space-y-6 hover:border-orange-500/50 transition-all group">
                                <div className="text-[10px] uppercase font-bold text-orange-500 mb-2">Panel 02: French Recording</div>
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center border-2 transition-all ${isRecordingFr ? 'border-red-500 animate-pulse bg-red-500/10' : 'border-orange-500 group-hover:scale-110 bg-orange-500/10'}`}>
                                    {isRecordingFr ? <Square className="text-red-500 fill-red-500" size={24} /> : <Mic className="text-orange-500" size={30} />}
                                </div>
                                <div className="flex gap-4">
                                    {!isRecordingFr ? (
                                        <button onClick={() => startRecording('fr')} className="bg-orange-600 text-white px-6 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-orange-500 transition-colors">Start_Rec</button>
                                    ) : (
                                        <button onClick={() => stopRecording('fr')} className="bg-red-600 text-white px-6 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 transition-colors">Stop_Rec</button>
                                    )}
                                </div>
                                {responses.section3.audioFr && (
                                    <div className="w-full pt-6 border-t border-orange-500/20">
                                        <audio src={responses.section3.audioFr} controls className="w-full h-8" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-20 p-10 border border-neon/30 bg-neon/5 text-center">
                            <details className="mb-8">
                                <summary className="text-[10px] font-bold text-neon cursor-pointer hover:underline uppercase">[ VOIR_CHECKLIST_FINALISATION ]</summary>
                                <div className="mt-4 text-[10px] text-foreground/60 space-y-2">
                                    <p>✅ Audio anglais enregistré (min 60s)</p>
                                    <p>✅ Audio français enregistré (min 60s)</p>
                                    <p>✅ Improvisation cohérente avec le rôle</p>
                                </div>
                            </details>

                            <button
                                onClick={() => {
                                    if (confirm("Soumettre votre évaluation finale du module 4 ?")) {
                                        setResponses(prev => ({ ...prev, section3: { ...prev.section3, status: 'submitted' } }));
                                        handleNext();
                                    }
                                }}
                                className="bg-neon text-background px-20 py-6 font-black uppercase text-sm tracking-[0.4em] hover:scale-105 transition-all shadow-[0_0_50px_rgba(34,197,94,0.3)]"
                            >
                                TERMINER_ÉVALUATION_MODÈLE
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation Buttons — visible on all sections */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-10 bg-black/60 backdrop-blur-xl border border-neon/20 px-10 py-4 rounded-full shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-10">
                <button
                    onClick={() => { setCurrentSection(s => Math.max(1, s - 1)); window.scrollTo(0, 0); }}
                    disabled={currentSection === 1}
                    className={`text-[9px] uppercase font-black tracking-widest ${currentSection === 1 ? 'opacity-20 cursor-not-allowed' : 'text-neon hover:underline cursor-pointer'}`}
                >
                    [ PRÉCÉDENT ]
                </button>
                <div className="flex gap-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className={`h-1.5 w-1.5 rounded-full ${i === currentSection ? 'bg-neon shadow-[0_0_10px_#22c55e]' : 'bg-neon/20'}`} />
                    ))}
                </div>
                {currentSection < 3 && (
                    <button
                        onClick={handleNext}
                        className="text-[9px] uppercase font-black tracking-widest text-neon hover:underline cursor-pointer"
                    >
                        {currentSection === 2 ? '[ VERS_AUDIO ]' : '[ SUIVANT ]'}
                    </button>
                )}
            </div>
        </div>
    );
}
