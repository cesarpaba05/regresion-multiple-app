import React from 'react';
import { Check } from 'lucide-react';
import { CRISP_STEPS } from '../data/stepsConfig';

interface WizardSidebarProps {
  currentStep: number;
  maxReachedStep: number;
  hasValidY: boolean;
  onSelectStep: (step: number) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

function getPhaseAccent(phase: string): {
  headerText: string;
  activeBg: string;
  activeNum: string;
} {
  if (phase.startsWith('1.')) {
    return {
      headerText: 'text-indigo-700',
      activeBg: 'bg-indigo-50 text-indigo-950 border-indigo-200',
      activeNum: 'bg-indigo-600 text-white',
    };
  }
  if (phase.startsWith('2.')) {
    return {
      headerText: 'text-teal-700',
      activeBg: 'bg-teal-50 text-teal-950 border-teal-200',
      activeNum: 'bg-teal-600 text-white',
    };
  }
  if (phase.startsWith('3.')) {
    return {
      headerText: 'text-amber-700',
      activeBg: 'bg-amber-50 text-amber-950 border-amber-200',
      activeNum: 'bg-amber-600 text-white',
    };
  }
  if (phase.startsWith('4.')) {
    return {
      headerText: 'text-sky-700',
      activeBg: 'bg-sky-50 text-sky-950 border-sky-200',
      activeNum: 'bg-sky-600 text-white',
    };
  }
  if (phase.startsWith('5.')) {
    return {
      headerText: 'text-violet-700',
      activeBg: 'bg-violet-50 text-violet-950 border-violet-200',
      activeNum: 'bg-violet-600 text-white',
    };
  }
  return {
    headerText: 'text-emerald-700',
    activeBg: 'bg-emerald-50 text-emerald-950 border-emerald-200',
    activeNum: 'bg-emerald-600 text-white',
  };
}

export const WizardSidebar: React.FC<WizardSidebarProps> = ({
  currentStep,
  maxReachedStep,
  hasValidY,
  onSelectStep,
  mobileOpen,
  onCloseMobile,
}) => {
  const phases = Array.from(new Set(CRISP_STEPS.map((s) => s.phase)));

  const renderContent = () => (
    <div className="py-5 px-3 space-y-5">
      {phases.map((phase) => {
        const stepsInPhase = CRISP_STEPS.filter((s) => s.phase === phase);
        const accent = getPhaseAccent(phase);
        return (
          <div key={phase}>
            <div className={`px-2.5 mb-1.5 text-[11px] font-semibold tracking-tight ${accent.headerText}`}>
              {phase}
            </div>
            <ul className="space-y-1">
              {stepsInPhase.map((step) => {
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep || step.id < maxReachedStep;
                const isBlocked = step.id > 3 && !hasValidY;
                const isClickable = !isBlocked;

                return (
                  <li key={step.id}>
                    <button
                      type="button"
                      disabled={!isClickable}
                      onClick={() => {
                        onSelectStep(step.id);
                        onCloseMobile();
                      }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs transition-all border ${
                        isActive
                          ? `${accent.activeBg} font-semibold shadow-2xs`
                          : isBlocked
                          ? 'border-transparent text-slate-400 cursor-not-allowed'
                          : 'border-transparent text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-mono shrink-0 transition-colors ${
                          isActive
                            ? `${accent.activeNum} font-semibold`
                            : isCompleted && !isBlocked
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isCompleted && !isActive && !isBlocked ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          step.id
                        )}
                      </span>
                      <span className="truncate">{step.shortTitle}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Desktop persistent sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-slate-200 bg-white/95 backdrop-blur-xs">
        <div className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto">
          {renderContent()}
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-72 max-w-[85vw] bg-white h-full overflow-y-auto border-r border-slate-200 shadow-xl">
            <div className="flex items-center justify-between px-4 py-3.5 bg-slate-900 text-white">
              <span className="text-sm font-semibold">
                Pasos CRISP-DM
              </span>
              <button
                type="button"
                onClick={onCloseMobile}
                className="text-xs font-medium text-slate-300 hover:text-white px-2 py-1"
              >
                Cerrar
              </button>
            </div>
            {renderContent()}
          </aside>
        </div>
      )}
    </>
  );
};
