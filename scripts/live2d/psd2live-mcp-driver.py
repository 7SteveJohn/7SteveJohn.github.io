# PSD2Live MCP 通用驱动：python mcp2.py <tool> '<args-json>'
import subprocess
import sys
import json
import threading
import queue
import time

BRIDGE = r'D:\live2d\psd2live_mcp_bridge.py'
proc = subprocess.Popen([sys.executable, BRIDGE], stdin=subprocess.PIPE,
                        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding='utf-8')
q = queue.Queue()

def reader():
    for line in proc.stdout:
        line = line.strip()
        if line:
            q.put(line)

threading.Thread(target=reader, daemon=True).start()

def send(obj):
    proc.stdin.write(json.dumps(obj) + '\n')
    proc.stdin.flush()

def recv(want_id, timeout=180):
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            line = q.get(timeout=1)
            if not line:
                continue
            msg = json.loads(line)
            if msg.get('id') == want_id:
                return msg
        except queue.Empty:
            continue
        except json.JSONDecodeError:
            continue
    return None

send({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {
    "protocolVersion": "2024-11-05", "capabilities": {},
    "clientInfo": {"name": "zcode-driver", "version": "1.0"}}})
init = recv(1, 120)
if not init:
    print('初始化失败')
    sys.exit(1)
send({"jsonrpc": "2.0", "method": "notifications/initialized"})

tool = sys.argv[1]
args = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
send({"jsonrpc": "2.0", "id": 2, "method": "tools/call",
      "params": {"name": tool, "arguments": args}})
r = recv(2, 300)
if r is None:
    print('TIMEOUT')
    sys.exit(1)
if 'error' in r:
    print('ERROR:', json.dumps(r['error'], ensure_ascii=False)[:500])
else:
    res = r['result']
    if res.get('isError'):
        print('TOOL ERROR:', json.dumps(res, ensure_ascii=False)[:800])
    else:
        full = ''
        for c in res.get('content', []):
            if c.get('type') == 'text':
                full += c['text']
                print(c['text'][:800])
            elif c.get('type') == 'image':
                import base64
                out = sys.argv[3] if len(sys.argv) > 3 else 'D:/HTML/Temp/mcp-view.png'
                open(out, 'wb').write(base64.b64decode(c['data']))
                print('IMAGE →', out)
        if len(full) > 7500:
            open('D:/HTML/Temp/mcp-last-full.json', 'w', encoding='utf-8').write(full)
            print('…全文 (%d chars) → D:/HTML/Temp/mcp-last-full.json' % len(full))
