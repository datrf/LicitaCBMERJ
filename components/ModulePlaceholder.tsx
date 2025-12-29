import React from 'react';

interface ModulePlaceholderProps {
  title: string;
  description: string;
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({ title, description }) => {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-fade-in">
      <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center">
        <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <div className="max-w-md">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">{title}</h2>
        <p className="text-slate-500 mb-6">{description}</p>
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
          <strong>Aguardando Instrução:</strong> Este módulo será construído passo-a-passo conforme suas instruções específicas para o esquema de dados.
        </div>
      </div>
    </div>
  );
};
