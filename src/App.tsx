import { useEffect, useState } from 'react'
import { Scanner } from './Scanner'
import { itemLabel, buyPrice, findType } from './items'
import { XP_THRESHOLDS, useGame } from './store'
import type { ClassName, StatKey } from './store'

const GAME_NAME = 'Amberfall'
const APP_VERSION = 'App v0.29'
const STAGE_W = 1080
const STAGE_H = 1920

// Scale the fixed 1080x1920 stage to fit the screen, centered.
function useStageScale() {
  const calc = () => {
    const scale = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H)
    return {
      scale,
      x: (window.innerWidth - STAGE_W * scale) / 2,
      y: (window.innerHeight - STAGE_H * scale) / 2,
    }
  }
  const [t, setT] = useState(calc)
  useEffect(() => {
    const onResize = () => setT(calc())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return t
}

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
      <h1>{GAME_NAME}</h1>
      <div className="center-block">
        <p>Scan the code on the slider to begin.</p>
        <Scanner
          label="Scan Map to Start"
          onScan={(v) => {
            setScan(v)
            if (v === 'Map 1') startGame()
          }}
        />
      </div>
      <div className="bottom-note"><ScanStatus expected="Map 1" /></div>
      <button className="btn small bottom-action" onClick={startGame}>Skip scan (testing)</button>
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

function StatHeader() {
  const s = useGame()
  const inFight = s.combat?.result === 'fighting' || s.combat?.result === 'won'
  const defense = inFight && s.combat ? s.combat.defenseLeft : s.defense
  return (
    <div className="stat-header">
      <div className="hero-id">{s.cls} Level {s.level}</div>
      <div className="hero-stats">
        <span>Health {s.health}</span>
        <span>Attack {s.attack}</span>
        <span>Defense {defense}</span>
      </div>
    </div>
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
      <div className="stat-header">
        <div className="hero-id">{c.enemyName} Level {c.enemyLevel}</div>
        <div className="hero-stats">
          <span>Health {c.enemyHealth}/{c.enemyMaxHealth}</span>
          <span>Damage {c.enemyDamage}</span>
        </div>
      </div>

      {fighting && (
        <>
          <h2>Your attack</h2>
          <ol className="steps">
            <li>Roll the die.</li>
            <li>Enter your roll below.</li>
            <li>Tap Attack.</li>
          </ol>
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

      {c.log.length > 0 && (
        <div className="result sketch">
          {c.log.map((line, i) => <span key={i}>{line}</span>)}
        </div>
      )}

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
      <p className="center">Rounds left: {s.round}</p>
      {s.round === 0 ? (
        !s.combat && <button className="btn primary" onClick={s.startBoss}>Fight boss</button>
      ) : (
        <>
          <h2>Your turn</h2>
          <ol className="steps">
            <li>Roll the die.</li>
            <li>Slide the slider to your number.</li>
            <li>Scan the code you uncover.</li>
          </ol>
        </>
      )}
      {s.combat && (
        <button className="btn primary" onClick={() => s.navigate('combat')}>Resume fight</button>
      )}
      {s.round > 0 && <Scanner label="Scan a location" onScan={s.scanLocation} />}
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
        <div className="row center-row">
          {[1, 2, 3, 4].map((n) => (
            <button key={n} className="btn small" onClick={() => s.scanLocation(`Location ${n}`)}>Test L{n}</button>
          ))}
        </div>
      )}
      <div className="bottom-stack">
        <button className="btn small" onClick={() => s.navigate('debug')}>Debug</button>
        <button className="btn small" onClick={() => confirm('Start over?') && s.reset()}>New game</button>
      </div>
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
      <h1>Character</h1>

      <div className="counter sketch">
        <span className="label">Health</span>
        <span className="value">{s.health}/{s.maxHealth}</span>
      </div>
      <div className="counter sketch">
        <span className="label">Defense</span>
        <span className="value">{s.defense}</span>
      </div>

      <h2>Experience</h2>
      <div className="counter sketch">
        <span className="label">XP</span>
        <span className="value">{s.xp}{threshold ? `/${threshold}` : ' (max)'}</span>
      </div>
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
      <Counter label="Rounds left" value={s.round} onChange={(d) => s.adjust('round', d)} />
      <Counter label="Health" value={s.health} hint={`/${s.maxHealth}`} onChange={(d) => s.adjust('health', d)} />
      <Counter label="Defense" value={s.defense} onChange={(d) => s.adjust('defense', d)} />
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
  const { scale, x, y } = useStageScale()
  return (
    <div className="stage" style={{ transform: `translate(${x}px, ${y}px) scale(${scale})` }}>
    <main>
      {phase === 'start' && <StartScreen />}
      {phase === 'class' && <ClassScreen />}
      {phase === 'play' && (
        <>
          <StatHeader />
          {screen === 'combat' ? <hr className="divider" /> : <NavBar />}
          {screen === 'main' && <MainScreen />}
          {screen === 'character' && <CharacterScreen />}
          {screen === 'shop' && <ShopScreen />}
          {screen === 'combat' && <CombatScreen />}
          {screen === 'debug' && <DebugScreen />}
        </>
      )}
      <footer>{APP_VERSION}</footer>
    </main>
    </div>
  )
}
