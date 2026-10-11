import { PETS, RARITIES, PET_TRAINING, EGG_COST, MAX_STARS, FORM_MULT } from './config.js';
import * as L from './logic.js';

// The Pet tab: the active pet with its evolution, Pet Eğitimi (gold), eggs (elmas) and the
// collection. Built once; update() refreshes text and returns whether to badge the tab.

const $ = (id) => document.getElementById(id);

export function createPetPage({ h, icon, make, set, makeCard, fmt }) {
  const el = {
    img: $('pet-img'), name: $('pet-name'), rarity: $('pet-rarity'), stars: $('pet-stars'),
    mult: $('pet-mult'), form: $('pet-form'), evolve: $('pet-evolve'), evolveLabel: $('pet-evolve-label'),
    evolveCost: $('pet-evolve-cost'), elmas: $('elmas'), kristal: $('pet-kristal'), egg: $('egg-btn'),
    rates: $('egg-rates'), grid: $('pet-grid'), count: $('pet-count'), training: $('pet-training'),
  };

  const petIcon = (pet, form) => icon('actor:' + pet.actor, { colors: pet.forms[form - 1].colors, form });
  const rarityOf = (pet) => RARITIES.find((r) => r.id === pet.rarity);
  const starText = (n) => (n > 0 ? '★'.repeat(n) + '☆'.repeat(MAX_STARS - n) : '');

  set(el.rates, RARITIES.map((r) => `${r.name} %${r.weight}`).join(' · '));
  set(el.egg, `Yumurta Aç · ${EGG_COST} elmas`);
  el.egg.addEventListener('click', () => h.openEgg());
  el.evolve.addEventListener('click', () => h.evolvePet());

  const training = makeCard(icon(PET_TRAINING.icon), () => h.buy('pet', PET_TRAINING.id));
  set(training.name, PET_TRAINING.name);
  el.training.append(training.card);

  const tiles = PETS.map((pet) => {
    const tile = make('button', 'pet-tile');
    tile.type = 'button';
    tile.style.setProperty('--rarity', rarityOf(pet).color);
    const img = make('img');
    img.alt = '';
    const name = make('span', 'pet-tile-name');
    const stars = make('span', 'pet-tile-stars');
    tile.append(img, name, stars);
    tile.addEventListener('click', () => h.selectPet(pet.id));
    el.grid.append(tile);
    return { tile, img, name, stars };
  });

  function update(state, amount) {
    const pet = L.findPet(state.activePet);
    const owned = state.pets[pet.id];
    const rarity = rarityOf(pet);
    const form = pet.forms[owned.form - 1];
    el.img.src = petIcon(pet, owned.form);
    set(el.name, form.name);
    set(el.rarity, rarity.name);
    el.rarity.style.color = rarity.color;
    set(el.stars, starText(owned.stars));
    set(el.mult, `Hasar çarpanı ×${fmt(L.petMultiplier(state, pet.id))}`);
    set(el.form, `Evrim ${owned.form}/${FORM_MULT.length}`);
    const cost = L.evolveCost(state, pet.id);
    const maxed = cost === Infinity;
    set(el.evolveLabel, maxed ? 'Son form' : `Evrim → ${pet.forms[owned.form].name}`);
    set(el.evolveCost, maxed ? '—' : fmt(cost));
    el.evolve.disabled = maxed || cost > state.kristal;

    set(el.elmas, fmt(state.elmas));
    set(el.kristal, fmt(state.kristal));
    el.egg.disabled = state.elmas < EGG_COST;

    const level = state.training[PET_TRAINING.id];
    const plan = L.purchasePlan(PET_TRAINING, level, state.gold, amount);
    set(training.lvl, `Sv. ${level}`);
    set(training.desc, `Hasar/sn: ${fmt(L.petDps(state, level))} → ${fmt(L.petDps(state, level + plan.n))}`);
    set(training.note, 'Tüm petler için ortak · Doğuşta sıfırlanır');
    set(training.label, `+${plan.n}`);
    set(training.cost, fmt(plan.cost));
    training.btn.disabled = plan.cost > state.gold;

    let count = 0;
    PETS.forEach((p, i) => {
      const t = tiles[i];
      const mine = state.pets[p.id];
      if (mine) count++;
      t.tile.classList.toggle('owned', !!mine);
      t.tile.classList.toggle('active', p.id === state.activePet);
      t.tile.disabled = !mine;
      t.img.src = petIcon(p, mine ? mine.form : 1);
      set(t.name, mine ? p.forms[mine.form - 1].name : '???');
      set(t.stars, mine ? starText(mine.stars) : rarityOf(p).name);
      t.tile.setAttribute('aria-label', mine ? `${p.forms[mine.form - 1].name} seç` : 'Henüz bulunmadı');
    });
    set(el.count, `${count}/${PETS.length}`);

    return state.elmas >= EGG_COST || !el.evolve.disabled || L.costFor(PET_TRAINING, level) <= state.gold;
  }

  // Reveal after opening an egg.
  function eggResult(result, state) {
    const pet = L.findPet(result.id);
    const rarity = rarityOf(pet);
    const img = make('img', 'egg-reveal');
    img.alt = '';
    img.src = petIcon(pet, state.pets[pet.id].form);
    const tag = make('p', 'egg-rarity', rarity.name.toLocaleUpperCase('tr-TR'));
    tag.style.color = rarity.color;
    const name = pet.forms[state.pets[pet.id].form - 1].name;
    const text = result.isNew ? `Yeni pet: ${name}!`
      : result.stars ? `${name} tekrar çıktı: ${result.stars}. yıldız (+%20 hasar)`
        : `${name} zaten ${MAX_STARS} yıldız: +${result.kristal} kristal`;
    const actions = [{ label: 'Tamam' }];
    if (result.isNew && state.activePet !== pet.id) actions.push({ label: 'Hemen seç', kind: 'accent', onClick: () => h.selectPet(pet.id) });
    return { title: 'Yumurta açıldı', body: [img, tag, text], actions };
  }

  return { update, eggResult };
}
