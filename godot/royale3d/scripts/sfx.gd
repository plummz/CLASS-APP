class_name RoyaleSfx
extends Node
## All sounds are synthesised at start-up (no audio files): gunshots per weapon class, reload,
## empty click, hit marker, heal, pickup, explosion, parachute, plane and wind loops, zone buzz.
## World sounds (other players' shots) play from a pool of positional players.

const RATE := 22050

var streams := {}
var ui_players: Array[AudioStreamPlayer] = []
var world_players: Array[AudioStreamPlayer3D] = []
var loop_player: AudioStreamPlayer
var volume_db := 0.0
var _rng := RandomNumberGenerator.new()

func _ready() -> void:
	_rng.seed = 7
	streams.shot_pistol = _shot(0.16, 0.55, 2600.0)
	streams.shot_smg = _shot(0.12, 0.45, 3000.0)
	streams.shot_shotgun = _shot(0.38, 0.85, 900.0)
	streams.shot_ar = _shot(0.2, 0.65, 1900.0)
	streams.shot_dmr = _shot(0.32, 0.8, 1400.0)
	streams.shot_sniper = _shot(0.55, 0.95, 1100.0)
	streams.shot_lmg = _shot(0.2, 0.7, 1700.0)
	streams.empty = _click(0.04, 2400.0)
	streams.reload = _two_clicks()
	streams.hit = _tone(0.06, 1700.0, 0.5, 40.0)
	streams.kill = _tone(0.22, 880.0, 0.5, 9.0)
	streams.heal = _noise(0.5, 0.18, 6.0, 4000.0)
	streams.pickup = _tone(0.09, 1200.0, 0.4, 25.0)
	streams.explosion = _shot(1.2, 1.0, 380.0)
	streams.chute = _noise(0.6, 0.5, 3.0, 800.0)
	streams.zone = _tone(0.3, 140.0, 0.35, 6.0)
	streams.punch = _shot(0.08, 0.5, 600.0)
	streams.plane = _loop_noise(2.0, 0.35, 160.0)
	streams.wind = _loop_noise(2.0, 0.4, 900.0)
	for i in 4:
		var p := AudioStreamPlayer.new()
		add_child(p)
		ui_players.append(p)
	for i in 10:
		var p3 := AudioStreamPlayer3D.new()
		p3.unit_size = 14.0
		p3.max_distance = 420.0
		p3.attenuation_model = AudioStreamPlayer3D.ATTENUATION_INVERSE_DISTANCE
		add_child(p3)
		world_players.append(p3)
	loop_player = AudioStreamPlayer.new()
	add_child(loop_player)

func set_volume(linear: float) -> void:
	volume_db = linear_to_db(maxf(0.001, linear))
	for p in ui_players: p.volume_db = volume_db
	for p in world_players: p.volume_db = volume_db
	loop_player.volume_db = volume_db - 8.0

static func shot_key(gun_id: String) -> String:
	if gun_id.is_empty():
		return "punch"
	return "shot_" + String(Items.gun(gun_id).kind)

func play(name: String, pitch := 1.0) -> void:
	if not streams.has(name):
		return
	for p in ui_players:
		if not p.playing:
			p.stream = streams[name]
			p.pitch_scale = pitch * _rng.randf_range(0.96, 1.04)
			p.play()
			return
	ui_players[0].stream = streams[name]
	ui_players[0].play()

func play_at(name: String, pos: Vector3, pitch := 1.0) -> void:
	if not streams.has(name):
		return
	var best: AudioStreamPlayer3D = world_players[0]
	for p in world_players:
		if not p.playing:
			best = p
			break
	best.stream = streams[name]
	best.global_position = pos
	best.pitch_scale = pitch * _rng.randf_range(0.94, 1.06)
	best.play()

func set_loop(name: String) -> void:
	if name.is_empty():
		loop_player.stop()
		return
	if loop_player.stream == streams.get(name) and loop_player.playing:
		return
	loop_player.stream = streams.get(name)
	loop_player.play()

# ── Synthesis ────────────────────────────────────────────────

func _wav(samples: PackedFloat32Array, loop := false) -> AudioStreamWAV:
	var data := PackedByteArray()
	data.resize(samples.size() * 2)
	for i in samples.size():
		data.encode_s16(i * 2, int(clampf(samples[i], -1.0, 1.0) * 32000.0))
	var s := AudioStreamWAV.new()
	s.format = AudioStreamWAV.FORMAT_16_BITS
	s.mix_rate = RATE
	s.data = data
	if loop:
		s.loop_mode = AudioStreamWAV.LOOP_FORWARD
		s.loop_end = samples.size()
	return s

## Gunshot: a sharp noise crack through a one-pole low-pass, plus a low thump.
func _shot(duration: float, loud: float, cutoff: float) -> AudioStreamWAV:
	var n := int(duration * RATE)
	var out := PackedFloat32Array()
	out.resize(n)
	var lp := 0.0
	var a := clampf(cutoff / RATE * TAU, 0.01, 1.0)
	for i in n:
		var t := float(i) / RATE
		var env := exp(-t * (9.0 / duration))
		var noise := _rng.randf_range(-1.0, 1.0)
		lp += (noise - lp) * a
		var thump := sin(TAU * (90.0 - t * 60.0) * t) * exp(-t * 18.0)
		out[i] = (lp * 1.6 + thump * 0.7) * env * loud
	return _wav(out)

func _click(duration: float, freq: float) -> AudioStreamWAV:
	var n := int(duration * RATE)
	var out := PackedFloat32Array()
	out.resize(n)
	for i in n:
		var t := float(i) / RATE
		out[i] = sin(TAU * freq * t) * exp(-t * 90.0) * 0.5
	return _wav(out)

func _two_clicks() -> AudioStreamWAV:
	var n := int(0.5 * RATE)
	var out := PackedFloat32Array()
	out.resize(n)
	for i in n:
		var t := float(i) / RATE
		var v := 0.0
		for start in [0.0, 0.32]:
			var u: float = t - start
			if u >= 0.0:
				v += (sin(TAU * 1800.0 * u) * 0.4 + _rng.randf_range(-0.3, 0.3)) * exp(-u * 60.0)
		out[i] = v * 0.6
	return _wav(out)

func _tone(duration: float, freq: float, loud: float, decay: float) -> AudioStreamWAV:
	var n := int(duration * RATE)
	var out := PackedFloat32Array()
	out.resize(n)
	for i in n:
		var t := float(i) / RATE
		out[i] = sin(TAU * freq * t) * exp(-t * decay) * loud
	return _wav(out)

func _noise(duration: float, loud: float, decay: float, cutoff: float) -> AudioStreamWAV:
	var n := int(duration * RATE)
	var out := PackedFloat32Array()
	out.resize(n)
	var lp := 0.0
	var a := clampf(cutoff / RATE * TAU, 0.01, 1.0)
	for i in n:
		var t := float(i) / RATE
		lp += (_rng.randf_range(-1.0, 1.0) - lp) * a
		out[i] = lp * loud * minf(1.0, t * 20.0) * exp(-t * decay)
	return _wav(out)

func _loop_noise(duration: float, loud: float, cutoff: float) -> AudioStreamWAV:
	var n := int(duration * RATE)
	var out := PackedFloat32Array()
	out.resize(n)
	var lp := 0.0
	var a := clampf(cutoff / RATE * TAU, 0.01, 1.0)
	for i in n:
		lp += (_rng.randf_range(-1.0, 1.0) - lp) * a
		out[i] = lp * loud * 2.0
	# Cross-fade the ends so the loop has no click
	var fade := int(0.05 * RATE)
	for i in fade:
		var w := float(i) / fade
		out[i] = out[i] * w + out[n - fade + i] * (1.0 - w)
	return _wav(out, true)
