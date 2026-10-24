import { useState } from 'react'
import { Scanner } from './Scanner'
import { itemLabel, buyPrice, findType } from './items'
import { TOTAL_ROUNDS, XP_THRESHOLDS, useGame } from './store'
import type { ClassName, StatKey } from './store'

const APP_VERSION = 'App v0.8'

function Counter({ label, value, onChange, hint }: {
  label: string
  value: number
  onChange: (delta: number) => void
  hint?: string
}) {
  return (
    <div className="counter sketch">
      <span className="label">{label}</span>
      <button className="btn round" onClick={() => onChange(-1)} aria-label={`decrease ${label}`}>-</button>
      <span className="value">{value}{hint}</span>
      <button className="btn round" onClick={() => onChange(1)} aria-label={`increase ${label}`}>+</button>
    </div>
  )
}

function ScanStatus({ expected }: { expected: string }) {
  const last = useGame((s) => s.lastScan)
  if (!last) return null
  const ok = last === expected
  return <p className={ok ? '' : 'error'}>Scanned: {last}{ok ? '' : ` (expected ${expected})`}</p>
}

function StartScreen() {
  const { startGame, setScan } = useGame()
  return (
    <section>
      <h1>Solo Leveling</h1>
      <p>Scan the Map 1 code on the slider to begin.</p>
      <Scanner
        onScan={(v) => {
          setScan(v)
          if (v === 'Map 1') startGame()
        }}
      />
      <ScanStatus expected="Map 1" />
      <button className="btn small" onClick={startGame}>Skip scan (testing)</button>
    </section>
  )
}

function ClassScreen() {
  const { chooseClass } = useGame()
  const classes: { name: ClassName; stats: string }[] = [
    { name: 'Warrior', stats: 'Health 5 / Attack 5 / Defense 5' },
    { name: 'Mage', stats: 'Health 5 / Attack 6 / Defense 4' },
  ]
  return (
    <section>
      <h1>Choose your class</h1>
      {classes.map((c) => (
        <button key={c.name} className="btn card sketch" onClick={() => chooseClass(c.name)}>
          <strong>{c.name}</strong>
          <span>{c.stats}</span>
        </button>
      ))}
    </section>
  )
}

function NavBar() {
  const { screen, navigate, level, pendingPoints, xp } = useGame()
  const canLevel = xp >= (XP_THRESHOLDS[level - 1] ?? Infinity) || pendingPoints > 0
  return (
    <nav className="nav">
      <button className={screen === 'main' ? 'btn small active' : 'btn small'} onClick={() => navigate('main')}>Main</button>
      <button className={screen === 'character' ? 'btn small active' : 'btn small'} onClick={() => navigate('character')}>
        Character{canLevel ? ' !' : ''}
      </button>
      <button className={screen === 'debug' ? 'btn small active' : 'btn small'} onClick={() => navigate('debug')}>Debug</button>
    </nav>
  )
}

function CombatScreen() {
  const s = useGame()
  const [roll, setRoll] = useState(1)
  const c = s.combat
  if (!c) return <section><p>No fight in progress.</p></section>
  const fighting = c.result === 'fighting'

  return (
    <section>
      <h1>{c.enemyName}</h1>
      <p>Level {c.enemyLevel} - Health {c.enemyHealth}/{c.enemyMaxHealth} - Damage {c.enemyDamage}</p>
      <p>Your health: {s.health}/{s.maxHealth} - Attack {s.attack} - Defense {c.defenseLeft}/{s.defense}</p>

      {fighting && (
        <>
          <h2>Roll your die and enter the result</h2>
          <div className="counter sketch">
            <span className="label">Die roll</span>
            <button className="btn round" onClick={() => setRoll((r) => Math.max(1, r - 1))}>-</button>
            <span className="value">{roll}</span>
            <button className="btn round" onClick={() => setRoll((r) => Math.min(6, r + 1))}>+</button>
          </div>
          <button className="btn primary" onClick={() => s.attackRoll(roll)}>
            Attack ({s.attack} + {roll} = {s.attack + roll})
          </button>
        </>
      )}

      <div className="result sketch">
        {c.log.length === 0 ? <span>The fight begins!</span> : c.log.map((line, i) => <span key={i}>{line}</span>)}
      </div>

      {c.result === 'won' && !c.boss && <button className="btn primary" onClick={s.endCombat}>Continue</button>}
      {c.result === 'won' && c.boss && <button className="btn primary" onClick={s.reset}>Play again</button>}
      {c.result === 'lost' && <button className="btn primary" onClick={s.reset}>New game</button>}
    </section>
  )
}

function MainScreen() {
  const s = useGame()
  const match = s.lastScan?.match(/^Location (\d)$/)
  const index = match ? Number(match[1]) - 1 : -1
  const place = index >= 0 ? s.locations[index] : null

  return (
    <section>
      <h1>{s.cls} - Level {s.level}</h1>
      <Counter
        label={`Rounds left (of ${TOTAL_ROUNDS})`}
        value={s.round}
        onChange={(d) => s.adjust('round', d)}
      />
      {s.round === 0 ? (
        !s.combat && <button className="btn primary" onClick={s.startBoss}>Fight boss</button>
      ) : (
        <h2>Scan a location</h2>
      )}
      {s.combat && (
        <button className="btn primary" onClick={() => s.navigate('combat')}>Resume fight</button>
      )}
      {s.round > 0 && <Scanner onScan={s.scanLocation} />}
      {s.lastScan && (
        <div className="result sketch">
          {place ? (
            <>
              <strong>{place}</strong>
              {place === 'Town' ? (
                <>
                  <span>Visit the shop, blacksmith or inn.</span>
                  <button className="btn" onClick={() => s.navigate('shop')}>Enter shop</button>
                </>
              ) : (
                <span>An enemy appears!</span>
              )}
            </>
          ) : (
            <span>Unknown code: {s.lastScan}</span>
          )}
        </div>
      )}
      {s.round > 0 && (
        <div className="row">
          {[1, 2, 3, 4].map((n) => (
            <button key={n} className="btn small" onClick={() => s.scanLocation(`Location ${n}`)}>Test L{n}</button>
          ))}
        </div>
      )}
      <button className="btn small" onClick={() => confirm('Start over?') && s.reset()}>New game</button>
    </section>
  )
}

function CharacterScreen() {
  const s = useGame()
  const threshold = XP_THRESHOLDS[s.level - 1]
  const ready = threshold !== undefined && s.xp >= threshold
  const stats: { key: StatKey; label: string; value: string }[] = [
    { key: 'health', label: 'Health', value: `${s.health}/${s.maxHealth}` },
    { key: 'attack', label: 'Attack', value: String(s.attack) },
    { key: 'defense', label: 'Defense', value: String(s.defense) },
  ]

  return (
    <section>
      <h1>{s.cls} - Level {s.level}</h1>

      <Counter label="Health" value={s.health} hint={`/${s.maxHealth}`} onChange={(d) => s.adjust('health', d)} />
      <Counter label="Defense (current)" value={s.defense} onChange={(d) => s.adjust('defense', d)} />

      <h2>Experience</h2>
      <Counter label="XP" value={s.xp} hint={threshold ? `/${threshold}` : ' (max)'} onChange={(d) => s.adjust('xp', d)} />
      <button className="btn primary" disabled={!ready} onClick={s.levelUp}>
        {ready ? 'Level up!' : 'Not enough XP'}
      </button>

      <h2>Points to assign: {s.pendingPoints}</h2>
      {stats.map((st) => (
        <div key={st.key} className="counter sketch">
          <span className="label">{st.label}</span>
          <span className="value">{st.value}</span>
          <button className="btn round" disabled={s.pendingPoints < 1} onClick={() => s.assignPoint(st.key)} aria-label={`add to ${st.label}`}>+</button>
        </div>
      ))}
    </section>
  )
}

function ShopScreen() {
  const s = useGame()
  return (
    <section>
      <h1>Shop</h1>
      <button className="btn primary" onClick={s.leaveShop}>Leave shop</button>
      <p>Gold: {s.gold}</p>
      {s.stock.length === 0 && <p>Sold out.</p>}
      {s.stock.map((item) => {
        const price = buyPrice(item.tier)
        const type = findType(item.type)
        return (
          <div key={item.id} className="counter sketch">
            <span className="label">
              {itemLabel(item)}
              <small className="sub">{type ? `${type.owner} - +${item.tier} ${type.stat}` : ''}</small>
            </span>
            <button className="btn" disabled={s.gold < price} onClick={() => s.buy(item.id, price)}>
              Buy {price}g
            </button>
          </div>
        )
      })}
      <button className="btn small" onClick={s.restock}>Restock (testing)</button>

      <h2>Backpack ({s.backpack.length})</h2>
      {s.backpack.length === 0 && <p>Empty.</p>}
      <ul>
        {s.backpack.map((item) => <li key={item.id}>{itemLabel(item)}</li>)}
      </ul>
    </section>
  )
}

function DebugScreen() {
  const s = useGame()
  const steps = [-100, -10, -1, 1, 10, 100]
  return (
    <section>
      <h1>Debug</h1>
      <div className="counter sketch">
        <span className="label">Gold</span>
        <span className="value">{s.gold}</span>
      </div>
      <div className="row">
        {steps.map((d) => (
          <button key={d} className="btn" onClick={() => s.adjust('gold', d)}>{d > 0 ? `+${d}` : d}</button>
        ))}
      </div>

      <div className="counter sketch">
        <span className="label">XP</span>
        <span className="value">{s.xp}</span>
      </div>
      <div className="row">
        {steps.map((d) => (
          <button key={d} className="btn" onClick={() => s.adjust('xp', d)}>{d > 0 ? `+${d}` : d}</button>
        ))}
      </div>
    </section>
  )
}

export default function App() {
  const { phase, screen } = useGame()
  return (
    <main>
      {phase === 'start' && <StartScreen />}
      {phase === 'class' && <ClassScreen />}
      {phase === 'play' && (
        <>
          <NavBar />
          {screen === 'main' && <MainScreen />}
          {screen === 'character' && <CharacterScreen />}
          {screen === 'shop' && <ShopScreen />}
          {screen === 'combat' && <CombatScreen />}
          {screen === 'debug' && <DebugScreen />}
        </>
      )}
      <footer>{APP_VERSION}</footer>
    </main>
  )
}
