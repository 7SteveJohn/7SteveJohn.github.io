# motion3.json Meta 修正器：按段类型正确遍历 Segments 重算 TotalSegmentCount / TotalPointCount
# 段格式：起始点 [t,v] 之后，每段 = type + 坐标：
#   0 线性 [t,v] | 1 贝塞尔 [cx1,cy1,cx2,cy2,t,v] | 2 阶梯 [t,v] | 3 缓动 [t,v]
import json, glob

CONSUME = {0: 3, 1: 7, 2: 3, 3: 3}

def counts(segments):
    seg_n = 0
    pt_n = 1
    i = 2  # 跳过起始 [t, v]
    n = len(segments)
    while i < n:
        t = int(segments[i])
        c = CONSUME.get(t)
        if c is None:
            raise ValueError('未知段类型 %s @ %d' % (t, i))
        seg_n += 1
        pt_n += 1 if t != 1 else 3  # 贝塞尔含两个控制点
        i += c
    return seg_n, pt_n

fixed = 0
for path in sorted(glob.glob('D:/HTML/assets/vendor/live2d/model/7steve/7steve.*.motion3.json')):
    mo = json.load(open(path, encoding='utf-8'))
    seg = pt = 0
    for c in mo['Curves']:
        s, p = counts(c['Segments'])
        seg += s
        pt += p
    meta = mo['Meta']
    if meta.get('TotalSegmentCount') != seg or meta.get('TotalPointCount') != pt:
        meta['TotalSegmentCount'] = seg
        meta['TotalPointCount'] = pt
        json.dump(mo, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        print('修正', path.split('\\')[-1].split('/')[-1], seg, pt)
        fixed += 1
    else:
        print('OK  ', path.split('\\')[-1].split('/')[-1])
print('修正数:', fixed)
