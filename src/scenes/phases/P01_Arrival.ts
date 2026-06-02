import Phaser from 'phaser'
import { EGA } from '../../palette'
import { print } from '../../utils/font'

const W = 320, H = 200

const BEATS = [
  {
    title: 'DAY 0. THE CIRCUIT MOVES.',
    lines: ['A new town. 30 days.', 'You build things that connect people.'],
  },
  {
    title: 'WHANGANUI, NEW ZEALAND.',
    lines: ['Population: 40,000.', '3 factions. None fully trust outsiders.'],
  },
  {
    title: 'TOWN PULSE — STARTING STATE',
    lines: ['Council: WARY  Collective: OPEN  Elders: COLD', 'Trust takes time. So does damage.'],
  },
  {
    title: 'THE GAME BEGINS.',
    lines: ['Each day: 3 actions. Choose wisely.', 'Some windows never open twice.'],
  },
]

export class P01_Arrival extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics
  private beat = 0
  private vanX = W + 40
  private revealTime = 0
  private space!: Phaser.Input.Keyboard.Key

  constructor() { super({ key: 'P01' }) }

  create() {
    this.g = this.add.graphics()
    this.vanX = W + 40
    this.beat = 0
    this.revealTime = 0
    const kb = this.input.keyboard!
    this.space = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => this.scene.start('PhaseSelector'))
  }

  update(_t: number, delta: number) {
    this.g.clear()
    this.revealTime += delta

    switch (this.beat) {
      case 0: this.drawOpenRoad(delta); break
      case 1: this.drawTownSquare(); break
      case 2: this.drawFactionReveal(); break
      case 3: this.drawDayBegins(); break
    }

    this.drawFooter()

    if (Phaser.Input.Keyboard.JustDown(this.space)) {
      if (this.beat < 3) { this.beat++; this.revealTime = 0 }
      else this.scene.start('PhaseSelector')
    }
  }

  private drawOpenRoad(delta: number) {
    const g = this.g
    g.fillStyle(EGA.BLUE); g.fillRect(0, 0, W, 90)
    g.fillStyle(EGA.GREEN); g.fillRect(0, 90, W, 60)
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(0, 110, W, 30)
    g.fillStyle(EGA.YELLOW)
    for (let x = 0; x < W; x += 30) g.fillRect(x, 124, 16, 3)
    // Mountains
    g.fillStyle(0x004488)
    g.fillTriangle(0, 70, 60, 20, 120, 70)
    g.fillTriangle(100, 70, 180, 10, 260, 70)
    g.fillTriangle(200, 70, 290, 30, W, 70)
    // Van approaches
    this.vanX = Math.max(80, this.vanX - delta * 0.14)
    const vx = this.vanX
    g.fillStyle(EGA.LIGHT_BLUE); g.fillRect(vx, 94, 60, 28)
    g.fillStyle(EGA.CYAN); g.fillRect(vx + 38, 97, 20, 16)
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(vx + 4, 119, 12, 8); g.fillRect(vx + 42, 119, 12, 8)
    g.fillStyle(EGA.BLACK); g.fillRect(vx + 6, 121, 8, 5); g.fillRect(vx + 44, 121, 8, 5)
    g.fillStyle(EGA.YELLOW); print(g, 'THE CIRCUIT', vx + 3, 101)
  }

  private drawTownSquare() {
    const g = this.g
    g.fillStyle(EGA.BLUE); g.fillRect(0, 0, W, 80)
    g.fillStyle(0x007700); g.fillRect(0, 80, W, 68)
    const buildings = [
      { x: 8, y: 28, w: 55, h: 58, c: EGA.DARK_GRAY },
      { x: 78, y: 18, w: 42, h: 68, c: EGA.BROWN },
      { x: 196, y: 24, w: 62, h: 62, c: EGA.DARK_GRAY },
      { x: 268, y: 34, w: 48, h: 52, c: EGA.BROWN },
    ]
    buildings.forEach(b => {
      g.fillStyle(b.c); g.fillRect(b.x, b.y, b.w, b.h)
      g.fillStyle(EGA.YELLOW); g.fillRect(b.x + 6, b.y + 8, 8, 8); g.fillRect(b.x + 20, b.y + 8, 8, 8)
    })
    g.fillStyle(EGA.BROWN); g.fillRect(122, 58, 78, 22)
    g.fillStyle(EGA.YELLOW); print(g, 'WHANGANUI', 126, 64)
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(136, 80, 50, 8) // van parked
    g.fillStyle(EGA.LIGHT_BLUE); g.fillRect(137, 73, 48, 8)
  }

  private drawFactionReveal() {
    const g = this.g
    g.fillStyle(0x001133); g.fillRect(0, 0, W, 148)
    g.fillStyle(EGA.YELLOW); print(g, 'TOWN PULSE — DAY 1', 60, 6)

    const factions = [
      { x: 8,   color: EGA.BLUE,  name: 'THE COUNCIL', trust: 30, sub: 'money + permits', status: 'WARY' },
      { x: 114, color: EGA.GREEN, name: 'COLLECTIVE',   trust: 50, sub: 'space + people',  status: 'OPEN' },
      { x: 220, color: EGA.BROWN, name: 'THE ELDERS',   trust: 20, sub: 'memory + meaning',status: 'COLD' },
    ]
    factions.forEach((f, i) => {
      const show = this.revealTime > i * 500
      g.lineStyle(1, f.color); g.strokeRect(f.x, 18, 92, 120)
      g.fillStyle(f.color, 0.12); g.fillRect(f.x, 18, 92, 120)
      g.fillStyle(f.color); print(g, f.name, f.x + 4, 22)
      g.fillStyle(EGA.DARK_GRAY); print(g, f.sub, f.x + 4, 32, 1)
      if (show) {
        g.fillStyle(EGA.WHITE); print(g, 'TRUST', f.x + 4, 50, 1)
        const bw = 76, fill = Math.floor(bw * f.trust / 100)
        g.fillStyle(EGA.DARK_GRAY); g.fillRect(f.x + 4, 58, bw, 5)
        g.fillStyle(f.color); g.fillRect(f.x + 4, 58, fill, 5)
        g.fillStyle(EGA.LIGHT_GRAY); print(g, `${f.trust}/100`, f.x + 4, 66, 1)
        g.fillStyle(EGA.YELLOW); print(g, f.status, f.x + 4, 82, 1)
      } else {
        g.fillStyle(EGA.DARK_GRAY); print(g, 'SCANNING...', f.x + 4, 58, 1)
      }
    })
  }

  private drawDayBegins() {
    const g = this.g
    g.fillStyle(EGA.BLACK); g.fillRect(0, 0, W, 148)
    g.fillStyle(EGA.YELLOW); print(g, 'DAY 1 OF 30', 100, 12)
    // 30-day calendar
    const sx = 22, sy = 28, cw = 16, ch = 14
    for (let d = 0; d < 30; d++) {
      const col = d % 7, row = Math.floor(d / 7)
      const x = sx + col * cw, y = sy + row * ch
      const shade = d === 0 ? EGA.YELLOW : d < 7 ? EGA.DARK_GRAY : d < 21 ? EGA.BLUE : EGA.RED
      g.fillStyle(shade); g.fillRect(x, y, cw - 2, ch - 2)
    }
    g.fillStyle(EGA.BLACK); print(g, '1', sx + 4, sy + 2)
    // Crew list
    g.fillStyle(EGA.CYAN); print(g, 'YOUR CREW:', 185, 30)
    const crew = [
      { name: 'REN',    role: 'YOU', c: EGA.LIGHT_BLUE },
      { name: 'HANA',   role: 'STRATEGIST', c: EGA.LIGHT_GREEN },
      { name: 'GOROU',  role: 'VETERAN', c: EGA.BROWN },
      { name: 'MIKO',   role: 'READER', c: EGA.LIGHT_MAGENTA },
      { name: 'DAICHI', role: 'WILD CARD', c: EGA.LIGHT_RED },
    ]
    crew.forEach((c, i) => {
      g.fillStyle(c.c); print(g, c.name, 185, 45 + i * 16)
      g.fillStyle(EGA.DARK_GRAY); print(g, c.role, 230, 45 + i * 16, 1)
    })
  }

  private drawFooter() {
    const g = this.g
    const b = BEATS[this.beat]
    g.fillStyle(EGA.BLACK); g.fillRect(0, 148, W, 52)
    g.lineStyle(1, EGA.CYAN); g.lineBetween(0, 148, W, 148)
    g.fillStyle(EGA.YELLOW); print(g, b.title, 6, 153)
    b.lines.forEach((l, i) => {
      g.fillStyle(i === 0 ? EGA.WHITE : EGA.LIGHT_GRAY)
      print(g, l, 6, 165 + i * 12, 1)
    })
    g.fillStyle(EGA.DARK_GRAY)
    print(g, this.beat < 3 ? '[SPACE] NEXT  [ESC] BACK' : '[SPACE] DONE  [ESC] BACK', 6, 191)
  }
}
