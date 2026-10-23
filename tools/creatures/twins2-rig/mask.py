# Which bones may weigh on a vertex of twins2, by where it lies (Blender frame: x forward, y left, z up). Bone heat
# spreads across where the body's parts touch, so: the neck and head only on the head, the crest and the beard (which
# hangs onto the knees), and a side's bones only on that side. (The arms, fused to the thighs, are cut free in rig2.py.)
SPINE = {'Pelvis', 'Waist', 'Spine01', 'Spine02'}
NECK = {'NeckTwist01', 'NeckTwist02', 'Head'}
def side(n): return n[:2] if n[:2] in ('L_', 'R_') else ''
def is_arm(n): return n[:2] in ('L_', 'R_') and not any(k in n for k in ('Thigh', 'Calf', 'Foot', 'ToeBase'))
def is_leg(n): return any(k in n for k in ('Thigh', 'Calf', 'Foot', 'ToeBase'))
def allowed(p, n):
    x, y, z = p
    beard = x > 0.08 and abs(y) < 0.14 and z > 0.08
    head = (x > -0.02 and z > 0.55 and abs(y) < 0.2) or z > 0.79
    if n in NECK: return head or beard
    if beard: return n == 'Spine02'
    if side(n) == 'L_' and y < -0.04: return False
    if side(n) == 'R_' and y > 0.04: return False
    if is_leg(n) and z > 0.45: return False
    return True
