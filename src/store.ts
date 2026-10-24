import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ITEM_TYPES } from './items'
import type { Item } from './items'

export type ClassName = 'Warrior' | 'Mage'
export type Phase = 'start' | 'class' | 'play'
export type Screen = 'main' | 'character' | 'shop' | 'debug' | 'combat'
export type StatKey = 'health' | 'attack' | 'defense'

export interface Combat {
  enemyName: string
  enemyLevel: number
  enemyHealth: number
  enemyMaxHealth: number
  enemyDamage: number
  rounds: number
  log: string[]
  result: 'fighting' | 'won' | 'lost'
  xpReward: number
  goldReward: number
  boss?: boolean
  defenseLeft: number
}

// health / attack / defense
const CLASS_STATS: Record<ClassName, [number, number, number]> = {
  Warrior: [5, 5, 5],
  Mage: [5, 6, 4],
}

export const XP_THRESHOLDS = [10, 15, 25, 35, 50, 75, 115, 170]
export const TOTAL_ROUNDS = 10
export const POINTS_PER_LEVEL = 1

const WILDERNESS = ['Forest', 'Mountain', 'Plains']

function shuffle<T>(items: T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Location 1 is always the town; the rest are randomized each game.
function newLocations(): string[] {
  return ['Town', ...shuffle(WILDERNESS)]
}

let nextId = Date.now()
const makeItem = (type: string, tier: number): Item => ({ id: String(nextId++), type, tier })

// Store stock: 3 random items, Steel or Runed only (no Rusty).
function rollStock(): Item[] {
  return shuffle(ITEM_TYPES).slice(0, 3).map((t) => makeItem(t.name, 2 + Math.floor(Math.random() * 2)))
}

const ENEMY_TYPES = ['Orc', 'Wolf']

function newCombat(place: string, level: number, defense: number): Combat {
  const type = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)]
  return {
    defenseLeft: defense,
    enemyName: `${place} ${type}`,
    enemyLevel: level,
    enemyHealth: level,
    enemyMaxHealth: level,
    enemyDamage: level,
    rounds: 0,
    log: [],
    result: 'fighting',
    xpReward: 2 * level,
    goldReward: level,
  }
}

function newBoss(level: number, defense: number): Combat {
  const health = 10 + 5 * level
  return {
    defenseLeft: defense,
    enemyName: 'The Boss',
    enemyLevel: level + 1,
    enemyHealth: health,
    enemyMaxHealth: health,
    enemyDamage: level + 2,
    rounds: 0,
    log: [],
    result: 'fighting',
    xpReward: 0,
    goldReward: 0,
    boss: true,
  }
}

interface GameState {
  combat: Combat | null
  scanLocation: (value: string) => void
  attackRoll: (roll: number) => void
  endCombat: () => void
  startBoss: () => void
  leaveShop: () => void
  phase: Phase
  screen: Screen
  cls: ClassName | null
  locations: string[]
  level: number
  xp: number
  gold: number
  health: number
  maxHealth: number
  attack: number
  defense: number
  round: number
  pendingPoints: number
  backpack: Item[]
  stock: Item[]
  lastScan: string | null
  startGame: () => void
  chooseClass: (cls: ClassName) => void
  setScan: (value: string) => void
  navigate: (screen: Screen) => void
  adjust: (key: 'health' | 'xp' | 'gold' | 'attack' | 'defense' | 'round', delta: number) => void
  levelUp: () => void
  assignPoint: (stat: StatKey) => void
  restock: () => void
  buy: (id: string, price: number) => boolean
  reset: () => void
}

const initial = {
  phase: 'start' as Phase,
  screen: 'main' as Screen,
  cls: null as ClassName | null,
  locations: newLocations(),
  level: 1,
  xp: 0,
  gold: 0,
  health: 0,
  maxHealth: 0,
  attack: 0,
  defense: 0,
  round: TOTAL_ROUNDS,
  pendingPoints: 0,
  backpack: [] as Item[],
  stock: [] as Item[],
  combat: null as Combat | null,
  lastScan: null as string | null,
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      ...initial,
      startGame: () => set({ phase: 'class', locations: newLocations() }),
      chooseClass: (cls) => {
        const [health, attack, defense] = CLASS_STATS[cls]
        set({ phase: 'play', screen: 'main', cls, health, maxHealth: health, attack, defense, stock: rollStock() })
      },
      setScan: (value) => set({ lastScan: value }),
      // Every location scan uses up a turn; wilderness scans start combat.
      scanLocation: (value) => {
        const s = get()
        set({ lastScan: value })
        const match = value.match(/^Location (\d)$/)
        if (!match || s.round < 1 || s.combat) return
        const place = s.locations[Number(match[1]) - 1]
        if (!place) return
        const round = s.round - 1
        const patch: Partial<GameState> = { round }
        if (place !== 'Town') {
          patch.combat = newCombat(place, s.level, s.defense)
          patch.screen = 'combat'
        }
        set(patch)
      },
      attackRoll: (roll) => {
        const s = get()
        const c = s.combat
        if (!c || c.result !== 'fighting') return
        const total = s.attack + roll
        const enemyHealth = Math.max(0, c.enemyHealth - total)
        const log = [...c.log, `You hit for ${s.attack} + ${roll} = ${total}.`]

        if (enemyHealth === 0) {
          log.push(c.boss ? 'The Boss is defeated! You win the game!' : `${c.enemyName} is defeated! +${c.xpReward} XP, +${c.goldReward} gold.`)
          set({
            xp: s.xp + c.xpReward,
            gold: s.gold + c.goldReward,
            combat: { ...c, enemyHealth, rounds: c.rounds + 1, log, result: 'won' },
          })
          return
        }

        // Defense soaks damage during this fight only; it replenishes for the next one.
        const blocked = Math.min(c.defenseLeft, c.enemyDamage)
        const taken = c.enemyDamage - blocked
        const health = Math.max(0, s.health - taken)
        log.push(`${c.enemyName} hits for ${c.enemyDamage}; defense blocks ${blocked}, you lose ${taken} health.`)
        const lost = health === 0
        if (lost) log.push('You have fallen. Game over.')
        set({
          health,
          combat: { ...c, enemyHealth, defenseLeft: c.defenseLeft - blocked, rounds: c.rounds + 1, log, result: lost ? 'lost' : 'fighting' },
        })
      },
      startBoss: () => {
        const s = get()
        if (s.round === 0 && !s.combat) set({ combat: newBoss(s.level, s.defense), screen: 'combat' })
      },
      endCombat: () => set({ combat: null, screen: 'main', lastScan: null }),
      leaveShop: () => set({ screen: 'main', lastScan: null }),
      navigate: (screen) => set({ screen }),
      adjust: (key, delta) => {
        const s = get()
        let next = Math.max(0, s[key] + delta)
        if (key === 'health') next = Math.min(next, s.maxHealth)
        set({ [key]: next } as Partial<GameState>)
      },
      levelUp: () => {
        const s = get()
        const threshold = XP_THRESHOLDS[s.level - 1]
        if (threshold === undefined || s.xp < threshold) return
        set({ level: s.level + 1, xp: s.xp - threshold, pendingPoints: s.pendingPoints + POINTS_PER_LEVEL })
      },
      assignPoint: (stat) => {
        const s = get()
        if (s.pendingPoints < 1) return
        const patch: Partial<GameState> = { pendingPoints: s.pendingPoints - 1 }
        if (stat === 'health') {
          patch.maxHealth = s.maxHealth + 1
          patch.health = s.health + 1
        } else {
          patch[stat] = s[stat] + 1
        }
        set(patch)
      },
      restock: () => set({ stock: rollStock() }),
      buy: (id, price) => {
        const s = get()
        const item = s.stock.find((i) => i.id === id)
        if (!item || s.gold < price) return false
        set({ gold: s.gold - price, backpack: [...s.backpack, item], stock: s.stock.filter((i) => i.id !== id) })
        return true
      },
      reset: () => set({ ...initial, locations: newLocations() }),
    }),
    { name: 'solo-leveling-save' },
  ),
)
