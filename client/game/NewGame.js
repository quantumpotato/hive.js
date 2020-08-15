import React from 'react'
import Form from '@unrest/react-jsonschema-form'

import { unslugify } from '../tutorial/Component'
import useGame from '../game/useGame'
import Board from './Board'
import pieces from './pieces'

const piece_enum = Object.keys(pieces.piece_sets)
const enumNames = piece_enum.map((name) => {
  const help = Object.keys(pieces.piece_sets[name].pieces).map((n) => {
    const count = pieces.piece_sets[name].pieces[n]
    return `${count}x${unslugify(n)}`
  })
  return (
    <span key={name}>
      {unslugify(name)}
      <i className="fa fa-question-circle-o ml-2" data-tip={help.join(', ')} />
    </span>
  )
})

const getSchema = (room_name) => {
  const schema = {
    type: 'object',
    properties: {
      piece_sets: {
        type: 'array',
        title: 'Piece Sets',
        items: {
          type: 'string',
          enum: piece_enum,
          enumNames,
        },
        uniqueItems: true,
        default: ['standard'],
      },
      variants: {
        title: 'Variants',
        type: 'object',
        properties: {
          spiderwebs: {
            title: 'Spider Web',
            type: 'boolean',
          },
          super_grasshopper: {
            title: 'Super Grasshoppper',
            type: 'boolean',
          },
          no_rules: {
            title: 'No Rules',
            type: 'boolean',
          },
        },
      },
    },
  }
  if (room_name !== 'local') {
    schema.properties.private = {
      title: 'Private',
      type: 'boolean',
    }
  }
  return schema
}

const _help = (s) => <i className="fa fa-question-circle-o" data-tip={s} />

const uiSchema = {
  piece_sets: {
    'ui:widget': 'checkboxes',
  },
  private: {
    'ui:help': _help(
      'Private games will not appear in the list, but players can still join if they have the url.',
    ),
  },
  variants: {
    no_rules: {
      classNames: 'has-help',
      'ui:help': _help(
        'UI will still display legal moves, but any piece can be moved to any space.',
      ),
    },
    spiderwebs: {
      classNames: 'has-help',
      'ui:help': _help('Ants stop moving if they collide with an enemy spider.'),
    },
    super_grasshopper: {
      classNames: 'has-help',
      'ui:help': _help('The grasshopper can make unlimited jumps per turn.'),
    },
  },
}

export default function newGame({ room_name }) {
  const game = useGame()
  const onSubmit = (formData) => {
    const { variants, ...rules } = formData
    Object.assign(rules, variants)
    game.setRoomBoard(room_name, Board.new({ rules, room_name }))
  }
  return (
    <div className="flex-grow flex items-center justify-center">
      <div className="border p-4 mt-8 shadowed max-w-md mx-2">
        <Form schema={getSchema(room_name)} uiSchema={uiSchema} onSubmit={onSubmit} />
      </div>
    </div>
  )
}
