import Phaser from 'phaser'
import { EGA } from '../../palette'
import { print } from '../../utils/font'

const W = 320, H = 200

// Each sentence option: [text, councilDelta, collectiveDelta, eldersDelta]
const SLOTS = [
  {
    label: 'OPENING',
    opts: [
      { text: 'WE CAME TO LISTEN.', d: [5, 8, 6] },
      { text: 'WE CAME TO BUILD.', d: [8, 5, 2] },
      { text: 'WE CAME TO CONNECT.', d: [3, 10, 8] },
      { text: 'WE CAME TO HELP.', d: [6, 6, 4] },
    ],
  },
  {
    label: 'CORE MESSAGE',
    opts: [
      { text: 'THIS SPACE IS EVERYONES.', d: [2, 10, 8] },
      { text: 'THIS DRIVES GROWTH.', d: [10, 3, 1] },
      { text: 'THIS HONORS YOUR HISTORY.', d: [2, 4, 12] },
      { text: 'THIS IS FOR YOUR CHILDREN.', d: [5, 8, 6] },
    ],
  },
  {
    label: 'CLOSE',
    opts: [
      { text: 'WE NEED YOUR PERMISSION.', d: [10, 3, 5] },
      { text: 'WE NEED YOUR STORIES.', d: [3, 5, 10] },
      { text: 'WE NEED YOUR ENERGY.', d: [4, 10, 4] },
      { text: 'WE NEED YOUR TRUST.', d: [6, 6, 8] },
    ],
  },
]

const BASE = [25, 35, 20]
const MAX = 100

export class P12_PublicEvent extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics
  private slotIdx = 0
  private optIdxs = [0, 0, 0]
  private bars = [...BASE]
  private delivered = false
  private up!: Phaser.Input.Keyboard.Key
  private dn!: Phaser.Input.Keyboard.Key
  private rt!: Phaser.Input.Keyboard.Key
  private lt!: Phaser.Input.Keyboard.Key
  private ok!: Phaser.Input.Keyboard.Key

  constructor() { super({ key: 'P12' }) }

  create() {
    this.g = this.add.graphics()
    this.slotIdx = 0; this.optIdxs = [0, 0, 0]; this.bars = [...BASE]; this.delivered = false
    const kb = this.input.keyboard!
    this.up = kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
    this.dn = kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN)
    this.rt = kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)
    this.lt = kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT)
    this.ok = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => this.scene.start('PhaseSelector'))
  }

  update(time: number) {
    const g = this.g
    g.clear()
    this.handleInput()

    g.fillStyle(EGA.BLACK); g.fillRect(0, 0, W, H)
    // Stage background
    g.fillStyle(0x111133); g.fillRect(0, 0, W, 80)
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(0, 60, W, 8) // stage edge
    // Podium
    g.fillStyle(EGA.BROWN); g.fillRect(140, 42, 40, 22)
    // Ren at podium
    g.fillStyle(EGA.LIGHT_BLUE); g.fillRect(147, 24, 26, 22)
    g.fillStyle(EGA.CYAN); g.fillRect(153, 16, 14, 12)
    // Spotlights
    g.fillStyle(EGA.YELLOW, 0.06)
    g.fillTriangle(80, 0, 160, 70, 20, 70)
    g.fillStyle(EGA.YELLOW, 0.06)
    g.fillTriangle(240, 0, 320, 70, 160, 70)

    // Crowd silhouettes
    const crowd = [14, 30, 50, 68, 95, 108, 125, 200, 216, 235, 250, 265, 285, 300]
    const pulse = Math.sin(time * 0.003) > 0.3
    crowd.forEach((cx, i) => {
      g.fillStyle(i % 3 === 0 && pulse ? EGA.DARK_GRAY : 0x222222)
      g.fillRect(cx, 50, 8, 20); g.fillRect(cx + 1, 43, 6, 10)
    })

    // Speech builder
    g.fillStyle(EGA.BLACK); g.fillRect(0, 78, W, 78)
    g.lineStyle(1, EGA.DARK_GRAY); g.lineBetween(0, 78, W, 78)
    g.fillStyle(EGA.YELLOW); print(g, 'YOUR SPEECH:', 6, 82)

    SLOTS.forEach((slot, si) => {
      const sel = si === this.slotIdx && !this.delivered
      const opt = slot.opts[this.optIdxs[si]]
      const y = 94 + si * 18

      if (sel) {
        g.fillStyle(EGA.DARK_GRAY); g.fillRect(4, y - 1, W - 8, 16)
        g.lineStyle(1, EGA.YELLOW); g.strokeRect(4, y - 1, W - 8, 16)
        g.fillStyle(EGA.YELLOW); print(g, `${si + 1}. ${opt.text}`, 8, y + 1, 1)
        g.fillStyle(EGA.DARK_GRAY); print(g, '[^/v]', W - 38, y + 1, 1)
      } else {
        g.fillStyle(si < this.slotIdx ? EGA.LIGHT_GRAY : EGA.DARK_GRAY)
        print(g, `${si + 1}. ${opt.text}`, 8, y + 1, 1)
      }
    })

    // Reaction bars
    g.fillStyle(EGA.BLACK); g.fillRect(0, 152, W, 48)
    g.lineStyle(1, EGA.CYAN); g.lineBetween(0, 152, W, 152)

    // Live preview bars
    const preview = this.calcBars()
    const factions = ['COUNCIL', 'CROWD', 'ELDERS']
    const colors = [EGA.BLUE, EGA.GREEN, EGA.BROWN]
    factions.forEach((name, fi) => {
      const x = 6 + fi * 104
      g.fillStyle(colors[fi]); print(g, name, x, 156, 1)
      g.fillStyle(EGA.DARK_GRAY); g.fillRect(x, 165, 90, 5)
      g.fillStyle(colors[fi]); g.fillRect(x, 165, Math.floor(90 * preview[fi] / MAX), 5)
      g.fillStyle(EGA.LIGHT_GRAY); print(g, String(preview[fi]), x + 72, 156, 1)
    })

    if (this.delivered) {
      g.fillStyle(EGA.YELLOW); print(g, 'SPEECH DELIVERED!', 80, 174)
      g.fillStyle(EGA.DARK_GRAY); print(g, '[ESC] BACK', 120, 185, 1)
    } else {
      g.fillStyle(EGA.DARK_GRAY)
      const hint = this.slotIdx < 2 ? '[>] NEXT LINE  [SPACE] DELIVER  [ESC] BACK'
        : '[SPACE] DELIVER SPEECH   [ESC] BACK'
      print(g, hint, 6, 185, 1)
    }
  }

  private handleInput() {
    if (this.delivered) return
    if (Phaser.Input.Keyboard.JustDown(this.up))
      this.optIdxs[this.slotIdx] = (this.optIdxs[this.slotIdx] - 1 + 4) % 4
    if (Phaser.Input.Keyboard.JustDown(this.dn))
      this.optIdxs[this.slotIdx] = (this.optIdxs[this.slotIdx] + 1) % 4
    if (Phaser.Input.Keyboard.JustDown(this.rt) && this.slotIdx < 2)
      this.slotIdx++
    if (Phaser.Input.Keyboard.JustDown(this.lt) && this.slotIdx > 0)
      this.slotIdx--
    if (Phaser.Input.Keyboard.JustDown(this.ok)) {
      const final = this.calcBars()
      this.bars = final
      this.delivered = true
    }
  }

  private calcBars(): number[] {
    const bars = [...BASE]
    SLOTS.forEach((slot, si) => {
      const d = slot.opts[this.optIdxs[si]].d
      for (let i = 0; i < 3; i++) bars[i] = Math.min(MAX, bars[i] + d[i])
    })
    return bars
  }
}
