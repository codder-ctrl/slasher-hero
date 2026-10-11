import { SOUL_TREE } from './config.js';

// Soul tree rules: pure, no DOM. Points in state.soulPoints, levels in state.soulTree[id].

export const findNode = (id) => SOUL_TREE.find((n) => n.id === id);
export const treeLevel = (state, id) => state.soulTree?.[id] || 0;
export const treeValue = (state, id) => treeLevel(state, id) * findNode(id).step;

// Points for the next level of a node at `level`.
export const treeCost = (level) => level + 1;

export function canBuyNode(state, id) {
  const node = findNode(id);
  if (!node) return false;
  const level = treeLevel(state, id);
  return level < node.max && state.soulPoints >= treeCost(level);
}

export function buyNode(state, id) {
  if (!canBuyNode(state, id)) return false;
  const level = treeLevel(state, id);
  state.soulPoints -= treeCost(level);
  state.soulTree[id] = level + 1;
  return true;
}

// Rebuilds the tree from untrusted saved data.
export function loadTree(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const node of SOUL_TREE) {
    const v = raw[node.id];
    if (Number.isInteger(v) && v > 0) out[node.id] = Math.min(node.max, v);
  }
  return out;
}
