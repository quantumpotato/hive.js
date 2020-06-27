import Storage from '@unrest/storage'
import { pick } from 'lodash'

import { getGeo } from './Geo'
import wouldBreakHive from './wouldBreakHive'
import moves from './moves'

const board_cache = {}
const PLAYER_COUNT = 2

export const resize = (board, dx, dy) => {
  const old_geo = getGeo(board)
  board.W += dx
  board.H += dy
  const new_stacks = {}
  const new_geo = getGeo(board)
  Object.entries(board.stacks).forEach(([index, stack]) => {
    const xy = old_geo.index2xy(index)
    new_stacks[new_geo.xy2index(xy)] = stack
  })
  board.stacks = new_stacks
}

const moveStacks = (board, dx, dy) => {
  const geo = getGeo(board)
  const new_stacks = {}
  Object.entries(board.stacks).forEach(([index, stack]) => {
    const xy = geo.index2xy(index)
    xy[0] += dx
    xy[1] += dy
    new_stacks[geo.xy2index(xy)] = stack
  })
  board.stacks = new_stacks
}

const B = {
  moves,
  wouldBreakHive,
  storage: new Storage('saved_games'),
  save: (b) => {
    // TODO currently saving on mouse move
    if (b.reverse && B.current_hash === b.hash) {
      return
    }

    // get derrived state of board
    B.current_hash = b.hash
    b.reverse = {}
    const geo = getGeo(b)
    let x_max = 0,
      y_max = 0,
      x_min = Infinity,
      y_min = Infinity
    Object.entries(b.stacks).forEach(([index, stack]) => {
      if (!stack || stack.length === 0) {
        // prune unused stacks
        delete b.stacks[index]
        return
      }
      stack.forEach((piece_id) => {
        b.reverse[piece_id] = parseInt(index)
      })
      const [x, y] = geo.index2xy(index)
      x_min = Math.min(x_min, x)
      y_min = Math.min(y_min, y)
      x_max = Math.max(x_max, x)
      y_max = Math.max(y_max, y)
    })
    if (x_min < 1) {
      resize(b, 2, 0)
      moveStacks(b, 2, 0)
    } else if (x_max > b.W - 2) {
      resize(b, 2, 0)
    }

    if (y_min < 1) {
      resize(b, 0, 1)
      moveStacks(b, 0, 1)
    } else if (y_max > b.H - 2) {
      resize(b, 0, 1)
    }

    b.current_player = (b.turn % PLAYER_COUNT) + 1 // 1 on even, 2 on odd
    B._markBoard(b)
    B.storage.set(b.id, B.toJson(b))
  },

  _markBoard: (b) => {
    const geo = getGeo(b)
    b.onehive = {} // index: would break hive if moved
    b.empty = {} // empty but next to onehive
    b.queens = {} // player: queen_index
    b.piece_types.forEach((type, id) => {
      const piece_index = b.reverse[id]
      if (type === 'queen') {
        b.queens[b.piece_owners[id]] = piece_index
      }
      if (wouldBreakHive(b, piece_index)) {
        b.onehive[piece_index] = true
      }
      geo.touching[piece_index].forEach((touched_index) => {
        if (!b.stacks[touched_index]) {
          b.empty[touched_index] = true
        }
      })
    })
  },

  get: (id) => {
    const b = board_cache[id] || B.storage.get(id)
    board_cache[id] = b
    window.b = b
    B.save(b)
    return b
  },
  nextTurn: (b) => {
    b.turn++
    b.hash = Math.random()
    delete b.selected
    delete b.error
    B.save(b)
  },
  addPiece: (b, index, type, player_id) => {
    const piece_id = b.piece_types.length
    b.piece_types.push(type)
    b.piece_owners.push(player_id)
    b.stacks[index] = b.stacks[index] || []
    b.stacks[index].push(piece_id)
    B.nextTurn(b)
  },
  move: (b, piece_id, index) => {
    const old_index = b.reverse[piece_id]
    if (old_index !== undefined) {
      piece_id = b.stacks[old_index].pop()
    }
    b.stacks[index] = b.stacks[index] || []
    b.stacks[index].push(piece_id)
    B.nextTurn(b)
  },
  toJson: (b) =>
    pick(b, [
      'id',
      'W',
      'H',
      'stacks',
      'piece_types',
      'piece_owners',
      'hash',
      'turn',
      'rules',
    ]),
  new: (options) => {
    const board = {
      W: 4, // hex math only works with even boards
      H: 3,
      ...options,
      id: Math.random(),
      hash: Math.random(),
      piece_types: [],
      piece_owners: [],
      turn: 0,
    }
    board.stacks = {}
    B.save(board)
    return board
  },

  getPlacement: (board, player_id) => {
    const geo = getGeo(board)
    if (board.turn === 0) {
      return [geo.center]
    }
    if (board.turn === 1) {
      return [geo.center + 1]
    }

    player_id = parseInt(player_id)
    const other_player = player_id === 1 ? 2 : 1

    // is index touching a player?
    const player_touching = {
      1: {},
      2: {},
    }
    board.piece_owners.forEach((owner, piece_id) => {
      const index = board.reverse[piece_id]
      const player = board.piece_owners[piece_id]
      geo.touching[index].forEach((index2) => {
        if (!board.stacks[index2]) {
          player_touching[player][index2] = true
        }
      })
    })

    return Object.keys(player_touching[player_id])
      .filter((index) => !player_touching[other_player][index])
      .map((index) => parseInt(index))
  },

  getMoves: (board, piece_id) => {
    const index = board.reverse[piece_id]
    const type = board.piece_types[piece_id]

    if (wouldBreakHive(board, index)) {
      return []
    }

    const f = moves[type] || (() => [])
    return f(board, index)
  },
  select: (board, target) => {
    if (target.piece_id === undefined) {
      delete board.selected
      return
    }
    if (board.onehive[target.index]) {
      board.error = 'Moving that piece would break the hive.'
      delete board.selected
      return
    }
    delete board.error
    board.selected = pick(target, [
      'player_id',
      'piece_id',
      'piece_type',
      'index',
    ])
    board.hash = Math.random()
  },
  click: (board, target) => {
    const { rules, selected } = board
    const { no_rules } = rules
    if (
      !selected || // no tile currently selected
      selected.player_id !== board.current_player || // currently selected enemy piece
      target.piece_id === 'new' || // clicked sidebar
      board.onehive[selected.index]
    ) {
      // currently selected an enemy piece, select new target piece instead
      B.select(board, target)
      return
    }

    if (selected.piece_id === 'new') {
      const { player_id, piece_type } = selected
      const placements = B.getPlacement(board, player_id)
      if (no_rules || placements.includes(target.index)) {
        B.queenCheck(board) &&
          B.addPiece(board, target.index, piece_type, player_id)
      } else {
        B.error(board, 'You cannot place next to an enemy tile.')
        B.select(board, target)
      }
      return
    }

    const moves = B.getMoves(board, selected.piece_id)
    if (no_rules || moves.includes(target.index)) {
      B.queenCheck(board) && B.move(board, selected.piece_id, target.index)
    } else {
      B.select(board, target)
    }
  },
  error: (board, message) => {
    board.error = message
  },
  findQueen: (board, player_id) => board.queens[player_id],
  queenCheck: (board) => {
    if (board.selected.piece_type === 'queen' || board.rules.no_rules) {
      // placing or moving queen, don't check anything else
      return true
    }
    const fail1 = board.turn === 7 && B.findQueen(board, 2) === undefined
    const fail2 = board.turn === 6 && B.findQueen(board, 1) === undefined
    if (fail1 || fail2) {
      B.error(board, 'You must place your queen on or before the 4th turn')
      return false
    }
    return true
  },
}

window.B = B

export default B
