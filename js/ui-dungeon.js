import { COMPANIONS, ROLES, TEAM_SIZE } from './config.js';
import * as D from './dungeon.js';

// The Zindan tab: floor info and the companion list (recruit, level up, team in/out, all with
// kristal). The fight itself is drawn by dungeon-view.js into #dungeon-canvas.

const $ = (id) => document.getElementById(id);

export function createDungeonPage({ h, icon, make, set, makeCard, fmt }) {
  const el = { floor: $('dg-floor'), best: $('dg-best'), kristal: $('dg-kristal'), team: $('team-count'), list: $('companion-list') };

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
