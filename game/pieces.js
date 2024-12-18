import help from './help'
import captions from './tutorial/captions'
import boards from './tutorial/boards'

const VANILLA = {
  beetle: 2,
  grasshopper: 3,
  ant: 3,
  spider: 2,
}

//sorted for vertical roguh functionality groupings
const piece_counts = {
  queen: 1,
  ...VANILLA,
  pill_bug: 1,
  orchid_mantis: 2,
  cicada: 3,
  cockroach: 1,
  trapdoor_spider: 2,
  centipede: 1,
  dragonfly: 1,
  praying_mantis: 1,
  lanternfly: 3,
  scorpion: 2,
  ladybug: 1,
  dragonfly_nymph: 2,
  kung_fu_mantis: 1,
  fly: 3,
  orbweaver: 2,
  emerald_wasp: 1,
  damselfly: 1,
  earthworm: 1,
  hornet: 3,
  praying_mantis: 1,
  lanternfly_nymph: 3,
  mosquito: 1,

}

// currently not used, colors are stored on svg
const colors = {
  ant: '#0088e6',
  beetle: '#b95cb9',
  centipede: '#b98900',
  cicada: '#4b9400', //  copies grasshopper
  cockroach: '#b95c2b',
  dragonfly: '#e62b00',
  dragonfly_nymph: '#e62b00',
  damselfly: '#e67000',
  earthworm: '#dc5797',
  fly: '#2a5c00',
  grasshopper: '#4b9400',
  ladybug: '#b90000',
  lanternfly: '#ac3a3a',
  lanternfly_nymph: '#ac3a3a',
  orchid_mantis: '#008b5c',
  orbweaver: '#900000',
  praying_mantis: '#008b5c',
  mosquito: '#8a8a8a',
  pill_bug: '#005cb9',
  scorpion: '#5c008b',
  spider: '#5c2900',
  trapdoor_spider: '#5c2900', // copies spider for now
  queen: '#e6b900',
  hornet: '#e62b8b',
  emerald_wasp: '#43b38c',
  kung_fu_mantis: '#aa3355',
}

const tags = {
  hive: ['beetle', 'grasshopper', 'ant', 'spider', 'ladybug', 'mosquito', 'pill_bug'],
  crawl: ['trapdoor_spider', 'spider', 'cicada', 'ant'],
  fly: [
    'orbweaver',
    'lanternfly',
    'fly',
    'hornet',
    'cockroach',
    'grasshopper',
    'cicada',
    'ladybug',
    'praying_mantis',
  ],
  stack: ['scorpion', 'beetle', 'orchid_mantis', 'praying_mantis', 'dragonfly', 'damselfly'],
  special: ['mosquito', 'centipede', 'pillbug', 'earthworm'],
  all: Object.keys(piece_counts),
}

const getAvailable = (board) => {
  const { unlimited } = board.rules
  const used = {
    1: {},
    2: {},
  }
  board.piece_types.forEach((type, index) => {
    const player_id = board.piece_owners[index]
    used[player_id][type] = (used[player_id][type] || 0) + 1
  })

  const available = []
  const piece_set = { blank: 0, queen: 1, ...board.rules.pieces }

  Object.entries(used).forEach(([player_id, used_pieces]) => {
    Object.entries(piece_set).forEach(([type, total]) => {
      used_pieces[type] = used_pieces[type] || 0
      const count = unlimited ? 1 : total - used_pieces[type]
      if (count > 0) {
        available.push({ type, player_id, count })
      }
    })
  })
  return available
}

export default {
  VANILLA,
  getAvailable,
  piece_counts,
  tags,
  list: Object.keys(piece_counts),
  colors,
}

tags.all.forEach((type) => {
  const toCheck = { captions, help, colors, boards }
  Object.entries(toCheck).forEach(([name, map]) => {
    if (!map[type]) {
      console.log('missing', name, type) // eslint-disable-line
    }
  })
})
