# EdgeSentinel Quick Start (Windows)
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   EdgeSentinel AI NVR & Security Hub    " -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan

if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
    Write-Host "[+] Menjalankan dengan Docker Compose..." -ForegroundColor Yellow
    docker-compose up -d --build
    Write-Host "[✓] EdgeSentinel Aktif!" -ForegroundColor Green
    Write-Host "    Web Dashboard: http://localhost:3080" -ForegroundColor Cyan
    Write-Host "    Backend API  : http://localhost:8000" -ForegroundColor Cyan
} else {
    Write-Host "Docker tidak ditemukan. Silakan jalankan backend dan frontend manual." -ForegroundColor Red
}

