import asyncio
import socket
import logging
from typing import Any

logger = logging.getLogger("edgesentinel.scanner")


def get_local_ip() -> str:
    """Gets the active local IPv4 address."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Does not actually connect, just resolves outbound route
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except Exception:
        return "192.168.100.184"
    finally:
        s.close()


async def check_port(ip: str, port: int, timeout: float = 0.6) -> bool:
    """Checks if a TCP port is open on the target IP."""
    try:
        conn = asyncio.open_connection(ip, port)
        reader, writer = await asyncio.wait_for(conn, timeout=timeout)
        writer.close()
        await writer.wait_closed()
        return True
    except Exception:
        return False


async def probe_ip(ip: str) -> dict[str, Any] | None:
    """Probes an IP for CCTV/RTSP and Hikvision ports."""
    # Check RTSP (554) and Hikvision SDK (8000) concurrently
    rtsp_task = check_port(ip, 554, timeout=0.7)
    hik_task = check_port(ip, 8000, timeout=0.7)
    onvif_task = check_port(ip, 80, timeout=0.5)

    is_rtsp, is_hik, is_web = await asyncio.gather(rtsp_task, hik_task, onvif_task)

    if not (is_rtsp or is_hik):
        return None

    device_type = "Generic RTSP CCTV / NVR"
    if is_hik:
        device_type = "Hikvision DVR / NVR"
    elif is_rtsp and is_web:
        device_type = "IP Camera / ONVIF Device"

    # Pre-generate channels for Hikvision or Generic RTSP
    channels = []
    for ch_num in range(1, 5):
        if is_hik:
            sub_url = f"rtsp://admin:PASSWORD@{ip}:554/Streaming/Channels/{ch_num}02"
            main_url = f"rtsp://admin:PASSWORD@{ip}:554/Streaming/Channels/{ch_num}01"
        else:
            sub_url = f"rtsp://admin:PASSWORD@{ip}:554/ch{ch_num}/sub"
            main_url = f"rtsp://admin:PASSWORD@{ip}:554/ch{ch_num}/main"

        channels.append({
            "channel": ch_num,
            "name": f"Kamera {ch_num}",
            "sub_stream_url": sub_url,
            "main_stream_url": main_url
        })

    return {
        "ip": ip,
        "device_type": device_type,
        "is_hikvision": is_hik,
        "rtsp_port": 554,
        "sdk_port": 8000 if is_hik else None,
        "channels": channels
    }


async def scan_lan_cctv(subnet_prefix: str | None = None) -> list[dict[str, Any]]:
    """
    Asynchronously scans the subnet (/24) for CCTV and Hikvision DVR/NVR devices.
    Returns list of discovered devices with channel profiles.
    """
    if not subnet_prefix:
        local_ip = get_local_ip()
        octets = local_ip.split(".")
        subnet_prefix = f"{octets[0]}.{octets[1]}.{octets[2]}"

    logger.info(f"Starting CCTV LAN scan on subnet {subnet_prefix}.0/24...")
    
    # Scan all 254 IPs concurrently in batches
    tasks = [probe_ip(f"{subnet_prefix}.{i}") for i in range(1, 255)]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    discovered = []
    for r in results:
        if isinstance(r, dict) and r is not None:
            discovered.append(r)

    logger.info(f"Scan complete. Discovered {len(discovered)} CCTV device(s).")
    return discovered

