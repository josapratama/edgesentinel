import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './lib/api'
import type { Camera, AlertRule } from './types'
import { Navbar } from './components/Navbar'
import { CameraCard } from './components/CameraCard'
import { EventsView } from './components/EventsView'
import { RulesView } from './components/RulesView'
import { CamerasView } from './components/CamerasView'
import { CameraModal } from './components/CameraModal'
import { RuleModal } from './components/RuleModal'
import { LayoutGrid, Grid2X2, Square, Shield } from 'lucide-react'

export default function App() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'grid' | 'events' | 'rules' | 'cameras'>('grid')
  const [gridColumns, setGridColumns] = useState<1 | 2 | 3>(2)

  // Modals state
  const [cameraModalOpen, setCameraModalOpen] = useState(false)
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null)

  const [ruleModalOpen, setRuleModalOpen] = useState(false)
  const [selectedRule, setSelectedRule] = useState<AlertRule | null>(null)

  // Queries
  const { data: stats } = useQuery({
    queryKey: ['system-stats'],
    queryFn: api.getStats,
    refetchInterval: 3000,
  })

  const { data: cameras = [], isFetching: isRefreshingCameras } = useQuery({
    queryKey: ['cameras'],
    queryFn: api.getCameras,
    refetchInterval: 6000,
  })

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => api.getEvents(),
    refetchInterval: 5000,
  })

  const { data: rules = [] } = useQuery({
    queryKey: ['rules'],
    queryFn: api.getRules,
  })

  // Mutations
  const saveCameraMutation = useMutation({
    mutationFn: (data: Partial<Camera>) => {
      if (selectedCamera) {
        return api.updateCamera(selectedCamera.id, data)
      }
      return api.createCamera(data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cameras'] })
      void queryClient.invalidateQueries({ queryKey: ['system-stats'] })
    },
  })

  const deleteCameraMutation = useMutation({
    mutationFn: api.deleteCamera,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cameras'] })
      void queryClient.invalidateQueries({ queryKey: ['system-stats'] })
    },
  })

  const toggleCameraDetectionMutation = useMutation({
    mutationFn: (cam: Camera) =>
      api.updateCamera(cam.id, { detection_enabled: !cam.detection_enabled }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cameras'] })
    },
  })

  const toggleCameraActiveMutation = useMutation({
    mutationFn: (cam: Camera) =>
      api.updateCamera(cam.id, { is_active: !cam.is_active }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cameras'] })
    },
  })

  const saveRuleMutation = useMutation({
    mutationFn: (data: Partial<AlertRule>) => {
      if (selectedRule) {
        return api.updateRule(selectedRule.id, data)
      }
      return api.createRule(data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rules'] })
    },
  })

  const deleteRuleMutation = useMutation({
    mutationFn: api.deleteRule,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rules'] })
    },
  })

  const toggleRuleActiveMutation = useMutation({
    mutationFn: (rule: AlertRule) =>
      api.updateRule(rule.id, { is_active: !rule.is_active }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rules'] })
    },
  })

  const deleteEventMutation = useMutation({
    mutationFn: api.deleteEvent,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })

  const handleManualRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['cameras'] })
    void queryClient.invalidateQueries({ queryKey: ['system-stats'] })
    void queryClient.invalidateQueries({ queryKey: ['events'] })
    void queryClient.invalidateQueries({ queryKey: ['rules'] })
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col">
      <Navbar
        stats={stats || null}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onAddCamera={() => {
          setSelectedCamera(null)
          setCameraModalOpen(true)
        }}
        onRefresh={handleManualRefresh}
        isRefreshing={isRefreshingCameras}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {/* Tab 1: Live CCTV Grid View */}
        {activeTab === 'grid' && (
          <div className="space-y-4">
            {/* Grid Controls Bar */}
            <div className="flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-900/60 px-4 py-2.5 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-semibold text-slate-200">
                  Monitoring {cameras.filter((c) => c.is_active).length} Kamera Aktif
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 hidden sm:inline">Layout Tampilan:</span>
                <div className="flex rounded-xl border border-slate-800 bg-slate-950 p-1">
                  <button
                    onClick={() => setGridColumns(1)}
                    title="1 Kolom"
                    className={`rounded-lg p-1.5 transition-colors ${
                      gridColumns === 1 ? 'bg-slate-800 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Square className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setGridColumns(2)}
                    title="2 Kolom (Default)"
                    className={`rounded-lg p-1.5 transition-colors ${
                      gridColumns === 2 ? 'bg-slate-800 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Grid2X2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setGridColumns(3)}
                    title="3 Kolom"
                    className={`rounded-lg p-1.5 transition-colors ${
                      gridColumns === 3 ? 'bg-slate-800 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Cameras Grid */}
            {cameras.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 py-20 text-center">
                <Shield className="h-12 w-12 text-slate-600 mb-3" />
                <h3 className="text-sm font-semibold text-slate-200">Belum Ada Saluran Kamera</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mb-4">
                  Hubungkan RTSP IP camera, webcam USB, atau gunakan simulator demo untuk mulai memantau.
                </p>
                <button
                  onClick={() => {
                    setSelectedCamera(null)
                    setCameraModalOpen(true)
                  }}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
                >
                  + Tambah Kamera
                </button>
              </div>
            ) : (
              <div
                className={`grid gap-4 ${
                  gridColumns === 1
                    ? 'grid-cols-1'
                    : gridColumns === 2
                    ? 'grid-cols-1 md:grid-cols-2'
                    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                }`}
              >
                {cameras.map((cam) => (
                  <CameraCard
                    key={cam.id}
                    camera={cam}
                    onEdit={(c) => {
                      setSelectedCamera(c)
                      setCameraModalOpen(true)
                    }}
                    onToggleDetection={(c) => toggleCameraDetectionMutation.mutate(c)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Security Events Gallery */}
        {activeTab === 'events' && (
          <EventsView
            events={events}
            cameras={cameras}
            onDeleteEvent={(id) => deleteEventMutation.mutate(id)}
          />
        )}

        {/* Tab 3: WhatsApp Alert Rules */}
        {activeTab === 'rules' && (
          <RulesView
            rules={rules}
            onAddRule={() => {
              setSelectedRule(null)
              setRuleModalOpen(true)
            }}
            onEditRule={(r) => {
              setSelectedRule(r)
              setRuleModalOpen(true)
            }}
            onDeleteRule={(id) => deleteRuleMutation.mutate(id)}
            onToggleActive={(r) => toggleRuleActiveMutation.mutate(r)}
          />
        )}

        {/* Tab 4: Cameras Management */}
        {activeTab === 'cameras' && (
          <CamerasView
            cameras={cameras}
            onAddCamera={() => {
              setSelectedCamera(null)
              setCameraModalOpen(true)
            }}
            onEditCamera={(c) => {
              setSelectedCamera(c)
              setCameraModalOpen(true)
            }}
            onDeleteCamera={(id) => deleteCameraMutation.mutate(id)}
            onToggleActive={(c) => toggleCameraActiveMutation.mutate(c)}
          />
        )}
      </main>

      {/* Camera Add/Edit Modal */}
      <CameraModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        initialData={selectedCamera}
        onSave={async (data) => {
          await saveCameraMutation.mutateAsync(data)
        }}
      />

      {/* Rule Add/Edit Modal */}
      <RuleModal
        isOpen={ruleModalOpen}
        onClose={() => setRuleModalOpen(false)}
        initialData={selectedRule}
        cameras={cameras}
        onSave={async (data) => {
          await saveRuleMutation.mutateAsync(data)
        }}
      />
    </div>
  )
}
