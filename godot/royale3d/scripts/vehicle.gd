class_name RoyaleVehicle
extends Node3D
## Drivable cars, motorcycles and ro-ro ferries.
##   car / moto — arcade physics on a CharacterBody3D: throttle, steering that tightens with
##                speed, gravity, tilting to the slope, bumping off walls, running people over
##   boat       — a small roll-on/roll-off ferry (AnimatableBody3D) that only moves on water;
##                players and cars standing on its deck ride along, and its bow ramp lets
##                cars drive aboard from a beach
## In room matches the driver's game moves the vehicle and sends its position (RoyaleNet "veh").

const CARS := ["sports_car", "car", "police_car", "taxi", "suv", "sports_car_b", "car_b"]

var game: Node
var kind := "car"            ## car, moto, boat
var index := -1
var body: PhysicsBody3D
var visual: Node3D
var driver: Node3D = null    ## local player while driving
var remote_driver := ""      ## username of a classmate driving it
var speed := 0.0
var heading := 0.0           ## yaw (radians), forward = -Z rotated by heading
var max_speed := 24.0
var accel := 9.0
var turn := 1.6
var seat := Vector3(-0.36, -0.3, 0.2)   ## where the driver's feet go (car: left front seat)
var exit_offset := Vector3(-2.0, 0, 0)
var _engine := 0.0
var _net_t := 0.0
var _target := Vector3.ZERO
var _target_yaw := 0.0
var _bob_t := 0.0
var _tilt := Quaternion.IDENTITY
var _scale := 1.0
var _flip := PI          ## the car models face +Z; the CC0 motorcycle faces -Z

func setup(game_ref: Node, kind_name: String, model: String, idx: int) -> void:
	game = game_ref
	kind = kind_name
	index = idx
	match kind:
		"moto":
			max_speed = 30.0
			accel = 12.0
			turn = 2.3
			seat = Vector3(0, 0.42, 0.25)
			exit_offset = Vector3(-1.2, 0, 0)
		"boat":
			max_speed = 11.0
			accel = 2.5
			turn = 0.45
			seat = Vector3(0, 0.62, 5.0)
			exit_offset = Vector3(0, 0, 3.0)
	if kind == "boat":
		body = AnimatableBody3D.new()
		(body as AnimatableBody3D).sync_to_physics = false   # moved from _physics_process (sync mode reset the position)
		_build_ferry()
	else:
		var cb := CharacterBody3D.new()
		cb.floor_max_angle = deg_to_rad(42.0)
		cb.floor_snap_length = 0.6
		body = cb
		_build_road_vehicle(model)
	body.collision_layer = 1
	body.collision_mask = 1
	body.set_meta("vehicle", self)
	add_child(body)

func _build_road_vehicle(model: String) -> void:
	var path := "res://assets/vehicles/%s.scn" % model
	visual = (load(path) as PackedScene).instantiate() if ResourceLoader.exists(path) else Node3D.new()
	var box := Items._bounds(visual)
	var sc := 1.0
	if kind == "moto":
		sc = 2.1 / maxf(0.01, box.size.z)   # the CC0 motorcycle model is tiny; make it ~2.1 m long
	_scale = sc
	_flip = 0.0 if kind == "moto" else PI
	visual.scale = Vector3.ONE * sc
	# Vehicles drive toward -Z like the player
	visual.rotation.y = _flip
	visual.position.y = -box.position.y * sc
	body.add_child(visual)
	for m: MeshInstance3D in visual.find_children("*", "MeshInstance3D", true, false):
		m.visibility_range_end = 260.0
	var cs := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = Vector3(box.size.x, box.size.y * 0.8, box.size.z) * sc
	if kind == "moto":
		shape.size = Vector3(0.6, 1.1, 2.0)
	cs.shape = shape
	cs.position.y = shape.size.y * 0.5 + 0.15
	body.add_child(cs)

## A ~16 m landing ferry: flat car deck, side rails, wheelhouse at the stern, ramp at the bow.
func _build_ferry() -> void:
	visual = Node3D.new()
	body.add_child(visual)
	var white := StandardMaterial3D.new()
	white.albedo_color = Color("eef1f3")
	white.roughness = 0.5
	var red := StandardMaterial3D.new()
	red.albedo_color = Color("c62828")
	var deck_m := StandardMaterial3D.new()
	deck_m.albedo_color = Color("4a4f55")
	deck_m.roughness = 0.9
	var glass := StandardMaterial3D.new()
	glass.albedo_color = Color(0.25, 0.4, 0.55, 0.7)
	glass.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	var yellow := StandardMaterial3D.new()
	yellow.albedo_color = Color("f2c94c")
	# [center, size, material, collide, rotation_x]
	var parts := [
		[Vector3(0, -0.45, 0), Vector3(7.0, 1.9, 16.0), white, true, 0.0],         # hull
		[Vector3(0, -0.2, 0), Vector3(7.06, 0.35, 16.06), red, false, 0.0],        # stripe
		[Vector3(0, 0.55, 0.5), Vector3(6.2, 0.12, 15.0), deck_m, true, 0.0],      # car deck
		[Vector3(-3.3, 1.2, 0.5), Vector3(0.25, 1.2, 15.0), white, true, 0.0],     # rails
		[Vector3(3.3, 1.2, 0.5), Vector3(0.25, 1.2, 15.0), white, true, 0.0],
		[Vector3(0, 2.0, 6.6), Vector3(4.2, 2.8, 2.6), white, true, 0.0],          # wheelhouse
		[Vector3(0, 2.6, 5.28), Vector3(3.6, 0.9, 0.06), glass, false, 0.0],
		[Vector3(0, 3.5, 6.6), Vector3(4.6, 0.2, 3.0), red, false, 0.0],           # roof
		[Vector3(0, 0.2, -9.6), Vector3(5.6, 0.12, 4.2), yellow, true, -0.17],     # bow ramp
	]
	for p in parts:
		var mi := MeshInstance3D.new()
		var bm := BoxMesh.new()
		bm.size = p[1]
		bm.material = p[2]
		mi.mesh = bm
		mi.position = p[0]
		mi.rotation.x = float(p[4])
		visual.add_child(mi)
		if p[3]:
			var cs := CollisionShape3D.new()
			var shape := BoxShape3D.new()
			shape.size = p[1]
			cs.shape = shape
			cs.position = p[0]
			cs.rotation.x = float(p[4])
			body.add_child(cs)
	var tag := Label3D.new()
	tag.text = "RO-RO FERRY"
	tag.font_size = 48
	tag.modulate = Color("c62828")
	tag.position = Vector3(3.6, -0.1, 0)
	tag.rotation.y = PI * 0.5
	tag.pixel_size = 0.01
	visual.add_child(tag)

# ── Driving ──────────────────────────────────────────────────

func place(pos: Vector3, yaw: float) -> void:
	heading = yaw
	body.global_position = pos
	body.rotation.y = yaw
	_target = pos
	_target_yaw = yaw

## Orientation for a seated rider (the soldier faces +Z; vehicles drive toward -Z).
func rider_basis() -> Basis:
	var lean := 0.0
	if kind == "moto" and driver:
		lean = Input.get_axis("move_left", "move_right") * clampf(speed / max_speed, 0.0, 1.0) * 0.35
	return Basis(Vector3.UP, heading) * Basis(_tilt) * Basis(Vector3.FORWARD, lean) * Basis(Vector3.UP, PI)

func is_free() -> bool:
	return driver == null and remote_driver.is_empty()

func seat_transform() -> Transform3D:
	return body.global_transform * Transform3D(Basis.IDENTITY, seat)

func exit_point() -> Vector3:
	return body.global_transform * (seat + exit_offset)

func label() -> String:
	return {"car": "DRIVE", "moto": "RIDE", "boat": "STEER"}.get(kind, "DRIVE")

## input.y < 0 = forward (like the move stick), input.x = steer; brake = jump button.
func drive(input: Vector2, brake: bool, delta: float) -> void:
	var throttle := -input.y
	if brake:
		speed = move_toward(speed, 0.0, accel * 2.5 * delta)
	elif absf(throttle) > 0.05:
		var target := max_speed * throttle if throttle > 0.0 else max_speed * 0.4 * throttle
		speed = move_toward(speed, target, accel * delta * (1.6 if signf(target) != signf(speed) else 1.0))
	else:
		speed = move_toward(speed, 0.0, accel * 0.45 * delta)
	var grip := clampf(absf(speed) / 6.0, 0.0, 1.0) if kind != "boat" else clampf(absf(speed) / 3.0, 0.2, 1.0)
	heading -= input.x * turn * grip * signf(speed if absf(speed) > 0.3 else 1.0) * delta

func _physics_process(delta: float) -> void:
	if game == null:
		return
	if driver == null and not remote_driver.is_empty():
		_follow_remote(delta)
		return
	match kind:
		"boat": _boat_step(delta)
		_: _road_step(delta)
	if driver != null and game.net.active:
		_net_t -= delta
		if _net_t <= 0.0:
			_net_t = 0.1
			game.net.send({"t": "veh", "i": index, "p": RoyaleNet.v3(body.global_position), "y": snappedf(heading, 0.01), "s": snappedf(speed, 0.1)})

func _road_step(delta: float) -> void:
	var cb := body as CharacterBody3D
	# Parked and settled: nothing to simulate
	if driver == null and absf(speed) < 0.05 and cb.is_on_floor() and cb.velocity.length() < 1.5:
		return
	if driver == null:
		speed = move_toward(speed, 0.0, 6.0 * delta)
	var fwd := Vector3(-sin(heading), 0, -cos(heading))
	var vel := fwd * speed
	vel.y = cb.velocity.y - 22.0 * delta if not cb.is_on_floor() else -1.0
	cb.velocity = vel
	cb.rotation.y = heading
	cb.move_and_slide()
	if cb.is_on_wall() and absf(speed) > 2.0:
		speed *= 0.4
		if absf(speed) > 6.0 and game.has_method("play_sfx"):
			game.play_sfx("punch", cb.global_position)
	# Lean into the slope (and into turns on the motorcycle)
	var n := cb.get_floor_normal() if cb.is_on_floor() else Vector3.UP
	var local_up := (cb.global_basis.inverse() * n).normalized()
	_tilt = _tilt.slerp(Quaternion(Vector3.UP, local_up), 1.0 - exp(-delta * 8.0))
	var lean := 0.0
	if kind == "moto" and driver:
		lean = Input.get_axis("move_left", "move_right") * clampf(speed / max_speed, 0.0, 1.0) * 0.35
	visual.basis = Basis(_tilt) * Basis(Vector3.FORWARD, lean) * Basis(Vector3.UP, _flip) * Basis.from_scale(Vector3.ONE * _scale)
	# The sea floor keeps sinking cars; stop at the edge of the map
	if cb.global_position.y < -3.0:
		speed = 0.0
	_run_over(fwd)

func _boat_step(delta: float) -> void:
	if driver == null:
		speed = move_toward(speed, 0.0, 1.5 * delta)
	var fwd := Vector3(-sin(heading), 0, -cos(heading))
	var next := body.global_position + fwd * speed * delta
	# Ferries can't drive onto land (the bow can touch the beach to load cars)
	var bow := next + fwd * 6.0 * signf(speed)
	if game.world.height_at(bow.x, bow.z) > -0.2:
		speed = 0.0
		next = body.global_position
	_bob_t += delta
	next.y = RoyaleWorld.WATER_Y + 0.05 + sin(_bob_t * 0.9) * 0.08
	body.global_transform = Transform3D(Basis(Vector3.UP, heading) * Basis(Vector3.FORWARD, sin(_bob_t * 0.7) * 0.012), next)

func _follow_remote(delta: float) -> void:
	var t := 1.0 - exp(-delta * 10.0)
	heading = lerp_angle(heading, _target_yaw, t)
	var p := body.global_position.lerp(_target, t)
	if kind == "boat":
		body.global_transform = Transform3D(Basis(Vector3.UP, heading), p)
	else:
		body.global_position = p
		body.rotation.y = heading

## Classmate is driving: their game sends where it is.
func apply_net(m: Dictionary, username: String) -> void:
	remote_driver = username
	_target = RoyaleNet.to_v3(m.get("p"))
	_target_yaw = float(m.get("y", heading))
	speed = float(m.get("s", 0.0))
	if body.global_position.distance_to(_target) > 30.0:
		place(_target, _target_yaw)

## Fast vehicles knock down anyone in front of them (the driver's game deals the damage).
func _run_over(fwd: Vector3) -> void:
	if driver == null or absf(speed) < 7.0:
		return
	var front := body.global_position + fwd * 2.2 * signf(speed)
	for c in game.combatants:
		if c == driver or not c.is_alive():
			continue
		if c.global_position.distance_to(front) < 2.0:
			c.take_damage(absf(speed) * 4.0, false, String(driver.combatant_name))
			speed *= 0.6
