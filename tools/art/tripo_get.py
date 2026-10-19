"""Download a Tripo image task's pictures (the CLI's known bug: `tripo image` may end with "no image URLs in result",
or with `"urls": null`, or return while the task is still running).

  python tools/art/tripo_get.py <task id> <out dir> [--prefix A_r1_] [--wait 300]

Polls `tripo image get <id> --output-format json` until its status is `success` (or fails), then downloads every url
to <out dir>/<prefix><i>.png. Run it on the owner's machine, where the CLI is logged in (`tripo auth whoami`).
"""
import argparse, json, os, pathlib, subprocess, sys, time, urllib.request


def get(task):
    r = subprocess.run(["tripo", "image", "get", task, "--output-format", "json"], capture_output=True, text=True,
                       shell=os.name == "nt")  # (on Windows the npm shim is a .cmd, which only a shell runs)
    text = r.stdout.strip()
    start = text.find("{")
    if start < 0:
        raise RuntimeError(r.stdout + r.stderr)
    return json.loads(text[start:])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("task"); ap.add_argument("out")
    ap.add_argument("--prefix", default="")
    ap.add_argument("--wait", type=int, default=300, help="seconds to keep polling")
    a = ap.parse_args()
    end = time.time() + a.wait
    while True:
        info = get(a.task)
        status = info.get("status")
        if status == "success" and info.get("urls"):
            break
        if status in ("failed", "cancelled", "banned", "expired") or time.time() > end:
            sys.exit(f"task {a.task}: {status}")
        time.sleep(5)
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    for i, url in enumerate(info["urls"]):
        path = out / f"{a.prefix}{i}.png"
        urllib.request.urlretrieve(url, path)
        print("saved", path)


if __name__ == "__main__":
    main()
