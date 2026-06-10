#!/usr/bin/env python3
import time
import urllib.request
import urllib.error
import sys

URL = "https://staging-api.artha.systems/health"
DELAY = 0.5  # 500ms delay to respect rate limit

print(f"Starting continuous ping of {URL}")
print(f"Delay: {DELAY}s between requests. Press Ctrl+C to stop.")
print("-" * 60)

total = 0
success = 0
rate_limited = 0
failed = 0

try:
    while True:
        total += 1
        start = time.time()
        status_code = None
        error_msg = None
        
        try:
            req = urllib.request.Request(
                URL, 
                headers={'User-Agent': 'Artha-Ping-Script'}
            )
            with urllib.request.urlopen(req, timeout=3) as response:
                status_code = response.getcode()
        except urllib.error.HTTPError as e:
            status_code = e.code
        except Exception as e:
            error_msg = str(e)

        elapsed = (time.time() - start) * 1000

        if status_code is not None:
            if status_code in [200, 401]:
                success += 1
                status_str = f"\033[92m{status_code} OK\033[0m"
            elif status_code == 429:
                rate_limited += 1
                status_str = f"\033[93m429 Rate Limited\033[0m"
            else:
                failed += 1
                status_str = f"\033[91m{status_code} Error\033[0m"
        else:
            failed += 1
            status_str = f"\033[91mConnection Failed\033[0m"

        print(f"[{total}] {status_str} | Time: {elapsed:.1f}ms" + (f" | Error: {error_msg}" if error_msg else ""))
        sys.stdout.flush()

        time.sleep(DELAY)

except KeyboardInterrupt:
    print("\n" + "="*60)
    print("Ping summary:")
    print(f"  Total Requests: {total}")
    if total > 0:
        divisor = total
        # pyrefly: ignore [division-by-zero]
        print(f"  Success (200/401): {success} ({success/divisor*100:.1f}%)")
        # pyrefly: ignore [division-by-zero]
        print(f"  Rate Limited (429): {rate_limited} ({rate_limited/divisor*100:.1f}%)")
        # pyrefly: ignore [division-by-zero]
        print(f"  Failed/Down: {failed} ({failed/divisor*100:.1f}%)")
    print("="*60)
