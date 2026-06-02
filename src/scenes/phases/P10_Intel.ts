import Phaser from 'phaser'
import { EGA } from '../../palette'
import { print } from '../../utils/font'

const W = 320, H = 200
const MAX_TOKENS = 3

const OPTIONS = [
  {
    label: 'BRIBE COUNCIL',
    cost: 1,
    desc: 'Council trust +15 next visit.',
    detail: 'Tane owes someone a favor. Use it.',
    color: EGA.BLUE,
    effect: 'COUNCIL TRUST +15',
  },
  {
    label: 'SPREAD RUMOR',
    cost: 1,
    desc: 'Opponent guts -10 in next confrontation.',
    detail: 'Word gets around. They arrive rattled.',
    color: EGA.LIGHT_RED,
    effect: 'OPP GUTS -10',
  },
  {
    label: 'ESPIONAGE',
    cost: 2,
    desc: "See opponent's move before reveal.",
    detail: 'Someone talks. You listen.',
    color: EGA.YELLOW,
    effect: 'MOVE REVEALED',
  },
  {
    label: 'BANK TOKENS',
    cost: 0,
    desc: 'Carry all tokens to tomorrow.',
    detail: 'Patience is its own strategy.',
    color: EGA.DARK_GRAY,
    effect: 'TOKENS SAVED',
  },
]

export class P10_Intel extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics
  private tokens = MAX_TOKENS
  private sel = 0
  private allocated: { optIdx: number; label: string }[] = []
  private confirmed = false
  private up!: Phaser.Input.Keyboard.Key
  private dn!: Phaser.Input.Keyboard.Key
  private ok!: Phaser.Input.Keyboard.Key

  constructor() { super({ key: 'P10' }) }

  create() {
    this.g = this.add.graphics()
    this.tokens = MAX_TOKENS; this.sel = 0; this.allocated = []; this.confirmed = false
    const kb = this.input.keyboard!
    this.up = kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
    this.dn = kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN)
    this.ok = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => this.scene.start('PhaseSelector'))
  }

  update() {
    const g = this.g
    g.clear()
    this.handleInput()

    g.fillStyle(EGA.BLACK); g.fillRect(0, 0, W, H)
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(0, 0, W, 14)
    g.fillStyle(EGA.YELLOW); print(g, 'INTEL PHASE', 6, 3)
    g.fillStyle(EGA.LIGHT_GRAY); print(g, 'BEFORE TOMORROWS MEETINGS', 120, 3, 1)

    if (this.confirmed) { this.drawConfirmed(g); return }

    // Token display
    g.fillStyle(EGA.WHITE); print(g, 'TOKENS:', 10, 20)
    for (let i = 0; i < MAX_TOKENS; i++) {
      g.fillStyle(i < this.tokens ? EGA.YELLOW : EGA.DARK_GRAY)
      g.fillRect(72 + i * 16, 20, 12, 12)
    }
    g.fillStyle(EGA.LIGHT_GRAY); print(g, `${this.tokens} REMAINING`, 122, 20, 1)

    // Options list
    OPTIONS.forEach((opt, i) => {
      const sel = i === this.sel
      const canAfford = this.tokens >= opt.cost || opt.cost === 0
      const y = 40 + i * 36

      const bg = sel ? EGA.DARK_GRAY : EGA.BLACK
      g.fillStyle(bg); g.fillRect(8, y, W - 16, 32)
      g.lineStyle(1, sel ? opt.color : canAfford ? EGA.DARK_GRAY : 0x111111)
      g.strokeRect(8, y, W - 16, 32)

      // Cost tokens
      for (let t = 0; t < 3; t++) {
        g.fillStyle(t < opt.cost ? opt.color : EGA.DARK_GRAY)
        g.fillRect(W - 44 + t * 12, y + 4, 8, 8)
      }
      if (opt.cost === 0) {
        g.fillStyle(EGA.DARK_GRAY); print(g, 'FREE', W - 44, y + 4, 1)
      }

      g.fillStyle(canAfford ? (sel ? opt.color : EGA.WHITE) : EGA.DARK_GRAY)
      print(g, opt.label, 16, y + 4, 1)
      g.fillStyle(canAfford ? EGA.LIGHT_GRAY : EGA.DARK_GRAY)
      print(g, opt.desc, 16, y + 16, 1)
    })

    // Selected detail
    const o = OPTIONS[this.sel]
    g.fillStyle(EGA.BLACK); g.fillRect(0, 186, W, 14)
    g.lineStyle(1, o.color); g.lineBetween(0, 186, W, 186)
    g.fillStyle(o.color); print(g, o.detail, 8, 189, 1)

    // Hint
    g.fillStyle(EGA.DARK_GRAY)
    const canAct = this.tokens >= OPTIONS[this.sel].cost || OPTIONS[this.sel].cost === 0
    print(g, canAct ? '[^/v] SELECT   [SPACE] SPEND   [ESC] BACK' : 'NOT ENOUGH TOKENS', 8, 192, 1)
  }

  private handleInput() {
    if (this.confirmed) return
    if (Phaser.Input.Keyboard.JustDown(this.up)) this.sel = (this.sel - 1 + OPTIONS.length) % OPTIONS.length
    if (Phaser.Input.Keyboard.JustDown(this.dn)) this.sel = (this.sel + 1) % OPTIONS.length
    if (Phaser.Input.Keyboard.JustDown(this.ok)) {
      const opt = OPTIONS[this.sel]
      if (this.tokens < opt.cost && opt.cost > 0) return
      if (opt.cost === 0) {
        this.confirmed = true; return
      }
      this.tokens -= opt.cost
      this.allocated.push({ optIdx: this.sel, label: opt.label })
      if (this.tokens === 0) this.confirmed = true
    }
  }

  private drawConfirmed(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(EGA.BLACK); g.fillRect(20, 20, W - 40, 160)
    g.lineStyle(1, EGA.YELLOW); g.strokeRect(20, 20, W - 40, 160)
    g.fillStyle(EGA.YELLOW); print(g, 'INTEL ALLOCATED.', 50, 30)
    if (this.allocated.length === 0) {
      g.fillStyle(EGA.LIGHT_GRAY); print(g, 'TOKENS BANKED FOR TOMORROW.', 40, 55)
      g.fillStyle(EGA.DARK_GRAY)
      for (let i = 0; i < MAX_TOKENS; i++) {
        g.fillStyle(EGA.YELLOW); g.fillRect(50 + i * 16, 70, 12, 12)
      }
    } else {
      g.fillStyle(EGA.WHITE); print(g, 'ACTIVE INTEL:', 40, 52)
      this.allocated.forEach((a, i) => {
        const opt = OPTIONS[a.optIdx]
        g.fillStyle(opt.color); print(g, `- ${opt.label}`, 40, 68 + i * 18)
        g.fillStyle(EGA.LIGHT_GRAY); print(g, opt.effect, 40, 78 + i * 18, 1)
      })
    }
    g.fillStyle(EGA.DARK_GRAY); print(g, '[ESC] BACK TO SELECTOR', 60, 148)
  }
}
