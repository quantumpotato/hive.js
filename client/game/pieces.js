const piece_sets = {
  standard: {
    beetle: 2,
    grasshopper: 3,
    ant: 3,
    spider: 2,
  },
  custom: {
    mantis: 2,
    fly: 3,
    wasp: 3,
    scorpion: 2,
  },
}

piece_sets.expanded_standard = {
  lady_bug: 1,
  mosquito: 1,
  pill_bug: 1,
}

piece_sets.expanded_custom = {
  dragonfly: 1,
  cockroach: 1,
  centipede: 1,
}

const custom = [
  'assasin_bug',
  'dragonfly',
  'earthworm',
  'earwig',
  'fly',
  'firefly',
  'mantis',
  'scorpion',
  'shield_bug',
  'cockroach',
  'tick',
  'wasp',
]

const original = [
  'ant',
  'beetle',
  'centipede',
  'grasshopper',
  'lady_bug',
  'mosquito',
  'pill_bug',
  'queen',
  'spider',
]

const all = original.concat(custom)

const getAvailable = (board) => {
  const used = {
    1: {},
    2: {},
  }
  board.piece_types.forEach((type, index) => {
    const player_id = board.piece_owners[index]
    used[player_id][type] = (used[player_id][type] || 0) + 1
  })
  const available = []
  const piece_set = { queen: 1 }
  board.rules.piece_sets.forEach((name) => {
    Object.assign(piece_set, piece_sets[name])
  })
  Object.entries(used).forEach(([player_id, used_pieces]) => {
    Object.entries(piece_set).forEach(([type, total]) => {
      used_pieces[type] = used_pieces[type] || 0
      if (total - used_pieces[type] > 0) {
        available.push({ type, player_id, count: total - used_pieces[type] })
      }
    })
  })
  return available
}

export default {
  getAvailable,
  piece_sets,
  original,
  custom,
  all,
}
