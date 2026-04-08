import React, { useState, useEffect } from 'react'
import { Sidebar } from '../components/shared/Sidebar'
import { useAuthStore } from '../store/store'
import { useThemeStore } from '../hooks/useTheme'
import { getUserSimulations, SimulationWithResults } from '../services/simulationService'
import {
  User as UserIcon, Mail, Bell, Palette, Lock, Shield, Save,
  Key, AlertTriangle, Globe, Moon, Sun,
  ChevronRight, Building, Briefcase, Database, FileJson,
  FileText, Archive, Send, CheckCircle, Copy, Check, Trash2,
} from 'lucide-react'

const inp = (isDark: boolean) =>
  `w-full px-4 py-3 rounded-xl border transition-all outline-none ${isDark ? 'bg-[#27304a] text-white border-[#3f4a68] focus:border-[#5ce1e5] focus:ring-2 focus:ring-[#5ce1e5]/20' : 'bg-white text-gray-900 border-gray-300 focus:border-[#0ea5e9] focus:ring-2 focus:ring-[#0ea5e9]/20'}`

const card = (isDark: boolean) =>
  `rounded-2xl p-6 border ${isDark ? 'bg-[#1a1f3a] border-[#3f4a68]' : 'bg-white border-gray-200'}`

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => {
  const isDark = useThemeStore(s => s.isDark)
  return (
    <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${checked ? (isDark ? 'bg-[#5ce1e5]' : 'bg-[#0ea5e9]') : (isDark ? 'bg-[#3f4a68]' : 'bg-gray-300')}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-0.5'}`} />
    </button>
  )
}

const TabProfile: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const user = useAuthStore(s => s.user)
  const updateUser = useAuthStore(s => s.updateUser)
  const [form, setForm] = useState({ name: user?.name || '', organization: user?.organization || '', role: user?.role || '' })
  const [saved, setSaved] = useState(false)
  const save = () => { updateUser(form); setSaved(true); setTimeout(() => setSaved(false), 2000) }
  return (
    <div className={card(isDark)}>
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-2 rounded-xl ${isDark ? 'bg-cyan-500/20' : 'bg-cyan-100'}`}><UserIcon className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`} /></div>
        <div><div className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Profile Information</div><div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Update your personal details</div></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div><label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Full Name</label><input className={inp(isDark)} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
        <div><label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${isDark ? 'bg-[#0a0e27] border-[#3f4a68] text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}><Mail className="w-4 h-4 shrink-0" /><span className="text-sm truncate">{user?.email}</span></div></div>
        <div><label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><span className="flex items-center gap-1"><Building className="w-3.5 h-3.5" /> Organization</span></label><input className={inp(isDark)} value={form.organization} onChange={e => setForm(p => ({ ...p, organization: e.target.value }))} /></div>
        <div><label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> Role</span></label><input className={inp(isDark)} value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} /></div>
      </div>
      <div className="flex justify-end">
        <button onClick={save} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all hover:scale-105 ${saved ? isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700' : isDark ? 'bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9] text-white' : 'bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white'}`}>
          {saved ? <><CheckCircle className="w-4 h-4" /> Saved</> : <><Save className="w-4 h-4" /> Save Changes</>}
        </button>
      </div>
    </div>
  )
}

const TabPreferences: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const user = useAuthStore(s => s.user); const updateUser = useAuthStore(s => s.updateUser); const toggleTheme = useThemeStore(s => s.toggleTheme)
  const theme = user?.preferences?.theme ?? (isDark ? 'dark' : 'light')
  const units = user?.preferences?.units ?? 'metric'
  const notifs = user?.preferences?.notifications ?? false
  const setTheme = (t: 'light' | 'dark') => { updateUser({ preferences: { theme: t, units, notifications: notifs } }); if ((t === 'dark') !== isDark) toggleTheme() }
  const setUnits = (u: 'metric' | 'imperial') => updateUser({ preferences: { theme, units: u, notifications: notifs } })
  const setNotifs = (n: boolean) => updateUser({ preferences: { theme, units, notifications: n } })
  const row = `flex items-center justify-between p-4 rounded-xl border ${isDark ? 'border-[#3f4a68]' : 'border-gray-200'}`
  return (
    <div className="space-y-4">
      <div className={card(isDark)}>
        <div className={`font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Display</div>
        <div className="space-y-3">
          <div className={row}>
            <div className="flex items-center gap-3">{isDark ? <Moon className="w-4 h-4 text-purple-400" /> : <Sun className="w-4 h-4 text-yellow-500" />}<div><div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Theme</div><div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Current: {theme}</div></div></div>
            <div className={`flex p-1 rounded-lg gap-1 ${isDark ? 'bg-[#0a0e27]' : 'bg-gray-100'}`}>{(['light', 'dark'] as const).map(t => (<button key={t} onClick={() => setTheme(t)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${theme === t ? isDark ? 'bg-[#5ce1e5] text-white' : 'bg-[#0ea5e9] text-white' : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>{t === 'light' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}{t.charAt(0).toUpperCase() + t.slice(1)}</button>))}</div>
          </div>
          <div className={row}>
            <div className="flex items-center gap-3"><Globe className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} /><div><div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Units</div><div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Measurement system</div></div></div>
            <div className={`flex p-1 rounded-lg gap-1 ${isDark ? 'bg-[#0a0e27]' : 'bg-gray-100'}`}>{(['metric', 'imperial'] as const).map(u => (<button key={u} onClick={() => setUnits(u)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${units === u ? 'bg-[#10b981] text-white' : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>{u.charAt(0).toUpperCase() + u.slice(1)}</button>))}</div>
          </div>
        </div>
      </div>
      <div className={card(isDark)}>
        <div className={`font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Notifications</div>
        <div className="space-y-3">
          <div className={row}>
            <div className="flex items-center gap-3"><Bell className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} /><div><div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Email Notifications</div><div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Receive updates about your simulations</div></div></div>
            <Toggle checked={notifs} onChange={setNotifs} />
          </div>
          {notifs && (<div className={`p-4 rounded-xl border-l-4 border-cyan-500 ${isDark ? 'bg-cyan-500/10' : 'bg-cyan-50'}`}><div className={`text-sm font-semibold mb-1 ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>Email notifications enabled</div><div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>You can now email simulation results from the <strong>Data &amp; Exports</strong> tab.</div></div>)}
        </div>
      </div>
    </div>
  )
}

const TabSecurity: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [copied, setCopied] = useState(false); const [showKey, setShowKey] = useState(false)
  const API_KEY = 'sk_live_coolsim_abc123xyz789def456'
  const copyKey = () => { navigator.clipboard.writeText(API_KEY); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <div className="space-y-4">
      <div className={card(isDark)}>
        <div className="flex items-center gap-3 mb-5"><div className={`p-2 rounded-xl ${isDark ? 'bg-purple-500/20' : 'bg-purple-100'}`}><Lock className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-700'}`} /></div><div className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Change Password</div></div>
        <div className="space-y-3 mb-4">{[{ label: 'Current Password', key: 'current' }, { label: 'New Password', key: 'next' }, { label: 'Confirm New Password', key: 'confirm' }].map(({ label, key }) => (<div key={key}><label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{label}</label><input type="password" className={inp(isDark)} value={(pw as any)[key]} onChange={e => setPw(p => ({ ...p, [key]: e.target.value }))} /></div>))}</div>
        <button className={`w-full py-2.5 rounded-xl font-semibold transition-all hover:scale-105 ${isDark ? 'bg-gradient-to-r from-[#5ce1e5] to-[#0ea5e9] text-white' : 'bg-gradient-to-r from-[#0ea5e9] to-[#5ce1e5] text-white'}`}>Update Password</button>
      </div>
      <div className={card(isDark)}>
        <div className="flex items-center gap-3 mb-5"><div className={`p-2 rounded-xl ${isDark ? 'bg-yellow-500/20' : 'bg-yellow-100'}`}><Key className={`w-5 h-5 ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`} /></div><div className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>API Key</div></div>
        <div className={`flex items-center gap-2 p-3 rounded-xl mb-3 ${isDark ? 'bg-[#0a0e27]' : 'bg-gray-50'}`}><code className={`flex-1 text-sm font-mono truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{showKey ? API_KEY : '••••••••••••••••••••••••••••••••'}</code><button onClick={() => setShowKey(!showKey)} className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-[#27304a] text-gray-300' : 'bg-gray-200 text-gray-600'}`}>{showKey ? 'Hide' : 'Show'}</button><button onClick={copyKey} className={`p-1.5 rounded-lg transition-all ${copied ? isDark ? 'text-green-400' : 'text-green-600' : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</button></div>
        <div className={`flex items-start gap-2 p-3 rounded-xl text-xs mb-3 ${isDark ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'}`}><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />Never share your API key. Regenerate immediately if exposed.</div>
        <button className={`w-full py-2.5 rounded-xl font-semibold transition-all hover:scale-105 ${isDark ? 'bg-[#27304a] text-gray-300 hover:bg-[#3f4a68]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Regenerate API Key</button>
      </div>
      <div className={`rounded-2xl p-6 border ${isDark ? 'bg-red-900/10 border-red-800/30' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center gap-3 mb-4"><AlertTriangle className={`w-5 h-5 ${isDark ? 'text-red-400' : 'text-red-600'}`} /><div className={`font-bold ${isDark ? 'text-red-400' : 'text-red-700'}`}>Danger Zone</div></div>
        <button className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${isDark ? 'bg-[#27304a] text-red-400 hover:bg-red-500/10' : 'bg-white text-red-600 hover:bg-red-50'}`}><div className="flex items-center gap-3"><Trash2 className="w-4 h-4" /><div className="text-left"><div className="font-semibold text-sm">Delete Account</div><div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Permanently delete your account and all data</div></div></div><ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  )
}

const TabDataExports: React.FC<{ isDark: boolean; userId: string; userEmail: string; notificationsEnabled: boolean }> = ({
  isDark, userId, userEmail, notificationsEnabled,
}) => {
  const [simulations, setSimulations] = useState<SimulationWithResults[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [emailStatus, setEmailStatus] = useState<Record<number, 'idle' | 'sending' | 'sent'>>({})

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    getUserSimulations(userId).then(r => { if (r.success && r.data) setSimulations(r.data.simulations || []) }).finally(() => setLoading(false))
  }, [userId])

  const completed = simulations.filter(s => s.status === 'completed' && s.result?.result_data)

  const setBusyKey = (k: string, v: boolean) => setBusy(p => ({ ...p, [k]: v }))

  // Single JSON of all simulations
  const exportAllJson = () => {
    setBusyKey('json', true)
    try {
      const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), user_email: userEmail, simulations }, null, 2)], { type: 'application/json' })
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
      a.download = `coolsim_all_${new Date().toISOString().slice(0, 10)}.json`; a.click()
    } finally { setBusyKey('json', false) }
  }

  // ZIP of individual JSON files
  const exportJsonZip = async () => {
    setBusyKey('jsonzip', true)
    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip(); const folder = zip.folder('coolsim_json')!
      simulations.forEach(s => {
        const safe = s.name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50)
        folder.file(`${safe}_${s.id}.json`, JSON.stringify({ id: s.id, name: s.name, simulation_type: s.simulation_type, status: s.status, created_at: s.created_at, result: s.result ?? null }, null, 2))
      })
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
      a.download = `coolsim_json_${new Date().toISOString().slice(0, 10)}.zip`; a.click()
      const { logActivity } = await import('../services/activityService')
      await logActivity(userId, 'report_exported_zip', { metadata: { type: 'json', count: simulations.length } })
    } finally { setBusyKey('jsonzip', false) }
  }

  // ZIP of all PDFs
  const exportPdfZip = async () => {
    if (!completed.length) return
    setBusyKey('pdfzip', true)
    try {
      const JSZip = (await import('jszip')).default
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default
      const zip = new JSZip(); const folder = zip.folder('coolsim_reports')!

      for (const sim of completed) {
        if (!sim.result) continue
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
        const rd = sim.result.result_data ?? {}
        const metrics = rd?.results?.metrics ?? {}; const annual = rd?.results?.annual ?? rd?.summary ?? {}; const econ = rd?.results?.economics ?? {}

        // Cover page
        doc.setFillColor(26, 31, 58); doc.rect(0, 0, 210, 297, 'F')
        doc.setFillColor(92, 225, 229); doc.rect(0, 0, 6, 297, 'F')
        doc.setFontSize(22); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold')
        doc.text('CoolSim Technical Report', 20, 50)
        doc.setFontSize(14); doc.setTextColor(92, 225, 229); doc.text(sim.name, 20, 65)
        doc.setFontSize(10); doc.setTextColor(200, 210, 230); doc.setFont('helvetica', 'normal')
        doc.text(`Type: ${sim.simulation_type?.toUpperCase()}`, 20, 80)
        doc.text(`Completed: ${sim.result.completed_at ? new Date(sim.result.completed_at).toLocaleString() : '—'}`, 20, 88)
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 96)

        // Metrics page
        doc.addPage()
        doc.setFillColor(26, 31, 58); doc.rect(0, 0, 210, 297, 'F')
        doc.setFontSize(14); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.text('Performance Metrics', 14, 20)
        const rows: [string, string][] = [
          ['PUE', String(metrics.pue ?? rd?.summary?.averagePUE ?? '—')],
          ['COP', String(metrics.averageCOP ?? rd?.summary?.averageCOP ?? '—')],
          ['WUE (L/kWh)', String(metrics.wue ?? '—')],
          ['Total Energy (kWh)', String(annual.energyConsumption_kWh ?? rd?.summary?.totalEnergy_kWh ?? '—')],
          ['Carbon (kg)', String(annual.carbonEmissions_kg ?? rd?.summary?.totalCarbonEmissions_kg ?? '—')],
          ['Annual Cost (USD)', String(annual.cost_USD ?? econ.opex_annual_USD ?? rd?.summary?.annualOpExUSD ?? '—')],
          ['NPV (USD)', String(econ.npv_USD ?? '—')],
          ['Payback (yrs)', String(econ.paybackPeriod_years ?? rd?.summary?.paybackPeriodYears ?? '—')],
          ['Energy Consumed', `${sim.result.energy_consumed_kwh?.toFixed(2) ?? '—'} kWh`],
          ['Cost Savings', `${sim.result.cost_saving_percent?.toFixed(1) ?? '—'}%`],
        ].filter(([, v]) => v !== '—') as [string, string][]
        autoTable(doc, {
          startY: 28, head: [['Metric', 'Value']], body: rows, theme: 'grid', margin: { left: 14, right: 14 },
          styles: { fontSize: 9, cellPadding: 2.5, textColor: [220, 230, 245] },
          headStyles: { fillColor: [63, 74, 104], textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [20, 25, 50] }, tableLineColor: [63, 74, 104], tableLineWidth: 0.3,
        })
        const mlRec = rd?.mlRecommendation
        if (mlRec?.model_recommendation) {
          const y = (doc as any).lastAutoTable.finalY + 10
          doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(92, 225, 229); doc.text('ML Recommendation', 14, y)
          doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(220, 230, 245)
          doc.text(`Recommended: ${mlRec.model_recommendation}`, 14, y + 8)
          if (mlRec.why_this_is_recommended?.length) {
            const why = doc.splitTextToSize(mlRec.why_this_is_recommended.join(' '), 182)
            doc.text(why, 14, y + 16)
          }
        }
        const safe = sim.name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50)
        folder.file(`${safe}_${sim.id}.pdf`, doc.output('arraybuffer'))
      }

      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
      a.download = `coolsim_reports_${new Date().toISOString().slice(0, 10)}.zip`; a.click()
      const { logActivity } = await import('../services/activityService')
      await logActivity(userId, 'report_exported_zip', { metadata: { type: 'pdf', count: completed.length } })
    } finally { setBusyKey('pdfzip', false) }
  }

  // Email via Gmail compose
  const emailSim = async (sim: SimulationWithResults) => {
    if (!sim.result) return
    setEmailStatus(p => ({ ...p, [sim.id]: 'sending' }))
    try {
      const { generateSimulationPDF } = await import('../utils/pdfExport')
      generateSimulationPDF({
        simulation: { id: sim.id, name: sim.name, description: sim.description, simulation_type: sim.simulation_type, created_at: sim.created_at, status: sim.status },
        result: { energy_consumed_kwh: sim.result.energy_consumed_kwh ?? 0, cooling_efficiency: sim.result.cooling_efficiency ?? 0, cost_saving_percent: sim.result.cost_saving_percent ?? 0, runtime_minutes: sim.result.runtime_minutes ?? 0, completed_at: sim.result.completed_at, result_data: sim.result.result_data ?? {} },
      })
      const rd = sim.result.result_data ?? {}
      const metrics = rd?.results?.metrics ?? {}; const annual = rd?.results?.annual ?? rd?.summary ?? {}; const mlRec = rd?.mlRecommendation
      const body = [
        `Hi,`, ``, `Simulation results for: ${sim.name}`, ``,
        `Type: ${sim.simulation_type?.toUpperCase()}`,
        `Completed: ${sim.result.completed_at ? new Date(sim.result.completed_at).toLocaleString() : '—'}`, ``,
        `KEY METRICS`, `─────────────────────────────`,
        `PUE:              ${metrics.pue ?? rd?.summary?.averagePUE ?? '—'}`,
        `COP:              ${metrics.averageCOP ?? rd?.summary?.averageCOP ?? '—'}`,
        `Total Energy:     ${annual.energyConsumption_kWh ?? rd?.summary?.totalEnergy_kWh ?? '—'} kWh`,
        `Carbon Emissions: ${annual.carbonEmissions_kg ?? rd?.summary?.totalCarbonEmissions_kg ?? '—'} kg`,
        `Annual Cost:      $${annual.cost_USD ?? rd?.summary?.annualOpExUSD ?? '—'}`,
        `Cost Savings:     ${sim.result.cost_saving_percent?.toFixed(1) ?? '—'}%`, ``,
        ...(mlRec?.model_recommendation ? [`ML RECOMMENDATION: ${mlRec.model_recommendation}`, ``] : []),
        `NOTE: PDF report downloaded to your device — please attach before sending.`,
        ``, `— CoolSim Platform`,
      ].join('\n')
      const subject = encodeURIComponent(`CoolSim Report: ${sim.name}`)
      const bodyEnc = encodeURIComponent(body)
      // Open Gmail compose in new tab
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(userEmail)}&su=${subject}&body=${bodyEnc}`, '_blank', 'noopener,noreferrer')
      const { logActivity } = await import('../services/activityService')
      await logActivity(userId, 'report_emailed', { entity_id: String(sim.id), metadata: { name: sim.name } })
      setEmailStatus(p => ({ ...p, [sim.id]: 'sent' }))
      setTimeout(() => setEmailStatus(p => ({ ...p, [sim.id]: 'idle' })), 3000)
    } catch { setEmailStatus(p => ({ ...p, [sim.id]: 'idle' })) }
  }

  const btn = `flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed`

  return (
    <div className="space-y-4">
      <div className={card(isDark)}>
        <div className="flex items-center gap-3 mb-5">
          <div className={`p-2 rounded-xl ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}><Database className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-700'}`} /></div>
          <div><div className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Export All Data</div><div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{simulations.length} simulations · {completed.length} with results</div></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button onClick={exportAllJson} disabled={busy.json || !simulations.length} className={`${btn} ${isDark ? 'bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            <FileJson className="w-4 h-4 text-yellow-500" />{busy.json ? 'Exporting…' : 'All Data (JSON)'}
          </button>
          <button onClick={exportJsonZip} disabled={busy.jsonzip || !simulations.length} className={`${btn} ${isDark ? 'bg-[#27304a] text-gray-300 hover:bg-[#3f4a68] hover:text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            <Archive className="w-4 h-4 text-orange-500" />{busy.jsonzip ? 'Zipping…' : `JSONs ZIP (${simulations.length})`}
          </button>
          <button onClick={exportPdfZip} disabled={busy.pdfzip || !completed.length} className={`${btn} ${isDark ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30' : 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'}`}>
            <FileText className="w-4 h-4" />{busy.pdfzip ? 'Building ZIP…' : `PDFs ZIP (${completed.length})`}
          </button>
        </div>
        {(busy.pdfzip || busy.jsonzip) && (
          <div className={`mt-3 flex items-center gap-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <div className="w-3 h-3 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            Building ZIP archive — may take a moment for large datasets…
          </div>
        )}
      </div>

      <div className={card(isDark)}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-xl ${isDark ? 'bg-green-500/20' : 'bg-green-100'}`}><Send className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-700'}`} /></div>
          <div><div className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Email Simulation Results</div>
            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{notificationsEnabled ? `Opens Gmail compose to ${userEmail} · PDF auto-downloaded` : 'Enable Email Notifications in Preferences first'}</div></div>
        </div>
        {!notificationsEnabled ? (
          <div className={`p-3 rounded-xl text-sm ${isDark ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400' : 'bg-yellow-50 border border-yellow-200 text-yellow-700'}`}>
            Go to <strong>Preferences</strong> and enable <strong>Email Notifications</strong> to unlock this.
          </div>
        ) : loading ? (
          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loading…</div>
        ) : !completed.length ? (
          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No completed simulations to email.</div>
        ) : (
          <div className="space-y-2">
            {completed.map(sim => {
              const st = emailStatus[sim.id] ?? 'idle'
              return (
                <div key={sim.id} className={`flex items-center justify-between p-3 rounded-xl border ${isDark ? 'border-[#3f4a68] bg-[#0a0e27]' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="min-w-0 mr-3">
                    <div className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{sim.name}</div>
                    <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{sim.simulation_type?.toUpperCase()} · {sim.result?.completed_at ? new Date(sim.result.completed_at).toLocaleDateString() : '—'}</div>
                  </div>
                  <button onClick={() => emailSim(sim)} disabled={st === 'sending'}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${st === 'sent' ? isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700' : st === 'sending' ? isDark ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-100 text-gray-500' : isDark ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30' : 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'}`}>
                    {st === 'sent' ? <><CheckCircle className="w-3.5 h-3.5" /> Gmail Opened</> : st === 'sending' ? <><div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> Opening…</> : <><Send className="w-3.5 h-3.5" /> Email + PDF</>}
                  </button>
                </div>
              )
            })}
            <div className={`text-xs pt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Clicking "Email + PDF" downloads the PDF and opens Gmail compose pre-filled with results. Attach the PDF before sending.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export const Profile: React.FC = () => {
  const user = useAuthStore(s => s.user)
  const isDark = useThemeStore(s => s.isDark)
  const [activeTab, setActiveTab] = useState('profile')
  const notificationsEnabled = user?.preferences?.notifications ?? false

  const TABS = [
    { id: 'profile',     label: 'Profile',       icon: UserIcon  },
    { id: 'preferences', label: 'Preferences',   icon: Palette   },
    { id: 'security',    label: 'Security',       icon: Shield    },
    { id: 'exports',     label: 'Data & Exports', icon: Database  },
  ]

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0a0e27]' : 'bg-gray-50'}`}>
      <Sidebar />
      <main className="lg:ml-64 p-6">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Account <span className={isDark ? 'text-[#5ce1e5]' : 'text-[#0ea5e9]'}>Settings</span></h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Manage your profile, preferences, security, and data exports.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="space-y-4">
            <div className={`rounded-2xl p-6 text-center border ${isDark ? 'bg-[#1a1f3a] border-[#3f4a68]' : 'bg-white border-gray-200'}`}>
              <div className={`w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-[#5ce1e5] to-[#8b5cf6]' : 'bg-gradient-to-br from-[#0ea5e9] to-[#5ce1e5]'}`}>
                {user?.profilePicture ? <img src={user.profilePicture} alt="" className="w-20 h-20 rounded-full object-cover" /> : <UserIcon className="w-10 h-10 text-white" />}
              </div>
              <div className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{user?.name || 'User'}</div>
              <div className={`text-xs mt-0.5 truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{user?.email}</div>
              {user?.organization && <div className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{user.organization}</div>}
              <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Active
              </div>
            </div>
            <nav className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-[#1a1f3a] border-[#3f4a68]' : 'bg-white border-gray-200'}`}>
              {TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all border-b last:border-b-0 ${isDark ? 'border-[#3f4a68]' : 'border-gray-100'} ${activeTab === id ? isDark ? 'bg-cyan-500/15 text-cyan-400' : 'bg-cyan-50 text-cyan-700' : isDark ? 'text-gray-400 hover:text-white hover:bg-[#27304a]' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
                  <Icon className="w-4 h-4 shrink-0" />{label}
                  {id === 'exports' && notificationsEnabled && <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-700'}`}>Email</span>}
                </button>
              ))}
            </nav>
          </div>
          <div className="lg:col-span-3">
            {activeTab === 'profile'     && <TabProfile isDark={isDark} />}
            {activeTab === 'preferences' && <TabPreferences isDark={isDark} />}
            {activeTab === 'security'    && <TabSecurity isDark={isDark} />}
            {activeTab === 'exports'     && <TabDataExports isDark={isDark} userId={user?.id ?? ''} userEmail={user?.email ?? ''} notificationsEnabled={notificationsEnabled} />}
          </div>
        </div>
      </main>
    </div>
  )
}
