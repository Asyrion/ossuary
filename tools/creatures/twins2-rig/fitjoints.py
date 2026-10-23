# Where each of the first guardian's joints goes in the second's body (Blender frame: x forward, y left, z up).
# Key joints are placed by hand (read off side and front slabs of twins2's mesh); every other bone follows the
# nearest placed ancestor, and twist bones sit at their old fraction between the placed joints either side.
import json
KEY = {
  'L_Calf': (0.12, 0.17, 0.25), 'L_Foot': (-0.06, 0.165, 0.10), 'L_ToeBase': (0.07, 0.17, 0.035),
  'Spine02': (-0.05, 0.006, 0.60),
  'NeckTwist01': (0.02, 0.006, 0.65), 'NeckTwist02': (0.05, 0.006, 0.675), 'Head': (0.08, 0.006, 0.70),
  'FacialBone': (0.19, 0.0, 0.69),
  'L_Clavicle': (-0.04, 0.12, 0.70), 'L_Upperarm': (-0.06, 0.32, 0.67), 'L_Forearm': (-0.06, 0.38, 0.41),
  'L_Hand': (0.04, 0.38, 0.14),
}
def mirror(k): return 'R_' + k[2:] if k.startswith('L_') else None
def build(bones, key=KEY):
    """bones: name -> (head xyz, parent). Returns name -> new head."""
    K = dict(key)
    for k, p in list(key.items()):
        m = mirror(k)
        if m and m not in key: K[m] = (p[0], -p[1], p[2])
    new = {}
    def delta(n):
        while n and n not in K: n = bones[n][1]
        if not n: return (0, 0, 0)
        return tuple(K[n][i] - bones[n][0][i] for i in range(3))
    for n, (h, par) in bones.items():
        if n in K: new[n] = K[n]
        else:
            d = delta(par) if 'Twist' not in n else delta(par)
            new[n] = tuple(h[i] + d[i] for i in range(3))
    # twist bones: at their old fraction between the joint they hang from and the next joint down
    TW = {'ThighTwist01': ('Thigh', 'Calf'), 'ThighTwist02': ('Thigh', 'Calf'), 'CalfTwist01': ('Calf', 'Foot'),
          'CalfTwist02': ('Calf', 'Foot'), 'UpperarmTwist01': ('Upperarm', 'Forearm'), 'UpperarmTwist02': ('Upperarm', 'Forearm'),
          'ForearmTwist01': ('Forearm', 'Hand'), 'ForearmTwist02': ('Forearm', 'Hand')}
    for n in bones:
        for suf, (a, b) in TW.items():
            if n.endswith(suf) and not n.startswith('Neck'):
                s = n[:2]; A, B = s + a, s + b
                oa, ob, oh = bones[A][0], bones[B][0], bones[n][0]
                L2 = sum((ob[i] - oa[i]) ** 2 for i in range(3)) or 1
                f = sum((oh[i] - oa[i]) * (ob[i] - oa[i]) for i in range(3)) / L2
                new[n] = tuple(new[A][i] + f * (new[B][i] - new[A][i]) for i in range(3))
    return new
