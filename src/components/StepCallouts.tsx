import React, { useState } from 'react';
import { HelpCircle, Lightbulb, Code2, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { StepDefinition } from '../data/stepsConfig';

interface WhatItMeansProps {
  step: StepDefinition;
}

export const WhatItMeansToggle: React.FC<WhatItMeansProps> = ({ step }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 whitespace-nowrap shrink-0 ${
          open
            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
            : 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
        }`}
        aria-expanded={open}
      >
        <HelpCircle className={`w-4 h-4 shrink-0 ${open ? 'text-indigo-100' : 'text-indigo-600'}`} />
        <span>¿Qué significa?</span>
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
        )}
      </button>

      {open && (
        <div className="mt-2.5 p-4 bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/60 border border-indigo-200 rounded-xl text-sm text-slate-700 leading-relaxed shadow-xs">
          <p className="font-semibold text-indigo-950 mb-1.5">{step.whatItMeansTitle}</p>
          <p className="mb-2.5 text-slate-700">{step.whatItMeansBody}</p>
          <div className="pt-2.5 border-t border-indigo-100 text-xs text-slate-600">
            <span className="font-semibold text-indigo-900">Ejemplo práctico: </span>
            {step.whatItMeansExample}
          </div>
        </div>
      )}
    </div>
  );
};

interface KeyFindingBoxProps {
  finding: string;
  tone?: 'neutral' | 'positive' | 'warning';
}

export const KeyFindingBox: React.FC<KeyFindingBoxProps> = ({ finding, tone = 'neutral' }) => {
  const palette =
    tone === 'positive'
      ? 'bg-gradient-to-r from-emerald-50/90 to-teal-50/70 border-emerald-200 text-emerald-950'
      : tone === 'warning'
      ? 'bg-gradient-to-r from-amber-50/90 to-orange-50/60 border-amber-200 text-amber-950'
      : 'bg-gradient-to-r from-indigo-50/80 to-sky-50/70 border-indigo-200 text-slate-900';

  const iconBox =
    tone === 'positive'
      ? 'bg-emerald-600 text-white'
      : tone === 'warning'
      ? 'bg-amber-600 text-white'
      : 'bg-indigo-600 text-white';

  const titleColor =
    tone === 'positive'
      ? 'text-emerald-900'
      : tone === 'warning'
      ? 'text-amber-900'
      : 'text-indigo-950';

  return (
    <div className={`mt-6 p-4 rounded-xl border shadow-xs ${palette}`}>
      <div className="flex items-start gap-3.5">
        <div className={`p-2 rounded-lg shrink-0 ${iconBox}`}>
          <Lightbulb className="w-4 h-4" />
        </div>
        <div className="text-sm leading-relaxed">
          <span className={`font-semibold block mb-0.5 ${titleColor}`}>Hallazgo clave</span>
          <p className="text-slate-700">{finding}</p>
        </div>
      </div>
    </div>
  );
};

interface CollapsibleRCodeProps {
  code: string;
}

export const CollapsibleRCode: React.FC<CollapsibleRCodeProps> = ({ code }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard fallback ignored cleanly
    }
  };

  return (
    <div className="mt-4 border border-slate-200 rounded-xl bg-white overflow-hidden shadow-xs">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((prev) => !prev);
          }
        }}
        className="flex items-center justify-between px-4 py-3 cursor-pointer bg-slate-50/80 hover:bg-slate-100/80 transition-colors select-none"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
          <span className="p-1 rounded-md bg-slate-800 text-teal-300">
            <Code2 className="w-3.5 h-3.5 shrink-0" />
          </span>
          <span>Código R equivalente</span>
        </div>
        <div className="flex items-center gap-2">
          {open && (
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar</span>
                </>
              )}
            </button>
          )}
          {open ? (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500" />
          )}
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-800 bg-[#0F172A] p-4 overflow-x-auto">
          <pre className="text-xs leading-relaxed text-teal-100 font-mono whitespace-pre">
            {code}
          </pre>
        </div>
      )}
    </div>
  );
};
