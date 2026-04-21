/* ============================================================
   POKEMON MODULE — Overworld + Battle (Stage 1)
   ============================================================ */
const pokemonModule = (() => {
  /* ── TILE TYPES ── */
  const T = { WATER:0, GRASS:1, PATH:2, TALL:3, TREE:4, BUILDING:5, SAND:6, ROCK:7, FLOOR:8, COUNTER:9 };
  const TSIZE = 32, CHAR_S = 24;
  let MAP_W = 50, MAP_H = 40;
  const TILE_COLORS = [
    '#1878b8', // WATER  — clear bright blue
    '#3a8c32', // GRASS  — vibrant field green
    '#c8a860', // PATH   — warm dirt path
    '#286828', // TALL   — deeper grass green
    '#1a380a', // TREE   — very dark green (canopy base)
    '#f5e8c8', // BUILDING — cream wall base
    '#d8b870', // SAND   — warm sandy tan
    '#8a7a6a', // ROCK   — grey-brown stone
    '#c8c0b8', // FLOOR  — base (per-interior override in drawTile)
    '#7a5028', // COUNTER — dark wood furniture
  ];

  /* ── SPECIES DATA ── */
  const SP = {
    /* ── Starters ── */
    pikachu:   {name:'Pikachu',   types:['electric'],        dexId:25,  hp:35, atk:55,def:40, spd:90,  moves:['thunderShock','quickAtk','tailWhip','growl'],   xpY:112,catchRate:190,starter:true, evolvesAt:36, evolvesInto:'raichu', stoneEvolves:{thunderStone:'raichu'}},
    bulbasaur: {name:'Bulbasaur', types:['grass','poison'],  dexId:1,   hp:45, atk:49,def:49, spd:45,  moves:['vineWhip','tackle','growl','tailWhip'],          xpY:64, catchRate:45, starter:true, evolvesAt:16, evolvesInto:'ivysaur'},
    squirtle:  {name:'Squirtle',  types:['water'],           dexId:7,   hp:44, atk:48,def:65, spd:43,  moves:['waterGun','tackle','tailWhip','growl'],          xpY:65, catchRate:45, starter:true, evolvesAt:16, evolvesInto:'wartortle'},
    chikorita: {name:'Chikorita', types:['grass'],           dexId:152, hp:45, atk:49,def:65, spd:45,  moves:['razorLeaf','tackle','growl','tailWhip'],         xpY:64, catchRate:45, starter:true, evolvesAt:16, evolvesInto:'bayleef'},
    torchic:   {name:'Torchic',   types:['fire'],            dexId:255, hp:45, atk:60,def:40, spd:45,  moves:['ember','scratch','growl','tackle'],              xpY:62, catchRate:45, starter:true, evolvesAt:16, evolvesInto:'combusken'},
    cyndaquil: {name:'Cyndaquil', types:['fire'],            dexId:155, hp:39, atk:52,def:43, spd:65,  moves:['ember','tackle','leer','smokescreen'],           xpY:62, catchRate:45, starter:true, evolvesAt:14, evolvesInto:'quilava'},
    totodile:  {name:'Totodile',  types:['water'],           dexId:158, hp:50, atk:65,def:64, spd:43,  moves:['waterGun','scratch','leer','tackle'],            xpY:63, catchRate:45, starter:true, evolvesAt:18, evolvesInto:'croconaw'},
    mudkip:    {name:'Mudkip',    types:['water','ground'],  dexId:258, hp:50, atk:70,def:50, spd:40,  moves:['waterGun','tackle','growl','mudSlap'],           xpY:62, catchRate:45, starter:true, evolvesAt:16, evolvesInto:'marshtomp'},
    treecko:   {name:'Treecko',   types:['grass'],           dexId:252, hp:40, atk:45,def:35, spd:70,  moves:['pound','leer','absorb','quickAtk'],              xpY:62, catchRate:45, starter:true, evolvesAt:16, evolvesInto:'grovyle'},
    eevee:     {name:'Eevee',     types:['normal'],          dexId:133, hp:55, atk:55,def:50, spd:55,  moves:['tackle','quickAtk','sandAtk','growl'],           xpY:92, catchRate:45, starter:true, evolvesAt:36, evolvesInto:'vaporeon', stoneEvolves:{waterStone:'vaporeon',thunderStone:'jolteon',fireStone:'flareon'}},
    /* ── Wild Pokémon ── */
    rattata:   {name:'Rattata',   types:['normal'],          dexId:19,  hp:30, atk:56,def:35, spd:72,  moves:['tackle','quickAtk'],                            xpY:51, catchRate:255, evolvesAt:20, evolvesInto:'raticate'},
    pidgey:    {name:'Pidgey',    types:['normal','flying'], dexId:16,  hp:40, atk:45,def:40, spd:56,  moves:['tackle','gust'],                                xpY:50, catchRate:255, evolvesAt:18, evolvesInto:'pidgeotto'},
    caterpie:  {name:'Caterpie',  types:['bug'],             dexId:10,  hp:45, atk:30,def:35, spd:45,  moves:['tackle','stringShot'],                          xpY:39, catchRate:255, evolvesAt:7,  evolvesInto:'metapod'},
    weedle:    {name:'Weedle',    types:['bug','poison'],    dexId:13,  hp:40, atk:35,def:30, spd:50,  moves:['poisonSting','stringShot'],                     xpY:39, catchRate:255, evolvesAt:7,  evolvesInto:'kakuna'},
    oddish:    {name:'Oddish',    types:['grass','poison'],  dexId:43,  hp:45, atk:50,def:55, spd:30,  moves:['absorb','poisonSting'],                         xpY:64, catchRate:255, evolvesAt:21, evolvesInto:'gloom', stoneEvolves:{leafStone:'vileplume'}},
    psyduck:   {name:'Psyduck',   types:['water'],           dexId:54,  hp:50, atk:52,def:48, spd:55,  moves:['scratch','waterGun'],                           xpY:80, catchRate:190, evolvesAt:33, evolvesInto:'golduck'},
    geodude:   {name:'Geodude',   types:['rock','ground'],   dexId:74,  hp:40, atk:80,def:100,spd:20,  moves:['tackle','rockThrow'],                           xpY:86, catchRate:255, evolvesAt:25, evolvesInto:'graveler'},
    zubat:     {name:'Zubat',     types:['poison','flying'], dexId:41,  hp:40, atk:45,def:35, spd:55,  moves:['leechLife','tackle'],                           xpY:49, catchRate:255, evolvesAt:22, evolvesInto:'golbat'},
    magikarp:  {name:'Magikarp',  types:['water'],           dexId:129, hp:20, atk:10,def:55, spd:80,  moves:['splash','tackle'],                              xpY:40, catchRate:255, evolvesAt:20, evolvesInto:'gyarados'},
    gastly:    {name:'Gastly',    types:['ghost','poison'],  dexId:92,  hp:30, atk:35,def:30, spd:80,  moves:['lick','poisonSting'],                           xpY:95, catchRate:190, evolvesAt:25, evolvesInto:'haunter'},
    /* ── Evolved forms (not wild-spawnable, used for evolution targets) ── */
    raichu:    {name:'Raichu',    types:['electric'],        dexId:26,  hp:60, atk:90,def:55, spd:110, moves:['thunderShock','quickAtk','thunderbolt','tailWhip'],xpY:122,catchRate:75},
    ivysaur:   {name:'Ivysaur',   types:['grass','poison'],  dexId:2,   hp:60, atk:62,def:63, spd:60,  moves:['vineWhip','tackle','razorLeaf','growl'],         xpY:142,catchRate:45, evolvesAt:32, evolvesInto:'venusaur'},
    venusaur:  {name:'Venusaur',  types:['grass','poison'],  dexId:3,   hp:80, atk:82,def:83, spd:80,  moves:['vineWhip','razorLeaf','solarBeam','growl'],      xpY:236,catchRate:45},
    wartortle: {name:'Wartortle', types:['water'],           dexId:8,   hp:59, atk:63,def:80, spd:58,  moves:['waterGun','tackle','surf','tailWhip'],           xpY:143,catchRate:45, evolvesAt:36, evolvesInto:'blastoise'},
    blastoise: {name:'Blastoise', types:['water'],           dexId:9,   hp:79, atk:83,def:100,spd:78,  moves:['waterGun','surf','hydropump','tackle'],          xpY:239,catchRate:45},
    bayleef:   {name:'Bayleef',   types:['grass'],           dexId:153, hp:60, atk:62,def:80, spd:60,  moves:['razorLeaf','tackle','bodySlam','growl'],         xpY:142,catchRate:45},
    combusken: {name:'Combusken', types:['fire','fighting'], dexId:256, hp:60, atk:85,def:60, spd:55,  moves:['ember','scratch','bodySlam','growl'],            xpY:142,catchRate:45},
    quilava:   {name:'Quilava',   types:['fire'],            dexId:156, hp:58, atk:64,def:58, spd:80,  moves:['ember','tackle','flamethrower','smokescreen'],   xpY:142,catchRate:45},
    croconaw:  {name:'Croconaw',  types:['water'],           dexId:159, hp:65, atk:80,def:80, spd:58,  moves:['waterGun','scratch','surf','leer'],              xpY:142,catchRate:45},
    marshtomp: {name:'Marshtomp', types:['water','ground'],  dexId:259, hp:70, atk:85,def:70, spd:50,  moves:['waterGun','mudSlap','surf','tackle'],            xpY:142,catchRate:45},
    grovyle:   {name:'Grovyle',   types:['grass'],           dexId:253, hp:50, atk:65,def:45, spd:95,  moves:['pound','absorb','razorLeaf','quickAtk'],         xpY:142,catchRate:45},
    vaporeon:  {name:'Vaporeon',  types:['water'],           dexId:134, hp:130,atk:65,def:60, spd:65,  moves:['waterGun','quickAtk','surf','tackle'],           xpY:184,catchRate:45},
    raticate:  {name:'Raticate',  types:['normal'],          dexId:20,  hp:55, atk:81,def:60, spd:97,  moves:['tackle','quickAtk','hyperFang','bodySlam'],      xpY:145,catchRate:90},
    pidgeotto: {name:'Pidgeotto', types:['normal','flying'], dexId:17,  hp:63, atk:60,def:55, spd:71,  moves:['tackle','gust','wingAtk','quickAtk'],            xpY:122,catchRate:120,evolvesAt:36, evolvesInto:'pidgeot'},
    pidgeot:   {name:'Pidgeot',   types:['normal','flying'], dexId:18,  hp:83, atk:80,def:75, spd:101, moves:['gust','wingAtk','quickAtk','tackle'],            xpY:216,catchRate:45},
    metapod:   {name:'Metapod',   types:['bug'],             dexId:11,  hp:50, atk:20,def:55, spd:30,  moves:['tackle','stringShot'],                          xpY:72, catchRate:120,evolvesAt:10, evolvesInto:'butterfree'},
    butterfree: {name:'Butterfree',types:['bug','flying'],   dexId:12,  hp:60, atk:45,def:50, spd:70,  moves:['gust','tackle','wingAtk','stringShot'],          xpY:178,catchRate:45},
    kakuna:    {name:'Kakuna',    types:['bug','poison'],    dexId:14,  hp:45, atk:25,def:50, spd:35,  moves:['poisonSting','stringShot'],                     xpY:72, catchRate:120,evolvesAt:10, evolvesInto:'beedrill'},
    beedrill:  {name:'Beedrill',  types:['bug','poison'],    dexId:15,  hp:65, atk:90,def:40, spd:75,  moves:['poisonSting','tackle','bodySlam','quickAtk'],    xpY:178,catchRate:45},
    gloom:     {name:'Gloom',     types:['grass','poison'],  dexId:44,  hp:60, atk:65,def:70, spd:40,  moves:['absorb','poisonSting','razorLeaf','sludgeBomb'], xpY:138,catchRate:120, stoneEvolves:{leafStone:'vileplume'}},
    golduck:   {name:'Golduck',   types:['water'],           dexId:55,  hp:80, atk:82,def:78, spd:85,  moves:['waterGun','scratch','surf','bodySlam'],          xpY:174,catchRate:75},
    graveler:  {name:'Graveler',  types:['rock','ground'],   dexId:75,  hp:55, atk:95,def:115,spd:35,  moves:['tackle','rockThrow','bodySlam','mudSlap'],       xpY:164,catchRate:120},
    golbat:    {name:'Golbat',    types:['poison','flying'], dexId:42,  hp:75, atk:80,def:70, spd:90,  moves:['leechLife','tackle','wingAtk','poisonSting'],    xpY:171,catchRate:90},
    gyarados:  {name:'Gyarados',  types:['water','flying'],  dexId:130, hp:95, atk:125,def:79,spd:81,  moves:['waterGun','tackle','surf','bodySlam'],           xpY:214,catchRate:45},
    haunter:   {name:'Haunter',   types:['ghost','poison'],  dexId:93,  hp:45, atk:50,def:45, spd:95,  moves:['lick','shadowBall','poisonSting','tackle'],      xpY:126,catchRate:90},
    /* ── Stone-evolution targets ── */
    ninetales: {name:'Ninetales', types:['fire'],            dexId:38,  hp:73, atk:76,def:75, spd:100, moves:['ember','tailWhip','flamethrower','quickAtk'],       xpY:177,catchRate:75},
    arcanine:  {name:'Arcanine',  types:['fire'],            dexId:59,  hp:90, atk:110,def:80,spd:95,  moves:['ember','bite','flamethrower','bodySlam'],           xpY:194,catchRate:75},
    clefable:  {name:'Clefable',  types:['normal'],          dexId:36,  hp:95, atk:70,def:73, spd:60,  moves:['pound','growl','bodySlam','quickAtk'],              xpY:129,catchRate:25},
    wigglytuff:{name:'Wigglytuff',types:['normal'],          dexId:40,  hp:140,atk:70,def:45, spd:45,  moves:['pound','growl','bodySlam','quickAtk'],              xpY:109,catchRate:50},
    jolteon:   {name:'Jolteon',   types:['electric'],        dexId:135, hp:65, atk:65,def:60, spd:130, moves:['thunderShock','quickAtk','thunderbolt','tackle'],   xpY:184,catchRate:45},
    flareon:   {name:'Flareon',   types:['fire'],            dexId:136, hp:65, atk:130,def:60,spd:65,  moves:['ember','quickAtk','flamethrower','bodySlam'],       xpY:184,catchRate:45},
    vileplume: {name:'Vileplume', types:['grass','poison'],  dexId:45,  hp:75, atk:80,def:85, spd:50,  moves:['absorb','poisonSting','razorLeaf','solarBeam'],     xpY:221,catchRate:45},
    /* ── Additional wild Pokémon (Gen 1) ── */
    spearow:   {name:'Spearow',   types:['normal','flying'], dexId:21,  hp:40, atk:60,def:30, spd:70,  moves:['peck','growl'],                                  xpY:52, catchRate:255},
    ekans:     {name:'Ekans',     types:['poison'],          dexId:23,  hp:35, atk:60,def:44, spd:55,  moves:['poisonSting','leer'],                            xpY:58, catchRate:255},
    clefairy:  {name:'Clefairy',  types:['normal'],          dexId:35,  hp:70, atk:45,def:48, spd:35,  moves:['pound','growl'],                                 xpY:68, catchRate:150, stoneEvolves:{moonStone:'clefable'}},
    vulpix:    {name:'Vulpix',    types:['fire'],            dexId:37,  hp:38, atk:41,def:40, spd:65,  moves:['ember','tailWhip'],                              xpY:60, catchRate:190, stoneEvolves:{fireStone:'ninetales'}},
    jigglypuff:{name:'Jigglypuff',types:['normal'],          dexId:39,  hp:115,atk:45,def:20, spd:20,  moves:['pound','growl'],                                 xpY:76, catchRate:170, stoneEvolves:{moonStone:'wigglytuff'}},
    paras:     {name:'Paras',     types:['bug','grass'],     dexId:46,  hp:35, atk:70,def:55, spd:25,  moves:['scratch','absorb'],                              xpY:57, catchRate:190},
    venonat:   {name:'Venonat',   types:['bug','poison'],    dexId:48,  hp:60, atk:55,def:50, spd:45,  moves:['tackle','poisonSting'],                          xpY:61, catchRate:190},
    meowth:    {name:'Meowth',    types:['normal'],          dexId:52,  hp:40, atk:45,def:35, spd:90,  moves:['scratch','growl'],                               xpY:69, catchRate:255},
    growlithe: {name:'Growlithe', types:['fire'],            dexId:58,  hp:55, atk:70,def:45, spd:60,  moves:['ember','bite'],                                  xpY:91, catchRate:190, stoneEvolves:{fireStone:'arcanine'}},
    poliwag:   {name:'Poliwag',   types:['water'],           dexId:60,  hp:40, atk:50,def:40, spd:90,  moves:['waterGun','tackle'],                             xpY:60, catchRate:255},
    bellsprout:{name:'Bellsprout',types:['grass','poison'],  dexId:69,  hp:50, atk:75,def:35, spd:40,  moves:['vineWhip','poisonSting'],                        xpY:60, catchRate:255},
    shellder:  {name:'Shellder',  types:['water'],           dexId:90,  hp:30, atk:65,def:100,spd:40,  moves:['tackle','waterGun'],                             xpY:61, catchRate:190},
    krabby:    {name:'Krabby',    types:['water'],           dexId:98,  hp:30, atk:105,def:90,spd:50,  moves:['tackle','waterGun'],                             xpY:65, catchRate:225},
    horsea:    {name:'Horsea',    types:['water'],           dexId:116, hp:30, atk:40,def:70, spd:60,  moves:['bubble','smokescreen'],                          xpY:59, catchRate:225},
    jynx:      {name:'Jynx',      types:['ice','psychic'],   dexId:124, hp:65, atk:50,def:35, spd:95,  moves:['pound','iceBeam'],                               xpY:137,catchRate:45},
    electabuzz:{name:'Electabuzz',types:['electric'],        dexId:125, hp:65, atk:83,def:57, spd:105, moves:['thunderShock','thunderbolt'],                    xpY:156,catchRate:45},
    magmar:    {name:'Magmar',    types:['fire'],            dexId:126, hp:65, atk:95,def:57, spd:93,  moves:['ember','flamethrower'],                          xpY:167,catchRate:45},
    dratini:   {name:'Dratini',   types:['dragon'],          dexId:147, hp:41, atk:64,def:45, spd:50,  moves:['tackle','dragonRage'],                           xpY:67, catchRate:45},
    /* ── Additional wild Pokémon (Gen 2) ── */
    sentret:   {name:'Sentret',   types:['normal'],          dexId:161, hp:35, atk:46,def:34, spd:20,  moves:['scratch','growl'],                               xpY:43, catchRate:255},
    hoothoot:  {name:'Hoothoot',  types:['normal','flying'], dexId:163, hp:60, atk:30,def:30, spd:50,  moves:['tackle','peck'],                                 xpY:52, catchRate:255},
    ledyba:    {name:'Ledyba',    types:['bug','flying'],    dexId:165, hp:40, atk:20,def:30, spd:55,  moves:['tackle','stringShot'],                           xpY:51, catchRate:255},
    spinarak:  {name:'Spinarak',  types:['bug','poison'],    dexId:167, hp:40, atk:60,def:40, spd:30,  moves:['poisonSting','stringShot'],                      xpY:51, catchRate:255},
    mareep:    {name:'Mareep',    types:['electric'],        dexId:179, hp:55, atk:40,def:40, spd:35,  moves:['thunderShock','growl'],                          xpY:56, catchRate:235},
    aipom:     {name:'Aipom',     types:['normal'],          dexId:190, hp:55, atk:70,def:55, spd:85,  moves:['scratch','quickAtk'],                            xpY:72, catchRate:45},
    wooper:    {name:'Wooper',    types:['water','ground'],  dexId:194, hp:55, atk:45,def:45, spd:15,  moves:['waterGun','mudSlap'],                            xpY:42, catchRate:255},
    misdreavus:{name:'Misdreavus',types:['ghost'],           dexId:200, hp:60, atk:60,def:60, spd:85,  moves:['lick','shadowBall'],                             xpY:147,catchRate:45},
    teddiursa: {name:'Teddiursa', types:['normal'],          dexId:216, hp:60, atk:80,def:50, spd:40,  moves:['scratch','tackle'],                              xpY:66, catchRate:190},
    slugma:    {name:'Slugma',    types:['fire'],            dexId:218, hp:40, atk:40,def:40, spd:20,  moves:['ember','tackle'],                                xpY:50, catchRate:190},
    swinub:    {name:'Swinub',    types:['ice','ground'],    dexId:220, hp:50, atk:50,def:40, spd:50,  moves:['tackle','mudSlap'],                              xpY:50, catchRate:225},
    snubbull:  {name:'Snubbull',  types:['normal'],          dexId:209, hp:60, atk:80,def:50, spd:30,  moves:['tackle','bite'],                                 xpY:63, catchRate:190},
    /* ── 50 more wild Pokémon (Gen 1/2/3) ── */
    /* Gen 1 */
    nidoranF:  {name:'Nidoran♀', types:['poison'],          dexId:29,  hp:55, atk:47,def:52, spd:41,  moves:['tackle','growl'],                                 xpY:55, catchRate:235},
    nidoranM:  {name:'Nidoran♂', types:['poison'],          dexId:32,  hp:46, atk:57,def:40, spd:50,  moves:['poisonSting','leer'],                             xpY:55, catchRate:235},
    mankey:    {name:'Mankey',   types:['fighting'],         dexId:56,  hp:40, atk:80,def:35, spd:70,  moves:['scratch','leer'],                                 xpY:61, catchRate:190},
    tentacool: {name:'Tentacool',types:['water','poison'],   dexId:72,  hp:40, atk:40,def:35, spd:70,  moves:['bubble','poisonSting'],                           xpY:67, catchRate:190},
    slowpoke:  {name:'Slowpoke', types:['water','psychic'],  dexId:79,  hp:90, atk:65,def:65, spd:15,  moves:['tackle','waterGun'],                              xpY:99, catchRate:190},
    magnemite: {name:'Magnemite',types:['electric','steel'], dexId:81,  hp:25, atk:35,def:70, spd:45,  moves:['thunderShock','tackle'],                          xpY:65, catchRate:190},
    doduo:     {name:'Doduo',    types:['normal','flying'],  dexId:84,  hp:35, atk:85,def:45, spd:75,  moves:['peck','growl'],                                   xpY:62, catchRate:190},
    seel:      {name:'Seel',     types:['water'],            dexId:86,  hp:65, atk:45,def:55, spd:45,  moves:['tackle','waterGun'],                              xpY:65, catchRate:190},
    grimer:    {name:'Grimer',   types:['poison'],           dexId:88,  hp:80, atk:80,def:50, spd:25,  moves:['tackle','sludgeBomb'],                            xpY:90, catchRate:190},
    drowzee:   {name:'Drowzee',  types:['psychic'],          dexId:96,  hp:60, atk:48,def:45, spd:42,  moves:['pound','confusion'],                              xpY:102,catchRate:190},
    voltorb:   {name:'Voltorb',  types:['electric'],         dexId:100, hp:40, atk:30,def:50, spd:100, moves:['thunderShock','tackle'],                          xpY:66, catchRate:190},
    exeggcute: {name:'Exeggcute',types:['grass','psychic'],  dexId:102, hp:60, atk:40,def:80, spd:40,  moves:['absorb','confusion'],                             xpY:98, catchRate:90},
    cubone:    {name:'Cubone',   types:['ground'],           dexId:104, hp:50, atk:50,def:95, spd:35,  moves:['tackle','mudSlap'],                               xpY:87, catchRate:190},
    lickitung: {name:'Lickitung',types:['normal'],           dexId:108, hp:90, atk:55,def:75, spd:30,  moves:['tackle','lick'],                                  xpY:127,catchRate:45},
    rhyhorn:   {name:'Rhyhorn',  types:['ground','rock'],    dexId:111, hp:80, atk:85,def:95, spd:25,  moves:['tackle','rockThrow'],                             xpY:135,catchRate:120},
    chansey:   {name:'Chansey',  types:['normal'],           dexId:113, hp:250,atk:5, def:5,  spd:50,  moves:['pound','growl'],                                  xpY:395,catchRate:30},
    tangela:   {name:'Tangela',  types:['grass'],            dexId:114, hp:65, atk:55,def:115,spd:60,  moves:['absorb','vineWhip'],                              xpY:87, catchRate:45},
    kangaskhan:{name:'Kangaskhan',types:['normal'],          dexId:115, hp:105,atk:95,def:80, spd:90,  moves:['tackle','bodySlam'],                              xpY:175,catchRate:45},
    scyther:   {name:'Scyther',  types:['bug','flying'],     dexId:123, hp:70, atk:110,def:80,spd:105, moves:['tackle','wingAtk'],                               xpY:187,catchRate:45},
    lapras:    {name:'Lapras',   types:['water','ice'],      dexId:131, hp:130,atk:85,def:80, spd:60,  moves:['waterGun','iceBeam'],                             xpY:219,catchRate:45},
    eevee2:    {name:'Porygon',  types:['normal'],           dexId:137, hp:65, atk:60,def:70, spd:40,  moves:['tackle','psybeam'],                               xpY:130,catchRate:45},
    omanyte:   {name:'Omanyte',  types:['rock','water'],     dexId:138, hp:35, atk:40,def:100,spd:35,  moves:['waterGun','tackle'],                              xpY:120,catchRate:45},
    kabuto:    {name:'Kabuto',   types:['rock','water'],     dexId:140, hp:30, atk:80,def:90, spd:55,  moves:['tackle','rockThrow'],                             xpY:119,catchRate:45},
    aerodactyl:{name:'Aerodactyl',types:['rock','flying'],   dexId:142, hp:80, atk:105,def:65,spd:130, moves:['tackle','rockThrow','wingAtk','bite'],            xpY:202,catchRate:45},
    snorlax:   {name:'Snorlax',  types:['normal'],           dexId:143, hp:160,atk:110,def:65,spd:30,  moves:['tackle','bodySlam','lick','growl'],               xpY:154,catchRate:25},
    /* Gen 2 */
    flaaffy:   {name:'Flaaffy',  types:['electric'],         dexId:180, hp:70, atk:55,def:55, spd:45,  moves:['thunderShock','tackle','thunderbolt','growl'],    xpY:128,catchRate:120},
    marill:    {name:'Marill',   types:['water','fairy'],    dexId:183, hp:70, atk:20,def:50, spd:40,  moves:['tackle','waterGun','bubble','growl'],             xpY:88, catchRate:190},
    sudowoodo: {name:'Sudowoodo',types:['rock'],             dexId:185, hp:70, atk:100,def:115,spd:30, moves:['tackle','rockThrow','bodySlam'],                  xpY:144,catchRate:65},
    politoed:  {name:'Hoppip',   types:['grass','flying'],   dexId:187, hp:35, atk:35,def:35, spd:50,  moves:['tackle','absorb','gust'],                         xpY:50, catchRate:255},
    yanma:     {name:'Yanma',    types:['bug','flying'],     dexId:193, hp:65, atk:65,def:45, spd:95,  moves:['tackle','gust','wingAtk','bite'],                 xpY:78, catchRate:75},
    espeon:    {name:'Quagsire', types:['water','ground'],   dexId:195, hp:95, atk:85,def:85, spd:35,  moves:['waterGun','mudSlap','tackle','bodySlam'],         xpY:119,catchRate:90},
    umbreon:   {name:'Murkrow',  types:['dark','flying'],    dexId:198, hp:60, atk:85,def:42, spd:91,  moves:['peck','bite','tackle','leer'],                    xpY:107,catchRate:30},
    slowking:  {name:'Slowking', types:['water','psychic'],  dexId:199, hp:95, atk:75,def:80, spd:30,  moves:['waterGun','confusion','tackle','psychic'],        xpY:164,catchRate:70},
    girafarig: {name:'Girafarig',types:['normal','psychic'], dexId:203, hp:70, atk:80,def:65, spd:85,  moves:['tackle','psybeam','confusion','bite'],            xpY:108,catchRate:60},
    pineco:    {name:'Pineco',   types:['bug'],              dexId:204, hp:50, atk:65,def:90, spd:15,  moves:['tackle','stringShot','bodySlam'],                 xpY:58, catchRate:190},
    heracross: {name:'Heracross',types:['bug','fighting'],   dexId:214, hp:80, atk:125,def:75,spd:85,  moves:['tackle','bite','bodySlam','hornAtk'],             xpY:200,catchRate:45},
    sneasel:   {name:'Sneasel',  types:['dark','ice'],       dexId:215, hp:55, atk:95,def:55, spd:115, moves:['scratch','bite','quickAtk','leer'],               xpY:132,catchRate:35},
    /* Gen 3 */
    poochyena: {name:'Poochyena',types:['dark'],             dexId:261, hp:35, atk:55,def:35, spd:35,  moves:['tackle','bite'],                                  xpY:56, catchRate:255},
    zigzagoon: {name:'Zigzagoon',types:['normal'],           dexId:263, hp:38, atk:30,def:41, spd:60,  moves:['tackle','growl'],                                 xpY:56, catchRate:255},
    wurmple:   {name:'Wurmple',  types:['bug'],              dexId:265, hp:45, atk:45,def:35, spd:20,  moves:['tackle','stringShot','poisonSting'],              xpY:56, catchRate:255},
    lotad:     {name:'Lotad',    types:['water','grass'],    dexId:270, hp:40, atk:30,def:30, spd:30,  moves:['absorb','bubble','waterGun'],                     xpY:44, catchRate:255},
    taillow:   {name:'Taillow',  types:['normal','flying'],  dexId:276, hp:40, atk:55,def:30, spd:85,  moves:['peck','growl','wingAtk'],                         xpY:54, catchRate:200},
    shroomish: {name:'Shroomish',types:['grass'],            dexId:285, hp:60, atk:40,def:60, spd:35,  moves:['tackle','absorb','vineWhip'],                     xpY:59, catchRate:255},
    makuhita:  {name:'Makuhita', types:['fighting'],         dexId:296, hp:72, atk:60,def:30, spd:25,  moves:['tackle','bodySlam','leer'],                       xpY:47, catchRate:180},
    nosepass:  {name:'Nosepass', types:['rock'],             dexId:299, hp:30, atk:45,def:135,spd:30,  moves:['tackle','rockThrow'],                             xpY:75, catchRate:255},
    skitty:    {name:'Skitty',   types:['normal'],           dexId:300, hp:50, atk:45,def:45, spd:50,  moves:['tackle','growl','pound'],                         xpY:52, catchRate:255},
    electrike: {name:'Electrike',types:['electric'],         dexId:309, hp:40, atk:45,def:40, spd:65,  moves:['thunderShock','tackle','leer'],                   xpY:59, catchRate:120},
    roselia:   {name:'Roselia',  types:['grass','poison'],   dexId:315, hp:50, atk:60,def:45, spd:65,  moves:['vineWhip','poisonSting','absorb','razorLeaf'],    xpY:140,catchRate:150},
    carvanha:  {name:'Carvanha', types:['water','dark'],     dexId:318, hp:45, atk:90,def:20, spd:65,  moves:['waterGun','bite','tackle'],                       xpY:61, catchRate:225},
    numel:     {name:'Numel',    types:['fire','ground'],    dexId:322, hp:60, atk:60,def:40, spd:35,  moves:['ember','tackle','mudSlap'],                       xpY:61, catchRate:255},
    spoink:    {name:'Spoink',   types:['psychic'],          dexId:325, hp:60, atk:40,def:40, spd:60,  moves:['psybeam','tackle','confusion'],                   xpY:75, catchRate:255},
    swablu:    {name:'Swablu',   types:['normal','flying'],  dexId:333, hp:45, atk:40,def:60, spd:50,  moves:['peck','growl','wingAtk','tackle'],                xpY:62, catchRate:255},
    zangoose:  {name:'Zangoose', types:['normal'],           dexId:335, hp:73, atk:115,def:60,spd:90,  moves:['scratch','quickAtk','bodySlam','bite'],           xpY:160,catchRate:90},
    seviper:   {name:'Seviper',  types:['poison'],           dexId:336, hp:73, atk:100,def:60,spd:65,  moves:['poisonSting','bite','sludgeBomb','tackle'],       xpY:160,catchRate:90},
    trapinch:  {name:'Trapinch', types:['ground'],           dexId:328, hp:45, atk:100,def:45,spd:10,  moves:['tackle','bite','mudSlap'],                        xpY:58, catchRate:255},
    cacnea:    {name:'Cacnea',   types:['grass'],            dexId:331, hp:50, atk:85,def:40, spd:35,  moves:['absorb','tackle','vineWhip','poisonSting'],       xpY:67, catchRate:190},
    absol:     {name:'Absol',    types:['dark'],             dexId:359, hp:65, atk:130,def:60,spd:75,  moves:['scratch','bite','bodySlam','quickAtk'],           xpY:163,catchRate:30},
    wynaut:    {name:'Wynaut',   types:['psychic'],          dexId:360, hp:95, atk:23,def:48, spd:23,  moves:['tackle','confusion'],                             xpY:52, catchRate:125},
    bagon:     {name:'Bagon',    types:['dragon'],           dexId:371, hp:45, atk:75,def:60, spd:50,  moves:['tackle','dragonRage','bite'],                     xpY:60, catchRate:45},
    beldum:    {name:'Beldum',   types:['steel','psychic'],  dexId:374, hp:40, atk:55,def:80, spd:30,  moves:['tackle'],                                         xpY:151,catchRate:3},
  };
  const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
  function spriteUrl(speciesId, back=false){ const id=SP[speciesId]&&SP[speciesId].dexId; return id ? `${SPRITE_BASE}${back?'/back/':'/'}`+id+'.png' : ''; }

  /* ── MOVE DATA ── */
  const MV = {
    tackle:      {name:'Tackle',       type:'normal',  power:40, acc:100,cat:'physical',pp:35},
    scratch:     {name:'Scratch',      type:'normal',  power:40, acc:100,cat:'physical',pp:35},
    pound:       {name:'Pound',        type:'normal',  power:40, acc:100,cat:'physical',pp:35},
    quickAtk:    {name:'Quick Atk',    type:'normal',  power:40, acc:100,cat:'physical',pp:30},
    growl:       {name:'Growl',        type:'normal',  power:0,  acc:100,cat:'status',  pp:40, eff:'atkDown'},
    tailWhip:    {name:'Tail Whip',    type:'normal',  power:0,  acc:100,cat:'status',  pp:30, eff:'defDown'},
    leer:        {name:'Leer',         type:'normal',  power:0,  acc:100,cat:'status',  pp:30, eff:'defDown'},
    sandAtk:     {name:'Sand Attack',  type:'normal',  power:0,  acc:100,cat:'status',  pp:15, eff:'accDown'},
    smokescreen: {name:'Smokescreen',  type:'normal',  power:0,  acc:100,cat:'status',  pp:20, eff:'accDown'},
    splash:      {name:'Splash',       type:'normal',  power:0,  acc:100,cat:'status',  pp:40},
    thunderShock:{name:'Thunder Shock',type:'electric',power:40, acc:100,cat:'special', pp:30},
    vineWhip:    {name:'Vine Whip',    type:'grass',   power:45, acc:100,cat:'physical',pp:25},
    razorLeaf:   {name:'Razor Leaf',   type:'grass',   power:55, acc:95, cat:'physical',pp:25},
    absorb:      {name:'Absorb',       type:'grass',   power:20, acc:100,cat:'special', pp:25,drain:true},
    waterGun:    {name:'Water Gun',    type:'water',   power:40, acc:100,cat:'special', pp:25},
    ember:       {name:'Ember',        type:'fire',    power:40, acc:100,cat:'special', pp:25},
    gust:        {name:'Gust',         type:'flying',  power:40, acc:100,cat:'special', pp:35},
    rockThrow:   {name:'Rock Throw',   type:'rock',    power:50, acc:90, cat:'physical',pp:15},
    poisonSting: {name:'Poison Sting', type:'poison',  power:15, acc:100,cat:'physical',pp:35},
    lick:        {name:'Lick',         type:'ghost',   power:30, acc:100,cat:'physical',pp:30},
    mudSlap:     {name:'Mud-Slap',     type:'ground',  power:20, acc:100,cat:'special', pp:10,eff:'accDown'},
    leechLife:   {name:'Leech Life',   type:'bug',     power:80, acc:100,cat:'physical',pp:10,drain:true},
    stringShot:  {name:'String Shot',  type:'bug',     power:0,  acc:95, cat:'status',  pp:40,eff:'spdDown'},
    thunderbolt: {name:'Thunderbolt',  type:'electric',power:90, acc:100,cat:'special', pp:15},
    bodySlam:    {name:'Body Slam',    type:'normal',  power:85, acc:100,cat:'physical',pp:15},
    hyperFang:   {name:'Hyper Fang',   type:'normal',  power:80, acc:90, cat:'physical',pp:15},
    wingAtk:     {name:'Wing Attack',  type:'flying',  power:60, acc:100,cat:'physical',pp:35},
    surf:        {name:'Surf',         type:'water',   power:90, acc:100,cat:'special', pp:15},
    flamethrower:{name:'Flamethrower', type:'fire',    power:90, acc:100,cat:'special', pp:15},
    hydropump:   {name:'Hydro Pump',   type:'water',   power:110,acc:80, cat:'special', pp:5},
    solarBeam:   {name:'Solar Beam',   type:'grass',   power:120,acc:100,cat:'special', pp:10},
    shadowBall:  {name:'Shadow Ball',  type:'ghost',   power:80, acc:100,cat:'special', pp:15},
    sludgeBomb:  {name:'Sludge Bomb',  type:'poison',  power:90, acc:100,cat:'special', pp:10},
    peck:        {name:'Peck',         type:'flying',  power:35, acc:100,cat:'physical',pp:35},
    bite:        {name:'Bite',         type:'dark',    power:60, acc:100,cat:'physical',pp:25},
    psybeam:     {name:'Psybeam',      type:'psychic', power:65, acc:100,cat:'special', pp:20},
    iceBeam:     {name:'Ice Beam',     type:'ice',     power:90, acc:100,cat:'special', pp:10},
    dragonRage:  {name:'Dragon Rage',  type:'dragon',  power:40, acc:100,cat:'special', pp:10},
    confusion:   {name:'Confusion',    type:'psychic', power:50, acc:100,cat:'special', pp:25},
    bubble:      {name:'Bubble',       type:'water',   power:40, acc:100,cat:'special', pp:30},
    hornAtk:     {name:'Horn Attack',  type:'normal',  power:65, acc:100,cat:'physical',pp:25},
    psychic:     {name:'Psychic',      type:'psychic', power:90, acc:100,cat:'special', pp:10},
  };

  const TYPE_COLORS = {normal:'#A8A878',electric:'#F8D030',fire:'#F08030',water:'#6890F0',
    grass:'#78C850',poison:'#A040A0',rock:'#B8A038',ground:'#E0C068',
    flying:'#A890F0',bug:'#A8B820',ghost:'#705898',
    psychic:'#F85888',ice:'#98D8D8',dark:'#705848',dragon:'#7038F8'};

  // Extended type glow colors for visual fx (more vivid than TYPE_COLORS)
  const TYPE_FX = {
    normal:'rgba(200,200,180,0.7)',   electric:'rgba(255,230,0,0.85)',
    fire:'rgba(255,100,0,0.85)',      water:'rgba(40,140,255,0.85)',
    grass:'rgba(80,220,80,0.85)',     poison:'rgba(180,40,220,0.85)',
    rock:'rgba(180,150,60,0.8)',      ground:'rgba(220,180,80,0.8)',
    flying:'rgba(200,180,255,0.7)',   bug:'rgba(160,220,30,0.8)',
    ghost:'rgba(100,60,180,0.85)',    psychic:'rgba(250,80,150,0.85)',
    ice:'rgba(150,240,255,0.85)',     dark:'rgba(90,70,50,0.8)',
    dragon:'rgba(100,50,255,0.85)',
  };

  function updateCoinsDisplay(){
    const el=document.getElementById('pk-coins');
    if(el) el.textContent='💰 '+coins.toLocaleString();
  }
  function earnCoins(amount){
    coins+=amount;
    updateCoinsDisplay();
    saveGame();
  }

  function flashMove(defIsEnemy, type){
    const id=defIsEnemy?'pk-flash-enemy':'pk-flash-player';
    const el=document.getElementById(id); if(!el)return;
    const col=TYPE_FX[type]||TYPE_FX.normal;
    el.style.background=`radial-gradient(circle, ${col} 0%, transparent 70%)`;
    el.classList.remove('pk-flash-active');
    // Force reflow so animation restarts
    void el.offsetWidth;
    el.classList.add('pk-flash-active');
    el.addEventListener('animationend',()=>el.classList.remove('pk-flash-active'),{once:true});
  }

  const TYPE_EFF = {
    fire:    {fire:0.5,water:0.5,grass:2,bug:2,rock:0.5},
    water:   {fire:2,water:0.5,grass:0.5,rock:2,ground:2},
    grass:   {fire:0.5,water:2,grass:0.5,poison:0.5,ground:2,rock:2,bug:0.5,flying:0.5},
    electric:{water:2,grass:0.5,electric:0.5,ground:0,flying:2},
    normal:  {rock:0.5,ghost:0},
    ghost:   {normal:0,ghost:2},
    poison:  {grass:2,poison:0.5,ground:0.5,ghost:0.5},
    rock:    {fire:2,flying:2,bug:2,ground:0.5},
    ground:  {electric:2,fire:2,grass:0.5,rock:2,bug:0.5},
    bug:     {fire:0.5,grass:2,poison:0.5,flying:0.5,ghost:0.5},
    flying:  {electric:0.5,grass:2,rock:0.5},
  };

  const ZONES = {
    route1:  ['rattata','pidgey','caterpie','weedle','spearow','meowth','sentret','hoothoot',
               'zigzagoon','poochyena','skitty','wurmple','taillow','rattata','pidgey','spearow'],
    forest:  ['caterpie','weedle','oddish','zubat','gastly','paras','venonat','bellsprout',
               'spinarak','ledyba','misdreavus','shroomish','cacnea','pineco','yanma','exeggcute'],
    rocky:   ['geodude','geodude','zubat','rattata','ekans','growlithe','teddiursa','snubbull',
               'slugma','rhyhorn','nosepass','sudowoodo','cubone','trapinch','nidoranM','nidoranF'],
    shore:   ['psyduck','magikarp','magikarp','oddish','poliwag','shellder','krabby','horsea',
               'wooper','tentacool','seel','lotad','marill','carvanha','omanyte','kabuto'],
    route2:  ['rattata','pidgey','psyduck','oddish','weedle','clefairy','jigglypuff','vulpix',
               'mareep','aipom','mankey','drowzee','voltorb','electrike','spoink','swablu'],
    route3:  ['oddish','zubat','gastly','pidgey','rattata','spearow','hoothoot','swinub',
               'snubbull','grimer','lickitung','wynaut','slowpoke','girafarig','roselia','numel'],
    rare:    ['electabuzz','magmar','dratini','jynx','clefairy','misdreavus','growlithe',
               'snorlax','lapras','chansey','heracross','scyther','absol','zangoose','seviper',
               'aerodactyl','bagon','beldum','sneasel','kangaskhan','magnemite','doduo'],
  };

  /* ── GYM LEADERS ── */
  const GYM_LEADERS = {
    sylvia:  {name:'Sylvia',  title:'Bug & Grass Master',    badge:'Leaf Badge',    coins:300,
              team:[{sid:'caterpie',lvl:12},{sid:'bellsprout',lvl:15},{sid:'scyther',lvl:18}]},
    granite: {name:'Granite', title:'Rock & Ground Expert',  badge:'Boulder Badge', coins:500,
              team:[{sid:'geodude',lvl:18},{sid:'zubat',lvl:20},{sid:'graveler',lvl:24}]},
    marina:  {name:'Marina',  title:'Water Wave Rider',      badge:'Tide Badge',    coins:650,
              team:[{sid:'psyduck',lvl:20},{sid:'tentacool',lvl:24},{sid:'gyarados',lvl:28}]},
    voltex:  {name:'Voltex',  title:'Electric Storm Leader', badge:'Thunder Badge', coins:900,
              team:[{sid:'electabuzz',lvl:30},{sid:'haunter',lvl:32},{sid:'raichu',lvl:36}]},
  };

  /* ── STATE ── */
  let canvas, ctx, animFrame;
  let player = null, team = [], worldMap = null;
  let camX = 0, camY = 0;
  let keys = {}, dpad = {up:false,down:false,left:false,right:false};
  let moveThrottle = 0, lastTileKey = null;
  let battle = null, battleLocked = false;
  let _kdown, _kup;
  let _bootId = 0; // used to cancel async init (cloud save loading) on rapid page switches
  let mapItems = [];          // HP restore items + Pokéballs on the overworld
  let pcCooldown = 0;         // ms until PC can heal again
  let itemToast = null;       // {text, expires, color}
  let pokeballs = 5;          // player starts with 5 Pokéballs
  let coins = 0;              // in-game currency
  let totalCaught = 0;        // all-time Pokémon catch count
  let expBoostActive = false; // EXP Charm effect: next battle 2× XP
  let defeatedLeaders = [], badges = [];
  let gymLeaderCooldown = 0;
  let currentMapId = 'starterTown'; // active zone map
  let _interiorReturn = null;       // {mapId, spawnId} — set on entering interior
  let healCooldown = 0;             // ms timestamp until quick-heal is available again
  let _healCdInterval = null;
  let gymDialogOpen = false;
  let gymTalkCooldown = 0;          // ms timestamp — decline cooldown
  let _gymCdInterval = null;
  let shopFreeRefreshes = 2;        // free manual refreshes per session
  let shopPaidRefreshes = 3;        // purchasable refreshes (cost coins each)
  let shopCustomSeed = null;        // non-null after a manual refresh
  const tileEffects = new Map(); // grass sway state: "tx,ty" → {sway,vel}
  const ITEM_TYPES = {
    POTION:       {name:'Potion',       heal:20,   color:'#ff80b0',glow:'rgba(255,128,176,0.4)'},
    SUPER_POTION: {name:'Super Potion', heal:50,   color:'#ff40a0',glow:'rgba(255,64,160,0.4)'},
    FULL_RESTORE: {name:'Full Restore', heal:9999, color:'#ffd700',glow:'rgba(255,215,0,0.4)'},
    POKEBALL:     {name:'Poké Ball',    heal:0,    color:'#ff3030',glow:'rgba(255,48,48,0.4)'},
    GREAT_BALL:   {name:'Great Ball',   heal:0,    color:'#4488ff',glow:'rgba(68,136,255,0.4)'},
  };

  /* ── MULTI-ZONE MAP SYSTEM ── */
  const _mapCache = {};
  function _newMap(){ return Array.from({length:40},()=>new Array(50).fill(T.TREE)); }
  function _fill(m,x1,y1,x2,y2,tile){
    for(let y=Math.max(0,y1);y<=Math.min(39,y2);y++)
      for(let x=Math.max(0,x1);x<=Math.min(49,x2);x++) m[y][x]=tile;
  }
  function _borders(m,nx,ny,sx,sy,ex,ey,wx,wy){
    // seal edges then reopen exit corridors
    _fill(m,0,0,49,1,T.TREE); _fill(m,0,38,49,39,T.TREE);
    _fill(m,0,0,1,39,T.TREE); _fill(m,48,0,49,39,T.TREE);
    if(nx!==null) _fill(m,nx,0,ny,1,T.PATH);
    if(sx!==null) _fill(m,sx,38,sy,39,T.PATH);
    if(ex!==null) _fill(m,48,ex,49,ey,T.PATH);
    if(wx!==null) _fill(m,0,wx,1,wy,T.PATH);
  }

  function _buildStarterTown(){
    const m=_newMap();
    _fill(m,2,2,47,37,T.GRASS);
    // Lake
    _fill(m,18,2,31,9,T.WATER);
    _fill(m,15,9,34,10,T.SAND); _fill(m,15,2,17,9,T.SAND); _fill(m,32,2,34,9,T.SAND);
    _fill(m,13,10,17,14,T.TALL); _fill(m,32,10,36,14,T.TALL);
    // North route corridor
    _fill(m,22,3,27,22,T.PATH);
    _fill(m,19,10,21,22,T.TALL); _fill(m,28,10,30,22,T.TALL);
    // West forest approach
    _fill(m,2,11,18,22,T.TALL);
    for(let y=11;y<=22;y+=4) for(let x=2;x<=17;x+=5) m[y][x]=T.TREE;
    _fill(m,2,17,21,21,T.PATH);
    // East rocky approach
    _fill(m,31,11,47,22,T.ROCK);
    _fill(m,28,17,47,21,T.PATH);
    // Town plaza
    _fill(m,12,23,37,37,T.PATH);
    _fill(m,2,23,11,37,T.TREE); _fill(m,38,23,47,37,T.TREE);
    // Buildings row 1 (y=25-27): PC(5), HouseA(3), HouseB(3), PokéMart(3), HouseC(3)
    _fill(m,14,25,18,27,T.BUILDING); _fill(m,20,25,22,27,T.BUILDING);
    _fill(m,25,25,27,27,T.BUILDING); _fill(m,30,25,32,27,T.BUILDING);
    _fill(m,34,25,36,27,T.BUILDING);
    // Buildings row 2 (y=31-33): TownHall(5), HouseD(3), HouseE(3), HouseF(3)
    _fill(m,14,31,18,33,T.BUILDING); _fill(m,20,31,22,33,T.BUILDING);
    _fill(m,25,31,27,33,T.BUILDING); _fill(m,30,31,32,33,T.BUILDING);
    // Exits
    _fill(m,23,0,26,2,T.PATH); _fill(m,0,17,1,21,T.PATH);
    _fill(m,48,17,49,21,T.PATH); _fill(m,23,37,26,39,T.PATH);
    _borders(m,23,26,23,26,17,21,17,21);
    return m;
  }

  function _buildRoute1(){
    const m=_newMap();
    _fill(m,2,2,47,37,T.GRASS);
    _fill(m,22,0,27,39,T.PATH);
    _fill(m,16,2,21,37,T.TALL); _fill(m,28,2,33,37,T.TALL);
    _fill(m,2,5,15,18,T.TALL); _fill(m,2,21,15,35,T.TALL);
    _fill(m,34,5,47,18,T.TALL); _fill(m,34,21,47,35,T.TALL);
    _fill(m,14,12,22,14,T.PATH); _fill(m,27,26,34,28,T.PATH);
    _fill(m,14,18,34,22,T.PATH); // rest area
    _fill(m,15,18,17,20,T.BUILDING); // rest cabin (PC)
    for(let y=5;y<=18;y+=5) for(let x=3;x<=14;x+=6) m[y][x]=T.TREE;
    for(let y=21;y<=35;y+=5) for(let x=3;x<=14;x+=6) m[y][x]=T.TREE;
    for(let y=5;y<=18;y+=5) for(let x=35;x<=46;x+=6) m[y][x]=T.TREE;
    for(let y=21;y<=35;y+=5) for(let x=35;x<=46;x+=6) m[y][x]=T.TREE;
    _borders(m,22,27,22,27,null,null,null,null);
    return m;
  }

  function _buildForestZone(){
    const m=_newMap();
    _fill(m,0,0,49,39,T.TREE);
    _fill(m,8,6,41,33,T.TALL);
    _fill(m,24,4,27,35,T.PATH);
    _fill(m,8,17,27,21,T.PATH);
    _fill(m,8,6,12,33,T.PATH); _fill(m,37,6,41,33,T.PATH);
    _fill(m,8,6,41,8,T.PATH); _fill(m,8,31,41,33,T.PATH);
    _fill(m,17,9,35,16,T.PATH); // gym plaza
    _fill(m,19,10,29,12,T.BUILDING); // gym (11 wide × 3 tall)
    for(let y=8;y<=33;y+=5) for(let x=13;x<=22;x+=5) m[y][x]=T.TREE;
    for(let y=8;y<=33;y+=5) for(let x=28;x<=36;x+=5) m[y][x]=T.TREE;
    _fill(m,37,17,49,21,T.PATH);
    _borders(m,null,null,null,null,17,21,null,null);
    return m;
  }

  function _buildRockZone(){
    const m=_newMap();
    _fill(m,2,2,47,37,T.GRASS);
    _fill(m,4,4,45,35,T.ROCK);
    _fill(m,2,17,47,21,T.PATH); _fill(m,24,4,27,35,T.PATH);
    _fill(m,4,4,10,9,T.PATH); _fill(m,38,4,44,9,T.PATH);
    _fill(m,4,29,10,35,T.PATH); _fill(m,38,29,44,35,T.PATH);
    _fill(m,12,4,22,14,T.TALL); _fill(m,27,4,37,14,T.TALL);
    _fill(m,12,24,22,35,T.TALL); _fill(m,27,24,37,35,T.TALL);
    _fill(m,33,8,41,11,T.PATH); // gym plaza
    _fill(m,34,8,40,10,T.BUILDING); // gym (7 wide × 3 tall)
    _fill(m,0,17,3,21,T.PATH);
    _borders(m,null,null,null,null,null,null,17,21);
    return m;
  }

  function _buildCoastZone(){
    const m=_newMap();
    _fill(m,2,2,47,37,T.SAND);
    _fill(m,4,4,45,16,T.GRASS);
    _fill(m,2,18,47,37,T.WATER);
    _fill(m,2,16,47,18,T.SAND);
    _fill(m,22,0,27,37,T.PATH);
    _fill(m,4,10,22,12,T.PATH); _fill(m,27,10,45,12,T.PATH);
    _fill(m,4,4,8,16,T.TALL); _fill(m,14,4,20,9,T.TALL);
    _fill(m,30,4,36,9,T.TALL); _fill(m,40,4,45,16,T.TALL);
    _fill(m,10,4,12,6,T.BUILDING);
    _borders(m,22,27,null,null,null,null,null,null);
    return m;
  }

  function _buildCityZone(){
    const m=_newMap();
    _fill(m,2,2,47,37,T.PATH);
    // Buildings — 6 rows of blocks with greenery strips between
    _fill(m,4,4,8,6,T.BUILDING); _fill(m,11,4,15,6,T.BUILDING);
    _fill(m,18,4,22,6,T.BUILDING); _fill(m,25,4,29,6,T.BUILDING);
    _fill(m,32,4,36,6,T.BUILDING); _fill(m,39,4,43,6,T.BUILDING);
    _fill(m,4,10,8,13,T.BUILDING); _fill(m,11,10,15,13,T.BUILDING);
    _fill(m,18,10,24,13,T.BUILDING); // PC center (7 wide)
    _fill(m,27,10,31,13,T.BUILDING); _fill(m,34,10,38,13,T.BUILDING);
    _fill(m,41,10,45,13,T.BUILDING);
    _fill(m,4,17,8,20,T.BUILDING); _fill(m,11,17,17,20,T.BUILDING);
    _fill(m,20,17,30,20,T.BUILDING); // city gym (11 wide)
    _fill(m,33,17,37,20,T.BUILDING); _fill(m,40,17,45,20,T.BUILDING);
    _fill(m,4,24,10,27,T.BUILDING); _fill(m,13,24,17,27,T.BUILDING);
    _fill(m,20,24,24,27,T.BUILDING); _fill(m,27,24,31,27,T.BUILDING);
    _fill(m,34,24,38,27,T.BUILDING); _fill(m,41,24,45,27,T.BUILDING);
    // Greenery strips
    _fill(m,2,7,47,9,T.GRASS); _fill(m,2,14,47,16,T.GRASS);
    _fill(m,2,21,47,23,T.GRASS); _fill(m,2,28,47,30,T.GRASS);
    _fill(m,2,31,47,37,T.GRASS);
    _fill(m,2,2,3,37,T.TREE); _fill(m,46,2,47,37,T.TREE);
    _borders(m,null,null,22,27,null,null,null,null);
    return m;
  }

  const MAPS_DATA = {
    starterTown:{
      spawns:{default:{x:24,y:35},fromRoute1:{x:24,y:3},fromForest:{x:47,y:19},fromRocky:{x:2,y:19},fromCoast:{x:24,y:3}},
      warps:[
        {tx:23,ty:1,toMap:'route1',    toSpawn:'fromTown'},{tx:24,ty:1,toMap:'route1',    toSpawn:'fromTown'},{tx:25,ty:1,toMap:'route1',    toSpawn:'fromTown'},{tx:26,ty:1,toMap:'route1',    toSpawn:'fromTown'},
        {tx:0, ty:17,toMap:'forestZone',toSpawn:'fromTown'},{tx:0,ty:18,toMap:'forestZone',toSpawn:'fromTown'},{tx:0,ty:19,toMap:'forestZone',toSpawn:'fromTown'},{tx:0,ty:20,toMap:'forestZone',toSpawn:'fromTown'},{tx:0,ty:21,toMap:'forestZone',toSpawn:'fromTown'},
        {tx:49,ty:17,toMap:'rockZone',  toSpawn:'fromTown'},{tx:49,ty:18,toMap:'rockZone',  toSpawn:'fromTown'},{tx:49,ty:19,toMap:'rockZone',  toSpawn:'fromTown'},{tx:49,ty:20,toMap:'rockZone',  toSpawn:'fromTown'},{tx:49,ty:21,toMap:'rockZone',  toSpawn:'fromTown'},
        {tx:23,ty:38,toMap:'coastZone', toSpawn:'fromTown'},{tx:24,ty:38,toMap:'coastZone', toSpawn:'fromTown'},{tx:25,ty:38,toMap:'coastZone', toSpawn:'fromTown'},{tx:26,ty:38,toMap:'coastZone', toSpawn:'fromTown'},
      ],
      pcTiles:[{x:14,y:28},{x:15,y:28},{x:16,y:28},{x:17,y:28},{x:18,y:28}],
      pcSignPos:{tx:16,ty:25},
      items:[
        {tx:24,ty:15,type:'POTION'},{tx:26,ty:20,type:'POTION'},{tx:15,ty:24,type:'POTION'},{tx:20,ty:13,type:'POTION'},
        {tx:10,ty:25,type:'SUPER_POTION'},{tx:22,ty:10,type:'FULL_RESTORE'},
        {tx:23,ty:17,type:'POKEBALL'},{tx:25,ty:22,type:'POKEBALL'},
      ],
      signs:[
        {tx:24,ty:10,label:'Route 1',   col:'#3a8a30',arrow:'↑'},
        {tx:8, ty:18,label:'Forest',    col:'#228822',arrow:'←'},
        {tx:36,ty:18,label:'Rocky Way', col:'#8a6030',arrow:'→'},
        {tx:24,ty:36,label:'Coast',     col:'#3060a0',arrow:'↓'},
      ],
      encounters:'route1',
      build:_buildStarterTown,
    },
    route1:{
      spawns:{default:{x:24,y:37},fromTown:{x:24,y:37},fromCity:{x:24,y:3}},
      warps:[
        {tx:22,ty:39,toMap:'starterTown',toSpawn:'fromRoute1'},{tx:23,ty:39,toMap:'starterTown',toSpawn:'fromRoute1'},{tx:24,ty:39,toMap:'starterTown',toSpawn:'fromRoute1'},{tx:25,ty:39,toMap:'starterTown',toSpawn:'fromRoute1'},{tx:26,ty:39,toMap:'starterTown',toSpawn:'fromRoute1'},{tx:27,ty:39,toMap:'starterTown',toSpawn:'fromRoute1'},
        {tx:22,ty:0, toMap:'cityZone',   toSpawn:'fromRoute1'},{tx:23,ty:0, toMap:'cityZone',   toSpawn:'fromRoute1'},{tx:24,ty:0, toMap:'cityZone',   toSpawn:'fromRoute1'},{tx:25,ty:0, toMap:'cityZone',   toSpawn:'fromRoute1'},{tx:26,ty:0, toMap:'cityZone',   toSpawn:'fromRoute1'},{tx:27,ty:0, toMap:'cityZone',   toSpawn:'fromRoute1'},
      ],
      pcTiles:[{x:15,y:21},{x:16,y:21},{x:17,y:21}],
      pcSignPos:{tx:16,ty:18},
      items:[
        {tx:18,ty:6,type:'POTION'},{tx:30,ty:8,type:'POTION'},{tx:18,ty:30,type:'POTION'},{tx:30,ty:32,type:'POTION'},
        {tx:10,ty:14,type:'POKEBALL'},{tx:38,ty:25,type:'POKEBALL'},
        {tx:6, ty:28,type:'SUPER_POTION'},{tx:42,ty:10,type:'SUPER_POTION'},
        {tx:24,ty:18,type:'GREAT_BALL'},
      ],
      signs:[
        {tx:24,ty:4, label:'City Zone',    col:'#a03090',arrow:'↑'},
        {tx:24,ty:34,label:'Starter Town', col:'#305090',arrow:'↓'},
      ],
      encounters:'route1',
      build:_buildRoute1,
    },
    forestZone:{
      spawns:{default:{x:47,y:19},fromTown:{x:47,y:19}},
      warps:[
        {tx:48,ty:17,toMap:'starterTown',toSpawn:'fromForest'},{tx:48,ty:18,toMap:'starterTown',toSpawn:'fromForest'},{tx:48,ty:19,toMap:'starterTown',toSpawn:'fromForest'},{tx:48,ty:20,toMap:'starterTown',toSpawn:'fromForest'},{tx:48,ty:21,toMap:'starterTown',toSpawn:'fromForest'},{tx:49,ty:17,toMap:'starterTown',toSpawn:'fromForest'},{tx:49,ty:18,toMap:'starterTown',toSpawn:'fromForest'},{tx:49,ty:19,toMap:'starterTown',toSpawn:'fromForest'},{tx:49,ty:20,toMap:'starterTown',toSpawn:'fromForest'},{tx:49,ty:21,toMap:'starterTown',toSpawn:'fromForest'},
      ],
      pcTiles:[],
      pcSignPos:null,
      items:[
        {tx:15,ty:22,type:'POTION'},{tx:32,ty:25,type:'POTION'},{tx:10,ty:15,type:'POTION'},
        {tx:6, ty:20,type:'SUPER_POTION'},{tx:38,ty:28,type:'SUPER_POTION'},
        {tx:13,ty:18,type:'POKEBALL'},{tx:35,ty:20,type:'POKEBALL'},
        {tx:9, ty:28,type:'GREAT_BALL'},{tx:10,ty:12,type:'FULL_RESTORE'},
      ],
      signs:[
        {tx:39,ty:18,label:'← Starter Town',col:'#305090',arrow:'→'},
        {tx:24,ty:15,label:'Forest Gym',     col:'#228822',arrow:'↑'},
      ],
      encounters:'forest',
      build:_buildForestZone,
    },
    rockZone:{
      spawns:{default:{x:2,y:19},fromTown:{x:2,y:19}},
      warps:[
        {tx:0,ty:17,toMap:'starterTown',toSpawn:'fromRocky'},{tx:0,ty:18,toMap:'starterTown',toSpawn:'fromRocky'},{tx:0,ty:19,toMap:'starterTown',toSpawn:'fromRocky'},{tx:0,ty:20,toMap:'starterTown',toSpawn:'fromRocky'},{tx:0,ty:21,toMap:'starterTown',toSpawn:'fromRocky'},{tx:1,ty:17,toMap:'starterTown',toSpawn:'fromRocky'},{tx:1,ty:18,toMap:'starterTown',toSpawn:'fromRocky'},{tx:1,ty:19,toMap:'starterTown',toSpawn:'fromRocky'},{tx:1,ty:20,toMap:'starterTown',toSpawn:'fromRocky'},{tx:1,ty:21,toMap:'starterTown',toSpawn:'fromRocky'},
      ],
      pcTiles:[],
      pcSignPos:null,
      items:[
        {tx:8, ty:7,type:'POTION'},{tx:40,ty:7,type:'POTION'},{tx:8,ty:32,type:'POTION'},{tx:40,ty:32,type:'POTION'},
        {tx:14,ty:10,type:'SUPER_POTION'},{tx:30,ty:10,type:'SUPER_POTION'},
        {tx:14,ty:28,type:'POKEBALL'},{tx:30,ty:28,type:'POKEBALL'},
        {tx:25,ty:6,type:'GREAT_BALL'},{tx:38,ty:14,type:'FULL_RESTORE'},
      ],
      signs:[
        {tx:4, ty:18,label:'Starter Town →',col:'#305090',arrow:'←'},
        {tx:37,ty:12,label:'Rock Gym',       col:'#8a6030',arrow:'→'},
      ],
      encounters:'rocky',
      build:_buildRockZone,
    },
    coastZone:{
      spawns:{default:{x:24,y:3},fromTown:{x:24,y:3}},
      warps:[
        {tx:22,ty:0,toMap:'starterTown',toSpawn:'fromCoast'},{tx:23,ty:0,toMap:'starterTown',toSpawn:'fromCoast'},{tx:24,ty:0,toMap:'starterTown',toSpawn:'fromCoast'},{tx:25,ty:0,toMap:'starterTown',toSpawn:'fromCoast'},{tx:26,ty:0,toMap:'starterTown',toSpawn:'fromCoast'},{tx:27,ty:0,toMap:'starterTown',toSpawn:'fromCoast'},
        {tx:22,ty:1,toMap:'starterTown',toSpawn:'fromCoast'},{tx:23,ty:1,toMap:'starterTown',toSpawn:'fromCoast'},{tx:24,ty:1,toMap:'starterTown',toSpawn:'fromCoast'},{tx:25,ty:1,toMap:'starterTown',toSpawn:'fromCoast'},{tx:26,ty:1,toMap:'starterTown',toSpawn:'fromCoast'},{tx:27,ty:1,toMap:'starterTown',toSpawn:'fromCoast'},
      ],
      pcTiles:[{x:10,y:7},{x:11,y:7},{x:12,y:7}],
      pcSignPos:{tx:11,ty:4},
      items:[
        {tx:6, ty:6,type:'POTION'},{tx:16,ty:5,type:'POTION'},{tx:32,ty:6,type:'POTION'},{tx:42,ty:5,type:'POTION'},
        {tx:14,ty:11,type:'POKEBALL'},{tx:35,ty:11,type:'POKEBALL'},
        {tx:24,ty:15,type:'SUPER_POTION'},{tx:8,ty:13,type:'GREAT_BALL'},
      ],
      signs:[
        {tx:24,ty:5,label:'← Starter Town',col:'#305090',arrow:'↑'},
      ],
      encounters:'shore',
      build:_buildCoastZone,
    },
    cityZone:{
      spawns:{default:{x:24,y:36},fromRoute1:{x:24,y:36}},
      warps:[
        {tx:22,ty:39,toMap:'route1',toSpawn:'fromCity'},{tx:23,ty:39,toMap:'route1',toSpawn:'fromCity'},{tx:24,ty:39,toMap:'route1',toSpawn:'fromCity'},{tx:25,ty:39,toMap:'route1',toSpawn:'fromCity'},{tx:26,ty:39,toMap:'route1',toSpawn:'fromCity'},{tx:27,ty:39,toMap:'route1',toSpawn:'fromCity'},
        {tx:22,ty:38,toMap:'route1',toSpawn:'fromCity'},{tx:23,ty:38,toMap:'route1',toSpawn:'fromCity'},{tx:24,ty:38,toMap:'route1',toSpawn:'fromCity'},{tx:25,ty:38,toMap:'route1',toSpawn:'fromCity'},{tx:26,ty:38,toMap:'route1',toSpawn:'fromCity'},{tx:27,ty:38,toMap:'route1',toSpawn:'fromCity'},
      ],
      pcTiles:[{x:18,y:14},{x:19,y:14},{x:20,y:14},{x:21,y:14},{x:22,y:14},{x:23,y:14},{x:24,y:14}],
      pcSignPos:{tx:21,ty:10},
      items:[
        {tx:9, ty:5,type:'POTION'},{tx:22,ty:5,type:'POTION'},{tx:37,ty:5,type:'POTION'},
        {tx:9, ty:25,type:'SUPER_POTION'},{tx:37,ty:25,type:'SUPER_POTION'},
        {tx:24,ty:35,type:'POKEBALL'},{tx:9,ty:11,type:'POKEBALL'},{tx:37,ty:11,type:'POKEBALL'},
        {tx:24,ty:23,type:'GREAT_BALL'},{tx:9,ty:29,type:'FULL_RESTORE'},
      ],
      signs:[
        {tx:24,ty:35,label:'Route 1',  col:'#3a8a30',arrow:'↓'},
        {tx:25,ty:21,label:'City Gym', col:'#a03090',arrow:'↑'},
      ],
      encounters:'route1',
      build:_buildCityZone,
    },
  };

  /* ── INTERIOR ZONE BUILDERS ── */
  function _buildIntPC(){
    const m=_newMap();
    _fill(m,12,10,37,32,T.FLOOR);     // main room floor
    _fill(m,14,12,35,13,T.COUNTER);   // reception desk
    _fill(m,12,14,13,27,T.COUNTER);   // left wall unit
    _fill(m,36,14,37,27,T.COUNTER);   // right wall unit
    _fill(m,15,18,19,25,T.COUNTER);   // recovery pod left
    _fill(m,30,18,34,25,T.COUNTER);   // recovery pod right
    _fill(m,14,27,35,27,T.COUNTER);   // lower bench
    _fill(m,12,10,37,11,T.COUNTER);   // top wall detail
    return m;
  }
  function _buildIntHouse(){
    const m=_newMap();
    _fill(m,16,14,33,32,T.FLOOR);     // room floor
    _fill(m,16,15,17,22,T.COUNTER);   // bookshelf
    _fill(m,30,15,33,19,T.COUNTER);   // bed
    _fill(m,20,18,28,21,T.COUNTER);   // dining table
    _fill(m,30,24,33,27,T.COUNTER);   // wardrobe
    _fill(m,16,25,18,28,T.COUNTER);   // plant / lamp corner
    _fill(m,16,14,33,15,T.COUNTER);   // top wall detail
    return m;
  }
  function _buildIntGym(){
    const m=_newMap();
    _fill(m,6,5,43,36,T.FLOOR);       // arena
    for(let y=11;y<=30;y+=4)_fill(m,6,y,43,y+1,T.PATH); // gym stripe pattern
    _fill(m,6,5,43,6,T.COUNTER);      // top wall
    _fill(m,20,7,28,9,T.COUNTER);     // leader platform
    _fill(m,6,7,7,30,T.BUILDING);     // left banner
    _fill(m,42,7,43,30,T.BUILDING);   // right banner
    return m;
  }
  function _buildIntMart(){
    const m=_newMap();
    _fill(m,14,12,35,32,T.FLOOR);     // shop floor
    _fill(m,14,14,35,15,T.COUNTER);   // service counter
    _fill(m,14,12,35,13,T.COUNTER);   // top wall detail
    _fill(m,14,17,15,28,T.COUNTER);   // shelf col 1
    _fill(m,20,17,21,28,T.COUNTER);   // shelf col 2
    _fill(m,28,17,29,28,T.COUNTER);   // shelf col 3
    _fill(m,34,17,35,28,T.COUNTER);   // shelf col 4
    return m;
  }

  /* ── REGISTER INTERIOR ZONES ── */
  const _intExitWarps=(x1,x2,ty)=>[x1,x1+1,x2-1,x2].map(x=>({tx:x,ty,toMap:'__return__'}));
  MAPS_DATA.intPC={
    isInterior:true, displayName:'🏥 Pokémon Center',
    spawns:{default:{x:24,y:30}},
    warps:_intExitWarps(22,26,32),
    pcTiles:[{x:22,y:14},{x:23,y:14},{x:24,y:14},{x:25,y:14},{x:26,y:14}],
    pcSignPos:{tx:24,ty:11},
    items:[], signs:[], encounters:'route1', build:_buildIntPC,
  };
  MAPS_DATA.intHouse={
    isInterior:true, displayName:'🏠 House',
    spawns:{default:{x:24,y:30}},
    warps:_intExitWarps(22,26,32),
    pcTiles:[], pcSignPos:null,
    items:[], signs:[], encounters:'route1', build:_buildIntHouse,
  };
  MAPS_DATA.intGym={
    isInterior:true, displayName:'🏟️ Gym',
    spawns:{default:{x:24,y:34}},
    warps:_intExitWarps(22,26,36),
    pcTiles:[], pcSignPos:null,
    items:[], signs:[], encounters:'route1', build:_buildIntGym,
  };
  MAPS_DATA.intMart={
    isInterior:true, displayName:'🛒 PokéMart',
    spawns:{default:{x:24,y:30}},
    warps:_intExitWarps(22,26,32),
    pcTiles:[], pcSignPos:null,
    items:[], signs:[], encounters:'route1', build:_buildIntMart,
  };

  /* ── INJECT BUILDING-ENTRY WARPS INTO EXTERIOR ZONES ── */
  (()=>{
    const _w=(z,arr)=>arr.forEach(e=>MAPS_DATA[z].warps.push(e));
    const _e=(x,y,z,rs)=>({tx:x,ty:y,toMap:z,returnSpawn:rs});
    // starterTown row-1 doors (path tile y=28 in front of building base y=27)
    _w('starterTown',[
      _e(15,28,'intPC','fromIntPC'),_e(16,28,'intPC','fromIntPC'),_e(17,28,'intPC','fromIntPC'),
      _e(21,28,'intHouse','fromIntHouse'),_e(26,28,'intHouse','fromIntHouse'),
      _e(31,28,'intMart','fromIntMart'),_e(35,28,'intHouse','fromIntHouse'),
    ]);
    // starterTown row-2 doors (path tile y=34 in front of building base y=33)
    _w('starterTown',[
      _e(15,34,'intHouse','fromIntHouse'),_e(16,34,'intHouse','fromIntHouse'),_e(17,34,'intHouse','fromIntHouse'),
      _e(21,34,'intHouse','fromIntHouse'),_e(26,34,'intHouse','fromIntHouse'),_e(31,34,'intHouse','fromIntHouse'),
    ]);
    // route1 rest cabin (building y=18-20, door step y=21)
    _w('route1',[_e(15,21,'intPC','fromIntPC'),_e(16,21,'intPC','fromIntPC'),_e(17,21,'intPC','fromIntPC')]);
    // forestZone gym (building y=10-12, door step y=13)
    _w('forestZone',[_e(23,13,'intGym','fromIntGym'),_e(24,13,'intGym','fromIntGym'),_e(25,13,'intGym','fromIntGym')]);
    // rockZone gym (building y=8-10, door step y=11)
    _w('rockZone',[_e(36,11,'intGym','fromIntGym'),_e(37,11,'intGym','fromIntGym'),_e(38,11,'intGym','fromIntGym')]);
    // cityZone PC (building y=10-13, door step y=14)
    [20,21,22,23,24].forEach(x=>MAPS_DATA.cityZone.warps.push(_e(x,14,'intPC','fromIntPC')));
    // cityZone gym (building y=17-20, door step y=21)
    [23,24,25,26,27].forEach(x=>MAPS_DATA.cityZone.warps.push(_e(x,21,'intGym','fromIntGym')));
  })();

  /* ── ADD RETURN SPAWNS + DISPLAY NAMES + CLEAR EXTERIOR PC TILES ── */
  Object.assign(MAPS_DATA.starterTown.spawns,{fromIntPC:{x:16,y:29},fromIntHouse:{x:24,y:35},fromIntMart:{x:31,y:29}});
  Object.assign(MAPS_DATA.route1.spawns,{fromIntPC:{x:16,y:22}});
  Object.assign(MAPS_DATA.forestZone.spawns,{fromIntGym:{x:24,y:14}});
  Object.assign(MAPS_DATA.rockZone.spawns,{fromIntGym:{x:37,y:12}});
  Object.assign(MAPS_DATA.cityZone.spawns,{fromIntPC:{x:21,y:15},fromIntGym:{x:25,y:22}});
  // Healing now happens inside PC interior — clear outdoor heal triggers
  MAPS_DATA.starterTown.pcTiles=[]; MAPS_DATA.starterTown.pcSignPos=null;
  MAPS_DATA.route1.pcTiles=[]; MAPS_DATA.route1.pcSignPos=null;
  // Zone display names
  MAPS_DATA.forestZone.gymLeaderId='sylvia';
  MAPS_DATA.rockZone.gymLeaderId='granite';
  MAPS_DATA.coastZone.gymLeaderId='marina';
  MAPS_DATA.cityZone.gymLeaderId='voltex';
  Object.assign(MAPS_DATA.starterTown,{displayName:'🏘️ Starter Town'});
  Object.assign(MAPS_DATA.route1,     {displayName:'🌿 Route 1'});
  Object.assign(MAPS_DATA.forestZone, {displayName:'🌲 Forest Zone'});
  Object.assign(MAPS_DATA.rockZone,   {displayName:'🪨 Rock Zone'});
  Object.assign(MAPS_DATA.coastZone,  {displayName:'🌊 Coast Zone'});
  Object.assign(MAPS_DATA.cityZone,   {displayName:'🏙️ City Zone'});

  function loadZone(mapId){
    const md=MAPS_DATA[mapId]||MAPS_DATA.starterTown;
    currentMapId=mapId;
    if(!_mapCache[mapId]) _mapCache[mapId]=md.build();
    worldMap=_mapCache[mapId];
    tileEffects.clear();
    mapItems=md.items.map(it=>({...it,collected:false}));
  }

  function checkWarp(tx,ty){
    if(battle)return;
    const warps=MAPS_DATA[currentMapId]?.warps||[];
    const w=warps.find(w=>w.tx===tx&&w.ty===ty);
    if(!w)return;

    // Resolve __return__ (exit from interior back to exterior)
    let toMap=w.toMap, toSpawn=w.toSpawn||'default';
    if(toMap==='__return__'){
      if(!_interiorReturn)return;
      toMap=_interiorReturn.mapId; toSpawn=_interiorReturn.spawnId;
      _interiorReturn=null;
    } else if(MAPS_DATA[toMap]?.isInterior){
      _interiorReturn={mapId:currentMapId, spawnId:w.returnSpawn||'default'};
    }

    const md=MAPS_DATA[toMap]; if(!md)return;
    const sp=md.spawns[toSpawn]||md.spawns.default;
    const bl=document.getElementById('pk-blackout');
    if(bl){bl.classList.remove('hidden');bl.style.opacity='1';}
    setTimeout(()=>{
      loadZone(toMap);
      player.x=sp.x*TSIZE; player.y=sp.y*TSIZE;
      if(isSolid(sp.x,sp.y)){player.x=md.spawns.default.x*TSIZE;player.y=md.spawns.default.y*TSIZE;}
      if(md.displayName) showToast('📍 '+md.displayName,'#ffd700',2000);
      saveGame();
      if(bl){bl.style.transition='opacity 0.4s';bl.style.opacity='0';setTimeout(()=>{bl.classList.add('hidden');bl.style.transition='';},420);}
    },200);
  }

  function startLeaderBattle(leaderId){
    const gl=GYM_LEADERS[leaderId]; if(!gl)return;
    if(defeatedLeaders.includes(leaderId)){showToast(`🏅 ${gl.name} is already defeated!`,'#ffd700',2000);return;}
    if(team.every(m=>m.hp<=0)){showToast('Heal your Pokémon first!','#ff6060',2000);return;}
    const queue=[...gl.team]; const first=queue.shift();
    const em=mkMon(first.sid,first.lvl);
    const dpadEl=document.getElementById('pk-dpad');
    if(dpadEl) dpadEl.classList.add('pk-dpad-hidden');
    const screen=canvas&&canvas.parentElement;
    const fl=document.createElement('div');
    fl.style.cssText='position:absolute;inset:0;z-index:48;pointer-events:none;border-radius:8px;';
    if(screen) screen.appendChild(fl);
    let f=0; const doFlash=()=>{
      fl.style.background=f%2===0?'rgba(255,200,50,0.85)':'rgba(0,0,0,0.05)';
      f++; if(f<8) setTimeout(doFlash,70);
      else{
        fl.remove();
        battle={pm:team[0],em,type:'trainer',leaderId,leaderQueue:queue,phase:'menu',participants:new Set([team[0]])};
        updateBUI(); enableBtns(true); updateBallBtn();
        document.getElementById('pk-battle').classList.remove('hidden');
        setLog(`Gym Leader ${gl.name}!`,gl.title);
      }
    }; doFlash();
  }

  const GL_DIALOGUE={
    sylvia:{
      intro:'Ah, a challenger approaches! My Bug and Grass Pokémon have been eagerly waiting. Can you withstand the power of nature?',
      defeated:'You\'ve already earned the Leaf Badge. Your Pokémon are strong — keep growing!',
    },
    granite:{
      intro:'You dare set foot in my gym?! My Rock and Ground Pokémon are as solid as mountains. Prove yourself!',
      defeated:'You crushed my boulders fair and square. The Boulder Badge is yours to keep, champion!',
    },
    marina:{
      intro:'Welcome, young trainer. The tide waits for no one — and neither does my team. Are you ready to dive in?',
      defeated:'The ocean bows to your strength! You\'ve earned the Tide Badge and my respect.',
    },
    voltex:{
      intro:'So you\'ve made it this far. Bold! My electric storms have struck down every challenger before you. Let\'s see if you\'re different.',
      defeated:'Incredible. The Thunder Badge is yours — you\'ve weathered my storm and emerged victorious!',
    },
  };

  function checkGymLeader(tx,ty){
    if(currentMapId!=='intGym'||battle||gymDialogOpen)return;
    // Trigger when player steps onto row 10 (2 tiles south of leader platform)
    if(ty!==12||tx<20||tx>28)return;
    if(gymTalkCooldown>Date.now())return;
    const leaderId=MAPS_DATA[_interiorReturn?.mapId]?.gymLeaderId;
    if(leaderId) showGymDialog(leaderId);
  }

  function showGymDialog(leaderId){
    const gl=GYM_LEADERS[leaderId]; if(!gl)return;
    gymDialogOpen=true;
    const dlg=GL_DIALOGUE[leaderId]||{};
    const defeated=defeatedLeaders.includes(leaderId);
    const el_ov=document.getElementById('pk-gym-dialog');
    const el_name=document.getElementById('pk-gym-dialog-name');
    const el_title=document.getElementById('pk-gym-dialog-title');
    const el_av=document.getElementById('pk-gym-dialog-avatar');
    const el_text=document.getElementById('pk-gym-dialog-text');
    const el_battleBtn=document.getElementById('pk-gym-dialog-battle-btn');
    const el_cd=document.getElementById('pk-gym-dialog-cooldown');
    if(!el_ov)return;
    el_name.textContent=gl.name;
    el_title.textContent=gl.title;
    el_av.textContent=GL_EMOJI[leaderId]||'⭐';
    el_text.textContent=defeated?(dlg.defeated||'You\'ve already earned my badge!'):(dlg.intro||'...');
    el_battleBtn.disabled=defeated||team.every(m=>m.hp<=0);
    el_battleBtn.textContent=defeated?'🏅 Already Won':'⚔️ Battle!';
    if(el_cd) el_cd.classList.add('hidden');
    el_ov.classList.remove('hidden');
    // Store leaderId for accept handler
    el_ov.dataset.leaderId=leaderId;
  }

  function closeGymDialog(){
    gymDialogOpen=false;
    const el=document.getElementById('pk-gym-dialog');
    if(el) el.classList.add('hidden');
    if(_gymCdInterval){clearInterval(_gymCdInterval);_gymCdInterval=null;}
  }

  function getTile(tx,ty){ return (tx<0||ty<0||tx>=MAP_W||ty>=MAP_H) ? T.TREE : worldMap[ty][tx]; }
  function isSolid(tx,ty){ const t=getTile(tx,ty); return t===T.TREE||t===T.BUILDING||t===T.WATER||t===T.COUNTER; }

  /* ── ITEMS ── */
  function initMapItems(){
    const md=MAPS_DATA[currentMapId]||MAPS_DATA.starterTown;
    mapItems=md.items.map(it=>({...it,collected:false}));
  }

  function showToast(text,color,duration=2200){
    if(!canvas)return;
    itemToast={text,color:color||'#ffd700',expires:Date.now()+duration};
  }

  function checkItemPickup(tx,ty){
    for(const item of mapItems){
      if(item.collected)continue;
      if(Math.abs(item.tx-tx)<=0 && Math.abs(item.ty-ty)<=0){
        item.collected=true;
        const it=ITEM_TYPES[item.type];
        if(!it)return;
        if(item.type==='POKEBALL'||item.type==='GREAT_BALL'){
          pokeballs++;
          showToast(`Found a ${it.name}! (${pokeballs} total)`,it.color);
        } else if(team.length>0){
          const target=team.find(p=>p.hp>0)||team[0];
          const before=target.hp;
          target.hp=Math.min(target.maxHp, target.hp+it.heal);
          showToast(`Found ${it.name}! ${target.name} +${target.hp-before} HP`,it.color);
        }
        return;
      }
    }
  }

  function checkPokeCenter(tx,ty){
    if(battle||pcCooldown>Date.now())return;
    const pcTiles=MAPS_DATA[currentMapId]?.pcTiles||[];
    const atPC=pcTiles.some(p=>p.x===tx&&p.y===ty);
    if(!atPC)return;
    const needsHeal=team.some(p=>p.hp<p.maxHp);
    if(!needsHeal)return;
    pcCooldown=Date.now()+3000; // 3 s cooldown before prompting again
    healAtCenter();
  }

  function healAtCenter(){
    // Animate HP bars filling over 1.5 s then show toast
    const steps=20, interval=75;
    let step=0;
    showToast('🏥 Welcome to the Pokémon Center!','#ff80b0',2000);
    const timer=setInterval(()=>{
      step++;
      team.forEach(p=>{ p.hp=Math.min(p.maxHp, p.hp+Math.ceil(p.maxHp/steps)); });
      if(step>=steps){
        team.forEach(p=>{ p.hp=p.maxHp; });
        clearInterval(timer);
        showToast('✨ Your Pokémon are fully healed!','#00ff88',2000);
        saveGame();
      }
    },interval);
  }

  function quickHeal(){
    if(battle){ showToast('Cannot heal during battle!','#ff6060',1800); return; }
    if(Date.now()<healCooldown){ return; }
    const needsHeal=team.some(m=>m.hp<m.maxHp);
    if(!needsHeal){ showToast('Pokémon are already at full HP!','#00ff88',1800); return; }
    healCooldown=Date.now()+90000;
    team.forEach(m=>{ m.hp=m.maxHp; });
    showToast('💊 All Pokémon healed!','#ff80b0',2000);
    saveGame();
    // Update button + start countdown
    const btn=document.getElementById('pk-heal-fab');
    const cd=document.getElementById('pk-heal-cooldown');
    if(btn) btn.disabled=true;
    if(_healCdInterval) clearInterval(_healCdInterval);
    _healCdInterval=setInterval(()=>{
      const left=Math.max(0,Math.ceil((healCooldown-Date.now())/1000));
      if(cd){ if(left>0){cd.textContent=left+'s';cd.classList.remove('hidden');}else{cd.classList.add('hidden');} }
      if(left<=0){
        if(btn) btn.disabled=false;
        clearInterval(_healCdInterval); _healCdInterval=null;
      }
    },500);
  }

  /* ── DRAW ITEMS ON OVERWORLD ── */
  function drawMapItems(){
    const now=Date.now();
    mapItems.forEach(item=>{
      if(item.collected)return;
      const it=ITEM_TYPES[item.type]; if(!it)return;
      const sx=item.tx*TSIZE-camX+TSIZE/2, sy=item.ty*TSIZE-camY+TSIZE/2;
      if(sx<-16||sx>canvas.width+16||sy<-16||sy>canvas.height+16)return;
      // Glow pulse
      const pulse=0.5+0.5*Math.sin(now/400);
      ctx.save();
      ctx.globalAlpha=0.35+0.25*pulse;
      ctx.fillStyle=it.glow;
      ctx.beginPath(); ctx.arc(sx,sy,10+4*pulse,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=1;
      ctx.fillStyle=it.color;
      ctx.beginPath(); ctx.arc(sx,sy,5,0,Math.PI*2); ctx.fill();
      // Sparkle cross
      ctx.strokeStyle='#fff'; ctx.lineWidth=1; ctx.globalAlpha=0.7;
      ctx.beginPath(); ctx.moveTo(sx-8,sy); ctx.lineTo(sx+8,sy);
      ctx.moveTo(sx,sy-8); ctx.lineTo(sx,sy+8); ctx.stroke();
      ctx.restore();
    });
  }

  /* ── DRAW TOAST NOTIFICATION ── */
  function drawToast(){
    if(!itemToast||Date.now()>itemToast.expires)return;
    const alpha=Math.min(1,(itemToast.expires-Date.now())/300);
    ctx.save();
    ctx.beginPath(); ctx.rect(0,0,canvas.width,canvas.height); ctx.clip();
    ctx.globalAlpha=alpha;
    ctx.font='bold 11px "Exo 2",sans-serif';
    let text=itemToast.text;
    const maxW=canvas.width-24;
    while(text.length>4&&ctx.measureText(text).width+20>maxW) text=text.slice(0,-2)+'…';
    const tw=Math.min(maxW,ctx.measureText(text).width+20);
    const tx2=Math.max(4,Math.floor((canvas.width-tw)/2));
    const ty2=10;
    ctx.fillStyle='rgba(8,4,24,0.90)';
    if(ctx.roundRect){ctx.beginPath();ctx.roundRect(tx2,ty2,tw,24,5);ctx.fill();}
    else ctx.fillRect(tx2,ty2,tw,24);
    ctx.strokeStyle=itemToast.color; ctx.lineWidth=1.5;
    if(ctx.roundRect){ctx.beginPath();ctx.roundRect(tx2,ty2,tw,24,5);ctx.stroke();}
    ctx.fillStyle='#fff'; ctx.textBaseline='middle'; ctx.textAlign='left';
    ctx.fillText(text,tx2+10,ty2+12);
    ctx.restore();
  }

  /* ── DRAW POKÉMON CENTER SIGN ── */
  function drawPCSign(){
    const pos=MAPS_DATA[currentMapId]?.pcSignPos; if(!pos) return;
    const sx=pos.tx*TSIZE-camX, sy=pos.ty*TSIZE-camY;
    if(sx<-80||sx>canvas.width+80||sy<-80||sy>canvas.height+80)return;
    ctx.save();
    ctx.fillStyle='rgba(255,100,160,0.92)';
    ctx.font='bold 9px monospace';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('🏥 P.C.',sx+TSIZE*2,sy+TSIZE*1.5);
    ctx.restore();
  }
  /* ── ZONE / PATH MARKER SIGNS ── */
  function drawZoneSigns(){
    const signs=MAPS_DATA[currentMapId]?.signs||[];
    ctx.save(); ctx.lineCap='round';
    signs.forEach(s=>{
      const sx=s.tx*TSIZE-camX, sy=s.ty*TSIZE-camY;
      if(sx<-80||sx>canvas.width+80||sy<-80||sy>canvas.height+80) return;
      const cx=sx+TSIZE/2, cy=sy+TSIZE/2;
      // Post
      ctx.fillStyle='#6a3c10'; ctx.fillRect(cx-2,cy,4,TSIZE/2+6);
      // Board shadow
      ctx.fillStyle='rgba(0,0,0,0.28)'; ctx.fillRect(cx-24,cy-26,48,26);
      // Board face
      ctx.fillStyle='#f8f0d0'; ctx.fillRect(cx-23,cy-27,46,26);
      // Coloured top stripe
      ctx.fillStyle=s.col; ctx.fillRect(cx-23,cy-27,46,7);
      // Label text
      ctx.fillStyle='#2a1a08'; ctx.font='bold 9px sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(s.label,cx,cy-14);
      // Arrow
      ctx.fillStyle=s.col; ctx.font='bold 11px sans-serif';
      ctx.fillText(s.arrow,cx,cy-4);
    });
    ctx.restore();
  }

  /* ── INTERIOR DECORATION OVERLAYS ── */
  function drawInteriorDecor(){
    const now=Date.now();
    ctx.save();
    ctx.textAlign='center'; ctx.textBaseline='middle';

    if(currentMapId==='intHouse'){
      // ── Curtained windows on north wall ──
      [[22,14],[25,14]].forEach(([tx,ty])=>{
        const sx=tx*TSIZE-camX, sy=ty*TSIZE-camY;
        ctx.fillStyle='#5a3a18'; ctx.fillRect(sx+2,sy+2,TSIZE-4,TSIZE-4);
        ctx.fillStyle='rgba(180,230,255,0.65)'; ctx.fillRect(sx+5,sy+5,TSIZE-10,TSIZE-10);
        const grd=ctx.createLinearGradient(sx+5,sy+5,sx+5,sy+TSIZE-5);
        grd.addColorStop(0,'rgba(120,200,255,0.4)'); grd.addColorStop(1,'rgba(200,240,255,0.1)');
        ctx.fillStyle=grd; ctx.fillRect(sx+5,sy+5,TSIZE-10,TSIZE-10);
        ctx.fillStyle='rgba(200,60,60,0.80)';
        ctx.fillRect(sx+2,sy+2,7,TSIZE-4); ctx.fillRect(sx+TSIZE-9,sy+2,7,TSIZE-4);
        ctx.fillStyle='#8a5020'; ctx.fillRect(sx+1,sy+1,TSIZE-2,3);
        ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.fillRect(sx+6,sy+6,5,3);
      });
      // ── Decorative rug ──
      const rugX=20*TSIZE-camX, rugY=20*TSIZE-camY, rW=TSIZE*6, rH=TSIZE*4;
      ctx.fillStyle='rgba(150,40,40,0.22)'; ctx.fillRect(rugX,rugY,rW,rH);
      ctx.strokeStyle='rgba(160,50,50,0.55)'; ctx.lineWidth=3;
      ctx.strokeRect(rugX+4,rugY+4,rW-8,rH-8);
      ctx.strokeStyle='rgba(200,160,60,0.35)'; ctx.lineWidth=1;
      ctx.strokeRect(rugX+9,rugY+9,rW-18,rH-18);
      const rcx=rugX+rW/2, rcy=rugY+rH/2;
      ctx.beginPath(); ctx.moveTo(rcx,rcy-18); ctx.lineTo(rcx+24,rcy); ctx.lineTo(rcx,rcy+18); ctx.lineTo(rcx-24,rcy); ctx.closePath();
      ctx.fillStyle='rgba(200,80,60,0.20)'; ctx.fill();
      ctx.strokeStyle='rgba(200,100,60,0.40)'; ctx.lineWidth=1.5; ctx.stroke();
      // ── Potted plant ──
      const plx=17*TSIZE-camX+TSIZE/2, ply=24*TSIZE-camY+TSIZE-4;
      ctx.fillStyle='#a04018';
      ctx.beginPath(); ctx.moveTo(plx-9,ply-12); ctx.lineTo(plx+9,ply-12); ctx.lineTo(plx+7,ply); ctx.lineTo(plx-7,ply); ctx.closePath(); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.fillRect(plx-9,ply-14,18,3);
      ctx.fillStyle='#3a1e08'; ctx.beginPath(); ctx.ellipse(plx,ply-12,8,3,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#1a5c10';
      [[0,-24],[8,-28],[-8,-28],[0,-36],[10,-34],[-10,-34]].forEach(([ox,oy])=>{
        ctx.beginPath(); ctx.arc(plx+ox,ply+oy,7,0,Math.PI*2); ctx.fill();
      });
      ctx.fillStyle='rgba(60,200,60,0.25)';
      [[0,-30],[6,-34],[-6,-34]].forEach(([ox,oy])=>{ ctx.beginPath(); ctx.arc(plx+ox,ply+oy,4,0,Math.PI*2); ctx.fill(); });
      // ── Framed landscape picture ──
      const picX=19*TSIZE-camX, picY=14*TSIZE-camY;
      ctx.fillStyle='#6a3e14'; ctx.fillRect(picX+2,picY+3,TSIZE*3-4,TSIZE-6);
      ctx.fillStyle='#f5deb3'; ctx.fillRect(picX+6,picY+7,TSIZE*3-12,TSIZE-14);
      ctx.fillStyle='rgba(100,180,255,0.8)'; ctx.fillRect(picX+6,picY+7,TSIZE*3-12,(TSIZE-14)/2);
      ctx.fillStyle='rgba(80,180,40,0.8)'; ctx.fillRect(picX+6,picY+7+(TSIZE-14)/2,TSIZE*3-12,(TSIZE-14)/2);
      ctx.fillStyle='rgba(255,220,60,0.9)'; ctx.beginPath(); ctx.arc(picX+TSIZE*1.5,picY+7+8,6,0,Math.PI*2); ctx.fill();
      // ── Colourful book spines on bookshelf ──
      const bkColors=['#d04040','#4060c0','#40a040','#c0a020','#a040a0','#406080'];
      for(let r=0;r<6;r++){
        const bsx=16*TSIZE-camX+4, bsy=(16+r)*TSIZE-camY+4;
        ctx.fillStyle=bkColors[r]; ctx.fillRect(bsx,bsy,8,TSIZE-8);
        ctx.fillStyle='rgba(255,255,255,0.2)'; ctx.fillRect(bsx+1,bsy+2,2,4);
      }
      // ── Bed pillow & blanket ──
      const bdX=30*TSIZE-camX, bdY=15*TSIZE-camY;
      ctx.fillStyle='rgba(60,100,200,0.30)'; ctx.fillRect(bdX,bdY+TSIZE,TSIZE*4,TSIZE*3);
      ctx.strokeStyle='rgba(80,120,220,0.35)'; ctx.lineWidth=1;
      for(let i=0;i<4;i++) ctx.strokeRect(bdX+i*TSIZE/2,bdY+TSIZE,TSIZE/2,TSIZE*3);
      ctx.fillStyle='rgba(240,240,255,0.80)'; ctx.fillRect(bdX+4,bdY+TSIZE+4,TSIZE*4-8,TSIZE-8);
      ctx.strokeStyle='rgba(200,200,240,0.6)'; ctx.lineWidth=1.5; ctx.strokeRect(bdX+6,bdY+TSIZE+6,TSIZE*4-12,TSIZE-12);
    }

    else if(currentMapId==='intPC'){
      // ── Pokémon Center ambient pink glow ──
      const glowPulse=0.06+0.04*Math.sin(now/1200);
      const ambGrd=ctx.createRadialGradient(25*TSIZE-camX,14*TSIZE-camY,10,25*TSIZE-camX,14*TSIZE-camY,TSIZE*8);
      ambGrd.addColorStop(0,`rgba(255,180,220,${glowPulse*2})`); ambGrd.addColorStop(1,'rgba(255,180,220,0)');
      ctx.fillStyle=ambGrd; ctx.fillRect(camX,camY,canvas.width,canvas.height);
      // ── NURSE STATION sign ──
      const deskX=14*TSIZE-camX, deskY=13*TSIZE-camY;
      ctx.fillStyle='rgba(255,80,160,0.90)';
      if(ctx.roundRect){ctx.beginPath();ctx.roundRect(deskX+TSIZE*5-20,deskY-18,80,16,4);ctx.fill();}
      else ctx.fillRect(deskX+TSIZE*5-20,deskY-18,80,16);
      ctx.fillStyle='#fff'; ctx.font='bold 9px "Exo 2",sans-serif';
      ctx.fillText('NURSE STATION',deskX+TSIZE*5+20,deskY-10);
      // ── Nurse NPC ──
      const nx=25*TSIZE-camX+TSIZE/2, ny=14*TSIZE-camY;
      ctx.fillStyle='#f5a0c0'; ctx.fillRect(nx-5,ny-8,10,10);
      ctx.fillStyle='#fff'; ctx.fillRect(nx-4,ny-8,8,4);
      ctx.fillStyle='#f5c28a'; ctx.fillRect(nx-5,ny-20,10,12);
      ctx.fillStyle='#cc6688'; ctx.fillRect(nx-5,ny-20,10,4);
      ctx.fillStyle='#1a1010'; ctx.fillRect(nx-3,ny-16,2,2); ctx.fillRect(nx+1,ny-16,2,2);
      ctx.fillStyle='#fff'; ctx.fillRect(nx-4,ny-23,8,5);
      ctx.fillStyle='rgba(255,80,160,0.85)'; ctx.fillRect(nx-2,ny-22,4,2);
      // ── Recovery pods with pulsing glow ──
      [[15,18],[30,18]].forEach(([btx,bty])=>{
        for(let dx=0;dx<5;dx++){
          const sx=(btx+dx)*TSIZE-camX, sy=bty*TSIZE-camY;
          const pulse=0.5+0.5*Math.sin(now/600+(btx+dx)*0.8);
          const podGrd=ctx.createRadialGradient(sx+TSIZE/2,sy+TSIZE/2,2,sx+TSIZE/2,sy+TSIZE/2,TSIZE*0.6);
          podGrd.addColorStop(0,`rgba(0,200,255,${0.25+pulse*0.15})`); podGrd.addColorStop(1,'rgba(0,150,255,0)');
          ctx.fillStyle=podGrd; ctx.fillRect(sx,sy-4,TSIZE,TSIZE*3+4);
          ctx.fillStyle=`rgba(0,180,255,${0.60+pulse*0.3})`; ctx.fillRect(sx+5,sy+3,TSIZE-10,10);
          ctx.fillStyle='rgba(255,255,255,0.2)'; ctx.fillRect(sx+6,sy+4,TSIZE/3,3);
          const hc=`rgba(255,60,140,${0.7+pulse*0.25})`;
          ctx.fillStyle=hc; ctx.fillRect(sx+TSIZE/2-1,sy-6,2,10); ctx.fillRect(sx+TSIZE/2-5,sy-2,10,2);
        }
      });
      // ── Pokéball logo on floor ──
      const pbx=25*TSIZE-camX, pby=23*TSIZE-camY;
      ctx.globalAlpha=0.12+0.04*Math.sin(now/1500);
      ctx.strokeStyle='#ff4488'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(pbx,pby,TSIZE*2,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pbx-TSIZE*2,pby); ctx.lineTo(pbx+TSIZE*2,pby); ctx.stroke();
      ctx.beginPath(); ctx.arc(pbx,pby,8,0,Math.PI*2); ctx.stroke();
      ctx.globalAlpha=1;
    }

    else if(currentMapId==='intGym'){
      const leaderId=MAPS_DATA[_interiorReturn?.mapId]?.gymLeaderId;
      const em=GL_EMOJI[leaderId]||'⭐';
      const gymRGB=leaderId==='sylvia'?[40,160,40]:leaderId==='granite'?[140,110,70]:leaderId==='marina'?[40,120,220]:[220,200,30];
      const gymHex=leaderId==='sylvia'?'#28a028':leaderId==='granite'?'#8c6e46':leaderId==='marina'?'#2878dc':'#dccc1e';
      // ── Spotlight beams ──
      [10,25,40].forEach(txl=>{
        const slx=txl*TSIZE-camX, sly=6*TSIZE-camY;
        const slGrd=ctx.createLinearGradient(slx,sly,slx,sly+TSIZE*6);
        slGrd.addColorStop(0,`rgba(${gymRGB[0]},${gymRGB[1]},${gymRGB[2]},0.12)`); slGrd.addColorStop(1,`rgba(${gymRGB[0]},${gymRGB[1]},${gymRGB[2]},0)`);
        ctx.fillStyle=slGrd; ctx.fillRect(slx-16,sly,32,TSIZE*6);
      });
      // ── Arena floor emblem ──
      const ex=25*TSIZE-camX, ey=22*TSIZE-camY;
      const embPulse=0.10+0.05*Math.sin(now/900);
      ctx.globalAlpha=embPulse*1.6;
      ctx.strokeStyle=gymHex; ctx.lineWidth=4;
      ctx.beginPath(); ctx.arc(ex,ey,TSIZE*4,0,Math.PI*2); ctx.stroke();
      ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(ex,ey,TSIZE*2.5,0,Math.PI*2); ctx.stroke();
      ctx.font=`bold ${TSIZE*3}px sans-serif`;
      ctx.fillText(em,ex,ey);
      ctx.globalAlpha=1;
      // ── Wall banners ──
      [[6,10],[42,10]].forEach(([btx,bty])=>{
        const bsx=btx*TSIZE-camX, bsy=bty*TSIZE-camY;
        ctx.fillStyle=gymHex; ctx.fillRect(bsx+2,bsy,TSIZE*2-4,TSIZE*5);
        ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.fillRect(bsx+4,bsy,4,TSIZE*5);
        ctx.font=`bold ${TSIZE*0.9}px sans-serif`; ctx.globalAlpha=0.7;
        ctx.fillText(em,bsx+TSIZE,bsy+TSIZE*2.5); ctx.globalAlpha=1;
      });
      // ── Lane dividers ──
      ctx.strokeStyle=`rgba(${gymRGB[0]},${gymRGB[1]},${gymRGB[2]},0.55)`; ctx.lineWidth=3; ctx.setLineDash([8,5]);
      [14,20,26].forEach(lty=>{
        const lsy=lty*TSIZE-camY;
        ctx.beginPath(); ctx.moveTo(8*TSIZE-camX,lsy); ctx.lineTo(42*TSIZE-camX,lsy); ctx.stroke();
      });
      ctx.setLineDash([]);
      // ── Leader platform glow ──
      const pfx=20*TSIZE-camX, pfy=7*TSIZE-camY;
      const pfGrd=ctx.createLinearGradient(pfx,pfy,pfx,pfy+TSIZE*3);
      pfGrd.addColorStop(0,`rgba(${gymRGB[0]},${gymRGB[1]},${gymRGB[2]},0.20)`); pfGrd.addColorStop(1,`rgba(${gymRGB[0]},${gymRGB[1]},${gymRGB[2]},0)`);
      ctx.fillStyle=pfGrd; ctx.fillRect(pfx,pfy,TSIZE*9,TSIZE*3);
    }

    else if(currentMapId==='intMart'){
      // ── Shelf label boards ──
      const shelfItems=[
        {tx:14,icon:'⚾',name:'POKÉ BALLS'},{tx:20,icon:'💊',name:'POTIONS'},
        {tx:26,icon:'⭐',name:'EXP ITEMS'},{tx:32,icon:'💎',name:'STONES'}
      ];
      shelfItems.forEach(({tx,icon,name})=>{
        const sx=tx*TSIZE-camX, sy=14*TSIZE-camY;
        ctx.fillStyle='rgba(40,80,200,0.85)';
        if(ctx.roundRect){ctx.beginPath();ctx.roundRect(sx,sy-20,TSIZE*4,18,4);ctx.fill();}
        else ctx.fillRect(sx,sy-20,TSIZE*4,18);
        ctx.fillStyle='#fff'; ctx.font='bold 8px "Exo 2",sans-serif';
        ctx.fillText(`${icon} ${name}`,sx+TSIZE*2,sy-11);
        // Coloured item blobs on shelves
        for(let dx=0;dx<4;dx++){
          const isx=(tx+dx)*TSIZE-camX+4, isy=sy+8;
          const icol=['rgba(255,80,80,0.7)','rgba(80,180,80,0.7)','rgba(80,120,255,0.7)','rgba(255,200,40,0.7)'][dx%4];
          ctx.fillStyle=icol; ctx.beginPath(); ctx.arc(isx+TSIZE/2-4,isy+8,7,0,Math.PI*2); ctx.fill();
          ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.arc(isx+TSIZE/2-6,isy+6,3,0,Math.PI*2); ctx.fill();
        }
      });
      // ── Staff NPC at counter ──
      const sx2=25*TSIZE-camX+TSIZE/2, sy2=14*TSIZE-camY;
      ctx.fillStyle='#2060c0'; ctx.fillRect(sx2-5,sy2-8,10,10);
      ctx.fillStyle='#fff'; ctx.fillRect(sx2-3,sy2-7,6,3);
      ctx.fillStyle='#f5c28a'; ctx.fillRect(sx2-4,sy2-18,8,10);
      ctx.fillStyle='#1a1a60'; ctx.fillRect(sx2-4,sy2-18,8,4);
      ctx.fillStyle='#1a1010'; ctx.fillRect(sx2-2,sy2-14,2,2); ctx.fillRect(sx2+1,sy2-14,2,2);
      // ── Pulsing sale tags ──
      const stp=0.6+0.4*Math.sin(now/500);
      ctx.fillStyle=`rgba(255,60,60,${stp})`; ctx.font='bold 6px sans-serif';
      [[16,15],[22,15],[28,15],[34,15]].forEach(([stx,sty])=>{
        const ssx=stx*TSIZE-camX, ssy=sty*TSIZE-camY;
        if(ctx.roundRect){ctx.beginPath();ctx.roundRect(ssx+4,ssy+4,TSIZE-8,10,3);ctx.fill();}
        else ctx.fillRect(ssx+4,ssy+4,TSIZE-8,10);
        ctx.fillStyle='#fff'; ctx.fillText('SALE',ssx+TSIZE/2,ssy+10);
        ctx.fillStyle=`rgba(255,60,60,${stp})`;
      });
      // ── Welcome mat ──
      const mx=21*TSIZE-camX, my=30*TSIZE-camY;
      ctx.fillStyle='rgba(40,80,200,0.25)'; ctx.fillRect(mx,my,TSIZE*6,TSIZE);
      ctx.strokeStyle='rgba(60,100,220,0.50)'; ctx.lineWidth=2;
      ctx.strokeRect(mx+2,my+2,TSIZE*6-4,TSIZE-4);
      ctx.fillStyle='rgba(100,150,255,0.9)'; ctx.font='bold 10px "Exo 2",sans-serif';
      ctx.fillText('WELCOME TO THE POKÉMART!',mx+TSIZE*3,my+TSIZE/2);
    }

    ctx.restore();
  }

  /* ── GYM LEADER NPC DRAWING ── */
  const GL_EMOJI={sylvia:'🌿',granite:'🪨',marina:'🌊',voltex:'⚡'};
  function drawGymLeader(){
    if(currentMapId!=='intGym')return;
    const leaderId=MAPS_DATA[_interiorReturn?.mapId]?.gymLeaderId;
    if(!leaderId)return;
    const gl=GYM_LEADERS[leaderId]; if(!gl)return;
    // Leader stands on the platform centre, front edge (tx=24,ty=9)
    const lx=24*TSIZE-camX, ly=9*TSIZE-camY;
    if(lx<-32||lx>canvas.width+32||ly<-32||ly>canvas.height+32)return;
    const cx=lx+TSIZE/2, cy=ly+TSIZE/2;
    const now=Date.now();
    // Shadow
    ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(cx,cy+13,10,3,0,0,Math.PI*2); ctx.fill();
    // Body (distinctive colour per leader)
    const bodyColor=leaderId==='sylvia'?'#2d8a2d':leaderId==='granite'?'#8a6030':leaderId==='marina'?'#2060c0':'#c0a000';
    // Legs
    const legSway=Math.sin(now/900)*1.5;
    ctx.fillStyle='#1a1010'; ctx.fillRect(cx-5,cy+4,4,7+legSway); ctx.fillRect(cx+1,cy+4,4,7-legSway);
    // Body/outfit
    ctx.fillStyle=bodyColor; ctx.fillRect(cx-7,cy-4,14,9);
    // Arms (idle sway)
    ctx.fillStyle=bodyColor; ctx.fillRect(cx-10,cy-3,4,6); ctx.fillRect(cx+6,cy-3,4,6);
    // Head
    ctx.fillStyle='#f5c28a'; ctx.fillRect(cx-5,cy-14,10,10);
    // Eyes
    ctx.fillStyle='#1a1010'; ctx.fillRect(cx-3,cy-11,2,2); ctx.fillRect(cx+1,cy-11,2,2);
    // Hair accent
    ctx.fillStyle=bodyColor; ctx.fillRect(cx-5,cy-15,10,4);
    // Badge sparkle above head
    const sparkle=0.5+0.5*Math.sin(now/600);
    ctx.font=`${11+sparkle*2}px sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.globalAlpha=0.8+sparkle*0.2;
    ctx.fillText(GL_EMOJI[leaderId]||'⭐',cx,cy-22);
    ctx.globalAlpha=1;
    // Name label
    ctx.fillStyle='rgba(0,0,0,0.65)';
    const lw=ctx.measureText(gl.name).width+10;
    ctx.fillRect(cx-lw/2,cy-32,lw,12);
    ctx.fillStyle='#ffd0ff'; ctx.font='bold 8px sans-serif';
    ctx.fillText(gl.name,cx,cy-26);
  }

  function getZone(tx,ty){
    const enc=MAPS_DATA[currentMapId]?.encounters||'route1';
    // Sub-zones within starterTown
    if(currentMapId==='starterTown'){
      if(tx>=13&&tx<=17&&ty>=10&&ty<=14) return 'rare';
      if(tx>=18&&tx<=31&&ty>=9&&ty<=13)  return 'shore';
    }
    return enc;
  }

  /* ── GRASS SWAY ANIMATION ── */
  function touchGrass(tx,ty,strength){
    for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){
      const nx=tx+dx,ny=ty+dy;
      const t=getTile(nx,ny);
      if(t!==T.TALL&&t!==T.GRASS)continue;
      const key=`${nx},${ny}`;
      let ef=tileEffects.get(key);
      if(!ef){ef={sway:0,vel:0};tileEffects.set(key,ef);}
      const dist=Math.sqrt(dx*dx+dy*dy)||1;
      ef.vel+=strength/(dist*1.4);
    }
  }
  function stepTileEffects(){
    for(const [key,ef] of tileEffects){
      ef.sway+=ef.vel;
      ef.vel*=0.80;
      ef.sway*=0.86;
      if(Math.abs(ef.sway)<0.03&&Math.abs(ef.vel)<0.03) tileEffects.delete(key);
    }
  }

  /* ── RENDERING ── */
  function drawTile(sx,sy,tile,tx,ty){
    // Fill base color
    ctx.fillStyle=TILE_COLORS[tile]; ctx.fillRect(sx,sy,TSIZE,TSIZE);
    const now=Date.now();

    if(tile===T.GRASS){
      if((tx+ty)%2===0){ctx.fillStyle='rgba(0,50,0,0.07)';ctx.fillRect(sx,sy,TSIZE,TSIZE);}
      // Tiny ground tufts — idle sway
      const gt=now/2200+tx*0.6+ty*0.8;
      const go=Math.sin(gt)*1.2;
      ctx.fillStyle='rgba(30,110,30,0.30)';
      [[4,6],[11,5],[18,7],[25,5],[29,6]].forEach(([bx,bh])=>{
        ctx.fillRect(sx+bx,sy+TSIZE-bh+go,2,bh);
      });
    }
    else if(tile===T.TALL){
      // Dark ground under blades
      ctx.fillStyle='#155015'; ctx.fillRect(sx,sy+Math.floor(TSIZE*0.58),TSIZE,Math.ceil(TSIZE*0.42));
      // Sway from tileEffects + idle wind
      const key=`${tx},${ty}`;
      const ef=tileEffects.get(key);
      const idle=Math.sin(now/1500+tx*1.1+ty*0.9)*1.8;
      const sway=(ef?ef.sway:0)+idle;
      // Six bezier-curve grass blades
      const blades=[
        {bx:3, bh:21,w:2.5,col:'#1a5c1a'},
        {bx:8, bh:23,w:2.0,col:'#237823'},
        {bx:13,bh:19,w:2.5,col:'#1b651b'},
        {bx:19,bh:24,w:2.0,col:'#2a8030'},
        {bx:24,bh:20,w:2.5,col:'#1a5c1a'},
        {bx:29,bh:22,w:2.0,col:'#206820'},
      ];
      ctx.lineCap='round';
      blades.forEach((b,i)=>{
        const bs=sway*(0.32+i*0.13);
        const bx=sx+b.bx+1, by=sy+TSIZE-3;
        ctx.beginPath();
        ctx.moveTo(bx,by);
        ctx.quadraticCurveTo(bx+bs*0.55,by-b.bh*0.52,bx+bs*1.15,by-b.bh);
        ctx.lineWidth=b.w; ctx.strokeStyle=b.col; ctx.stroke();
        // Lighter tip accent
        ctx.beginPath();
        ctx.moveTo(bx+bs*1.15,by-b.bh);
        ctx.lineTo(bx+bs*1.35,by-b.bh-4);
        ctx.lineWidth=1; ctx.strokeStyle='rgba(120,210,80,0.45)'; ctx.stroke();
      });
    }
    else if(tile===T.TREE){
      // Trunk
      ctx.fillStyle='#3d2008'; ctx.fillRect(sx+TSIZE/2-4,sy+TSIZE/2+1,8,TSIZE/2-1);
      ctx.fillStyle='rgba(0,0,0,0.15)'; ctx.fillRect(sx+TSIZE/2+1,sy+TSIZE/2+1,3,TSIZE/2-1);
      // Root shadow
      ctx.fillStyle='rgba(0,0,0,0.18)'; ctx.fillRect(sx+TSIZE/2-6,sy+TSIZE-5,12,5);
      // Canopy — 3 overlapping circles for depth
      ctx.fillStyle='#0e3a08';
      ctx.beginPath();ctx.arc(sx+TSIZE/2,sy+TSIZE/2-1,TSIZE/2-1,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#1a5c10';
      ctx.beginPath();ctx.arc(sx+TSIZE/2+4,sy+TSIZE/2-3,TSIZE/2-4,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#2a7a1a';
      ctx.beginPath();ctx.arc(sx+TSIZE/2-5,sy+TSIZE/2-4,TSIZE/2-5,0,Math.PI*2);ctx.fill();
      // Highlight shimmer
      ctx.fillStyle='rgba(90,200,50,0.22)';
      ctx.beginPath();ctx.arc(sx+TSIZE/2-4,sy+TSIZE/2-7,TSIZE/4,0,Math.PI*2);ctx.fill();
    }
    else if(tile===T.WATER){
      const t=now/1000;
      // Depth overlay
      ctx.fillStyle='rgba(0,18,55,0.26)'; ctx.fillRect(sx,sy,TSIZE,TSIZE);
      // 4 animated wave lines at different speeds/depths
      for(let row=0;row<4;row++){
        const wy=sy+4+row*8;
        const spd=t*(0.45+row*0.16);
        const amp=2.4-row*0.2;
        ctx.beginPath();
        ctx.strokeStyle=`rgba(90,200,255,${0.10+row*0.04})`;
        ctx.lineWidth=1.5;
        for(let wx=0;wx<=TSIZE;wx+=2){
          const wvy=wy+Math.sin((wx/TSIZE*2+tx*0.55+ty*0.38+spd)*Math.PI)*amp;
          if(wx===0)ctx.moveTo(sx,wvy); else ctx.lineTo(sx+wx,wvy);
        }
        ctx.stroke();
      }
      // Sparkle cross
      const sp=(t*1.7+tx*2.2+ty*1.5)%3.5;
      if(sp<0.55){
        const alpha=sp<0.28?sp/0.28:(0.55-sp)/0.27;
        const spx=sx+((tx*19+ty*13)%(TSIZE-8))+4;
        const spy=sy+((tx*13+ty*19)%(TSIZE-8))+4;
        ctx.fillStyle=`rgba(255,255,255,${alpha*0.80})`;
        ctx.fillRect(spx,spy-2,1,5); ctx.fillRect(spx-2,spy,5,1);
      }
    }
    else if(tile===T.BUILDING){
      // Detect position within building block for PSP-style multi-tile rendering
      const above=getTile(tx,ty-1), below=getTile(tx,ty+1);
      const left=getTile(tx-1,ty), right=getTile(tx+1,ty);
      const isRoof=above!==T.BUILDING;
      const isBase=below!==T.BUILDING;
      const isLeftEdge=left!==T.BUILDING;
      const isRightEdge=right!==T.BUILDING;

      if(isRoof){
        // ── Red tiled roof (PSP style) ──
        ctx.fillStyle='#c83018'; ctx.fillRect(sx,sy,TSIZE,TSIZE);
        // Ridge at top
        ctx.fillStyle='#a02010'; ctx.fillRect(sx,sy,TSIZE,5);
        // Tile pattern lines
        ctx.fillStyle='rgba(0,0,0,0.09)';
        for(let rx=0;rx<TSIZE;rx+=8) ctx.fillRect(sx+rx,sy+5,1,TSIZE-5);
        for(let ry=5;ry<TSIZE;ry+=8) ctx.fillRect(sx,sy+ry,TSIZE,1);
        // Eave shadow at bottom
        ctx.fillStyle='rgba(0,0,0,0.20)'; ctx.fillRect(sx,sy+TSIZE-4,TSIZE,4);
        if(isLeftEdge){ctx.fillStyle='rgba(0,0,0,0.16)';ctx.fillRect(sx,sy,3,TSIZE);}
        if(isRightEdge){ctx.fillStyle='rgba(0,0,0,0.16)';ctx.fillRect(sx+TSIZE-3,sy,3,TSIZE);}
      } else if(isBase){
        // ── Ground floor — cream walls + door ──
        ctx.fillStyle='#f2e6c5'; ctx.fillRect(sx,sy,TSIZE,TSIZE);
        // Only tiles that are interior (left+right both building) or single-wide get door
        if(!isLeftEdge&&!isRightEdge){
          // Center tile of base — door
          ctx.fillStyle='#7a4820'; ctx.fillRect(sx+TSIZE/2-5,sy+3,10,TSIZE-3);
          // Glass upper panel
          ctx.fillStyle='rgba(140,225,255,0.72)'; ctx.fillRect(sx+TSIZE/2-4,sy+4,8,11);
          // Reflection line
          ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.fillRect(sx+TSIZE/2-3,sy+5,2,8);
          // Wood lower panel
          ctx.fillStyle='#8a5530'; ctx.fillRect(sx+TSIZE/2-4,sy+15,8,TSIZE-15);
          // Doorknob
          ctx.fillStyle='#d4a820'; ctx.fillRect(sx+TSIZE/2+2,sy+20,2,2);
          // Step mat
          ctx.fillStyle='#c8a860'; ctx.fillRect(sx+TSIZE/2-7,sy+TSIZE-4,14,4);
        } else {
          // Side base wall — plain cream
          ctx.fillStyle='rgba(0,0,0,0.04)'; ctx.fillRect(sx,sy,TSIZE,TSIZE);
          // Low wall sill
          ctx.fillStyle='rgba(0,0,0,0.07)'; ctx.fillRect(sx,sy,TSIZE,2);
        }
        if(isLeftEdge){ctx.fillStyle='rgba(0,0,0,0.12)';ctx.fillRect(sx,sy,3,TSIZE);}
        if(isRightEdge){ctx.fillStyle='rgba(0,0,0,0.12)';ctx.fillRect(sx+TSIZE-3,sy,3,TSIZE);}
      } else {
        // ── Middle wall tile — cream + window ──
        ctx.fillStyle='#f2e6c5'; ctx.fillRect(sx,sy,TSIZE,TSIZE);
        // Window outer frame
        ctx.fillStyle='#7a5028'; ctx.fillRect(sx+TSIZE/2-7,sy+TSIZE/2-6,14,12);
        // Window glass
        ctx.fillStyle='rgba(140,225,255,0.58)'; ctx.fillRect(sx+TSIZE/2-6,sy+TSIZE/2-5,12,10);
        // Glass reflection
        ctx.fillStyle='rgba(255,255,255,0.38)'; ctx.fillRect(sx+TSIZE/2-5,sy+TSIZE/2-4,4,3);
        // Window cross dividers
        ctx.fillStyle='rgba(100,68,28,0.40)';
        ctx.fillRect(sx+TSIZE/2-1,sy+TSIZE/2-5,2,10);
        ctx.fillRect(sx+TSIZE/2-6,sy+TSIZE/2,12,2);
        if(isLeftEdge){ctx.fillStyle='rgba(0,0,0,0.12)';ctx.fillRect(sx,sy,3,TSIZE);}
        if(isRightEdge){ctx.fillStyle='rgba(0,0,0,0.12)';ctx.fillRect(sx+TSIZE-3,sy,3,TSIZE);}
      }
      // Subtle wall texture on all building tiles
      ctx.fillStyle='rgba(0,0,0,0.025)'; ctx.fillRect(sx,sy,TSIZE,TSIZE);
    }
    else if(tile===T.PATH){
      // Subtle worn pebble texture
      if((tx+ty)%2===0){ctx.fillStyle='rgba(0,0,0,0.05)';ctx.fillRect(sx,sy,TSIZE,TSIZE);}
      // Path edge darkening where it meets grass
      const pathAbove=getTile(tx,ty-1)!==T.PATH&&getTile(tx,ty-1)!==T.BUILDING;
      const pathBelow=getTile(tx,ty+1)!==T.PATH&&getTile(tx,ty+1)!==T.BUILDING;
      if(pathAbove){ctx.fillStyle='rgba(0,0,0,0.06)';ctx.fillRect(sx,sy,TSIZE,2);}
      if(pathBelow){ctx.fillStyle='rgba(0,0,0,0.06)';ctx.fillRect(sx,sy+TSIZE-2,TSIZE,2);}
    }
    else if(tile===T.ROCK){
      // Rock shapes with highlights
      const rocks=[{x:2,y:4,w:9,h:7},{x:16,y:12,w:10,h:6},{x:7,y:20,w:8,h:6}];
      rocks.forEach(r=>{
        ctx.fillStyle='rgba(0,0,0,0.14)'; ctx.fillRect(sx+r.x,sy+r.y,r.w,r.h);
        ctx.fillStyle='rgba(255,255,255,0.07)'; ctx.fillRect(sx+r.x,sy+r.y,r.w,2);
      });
    }
    else if(tile===T.SAND){
      // Gentle ripple dots
      const sd1=((tx*7+ty*3)%5)*5+2, sd2=((tx*3+ty*7)%6)*4+1;
      ctx.fillStyle='rgba(140,100,40,0.14)';
      ctx.fillRect(sx+sd1,sy+sd2,3,3);
      ctx.fillRect(sx+(sd1+14)%TSIZE,sy+(sd2+10)%TSIZE,2,2);
    }
    else if(tile===T.FLOOR){
      if(currentMapId==='intPC'){
        // Pokémon Center: pink/white checkerboard
        ctx.fillStyle=(tx+ty)%2===0?'#fce8f0':'#fff0f6';
        ctx.fillRect(sx,sy,TSIZE,TSIZE);
        ctx.fillStyle='rgba(220,100,160,0.10)';
        ctx.fillRect(sx,sy,TSIZE,1); ctx.fillRect(sx,sy,1,TSIZE);
      } else if(currentMapId==='intGym'){
        // Gym: polished stone tiles tinted by leader type
        const lid=MAPS_DATA[_interiorReturn?.mapId]?.gymLeaderId;
        const gc=lid==='sylvia'?[40,140,40]:lid==='granite'?[120,100,70]:lid==='marina'?[40,100,200]:[200,180,30];
        ctx.fillStyle=(tx+ty)%2===0?`rgba(${gc[0]},${gc[1]},${gc[2]},0.14)`:'rgba(0,0,0,0)';
        ctx.fillRect(sx,sy,TSIZE,TSIZE);
        ctx.fillStyle='rgba(0,0,0,0.06)';
        ctx.fillRect(sx,sy,TSIZE,1); ctx.fillRect(sx,sy,1,TSIZE);
        ctx.fillStyle='rgba(255,255,255,0.06)';
        ctx.fillRect(sx+1,sy+1,TSIZE-1,1); ctx.fillRect(sx+1,sy+1,1,TSIZE-1);
      } else if(currentMapId==='intMart'){
        // Mart: bright clean white tiles
        ctx.fillStyle=(tx+ty)%2===0?'#f4f4f4':'#ececec';
        ctx.fillRect(sx,sy,TSIZE,TSIZE);
        ctx.fillStyle='rgba(0,0,0,0.07)';
        ctx.fillRect(sx,sy,TSIZE,1); ctx.fillRect(sx,sy,1,TSIZE);
      } else {
        // House / default: warm wood planks
        ctx.fillStyle='#c8904a'; ctx.fillRect(sx,sy,TSIZE,TSIZE);
        ctx.fillStyle='rgba(0,0,0,0.07)';
        for(let py=0;py<TSIZE;py+=8) ctx.fillRect(sx,sy+py,TSIZE,1);
        if((tx+ty)%2===0){ctx.fillStyle='rgba(0,0,0,0.04)';ctx.fillRect(sx,sy,TSIZE/2,TSIZE);}
        ctx.fillStyle='rgba(255,255,255,0.07)'; ctx.fillRect(sx,sy,TSIZE,2);
      }
    }
    else if(tile===T.COUNTER){
      // Top surface (lighter brown)
      ctx.fillStyle='#8a5030'; ctx.fillRect(sx,sy,TSIZE,TSIZE-6);
      // Front face drop-shadow
      ctx.fillStyle='rgba(0,0,0,0.40)'; ctx.fillRect(sx,sy+TSIZE-6,TSIZE,6);
      // Highlight edges
      ctx.fillStyle='rgba(255,255,255,0.14)';
      ctx.fillRect(sx,sy,TSIZE,2); ctx.fillRect(sx,sy,2,TSIZE-6);
      // Wood grain dividers
      ctx.fillStyle='rgba(0,0,0,0.07)';
      ctx.fillRect(sx+Math.floor(TSIZE/3),sy,1,TSIZE-6);
      ctx.fillRect(sx+Math.floor(2*TSIZE/3),sy,1,TSIZE-6);
    }
  }

  function drawPlayerChar(sx,sy){
    const cx=Math.round(sx), cy=Math.round(sy);
    const moving=player.moving, frame=player.frame||0;
    ctx.fillStyle='rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(cx+CHAR_S/2,cy+CHAR_S+2,CHAR_S/2,3,0,0,Math.PI*2); ctx.fill();
    const la=moving?(frame%2===0?3:-1):0, lb=moving?(frame%2===0?-1:3):0;
    ctx.fillStyle='#221610'; ctx.fillRect(cx+3,cy+16,4,6+la); ctx.fillRect(cx+9,cy+16,4,6+lb);
    ctx.fillStyle='#3366cc'; ctx.fillRect(cx+2,cy+8,CHAR_S-4,10);
    const ao=moving?(frame%2===0?2:-2):0;
    ctx.fillStyle='#3366cc'; ctx.fillRect(cx-3,cy+9+ao,4,6); ctx.fillRect(cx+CHAR_S-1,cy+9-ao,4,6);
    ctx.fillStyle='#f5c28a'; ctx.fillRect(cx+4,cy+1,8,9);
    ctx.fillStyle='#1a1010'; ctx.fillRect(cx+5,cy+4,2,2); ctx.fillRect(cx+9,cy+4,2,2);
    ctx.fillStyle='#cc2222'; ctx.fillRect(cx+3,cy,10,3);
  }

  function drawWarpPortals(){
    const warps=MAPS_DATA[currentMapId]?.warps||[];
    if(!warps.length)return;
    const now=Date.now();
    warps.forEach(w=>{
      const sx=w.tx*TSIZE-camX, sy=w.ty*TSIZE-camY;
      if(sx<-TSIZE||sy<-TSIZE||sx>canvas.width+TSIZE||sy>canvas.height+TSIZE)return;
      const isReturn=w.toMap==='__return__';
      const isInterior=MAPS_DATA[w.toMap]?.isInterior;
      // Color: gold for zone exits, cyan for building entries, purple for interior exits
      const [r,g,b]=isReturn?[180,80,255]:isInterior?[0,230,255]:[255,210,30];
      // Pulsing glow ring
      const pulse=0.45+Math.sin(now/500+w.tx+w.ty)*0.35;
      const grd=ctx.createRadialGradient(sx+TSIZE/2,sy+TSIZE/2,2,sx+TSIZE/2,sy+TSIZE/2,TSIZE*0.72);
      grd.addColorStop(0,`rgba(${r},${g},${b},${pulse*0.55})`);
      grd.addColorStop(1,`rgba(${r},${g},${b},0)`);
      ctx.fillStyle=grd; ctx.fillRect(sx,sy,TSIZE,TSIZE);
      // Animated spinning border dashes
      ctx.save();
      ctx.translate(sx+TSIZE/2,sy+TSIZE/2);
      ctx.rotate((now/800)%(Math.PI*2));
      ctx.strokeStyle=`rgba(${r},${g},${b},${0.65+pulse*0.25})`;
      ctx.lineWidth=2;
      ctx.setLineDash([4,4]);
      ctx.strokeRect(-TSIZE/2+2,-TSIZE/2+2,TSIZE-4,TSIZE-4);
      ctx.setLineDash([]);
      ctx.restore();
      // Arrow pointing inward
      const arrowPulse=Math.abs(Math.sin(now/400+w.tx));
      const ay=sy+TSIZE/2+Math.sin(now/400+w.tx)*3;
      const ax=sx+TSIZE/2;
      const as=6+arrowPulse*2;
      ctx.fillStyle=`rgba(${r},${g},${b},${0.8+arrowPulse*0.2})`;
      ctx.beginPath();
      ctx.moveTo(ax,ay-as); ctx.lineTo(ax+as,ay+as*0.5); ctx.lineTo(ax-as,ay+as*0.5);
      ctx.closePath(); ctx.fill();
      // "ENTER"/"EXIT" label
      ctx.font='bold 7px monospace';
      ctx.textAlign='center'; ctx.textBaseline='bottom';
      ctx.fillStyle=`rgba(${r},${g},${b},0.9)`;
      ctx.fillText(isReturn?'EXIT':'ENTER',sx+TSIZE/2,sy+TSIZE-2);
    });
  }

  function drawOverworld(){
    if(!canvas||!ctx) return;
    const W=canvas.width, H=canvas.height;
    ctx.clearRect(0,0,W,H);
    const tpx=Math.round(player.x-W/2+CHAR_S/2);
    const tpy=Math.round(player.y-H/2+CHAR_S/2);
    camX=Math.max(0,Math.min(tpx,MAP_W*TSIZE-W));
    camY=Math.max(0,Math.min(tpy,MAP_H*TSIZE-H));
    const tx0=Math.floor(camX/TSIZE), ty0=Math.floor(camY/TSIZE);
    const tx1=Math.min(MAP_W-1,tx0+Math.ceil(W/TSIZE)+1);
    const ty1=Math.min(MAP_H-1,ty0+Math.ceil(H/TSIZE)+1);
    stepTileEffects();
    for(let ty=ty0;ty<=ty1;ty++)
      for(let tx=tx0;tx<=tx1;tx++)
        drawTile(tx*TSIZE-camX, ty*TSIZE-camY, getTile(tx,ty), tx, ty);
    drawMapItems();
    drawPCSign();
    drawZoneSigns();
    drawInteriorDecor();
    drawWarpPortals();
    drawGymLeader();
    drawPlayerChar(player.x-camX, player.y-camY);
    drawToast();
  }

  /* ── POKEMON INSTANCES ── */
  function xpForLevel(lvl){ return Math.floor(0.5*lvl*lvl*lvl); }
  function calcStats(sid,lvl){
    const s=SP[sid];
    return { maxHp:Math.floor(2*s.hp*lvl/100+lvl+10), atk:Math.floor(2*s.atk*lvl/100+5),
             def:Math.floor(2*s.def*lvl/100+5), spd:Math.floor(2*s.spd*lvl/100+5) };
  }
  function mkMon(sid,lvl,xp=0){
    const s=SP[sid], st=calcStats(sid,lvl);
    return { speciesId:sid, level:lvl, name:s.name, emoji:s.emoji, types:s.types,
             hp:st.maxHp, maxHp:st.maxHp, atk:st.atk, def:st.def, spd:st.spd,
             moves:s.moves.map(m=>({id:m,pp:MV[m].pp,maxPp:MV[m].pp})),
             xp, xpToNext:xpForLevel(lvl+1),
             atkStg:0, defStg:0, spdStg:0, accStg:0 };
  }
  function stageMul(s){ return [0.25,0.28,0.33,0.4,0.5,0.66,1,1.5,2,2.5,3,3.5,4][Math.max(0,Math.min(12,s+6))]; }

  /* ── DAMAGE ── */
  function typeEff(atk,defTypes){
    let e=1; const tbl=TYPE_EFF[atk]||{};
    for(const d of defTypes) e*=(tbl[d]!==undefined?tbl[d]:1);
    return e;
  }
  function damage(att,def,moveId){
    const mv=MV[moveId]; if(!mv||mv.power===0) return 0;
    const atk=att.atk*stageMul(att.atkStg), dfn=def.def*stageMul(def.defStg);
    let d=Math.floor((2*att.level/5+2)*mv.power*atk/dfn/50)+2;
    const eff=typeEff(mv.type,def.types);
    if(eff===0) return 0;  // immune — no damage
    d=Math.floor(d*eff);
    return Math.max(1,Math.floor(d*(0.85+Math.random()*0.15)));
  }

  /* ── BATTLE UI ── */
  function setLog(a,b){ const l1=document.getElementById('pk-log-line1'),l2=document.getElementById('pk-log-line2'); if(l1)l1.textContent=a||''; if(l2)l2.textContent=b!==undefined?b:''; }
  function updateBallBtn(){ const b=document.getElementById('pk-ball-btn'); if(b){b.disabled=!battle||battleLocked||pokeballs<=0||battle?.type==='trainer'; const s=document.getElementById('pk-ball-count'); if(s)s.textContent=`(${pokeballs})`;} }
  function enableBtns(on){
    battleLocked=!on;
    for(let i=0;i<4;i++){ const b=document.getElementById(`pk-move-${i}`); if(b)b.disabled=!on||(battle&&battle.pm.moves[i]&&battle.pm.moves[i].pp<=0); }
    const rb=document.querySelector('.pk-run-btn'); if(rb)rb.disabled=!on;
    const sb=document.getElementById('pk-swap-btn'); if(sb)sb.disabled=!on;
    updateBallBtn();
  }
  function updateBUI(){
    if(!battle)return;
    const {pm:p,em:e}=battle;
    const eph=Math.max(0,Math.round(e.hp/e.maxHp*100));
    const pph=Math.max(0,Math.round(p.hp/p.maxHp*100));
    const hpCol=pct=>pct>50?'#2dcc70':pct>25?'#f0b030':'#e74c3c';
    document.getElementById('pk-ename').textContent=e.name;
    document.getElementById('pk-elvl').textContent=`Lv.${e.level}`;
    const ei=document.getElementById('pk-esprite-img');
    if(ei){ ei.src=spriteUrl(e.speciesId); ei.alt=e.name; }
    const eb=document.getElementById('pk-ehp-bar'); eb.style.width=eph+'%'; eb.style.background=hpCol(eph);
    document.getElementById('pk-ehp-text').textContent=`${Math.max(0,e.hp)}/${e.maxHp}`;
    document.getElementById('pk-pname').textContent=p.name;
    document.getElementById('pk-plvl').textContent=`Lv.${p.level}`;
    const pi=document.getElementById('pk-psprite-img');
    if(pi){ pi.src=spriteUrl(p.speciesId,true); pi.alt=p.name; }
    const pb=document.getElementById('pk-php-bar'); pb.style.width=pph+'%'; pb.style.background=hpCol(pph);
    document.getElementById('pk-php-text').textContent=`${Math.max(0,p.hp)}/${p.maxHp}`;
    document.getElementById('pk-xp-bar').style.width=Math.min(100,Math.round(p.xp/p.xpToNext*100))+'%';
    p.moves.forEach((mv,i)=>{
      const b=document.getElementById(`pk-move-${i}`); if(!b)return;
      const md=MV[mv.id]; if(!md){b.style.visibility='hidden';return;}
      b.style.visibility='visible';
      b.innerHTML=`<strong>${md.name}</strong><br><small style="opacity:0.7">${mv.pp}/${mv.maxPp} PP</small>`;
      b.style.borderLeftColor=TYPE_COLORS[md.type]||'#888'; b.disabled=mv.pp<=0;
    });
    for(let i=p.moves.length;i<4;i++){ const b=document.getElementById(`pk-move-${i}`); if(b)b.style.visibility='hidden'; }
  }

  /* ── BATTLE AUDIO ── */
  let sfxCtx=null;
  function getSfx(){
    if(!sfxCtx||sfxCtx.state==='closed') sfxCtx=new(window.AudioContext||window.webkitAudioContext)();
    if(sfxCtx.state==='suspended') sfxCtx.resume();
    return sfxCtx;
  }
  function playCry(dexId){
    if(!dexId)return;
    try{
      const a=new Audio(`https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${dexId}.ogg`);
      a.volume=0.45; a.play().catch(()=>{});
    }catch(e){}
  }
  function _tone(c,t,f0,f1,type,dur,vol){
    const o=c.createOscillator(),g=c.createGain();
    o.type=type; o.frequency.setValueAtTime(f0,t);
    if(f1) o.frequency.exponentialRampToValueAtTime(f1,t+dur);
    g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t+dur+0.02);
  }
  function _noise(c,t,dur,fType,fFreq,vol){
    const len=Math.floor(c.sampleRate*dur),buf=c.createBuffer(1,len,c.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
    const src=c.createBufferSource(); src.buffer=buf;
    const f=c.createBiquadFilter(); f.type=fType; f.frequency.value=fFreq;
    const g=c.createGain();
    g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    src.connect(f); f.connect(g); g.connect(c.destination); src.start(t); src.stop(t+dur+0.02);
  }
  function playMoveSound(type){
    try{
      const c=getSfx(),t=c.currentTime+0.02;
      switch(type){
        case 'electric': _tone(c,t,900,120,'sawtooth',0.25,0.3); _noise(c,t,0.15,'highpass',3000,0.15); break;
        case 'fire':     _noise(c,t,0.4,'bandpass',700,0.35); _tone(c,t,200,70,'sawtooth',0.28,0.12); break;
        case 'water':    _tone(c,t,700,280,'sine',0.45,0.28); _tone(c,t+0.05,500,200,'sine',0.3,0.25); break;
        case 'grass':    _noise(c,t,0.3,'bandpass',2200,0.22); _tone(c,t,320,420,'triangle',0.22,0.2); break;
        case 'psychic':  _tone(c,t,600,1400,'sine',0.4,0.3); _tone(c,t+0.1,1000,2000,'sine',0.18,0.35); break;
        case 'ice':      _tone(c,t,2200,900,'triangle',0.3,0.28); _tone(c,t+0.05,2600,1100,'sine',0.18,0.22); break;
        case 'ghost':    _tone(c,t,180,90,'sine',0.5,0.3); _noise(c,t,0.45,'lowpass',350,0.12); break;
        case 'poison':   _tone(c,t,380,180,'square',0.28,0.22); _noise(c,t+0.1,0.2,'bandpass',750,0.14); break;
        case 'rock':     _noise(c,t,0.2,'lowpass',450,0.55); _tone(c,t,130,50,'sawtooth',0.35,0.15); break;
        case 'ground':   _noise(c,t,0.38,'lowpass',200,0.6); _tone(c,t,70,35,'sine',0.4,0.3); break;
        case 'flying':   _noise(c,t,0.3,'highpass',1600,0.2); _tone(c,t,520,1100,'triangle',0.15,0.3); break;
        case 'bug':      _tone(c,t,580,580,'square',0.18,0.22); _noise(c,t,0.2,'bandpass',1100,0.17); break;
        case 'dark':     _noise(c,t,0.32,'lowpass',280,0.48); _tone(c,t,110,55,'sawtooth',0.3,0.25); break;
        case 'dragon':   _tone(c,t,140,70,'sawtooth',0.42,0.4); _noise(c,t+0.06,0.35,'bandpass',380,0.25); break;
        default:         _noise(c,t,0.15,'lowpass',900,0.4); _tone(c,t,280,180,'triangle',0.22,0.1); break;
      }
    }catch(e){}
  }

  /* ── BATTLE ENGINE ── */
  const wait=ms=>new Promise(r=>setTimeout(r,ms));

  function startBattle(sid,lvl){
    const em=mkMon(sid,lvl);
    // Hide d-pad during battle
    const dpadEl=document.getElementById('pk-dpad');
    if(dpadEl) dpadEl.classList.add('pk-dpad-hidden');
    // Encounter flash: alternate white/black 4 times then reveal battle
    const screen=canvas&&canvas.parentElement;
    const fl=document.createElement('div');
    fl.style.cssText='position:absolute;inset:0;z-index:48;pointer-events:none;border-radius:8px;';
    if(screen) screen.appendChild(fl);
    let f=0;
    const doFlash=()=>{
      fl.style.background=f%2===0?'rgba(255,255,255,0.92)':'rgba(0,0,0,0.05)';
      f++;
      if(f<8) setTimeout(doFlash,70);
      else{
        fl.remove();
        battle={pm:team[0],em,phase:'menu',participants:new Set([team[0]])};
        updateBUI(); enableBtns(true);
        document.getElementById('pk-battle').classList.remove('hidden');
        setLog(`A wild ${em.name} appeared!`,'');
        playCry(SP[em.speciesId]?.dexId);
      }
    };
    doFlash();
  }

  function closeBattle(){
    battle=null;
    document.getElementById('pk-battle').classList.add('hidden');
    document.getElementById('pk-blackout').classList.add('hidden');
    const dpadEl=document.getElementById('pk-dpad');
    if(dpadEl) dpadEl.classList.remove('pk-dpad-hidden');
    enableBtns(true); saveGame();
  }

  /* ── SWAP HELPERS ── */
  function showSwapPanel(forced){
    const panel=document.getElementById('pk-swap-panel');
    const list=document.getElementById('pk-swap-list');
    const title=document.getElementById('pk-swap-title');
    if(!panel||!list)return;
    title.textContent=forced?'Choose your next Pokémon:':'Choose a Pokémon to swap in:';
    list.innerHTML='';
    team.forEach((mon,idx)=>{
      if(mon===battle.pm)return; // skip current battler
      const card=document.createElement('div');
      card.className='pk-swap-card'+(mon.hp<=0?' fainted':'');
      const hpPct=Math.round(mon.hp/mon.maxHp*100);
      card.innerHTML=`<img src="${spriteUrl(mon.speciesId)}" alt="${mon.name}" onerror="this.style.display='none'">
        <div class="pk-swap-card-name">${mon.name} Lv.${mon.level}</div>
        <div class="pk-swap-card-hp">${mon.hp<=0?'Fainted':mon.hp+'/'+mon.maxHp+' HP ('+hpPct+'%)'}</div>`;
      if(mon.hp>0) card.onclick=()=>doSwap(idx,forced);
      list.appendChild(card);
    });
    if(forced){
      // no cancel option when forced
      panel.dataset.forced='1';
    } else {
      panel.dataset.forced='0';
      const cancel=document.createElement('button');
      cancel.textContent='Cancel'; cancel.className='pk-run-btn';
      cancel.style.marginTop='8px';
      cancel.onclick=()=>panel.classList.add('hidden');
      list.appendChild(cancel);
    }
    panel.classList.remove('hidden');
    enableBtns(false);
  }

  async function doSwap(teamIdx, forced){
    const panel=document.getElementById('pk-swap-panel');
    if(panel) panel.classList.add('hidden');
    const incoming=team[teamIdx];
    battle.pm=incoming;
    if(battle.participants) battle.participants.add(incoming);
    setLog(`Go, ${incoming.name}!`,'');
    playCry(SP[incoming.speciesId]?.dexId);
    updateBUI();
    if(!forced){
      // Voluntary swap: enemy gets a free attack
      await wait(800);
      const {em:e}=battle;
      const emv=e.moves[Math.floor(Math.random()*e.moves.length)];
      await execMove(e,incoming,emv);
      if(incoming.hp<=0){
        const alive=team.filter(m=>m.hp>0);
        if(alive.length) showSwapPanel(true);
        else endBattle();
      } else { enableBtns(true); }
    } else {
      enableBtns(true);
    }
  }

  function applyLevelUp(mon){
    const ns=calcStats(mon.speciesId,mon.level);
    const ohp=mon.maxHp; mon.maxHp=ns.maxHp;
    mon.hp=Math.min(mon.maxHp,mon.hp+(mon.maxHp-ohp));
    mon.atk=ns.atk; mon.def=ns.def; mon.spd=ns.spd;
    mon.xpToNext=xpForLevel(mon.level+1);
  }
  function tryEvolve(mon){
    const spec=SP[mon.speciesId];
    if(!spec||!spec.evolvesAt||mon.level<spec.evolvesAt||!spec.evolvesInto||!SP[spec.evolvesInto])return false;
    const oldName=mon.name;
    mon.speciesId=spec.evolvesInto;
    const ns2=SP[mon.speciesId];
    mon.name=ns2.name; mon.types=ns2.types;
    applyLevelUp(mon);
    return oldName;
  }
  function endBattle(){
    if(!battle)return;
    const {pm:p,em:e}=battle;
    if(e.hp<=0){
      // ── Trainer battle: send out next Pokémon or award badge ──
      if(battle.type==='trainer'){
        if(battle.leaderQueue?.length>0){
          const next=battle.leaderQueue.shift();
          const gl=GYM_LEADERS[battle.leaderId];
          battle.em=mkMon(next.sid,next.lvl);
          setLog(`${gl?.name||'Leader'} sent out ${battle.em.name}!`,'');
          updateBUI();
          // Don't enable buttons if player's pokémon also fainted (mutual KO)
          if(p.hp<=0){
            const alive=team.filter(m=>m.hp>0);
            if(alive.length) setTimeout(()=>showSwapPanel(true),600);
            else { setLog('You have no more Pokémon!','You blacked out! 💀'); enableBtns(false); setTimeout(()=>{ const bl=document.getElementById('pk-blackout'); if(bl) bl.classList.remove('hidden'); setTimeout(()=>window.pokemonModule.dismissBlackout(),3000); },1400); }
          } else { enableBtns(true); }
          return;
        }
        const gl=GYM_LEADERS[battle.leaderId];
        defeatedLeaders.push(battle.leaderId);
        if(gl?.badge&&!badges.includes(gl.badge)) badges.push(gl.badge);
        const prize=gl?.coins||300; coins+=prize; updateCoinsDisplay();
        setLog(`You defeated ${gl?.name||'the Leader'}!`,`🏅 ${gl?.badge||'Badge'}! +${prize}💰`);
        saveGame(); setTimeout(closeBattle,2500); return;
      }
      let xg=Math.floor(e.level*SP[e.speciesId].xpY/7);
      if(expBoostActive){ xg*=2; expBoostActive=false; showToast('EXP Charm activated! 2× XP!','#ffe066',1800); }
      // Share XP equally among all battle participants (active + anyone who swapped in)
      const participants=battle.participants?[...battle.participants].filter(m=>m.hp>0||m===p):[p];
      const share=Math.max(1,Math.floor(xg/participants.length));
      participants.forEach(m=>{
        m.xp+=share;
        while(m.xp>=m.xpToNext){ m.level++; applyLevelUp(m); const evo=tryEvolve(m); if(evo) showToast(`${m.name} evolved!`,'#ffd700',2500); }
      });
      // Award coins for winning the battle
      const battleCoins=5+e.level*2+Math.floor((SP[e.speciesId]?.xpY||50)*0.3);
      coins+=battleCoins; updateCoinsDisplay();
      setLog(`${e.name} fainted!`,`+${xg} XP (${participants.length} shared)  +${battleCoins}💰`);
      const doLvl=()=>{
        if(p.xp>=p.xpToNext){
          const lvlCoins=p.level*2;
          p.level++; applyLevelUp(p);
          coins+=lvlCoins; updateCoinsDisplay();
          const evo=tryEvolve(p);
          updateBUI();
          if(evo){ setLog(`${evo} evolved into ${p.name}!`,'✨ New form!'); setTimeout(doLvl,1600); }
          else { setLog(`${p.name} grew to Lv.${p.level}!`,`+${lvlCoins}💰`); setTimeout(doLvl,1400); }
        } else { updateBUI(); setTimeout(closeBattle,1200); }
      };
      setTimeout(doLvl,1200);
    } else if(p.hp<=0){
      setLog(`${p.name} fainted!`,'');
      const alive=team.filter(m=>m!==p&&m.hp>0);
      if(alive.length){
        setTimeout(()=>{ setLog(`${p.name} fainted!`,'Send out another?'); showSwapPanel(true); },1200);
      } else {
        setLog('You have no more Pokémon!','You blacked out! 💀');
        enableBtns(false);
        // Show blackout overlay and auto-dismiss after 3s as fallback
        setTimeout(()=>{
          const bl=document.getElementById('pk-blackout');
          if(bl) bl.classList.remove('hidden');
          setTimeout(()=>window.pokemonModule.dismissBlackout(),3000);
        },1400);
      }
    } else { enableBtns(true); }
  }

  async function execMove(att,def,mvObj){
    const md=MV[mvObj.id]; if(!md)return;
    // defIsEnemy = true when the defender is the enemy Pokémon (player is attacking)
    const defIsEnemy = battle && def===battle.em;
    if(Math.random()*100>md.acc*stageMul(att.accStg)){
      setLog(`${att.name} used ${md.name}!`,'But it missed!'); await wait(1100); return;
    }
    if(md.power>0){
      const dmg=damage(att,def,mvObj.id);
      def.hp=Math.max(0,def.hp-dmg);
      if(md.drain) att.hp=Math.min(att.maxHp,att.hp+Math.floor(dmg/2));
      const eff=typeEff(md.type,def.types);
      const et=eff>1?' Super effective!':eff<1&&eff>0?" Not very effective…":eff===0?" No effect!":'';
      setLog(`${att.name} used ${md.name}!`,`${def.name} took ${dmg} dmg!${et}`);
      flashMove(defIsEnemy, md.type);
      playMoveSound(md.type);
    } else {
      let et='';
      if(md.eff==='atkDown'){def.atkStg=Math.max(-6,def.atkStg-1);et=`${def.name}'s Attack fell!`;}
      if(md.eff==='defDown'){def.defStg=Math.max(-6,def.defStg-1);et=`${def.name}'s Defense fell!`;}
      if(md.eff==='spdDown'){def.spdStg=Math.max(-6,def.spdStg-1);et=`${def.name}'s Speed fell!`;}
      if(md.eff==='accDown'){def.accStg=Math.max(-6,def.accStg-1);et=`${def.name}'s accuracy fell!`;}
      setLog(`${att.name} used ${md.name}!`,et||'But nothing happened…');
      flashMove(!defIsEnemy, md.type);
      playMoveSound(md.type);
    }
    updateBUI(); await wait(1100);
  }

  async function doTurn(idx){
    if(!battle||battleLocked)return;
    const {pm:p,em:e}=battle;
    const pmv=p.moves[idx]; if(!pmv||pmv.pp<=0)return;
    pmv.pp--; enableBtns(false);
    const emv=e.moves[Math.floor(Math.random()*e.moves.length)];
    const pFirst=p.spd*stageMul(p.spdStg)>=e.spd*stageMul(e.spdStg);
    await execMove(pFirst?p:e, pFirst?e:p, pFirst?pmv:emv);
    if(e.hp<=0||p.hp<=0){endBattle();return;}
    await execMove(pFirst?e:p, pFirst?p:e, pFirst?emv:pmv);
    endBattle();
  }

  /* ── ENCOUNTER ── */
  function checkEncounter(tx,ty){
    // Trigger grass sway whenever player is on or adjacent to tall grass
    const nearGrass=[[0,0],[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>{const t=getTile(tx+dx,ty+dy);return t===T.TALL||t===T.GRASS;});
    if(nearGrass) touchGrass(tx,ty,player.moving?3.5:1.2);
    const tile=getTile(tx,ty), key=`${tx},${ty}`;
    if(key===lastTileKey||battle){lastTileKey=key;return;}
    lastTileKey=key;
    const isInterior=MAPS_DATA[currentMapId]?.isInterior;
    // Outdoor: 10% in tall grass only; Interior: 5% on floor tiles
    if(isInterior){
      if(tile!==T.FLOOR)return;
      if(Math.random()>0.05)return;
    } else {
      if(tile!==T.TALL)return;
      if(Math.random()>0.10)return;
    }
    const zone=getZone(tx,ty);
    const pool=ZONES[zone]||ZONES.route1;
    const sid=pool[Math.floor(Math.random()*pool.length)];
    const avgLvl=team.length?Math.floor(team.reduce((s,m)=>s+m.level,0)/team.length):5;
    const wlvl=Math.max(2,avgLvl+Math.floor(Math.random()*3)-1);
    startBattle(sid,wlvl);
  }

  /* ── GAME LOOP ── */
  function gameLoop(ts){
    if(!canvas)return;
    animFrame=requestAnimationFrame(gameLoop);
    if(battle||gymDialogOpen)return;
    const up=keys.ArrowUp||keys.w||dpad.up, dn=keys.ArrowDown||keys.s||dpad.down;
    const lt=keys.ArrowLeft||keys.a||dpad.left, rt=keys.ArrowRight||keys.d||dpad.right;
    if(up||dn||lt||rt){
      const nx=player.x+(rt?2:lt?-2:0), ny=player.y+(dn?2:up?-2:0);
      const mg=3, ok=(cx,cy)=>!isSolid(Math.floor((cx+mg)/TSIZE),Math.floor((cy+10)/TSIZE))
        &&!isSolid(Math.floor((cx+CHAR_S-mg)/TSIZE),Math.floor((cy+10)/TSIZE))
        &&!isSolid(Math.floor((cx+mg)/TSIZE),Math.floor((cy+CHAR_S-1)/TSIZE))
        &&!isSolid(Math.floor((cx+CHAR_S-mg)/TSIZE),Math.floor((cy+CHAR_S-1)/TSIZE));
      if(ok(nx,ny)){ player.x=Math.max(0,Math.min(nx,MAP_W*TSIZE-CHAR_S)); player.y=Math.max(0,Math.min(ny,MAP_H*TSIZE-CHAR_S)); }
      else if((lt||rt)&&ok(nx,player.y)) player.x=Math.max(0,Math.min(nx,MAP_W*TSIZE-CHAR_S));
      else if((up||dn)&&ok(player.x,ny)) player.y=Math.max(0,Math.min(ny,MAP_H*TSIZE-CHAR_S));
      player.moving=true; player.frame=Math.floor(ts/160)%4;
      if(Date.now()-moveThrottle>150){
        moveThrottle=Date.now();
        const ptx=Math.floor((player.x+CHAR_S/2)/TSIZE), pty=Math.floor((player.y+CHAR_S/2)/TSIZE);
        checkEncounter(ptx,pty);
        checkItemPickup(ptx,pty);
        checkPokeCenter(ptx,pty);
        checkWarp(ptx,pty);
        checkGymLeader(ptx,pty);
      }
    } else { player.moving=false; }
    drawOverworld();
  }

  /* ── SHOP ── */
  const SHOP_POOL = [
    {id:'potion',       name:'Potion',        desc:'Heal lead Pokémon 30 HP',            price:20,  icon:'💊'},
    {id:'superPotion',  name:'Super Potion',  desc:'Heal lead Pokémon 80 HP',            price:50,  icon:'💉'},
    {id:'fullRestore',  name:'Full Restore',  desc:'Fully restore all party HP',         price:180, icon:'✨'},
    {id:'pokeball3',    name:'Poké Ball ×3',  desc:'Add 3 Poké Balls to your bag',      price:45,  icon:'⚾'},
    {id:'pokeball5',    name:'Poké Ball ×5',  desc:'Add 5 Poké Balls to your bag',      price:70,  icon:'⚾'},
    {id:'revive',       name:'Revive',        desc:'Revive one fainted Pokémon (50% HP)',price:80,  icon:'💫'},
    {id:'fullRevive',   name:'Full Revive',   desc:'Revive one fainted Pokémon (full HP)',price:200,icon:'⭐'},
    {id:'ppRestore',    name:'PP Restore',    desc:'Fully restore all move PP now',      price:120, icon:'🔋'},
    {id:'rareCandy',    name:'Rare Candy',    desc:'Instantly level up one Pokémon',     price:280, icon:'🍬'},
    {id:'expCharm',     name:'EXP Charm',     desc:'Next battle earns 2× XP',           price:150, icon:'⚡'},
    {id:'thunderStone', name:'Thunder Stone', desc:'Evolve Pikachu or Eevee (Jolteon)',  price:480, icon:'🌩️'},
    {id:'fireStone',    name:'Fire Stone',    desc:'Evolve Vulpix, Growlithe or Eevee',  price:480, icon:'🔥'},
    {id:'waterStone',   name:'Water Stone',   desc:'Evolve Eevee into Vaporeon',         price:480, icon:'💧'},
    {id:'moonStone',    name:'Moon Stone',    desc:'Evolve Clefairy or Jigglypuff',      price:480, icon:'🌙'},
    {id:'leafStone',    name:'Leaf Stone',    desc:'Evolve Oddish or Gloom to Vileplume',price:480, icon:'🍃'},
  ];

  const STONE_IDS = ['thunderStone','fireStone','waterStone','moonStone','leafStone'];

  function getShopItems(){
    // Use manual refresh seed if set, else time-window seed (4h slots anchored to midnight)
    const seed=shopCustomSeed!==null?shopCustomSeed:Math.floor(msFromMidnight()/(4*60*60*1000));
    const pool=[...SHOP_POOL];
    const picked=[];
    let s=seed+1;
    while(picked.length<5&&pool.length){
      s=Math.abs((s*1664525+1013904223)&0x7fffffff);
      const idx=s%pool.length;
      picked.push(pool.splice(idx,1)[0]);
    }
    return picked;
  }

  function msFromMidnight(){
    const now=new Date();
    const midnight=new Date(now.getFullYear(),now.getMonth(),now.getDate(),0,0,0,0);
    return Date.now()-midnight.getTime();
  }

  function msUntilRestock(){
    const w=4*60*60*1000;
    return w-(msFromMidnight()%w);
  }

  function updateRefreshBtn(){
    const btn=document.getElementById('pk-shop-refresh-btn');
    const info=document.getElementById('pk-shop-refresh-info');
    if(!btn||!info)return;
    if(shopFreeRefreshes>0){
      btn.disabled=false;
      info.textContent=`${shopFreeRefreshes} free · ${shopPaidRefreshes} paid (100💰)`;
    } else if(shopPaidRefreshes>0){
      btn.disabled=coins<100;
      info.textContent=`${shopPaidRefreshes} paid left · 100💰 each`;
    } else {
      btn.disabled=true;
      info.textContent='No refreshes left';
    }
  }

  function fmtMs(ms){
    const h=Math.floor(ms/3600000), m=Math.floor((ms%3600000)/60000), s=Math.floor((ms%60000)/1000);
    return `${h}h ${m}m ${s}s`;
  }

  let _shopTimerInt=null;
  function renderShopTimer(){
    const el=document.getElementById('pk-shop-timer');
    if(el) el.textContent='Stock refreshes in: '+fmtMs(msUntilRestock());
  }

  // Pokemon for sale by tier
  const SHOP_POKEMON = [
    // common
    {sid:'rattata',   tier:'common',   price:500},
    {sid:'pidgey',    tier:'common',   price:500},
    {sid:'caterpie',  tier:'common',   price:500},
    {sid:'weedle',    tier:'common',   price:500},
    {sid:'oddish',    tier:'common',   price:500},
    {sid:'psyduck',   tier:'common',   price:500},
    {sid:'geodude',   tier:'common',   price:500},
    {sid:'zubat',     tier:'common',   price:500},
    // rare
    {sid:'eevee',     tier:'rare',     price:2000},
    {sid:'dratini',   tier:'rare',     price:2000},
    {sid:'gastly',    tier:'rare',     price:2000},
    {sid:'electabuzz',tier:'rare',     price:2000},
    {sid:'magmar',    tier:'rare',     price:2000},
    {sid:'scyther',   tier:'rare',     price:2000},
    {sid:'jynx',      tier:'rare',     price:2000},
    // epic
    {sid:'gyarados',  tier:'epic',     price:6000},
    {sid:'raichu',    tier:'epic',     price:6000},
    {sid:'venusaur',  tier:'epic',     price:6000},
    {sid:'blastoise', tier:'epic',     price:6000},
    {sid:'arcanine',  tier:'epic',     price:6000},
    // legendary
    {sid:'jolteon',   tier:'legendary',price:15000},
    {sid:'flareon',   tier:'legendary',price:15000},
    {sid:'vaporeon',  tier:'legendary',price:15000},
    {sid:'chansey',   tier:'legendary',price:15000},
    {sid:'kangaskhan',tier:'legendary',price:15000},
  ];
  const TIER_COLOR={common:'#aaaaaa',rare:'#4fc3f7',epic:'#ce93d8',legendary:'#ffd700'};

  function refreshShop(){
    if(shopFreeRefreshes>0){
      shopFreeRefreshes--;
    } else if(shopPaidRefreshes>0&&coins>=100){
      shopPaidRefreshes--; coins-=100; updateCoinsDisplay();
    } else {
      showToast('No refreshes available!','#ff6b6b',2000); return;
    }
    // New random seed so inventory changes
    shopCustomSeed=Math.floor(Math.random()*0x7fffff)+1;
    renderShopItems(document.getElementById('pk-shop-tab-sell')?.classList.contains('active')?'sell':
                    document.getElementById('pk-shop-tab-pokemon')?.classList.contains('active')?'pokemon':'buy');
    showToast('🔄 Shop stock refreshed!','#00d4ff',1800);
  }

  function applyStoneEvo(stoneName){
    const eligible=team.filter(m=>SP[m.speciesId]?.stoneEvolves?.[stoneName]);
    if(!eligible.length){ showToast('No Pokémon can use this stone!','#ff6b6b',2000); return false; }
    // Show picker
    const list=document.getElementById('pk-shop-picker-list');
    const picker=document.getElementById('pk-shop-picker');
    if(!picker||!list)return false;
    list.innerHTML='';
    eligible.forEach(mon=>{
      const targetId=SP[mon.speciesId].stoneEvolves[stoneName];
      const targetName=SP[targetId]?.name||targetId;
      const btn=document.createElement('button');
      btn.className='pk-shop-pick-btn';
      btn.innerHTML=`<img src="${spriteUrl(mon.speciesId)}" style="width:36px;height:36px;object-fit:contain" onerror="this.style.display='none'"> ${mon.name} Lv.${mon.level} → <strong>${targetName}</strong>`;
      btn.onclick=()=>{
        const item=SHOP_POOL.find(i=>i.id===stoneName);
        if(coins<item.price){ showToast('Not enough coins!','#ff6b6b',1800); picker.classList.add('hidden'); return; }
        coins-=item.price; updateCoinsDisplay();
        const oldName=mon.name;
        mon.speciesId=targetId;
        const sp=SP[targetId];
        mon.name=sp.name;
        mon.types=sp.types;
        mon.maxHp=Math.floor(sp.hp*mon.level/50+10);
        mon.hp=Math.min(mon.hp,mon.maxHp);
        mon.atk=Math.floor(sp.atk*mon.level/50+5);
        mon.def=Math.floor(sp.def*mon.level/50+5);
        mon.spd=Math.floor(sp.spd*mon.level/50+5);
        picker.classList.add('hidden');
        saveGame();
        showToast(`${oldName} evolved into ${mon.name}! ✨`,'#ffd700',2500);
        playCry(sp.dexId);
        renderShopItems(document.getElementById('pk-shop-tab-sell')?.classList.contains('active')?'sell':'buy');
      };
      list.appendChild(btn);
    });
    picker.classList.remove('hidden');
    return true;
  }

  function showTargetPicker(title, targets, onPick){
    const list=document.getElementById('pk-shop-picker-list');
    const picker=document.getElementById('pk-shop-picker');
    const ptitle=document.getElementById('pk-shop-picker-title');
    if(!picker||!list)return;
    if(ptitle) ptitle.textContent=title;
    list.innerHTML='';
    targets.forEach(({mon,label})=>{
      const btn=document.createElement('button');
      btn.className='pk-shop-pick-btn';
      btn.innerHTML=`<img src="${spriteUrl(mon.speciesId)}" style="width:36px;height:36px;object-fit:contain" onerror="this.style.display='none'"> ${label}`;
      btn.onclick=()=>{ picker.classList.add('hidden'); onPick(mon); };
      list.appendChild(btn);
    });
    picker.classList.remove('hidden');
  }

  function buyItem(id){
    const item=SHOP_POOL.find(i=>i.id===id); if(!item)return;
    if(coins<item.price){ showToast('Not enough coins! 💰','#ff6b6b',1800); return; }

    if(id==='potion'){
      const lead=team.find(m=>m.hp>0&&m.hp<m.maxHp);
      if(!lead){ showToast('No Pokémon needs healing!','#ffbb00',1800); return; }
      lead.hp=Math.min(lead.maxHp,lead.hp+30);
    } else if(id==='superPotion'){
      const lead=team.find(m=>m.hp>0&&m.hp<m.maxHp);
      if(!lead){ showToast('No Pokémon needs healing!','#ffbb00',1800); return; }
      lead.hp=Math.min(lead.maxHp,lead.hp+80);
    } else if(id==='fullRestore'){
      team.forEach(m=>{ if(m.hp>0) m.hp=m.maxHp; });
      if(battle) updateBUI();
    } else if(id==='pokeball3'){
      pokeballs+=3; updateBallBtn();
    } else if(id==='pokeball5'){
      pokeballs+=5; updateBallBtn();
    } else if(id==='revive'){
      const fainted=team.filter(m=>m.hp<=0);
      if(!fainted.length){ showToast('No fainted Pokémon!','#ffbb00',1800); return; }
      showTargetPicker('Choose Pokémon to revive:', fainted.map(m=>({mon:m,label:`${m.name} Lv.${m.level}`})), mon=>{
        coins-=item.price; updateCoinsDisplay();
        mon.hp=Math.max(1,Math.floor(mon.maxHp/2));
        saveGame(); showToast(`${mon.name} revived!`,'#00ff88',1800);
        renderShopItems('buy');
      }); return;
    } else if(id==='fullRevive'){
      const fainted=team.filter(m=>m.hp<=0);
      if(!fainted.length){ showToast('No fainted Pokémon!','#ffbb00',1800); return; }
      showTargetPicker('Choose Pokémon to fully revive:', fainted.map(m=>({mon:m,label:`${m.name} Lv.${m.level}`})), mon=>{
        coins-=item.price; updateCoinsDisplay();
        mon.hp=mon.maxHp;
        saveGame(); showToast(`${mon.name} fully revived!`,'#00ff88',1800);
        renderShopItems('buy');
      }); return;
    } else if(id==='ppRestore'){
      team.forEach(m=>m.moves.forEach(mv=>mv.pp=mv.maxPp));
      if(battle) updateBUI();
    } else if(id==='rareCandy'){
      if(!team.length){ showToast('No Pokémon in party!','#ff6b6b',1800); return; }
      showTargetPicker('Choose Pokémon to level up:', team.map(m=>({mon:m,label:`${m.name} Lv.${m.level}`})), mon=>{
        coins-=item.price; updateCoinsDisplay();
        mon.level++; applyLevelUp(mon);
        const evo=tryEvolve(mon);
        if(evo) showToast(`${evo} evolved into ${mon.name}! ✨`,'#ffd700',2500);
        else showToast(`${mon.name} grew to Lv.${mon.level}! 🎉`,'#00ff88',1800);
        if(battle) updateBUI();
        saveGame(); renderShopItems('buy');
      }); return;
    } else if(id==='expCharm'){
      expBoostActive=true;
    } else if(STONE_IDS.includes(id)){
      if(applyStoneEvo(id)){
        // coins deducted inside applyStoneEvo after target chosen
        return;
      } else { return; }
    }

    coins-=item.price; updateCoinsDisplay();
    saveGame();
    showToast(`${item.icon} ${item.name} used!`,'#00ff88',1800);
    renderShopItems('buy');
  }

  function getSellPrice(mon){
    return Math.max(10, Math.floor(mon.level*(SP[mon.speciesId]?.xpY||50)*0.4));
  }

  function renderShopItems(tab){
    const buyTab=document.getElementById('pk-shop-tab-buy');
    const sellTab=document.getElementById('pk-shop-tab-sell');
    const pokTab=document.getElementById('pk-shop-tab-pokemon');
    if(buyTab) buyTab.classList.toggle('active',tab==='buy');
    if(sellTab) sellTab.classList.toggle('active',tab==='sell');
    if(pokTab) pokTab.classList.toggle('active',tab==='pokemon');
    // Update coins in shop header
    const cd=document.getElementById('pk-shop-coins-display');
    if(cd) cd.textContent='💰 '+coins.toLocaleString();
    updateRefreshBtn();
    const container=document.getElementById('pk-shop-items');
    if(!container)return;

    if(tab==='pokemon'){
      container.innerHTML='';
      const note=document.createElement('div');
      note.style.cssText='font-family:"Exo 2",sans-serif;font-size:0.75rem;color:#888;padding:4px 4px 8px;text-align:center';
      note.textContent='Purchased Pokémon join your party at Lv.5 — grind hard!';
      container.appendChild(note);
      SHOP_POKEMON.forEach(entry=>{
        const sp=SP[entry.sid]; if(!sp)return;
        const canAfford=coins>=entry.price;
        const card=document.createElement('div');
        card.className='pk-shop-item'+(canAfford?'':' pk-shop-item-poor');
        card.innerHTML=`<img src="${spriteUrl(entry.sid)}" style="width:44px;height:44px;image-rendering:pixelated;object-fit:contain" onerror="this.style.display='none'">
          <div class="pk-shop-item-info">
            <div class="pk-shop-item-name">${sp.name} <span style="font-size:0.7rem;font-weight:700;color:${TIER_COLOR[entry.tier]||'#aaa'}">[${entry.tier}]</span></div>
            <div class="pk-shop-item-desc">${(sp.types||[]).join(' / ')} type · Lv.5</div>
          </div>
          <div class="pk-shop-item-right">
            <div class="pk-shop-item-price">${entry.price.toLocaleString()}💰</div>
            <button class="pk-shop-buy-btn" ${canAfford&&team.length<6?'':'disabled'} onclick="window.pokemonModule._buyPokemon('${entry.sid}',${entry.price})">${team.length>=6?'Full':'Buy'}</button>
          </div>`;
        container.appendChild(card);
      });
      return;
    }
    if(tab==='sell'){
      if(!team.length){ container.innerHTML='<div class="pk-lb-empty">No Pokémon to sell.</div>'; return; }
      container.innerHTML='<div class="pk-shop-sell-note">Selling permanently removes the Pokémon from your party.</div>';
      team.forEach((mon,idx)=>{
        const price=getSellPrice(mon);
        const card=document.createElement('div');
        card.className='pk-shop-sell-card';
        const canSell=team.length>1;
        card.innerHTML=`<img src="${spriteUrl(mon.speciesId)}" style="width:44px;height:44px;object-fit:contain" onerror="this.style.display='none'">
          <div class="pk-shop-sell-info">
            <span class="pk-shop-sell-name">${mon.name} Lv.${mon.level}</span>
            <span class="pk-shop-sell-price">Sell: ${price}💰</span>
          </div>
          <button class="pk-shop-sell-btn" ${canSell?'':'disabled title="Cannot sell last Pokémon"'} onclick="window.pokemonModule._sellPokemon(${idx})">Sell</button>`;
        container.appendChild(card);
      });
    } else {
      const items=getShopItems();
      container.innerHTML='';
      items.forEach(item=>{
        const canAfford=coins>=item.price;
        const card=document.createElement('div');
        card.className='pk-shop-item'+(canAfford?'':' pk-shop-item-poor');
        card.innerHTML=`<span class="pk-shop-item-icon">${item.icon}</span>
          <div class="pk-shop-item-info">
            <div class="pk-shop-item-name">${item.name}</div>
            <div class="pk-shop-item-desc">${item.desc}</div>
          </div>
          <div class="pk-shop-item-right">
            <div class="pk-shop-item-price">${item.price}💰</div>
            <button class="pk-shop-buy-btn" ${canAfford?'':'disabled'} onclick="window.pokemonModule._buyItem('${item.id}')">Buy</button>
          </div>`;
        container.appendChild(card);
      });
    }
  }

  /* ── PP REGENERATION — +1 PP to every move on every Pokémon every 150 s ── */
  setInterval(()=>{
    if(!team.length)return;
    let anyRestored=false;
    team.forEach(mon=>{
      mon.moves.forEach(mv=>{
        if(mv.pp<mv.maxPp){ mv.pp++; anyRestored=true; }
      });
    });
    if(anyRestored){
      showToast('+1 PP restored to all moves!','#00ff88',2200);
      if(battle) updateBUI(); // refresh button states if mid-battle
      saveGame(); // keeps savedAt fresh for offline tick calc
    }
  }, 150000);

  /* ── SAVE / LOAD ── */
  function saveGame(){
    if(!player||!team.length)return;
    // Always save the exterior mapId so reload never strands player in an interior
    const isInt=MAPS_DATA[currentMapId]?.isInterior;
    const saveMapId=isInt?(_interiorReturn?.mapId||'starterTown'):currentMapId;
    const saveSp=MAPS_DATA[saveMapId]?.spawns?.default;
    const savePX=isInt?(saveSp?.x??24):Math.floor(player.x/TSIZE);
    const savePY=isInt?(saveSp?.y??35):Math.floor(player.y/TSIZE);
    localStorage.setItem('pkSave',JSON.stringify({
      team:team.map(p=>({speciesId:p.speciesId,level:p.level,hp:p.hp,maxHp:p.maxHp,xp:p.xp,xpToNext:p.xpToNext,moves:p.moves})),
      px:savePX, py:savePY, mapId:saveMapId,
      pokeballs, coins, totalCaught, expBoostActive,
      defeatedLeaders, badges,
      savedAt: Date.now()
    }));
    syncPkStats();
  }

  function restoreFromSaveObject(sv){
    if(!sv||!sv.team||!sv.team.length)return false;
    team=sv.team.map(t=>{ const m=mkMon(t.speciesId,t.level,t.xp); m.hp=t.hp; m.maxHp=t.maxHp; m.moves=t.moves||m.moves; return m; });
    pokeballs=sv.pokeballs??5;
    coins=sv.coins??0;
    totalCaught=sv.totalCaught??team.length;
    expBoostActive=sv.expBoostActive??false;
    defeatedLeaders=sv.defeatedLeaders||[];
    badges=sv.badges||[];

    // Load zone first (backward compat: old saves without mapId land in starterTown)
    loadZone(sv.mapId||'starterTown');
    const defSpawn=MAPS_DATA[currentMapId].spawns.default;
    const spx=sv.px||defSpawn.x, spy=sv.py||defSpawn.y;
    player={x:spx*TSIZE, y:spy*TSIZE, dir:'down',moving:false,frame:0};
    if(isSolid(spx,spy)){ player.x=defSpawn.x*TSIZE; player.y=defSpawn.y*TSIZE; }

    // ── Offline PP regen ──
    // Cap at 40 ticks (~100 minutes) so ultra-long offline sessions still top off PP
    if(sv.savedAt){
      const ticksMissed=Math.min(40, Math.floor((Date.now()-sv.savedAt)/150000));
      if(ticksMissed>0){
        let anyRestored=false;
        team.forEach(mon=>{ mon.moves.forEach(mv=>{ const was=mv.pp; mv.pp=Math.min(mv.maxPp,mv.pp+ticksMissed); if(mv.pp>was)anyRestored=true; }); });
        if(anyRestored) setTimeout(()=>showToast(`⏰ +${ticksMissed} PP restored while you were away!`,'#00ff88',3000),1500);
      }
    }

    return true;
  }

  /* ── LEADERBOARD SYNC — returns null on success, error string on failure ── */
  async function syncPkStats(){
    if(!currentUser||!team.length) return null;
    try{
      const totalLevels=team.reduce((s,m)=>s+m.level,0);
      const {error}=await sb.from('pokemon_saves').upsert({
        username:currentUser.username,
        pokemon_count:team.length,
        total_levels:totalLevels,
        updated_at:new Date().toISOString()
      },{onConflict:'username'});
      return error ? error.message : null;
    }catch(e){ return e.message; }
  }

  /* ── FULL SAVE SYNC — stores pkSave object to pk_save jsonb ── */
  async function syncPkSave(sv){
    if(!currentUser||!sv||!sv.team||!sv.team.length) return 'No save data';
    try{
      const pokemonCount=sv.team.length;
      const totalLevels=sv.team.reduce((s,m)=>s+(m.level||0),0);
      const {error}=await sb.from('pokemon_saves').upsert({
        username:currentUser.username,
        pokemon_count:pokemonCount,
        total_levels:totalLevels,
        pk_save:sv,
        updated_at:new Date().toISOString()
      },{onConflict:'username'});
      return error ? error.message : null;
    }catch(e){ return e.message; }
  }

  function loadGame(){
    try{
      const raw=localStorage.getItem('pkSave'); if(!raw)return false;
      const sv=JSON.parse(raw);
      return restoreFromSaveObject(sv);
    }catch(e){return false;}
  }

  async function loadRemoteGame(){
    if(!currentUser) return false;
    try{
      const {data,error}=await sb.from('pokemon_saves')
        .select('pk_save')
        .eq('username', currentUser.username)
        .maybeSingle();
      if(error||!data) return false;
      return restoreFromSaveObject(data.pk_save);
    }catch(e){
      return false;
    }
  }

  /* ── D-PAD ── */
  function setupDpad(){
    const map={'pk-dpad-up':'up','pk-dpad-down':'down','pk-dpad-left':'left','pk-dpad-right':'right'};
    Object.entries(map).forEach(([id,dir])=>{
      const btn=document.getElementById(id); if(!btn)return;
      const on=()=>{dpad[dir]=true;btn.classList.add('pressed');};
      const off=()=>{dpad[dir]=false;btn.classList.remove('pressed');};
      btn.addEventListener('mousedown',on); btn.addEventListener('mouseup',off); btn.addEventListener('mouseleave',off);
      btn.addEventListener('touchstart',e=>{e.preventDefault();on();},{passive:false});
      btn.addEventListener('touchend',e=>{e.preventDefault();off();},{passive:false});
      btn.addEventListener('touchcancel',e=>{e.preventDefault();off();},{passive:false});
    });
  }

  /* ── STARTER MODAL ── */
  function showStarterModal(){
    const modal=document.getElementById('pk-starter-modal'), grid=document.getElementById('pk-starter-grid');
    if(!modal||!grid)return; grid.innerHTML='';
    Object.entries(SP).filter(([,s])=>s.starter).forEach(([id,s])=>{
      const c=document.createElement('div'); c.className='pk-starter-card';
      c.innerHTML=`<span class="pk-starter-emoji">${s.emoji}</span><div class="pk-starter-name">${s.name}</div><div class="pk-starter-type">${s.types.join(' / ')}</div>`;
      c.onclick=()=>{ team=[mkMon(id,5)]; loadZone('starterTown'); const _sp=MAPS_DATA.starterTown.spawns.default; player={x:_sp.x*TSIZE,y:_sp.y*TSIZE,dir:'down',moving:false,frame:0}; modal.classList.add('hidden'); saveGame(); };
      grid.appendChild(c);
    });
    modal.classList.remove('hidden');
  }

  /* ── PUBLIC API ── */
  return {
    init(){
      canvas=document.getElementById('pk-canvas'); if(!canvas)return;
      ctx=canvas.getContext('2d');
      const resize=()=>{
        const isLm=document.body.classList.contains('pk-lm');
        let sc;
        if(isLm){
          sc=Math.min(1,window.innerWidth/800,window.innerHeight/560);
        } else {
          const pkWrapper=canvas.parentElement?.parentElement?.parentElement;
          const dpad=document.getElementById('pk-dpad');
          const dpadHidden=dpad&&dpad.classList.contains('pk-dpad-hidden');
          const dpadH=dpadHidden?0:(dpad&&dpad.offsetHeight>0?dpad.offsetHeight:138)+8;
          const maxW=pkWrapper?pkWrapper.clientWidth:800;
          const maxH=pkWrapper?Math.max(100,pkWrapper.clientHeight-dpadH):560;
          sc=Math.min(1,maxW/800,maxH/560);
        }
        const cw=Math.round(800*sc), ch=Math.round(560*sc);
        canvas.style.width=cw+'px'; canvas.style.height=ch+'px';
        const screen=canvas.parentElement;
        if(screen){screen.style.width=cw+'px';screen.style.height=ch+'px';}
        const btl=document.getElementById('pk-battle');
        if(btl) btl.style.transform=`translate(-50%,-50%) scale(${sc})`;
      };
      resize(); window.addEventListener('resize',resize); canvas._pkResize=resize;
      if(!worldMap) loadZone('starterTown');
      const finishInit = ()=>{
        updateCoinsDisplay();
        _kdown=e=>{ if(['INPUT','TEXTAREA'].includes(e.target.tagName))return; if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(e.key)){keys[e.key]=true;if(e.key.startsWith('Arrow'))e.preventDefault();} };
        _kup=e=>{ keys[e.key]=false; };
        document.addEventListener('keydown',_kdown); document.addEventListener('keyup',_kup);
        setupDpad();
        if(animFrame)cancelAnimationFrame(animFrame);
        animFrame=requestAnimationFrame(gameLoop);
      };

      const bootId=++_bootId;
      (async ()=>{
        // If logged in, always prefer the cloud save (prevents "PC overwrote mobile with older localStorage").
        // If cloud is missing, fall back to local.
        let used=false;
        if(currentUser){
          const remoteOk=await loadRemoteGame();
          if(bootId!==_bootId) return;
          if(remoteOk) used=true;
          else {
            const localOk=loadGame();
            if(bootId!==_bootId) return;
            used=localOk;
          }
        } else {
          const localOk=loadGame();
          if(bootId!==_bootId) return;
          used=localOk;
        }

        if(!used){
          loadZone('starterTown');
          const sp=MAPS_DATA.starterTown.spawns.default;
          player={x:sp.x*TSIZE,y:sp.y*TSIZE,dir:'down',moving:false,frame:0};
          showStarterModal();
        }
        if(bootId!==_bootId) return;
        finishInit();
      })();
    },
    destroy(){
      _bootId++;
      if(animFrame){cancelAnimationFrame(animFrame);animFrame=null;}
      if(_kdown){document.removeEventListener('keydown',_kdown);_kdown=null;}
      if(_kup){document.removeEventListener('keyup',_kup);_kup=null;}
      if(canvas&&canvas._pkResize)window.removeEventListener('resize',canvas._pkResize);
      saveGame(); canvas=null; ctx=null; battle=null;
      Object.keys(keys).forEach(k=>keys[k]=false);
      dpad={up:false,down:false,left:false,right:false};
    },
    useMove(i){ if(battle&&!battleLocked)doTurn(i); },
    throwBall(){
      if(!battle||battleLocked||pokeballs<=0)return;
      pokeballs--; updateBallBtn(); enableBtns(false);
      const {pm:p,em:e}=battle;
      setLog('Threw a Poké Ball!','…');
      // Catch rate formula: higher chance when enemy HP is low
      const hpFactor=(e.maxHp-e.hp*3/4)/e.maxHp; // 0-1, higher when low HP
      const catchRate=(SP[e.speciesId]?.catchRate||45)/255;
      const chance=Math.min(0.95, catchRate*(0.5+hpFactor*0.5));
      setTimeout(()=>{
        if(Math.random()<chance){
          // Caught!
          const caught=mkMon(e.speciesId,e.level,e.xp);
          caught.hp=Math.max(1,e.hp); // keep current HP
          team.push(caught);
          totalCaught++;
          const catchCoins=20+e.level*4+Math.floor((SP[e.speciesId]?.xpY||50)*0.8);
          coins+=catchCoins; updateCoinsDisplay();
          setLog(`${e.name} was caught!`,`+${catchCoins}💰`);
          setTimeout(()=>{ closeBattle(); showToast(`🎉 Caught ${e.name}! +${catchCoins}💰`,'#ffd700',2800); },1400);
        } else {
          setLog(`${e.name} broke free!`,`Balls left: ${pokeballs}`);
          // Enemy gets a counter-attack
          setTimeout(async()=>{
            const emv=e.moves[Math.floor(Math.random()*e.moves.length)];
            await execMove(e,p,emv);
            if(p.hp<=0)endBattle(); else enableBtns(true);
          },900);
        }
      },900);
    },
    tryRun(){
      if(!battle||battleLocked)return;
      const {pm:p,em:e}=battle;
      const chance=Math.min(0.95,0.5+(p.spd-e.spd)/512);
      if(Math.random()<chance){ setLog('Got away safely!',''); setTimeout(closeBattle,1000); }
      else {
        setLog("Couldn't get away!",''); enableBtns(false);
        setTimeout(async()=>{
          const emv=e.moves[Math.floor(Math.random()*e.moves.length)];
          await execMove(e,p,emv); if(p.hp<=0)endBattle(); else enableBtns(true);
        },600);
      }
    },
    dismissBlackout(){
      team.forEach(m=>{ m.hp=Math.max(1,Math.floor(m.maxHp/2)); });
      const _dsp=MAPS_DATA.starterTown.spawns.default; player={x:_dsp.x*TSIZE,y:_dsp.y*TSIZE,dir:'down',moving:false,frame:0};
      saveGame(); closeBattle();
    },
    toggleDex(){
      const ov=document.getElementById('pk-dex-overlay');
      if(!ov)return;
      const open=ov.classList.toggle('hidden');
      if(!open){ // opened (hidden removed = now visible)
        const grid=document.getElementById('pk-dex-grid');
        const sub=document.getElementById('pk-dex-subtitle');
        if(!grid)return;
        grid.innerHTML='';
        if(!team.length){ grid.innerHTML='<p style="color:#888;padding:20px;font-family:\'Exo 2\',sans-serif">No Pokémon yet — choose a starter first!</p>'; return; }
        sub.textContent=`Party: ${team.length} Pokémon`;
        team.forEach(mon=>{
          const spec=SP[mon.speciesId]||{};
          const card=document.createElement('div');
          card.className='pk-dex-card';
          const tc=TYPE_COLORS;
          const typeBadges=(mon.types||spec.types||[]).map(t=>`<span class="pk-dex-type" style="background:${tc[t]||'#aaa'}">${t}</span>`).join('');
          card.innerHTML=`
            <img src="${spriteUrl(mon.speciesId)}" alt="${mon.name}" onerror="this.style.display='none'">
            <div class="pk-dex-name">${mon.name}</div>
            <div class="pk-dex-level">Lv. ${mon.level}</div>
            <div class="pk-dex-types">${typeBadges}</div>
            <div class="pk-dex-stats">HP ${mon.hp}/${mon.maxHp}<br>Atk ${mon.atk} Def ${mon.def}<br>Spd ${mon.spd}</div>
            <div style="font-size:0.65rem;color:#777;margin-top:2px;font-family:'Exo 2',sans-serif">Tap for details</div>
          `;
          card.onclick=()=>window.pokemonModule.showDexDetail(mon.speciesId);
          grid.appendChild(card);
        });
      }
    },
    async showLeaderboard(tab='caught'){
      const ov=document.getElementById('pk-lb-overlay');
      if(!ov)return;
      ov.classList.remove('hidden');
      // update tab buttons
      ['caught','levels'].forEach(t=>{
        const b=document.getElementById(`pk-lb-tab-${t}`);
        if(b)b.classList.toggle('active',t===tab);
      });
      const list=document.getElementById('pk-lb-list');
      if(!list)return;
      list.innerHTML='<div class="pk-lb-loading">Loading…</div>';
      try{
        const col=tab==='caught'?'pokemon_count':'total_levels';
        const label=tab==='caught'?' caught':' total lvl';
        const {data,error}=await sb.from('pokemon_saves')
          .select('username,pokemon_count,total_levels')
          .order(col,{ascending:false})
          .limit(10);
        if(error||!data||!data.length){
          list.innerHTML='<div class="pk-lb-empty">No data yet — play Pokémon and save to appear here!</div>';
          return;
        }
        const me=currentUser?.username;
        const medals=['🥇','🥈','🥉'];
        list.innerHTML=data.map((row,i)=>{
          const isMe=row.username===me;
          const rankClass=i<3?`pk-lb-rank-${i+1}`:'pk-lb-rank-n';
          const rankIcon=medals[i]||`#${i+1}`;
          const val=tab==='caught'?row.pokemon_count:row.total_levels;
          return `<div class="pk-lb-row${isMe?' pk-lb-me':''}">
            <span class="pk-lb-rank ${rankClass}">${rankIcon}</span>
            <span class="pk-lb-name">${row.username}${isMe?'<span class="pk-lb-you">(you)</span>':''}</span>
            <span class="pk-lb-val">${val}<span>${label}</span></span>
          </div>`;
        }).join('');
      }catch(e){
        list.innerHTML='<div class="pk-lb-empty">Could not load leaderboard.</div>';
      }
    },
    closeLeaderboard(){
      const ov=document.getElementById('pk-lb-overlay');
      if(ov)ov.classList.add('hidden');
    },
    showSwapPanel(forced){ showSwapPanel(forced); },
    toggleShop(){
      const ov=document.getElementById('pk-shop-overlay');
      if(!ov)return;
      const opening=ov.classList.toggle('hidden');
      if(!opening){ // just opened (hidden was present, now removed)
        renderShopItems('buy');
        renderShopTimer();
        if(_shopTimerInt) clearInterval(_shopTimerInt);
        _shopTimerInt=setInterval(renderShopTimer,1000);
      } else {
        if(_shopTimerInt){ clearInterval(_shopTimerInt); _shopTimerInt=null; }
      }
    },
    showShopTab(tab){ renderShopItems(tab); },
    refreshShop(){ refreshShop(); },
    _buyItem(id){ buyItem(id); },
    _buyPokemon(sid, price){
      if(coins<price){ showToast('Not enough coins!','#ff6b6b',1800); return; }
      if(team.length>=6){ showToast('Party is full (6 max)!','#ff6b6b',1800); return; }
      coins-=price; updateCoinsDisplay();
      const newMon=mkMon(sid,5);
      team.push(newMon);
      saveGame();
      showToast(`${newMon.name} joined your party! ✨`,'#ffd700',2500);
      playCry(SP[sid]?.dexId);
      renderShopItems('pokemon');
    },
    _sellPokemon(idx){
      const mon=team[idx]; if(!mon||team.length<=1)return;
      customConfirm(`Sell ${mon.name} (Lv.${mon.level}) for ${getSellPrice(mon)} coins?`, ()=>{
        const price=getSellPrice(mon);
        coins+=price; updateCoinsDisplay();
        team.splice(idx,1);
        // If active battle Pokémon was sold, this shouldn't happen outside battle — guard
        if(battle&&battle.pm===mon) battle.pm=team[0];
        saveGame();
        showToast(`Sold ${mon.name} for ${price}💰`,'#ffd700',2000);
        renderShopItems('sell');
      });
    },
    quickHeal(){ quickHeal(); },
    acceptGymBattle(){
      const el=document.getElementById('pk-gym-dialog');
      const leaderId=el?.dataset.leaderId;
      closeGymDialog();
      if(leaderId) startLeaderBattle(leaderId);
    },
    declineGymBattle(){
      const el=document.getElementById('pk-gym-dialog');
      const leaderId=el?.dataset.leaderId;
      const gl=GYM_LEADERS[leaderId];
      // Show farewell line briefly, then close and set cooldown
      const el_text=document.getElementById('pk-gym-dialog-text');
      const el_btns=document.querySelector('.pk-gym-dialog-btns');
      if(el_text) el_text.textContent=`${gl?.name||'The Leader'}: "Very well... come back when you're ready, trainer."`;
      if(el_btns) el_btns.style.display='none';
      gymTalkCooldown=Date.now()+90000;
      setTimeout(()=>{
        closeGymDialog();
        if(el_btns) el_btns.style.display='';
      },1800);
    },
    showDexDetail(speciesId){
      const mon=team.find(m=>m.speciesId===speciesId)||{speciesId,level:1,hp:0,maxHp:0,atk:0,def:0,spd:0,types:SP[speciesId]?.types||[]};
      const sp=SP[speciesId]; if(!sp)return;
      const types=mon.types||sp.types||[];
      // Derive advantages and counters from TYPE_EFF
      const advantages=[],counters=[];
      types.forEach(t=>{
        const eff=TYPE_EFF[t]||{};
        Object.entries(eff).forEach(([dt,v])=>{ if(v>=2&&!advantages.includes(dt)) advantages.push(dt); if(v<=0.5&&!counters.includes(dt)) counters.push(dt); });
      });
      // What beats this pokemon (attacks super-effective against its types)
      const weakTo=[];
      Object.entries(TYPE_EFF).forEach(([atk,tbl])=>{
        let e=1; types.forEach(t=>{ e*=(tbl[t]!==undefined?tbl[t]:1); });
        if(e>=2&&!weakTo.includes(atk)) weakTo.push(atk);
      });
      const DEX_INFO={
        pikachu:   'A Mouse Pokémon that stores electricity in its cheek pouches. Pikachu are often found in forests charging up by rubbing their tails against each other.',
        bulbasaur: 'A Seed Pokémon with a plant bulb on its back that grows larger as the Pokémon evolves, absorbing sunlight for energy.',
        squirtle:  'A Tiny Turtle Pokémon that withdraws into its round shell for protection and shoots precise streams of water from its mouth.',
        chikorita: 'A Leaf Pokémon from Johto that uses the sweet scent from its leaf to check air quality and soothe its surroundings.',
        torchic:   'A Chick Pokémon that launches fire from its beak. It hides behind its Trainer, being very clingy to those it trusts.',
        cyndaquil: 'A Fire Mouse Pokémon that curls up and uses the flames on its back as a defence mechanism when threatened.',
        totodile:  'A Big Jaw Pokémon with powerful jaws that can chomp through hard objects. It bites everything it sees as play.',
        mudkip:    'A Mud Fish Pokémon that uses the fin on its head to sense moisture and water flow, even underground.',
        treecko:   'A Wood Gecko Pokémon that can scale vertical walls using tiny hooks on its feet, living high in treetops.',
        eevee:     'An Evolution Pokémon with irregular genetic structure — its DNA reacts differently to various stimuli allowing it to evolve into many forms.',
        rattata:   'A Mouse Pokémon that gnaws on anything with its sharp fangs. Colonies nest on the outskirts of towns.',
        pidgey:    'A Tiny Bird Pokémon that raises sand clouds to protect itself and navigates by sensing changes in air current.',
        caterpie:  'A Worm Pokémon that emits a horrible stench from its red antennae to drive away predators. It sheds its skin often.',
        weedle:    'A Hairy Bug Pokémon with a poisonous stinger on its head. It eats its own weight in leaves every day.',
        oddish:    'A Weed Pokémon that buries itself in soil by day and wanders at night, scattering spores from its leaves.',
        psyduck:   'A Duck Pokémon that constantly suffers headaches; when the pain peaks it accidentally releases powerful psychic energy.',
        geodude:   'A Rock Pokémon found sleeping on rocky mountain paths. Travellers often stub their toes on sleeping Geodude.',
        zubat:     'A Bat Pokémon that lacks eyes but navigates perfectly using ultrasonic waves. Large colonies roost in dark caves.',
        magikarp:  'A Fish Pokémon considered useless in battle — yet endurance through hardship enables its awe-inspiring evolution.',
        gastly:    'A Gas Pokémon whose body is made of toxic gas. A Gastly can surround a large horse and knock it out.',
        raichu:    'A Mouse Pokémon that is the evolved form of Pikachu. Its tail acts as a lightning rod, grounding excess electricity.',
        gyarados:  'An Atrocious Pokémon that devastates towns when it goes on a rampage — evolution radically reshapes its brain chemistry.',
        scyther:   'A Mantis Pokémon whose twin scythes slice through thick logs. It moves so fast it seems to teleport.',
        electabuzz:'A Electric Pokémon that appears during thunderstorms, absorbing lightning. Causes blackouts wherever it lives.',
        haunter:   'A Gas Pokémon that can pass through solid walls. Touching a Haunter causes unstoppable shaking.',
        dratini:   'A Dragon Pokémon that sheds its skin repeatedly as it grows, sometimes reaching lengths of six feet.',
        jolteon:   'A Lightning Pokémon with electrically-charged fur that shoots sharp needles. Reacts to slightest movement.',
        flareon:   'A Flame Pokémon that stores flame sacs in its body, raising its temperature to over 3000°F when it attacks.',
        vaporeon:  'A Bubble Jet Pokémon that can melt into water and become invisible, living near clean water sources.',
      };
      const story=DEX_INFO[speciesId]||`${sp.name} is a ${types.join('/')} type Pokémon with a catchRate of ${sp.catchRate||'??'}. It can be found in various habitats and is known for its unique battle style.`;
      const tc=TYPE_COLORS;
      const typeBadges=types.map(t=>`<span class="pk-dex-type" style="background:${tc[t]||'#aaa'}">${t}</span>`).join('');
      const advBadges=advantages.length?advantages.map(t=>`<span class="pk-dex-type" style="background:${tc[t]||'#888'}">${t}</span>`).join(''):'—';
      const wkBadges=weakTo.length?weakTo.map(t=>`<span class="pk-dex-type" style="background:${tc[t]||'#888'}">${t}</span>`).join(''):'—';
      const panel=document.getElementById('pk-dex-detail-panel');
      if(!panel)return;
      panel.innerHTML=`
        <div class="pk-dex-detail-header">
          <img src="${spriteUrl(speciesId)}" alt="${sp.name}" onerror="this.style.display='none'">
          <div class="pk-dex-detail-info">
            <div class="pk-dex-detail-name">${sp.name}</div>
            <div class="pk-dex-detail-type-row">${typeBadges}</div>
            <div style="font-size:0.75rem;color:#aaa;margin-top:4px;font-family:'Exo 2',sans-serif">Lv.${mon.level} · HP ${mon.hp}/${mon.maxHp}</div>
          </div>
        </div>
        <div class="pk-dex-detail-section">
          <div class="pk-dex-detail-section-title">Description</div>
          <div class="pk-dex-detail-section-body">${story}</div>
        </div>
        <div class="pk-dex-detail-section">
          <div class="pk-dex-detail-section-title">Strong Against</div>
          <div class="pk-dex-detail-type-row">${advBadges}</div>
        </div>
        <div class="pk-dex-detail-section">
          <div class="pk-dex-detail-section-title">Weak To</div>
          <div class="pk-dex-detail-type-row">${wkBadges}</div>
        </div>
        <div class="pk-dex-detail-section">
          <div class="pk-dex-detail-section-title">Stats</div>
          <div class="pk-dex-detail-section-body">HP ${sp.hp} · Atk ${sp.atk} · Def ${sp.def} · Spd ${sp.spd}</div>
        </div>
        <button class="pk-dex-detail-close" onclick="document.getElementById('pk-dex-detail-overlay').classList.add('hidden')">Close</button>
      `;
      document.getElementById('pk-dex-detail-overlay').classList.remove('hidden');
    },
    async manualSave(){
      if(!player||!team.length){ showToast('Nothing to save yet!','#ff6b6b',1800); return; }
      // Save locally first (instant), then upload the same blob to Supabase.
      const sv={
        team:team.map(p=>({speciesId:p.speciesId,level:p.level,hp:p.hp,maxHp:p.maxHp,xp:p.xp,xpToNext:p.xpToNext,moves:p.moves})),
        px:Math.floor(player.x/TSIZE), py:Math.floor(player.y/TSIZE),
        pokeballs, coins, totalCaught, expBoostActive,
        savedAt: Date.now()
      };
      localStorage.setItem('pkSave',JSON.stringify(sv));

      if(!currentUser){
        showToast('Saved locally ✓ (log in to sync cloud progress)','#ffbb00',2800);
        return;
      }

      showToast('Saving to cloud...','#00d4ff',1000);
      const err=await syncPkSave(sv);
      if(err===null) showToast('Saved to cloud! 💾','#00ff88',2200);
      else showToast('Saved locally ✓ — cloud error: '+err,'#ff9900',5000);
    },
    toggleLandscape(){
      const isLm=document.body.classList.toggle('pk-lm');
      const fab=document.getElementById('pk-landscape-fab');
      if(fab) fab.textContent=isLm?'⊡':'⛶';
      if(isLm){
        try{ window.screen?.orientation?.lock?.('landscape'); }catch(e){}
      } else {
        try{ window.screen?.orientation?.unlock?.(); }catch(e){}
      }
      setTimeout(()=>{ canvas?._pkResize?.(); },50);
      setTimeout(()=>{ canvas?._pkResize?.(); },400);
    },
  };
})();
window.pokemonModule = pokemonModule;
