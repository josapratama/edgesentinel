export type ConnectionStatus =
  | 'online'
  | 'offline'
  | 'authenticating'
  | 'auth_error'
  | 'encrypted_error'
  | 'fallback_demo'

export interface Camera {
  id: string
  name: string
  location: string
  stream_url: string
  is_active: boolean
  detection_enabled: boolean
  fps_limit: number
  status: 'online' | 'offline' | 'error'
  connection_status?: ConnectionStatus
  error_message?: string | null
  resolution?: string | null
  roi_polygon_json?: string | null
  created_at: string
  updated_at: string
}

export interface SecurityEvent {
  id: string
  camera_id: string
  camera_name: string
  object_class: string
  confidence: number
  snapshot_filename: string
  snapshot_url: string
  video_filename?: string | null
  video_url?: string | null
  is_loitering?: boolean
  bbox_json: string
  notified_whatsapp: boolean
  created_at: string
}

export interface AlertRule {
  id: string
  name: string
  camera_id: string | null
  object_classes: string
  min_confidence: number
  start_hour: number
  end_hour: number
  whatsapp_number: string
  cooldown_seconds: number
  is_active: boolean
  last_triggered_at: string | null
  created_at: string
}

export interface SystemStats {
  cpu_percent: number
  memory_percent: number
  memory_used_mb: number
  memory_total_mb: number
  disk_percent: number
  disk_free_gb: number
  active_cameras: number
  total_events_today: number
  uptime_seconds: number
}

export interface DiscoveredChannel {
  channel: number
  name: string
  sub_stream_url: string
  main_stream_url: string
}

export interface DiscoveredDevice {
  ip: string
  device_type: string
  is_hikvision: boolean
  rtsp_port: number
  sdk_port?: number | null
  channels: DiscoveredChannel[]
}

export interface ScanResponse {
  success: boolean
  scanned_subnet: string
  devices_found: number
  devices: DiscoveredDevice[]
}

export type ArmingMode = 'always' | 'night_only' | 'disarmed'
