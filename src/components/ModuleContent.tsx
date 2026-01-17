'use client';
import { useState } from 'react';
import { ArrowLeft, ChevronRight, BookOpen } from 'lucide-react';

interface ModuleContentProps {
  onBack: () => void;
  onProgress: (val: number) => void;
  userId: string; // <-- AJOUTÉ ICI
}

export default function ModuleContent({ onBack, onProgress, userId }: ModuleContentProps) {
  const [current, setCurrent] = useState(0);
  const totalSteps = 3;

  const handleNext = () => {
    if (current < totalSteps - 1) {
      const next = current + 1;
      setCurrent(next);
      onProgress(Math.round(((next + 1) / totalSteps) * 25));
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <button onClick={onBack} className="flex items-center gap-2 text-neon font-mono text-xs mb-8 uppercase tracking-widest hover:opacity-100 opacity-60 transition-opacity cursor-pointer">
        <ArrowLeft size={14} /> Back_to_grid
      </button>

      <div className="border border-neon/30 p-10 relative backdrop-blur-xl bg-card-bg shadow-lg">
        <div className="absolute top-4 right-6 font-mono text-neon opacity-10 text-4xl font-black italic select-none">STAGE_0{current + 1}</div>

        <div className="flex items-center gap-4 mb-10 text-neon">
          <BookOpen size={24} />
          <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
            Machine Learning Fundamentals
          </h2>
          <span className="text-xs font-mono opacity-50">User: {userId.substring(0, 8)}...</span>
        </div>

        <div className="space-y-10">
            <p className="text-xl font-mono leading-relaxed border-l-2 border-neon/30 pl-6 italic text-foreground opacity-90">
                {`> `} Deep learning models require high-quality annotated data to generalize patterns correctly...
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="p-5 border border-foreground/10 bg-foreground/[0.03] hover:border-neon transition-all">
                        <span className="text-neon block mb-2 font-mono text-[9px] underline uppercase tracking-widest">Protocol_0{i}</span> 
                        <span className="text-[10px] font-black uppercase text-foreground italic">System_Verification</span>
                    </div>
                ))}
            </div>
        </div>

        <div className="flex justify-between items-center border-t border-foreground/10 mt-16 pt-8">
            <span className="font-mono text-[10px] opacity-40 uppercase text-foreground tracking-widest">Stage: 0{current + 1} / 03</span>
            <button 
                onClick={handleNext} 
                className="bg-neon text-background px-10 py-4 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:scale-105 transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] cursor-pointer"
            >
               {current === totalSteps - 1 ? "Finish Module" : "Continue"} <ChevronRight size={14} />
            </button>
        </div>
      </div>
    </div>
  );
}