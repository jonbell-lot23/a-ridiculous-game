import Phaser from 'phaser'
import { EGA } from '../../palette'
import { print } from '../../utils/font'

const W = 320, H = 200
const TIMER_MS = 10000

const CRISES = [
  {
    title: 'PERMIT REVOKED',
    desc: ['THE COUNCIL PULLED YOUR PERMIT.', '3 DAYS UNTIL FORCED REMOVAL.'],
    color: EGA.LIGHT_RED,
    options: [
      { text: 'APPEAL FORMALLY', effect: 'COUNCIL TRUST +10. COSTS 1 DAY.' },
      { text: 'NEGOTIATE DIRECTLY', effect: 'COUNCIL -5, COLLECTIVE +15.' },
      { text: 'IGNORE IT', effect: 'MORALE -20. RISK COMPOUNDS.' },
      { text: 'LEGAL THREAT', effect: 'ALL FACTIONS -5. BUYS 2 DAYS.' },
    ],
  },
  {
    title: 'DAICHI MISSING',
    desc: ['HE WASN\'T AT MORNING BRIEF.', 'NO MESSAGE. NO EXPLANATION.'],
    color: EGA.YELLOW,
    options: [
      { text: 'SEARCH NOW', effect: '-1 ACTION TODAY. PROBABLY FINE.' },
      { text: 'CALL HIM', effect: 'DAICHI LOYALTY -10. HE HATES THIS.' },
      { text: 'SEND MIKO', effect: 'MIKO GOODWILL -5. SHE FINDS HIM.' },
      { text: 'WAIT', effect: 'DAICHI LOYALTY -20. HE NOTICES.' },
    ],
  },
  {
    title: 'RIVAL CREW',
    desc: ['ANOTHER CREW CLAIMS THE SPACE.', 'THEY HAVE A DIFFERENT VISION.'],
    color: EGA.CYAN,
    options: [
      { text: 'COLLABORATE', effect: 'SPLIT CREDIT. COLLECTIVE +15.' },
      { text: 'COMPETE', effect: 'CONFRONTATION TRIGGERED TOMORROW.' },
      { text: 'YIELD THE SPACE', effect: 'THEY TAKE IT. FIND ANOTHER.' },
      { text: 'RECRUIT THEIR BEST', effect: 'ONE DEFECTS TO YOU. MESSY.' },
    ],
  },
]

export class P13_Crisis extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics
  private crisis!: typeof CRISES[0]
  private timerLeft = TIMER_MS
  private sel = 0
  private resolved = false
  private chosen = -1
  private up!: Phaser.Input.Keyboard.Key
  private dn!: Phaser.Input.Keyboard.Key
  private ok!: Phaser.Input.Keyboard.Key

  constructor() { super({ key: 'P13' }) }

  create() {
    this.g = this.add.graphics()
    this.crisis = CRISES[Math.floor(Math.random() * CRISES.length)]
    this.timerLeft = TIMER_MS; this.sel = 0; this.resolved = false; this.chosen = -1
    const kb = this.input.keyboard!
    this.up = kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
    this.dn = kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN)
    this.ok = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => this.scene.start('PhaseSelector'))
  }

  update(_t: number, delta: number) {
    const g = this.g
    g.clear()

    if (!this.resolved) this.timerLeft = Math.max(0, this.timerLeft - delta)
    if (this.timerLeft <= 0 && !this.resolved) {
      this.chosen = this.sel
      this.resolved = true
    }

    this.handleInput()

    const pct = this.timerLeft / TIMER_MS
    const urgent = pct < 0.4

    // Background — reddens as time runs out
    const bgRed = Math.floor((1 - pct) * 0x22)
    g.fillStyle(bgRed * 0x10000); g.fillRect(0, 0, W, H)
    g.fillStyle(EGA.BLACK, 1 - (1 - pct) * 0.5); g.fillRect(0, 0, W, H)

    // Header / title
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(0, 0, W, 14)
    g.fillStyle(EGA.LIGHT_RED); print(g, '! CRISIS !', 6, 3)

    // Big countdown timer
    const secsLeft = Math.ceil(this.timerLeft / 1000)
    const timerColor = pct > 0.6 ? EGA.YELLOW : pct > 0.3 ? EGA.LIGHT_RED : EGA.LIGHT_RED
    if (!this.resolved) {
      g.fillStyle(timerColor)
      print(g, String(secsLeft).padStart(2, '0'), W - 44, 2, urgent ? 3 : 2)
    }

    // Crisis card
    g.fillStyle(EGA.BLACK, 0.9); g.fillRect(8, 16, W - 16, 50)
    g.lineStyle(2, this.crisis.color); g.strokeRect(8, 16, W - 16, 50)
    g.fillStyle(this.crisis.color); print(g, this.crisis.title, 16, 20)
    this.crisis.desc.forEach((l, i) => {
      g.fillStyle(EGA.WHITE); print(g, l, 16, 34 + i * 12, 1)
    })

    // Options
    this.crisis.options.forEach((opt, i) => {
      const sel = i === this.sel
      const y = 72 + i * 28

      if (sel) {
        g.fillStyle(EGA.DARK_GRAY); g.fillRect(8, y, W - 16, 26)
        g.lineStyle(1, urgent ? EGA.LIGHT_RED : EGA.YELLOW)
        g.strokeRect(8, y, W - 16, 26)
      } else {
        g.lineStyle(1, EGA.DARK_GRAY); g.strokeRect(8, y, W - 16, 26)
      }

      g.fillStyle(sel ? EGA.WHITE : EGA.LIGHT_GRAY)
      print(g, `${sel ? '>' : ' '} ${opt.text}`, 14, y + 4, 1)
      g.fillStyle(sel ? EGA.YELLOW : EGA.DARK_GRAY)
      print(g, opt.effect, 14, y + 16, 1)
    })

    // Timer bar
    if (!this.resolved) {
      g.fillStyle(EGA.DARK_GRAY); g.fillRect(0, H - 6, W, 6)
      g.fillStyle(timerColor); g.fillRect(0, H - 6, Math.floor(W * pct), 6)
    }

    if (this.resolved) this.drawResolved(g)

    g.fillStyle(EGA.DARK_GRAY); print(g, '[^/v] SELECT  [SPACE] ACT  [ESC] BACK', 8, 191, 1)
  }

  private handleInput() {
    if (this.resolved) return
    if (Phaser.Input.Keyboard.JustDown(this.up)) this.sel = (this.sel - 1 + 4) % 4
    if (Phaser.Input.Keyboard.JustDown(this.dn)) this.sel = (this.sel + 1) % 4
    if (Phaser.Input.Keyboard.JustDown(this.ok)) {
      this.chosen = this.sel
      this.resolved = true
    }
  }

  private drawResolved(g: Phaser.GameObjects.Graphics) {
    const opt = this.crisis.options[this.chosen]
    const timedOut = this.timerLeft <= 0
    g.fillStyle(EGA.BLACK, 0.9); g.fillRect(20, 60, W - 40, 100)
    g.lineStyle(2, timedOut ? EGA.LIGHT_RED : EGA.LIGHT_GREEN)
    g.strokeRect(20, 60, W - 40, 100)
    g.fillStyle(timedOut ? EGA.LIGHT_RED : EGA.LIGHT_GREEN)
    print(g, timedOut ? 'TIME EXPIRED!' : 'DECISION MADE.', 36, 70)
    g.fillStyle(EGA.WHITE); print(g, opt.text, 36, 90, 1)
    g.fillStyle(EGA.YELLOW); print(g, opt.effect, 36, 104, 1)
    g.fillStyle(EGA.DARK_GRAY); print(g, '[ESC] BACK TO SELECTOR', 52, 136)
  }
}
