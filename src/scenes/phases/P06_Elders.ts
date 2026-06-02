import Phaser from 'phaser'
import { EGA } from '../../palette'
import { print } from '../../utils/font'

const W = 320, H = 200

const STORIES = [
  {
    label: 'A STORY OF LOSS + REBUILDING',
    reply: '"THEN PERHAPS YOU UNDERSTAND\nWHAT THIS PLACE CARRIES."',
    replyLines: ['THEN PERHAPS YOU UNDERSTAND', 'WHAT THIS PLACE CARRIES.'],
    outcome: 'THEY NOD SLOWLY. A DOOR OPENS.',
    color: EGA.BROWN,
    trust: +12,
  },
  {
    label: 'A STORY OF CONNECTION',
    reply: '"CONNECTION. WHAT HAS BEEN\nBROKEN HERE THAT YOU SEE?"',
    replyLines: ['CONNECTION. WHAT HAS BEEN', 'BROKEN HERE THAT YOU SEE?'],
    outcome: 'THEY STUDY YOU. CAUTIOUS INTEREST.',
    color: EGA.YELLOW,
    trust: +8,
  },
  {
    label: 'WE BRING YOUR STORIES BACK',
    reply: '"SIT DOWN.\nTELL US MORE OF THIS."',
    replyLines: ['SIT DOWN.', 'TELL US MORE OF THIS.'],
    outcome: 'SOMETHING SHIFTS. SIT. LISTEN.',
    color: EGA.LIGHT_GREEN,
    trust: +18,
  },
]

type Phase = 'intro' | 'choose' | 'reaction' | 'end'

export class P06_Elders extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics
  private phase: Phase = 'intro'
  private sel = 0
  private chosen = -1
  private elapsed = 0
  private introLine = 0
  private trust = 20
  private ok!: Phaser.Input.Keyboard.Key
  private up!: Phaser.Input.Keyboard.Key
  private dn!: Phaser.Input.Keyboard.Key

  private introLines = [
    'THE CIRCUIT.',
    'WE KNOW OF YOUR KIND.',
    'YOU BUILD. THEN LEAVE.',
    'WHAT STORY DO YOU BRING US?',
  ]

  constructor() { super({ key: 'P06' }) }

  create() {
    this.g = this.add.graphics()
    this.phase = 'intro'; this.sel = 0; this.chosen = -1
    this.elapsed = 0; this.introLine = 0; this.trust = 20
    const kb = this.input.keyboard!
    this.ok = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.up = kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
    this.dn = kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN)
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => this.scene.start('PhaseSelector'))
  }

  update(_t: number, delta: number) {
    const g = this.g
    g.clear()
    this.elapsed += delta

    // Dark chamber
    g.fillStyle(0x080810); g.fillRect(0, 0, W, H)
    // Subtle fire light glow on walls
    const glow = 0.04 + Math.abs(Math.sin(this.elapsed * 0.002)) * 0.04
    g.fillStyle(EGA.BROWN, glow); g.fillRect(0, 0, W, H)

    // Elder portrait (large, left)
    this.drawElder(g, 20, 20, this.phase === 'reaction' && this.chosen >= 0 ? STORIES[this.chosen].color : EGA.BROWN)

    // Trust bar (top right)
    g.fillStyle(EGA.DARK_GRAY); print(g, 'ELDER TRUST', 180, 8, 1)
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(180, 16, 120, 5)
    g.fillStyle(EGA.BROWN); g.fillRect(180, 16, Math.floor(120 * this.trust / 100), 5)
    g.fillStyle(EGA.LIGHT_GRAY); print(g, `${this.trust}/100`, 240, 8, 1)

    switch (this.phase) {
      case 'intro':    this.drawIntro(g); break
      case 'choose':   this.drawChoose(g); break
      case 'reaction': this.drawReaction(g); break
      case 'end':      this.drawEnd(g); break
    }

    this.handleInput()
    g.fillStyle(EGA.DARK_GRAY)
    print(g, '[ESC] BACK', 6, 192, 1)
  }

  private handleInput() {
    if (this.phase === 'intro') {
      if (Phaser.Input.Keyboard.JustDown(this.ok) && this.elapsed > 500) {
        if (this.introLine < this.introLines.length - 1) {
          this.introLine++
          this.elapsed = 0
        } else {
          this.phase = 'choose'
        }
      }
    } else if (this.phase === 'choose') {
      if (Phaser.Input.Keyboard.JustDown(this.up)) this.sel = (this.sel - 1 + 3) % 3
      if (Phaser.Input.Keyboard.JustDown(this.dn)) this.sel = (this.sel + 1) % 3
      if (Phaser.Input.Keyboard.JustDown(this.ok)) {
        this.chosen = this.sel
        this.trust = Math.min(100, this.trust + STORIES[this.chosen].trust)
        this.phase = 'reaction'
        this.elapsed = 0
      }
    } else if (this.phase === 'reaction') {
      if (Phaser.Input.Keyboard.JustDown(this.ok) && this.elapsed > 2000) {
        this.phase = 'end'
      }
    }
  }

  private drawIntro(g: Phaser.GameObjects.Graphics) {
    const line = this.introLines[this.introLine]
    g.fillStyle(EGA.BLACK, 0.7); g.fillRect(110, 30, 200, 90)
    g.lineStyle(1, EGA.BROWN); g.strokeRect(110, 30, 200, 90)
    g.fillStyle(EGA.BROWN); print(g, 'KUIA MERE:', 118, 36, 1)
    g.fillStyle(EGA.WHITE); print(g, `"${line}"`, 118, 50, 1)
    // Fade-in effect
    const alpha = Math.min(1, this.elapsed / 600)
    g.fillStyle(EGA.BLACK, 1 - alpha); g.fillRect(110, 30, 200, 90)
    g.fillStyle(EGA.DARK_GRAY)
    print(g, '[SPACE] CONTINUE', 160, 130, 1)
  }

  private drawChoose(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(110, 28, 200, 16)
    g.fillStyle(EGA.WHITE); print(g, 'CHOOSE YOUR STORY:', 118, 32, 1)
    STORIES.forEach((s, i) => {
      const sel = i === this.sel
      const y = 50 + i * 28
      if (sel) { g.fillStyle(EGA.DARK_GRAY, 0.8); g.fillRect(112, y - 2, 196, 24) }
      g.lineStyle(1, sel ? s.color : EGA.DARK_GRAY)
      g.strokeRect(112, y - 2, 196, 24)
      g.fillStyle(sel ? s.color : EGA.DARK_GRAY)
      print(g, s.label, 118, y + 2, 1)
      if (sel) {
        g.fillStyle(EGA.LIGHT_GRAY)
        print(g, `TRUST ${s.trust > 0 ? '+' : ''}${s.trust}`, 236, y + 14, 1)
      }
    })
    g.fillStyle(EGA.DARK_GRAY)
    print(g, '[^/v] SELECT  [SPACE] SHARE', 118, 138, 1)
  }

  private drawReaction(g: Phaser.GameObjects.Graphics) {
    if (this.chosen < 0) return
    const s = STORIES[this.chosen]
    const show = this.elapsed > 1200
    g.fillStyle(EGA.BLACK, 0.8); g.fillRect(110, 28, 200, 80)
    g.lineStyle(1, s.color); g.strokeRect(110, 28, 200, 80)
    g.fillStyle(s.color); print(g, 'KUIA MERE:', 118, 34, 1)
    if (show) {
      s.replyLines.forEach((l, i) => {
        g.fillStyle(EGA.WHITE); print(g, `"${l}"`, 118, 46 + i * 14, 1)
      })
      g.fillStyle(EGA.YELLOW); print(g, s.outcome, 118, 80, 1)
      g.fillStyle(EGA.DARK_GRAY); print(g, '[SPACE] CONTINUE', 118, 116, 1)
    } else {
      g.fillStyle(EGA.DARK_GRAY)
      const dots = '.'.repeat(Math.floor(this.elapsed / 400) % 4)
      print(g, dots, 150, 60, 1)
    }
  }

  private drawEnd(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(EGA.BLACK, 0.85); g.fillRect(20, 20, W - 40, 150)
    g.lineStyle(1, EGA.BROWN); g.strokeRect(20, 20, W - 40, 150)
    g.fillStyle(EGA.BROWN); print(g, 'THE MEETING CLOSES.', 50, 30)
    g.fillStyle(EGA.LIGHT_GRAY); print(g, 'ELDER TRUST UPDATED.', 50, 50)
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(50, 64, 160, 8)
    g.fillStyle(EGA.BROWN); g.fillRect(50, 64, Math.floor(160 * this.trust / 100), 8)
    g.fillStyle(EGA.WHITE); print(g, `${this.trust}/100`, 50, 78)
    g.fillStyle(EGA.DARK_GRAY); print(g, '[ESC] BACK TO SELECTOR', 60, 110)
  }

  private drawElder(g: Phaser.GameObjects.Graphics, x: number, y: number, accent: number) {
    const bob = Math.sin(this.elapsed * 0.001) * 1
    // Robe
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(x, y + 30 + bob, 70, 80)
    g.fillStyle(accent, 0.3); g.fillRect(x, y + 30 + bob, 70, 80)
    // Head
    g.fillStyle(EGA.BROWN); g.fillRect(x + 16, y + bob, 38, 36)
    // Eyes (deep set)
    g.fillStyle(EGA.BLACK); g.fillRect(x + 22, y + 10 + bob, 7, 6); g.fillRect(x + 37, y + 10 + bob, 7, 6)
    g.fillStyle(EGA.WHITE); g.fillRect(x + 23, y + 11 + bob, 2, 2); g.fillRect(x + 38, y + 11 + bob, 2, 2)
    // Moko lines
    g.lineStyle(1, EGA.DARK_GRAY)
    g.lineBetween(x + 25, y + 20 + bob, x + 45, y + 20 + bob)
    g.lineBetween(x + 22, y + 26 + bob, x + 48, y + 26 + bob)
    // Taonga (pendant)
    g.fillStyle(EGA.GREEN); g.fillRect(x + 30, y + 38 + bob, 10, 14)
  }
}
