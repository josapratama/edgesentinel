#!/bin/bash
set -e

echo "========================================="
echo "   EdgeSentinel AI NVR & Security Hub    "
echo "========================================="

if command -v docker &> /dev/null; then
    echo "[+] Menjalankan dengan Docker Compose di Raspberry Pi / Linux..."
    docker compose up -d --build
    echo "[✓] EdgeSentinel Berhasil Berjalan!"
    echo "    Web Dashboard: http://localhost:3080"
    echo "    Backend API  : http://localhost:8000"
else
    echo "[-] Docker tidak ditemukan. Menjalankan Python & Bun lokal..."
fi

