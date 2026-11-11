# 🛡️ EdgeSentinel AI NVR & Vision Security Hub

**EdgeSentinel** adalah sistem NVR (Network Video Recorder) pintar berbasis **Edge Computer Vision AI** yang dirancang khusus untuk berjalan efisien 24/7 di **Raspberry Pi 4 / 5** maupun server lokal tanpa bergantung pada langganan cloud pihak ketiga.

Dilengkapi dengan antarmuka web monitoring modern, pendeteksi objek real-time (Orang, Mobil, Motor, Paket, Hewan), rekaman snapshot otomatis, serta integrasi alert instan ke WhatsApp melalui **[`wabridge`](https://github.com/josapratama/wabridge)**.

---

## ✨ Fitur Utama

- **Live Multi-Camera CCTV Grid**:
  - Monitoring multi-channel (tampilan 1x1, 2x2, 3x3).
  - Stream latensi rendah menggunakan MJPEG dengan AI Bounding Box overlay real-time.
  - Built-in simulator kamera (*Synthetic CCTV Feed*) untuk testing out-of-the-box tanpa kamera fisik.
- **Edge Vision AI Object Detection**:
  - Deteksi objek bergerak (*Person, Vehicle, Package/Delivery, Animal*).
  - Dioptimasi untuk CPU Raspberry Pi dengan FPS limit adaptif (3 - 15 FPS).
- **Security Events Timeline & Snapshot Gallery**:
  - Menyimpan otomatis bukti snapshot resolusi penuh saat terdeteksi objek mencurigakan.
  - Filter riwayat kejadian berdasarkan kamera dan jenis objek.
- **Automated WhatsApp Alert Rules**:
  - Atur peraturan alarm cerdas: tentukan kamera, jenis objek (contoh: *Hanya kirim alert jika ada "Person" di "Gerbang Depan"*), jam aktif (misal jam 22:00 - 05:00 WIB), dan nomor tujuan.
  - Terhubung langsung ke gateway **WABridge** dengan sistem anti-spam cooldown.
- **System Telemetry & Hardware Health**:
  - Pantau beban CPU, RAM, Disk, FPS, dan Uptime Raspberry Pi secara live.

---

## 🏛️ Arsitektur & Tech Stack

```text
EdgeSentinel/
├── backend/                  # Python 3.11 + FastAPI + OpenCV
│   ├── app/
│   │   ├── api/              # REST Endpoints (Cameras, Events, Rules, Streams, System)
│   │   ├── core/             # Configuration & Async SQLite Database
│   │   ├── models/           # SQLAlchemy Entities & Pydantic Schemas
│   │   └── services/         # Vision Detector, Camera Manager, & WABridge Alert Service
│   └── data/                 # SQLite DB & Event Snapshots Storage
│
├── frontend/                 # React 19 + TypeScript + Vite + Tailwind CSS 4
│   ├── src/
│   │   ├── components/       # Live Grid, Events Gallery, Rules Manager, Camera Modals
│   │   └── lib/              # API Client & Utilities
│   └── nginx.conf            # High-performance static web server & reverse proxy
│
└── docker-compose.yml        # Multi-container orchestration untuk Raspberry Pi / PC
```

---

## 🚀 Panduan Memulai Cepat (Quick Start)

### Menggunakan Docker Compose (Direkomendasikan di Raspberry Pi)

1. Pastikan Docker dan Docker Compose telah terpasang.
2. Clone dan masuk ke folder proyek:
   ```bash
   cd "project/edgesentinel"
   ```
3. Salin file environment:
   ```bash
   cp backend/.env.example backend/.env
   ```
4. Jalankan container:
   ```bash
   docker compose up -d --build
   ```
5. Buka dashboard di browser:
   - **Web Dashboard CCTV:** [http://localhost:3080](http://localhost:3080)
   - **Backend API & Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 📹 Format URL Kamera yang Didukung

Anda dapat menambahkan berbagai jenis input kamera di menu **Kamera Baru**:

| Jenis Kamera | Format URL Contoh | Keterangan |
|---|---|---|
| **Demo Simulator** | `demo://gate` | Simulasi video CCTV otomatis (cocok untuk testing tanpa kamera fisik) |
| **TP-Link Tapo** | `rtsp://username:password@192.168.1.50:554/stream1` | Stream utama resolusi tinggi |
| **Hikvision / Dahua** | `rtsp://admin:password@192.168.1.60:554/Streaming/Channels/101` | RTSP channel 1 |
| **Bardi / Tuya (ONVIF)** | `rtsp://admin:password@192.168.1.70:554/live/ch0` | Stream RTSP ONVIF |
| **Webcam USB (Pi)** | `/dev/video0` atau `http://localhost:8081` | USB camera lokal via V4L2 / Motion |

---

## 📲 Integrasi WhatsApp Alert (WABridge)

EdgeSentinel terhubung ke **[`wabridge`](https://github.com/josapratama/wabridge)** untuk mengirimkan pesan darurat saat event terdeteksi.

Format pesan WhatsApp otomatis:
```text
🚨 [EdgeSentinel AI Alert]

📹 Kamera: Gerbang Depan (Main Gate)
🔍 Objek Terdeteksi: PERSON (Akurasi: 88%)
⏰ Waktu: 08-11-2026 22:30:15 UTC
🎯 Peraturan: Peringatan Orang Jam Malam

Periksa live stream dan snapshot di dashboard EdgeSentinel.
```

---

## 📄 Lisensi
MIT License © 2026 EdgeSentinel Project.

