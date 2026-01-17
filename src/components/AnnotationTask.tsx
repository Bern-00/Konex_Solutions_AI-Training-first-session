'use client';

import { useState } from 'react';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { JSX } from 'react/jsx-dev-runtime';

/* ============================= */
/* TYPES                         */
/* ============================= */

type Label = 'Positive' | 'Negative' | 'Neutral';

interface AnnotationSample {
  id: string;
  text: string;
  correctLabel: Label;
}

interface AnnotationTaskProps {
  onBack: () => void;
}

/* ============================= */
/* MOCK DATA (TRAINING)          */
/* ============================= */

const SAMPLES: readonly AnnotationSample[] = [
  {
    id: 'sample-001',
    text: 'The customer service was extremely helpful and responsive.',
    correctLabel: 'Positive',
  },
  {
    id: 'sample-002',
    text: 'The product arrived late and the packaging was damaged.',
    correctLabel: 'Negative',
  },
  {
    id: 'sample-003',
    text: 'The interface is functional but lacks advanced features.',
    correctLabel: 'Neutral',
  },
];

/* ============================= */
/* COMPONENT                     */
/* ============================= */

export default function AnnotationTask({
  onBack,
}: AnnotationTaskProps): JSX.Element {
  const [index, setIndex] = useState<number>(0);
  const [selected, setSelected] = useState<Label | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const currentSample: AnnotationSample = SAMPLES[index];
  const isLastSample: boolean = index === SAMPLES.length - 1;

  const handleSelect = (label: Label): void => {
    setSelected(label);

    if (label === currentSample.correctLabel) {
      setFeedback('correct');
    } else {
      setFeedback('wrong');
    }
  };

  const handleNext = (): void => {
    if (!isLastSample) {
      setIndex((prev) => prev + 1);
      setSelected(null);
      setFeedback(null);
    }
  };

  return (
    <section className="max-w-3xl mx-auto pb-20">
      {/* BACK */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-neon font-mono text-xs mb-8 uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity"
      >
        <ArrowLeft size={14} />
        Back
      </button>

      {/* TASK CARD */}
      <div className="border border-borderSoft bg-card p-10 backdrop-blur-xl relative">
        {/* HEADER */}
        <div className="mb-10">
          <p className="text-[9px] uppercase tracking-[0.3em] font-mono text-muted">
            Annotation_Task
          </p>
          <h2 className="text-3xl font-black uppercase tracking-tighter italic text-foreground mt-2">
            Sentiment Labeling
          </h2>
        </div>

        {/* SAMPLE */}
        <div className="border-l-2 border-neon/30 pl-6 mb-12">
          <p className="font-mono text-xl italic leading-relaxed text-soft">
            {'> '} {currentSample.text}
          </p>
        </div>

        {/* LABELS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {(['Positive', 'Negative', 'Neutral'] as const).map((label) => {
            const isSelected: boolean = selected === label;

            return (
              <button
                key={label}
                type="button"
                onClick={() => handleSelect(label)}
                disabled={feedback !== null}
                className={`p-6 border text-center uppercase font-black text-xs tracking-widest transition-all ${
                  isSelected
                    ? 'border-neon bg-neon/10'
                    : 'border-borderSoft bg-background hover:border-neon'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* FEEDBACK */}
        {feedback && (
          <div
            className={`flex items-center gap-3 font-mono text-xs uppercase tracking-widest mb-10 ${
              feedback === 'correct' ? 'text-neon' : 'text-muted'
            }`}
          >
            {feedback === 'correct' ? (
              <CheckCircle size={16} />
            ) : (
              <XCircle size={16} />
            )}
            {feedback === 'correct'
              ? 'Correct Annotation'
              : 'Incorrect Annotation'}
          </div>
        )}

        {/* FOOTER */}
        <div className="flex justify-between items-center border-t border-borderSoft pt-8">
          <span className="font-mono text-[10px] uppercase text-muted">
            Sample {index + 1} / {SAMPLES.length}
          </span>

          {!isLastSample && (
            <button
              type="button"
              onClick={handleNext}
              disabled={!feedback}
              className={`px-10 py-4 font-black uppercase text-[10px] tracking-widest transition-all ${
                feedback
                  ? 'bg-neon text-background hover:scale-105'
                  : 'bg-borderSoft text-muted cursor-not-allowed'
              }`}
            >
              Next_Sample
            </button>
          )}

          {isLastSample && feedback && (
            <span className="text-neon font-mono text-xs uppercase tracking-widest">
              Task_Completed
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
