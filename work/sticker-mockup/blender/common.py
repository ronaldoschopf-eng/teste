"""Shared Blender helpers for the sticker mockup scenes.

Geometry convention: the surface the sticker sits on is the plane y = 0, facing -Y.
The sticker centre is the world origin. The camera always sits on the -Y axis and
looks straight at the sticker, so the sticker is never rotated or skewed.

Camera moves are dolly zooms. As the camera distance d changes, the focal length
changes with it (f proportional to d), so the sticker plane keeps exactly the same
magnification: the sticker keeps the same pixel size and position in every frame,
while the perspective of everything in front of or behind it changes.

Because the sticker plane is fixed on screen, each scene is rendered as a few
high-quality layers (render.py) and the camera move is reconstructed per frame
from the depth pass (animate.py):
  fg_lit   - foreground (surface) + sticker proxy, gives light on the sticker
  fg_clean - foreground without the proxy, gives the clean surface around it
  bg       - everything else, with depth, rendered at the widest focal length
"""
import math
import os

import bpy

RES_X, RES_Y = 1080, 1920
SENSOR_W = 36.0                     # mm, horizontal sensor fit
STICKER_PX_W = 270                  # 25 % of 1080
STICKER_SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets",
                           "sticker_original.png")
STICKER_SRC_W, STICKER_SRC_H = 485, 691
PROXY_GAP = 0.0004                  # vinyl sits 0.4 mm proud of the surface


def sticker_world_size(width_m):
    return width_m, width_m * STICKER_SRC_H / STICKER_SRC_W


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.render.resolution_x, sc.render.resolution_y = RES_X, RES_Y
    sc.render.resolution_percentage = 100
    sc.render.fps = 30
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    sc.cycles.use_denoising = True
    sc.cycles.denoiser = "OPENIMAGEDENOISE"
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = 0.01
    sc.cycles.max_bounces = 8
    sc.cycles.glossy_bounces = 4
    sc.cycles.transmission_bounces = 8
    sc.cycles.transparent_max_bounces = 8
    sc.cycles.pixel_filter_type = "BLACKMAN_HARRIS"
    sc.cycles.filter_width = 1.2
    sc.world = bpy.data.worlds.new("World")
    for name in ("FG", "BG", "PROXY"):
        col = bpy.data.collections.new(name)
        sc.collection.children.link(col)
    return sc


def coll(name):
    return bpy.data.collections[name]


def link(ob, layer):
    for c in list(ob.users_collection):
        c.objects.unlink(ob)
    coll(layer).objects.link(ob)
    return ob


# ---------------------------------------------------------------- camera
def add_camera(sc, sticker_w, fstop):
    cam_data = bpy.data.cameras.new("Cam")
    cam_data.sensor_fit = "HORIZONTAL"
    cam_data.sensor_width = SENSOR_W
    cam_data.dof.use_dof = True
    cam_data.dof.aperture_fstop = fstop
    cam_data.dof.aperture_blades = 0
    cam_data.clip_start = 0.005
    cam_data.clip_end = 1000
    cam = bpy.data.objects.new("Cam", cam_data)
    sc.collection.objects.link(cam)
    cam.rotation_euler = (math.radians(90), 0, 0)    # looks along +Y
    sc.camera = cam
    cam["sticker_w"] = sticker_w
    return cam


def place_camera(cam, d):
    """Camera d metres in front of the surface; lens keeps sticker = 270 px wide."""
    frame_w = cam["sticker_w"] * RES_X / STICKER_PX_W
    dist = d - PROXY_GAP
    cam.location = (0.0, -d, 0.0)
    cam.data.lens = SENSOR_W * dist / frame_w
    cam.data.dof.focus_distance = dist


# ---------------------------------------------------------------- objects
def box(name, size, loc, mat=None, bevel=0.0, layer="BG", segments=4):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel > 0:
        m = ob.modifiers.new("bevel", "BEVEL")
        m.width = bevel
        m.segments = segments
        m.limit_method = "ANGLE"
    if mat:
        ob.data.materials.append(mat)
    return link(ob, layer)


def plane(name, size_xy, loc, rot=(0, 0, 0), mat=None, layer="BG"):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = (size_xy[0], size_xy[1], 1)
    bpy.ops.object.transform_apply(scale=True)
    if mat:
        ob.data.materials.append(mat)
    return link(ob, layer)


def sphere(name, r, loc, mat=None, layer="BG", subdiv=3):
    bpy.ops.mesh.primitive_ico_sphere_add(radius=r, subdivisions=subdiv, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    if mat:
        ob.data.materials.append(mat)
    return link(ob, layer)


def cylinder(name, r, depth, loc, rot=(0, 0, 0), mat=None, layer="BG", verts=32):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=verts)
    ob = bpy.context.active_object
    ob.name = name
    if mat:
        ob.data.materials.append(mat)
    return link(ob, layer)


def _light_object(name, ld, layer):
    ob = bpy.data.objects.new(name, ld)
    coll(layer).objects.link(ob)
    return ob


def area_light(name, size, loc, look_at, energy, color=(1, 1, 1), shape="RECTANGLE", size_y=None,
               spread=180, layer="BG"):
    ld = bpy.data.lights.new(name, "AREA")
    ld.energy = energy
    ld.color = color
    ld.shape = shape
    ld.size = size
    if size_y is not None:
        ld.size_y = size_y
    ld.spread = math.radians(spread)
    ob = _light_object(name, ld, layer)
    ob.location = loc
    aim(ob, look_at)
    return ob


def point_light(name, loc, energy, color=(1, 1, 1), radius=0.05, layer="BG"):
    ld = bpy.data.lights.new(name, "POINT")
    ld.energy = energy
    ld.color = color
    ld.shadow_soft_size = radius
    ob = _light_object(name, ld, layer)
    ob.location = loc
    return ob


def sun(name, direction_from, strength, color=(1, 1, 1), angle_deg=0.5, layer="BG"):
    """direction_from: vector pointing from the scene towards the sun."""
    from mathutils import Vector
    ld = bpy.data.lights.new(name, "SUN")
    ld.energy = strength
    ld.color = color
    ld.angle = math.radians(angle_deg)
    ob = _light_object(name, ld, layer)
    ob.rotation_euler = Vector(direction_from).to_track_quat("Z", "Y").to_euler()
    return ob


def aim(ob, target):
    from mathutils import Vector
    d = Vector(target) - Vector(ob.location)
    ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


# ---------------------------------------------------------------- materials
def new_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    return m, m.node_tree.nodes, m.node_tree.links


def bsdf_of(nodes):
    return nodes.get("Principled BSDF")


def world_pos(nodes):
    g = nodes.new("ShaderNodeNewGeometry")
    return g.outputs["Position"]


def sticker_proxy(sc, width_m, bump_builder=None, bump_strength=0.0, roughness=0.42, spec=0.35):
    """Plane carrying the original sticker as albedo + alpha cut-out.

    It only provides physically correct light on the sticker area (diffuse and
    specular passes); the visible sticker pixels are composited from the original
    file afterwards.
    """
    w, h = sticker_world_size(width_m)
    img = bpy.data.images.load(os.path.abspath(STICKER_SRC))
    img.alpha_mode = "STRAIGHT"
    m, nodes, links = new_mat("StickerProxy")
    b = bsdf_of(nodes)
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = img
    tex.interpolation = "Cubic"
    tex.extension = "CLIP"
    links.new(tex.outputs["Color"], b.inputs["Base Color"])
    links.new(tex.outputs["Alpha"], b.inputs["Alpha"])
    b.inputs["Roughness"].default_value = roughness
    b.inputs["Specular IOR Level"].default_value = spec
    if bump_builder is not None and bump_strength > 0:
        height = bump_builder(nodes, links)
        bn = nodes.new("ShaderNodeBump")
        bn.inputs["Strength"].default_value = bump_strength
        links.new(height, bn.inputs["Height"])
        links.new(bn.outputs["Normal"], b.inputs["Normal"])
    return plane("StickerProxy", (w, h), (0, -PROXY_GAP, 0), rot=(math.radians(90), 0, 0), mat=m,
                 layer="PROXY")


# ---------------------------------------------------------------- render layers
def configure_layer(sc, kind, extra=None):
    """Set visibility for one of the render layers described in the module doc."""
    extra = extra or {}
    fg, bg, px = coll("FG"), coll("BG"), coll("PROXY")

    def vis(col, camera, hidden=False):
        for ob in col.all_objects:
            ob.hide_render = hidden
            ob.visible_camera = camera

    sc.render.film_transparent = kind != "bg"
    sc.cycles.film_transparent_glass = kind != "bg"
    if kind == "fg_lit":
        vis(fg, True); vis(bg, False); vis(px, True)
    elif kind == "fg_clean":
        vis(fg, True); vis(bg, False); vis(px, False, hidden=True)
    elif kind == "bg":
        vis(fg, False, hidden=extra.get("hide_fg_in_bg", False)); vis(bg, True); vis(px, False, hidden=True)
        for name in extra.get("hide_in_bg", []):
            bpy.data.objects[name].hide_render = True
    else:
        raise ValueError(kind)
    for ob in bpy.data.objects:          # light sources never show up directly in camera
        if ob.type == "LIGHT":
            ob.visible_camera = False
    for name in extra.get("disable_lights", []):
        bpy.data.objects[name].hide_render = True


def setup_output(sc, out_path_noext):
    """Multilayer EXR with Image (denoised beauty, RGBA), Light (denoised diffuse
    irradiance, albedo-free), Spec (glossy contribution), DiffCol and Depth."""
    vl = sc.view_layers[0]
    vl.use_pass_combined = True
    vl.use_pass_z = True
    vl.use_pass_diffuse_direct = True
    vl.use_pass_diffuse_indirect = True
    vl.use_pass_diffuse_color = True
    vl.use_pass_glossy_direct = True
    vl.use_pass_glossy_indirect = True
    vl.use_pass_glossy_color = True
    vl.cycles.denoising_store_passes = True

    ng = bpy.data.node_groups.new("Comp", "CompositorNodeTree")
    sc.compositing_node_group = ng
    N, L = ng.nodes, ng.links
    rl = N.new("CompositorNodeRLayers")
    rl.scene = sc
    out = rl.outputs

    def vop(op, a, b):
        n = N.new("ShaderNodeVectorMath")
        n.operation = op
        L.new(a, n.inputs[0]); L.new(b, n.inputs[1])
        return n.outputs["Vector"]

    def denoise(img, albedo=None):
        d = N.new("CompositorNodeDenoise")
        L.new(img, d.inputs["Image"])
        if albedo is not None:
            L.new(albedo, d.inputs["Albedo"])
        L.new(out["Denoising Normal"], d.inputs["Normal"])
        return d.outputs["Image"]

    light = denoise(vop("ADD", out["Diffuse Direct"], out["Diffuse Indirect"]))
    spec = denoise(vop("MULTIPLY", out["Glossy Color"], vop("ADD", out["Glossy Direct"], out["Glossy Indirect"])))

    fo = N.new("CompositorNodeOutputFile")
    fo.directory = os.path.dirname(os.path.abspath(out_path_noext))
    fo.file_name = os.path.basename(out_path_noext)
    fo.format.file_format = "OPEN_EXR_MULTILAYER"
    fo.format.color_depth = "32"
    fo.format.exr_codec = "ZIP"
    items = fo.file_output_items
    socks = (("Image", out["Image"]), ("Alpha", out["Alpha"]), ("Light", light), ("Spec", spec),
             ("DiffCol", out["Diffuse Color"]), ("Depth", out["Depth"]))
    for nm, sock in socks:
        items.new("RGBA", nm)
        L.new(sock, fo.inputs[nm])
    go = N.new("NodeGroupOutput")
    ng.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    L.new(out["Image"], go.inputs[0])


def render_layer(sc, out_path_noext, samples):
    os.makedirs(os.path.dirname(out_path_noext), exist_ok=True)
    sc.cycles.samples = samples
    setup_output(sc, out_path_noext)
    sc.frame_start = sc.frame_end = 1
    sc.frame_set(1)
    sc.render.filepath = out_path_noext + "_beauty"
    sc.render.image_settings.file_format = "PNG"
    bpy.ops.render.render(write_still=True)
