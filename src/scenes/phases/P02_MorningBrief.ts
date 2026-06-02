import Phaser from 'phaser'
import { EGA } from '../../palette'
import { print } from '../../utils/font'

const W = 320, H = 200
const DAY = 7

const ACTIONS = [
  { label: 'COUNCIL VISIT',   color: EGA.BLUE,         desc: 'Formal. Moves deal score.' },
  { label: 'COLLECTIVE MTG',  color: EGA.GREEN,        desc: 'Chaotic. Builds crowd trust.' },
  { label: 'ELDER MEETING',   color: EGA.BROWN,        desc: 'Slow. High memory stakes.' },
  { label: 'BOND WITH CREW',  color: EGA.LIGHT_CYAN,   desc: 'Loyalty +. May unlock secrets.' },
  { label: 'SCOUT AREA',      color: EGA.LIGHT_GRAY,   desc: 'Intel +1. Find hidden angles.' },
  { label: 'BUILD WORK',      color: EGA.YELLOW,       desc: 'Installation progress +15.' },
  { label: 'REST',            color: EGA.DARK_GRAY,    desc: 'Morale recovery. Crew morale +.' },
  { label: 'FREE TIME',       color: EGA.LIGHT_MAGENTA, desc: 'Unpredictable. Something happens.' },
]

export class P02_MorningBrief extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics
  private slots = [0, 3, 5]  // default actions per slot
  private activeSlot = 0
  private confirmed = false
  private up!: Phaser.Input.Keyboard.Key
  private dn!: Phaser.Input.Keyboard.Key
  private lt!: Phaser.Input.Keyboard.Key
  private rt!: Phaser.Input.Keyboard.Key
  private ok!: Phaser.Input.Keyboard.Key

  constructor() { super({ key: 'P02' }) }

  create() {
    this.g = this.add.graphics()
    this.slots = [0, 3, 5]
    this.activeSlot = 0
    this.confirmed = false
    const kb = this.input.keyboard!
    this.up = kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
    this.dn = kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN)
    this.lt = kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT)
    this.rt = kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)
    this.ok = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => this.scene.start('PhaseSelector'))
  }

  update() {
    const g = this.g
    g.clear()

    this.handleInput()

    // Background
    g.fillStyle(EGA.BLACK); g.fillRect(0, 0, W, H)
    // Header
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(0, 0, W, 14)
    g.fillStyle(EGA.YELLOW); print(g, `DAY ${DAY} OF 30 — MORNING BRIEF`, 6, 3)

    if (this.confirmed) {
      this.drawConfirmed()
    } else {
      this.drawSlots()
      this.drawActionList()
      this.drawHint()
    }
  }

  private handleInput() {
    if (this.confirmed) return
    if (Phaser.Input.Keyboard.JustDown(this.lt)) this.activeSlot = Math.max(0, this.activeSlot - 1)
    if (Phaser.Input.Keyboard.JustDown(this.rt)) this.activeSlot = Math.min(2, this.activeSlot + 1)
    if (Phaser.Input.Keyboard.JustDown(this.up))
      this.slots[this.activeSlot] = (this.slots[this.activeSlot] - 1 + ACTIONS.length) % ACTIONS.length
    if (Phaser.Input.Keyboard.JustDown(this.dn))
      this.slots[this.activeSlot] = (this.slots[this.activeSlot] + 1) % ACTIONS.length
    if (Phaser.Input.Keyboard.JustDown(this.ok)) this.confirmed = true
  }

  private drawSlots() {
    const g = this.g
    g.fillStyle(EGA.CYAN); print(g, "TODAY'S 3 ACTIONS:", 10, 20)

    const slotX = [10, 112, 214]
    this.slots.forEach((actionIdx, i) => {
      const x = slotX[i], action = ACTIONS[actionIdx]
      const sel = i === this.activeSlot

      if (sel) {
        g.fillStyle(action.color, 0.2); g.fillRect(x, 32, 96, 80)
        g.lineStyle(2, EGA.YELLOW); g.strokeRect(x, 32, 96, 80)
      } else {
        g.lineStyle(1, EGA.DARK_GRAY); g.strokeRect(x, 32, 96, 80)
      }

      // Slot number
      g.fillStyle(sel ? EGA.YELLOW : EGA.DARK_GRAY)
      print(g, `SLOT ${i + 1}`, x + 4, 36)

      // Action name (word wrap at 8 chars)
      g.fillStyle(action.color)
      const words = action.label.split(' ')
      words.forEach((w, wi) => print(g, w, x + 4, 50 + wi * 14))

      // Arrows for selected slot
      if (sel) {
        g.fillStyle(EGA.YELLOW)
        print(g, '^ ^', x + 30, 36)
        print(g, 'v v', x + 30, 104)
      }
    })

    // Active slot description
    const active = ACTIONS[this.slots[this.activeSlot]]
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(0, 118, W, 26)
    g.fillStyle(EGA.WHITE); print(g, active.desc, 10, 124)
  }

  private drawActionList() {
    const g = this.g
    g.fillStyle(EGA.DARK_GRAY); print(g, 'ALL ACTIONS:', 10, 148, 1)
    ACTIONS.forEach((a, i) => {
      const isCurrent = this.slots[this.activeSlot] === i
      g.fillStyle(isCurrent ? EGA.YELLOW : EGA.DARK_GRAY)
      print(g, `${i === this.slots[0] ? '1' : i === this.slots[1] ? '2' : i === this.slots[2] ? '3' : ' '} ${a.label}`, 10, 156 + i * 8, 1)
    })
  }

  private drawHint() {
    const g = this.g
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(0, 190, W, 10)
    g.fillStyle(EGA.DARK_GRAY)
    print(g, '[</> SLOT  [^/v] ACTION  [SPACE] CONFIRM', 6, 191, 1)
  }

  private drawConfirmed() {
    const g = this.g
    g.fillStyle(EGA.BLACK); g.fillRect(0, 20, W, 170)
    g.fillStyle(EGA.YELLOW); print(g, 'DAY PLAN LOCKED.', 60, 40)
    g.fillStyle(EGA.WHITE); print(g, 'YOUR SCHEDULE:', 60, 58)
    this.slots.forEach((ai, i) => {
      const a = ACTIONS[ai]
      g.fillStyle(a.color)
      print(g, `${i + 1}. ${a.label}`, 50, 76 + i * 22)
      g.fillStyle(EGA.LIGHT_GRAY)
      print(g, a.desc, 50, 88 + i * 22, 1)
    })
    g.fillStyle(EGA.DARK_GRAY); print(g, '[ESC] BACK TO SELECTOR', 60, 162)
  }
}
