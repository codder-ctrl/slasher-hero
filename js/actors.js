import { hero, hood, hat, helm } from './people.js';
import { slime, bat, mushroom, skeleton, ghost, goblin } from './monsters.js';
import { dog, cat, robot, drone, dragon, phoenix } from './pets.js';

// Every vector actor by id. config.js refers to these through `actor` fields.
// An actor is { height, hover?, rest, idle(t, look), actions: { name: { dur, pose } }, draw(ctx, pose, look, out) }.
export const ACTORS = {
  hero, hood, hat, helm,
  slime, bat, mushroom, skeleton, ghost, goblin,
  dog, cat, robot, drone, dragon, phoenix,
};
