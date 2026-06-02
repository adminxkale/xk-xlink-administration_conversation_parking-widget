"use client";
import type { Interaction } from '../../domain/entities/interaction';
import { useDurationTimer } from '../../application/hooks/useDurationTimer';

function remainingHours(startTimestamp: string): number {
  const start = new Date(startTimestamp).getTime();
  const deadline = start + 24 * 60 * 60 * 1000;
  return Math.max(0, (deadline - Date.now()) / (1000 * 60 * 60));
}

interface InteractionCardProps {
  interaction: Interaction;
  queueName?: string;
}

export function InteractionCard({ interaction, queueName }: InteractionCardProps) {
  const { display, isExpired } = useDurationTimer(interaction.startTimestamp);

  return (
    <div
      className={`flex items-center justify-between p-4 rounded-lg transition-colors duration-200 ${
        interaction.isParked
          ? 'bg-amber-50 border border-amber-200'
          : 'bg-green-50 border border-green-200'
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="mb-1 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />
            </svg>
            <span className="font-medium text-gray-700">
              {interaction.agentName?.trim() ? interaction.agentName : 'Agente desconocido'}
            </span>
          </span>
        </p>
        {interaction.isParked && interaction.agentName && (
          <p className="mb-1 text-xs text-gray-500">
            Conversación parqueada por <span className="font-semibold text-black">{interaction.agentName}</span>
          </p>
        )}
        {interaction.isParked && queueName && (
          <p className="mb-1 text-xs text-gray-500">
            Parqueada en la cola: <span className="font-semibold text-black">{queueName}</span>
          </p>
        )}
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-gray-900 truncate">
            Origen: {interaction.originLine}
          </span>
          <span className="text-gray-400">→</span>
          <span className="text-gray-700 truncate">
            Destino: {interaction.clientName
              ? <><span className="font-semibold text-black">{interaction.clientName}</span> ({interaction.destinationLine})</>
              : interaction.destinationLine}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          <span>{new Date(interaction.startTimestamp).toLocaleDateString()}</span>
          <span className={`font-mono ${isExpired ? 'text-red-600 font-semibold' : remainingHours(interaction.startTimestamp) < 2 ? 'text-amber-600' : 'text-gray-500'}`}>
            {isExpired ? '⏰ Expirada' : `⏳ ${display}`}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            interaction.isParked
              ? 'bg-amber-100 text-amber-800'
              : 'bg-green-100 text-green-800'
          }`}>
            {interaction.isParked ? 'Parqueada' : 'Activa'}
          </span>
        </div>
      </div>

    </div>
  );
}
