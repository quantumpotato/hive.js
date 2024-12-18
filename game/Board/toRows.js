/* Renders the board into a state that can be displayed */
import { range } from 'lodash'
import pieces from '../pieces'
import Board from './index'
import webs from './webs'

const _class = (p, t, s) => `piece hex-player_${p} type type-${t} hex -stacked-${s}`
const empty = (board, index) => {
  const cls = 'piece hex'
  if (!board.empty[index]) {
    // hexes far away from the hive are "invisible"
    return cls
  }
  const colors = ['r', 'g', 'b', 'r']
  const r_i = (board.geo.index2xy(index)[1] % 3) + (index % 2)
  return cls + ' hex-empty_' + colors[r_i]
}

const sliceBoard = (board) => {
  let max_x = -Infinity,
    max_y = -Infinity,
    min_x = Infinity,
    min_y = Infinity
  const indexes = Object.keys(board.stacks)
  if (indexes.length === 0) {
    indexes.push(board.geo.center)
  }
  indexes
    .map((index) => parseInt(index))
    .forEach((index) => {
      const xy = board.geo.index2xy(index)
      max_x = Math.max(max_x, xy[0] + 1)
      max_y = Math.max(max_y, xy[1] + 1)
      min_x = Math.min(min_x, xy[0] - 1)
      min_y = Math.min(min_y, xy[1] - 1)
    })
  if (min_x % 2 !== 0) {
    min_x -= 1
  }
  return range(min_y, max_y + 1).map((y) =>
    range(min_x, max_x + 1).map((x) => ({
      index: board.geo.xy2index([x, y]),
      xy: [x, y],
    })),
  )
}

export const makeStack = (board, index) => {
  const stack = board.stacks[index]
  if (!stack) {
    return [empty(board, index)]
  }
  return stack.map((piece_id, stack_index) => {
    if (stack.length > 4) {
      stack_index = stack_index - stack.length + 4
    }
    const type = board.piece_types[piece_id]
    const player = board.piece_owners[piece_id]
    return _class(player, type, stack_index)
  })
}

export default (board, { columns = 1 } = {}) => {
  const marked = getMarked(board)
  const { selected = {} } = board
  if (selected.index !== undefined) {
    marked[selected.index] = ' purple'
  } else if (selected.piece_id !== 'new' && board.last) {
    if (board.last.from) {
      marked[board.last.from] = ' blue-dashed'
    }
    if (board.last.to) {
      marked[board.last.to] = ' blue'
    }
    if (board.last.special) {
      marked[board.last.special] = ' yellow'
    }
    board.last.stacks?.forEach((index) => {
      marked[index] += ' purple-inner'
    })
  }

  const show_webs = webs.getVisible(board, selected.index)
  const rows = sliceBoard(board)
  rows.forEach((row) =>
    row.forEach((cell) => {
      cell.stack = makeStack(board, cell.index)
      cell.selected = cell.index === selected.index
      const stack = board.stacks[cell.index]
      if (stack) {
        const piece_id = stack[stack.length - 1]
        cell.piece_id = piece_id
        cell.player_id = board.piece_owners[piece_id]
        cell.piece_type = board.piece_types[piece_id]
      }
      show_webs.forEach((web) => {
        if (!board.layers[web][cell.index]) {
          return // no webs
        }
        if (web === 'stack' && selected.player_id === board.layers.player[cell.index]) {
          return
        }
        if (web === 'crawl') {
          if (board.stacks[cell.index] && cell.index !== selected.index) {
            // only show crawl web on the selected piece or empty squares
            return
          }
          const enemy_webs = board.layers[web][cell.index].filter(
            (i) => selected.player_id !== board.layers.player[i],
          )
          if (enemy_webs.length === 0) {
            return
          }

          const selected_webs = board.layers.crawl[selected.index] || []
          if (enemy_webs.find((i) => selected_webs.includes(i)) !== undefined) {
            web = 'crawl-gray'
          }
        }
        cell.title = webs.title[web](selected.piece_type)
        cell.web = web
      })
      if (marked[cell.index]) {
        const _i = cell.stack.length - 1
        cell.stack[_i] = cell.stack[_i] + marked[cell.index]
      }
    }),
  )

  const players = {
    1: [],
    2: [],
  }

  pieces.getAvailable(board).forEach(({ player_id, type, count }) => {
    player_id = parseInt(player_id)
    const cell = {
      stack: range(count).map((i) => _class(player_id, type, i)),
      player_id,
      piece_id: 'new',
      piece_type: type, // TODO remove drag and drop and then this can be type
      type: 'cell',
    }
    if (
      selected.piece_id === 'new' &&
      selected.piece_type === type &&
      player_id === selected.player_id
    ) {
      const _i = cell.stack.length - 1
      cell.stack[_i] = cell.stack[_i] + ' purple'
    }
    players[player_id].push(cell)
  })

  return {
    rows,
    player_1: columnize(players[1], columns),
    player_2: columnize(players[2], columns),
  }
}

const columnize = (cells, columns) => {
  const out = []
  let row = []
  out.push(row)
  while (cells.length) {
    row.push(cells.shift())
    if (row.length === columns) {
      row = []
      out.push(row)
    }
  }
  return out
}

// TODO See commit! These lines are blocking a recursion error that happens with
// everything with purple-inner (selected.chalk exists!)
let last_selected
let i_recursion
let last_marked

const getMarked = (board) => {
  const { selected } = board
  if (selected?.piece_id !== last_selected) {
    i_recursion = 0
    last_selected = selected?.piece_id
  }
  if (i_recursion > 10) {
    return last_marked
  }
  i_recursion++
  const marked = {}
  last_marked = marked
  Object.keys(board.cantmove).forEach((index) => (marked[index] = ' gray'))

  if (!selected) {
    return marked
  }

  const { piece_id, player_id } = selected

  const color = board.current_player === player_id ? ' green' : ' red'
  let indexes = []
  if (piece_id === 'new') {
    indexes = Board.moves.getPlacement(board, player_id)
  } else {
    const specials = Board.getSpecials(board, piece_id, board.special_args)
    specials.forEach((i) => (marked[i] = ' yellow'))
    if (board.special_args.length === 0) {
      indexes = Board.getMoves(board, piece_id)
    }
    if (selected.chalk) {
      Object.entries(selected.chalk).forEach(
        ([index, f]) => (marked[index] = f(marked[index] || '')),
      )
    }
  }
  indexes.forEach((i) => (marked[i] = color))
  return marked
}
