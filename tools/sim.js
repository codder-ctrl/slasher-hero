// Pacing simulation: plays the rules headless with a simple greedy player and prints how fast
// it progresses. Use it after changing balance numbers in config.js.
//
//   node tools/sim.js                      active player, 5 taps/s, 4 hours
//   node tools/sim.js --taps 0             idle player (pet only)
//   node tools/sim.js --skip vitality,armor  never buys those upgrades
//   node tools/sim.js --share 0.15         spends at most 15% of its gold on defense
//   node tools/sim.js --curve              also prints HP, armor and boss hits per stage
//   node tools/sim.js --mega               also prints how long the first mega boss would take
//   node tools/sim.js --logic ../../piksel-savasci/js/logic.js   compare with another rule set
//
// The player taps at a steady rate (so it also interrupts boss wind-ups), buys the cheapest
// affordable upgrade or Pet Eğitimi level every half second, and presses "Boss'a meydan oku"
// whenever auto-advance has stopped.

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1]?.startsWith('--') || all[i + 1] === undefined ? 'true' : all[i + 1]]);
  return acc;
}, []));

const logicPath = args.logic ? new URL(args.logic, `file://${process.cwd().replace(/\\/g, '/')}/`).href : '../js/logic.js';
const L = await import(logicPath);
const configPath = logicPath.replace(/logic\.js$/, 'config.js');
const C = await import(configPath);
const G = await import(configPath.replace(/config\.js$/, 'gear.js')).catch(() => null);

const TAPS = Number(args.taps ?? 5);
const HOURS = Number(args.hours ?? 4);
const skip = new Set((args.skip || '').split(',').filter(Boolean));
const seed = Number(args.seed ?? 1);
const share = args.share !== undefined ? Number(args.share) : null;
const DEFENSE = new Set(['vitality', 'armor']);
let spent = 0;
let spentDefense = 0;
const curve = [];
const mega = [];

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(seed);

const state = L.newGame(rng, 0);
const shop = [
  ...C.UPGRADES.filter((u) => !skip.has(u.id)).map((d) => ({ kind: 'upgrade', def: d, levels: () => state.upgrades })),
  { kind: 'pet', def: C.PET_TRAINING, levels: () => state.training },
];

const DT = 0.1;
let tapAcc = 0;
let buyAcc = 0;
const counts = {};
const marks = [10, 20, 30, 50, 80, 100, 120, 150];
const reached = {};
const samples = [60, 240, 900, 1800, 3600, 7200, 14400].filter((t) => t <= HOURS * 3600);
const at = {};

for (let t = 0; t <= HOURS * 3600 + DT; t += DT) {
  const events = [];
  L.tick(state, DT, rng, events);
  tapAcc += TAPS * DT;
  while (tapAcc >= 1) { tapAcc--; L.tap(state, rng, events); }
  for (const e of events) counts[e.type] = (counts[e.type] || 0) + 1;
  // Equipment: wear any dropped item that beats the one in its slot.
  if (G && !args['no-gear']) {
    for (const e of events) {
      if (e.type !== 'item' || e.salvaged) continue;
      const cur = state.equipment.slots[e.item.slot];
      if (!cur || G.itemScore(e.item) > G.itemScore(cur)) G.equip(state, e.item.uid);
    }
  }
  buyAcc += DT;
  if (buyAcc >= 0.5) {
    buyAcc = 0;
    if (!state.autoAdvance) state.autoAdvance = true;
    for (let guard = 0; guard < 200; guard++) {
      let best = null;
      const defenseOk = share === null || spentDefense <= share * spent;
      for (const item of shop) {
        if (!defenseOk && DEFENSE.has(item.def.id)) continue;
        const level = item.levels()[item.def.id];
        if (level >= item.def.max) continue;
        const cost = L.costFor(item.def, level);
        if (!best || cost < best.cost) best = { item, cost };
      }
      if (!best || best.cost > state.gold) break;
      L.buy(state, best.item.kind, best.item.def.id, 1);
      spent += best.cost;
      if (DEFENSE.has(best.item.def.id)) spentDefense += best.cost;
    }
  }
  for (const m of marks) if (!reached[m] && state.maxStage >= m) reached[m] = t;
  if (args.curve && L.heroMaxHp && state.maxStage % 5 === 0 && !curve[state.maxStage]) {
    curve[state.maxStage] = { hp: L.heroMaxHp(state), takes: L.damageTakenMultiplier(L.heroArmor(state)), hit: L.attackDamage(state, { boss: true }, state.maxStage) };
  }
  for (const s of samples) if (at[s] === undefined && t >= s) at[s] = state.maxStage;
  // Seconds the current build needs for the first mega boss at level 1 and 2 (taps + pet).
  if (args.mega && C.MEGA_BOSSES && state.maxStage % 5 === 0 && !mega[state.maxStage]) {
    const m = C.MEGA_BOSSES[0];
    const crit = 1 + L.critChance(state) * (L.critMultiplier(state) - 1);
    const dps = L.tapDamage(state) * crit * TAPS * L.comboMultiplier(state) + L.totalDps(state);
    mega[state.maxStage] = [1, 2, 3].map((lv) => L.megaHp(m, lv) / dps);
  }
}

const fmtT = (s) => (s === undefined ? '—' : s < 3600 ? `${(s / 60).toFixed(1)} dk` : `${(s / 3600).toFixed(2)} sa`);
console.log(`logic: ${args.logic || 'slasher-hero'} · ${TAPS} taps/s · skip: ${[...skip].join(',') || '-'}${share !== null ? ` · defense share ${share}` : ''} · ${HOURS} h`);
if (args.curve) {
  console.log('stage  hp  takes  hpEff(hp/takes)  bossHit  hitsToDie');
  curve.forEach((c, s) => { if (c) console.log(`${s}	${Math.round(c.hp)}	${c.takes.toFixed(3)}	${Math.round(c.hp / c.takes)}	${Math.round(c.hit)}	${(c.hp / c.hit).toFixed(1)}`); });
}
if (args.mega) {
  console.log(`mega boss ${C.MEGA_BOSSES[0].name}: seconds needed at Sv.1 / Sv.2 / Sv.3 (limit ${C.RAID.time})`);
  mega.forEach((v, st) => { if (v && st >= 80) console.log(`  stage ${st}: ${v.map((x) => x.toFixed(0)).join(' / ')}`); });
}
console.log('time to stage: ' + marks.map((m) => `${m}: ${fmtT(reached[m])}`).join(' | '));
console.log('stage at:      ' + samples.map((s) => `${fmtT(s)}: ${at[s]}`).join(' | '));
if (G && state.equipment) console.log('gear: ' + Object.values(state.equipment.slots).map((it) => (it ? `${G.itemName(it)} (${it.rarity})` : '-')).join(', ') + ` · bag ${state.equipment.bag.length}`);
console.log(`final stage ${state.maxStage} · boss fails ${counts.bossFail || 0} · hero downs ${counts.heroDown || 0} · interrupts ${counts.interrupt || 0} · shields ${counts.shieldBreak || 0} · goblins fled ${counts.goblinFlee || 0}`);
console.log('levels: ' + Object.entries(state.upgrades).map(([k, v]) => `${k} ${v}`).join(', ') + `, train ${state.training.train}`);
if (L.heroMaxHp) console.log(`hero hp ${L.heroMaxHp(state)} · armor ${L.heroArmor(state)} (takes ${(L.damageTakenMultiplier(L.heroArmor(state)) * 100).toFixed(0)}%) · boss hit at stage ${state.maxStage}: ${Math.round(L.attackDamage(state, { boss: true }, state.maxStage))}`);
