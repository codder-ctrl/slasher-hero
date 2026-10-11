import { COMPANIONS, ROLES, TEAM_SIZE } from './config.js';
import * as D from './dungeon.js';
import { SYNERGIES } from './config.js';

// The Zindan tab: floor info and the companion list (recruit, level up, team in/out, all with
// kristal). The fight itself is drawn by dungeon-view.js into #dungeon-canvas.

const $ = (id) => document.getElementById(id);

export function createDungeonPage({ h, icon, make, set, makeCard, fmt }) {
  const el = { floor: $('dg-floor'), best: $('dg-best'), kristal: $('dg-kristal'), team: $('team-count'), list: $('companion-list'), synergy: $('dg-synergy') };
  // Synergy chips: lit while the team qualifies.
  const chips = SYNERGIES.map((syn) => {
    const chip = make('span', 'synergy', syn.name);
    chip.title = syn.text;
    chip.addEventListener('click', () => h.toast?.(`${syn.name}: ${syn.text}`));
    el.synergy.append(chip);
    return { syn, chip };
  });

  const cards = COMPANIONS.map((def) => {
    const c = makeCard(icon('actor:' + def.actor, { colors: def.colors, role: def.role, shotColor: def.shotColor }), () => h.companion(def.id), 'crystal');
    set(c.name, def.name);
    const role = make('span', `role role-${def.role}`, ROLES[def.role].name);
    c.name.after(role);
    const teamBtn = make('button', 'team-btn');
    teamBtn.type = 'button';
    teamBtn.addEventListener('click', () => h.toggleTeam(def.id));
    c.note.replaceWith(teamBtn);
    el.list.append(c.card);
    return { ...c, teamBtn };
  });

  function update(state) {
    set(el.floor, String(state.dungeon.floor));
    set(el.best, String(state.dungeon.best));
    set(el.kristal, fmt(state.kristal));
    const team = state.dungeon.team;
    set(el.team, `${team.length}/${TEAM_SIZE}`);
    const active = new Set(D.activeSynergies(team.filter((id) => state.companions[id] > 0)).map((x) => x.id));
    for (const c of chips) c.chip.classList.toggle('on', active.has(c.syn.id));

    let afford = false;
    COMPANIONS.forEach((def, i) => {
      const c = cards[i];
      const level = state.companions[def.id];
      const recruited = level > 0;
      const inTeam = team.includes(def.id);
      c.card.classList.toggle('locked', !recruited);
      c.card.classList.toggle('in-team', inTeam);
      set(c.lvl, recruited ? `Sv. ${level}` : '');
      const now = D.companionStats(def.id, Math.max(1, level));
      const role = ROLES[def.role];
      const power = role.heal ? `Şifa ${fmt(Math.round(now.heal))}` : `Saldırı ${fmt(Math.round(now.atk))}${def.role === 'mage' ? ' (hepsine)' : ''}`;
      set(c.desc, `Can ${fmt(now.hp)} · ${power}`);
      const cost = recruited ? D.levelCost(def.id, level) : D.recruitCost(def.id);
      set(c.label, recruited ? '+1' : 'Topla');
      set(c.cost, fmt(cost));
      c.btn.disabled = cost > state.kristal;
      if (recruited && inTeam && cost <= state.kristal) afford = true;
      c.teamBtn.hidden = !recruited;
      set(c.teamBtn, inTeam ? 'Takımda ✓' : team.length < TEAM_SIZE ? 'Takıma al' : 'Takım dolu');
      c.teamBtn.disabled = !inTeam && team.length >= TEAM_SIZE;
    });
    return afford;
  }

  return { update };
}
