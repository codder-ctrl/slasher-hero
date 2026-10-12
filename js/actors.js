import { hero, hood, hat, helm } from './people.js';
import { slime, bat, mushroom, skeleton, ghost, goblin } from './monsters.js';
import { goblinChief, treant, golem } from './bosses.js';
import { minotaur, spiderQueen } from './megabosses.js';
import { dog, cat, robot, drone, dragon, phoenix } from './pets.js';

// Every vector actor by id. config.js refers to these through `actor` fields.
// An actor is { height, hover?, rest, idle(t, look), actions: { name: { dur, pose } }, draw(ctx, pose, look, out) }.
export const ACTORS = {
  hero, hood, hat, helm,
  slime, bat, mushroom, skeleton, ghost, goblin,
  goblinChief, treant, golem,
  minotaur, spiderQueen,
  dog, cat, robot, drone, dragon, phoenix,
};
