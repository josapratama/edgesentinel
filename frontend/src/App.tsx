import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './lib/api'
import { playSecuritySirenAlert } from './lib/sound'
import type { Camera, AlertRule } from './types'

// Layout & Reusable components
import { Header } from './components/layout/Header'
import { MobileNav } from './components/layout/MobileNav'

// Views & Modals
import { CameraGrid } from './components/cameras/CameraGrid'
import { CamerasListView } from './components/cameras/CamerasListView'
import { CameraModal } from './components/cameras/modal/CameraModal'
import { EventsView } from './components/events/EventsView'
import { RulesView } from './components/rules/RulesView'
import { RuleModal } from './components/rules/RuleModal'

export default function App() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'grid' | 'events' | 'rules' | 'cameras'>('grid')

  // Modals state
  const [cameraModalOpen, setCameraModalOpen] = useState(false)
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null)
  const [ruleModalOpen, setRuleModalOpen] = useState(false)
  const [selectedRule, setSelectedRule] = useState<AlertRule | null>(null)

  // Web Audio Siren Alert
  const [soundEnabled, setSoundEnabled] = useState(false)
  const prevEventsCount = useRef(0)

  // ── Queries ──────────────────────────────────────────────────────────────
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

  const { data: armingData } = useQuery({
    queryKey: ['arming-mode'],
    queryFn: api.getArmingMode,
    refetchInterval: 10000,
  })

  // Trigger siren alert on new incoming event if sound enabled
  useEffect(() => {
    if (events.length > prevEventsCount.current && prevEventsCount.current > 0) {
      if (soundEnabled && armingData?.mode !== 'disarmed') {
        playSecuritySirenAlert()
      }
    }
    prevEventsCount.current = events.length
  }, [events.length, soundEnabled, armingData?.mode])

  // ── Mutations ────────────────────────────────────────────────────────────
  const setArmingMutation = useMutation({
    mutationFn: api.setArmingMode,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['arming-mode'] })
    },
  })

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
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col pb-20 md:pb-6 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Command Bar */}
      <Header
        stats={stats || null}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onAddCamera={() => {
          setSelectedCamera(null)
          setCameraModalOpen(true)
        }}
        onRefresh={handleManualRefresh}
        isRefreshing={isRefreshingCameras}
        armingMode={armingData?.mode || 'always'}
        onChangeArmingMode={(mode) => setArmingMutation.mutate(mode)}
        soundAlarm={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'grid' && (
          <CameraGrid
            cameras={cameras}
            onEditCamera={(cam) => {
              setSelectedCamera(cam)
              setCameraModalOpen(true)
            }}
            onToggleDetection={(cam) => toggleCameraDetectionMutation.mutate(cam)}
          />
        )}

        {activeTab === 'events' && (
          <EventsView
            events={events}
            cameras={cameras}
            onDeleteEvent={(id) => deleteEventMutation.mutate(id)}
          />
        )}

        {activeTab === 'rules' && (
          <RulesView
            rules={rules}
            onAddRule={() => {
              setSelectedRule(null)
              setRuleModalOpen(true)
            }}
            onEditRule={(rule) => {
              setSelectedRule(rule)
              setRuleModalOpen(true)
            }}
            onDeleteRule={(id) => deleteRuleMutation.mutate(id)}
            onToggleActive={(rule) => toggleRuleActiveMutation.mutate(rule)}
          />
        )}

        {activeTab === 'cameras' && (
          <CamerasListView
            cameras={cameras}
            onEditCamera={(cam) => {
              setSelectedCamera(cam)
              setCameraModalOpen(true)
            }}
            onDeleteCamera={(id) => deleteCameraMutation.mutate(id)}
            onToggleActive={(cam) => toggleCameraActiveMutation.mutate(cam)}
          />
        )}
      </main>

      {/* Bottom Navigation for Mobile / Handheld devices */}
      <MobileNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        armingMode={armingData?.mode || 'always'}
        onChangeArmingMode={(mode) => setArmingMutation.mutate(mode)}
      />

      {/* Modals */}
      <CameraModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        initialData={selectedCamera}
        onSave={async (data) => {
          await saveCameraMutation.mutateAsync(data)
        }}
      />

      <RuleModal
        isOpen={ruleModalOpen}
        onClose={() => setRuleModalOpen(false)}
        initialData={selectedRule}
        onSave={async (data) => {
          await saveRuleMutation.mutateAsync(data)
        }}
      />
    </div>
  )
}
