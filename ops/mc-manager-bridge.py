#!/usr/bin/env python3
"""Restricted host-side bridge for one Minecraft systemd unit.

The bridge accepts one JSON object per connection:
  {"action":"status|start|stop|restart|kill"}

The unit name and the systemd scope come from the bridge environment, never
from the client request. Install/run this on the host, not in the Docker
container.
"""

import json
import os
import re
import shutil
import signal
import socketserver
import subprocess
import time
import threading
from pathlib import Path


UNIT_NAME = os.environ.get("MC_SERVICE_NAME", "minecraft.service")
SOCKET_PATH = os.environ.get("MC_CONTROL_SOCKET", "/run/mcmanager/control.sock")
SOCKET_GROUP = os.environ.get("MC_SOCKET_GROUP", "")
SYSTEMCTL_SCOPE = os.environ.get("MC_SYSTEMCTL_SCOPE", "system")
COMMAND_TIMEOUT = int(os.environ.get("MC_CONTROL_TIMEOUT_SECONDS", "35"))
ALLOWED_ACTIONS = {"status", "start", "stop", "restart", "kill"}
UNIT_PATTERN = re.compile(r"^[A-Za-z0-9_.@:-]+\.service$")


def systemctl_prefix():
    if SYSTEMCTL_SCOPE not in {"system", "user"}:
        raise RuntimeError("MC_SYSTEMCTL_SCOPE must be 'system' or 'user'")
    return ["systemctl"] if SYSTEMCTL_SCOPE == "system" else ["systemctl", "--user"]


def run_systemctl(action, *extra):
    command = systemctl_prefix() + [action, UNIT_NAME, *extra]
    result = subprocess.run(
        command,
        check=False,
        capture_output=True,
        text=True,
        timeout=COMMAND_TIMEOUT,
    )
    if result.returncode != 0:
        message = (result.stderr or result.stdout or "systemctl failed").strip()
        raise RuntimeError(message[:500])
    return result.stdout


def read_status():
    properties = "ActiveState,SubState,MainPID,ActiveEnterTimestampMonotonic"
    output = run_systemctl("show", f"--property={properties}", "--no-pager")
    values = {}
    for line in output.splitlines():
        if "=" in line:
            key, value = line.split("=", 1)
            values[key] = value

    main_pid = int(values.get("MainPID", "0") or "0")
    uptime = 0
    enter_micros = int(values.get("ActiveEnterTimestampMonotonic", "0") or "0")
    if values.get("ActiveState") in {"active", "activating", "deactivating"} and enter_micros > 0:
        uptime = max(0, int((time.monotonic_ns() // 1000 - enter_micros) / 1_000_000))

    cpu_percent = None
    memory_bytes = None
    if main_pid > 0:
        ps = subprocess.run(
            ["ps", "-p", str(main_pid), "-o", "%cpu=,rss="],
            check=False,
            capture_output=True,
            text=True,
            timeout=5,
        )
        fields = ps.stdout.strip().split()
        if len(fields) >= 2:
            try:
                # ps reports aggregate CPU across cores; normalize to the same
                # 0..100-ish scale used by the manager's local PID metrics.
                cpu_percent = float(fields[0]) / max(1, os.cpu_count() or 1)
                memory_bytes = int(fields[1]) * 1024
            except ValueError:
                pass

    status = {
        "activeState": values.get("ActiveState", "unknown"),
        "subState": values.get("SubState", "unknown"),
        "mainPid": main_pid or None,
        "uptime": uptime,
    }
    if cpu_percent is not None:
        status["cpuPercent"] = cpu_percent
    if memory_bytes is not None:
        status["memoryBytes"] = memory_bytes
    return status


def execute(action):
    if action == "status":
        return {"ok": True, "status": read_status()}

    if action in {"start", "stop", "restart"}:
        run_systemctl(action)
        return {"ok": True, "message": f"{action} completed for {UNIT_NAME}"}

    # Force-stop is deliberately fixed to the configured unit's main process.
    if action == "kill":
        run_systemctl("kill", "--kill-who=main", "--signal=SIGKILL")
        return {"ok": True, "message": f"main process killed for {UNIT_NAME}"}

    raise RuntimeError("Unsupported action")


class BridgeHandler(socketserver.StreamRequestHandler):
    def handle(self):
        try:
            line = self.rfile.readline(8192)
            if not line:
                return
            request = json.loads(line.decode("utf-8"))
            action = request.get("action") if isinstance(request, dict) else None
            if action not in ALLOWED_ACTIONS:
                raise RuntimeError("Unsupported or missing action")
            response = execute(action)
        except Exception as error:
            response = {"ok": False, "error": str(error)[:500]}

        self.wfile.write((json.dumps(response, separators=(",", ":")) + "\n").encode("utf-8"))
        self.wfile.flush()


class ThreadedUnixServer(socketserver.ThreadingMixIn, socketserver.UnixStreamServer):
    daemon_threads = True


def prepare_socket():
    if not UNIT_PATTERN.match(UNIT_NAME):
        raise RuntimeError("MC_SERVICE_NAME must be a single .service unit name")
    if shutil.which("systemctl") is None:
        raise RuntimeError("systemctl was not found on the host")

    socket_file = Path(SOCKET_PATH)
    socket_file.parent.mkdir(parents=True, exist_ok=True)
    if socket_file.exists():
        if not socket_file.is_socket():
            raise RuntimeError(f"Refusing to overwrite non-socket path: {SOCKET_PATH}")
        socket_file.unlink()


def main():
    prepare_socket()
    server = ThreadedUnixServer(SOCKET_PATH, BridgeHandler)
    os.chmod(SOCKET_PATH, 0o660)
    if SOCKET_GROUP:
        import grp

        os.chown(SOCKET_PATH, -1, grp.getgrnam(SOCKET_GROUP).gr_gid)

    def shutdown(signum, _frame):
        threading.Thread(target=server.shutdown, daemon=True).start()

    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)
    print(f"mc-manager-bridge listening on {SOCKET_PATH} for {UNIT_NAME}", flush=True)
    try:
        server.serve_forever()
    finally:
        server.server_close()
        try:
            os.unlink(SOCKET_PATH)
        except FileNotFoundError:
            pass


if __name__ == "__main__":
    main()
