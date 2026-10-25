# Shizuku .mtn（Cubism2 专业手调关键帧）→ 7steve 可用的 .motion3.json（Cubism5）
# 只保留 7steve 存在的标准参数，其余（手臂/她的专属发参数）剥除；专业时间曲线原样保留
import json
import os

SRC = 'D:/HTML/assets/vendor/live2d/model/shizuku/mtn'
DST = 'D:/HTML/assets/vendor/live2d/model/7steve'
FPS = 30.0

# Cubism2 参数 ID → 7steve 的参数 ID（cdi3.json 里那 20 个）
MAP = {
    'PARAM_ANGLE_X': 'ParamAngleX',
    'PARAM_ANGLE_Y': 'ParamAngleY',
    'PARAM_ANGLE_Z': 'ParamAngleZ',
    'PARAM_EYE_L_OPEN': 'ParamEyeLOpen',
    'PARAM_EYE_R_OPEN': 'ParamEyeROpen',
    'PARAM_EYE_BALL_X': 'ParamEyeBallX',
    'PARAM_EYE_BALL_Y': 'ParamEyeBallY',
    'PARAM_BROW_L_Y': 'ParamBrowLY',
    'PARAM_BROW_R_Y': 'ParamBrowRY',
    'PARAM_MOUTH_FORM': 'ParamMouthForm',
    'PARAM_MOUTH_OPEN_Y': 'ParamMouthOpenY',
    'PARAM_BODY_ANGLE_X': 'ParamBodyAngleX',
    'PARAM_BODY_ANGLE_Y': 'ParamBodyAngleY',
    'PARAM_BODY_ANGLE_Z': 'ParamBodyAngleZ',
    'PARAM_BREATH': 'ParamBreath',
}
# 7steve 的身体前倾/前后发是物理输出或无对应源，不映射（剥除）

def parse_mtn(path):
    fps = FPS
    curves = []
    for line in open(path, encoding='utf-8', errors='replace'):
        line = line.strip()
        if line.startswith('$fps='):
            fps = float(line.split('=')[1])
        elif '=' in line and not line.startswith('#') and not line.startswith('$'):
            pid, _, vals = line.partition('=')
            parts = [p for p in vals.split(',') if p.strip() != '']
            try:
                nums = [float(p) for p in parts]
            except ValueError:
                continue
            curves.append((pid.strip(), nums, fps))
    return curves

def to_motion(curves, min_step=None):
    """逐帧采样 → 线性段 motion3；值不变的帧合并（文件瘦身，曲线形状不变）"""
    out = []
    seg_total = pt_total = 0
    for pid, nums, fps in curves:
        target = MAP.get(pid)
        if not target:
            continue
        dt = 1.0 / fps
        # 合并平台段：只有值变化时才落点（阈值 0.002，肉眼不可见差）
        keys = []
        for i, v in enumerate(nums):
            if not keys or abs(v - keys[-1][1]) > 0.002 or i == len(nums) - 1:
                keys.append((round(i * dt, 4), round(v, 4)))
        if len(keys) == 1:
            keys.append((round((len(nums) - 1) * dt, 4), keys[0][1]))
        segs = [keys[0][0], keys[0][1]]
        for t, v in keys[1:]:
            segs.extend([0, t, v])
        out.append({"Target": "Parameter", "Id": target, "Segments": segs})
        seg_total += len(keys) - 1
        pt_total += len(keys)
    duration = max((len(nums) - 1) / fps for _, nums, fps in curves) if curves else 1.0
    return {
        "Version": 3,
        "Meta": {"Duration": round(duration, 4), "Fps": fps, "Loop": True,
                 "AreBeziersRestricted": True, "CurveCount": len(out),
                 "TotalSegmentCount": seg_total, "TotalPointCount": pt_total},
        "Curves": out
    }, duration

JOBS = [
    ('idle_00', 'shizuku_idle_00'), ('idle_01', 'shizuku_idle_01'), ('idle_02', 'shizuku_idle_02'),
    ('flickHead_00', 'shizuku_flick_00'), ('flickHead_01', 'shizuku_flick_01'), ('flickHead_02', 'shizuku_flick_02'),
    ('tapBody_00', 'shizuku_tap_00'), ('tapBody_01', 'shizuku_tap_01'), ('tapBody_02', 'shizuku_tap_02'),
    ('shake_00', 'shizuku_shake_00'), ('shake_01', 'shizuku_shake_01'),
]
for src, dst in JOBS:
    p = os.path.join(SRC, src + '.mtn')
    if not os.path.exists(p):
        print('跳过（无源文件）:', src)
        continue
    curves = parse_mtn(p)
    mo, dur = to_motion(curves)
    kept = mo['Meta']['CurveCount']
    out = os.path.join(DST, '7steve.%s.motion3.json' % dst)
    json.dump(mo, open(out, 'w', encoding='utf-8'), ensure_ascii=False)
    print('%s → %s  时长 %.1fs  保留参数 %d/%d  %s' % (
        src, os.path.basename(out), dur, kept, len(curves),
        '%.0fKB' % (os.path.getsize(out) / 1024)))
