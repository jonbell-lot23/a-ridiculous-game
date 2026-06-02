import Phaser from 'phaser'
import { EGA } from '../../palette'
import { print } from '../../utils/font'

const W = 320, H = 200

const BEATS = [
  {
    hana: ["I'VE SEEN TOWNS LIKE THIS.", "YOU'LL NEED THE ELDERS FIRST."],
    deflect: { ren: 'NOTED.', hana: 'SHE NODS.', delta: 5 },
    press:   { ren: 'HOW DO YOU KNOW THAT?', hana: '...I JUST DO.', delta: 15 },
  },
  {
    hana: ['I KNOW HOW TO WORK THE COUNCIL.', 'LET ME LEAD THAT MEETING.'],
    deflect: { ren: 'SURE.', hana: 'SHE MOVES ON.', delta: 5 },
    press:   { ren: 'WHY DO YOU CARE SO MUCH?', hana: '...ASK ME LATER.', delta: 15 },
  },
  {
    hana: ['THE INSTALLATION GOES HERE.', 'NOT WHERE YOU PLANNED.'],
    deflect: { ren: 'OK.', hana: 'SHE SAYS NOTHING MORE.', delta: 5 },
    press:   { ren: "WHAT AREN'T YOU TELLING ME?", hana: 'SECRET REVEALED.', delta: 15 },
  },
]

const SECRET = [
  "I'VE DONE THIS BEFORE.",
  'DIFFERENT CREW. IT FAILED.',
  'I NEED THIS ONE TO WORK.',
]

export class P08_BondHana extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics
  private beat = 0
  private trust = 40
  private chosen: 'deflect' | 'press' | null = null
  private elapsed = 0
  private done = false
  private lt!: Phaser.Input.Keyboard.Key
  private rt!: Phaser.Input.Keyboard.Key

  constructor() { super({ key: 'P08' }) }

  create() {
    this.g = this.add.graphics()
    this.beat = 0; this.trust = 40; this.chosen = null; this.elapsed = 0; this.done = false
    const kb = this.input.keyboard!
    this.lt = kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT)
    this.rt = kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => this.scene.start('PhaseSelector'))
  }

  update(_t: number, delta: number) {
    const g = this.g
    g.clear()
    this.elapsed += delta
    this.handleInput()

    g.fillStyle(EGA.BLACK); g.fillRect(0, 0, W, H)

    // Header
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(0, 0, W, 14)
    g.fillStyle(EGA.LIGHT_GREEN); print(g, `BOND: HANA  BEAT ${this.beat + 1}/3`, 6, 3)

    // Trust bar
    g.fillStyle(EGA.DARK_GRAY); print(g, "HANA'S TRUST", 150, 3, 1)
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(150, 10, 100, 4)
    g.fillStyle(EGA.LIGHT_GREEN); g.fillRect(150, 10, Math.floor(100 * this.trust / 100), 4)

    if (this.done) { this.drawDone(g); return }

    this.drawPortraits(g)

    // Hana's speech
    const b = BEATS[this.beat]
    g.fillStyle(EGA.BLACK, 0.85); g.fillRect(80, 20, 230, 50)
    g.lineStyle(1, EGA.LIGHT_GREEN); g.strokeRect(80, 20, 230, 50)
    g.fillStyle(EGA.LIGHT_GREEN); print(g, 'HANA:', 88, 25, 1)
    b.hana.forEach((l, i) => {
      g.fillStyle(EGA.WHITE); print(g, `"${l}"`, 88, 35 + i * 12, 1)
    })

    if (this.chosen) {
      // Show response
      const resp = b[this.chosen]
      g.fillStyle(EGA.BLACK, 0.85); g.fillRect(10, 80, W - 20, 52)
      g.lineStyle(1, EGA.CYAN); g.strokeRect(10, 80, W - 20, 52)
      g.fillStyle(EGA.CYAN); print(g, 'REN:', 18, 85, 1)
      g.fillStyle(EGA.WHITE); print(g, `"${resp.ren}"`, 18, 97, 1)
      g.fillStyle(EGA.LIGHT_GREEN); print(g, `HANA: ${resp.hana}`, 18, 112, 1)
      const sign = resp.delta > 0 ? '+' : ''
      g.fillStyle(EGA.YELLOW); print(g, `TRUST ${sign}${resp.delta}`, 18, 124, 1)
      if (this.elapsed > 2000) {
        g.fillStyle(EGA.DARK_GRAY); print(g, '[SPACE] CONTINUE', 100, 145, 1)
        if (Phaser.Input.Keyboard.JustDown(this.rt)) this.nextBeat()
      }
    } else {
      // Choice prompt
      g.fillStyle(EGA.BLACK); g.fillRect(0, 148, W, 52)
      g.lineStyle(1, EGA.CYAN); g.lineBetween(0, 148, W, 148)
      // DEFLECT (left)
      g.fillStyle(EGA.DARK_GRAY); g.fillRect(6, 152, 148, 36)
      g.lineStyle(1, EGA.DARK_GRAY); g.strokeRect(6, 152, 148, 36)
      g.fillStyle(EGA.LIGHT_GRAY); print(g, '[<] DEFLECT', 18, 156)
      g.fillStyle(EGA.DARK_GRAY); print(g, 'SAFE. +5 TRUST', 18, 170, 1)
      // PRESS (right)
      g.fillStyle(EGA.DARK_GRAY); g.fillRect(160, 152, 148, 36)
      g.lineStyle(1, EGA.YELLOW); g.strokeRect(160, 152, 148, 36)
      g.fillStyle(EGA.YELLOW); print(g, '[>] PRESS', 168, 156)
      g.fillStyle(EGA.LIGHT_GRAY); print(g, 'RISKY. +15 TRUST', 168, 170, 1)
    }

    g.fillStyle(EGA.DARK_GRAY); print(g, '[ESC] BACK', 6, 192, 1)
  }

  private handleInput() {
    if (this.chosen || this.done) return
    if (Phaser.Input.Keyboard.JustDown(this.lt)) { this.choose('deflect') }
    if (Phaser.Input.Keyboard.JustDown(this.rt)) { this.choose('press') }
  }

  private choose(c: 'deflect' | 'press') {
    const b = BEATS[this.beat]
    this.trust = Math.min(100, this.trust + b[c].delta)
    this.chosen = c
    this.elapsed = 0
  }

  private nextBeat() {
    this.beat++
    if (this.beat >= BEATS.length) { this.done = true; return }
    this.chosen = null; this.elapsed = 0
  }

  private drawPortraits(g: Phaser.GameObjects.Graphics) {
    // Hana (right)
    g.fillStyle(EGA.LIGHT_GREEN); g.fillRect(W - 68, 16, 60, 90)
    g.fillStyle(EGA.GREEN); g.fillRect(W - 58, 6, 40, 18)
    g.fillStyle(EGA.BLACK); g.fillRect(W - 53, 10, 6, 5); g.fillRect(W - 40, 10, 6, 5)
    // Ren (left, back to us = no face)
    g.fillStyle(EGA.LIGHT_BLUE); g.fillRect(8, 16, 60, 90)
    g.fillStyle(EGA.CYAN); g.fillRect(18, 6, 40, 18)
  }

  private drawDone(g: Phaser.GameObjects.Graphics) {
    const revealed = this.trust >= 70
    g.fillStyle(EGA.BLACK); g.fillRect(20, 20, W - 40, 160)
    g.lineStyle(2, revealed ? EGA.LIGHT_GREEN : EGA.DARK_GRAY)
    g.strokeRect(20, 20, W - 40, 160)
    g.fillStyle(EGA.LIGHT_GREEN); print(g, 'BOND SESSION ENDS.', 50, 30)
    g.fillStyle(EGA.DARK_GRAY)
    g.fillRect(50, 48, 160, 6)
    g.fillStyle(EGA.LIGHT_GREEN); g.fillRect(50, 48, Math.floor(160 * this.trust / 100), 6)
    g.fillStyle(EGA.WHITE); print(g, `HANA TRUST: ${this.trust}/100`, 50, 60)
    if (revealed) {
      g.fillStyle(EGA.YELLOW); print(g, '— SECRET REVEALED —', 50, 80)
      SECRET.forEach((l, i) => {
        g.fillStyle(EGA.WHITE); print(g, l, 50, 96 + i * 14, 1)
      })
    } else {
      g.fillStyle(EGA.DARK_GRAY); print(g, 'SHE STAYS GUARDED.', 50, 80)
      g.fillStyle(EGA.LIGHT_GRAY); print(g, 'PRESS MORE NEXT TIME.', 50, 96, 1)
      g.fillStyle(EGA.DARK_GRAY); print(g, `(NEED 70+ TRUST — YOU HAVE ${this.trust})`, 50, 110, 1)
    }
    g.fillStyle(EGA.DARK_GRAY); print(g, '[ESC] BACK TO SELECTOR', 60, 148)
  }
}
