import { SOUL_TREE, SOUL_BRANCHES } from './config.js';
import * as T from './souls.js';

// The Ruh Ağacı section of the Doğuş tab: points, and the nodes of each branch with their
// level, effect and a buy button (handler buyNode).

const $ = (id) => document.getElementById(id);

const shownValue = (node, level) => {
  const v = level * node.step;
  return String(node.kind === 'pct' ? Math.round(v * 100) : node.kind === 'stage' ? 1 + v : Math.round(v * 10) / 10);
};

// The node's text at `level`, or with "now → next" in place of the number.
function effectText(node, level, next = null) {
  const v = shownValue(node, level);
  return node.text.replace('{v}', next === null ? v : `${v} → ${node.text.includes('%{v}') ? '%' : ''}${shownValue(node, next)}`);
}

export function createSoulTree({ h, make, set }) {
  const root = $('soul-tree');
  const points = make('div', 'tree-points');
  const pointsText = make('b');
  points.append(make('span', null, 'Ruh puanı'), pointsText);
  const note = make('p', 'note', 'Her Yeniden Doğuş, kazandığın ruh taşı kadar ruh puanı verir. Ruh taşlarının hasar bonusu da aynen kalır.');
  root.append(points, note);
  const cards = [];
  for (const branch of SOUL_BRANCHES) {
    root.append(make('h4', `tree-branch branch-${branch.id}`, branch.name));
    for (const node of SOUL_TREE.filter((n) => n.branch === branch.id)) {
      const card = make('div', `tree-node branch-${branch.id}`);
      const body = make('div', 'tree-body');
      const title = make('b', null, node.name);
      const pips = make('span', 'tree-pips');
      title.append(pips);
      const effect = make('span', 'note');
      body.append(title, effect);
      const btn = make('button', 'btn small soul');
      btn.type = 'button';
      btn.addEventListener('click', () => h.buyNode(node.id));
      card.append(body, btn);
      root.append(card);
      cards.push({ node, pips, effect, btn, card });
    }
  }
  return {
    // Returns whether a node can be bought (tab badge).
    update(state) {
      set(pointsText, String(state.soulPoints));
      let any = false;
      for (const c of cards) {
        const level = T.treeLevel(state, c.node.id);
        set(c.pips, ' ' + '●'.repeat(level) + '○'.repeat(c.node.max - level));
        const maxed = level >= c.node.max;
        set(c.effect, maxed || !level ? effectText(c.node, Math.max(1, level)) : effectText(c.node, level, level + 1));
        const can = T.canBuyNode(state, c.node.id);
        c.btn.disabled = !can;
        set(c.btn, maxed ? 'MAKS' : `${T.treeCost(level)} puan`);
        c.card.classList.toggle('maxed', maxed);
        if (can) any = true;
      }
      return any;
    },
  };
}
