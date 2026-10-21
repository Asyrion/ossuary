"""The Tripo API (api.tripo3d.ai) from a cloud session, on the owner's API key in TRIPO_API_KEY (never printed). Its
files come from tripo-data.rg1.data.tripo3d.com, which the environment's network policy must allow.

  python tools/art/tripo_api.py balance
  python tools/art/tripo_api.py image "<prompt>" <out.jpg>      # text to image (5 credits)
  python tools/art/tripo_api.py model <picture.jpg> <out.glb>  # image to 3D, textured (30 credits; some 500,000 triangles)

Each waits for its task and downloads what it made. The prompt rules are docs/assets.md's (under 1,000 characters).
"""
import json, os, sys, time, urllib.error, urllib.request, uuid

API = "https://api.tripo3d.ai/v2/openapi"
VERSION = "v2.5-20250123"


def _headers(kind="application/json"):
    return {"Authorization": "Bearer " + os.environ["TRIPO_API_KEY"], "Content-Type": kind}


def req(path, body=None):
    r = urllib.request.Request(API + path, method="POST" if body is not None else "GET", headers=_headers(),
                               data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(r, timeout=60) as f:
            return json.load(f)
    except urllib.error.HTTPError as e:
        return json.loads(e.read() or b"{}") | {"http": e.code}


def upload(path):
    b = uuid.uuid4().hex
    head = (f'--{b}\r\nContent-Disposition: form-data; name="file"; filename="{os.path.basename(path)}"\r\n'
            f'Content-Type: image/{"png" if path.endswith(".png") else "jpeg"}\r\n\r\n').encode()
    body = head + open(path, "rb").read() + f"\r\n--{b}--\r\n".encode()
    r = urllib.request.Request(API + "/upload", data=body, method="POST", headers=_headers(f"multipart/form-data; boundary={b}"))
    with urllib.request.urlopen(r, timeout=120) as f:
        return json.load(f)["data"]["image_token"]


def run(body, limit=1500):
    task = req("/task", body)
    if task.get("code") != 0:
        sys.exit(f"tripo: {task}")
    tid, end = task["data"]["task_id"], time.time() + limit
    while True:
        d = req(f"/task/{tid}")["data"]
        if d["status"] in ("success", "failed", "cancelled", "banned", "expired", "unknown") or time.time() > end:
            break
        time.sleep(6)
    if d["status"] != "success":
        sys.exit(f"tripo task {tid}: {d['status']}")
    print("task", tid)
    return d["output"]


def main():
    cmd = sys.argv[1]
    if cmd == "balance":
        print(json.dumps(req("/user/balance")["data"]))
    elif cmd == "image":
        out = run({"type": "text_to_image", "prompt": sys.argv[2]})
        urllib.request.urlretrieve(out["generated_image"], sys.argv[3])
    elif cmd == "model":
        tok = upload(sys.argv[2])
        ext = "png" if sys.argv[2].endswith(".png") else "jpg"
        out = run({"type": "image_to_model", "file": {"type": ext, "file_token": tok}, "model_version": VERSION,
                   "texture": True, "pbr": False})
        urllib.request.urlretrieve(out.get("pbr_model") or out["model"], sys.argv[3])
    else:
        sys.exit(__doc__)
    print("wrote", sys.argv[-1] if cmd != "balance" else "")


if __name__ == "__main__":
    main()
