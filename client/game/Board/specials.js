// since specials take multiple arguments, specials need multiple steps to fill board.special_args
// if board.special_args is long enough, return a function to execute as the move
// other wise return potential indexes for the next argument
import { mod } from './Geo'
import wouldBreakHive from './wouldBreakHive'
import { stepOnHive, notEnemyScorpion } from './moves'
import { last } from 'lodash'

// TODO might be mergeable with B.move. Maybe switch to moves.move to simplify imports?
const move = (b, i1, i2, special) => {
  b.stacks[i2] = b.stacks[i2] || []
  b.stacks[i2].push(b.stacks[i1].pop())
  return { from: i1, to: i2, special }
}

const selectNearby = (b, i) => {
  return b.geo.touching[i].filter((i2) => b.stacks[i2] && !wouldBreakHive(b, i2))
}

const pill_bug = (b, piece_id, args) => {
  const index = b.reverse[piece_id]
  if (args.length === 0) {
    return selectNearby(b, index)
  } else if (args.length === 1) {
    return b.geo.touching[index].filter((i) => !b.stacks[i])
  } else {
    return () => move(b, args[0], args[1], index)
  }
}

const pullUnder = (b, index, target) => {
  b.stacks[index].unshift(b.stacks[target].pop())
  return {
    special: index,
    from: target,
    to: index,
  }
}

const orchid_mantis = (b, piece_id, args) => {
  const index = b.reverse[piece_id]
  if (b.stacks[index].length > 1) {
    // already on top of hive
    return []
  }
  if (args.length === 1) {
    return () => pullUnder(b, index, args[0])
  }
  // select piece to pull under, no scorpions
  return selectNearby(b, index).filter((target) => notEnemyScorpion(b, index, target))
}

const kung_fu_mantis = (board, piece_id, args) => {
  const index = board.reverse[piece_id]
  if (board.stacks[index].length > 1) {
    // already on top of hive
    return []
  }
  if (args.length === 1) {
    return () => pullUnder(board, index, args[0])
  }

  const one_away = board.geo.touching[index]
  const two_away = []
  one_away.forEach((index2) =>
    selectNearby(board, index2)
      .filter((i) => i !== index && !one_away.includes(i))
      .filter((i) => notEnemyScorpion(board, index, i))
      .forEach((i) => two_away.push(i)),
  )
  // select piece to pull under, no scorpions
  return two_away
}

const praying_mantis = (board, piece_id, args) => {
  const index = board.reverse[piece_id]
  if (board.stacks[index].length > 1) {
    return []
  }
  const targets = []
  board.geo.touching[index].map((target_index, i_dir) => {
    let snag, last
    if (!board.stacks[target_index]) {
      return
    }

    // praying_mantis travels in same direction until it falls off hive
    while (board.stacks[target_index]) {
      if (board.layers.fly[target_index]) {
        // cannot leap over orbweaver
        return
      }
      const dindex = board.geo.dindexes[mod(target_index, 2)][i_dir]
      last = target_index
      if (!snag && board.stacks[target_index].length > 1) {
        snag = target_index
      }
      target_index += dindex
    }
    targets.push([last, snag])
  })
  if (args.length === 0) {
    return targets.filter((t) => !board.layers.stack[t[0]]).map((t) => t[0])
  }
  return () => {
    const [target_index, snag_index] = targets.find((t) => t[0] === args[0])
    if (board.stacks[snag_index]) {
      board.stacks[target_index].push(board.stacks[snag_index].pop())
      args.push(snag_index)
    }
    board.stacks[target_index].push(board.stacks[index].pop())
    return {
      from: index,
      special: target_index,
    }
  }
}

const swap = (b, index1, index2) => {
  const piece1 = b.stacks[index1].pop()
  const piece2 = b.stacks[index2].pop()
  b.stacks[index1].push(piece2)
  b.stacks[index2].push(piece1)
}

const swapBottom = (b, index1, index2) => {
  const piece1 = b.stacks[index1].shift()
  const piece2 = b.stacks[index2].shift()
  b.stacks[index1].unshift(piece2)
  b.stacks[index2].unshift(piece1)
}

const earthworm = (b, piece_id, args) => {
  const index = b.reverse[piece_id]
  if (args.length === 0) {
    let moves = []
    stepOnHive(b, index).forEach((on_index1) =>
      stepOnHive(b, on_index1, [index]).forEach(
        (on_index2) => (moves = moves.concat(stepOnHive(b, on_index2, [index, on_index1]))),
      ),
    )
    return moves.filter((swap_index) => !wouldBreakHive(b, [index, swap_index]))
  }
  return () => {
    swapBottom(b, index, args[0])
    return {
      from: index,
      special: args[0],
    }
  }
}

const centipede = (b, piece_id, args) => {
  const index = b.reverse[piece_id]
  if (args.length === 0) {
    const touching = b.geo.touching[index]
    return touching.filter((index2, i_touching) => {
      if (!b.stacks[index2] || b.stacks[index2].length > 1) {
        return false
      }
      const left = b.stacks[touching[mod(i_touching - 1, 6)]]
      const right = b.stacks[touching[mod(i_touching + 1, 6)]]
      if (left && right) {
        return false
      }
      return !wouldBreakHive(b, [index, index2])
    })
  }
  return () => {
    swap(b, index, args[0])
    return {
      from: index,
      special: args[0],
    }
  }
}

const dragonfly = (b, piece_id, args) => {
  const index = b.reverse[piece_id]
  const parity = mod(index, 2)
  if (args.length === 0) {
    const f = (i) => notEnemyScorpion(b, index, i)
    return b.geo.dindexes.dragonfly[parity].map((di) => index + di).filter(f)
  }
  return () => {
    const target_index = args[0]
    if (b.stacks[index].length > 1 && !b.stacks[target_index] && !wouldBreakHive(b, [index], 2)) {
      b.stacks[target_index] = b.stacks[index].splice(-2, 2)
      args.push(true)
    } else {
      move(b, index, target_index)
    }
    return {
      from: index,
      special: target_index,
    }
  }
}

const mosquito = (b, piece_id, args) => {
  const index = b.reverse[piece_id]
  let out = []
  if (b.stacks[index].length === 1) {
    b.geo.touching[index].forEach((i2) => {
      const target_id = last(b.stacks[i2])
      if (['dragonfly', 'damselfly'].includes(b.piece_types[target_id])) {
        out = dragonfly(b, piece_id, args)
      }
    })
  }
  return out
}

const undoDragonfly = (b, piece_id, index, args) => {
  const [target_index, moved_two] = args
  b.stacks[index] = b.stacks[index] || []
  if (moved_two) {
    b.stacks[index] = b.stacks[index].concat(b.stacks[target_index].splice(-2, 2))
  } else {
    b.stacks[index].push(b.stacks[target_index].pop())
  }
}

const undoMoveUnder = (b, piece_id, index, args) => {
  const target_id = b.stacks[index].shift()
  b.stacks[args[0]] = b.stacks[args[0]] || []
  b.stacks[args[0]].push(target_id)
}

export default {
  move,
  selectNearby,
  dragonfly,
  damselfly: dragonfly,
  pill_bug,
  orchid_mantis,
  praying_mantis,
  centipede,
  mosquito,
  earthworm,
  kung_fu_mantis,
  undo: {
    earthworm: (b, piece_id, index, args) => swapBottom(b, args[0], index),
    pill_bug: (b, piece_id, index, args) => move(b, args[1], args[0]),
    centipede: (b, piece_id, index, args) => swap(b, args[0], index),
    orchid_mantis: undoMoveUnder,
    kung_fu_mantis: undoMoveUnder,
    praying_mantis: (b, piece_id, index, args) => {
      const [target_index, snag_index] = args
      move(b, target_index, index)
      if (snag_index !== undefined) {
        move(b, target_index, snag_index)
      }
    },
    dragonfly: undoDragonfly,
    damselfly: undoDragonfly,
  },
}
