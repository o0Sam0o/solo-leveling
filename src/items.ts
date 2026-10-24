export type Slot = 'Right hand' | 'Left hand' | 'Head' | 'Body' | 'Hands' | 'Feet'
export type Owner = 'Warrior' | 'Mage' | 'Neutral'
export type Stat = 'Attack' | 'Defense'

export interface ItemType {
  slot: Slot
  name: string
  owner: Owner
  stat: Stat
}

export const TIERS = [
  { tier: 1, name: 'Rusty' },
  { tier: 2, name: 'Steel' },
  { tier: 3, name: 'Runed' },
]

export const ITEM_TYPES: ItemType[] = [
  { slot: 'Right hand', name: 'Sword', owner: 'Warrior', stat: 'Attack' },
  { slot: 'Right hand', name: 'Scimitar', owner: 'Warrior', stat: 'Attack' },
  { slot: 'Right hand', name: 'Staff', owner: 'Mage', stat: 'Attack' },
  { slot: 'Right hand', name: 'Wand', owner: 'Mage', stat: 'Attack' },
  { slot: 'Right hand', name: 'Knife', owner: 'Neutral', stat: 'Attack' },
  { slot: 'Left hand', name: 'Shield', owner: 'Warrior', stat: 'Defense' },
  { slot: 'Left hand', name: 'Buckler', owner: 'Warrior', stat: 'Defense' },
  { slot: 'Left hand', name: 'Orb', owner: 'Mage', stat: 'Attack' },
  { slot: 'Left hand', name: 'Book', owner: 'Mage', stat: 'Defense' },
  { slot: 'Head', name: 'Helm', owner: 'Warrior', stat: 'Defense' },
  { slot: 'Head', name: 'Hood', owner: 'Mage', stat: 'Defense' },
  { slot: 'Head', name: 'Cap', owner: 'Neutral', stat: 'Defense' },
  { slot: 'Body', name: 'Plate', owner: 'Warrior', stat: 'Defense' },
  { slot: 'Body', name: 'Robe', owner: 'Mage', stat: 'Defense' },
  { slot: 'Body', name: 'Tunic', owner: 'Neutral', stat: 'Defense' },
  { slot: 'Hands', name: 'Gauntlets', owner: 'Warrior', stat: 'Defense' },
  { slot: 'Hands', name: 'Mitts', owner: 'Mage', stat: 'Defense' },
  { slot: 'Hands', name: 'Gloves', owner: 'Neutral', stat: 'Defense' },
  { slot: 'Feet', name: 'Greaves', owner: 'Warrior', stat: 'Defense' },
  { slot: 'Feet', name: 'Sandals', owner: 'Mage', stat: 'Defense' },
  { slot: 'Feet', name: 'Boots', owner: 'Neutral', stat: 'Defense' },
]

export interface Item {
  id: string
  type: string
  tier: number
}

export const tierName = (tier: number) => TIERS.find((t) => t.tier === tier)?.name ?? ''
export const itemLabel = (item: Item) => `${tierName(item.tier)} ${item.type}`
export const buyPrice = (tier: number) => 2 * tier
export const sellPrice = (tier: number) => tier

export const findType = (name: string) => ITEM_TYPES.find((t) => t.name === name)
