import os
import time
import logging
import asyncio
from pathlib import Path
import psutil

from app.core.config import settings, SNAPSHOTS_DIR, RECORDINGS_DIR

logger = logging.getLogger("edgesentinel.storage_cleaner")


class StorageCleaner:
    def __init__(self, check_interval_hours: int = 6):
        self.check_interval_seconds = check_interval_hours * 3600
        self.task: asyncio.Task | None = None
        self.is_running = False

    def start(self):
        self.is_running = True
        self.task = asyncio.create_task(self._clean_loop())
        logger.info("Storage Quota Guard & Retention cleaner started.")

    def stop(self):
        self.is_running = False
        if self.task:
            self.task.cancel()

    async def _clean_loop(self):
        # Run immediately on start, then loop
        while self.is_running:
            try:
                self.run_clean()
            except Exception as e:
                logger.error(f"Error during storage clean run: {e}")

            await asyncio.sleep(self.check_interval_seconds)

    def run_clean(self):
        retention_days = getattr(settings, "SNAPSHOT_RETENTION_DAYS", 14)
        max_age_seconds = retention_days * 86400
        now = time.time()

        total_cleaned = 0
        bytes_freed = 0

        # 1. Clean aged files (> 14 days)
        for target_dir in [SNAPSHOTS_DIR, RECORDINGS_DIR]:
            p = Path(target_dir)
            if not p.exists():
                continue
            for item in p.iterdir():
                if item.is_file():
                    try:
                        mtime = item.stat().st_mtime
                        if (now - mtime) > max_age_seconds:
                            sz = item.stat().st_size
                            item.unlink(missing_ok=True)
                            total_cleaned += 1
                            bytes_freed += sz
                    except Exception:
                        pass

        # 2. Disk Quota check: if disk free is < 12%, clean oldest files until > 15%
        try:
            disk = psutil.disk_usage("/")
            free_percent = 100.0 - disk.percent
            if free_percent < 12.0:
                logger.warning(f"Disk storage critically low ({free_percent:.1f}% free). Running emergency quota cleanup...")
                all_files = []
                for target_dir in [RECORDINGS_DIR, SNAPSHOTS_DIR]:
                    p = Path(target_dir)
                    if p.exists():
                        all_files.extend([f for f in p.iterdir() if f.is_file()])

                # Sort by oldest first
                all_files.sort(key=lambda f: f.stat().st_mtime)
                for f in all_files[:100]:  # purge up to 100 oldest files per cycle
                    try:
                        sz = f.stat().st_size
                        f.unlink(missing_ok=True)
                        total_cleaned += 1
                        bytes_freed += sz
                    except Exception:
                        pass
        except Exception as disk_err:
            logger.warning(f"Failed to check disk usage: {disk_err}")

        if total_cleaned > 0:
            mb_freed = round(bytes_freed / (1024 * 1024), 2)
            logger.info(f"Storage clean cycle complete: Removed {total_cleaned} files, freed {mb_freed} MB.")


storage_cleaner = StorageCleaner()

