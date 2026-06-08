#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
import sys
import time
import urllib.error
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from statistics import mean


@dataclass
class ProbeResult:
    ok: bool
    status_code: int | None
    latency_ms: float
    error: str | None = None


def percentile(values: list[float], q: float) -> float:
    if not values:
        return 0.0
    if len(values) == 1:
        return values[0]
    index = (len(values) - 1) * q
    lower = math.floor(index)
    upper = math.ceil(index)
    if lower == upper:
        return values[lower]
    weight = index - lower
    return values[lower] * (1 - weight) + values[upper] * weight


def make_request(url: str, timeout: float) -> ProbeResult:
    started = time.perf_counter()
    request = urllib.request.Request(
        url,
        method="GET",
        headers={
            "User-Agent": (
                "Mozilla/5.0 (X11; Linux x86_64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/135.0.0.0 Safari/537.36 PasosStressProbe/1.0"
            ),
            "Accept": "application/json, text/html;q=0.9, */*;q=0.8",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            _ = response.read()
            latency_ms = (time.perf_counter() - started) * 1000
            status_code = getattr(response, "status", None)
            return ProbeResult(ok=200 <= (status_code or 0) < 400, status_code=status_code, latency_ms=latency_ms)
    except urllib.error.HTTPError as exc:
        latency_ms = (time.perf_counter() - started) * 1000
        return ProbeResult(ok=False, status_code=exc.code, latency_ms=latency_ms, error=f"http_{exc.code}")
    except Exception as exc:  # pragma: no cover - defensive path for runtime probes
        latency_ms = (time.perf_counter() - started) * 1000
        return ProbeResult(ok=False, status_code=None, latency_ms=latency_ms, error=exc.__class__.__name__)


def run_probe(url: str, total_requests: int, concurrency: int, timeout: float) -> dict[str, object]:
    started = time.perf_counter()
    results: list[ProbeResult] = []
    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(make_request, url, timeout) for _ in range(total_requests)]
        for future in as_completed(futures):
            results.append(future.result())
    total_duration_ms = (time.perf_counter() - started) * 1000

    latencies = sorted(result.latency_ms for result in results)
    successes = [result for result in results if result.ok]
    errors = [result for result in results if not result.ok]
    statuses = Counter(str(result.status_code) if result.status_code is not None else "error" for result in results)
    error_kinds = Counter(result.error or "unknown" for result in errors)

    return {
        "url": url,
        "requests": total_requests,
        "concurrency": concurrency,
        "timeout_seconds": timeout,
        "success_count": len(successes),
        "failure_count": len(errors),
        "success_rate": round((len(successes) / total_requests) * 100, 2) if total_requests else 0.0,
        "duration_ms": round(total_duration_ms, 2),
        "throughput_rps": round(total_requests / (total_duration_ms / 1000), 2) if total_duration_ms else 0.0,
        "latency_ms": {
            "min": round(latencies[0], 2) if latencies else 0.0,
            "avg": round(mean(latencies), 2) if latencies else 0.0,
            "p50": round(percentile(latencies, 0.50), 2) if latencies else 0.0,
            "p95": round(percentile(latencies, 0.95), 2) if latencies else 0.0,
            "p99": round(percentile(latencies, 0.99), 2) if latencies else 0.0,
            "max": round(latencies[-1], 2) if latencies else 0.0,
        },
        "status_counts": dict(statuses),
        "error_counts": dict(error_kinds),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Lightweight read-only stress probe for Pasos.")
    parser.add_argument("--url", required=True, help="Absolute URL to probe")
    parser.add_argument("--requests", type=int, default=100, help="Total number of requests")
    parser.add_argument("--concurrency", type=int, default=10, help="Concurrent workers")
    parser.add_argument("--timeout", type=float, default=5.0, help="Per-request timeout in seconds")
    parser.add_argument("--output", help="Optional JSON output file")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    report = run_probe(
        url=args.url,
        total_requests=args.requests,
        concurrency=args.concurrency,
        timeout=args.timeout,
    )

    payload = json.dumps(report, indent=2, ensure_ascii=True)
    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(payload + "\n", encoding="utf-8")
    print(payload)
    return 0


if __name__ == "__main__":
    sys.exit(main())
