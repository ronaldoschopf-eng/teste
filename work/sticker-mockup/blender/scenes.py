"""Scene builders. Each builder populates the current Blender scene and returns a
config dict used by render.py (which layers to render) and animate.py (camera
move, compositing parameters).

All scenes: surface plane y = 0 facing -Y, sticker centred at the origin,
camera on the -Y axis looking +Y (see common.py).
"""
import math
import random

import bpy

import common as C


# ======================================================================= helpers
def tex_noise(nodes, links, scale, detail=6.0, rough=0.55, dist=0.0, vec=None):
    t = nodes.new("ShaderNodeTexNoise")
    t.inputs["Scale"].default_value = scale
    t.inputs["Detail"].default_value = detail
    t.inputs["Roughness"].default_value = rough
    t.inputs["Distortion"].default_value = dist
    links.new(vec if vec is not None else C.world_pos(nodes), t.inputs["Vector"])
    return t


def ramp(nodes, links, fac, stops):
    r = nodes.new("ShaderNodeValToRGB")
    els = r.color_ramp.elements
    els[0].position, els[0].color = stops[0][0], (*stops[0][1], 1)
    els[1].position, els[1].color = stops[-1][0], (*stops[-1][1], 1)
    for pos, col in stops[1:-1]:
        e = els.new(pos)
        e.color = (*col, 1)
    links.new(fac, r.inputs["Fac"])
    return r


def maprange(nodes, links, value, lo, hi, from_lo=0.0, from_hi=1.0):
    m = nodes.new("ShaderNodeMapRange")
    m.inputs["From Min"].default_value = from_lo
    m.inputs["From Max"].default_value = from_hi
    m.inputs["To Min"].default_value = lo
    m.inputs["To Max"].default_value = hi
    links.new(value, m.inputs["Value"])
    return m.outputs[0]


def math_op(nodes, links, op, a, b=None, clamp=False):
    n = nodes.new("ShaderNodeMath")
    n.operation = op
    n.use_clamp = clamp
    if isinstance(a, (int, float)):
        n.inputs[0].default_value = a
    else:
        links.new(a, n.inputs[0])
    if b is not None:
        if isinstance(b, (int, float)):
            n.inputs[1].default_value = b
        else:
            links.new(b, n.inputs[1])
    return n.outputs[0]


def add_bump(nodes, links, bsdf, height, strength, distance=1.0):
    bn = nodes.new("ShaderNodeBump")
    bn.inputs["Strength"].default_value = strength
    bn.inputs["Distance"].default_value = distance
    links.new(height, bn.inputs["Height"])
    links.new(bn.outputs["Normal"], bsdf.inputs["Normal"])
    return bn


def simple_mat(name, color, rough=0.5, metallic=0.0, spec=0.5, coat=0.0):
    m, nodes, links = C.new_mat(name)
    b = C.bsdf_of(nodes)
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Specular IOR Level"].default_value = spec
    b.inputs["Coat Weight"].default_value = coat
    return m


def emit_mat(name, color, strength):
    m, nodes, links = C.new_mat(name)
    for n in list(nodes):
        if n.type == "BSDF_PRINCIPLED":
            nodes.remove(n)
    e = nodes.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = (*color, 1)
    e.inputs["Strength"].default_value = strength
    links.new(e.outputs[0], nodes["Material Output"].inputs["Surface"])
    return m


def glass_mat(name, tint=(0.93, 0.96, 0.95), rough=0.0, ior=1.52):
    m, nodes, links = C.new_mat(name)
    for n in list(nodes):
        if n.type == "BSDF_PRINCIPLED":
            nodes.remove(n)
    g = nodes.new("ShaderNodeBsdfGlass")
    g.inputs["Color"].default_value = (*tint, 1)
    g.inputs["Roughness"].default_value = rough
    g.inputs["IOR"].default_value = ior
    links.new(g.outputs[0], nodes["Material Output"].inputs["Surface"])
    return m


def sky_world(sc, strength, sun_elev, sun_rot, air=1.0, dust=1.0, ozone=1.0):
    w = sc.world
    w.use_nodes = True
    nt = w.node_tree
    bg = nt.nodes["Background"]
    sky = nt.nodes.new("ShaderNodeTexSky")
    for t in ("MULTIPLE_SCATTERING", "NISHITA", "SINGLE_SCATTERING", "HOSEK_WILKIE"):
        try:
            sky.sky_type = t
            break
        except Exception:
            continue
    for attr, val in (("sun_elevation", math.radians(sun_elev)), ("sun_rotation", math.radians(sun_rot)),
                      ("sun_disc", False), ("air_density", air), ("dust_density", dust),
                      ("ozone_density", ozone), ("aerosol_density", dust)):
        if hasattr(sky, attr):
            try:
                setattr(sky, attr, val)
            except Exception:
                pass
    nt.links.new(sky.outputs[0], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = strength
    return sky


def gradient_world(sc, top, horizon, strength):
    """Simple vertical gradient environment (studio / dusk)."""
    w = sc.world
    w.use_nodes = True
    nt = w.node_tree
    bg = nt.nodes["Background"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    r = nt.nodes.new("ShaderNodeValToRGB")
    r.color_ramp.elements[0].position = 0.5
    r.color_ramp.elements[0].color = (*horizon, 1)
    r.color_ramp.elements[1].position = 0.85
    r.color_ramp.elements[1].color = (*top, 1)
    nt.links.new(sep.outputs["Z"], r.inputs["Fac"])
    nt.links.new(r.outputs["Color"], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = strength


def facade_mat(name, wall, glass, lit=0.0, lit_color=(1.0, 0.72, 0.42), bay=(1.6, 1.4),
               lit_fraction=0.35, seed=0.0):
    """Building facade: wall colour + grid of windows. Windows are glossy dark glass;
    a random subset glows (lit) for dusk scenes."""
    m, nodes, links = C.new_mat(name)
    b = C.bsdf_of(nodes)
    pos = C.world_pos(nodes)
    br = nodes.new("ShaderNodeTexBrick")
    br.offset = 0.0
    br.squash = 1.0
    br.inputs["Scale"].default_value = 1.0
    br.inputs["Mortar Size"].default_value = 0.42
    br.inputs["Mortar Smooth"].default_value = 0.02
    br.inputs["Brick Width"].default_value = bay[0]
    br.inputs["Row Height"].default_value = bay[1]
    br.inputs["Color1"].default_value = (1, 1, 1, 1)
    br.inputs["Color2"].default_value = (1, 1, 1, 1)
    br.inputs["Mortar"].default_value = (0, 0, 0, 1)
    links.new(pos, br.inputs["Vector"])
    win = br.outputs["Fac"]                       # 0 = window, 1 = wall (mortar)
    win = math_op(nodes, links, "SUBTRACT", 1.0, win)   # 1 = window
    mix = nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    links.new(win, mix.inputs["Factor"])
    mix.inputs["A"].default_value = (*wall, 1)
    mix.inputs["B"].default_value = (*glass, 1)
    # subtle per-facade grime variation
    n = tex_noise(nodes, links, 0.35, detail=4)
    grime = maprange(nodes, links, n.outputs["Fac"], 0.85, 1.08, 0.3, 0.7)
    mul = nodes.new("ShaderNodeMix")
    mul.data_type = "RGBA"
    mul.blend_type = "MULTIPLY"
    mul.inputs["Factor"].default_value = 1.0
    links.new(mix.outputs["Result"], mul.inputs["A"])
    links.new(grime, mul.inputs["B"])
    links.new(mul.outputs["Result"], b.inputs["Base Color"])
    links.new(maprange(nodes, links, win, 0.75, 0.06), b.inputs["Roughness"])
    links.new(maprange(nodes, links, win, 0.0, 0.0), b.inputs["Metallic"])
    if lit > 0:
        cell = nodes.new("ShaderNodeTexVoronoi")
        cell.feature = "F1"
        cell.distance = "CHEBYCHEV"
        cell.inputs["Scale"].default_value = 0.62
        cell.inputs["Randomness"].default_value = 0.0
        vm = nodes.new("ShaderNodeVectorMath")
        vm.operation = "ADD"
        vm.inputs[1].default_value = (seed, seed * 1.7, 0)
        links.new(pos, vm.inputs[0])
        links.new(vm.outputs[0], cell.inputs["Vector"])
        on = math_op(nodes, links, "LESS_THAN", cell.outputs["Color"], lit_fraction)
        e = math_op(nodes, links, "MULTIPLY", on, win)
        e = math_op(nodes, links, "MULTIPLY", e, lit)
        b.inputs["Emission Color"].default_value = (*lit_color, 1)
        links.new(e, b.inputs["Emission Strength"])
    return m


def city_row(rng, x0, x1, y_face, mats, h_range=(8, 30), depth=10, z0=-1.5, gap=(0.4, 2.5),
             facing=-1, layer="BG"):
    """Row of buildings whose facade plane is at y = y_face (facing -Y if facing=-1)."""
    x = x0
    while x < x1:
        w = rng.uniform(6, 16)
        h = rng.uniform(*h_range)
        y = y_face - facing * depth / 2
        C.box("bld", (w, depth, h), (x + w / 2, y + rng.uniform(-1.5, 1.5) * (1 if facing < 0 else -1),
                                     z0 + h / 2), mat=rng.choice(mats), layer=layer)
        x += w + rng.uniform(*gap)


def tree(rng, x, y, z0, leaf, trunk, h=4.0, r=2.0, layer="BG"):
    C.cylinder("trunk", 0.12, h, (x, y, z0 + h / 2), mat=trunk, layer=layer, verts=12)
    for _ in range(5):
        C.sphere("crown", r * rng.uniform(0.55, 0.85),
                 (x + rng.uniform(-r, r) * 0.5, y + rng.uniform(-r, r) * 0.4, z0 + h + rng.uniform(-0.3, 1.0) * r * 0.6),
                 mat=leaf, layer=layer, subdiv=2)


def leaf_mat():
    m, nodes, links = C.new_mat("Leaf")
    b = C.bsdf_of(nodes)
    n = tex_noise(nodes, links, 3.0, detail=3)
    col = ramp(nodes, links, n.outputs["Fac"], [(0.35, (0.05, 0.11, 0.03)), (0.65, (0.16, 0.24, 0.06))])
    links.new(col.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.65
    b.inputs["Subsurface Weight"].default_value = 0.0
    return m


def street_lamp(x, y, z0, h, layer="BG", on=0.0, color=(1.0, 0.62, 0.30)):
    pole = simple_mat("LampPole", (0.05, 0.05, 0.055), rough=0.45, metallic=0.6)
    C.cylinder("lamp_pole", 0.06, h, (x, y, z0 + h / 2), mat=pole, layer=layer, verts=12)
    C.box("lamp_arm", (0.9, 0.08, 0.08), (x - 0.45, y, z0 + h), mat=pole, layer=layer)
    if on > 0:
        C.sphere("lamp_bulb", 0.18, (x - 0.85, y, z0 + h - 0.12), mat=emit_mat("LampBulb", color, on),
                 layer=layer, subdiv=2)


def car(x, y, z0, color, layer="BG", lights_on=0.0, facing_cam=False):
    body = simple_mat("CarPaint", color, rough=0.12, metallic=0.55, coat=1.0)
    glass = simple_mat("CarGlass", (0.02, 0.02, 0.025), rough=0.05)
    tyre = simple_mat("Tyre", (0.02, 0.02, 0.02), rough=0.8)
    C.box("car_body", (4.3, 1.8, 0.75), (x, y, z0 + 0.65), mat=body, bevel=0.22, layer=layer)
    C.box("car_cabin", (2.4, 1.6, 0.6), (x - 0.2, y, z0 + 1.25), mat=glass, bevel=0.25, layer=layer)
    for dx in (-1.35, 1.35):
        C.cylinder("tyre", 0.33, 1.7, (x + dx, y, z0 + 0.33), rot=(math.radians(90), 0, 0), mat=tyre,
                   layer=layer, verts=20)
    if lights_on > 0:
        for side in (-0.65, 0.65):
            front = emit_mat("HeadL", (1.0, 0.93, 0.8), lights_on)
            back = emit_mat("TailL", (1.0, 0.05, 0.02), lights_on * 0.35)
            C.sphere("headlight", 0.09, (x - 2.16, y + side, z0 + 0.75), mat=front, layer=layer, subdiv=2)
            C.sphere("taillight", 0.08, (x + 2.16, y + side, z0 + 0.8), mat=back, layer=layer, subdiv=2)


# ======================================================================= 1. pole
def build_pole():
    """Concrete street pole (flat front face) on a sidewalk, warm late-afternoon sun."""
    sc = C.reset()
    rng = random.Random(7)
    STW = 0.09                      # sticker 9 cm wide -> frame 36 cm wide at the pole
    cam = C.add_camera(sc, STW, fstop=2.0)

    # ---- pole (FG): cast concrete, pitted, faint vertical rain streaks, slight grime
    m, nodes, links = C.new_mat("Concrete")
    b = C.bsdf_of(nodes)

    def concrete_height(nodes, links):
        fine = tex_noise(nodes, links, 260, detail=8, rough=0.7)
        pits = nodes.new("ShaderNodeTexVoronoi")
        pits.inputs["Scale"].default_value = 90
        pits.inputs["Randomness"].default_value = 1.0
        links.new(C.world_pos(nodes), pits.inputs["Vector"])
        pit = maprange(nodes, links, pits.outputs["Distance"], -1.0, 0.0, 0.0, 0.07)   # sharp small holes
        pit = math_op(nodes, links, "MINIMUM", pit, 0.0)
        h = math_op(nodes, links, "MULTIPLY_ADD", fine.outputs["Fac"], 0.5)
        links.new(pit, h.node.inputs[2])
        return h

    pos = C.world_pos(nodes)
    big = tex_noise(nodes, links, 3.0, detail=7, rough=0.6)
    sv = nodes.new("ShaderNodeMapping")
    sv.inputs["Scale"].default_value = (6, 6, 1.2)
    links.new(pos, sv.inputs["Vector"])
    streak = tex_noise(nodes, links, 2.5, detail=8, rough=0.7, vec=sv.outputs[0])
    mott = tex_noise(nodes, links, 60, detail=8, rough=0.75)
    f = math_op(nodes, links, "MULTIPLY_ADD", big.outputs["Fac"], 0.55)
    links.new(maprange(nodes, links, streak.outputs["Fac"], -0.06, 0.06, 0.35, 0.65), f.node.inputs[2])
    f = math_op(nodes, links, "ADD", f, maprange(nodes, links, mott.outputs["Fac"], -0.14, 0.14))
    col = ramp(nodes, links, f, [(0.10, (0.30, 0.29, 0.27)), (0.35, (0.43, 0.42, 0.39)),
                                 (0.60, (0.52, 0.51, 0.48)), (0.80, (0.58, 0.57, 0.54))])
    links.new(col.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.92
    b.inputs["Specular IOR Level"].default_value = 0.3
    add_bump(nodes, links, b, concrete_height(nodes, links), 0.6, 0.003)
    C.box("Pole", (0.20, 0.20, 7.0), (0, 0.10, 1.4), mat=m, bevel=0.012, layer="FG")
    C.sticker_proxy(sc, STW, bump_builder=concrete_height, bump_strength=0.22, roughness=0.5, spec=0.3)

    # an out-of-frame street-sign plate whose shadow crosses the pole above the sticker
    sign = simple_mat("Sign", (0.2, 0.2, 0.2), rough=0.5)
    sg = C.box("SignShadow", (0.55, 0.02, 0.32), (-0.50, -0.55, 0.70), mat=sign, layer="BG")
    sg.rotation_euler = (0, math.radians(-14), math.radians(8))

    # ---- street (BG)
    side = simple_mat("Sidewalk", (0.40, 0.37, 0.33), rough=0.85)
    C.plane("Ground", (200, 200), (0, 60, -1.45), mat=side)
    C.plane("Road", (200, 9), (0, 10.5, -1.43), mat=simple_mat("Road", (0.05, 0.05, 0.055), rough=0.6))
    mats = [facade_mat(f"Fac{i}", wall, glass) for i, (wall, glass) in enumerate([
        ((0.78, 0.62, 0.46), (0.05, 0.06, 0.07)),
        ((0.60, 0.52, 0.44), (0.04, 0.05, 0.06)),
        ((0.85, 0.80, 0.72), (0.06, 0.07, 0.08)),
        ((0.40, 0.33, 0.29), (0.04, 0.04, 0.05)),
        ((0.70, 0.42, 0.30), (0.05, 0.05, 0.06))])]
    city_row(rng, -45, 45, 16.5, mats, h_range=(9, 24))
    city_row(rng, -80, 80, 48, mats, h_range=(25, 70))
    leaf, trunk = leaf_mat(), simple_mat("Trunk", (0.10, 0.08, 0.06), rough=0.9)
    for x in (-10, -3.5, 3.0, 9.5):
        tree(rng, x, 13.5, -1.45, leaf, trunk, h=4.2, r=2.0)
    for x, c in ((-6.5, (0.45, 0.03, 0.03)), (-1.0, (0.75, 0.75, 0.77)), (4.8, (0.03, 0.05, 0.10)),
                 (10.5, (0.30, 0.31, 0.30))):
        car(x, 8.2, -1.43, c)
    street_lamp(-1.8, 6.5, -1.45, 6.0)
    street_lamp(7.0, 6.5, -1.45, 6.0)
    C.box("Pole2", (0.2, 0.2, 7), (2.6, 4.0, 1.5), mat=m)

    sky_world(sc, 0.18, sun_elev=16, sun_rot=-120)
    C.sun("Sun", (-0.55, -0.70, 0.45), 5.5, color=(1.0, 0.80, 0.58), angle_deg=0.8)
    return sc, dict(cam=cam, sticker_w=STW, d_start=1.30, d_end=0.62, ease="inout",
                    layers=["fg_lit", "fg_clean", "bg"], target=0.95, spec=0.5, vignette=0.22)


# ======================================================================= 2. glass
def build_glass():
    """Sticker on a café shop-window. Warm interior behind, street reflected."""
    sc = C.reset()
    rng = random.Random(11)
    STW = 0.085
    cam = C.add_camera(sc, STW, fstop=3.5)

    # ---- glass pane + black aluminium mullion (FG)
    pane = C.box("Glass", (3.0, 0.010, 3.0), (0, 0.005, 0.2), mat=glass_mat("Glass"), layer="FG")
    alu = simple_mat("Alu", (0.035, 0.035, 0.038), rough=0.32, metallic=0.85)
    for ob in (C.box("Mullion", (0.05, 0.06, 3.2), (0.135, -0.03, 0.2), mat=alu, bevel=0.003, layer="FG"),
               C.box("Rail", (3.0, 0.06, 0.05), (0, -0.03, -0.37), mat=alu, bevel=0.003, layer="FG")):
        ob.visible_glossy = False   # its own reflection in the glass would be a near-field image
    C.sticker_proxy(sc, STW, roughness=0.5, spec=0.3)

    # ---- interior (BG, behind the glass)
    wallm = simple_mat("CafeWall", (0.20, 0.15, 0.12), rough=0.8)
    C.box("BackWall", (12, 0.2, 6), (0, 6.5, 1.0), mat=wallm)
    C.plane("Floor", (12, 8), (0, 3.2, -1.1), mat=simple_mat("Floor", (0.22, 0.15, 0.10), rough=0.4))
    C.plane("Ceiling", (12, 8), (0, 3.2, 2.1), rot=(math.pi, 0, 0), mat=simple_mat("Ceil", (0.3, 0.28, 0.26)))
    wood = simple_mat("Wood", (0.30, 0.18, 0.10), rough=0.45)
    for i, x in enumerate((-2.2, -0.6, 1.1, 2.6)):
        y = 2.0 + (i % 2) * 1.8
        C.cylinder("table", 0.42, 0.04, (x, y, -0.35), mat=wood, verts=32)
        C.cylinder("tleg", 0.04, 0.75, (x, y, -0.72), mat=simple_mat("Blk", (0.02, 0.02, 0.02), rough=0.4))
        C.cylinder("cup", 0.045, 0.09, (x + 0.1, y - 0.05, -0.28), mat=simple_mat("Cup", (0.9, 0.9, 0.88), rough=0.2))
    for x in (-1.6, 0.2, 1.9, 3.4, -3.0):
        y = rng.uniform(2.2, 4.5)
        bulb = emit_mat("Pendant", (1.0, 0.66, 0.36), 28.0)
        C.sphere("pendant", 0.07, (x, y, 1.15 + rng.uniform(-0.15, 0.15)), mat=bulb, subdiv=3)
        C.cylinder("cord", 0.004, 1.0, (x, y, 1.7), mat=simple_mat("Cord", (0.02, 0.02, 0.02)))
        C.point_light("pl", (x, y, 1.05), 10, color=(1.0, 0.68, 0.38), radius=0.06)
    shelf = simple_mat("Shelf", (0.18, 0.12, 0.08), rough=0.5)
    for z in (0.2, 0.75):
        C.box("shelf", (3.0, 0.3, 0.04), (0.5, 6.3, z), mat=shelf)
        for k in range(10):
            c = rng.choice([(0.8, 0.78, 0.7), (0.15, 0.25, 0.18), (0.6, 0.3, 0.15), (0.9, 0.9, 0.9)])
            C.cylinder("jar", 0.06, 0.22, (-0.8 + k * 0.28, 6.25, z + 0.13), mat=simple_mat("Jar", c, rough=0.3))
    leaf = leaf_mat()
    for x, y in ((-3.2, 3.6), (3.6, 2.8)):
        C.cylinder("pot", 0.22, 0.45, (x, y, -0.88), mat=simple_mat("Pot", (0.75, 0.72, 0.68), rough=0.6))
        for k in range(4):
            C.sphere("plant", rng.uniform(0.25, 0.35), (x + rng.uniform(-0.2, 0.2), y, -0.3 + k * 0.25),
                     mat=leaf, subdiv=2)
    C.area_light("interior_fill", 4.0, (0, 3.5, 2.0), (0, 3.5, -1), 60, color=(1.0, 0.78, 0.55))

    # ---- street behind the camera, seen only as a reflection in the glass (BG)
    mats = [facade_mat(f"RFac{i}", wall, glass) for i, (wall, glass) in enumerate([
        ((0.75, 0.70, 0.62), (0.05, 0.06, 0.07)), ((0.45, 0.42, 0.40), (0.04, 0.05, 0.06)),
        ((0.82, 0.80, 0.76), (0.07, 0.08, 0.09))])]
    for ob in []:
        pass
    x = -40
    while x < 40:
        w, h = rng.uniform(7, 14), rng.uniform(8, 22)
        C.box("rbld", (w, 8, h), (x + w / 2, -14 - 4, h / 2 - 1.2), mat=rng.choice(mats))
        x += w + rng.uniform(0.5, 2)
    C.plane("Street", (200, 30), (0, -8, -1.15), mat=simple_mat("Asph", (0.06, 0.06, 0.065), rough=0.7))
    C.plane("Walk", (200, 1.8), (0, -0.9, -1.13), mat=simple_mat("Walk", (0.42, 0.40, 0.37), rough=0.85))
    leaf2, trunk = leaf_mat(), simple_mat("Trunk", (0.1, 0.08, 0.06), rough=0.9)
    for x in (-7, 1, 9):
        tree(rng, x, -6.5, -1.15, leaf2, trunk, h=3.6, r=1.8)
    car(-3.0, -4.5, -1.15, (0.82, 0.82, 0.84))
    # sunlit white columns and dark trunks across the street: strong shapes in the reflection
    white = simple_mat("WhiteCol", (0.85, 0.84, 0.80), rough=0.6)
    for x in (-1.6, -0.3, 2.2):
        C.box("rcol", (0.45, 0.45, 8), (x, -9.5, 2.8), mat=white)
    for x in (0.9, 3.4):
        C.cylinder("rtrunk", 0.14, 6, (x, -6.0, 1.8), mat=simple_mat("RT", (0.03, 0.025, 0.02), rough=0.9), verts=12)

    sky_world(sc, 0.22, sun_elev=28, sun_rot=40)
    C.sun("Sun", (0.30, 0.55, 0.78), 4.5, color=(1.0, 0.88, 0.74), angle_deg=1.0)
    return sc, dict(cam=cam, sticker_w=STW, d_start=0.60, d_end=0.95, ease="inout",
                    layers=["fg_lit", "fg_clean", "bg"], bg_extra={"hide_fg_in_bg": True},
                    glass=dict(refl_depth=18.0, tint=(0.90, 0.93, 0.92)),
                    target=0.95, spec=0.5, vignette=0.22)


# ======================================================================= 3. MacBook
def build_macbook():
    """Close-up of a silver laptop lid (no logo) on a dark studio table."""
    sc = C.reset()
    STW = 0.088
    cam = C.add_camera(sc, STW, fstop=3.2)

    # ---- lid (FG): bead-blasted aluminium, rounded corners, 6 mm thick
    m, nodes, links = C.new_mat("Alu")
    b = C.bsdf_of(nodes)

    def alu_height(nodes, links):
        return tex_noise(nodes, links, 2400, detail=4, rough=0.5).outputs["Fac"]

    n = tex_noise(nodes, links, 30, detail=3)
    col = ramp(nodes, links, n.outputs["Fac"], [(0.3, (0.70, 0.71, 0.72)), (0.7, (0.74, 0.75, 0.76))])
    links.new(col.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Metallic"].default_value = 1.0
    b.inputs["Roughness"].default_value = 0.22
    b.inputs["Anisotropic"].default_value = 0.0
    add_bump(nodes, links, b, alu_height(nodes, links), 0.04, 0.0005)
    LW, LH, LT = 0.3125, 0.2212, 0.006
    lid = C.box("Lid", (LW, LT, LH), (0, LT / 2, 0.0), mat=m, bevel=0.0028, layer="FG", segments=6)
    # rounded corners of the lid outline: bevel the four vertical-ish edges strongly
    bpy.context.view_layer.objects.active = lid
    lid.modifiers.clear()
    me = lid.data
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(me)
    corner_edges = [e for e in bm.edges
                    if abs(e.verts[0].co.y - e.verts[1].co.y) > 1e-6]
    bmesh.ops.bevel(bm, geom=corner_edges, offset=0.011, segments=10, affect="EDGES", profile=0.5)
    bm.to_mesh(me)
    bm.free()
    bv = lid.modifiers.new("edge", "BEVEL")
    bv.width = 0.0022
    bv.segments = 4
    bv.limit_method = "ANGLE"
    for p in me.polygons:
        p.use_smooth = True
    lid.modifiers.new("wn", "WEIGHTED_NORMAL")
    C.sticker_proxy(sc, STW, bump_builder=alu_height, bump_strength=0.01, roughness=0.40, spec=0.4)

    # hinge + base behind the lid (FG, mostly hidden, gives the silhouette below the lid)
    darkalu = simple_mat("Hinge", (0.10, 0.10, 0.11), rough=0.35, metallic=0.9)
    C.cylinder("Hinge", 0.0055, LW - 0.06, (0, 0.006, -LH / 2 - 0.004), rot=(0, math.radians(90), 0),
               mat=darkalu, layer="FG")
    C.box("Base", (LW, 0.215, 0.0145), (0, 0.006 + 0.1075, -LH / 2 - 0.004 - 0.0045), mat=m, bevel=0.003,
          layer="FG")
    table_z = -LH / 2 - 0.004 - 0.0045 - 0.00725 - 0.003
    # little rubber feet
    for x in (-0.13, 0.13):
        C.cylinder("foot", 0.006, 0.003, (x, 0.02, table_z + 0.0015), mat=simple_mat("Rub", (0.02, 0.02, 0.02)),
                   layer="FG")

    # ---- studio (BG): dark stone table, charcoal sweep backdrop
    tm, tn, tl = C.new_mat("Table")
    tb = C.bsdf_of(tn)
    tx = tex_noise(tn, tl, 14, detail=8, rough=0.6)
    tcol = ramp(tn, tl, tx.outputs["Fac"], [(0.35, (0.050, 0.050, 0.052)), (0.65, (0.075, 0.074, 0.073))])
    tl.new(tcol.outputs["Color"], tb.inputs["Base Color"])
    tb.inputs["Roughness"].default_value = 0.38
    add_bump(tn, tl, tb, tex_noise(tn, tl, 300, detail=4).outputs["Fac"], 0.05, 0.001)
    C.plane("Table", (6, 6), (0, 0.5, table_z), mat=tm)
    back = simple_mat("Backdrop", (0.11, 0.105, 0.10), rough=0.9)
    C.plane("Backdrop", (8, 4), (0, 1.6, 1.5), rot=(math.radians(90), 0, 0), mat=back)

    # ---- lights: key softbox upper-left, rim from behind-right, soft front fill, backdrop glow
    C.area_light("Key", 1.2, (-1.1, -0.9, 0.9), (0, 0, 0), 180, color=(1.0, 0.97, 0.93), size_y=0.8)
    C.area_light("Rim", 0.6, (0.9, 0.9, 0.5), (0, 0, 0), 60, color=(0.92, 0.96, 1.0))
    C.area_light("Fill", 2.4, (0.0, -2.6, 1.05), (0.0, 0.0, 1.05), 70, color=(1, 1, 1), size_y=1.0, spread=90)
    C.area_light("Top", 1.6, (0.0, -0.5, 1.6), (0, 0, 0), 120, color=(1.0, 0.98, 0.95), size_y=0.6)
    C.area_light("BackGlow", 1.5, (0.3, 0.9, 0.7), (0.3, 1.6, 0.4), 70, color=(1.0, 0.92, 0.86))
    gradient_world(sc, (0.02, 0.02, 0.022), (0.03, 0.03, 0.03), 1.0)
    return sc, dict(cam=cam, sticker_w=STW, d_start=0.86, d_end=0.64, ease="inout", overscan=1.55,
                    layers=["fg_lit", "fg_clean", "bg"], target=0.95, spec=0.5, vignette=0.28)


# ======================================================================= 4. wall
def build_wall():
    """Lime-plaster wall, low raking sun filtered by leaves (shadows animated in 2D)."""
    sc = C.reset()
    STW = 0.09
    cam = C.add_camera(sc, STW, fstop=4.0)
    m, nodes, links = C.new_mat("Plaster")
    b = C.bsdf_of(nodes)

    def plaster_height(nodes, links):
        n1 = tex_noise(nodes, links, 9, detail=7, rough=0.62, dist=0.4)
        n2 = tex_noise(nodes, links, 140, detail=6, rough=0.7)
        hsum = math_op(nodes, links, "MULTIPLY_ADD", n1.outputs["Fac"], 1.0)
        links.new(n2.outputs["Fac"], hsum.node.inputs[2])
        return hsum

    nc = tex_noise(nodes, links, 3.5, detail=5, rough=0.6)
    col = ramp(nodes, links, nc.outputs["Fac"], [(0.3, (0.74, 0.69, 0.62)), (0.7, (0.80, 0.75, 0.68))])
    links.new(col.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.88
    b.inputs["Specular IOR Level"].default_value = 0.25
    add_bump(nodes, links, b, plaster_height(nodes, links), 0.55, 0.004)
    C.box("Wall", (3.0, 0.1, 3.0), (0, 0.05, 0), mat=m, layer="FG")
    C.sticker_proxy(sc, STW, bump_builder=plaster_height, bump_strength=0.30, roughness=0.5, spec=0.3)
    # ground in front of the wall bounces a bit of warm light
    C.plane("Ground", (6, 6), (0, -3, -1.2), mat=simple_mat("Gnd", (0.35, 0.30, 0.25), rough=0.9))
    sky_world(sc, 0.12, sun_elev=25, sun_rot=-150)
    sun_dir = (-0.78, -0.48, 0.40)            # raking from the left
    C.sun("Sun", sun_dir, 6.0, color=(1.0, 0.83, 0.62), angle_deg=0.6)
    return sc, dict(cam=cam, sticker_w=STW, d_start=0.8, d_end=0.8, ease="none",
                    layers=["fg_lit", "fg_clean", "fg_lit_sky", "fg_clean_sky"],
                    sky_only_disable=["Sun"], leaves=dict(seed=5, sun_dir=sun_dir),
                    target=0.95, spec=0.5, vignette=0.20)


# ======================================================================= 5. dusk metal plate
def build_plate():
    """Painted steel utility cabinet at blue hour; warm street-lamp key, city bokeh."""
    sc = C.reset()
    rng = random.Random(23)
    STW = 0.09
    cam = C.add_camera(sc, STW, fstop=1.6)

    m, nodes, links = C.new_mat("Paint")
    b = C.bsdf_of(nodes)

    def paint_height(nodes, links):
        return tex_noise(nodes, links, 380, detail=3, rough=0.5).outputs["Fac"]

    big = tex_noise(nodes, links, 4, detail=6, rough=0.6)
    wear = tex_noise(nodes, links, 40, detail=8, rough=0.75)
    wearm = maprange(nodes, links, wear.outputs["Fac"], 0.0, 1.0, 0.68, 0.74)
    base = ramp(nodes, links, big.outputs["Fac"], [(0.3, (0.035, 0.045, 0.046)), (0.7, (0.048, 0.058, 0.060))])
    mix = nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    links.new(wearm, mix.inputs["Factor"])
    links.new(base.outputs["Color"], mix.inputs["A"])
    mix.inputs["B"].default_value = (0.25, 0.24, 0.22, 1)
    links.new(mix.outputs["Result"], b.inputs["Base Color"])
    links.new(maprange(nodes, links, big.outputs["Fac"], 0.42, 0.62, 0.3, 0.7), b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.5
    add_bump(nodes, links, b, paint_height(nodes, links), 0.06, 0.001)
    # cabinet: front face at y=0; right edge at x=+0.13, top edge at z=+0.26
    cab = C.box("Cabinet", (0.8, 0.35, 1.3), (0.10 - 0.4, 0.175, 0.19 - 0.65), mat=m, bevel=0.01,
                layer="FG")
    C.box("Roof", (0.84, 0.39, 0.025), (0.10 - 0.4, 0.175, 0.19 + 0.0125), mat=m, bevel=0.004, layer="FG")
    seam = simple_mat("Seam", (0.01, 0.012, 0.012), rough=0.6)
    C.box("DoorSeam", (0.003, 0.004, 1.2), (-0.15, -0.0012, -0.45), mat=seam, layer="FG")
    C.box("DoorSeamTop", (0.62, 0.004, 0.003), (-0.15 - 0.31 + 0.06, -0.0012, 0.15), mat=seam,
          layer="FG")
    steel = simple_mat("Rivet", (0.45, 0.45, 0.44), rough=0.35, metallic=1.0)
    for z in (0.11, -0.25):
        C.cylinder("lock", 0.007, 0.006, (0.075, -0.003, z), rot=(math.radians(90), 0, 0), mat=steel,
                   layer="FG", verts=24)
    for zz in (0.165, -0.6):
        for xx in (-0.13, 0.08):
            C.sphere("rivet", 0.0035, (xx, -0.0005, zz), mat=steel, layer="FG", subdiv=2)
    C.sticker_proxy(sc, STW, bump_builder=paint_height, bump_strength=0.02, roughness=0.42, spec=0.4)

    # ---- dusk city (BG)
    C.plane("Ground", (300, 300), (0, 80, -1.05), mat=simple_mat("Wet", (0.04, 0.04, 0.045), rough=0.25))
    mats = [facade_mat(f"DFac{i}", wall, glass, lit=6.0, lit_fraction=0.42, seed=i * 3.1)
            for i, (wall, glass) in enumerate([
                ((0.22, 0.20, 0.19), (0.03, 0.035, 0.04)), ((0.32, 0.29, 0.27), (0.03, 0.03, 0.035)),
                ((0.15, 0.15, 0.16), (0.02, 0.025, 0.03))])]
    city_row(rng, -60, 60, 14, mats, h_range=(8, 24), z0=-1.05)
    city_row(rng, -120, 120, 45, mats, h_range=(20, 70), z0=-1.05)
    for x in (-8, -1.0, 6.5, 14):
        street_lamp(x, 6.0, -1.05, 5.5, on=60.0)
    for x, c, on in ((-5, (0.5, 0.5, 0.52), 40.0), (3.0, (0.05, 0.05, 0.08), 40.0), (11, (0.4, 0.05, 0.04), 40.0)):
        car(x, 8.5, -1.03, c, lights_on=on)
    for k in range(40):     # distant traffic / shop lights for bokeh
        x = rng.uniform(-25, 25)
        y = rng.uniform(10, 30)
        z = rng.uniform(-0.9, 2.5)
        c = rng.choice([(1.0, 0.62, 0.30), (1.0, 0.85, 0.65), (0.75, 0.85, 1.0), (1.0, 0.3, 0.15)])
        C.sphere("bokeh", rng.uniform(0.04, 0.09), (x, y, z), mat=emit_mat("Bk", c, rng.uniform(25, 60)), subdiv=2)

    gradient_world(sc, (0.012, 0.025, 0.075), (0.09, 0.10, 0.16), 1.0)
    # key: warm street lamp just out of frame, upper left; cool sky fill from the front
    C.point_light("LampKey", (-0.45, -0.55, 0.85), 70, color=(1.0, 0.70, 0.42), radius=0.10, layer="BG")
    C.area_light("SkyFill", 3.0, (0.5, -2.5, 1.5), (0, 0, 0), 55, color=(0.55, 0.68, 1.0))
    return sc, dict(cam=cam, sticker_w=STW, d_start=0.68, d_end=1.15, ease="inout",
                    layers=["fg_lit", "fg_clean", "bg"], target=0.90, spec=0.5, vignette=0.30)


BUILDERS = {"pole": build_pole, "glass": build_glass, "macbook": build_macbook,
            "wall": build_wall, "plate": build_plate}
