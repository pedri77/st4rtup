import { useQuery } from '@tanstack/react-query'
import { Bot, Brain, Shield, FileText, Heart, Loader2, CheckCircle, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { agentsApi } from '@/services/api'

const ICONS = {
  'AGENT-LEAD-001': Brain,
  'AGENT-QUALIFY-001': Shield,
  'AGENT-PROPOSAL-001': FileText,
  'AGENT-CS-001': Heart,
}

export default function AgentsSummary() {
  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents-summary'],
    queryFn: () => agentsApi.list().then(r => r.data.agents).catch(() => []),
    retry: 0, staleTime: 60000,
  })

  const { data: auditData } = useQuery({
    queryKey: ['agents-audit-summary'],
    queryFn: () => agentsApi.audit({ limit: 5 }).then(r => r.data).catch(() => ({ items: [] })),
    retry: 0,
    staleTime: 60000,
  })

  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
        </div>
      </div>
    )
  }

  const activeCount = agents?.filter(a => a.status === 'active').length || 0
  const recentRuns = auditData?.entries?.length || 0

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Bot className="w-4 h-4 text-cyan-400" />
          Agentes IA
        </h3>
        <Link to="/app/agents" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
          Ver todos <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-gray-50/50 rounded-lg p-2.5 text-center">
          <p className="text-lg font-bold text-cyan-400">{activeCount}</p>
          <p className="text-[10px] text-gray-500 uppercase">Activos</p>
        </div>
        <div className="bg-gray-50/50 rounded-lg p-2.5 text-center">
          <p className="text-lg font-bold text-gray-800">{recentRuns}</p>
          <p className="text-[10px] text-gray-500 uppercase">Ejecuciones</p>
        </div>
      </div>

      <div className="space-y-1.5">
        {agents?.map(agent => {
          const Icon = ICONS[agent.id] || Bot
          return (
            <div key={agent.id} className="flex items-center gap-2 text-xs">
              <Icon className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-gray-700 flex-1">{agent.name}</span>
              <CheckCircle className={`w-3 h-3 ${agent.status === 'active' ? 'text-green-400' : 'text-gray-600'}`} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
