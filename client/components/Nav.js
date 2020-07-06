import React from 'react'
import { Link } from 'react-router-dom'
import css from '@unrest/css'
import withConfig from '../config'
import withBoard from '../game/withBoard'
import tutorial from '../tutorial'
import { Dropdown } from '@unrest/core'

const GameDropdown = withBoard(function GameDropdown(props) {
  const { undo, redo } = props.game
  const links = [
    {
      children: 'Undo (ctrl+z)',
      onClick: undo,
    },
    {
      children: 'Redo (ctrl+y)',
      onClick: redo,
    },
  ]
  return (
    <Dropdown links={links} title="game">
      <div className={css.dropdown.item()}>
        <withBoard.ImportLink />
      </div>
      <div className={css.dropdown.item()}>
        <withBoard.ExportLink />
      </div>
      <hr className="my-1" />
    </Dropdown>
  )
})

export default function Nav() {
  return (
    <header className={css.nav.outer()}>
      <section className={css.nav.section('left')}>
        <Link to="/" className={css.nav.brand()}>
          Hive!
        </Link>
      </section>
      <section className={css.nav.section('flex items-center')}>
        <GameDropdown />
        <Dropdown title={'config'}>
          <withConfig.Form
            className="p-4"
            customButton={true}
            autosubmit={true}
          />
        </Dropdown>
        <Dropdown title={'help'}>
          <div className={css.dropdown.item()}>
            <tutorial.NavButton />
          </div>
        </Dropdown>
        <a
          className={css.icon('github mx-2 text-blue-500')}
          href="https://github.com/chriscauley/hive.js/"
        />
      </section>
    </header>
  )
}
