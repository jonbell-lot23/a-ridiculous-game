import Phaser from 'phaser'
import { EGA } from '../../palette'
import { print } from '../../utils/font'

const W = 320, H = 200

const ZONES = [
  {
    name: 'THE COUNCIL',
    color: EGA.BLUE,
    sub: 'money + permits',
    stats: { trust: 30, power: 70, mood: 25 },
    notes: ['Permit approval: PENDING', 'Key contact: ALDERMAN TANE', 'Want: economic case', 'Threat: pull permits Day 14'],
    x: 14, y: 24, w: 88, h: 110,
  },
  {
    name: 'COLLECTIVE',
    color: EGA.GREEN,
    sub: 'space + people',
    stats: { trust: 55, power: 40, mood: 65 },
    notes: ['Space: AVAILABLE', 'Key contact: AROHA', 'Want: community voice', 'Offer: volunteer labor'],
    x: 116, y: 24, w: 88, h: 110,
  },
  {
    name: 'THE ELDERS',
    color: EGA.BROWN,
    sub: 'memory + meaning',
    stats: { trust: 20, power: 55, mood: 30 },
    notes: ['Consultation: NEEDED', 'Key contact: KUIA MERE', 'Want: story honored', 'Risk: can block everything'],
    x: 218, y: 24, w: 88, h: 110,
  },
]

export class P03_TownPulse extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics
  private zone = 0
  private lt!: Phaser.Input.Keyboard.Key
  private rt!: Phaser.Input.Keyboard.Key

  constructor() { super({ key: 'P03' }) }

  create() {
    this.g = this.add.graphics()
    this.zone = 0
    const kb = this.input.keyboard!
    this.lt = kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT)
    this.rt = kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => this.scene.start('PhaseSelector'))
  }

  update(time: number) {
    const g = this.g
    g.clear()

    if (Phaser.Input.Keyboard.JustDown(this.lt)) this.zone = (this.zone - 1 + 3) % 3
    if (Phaser.Input.Keyboard.JustDown(this.rt)) this.zone = (this.zone + 1) % 3

    g.fillStyle(0x001133); g.fillRect(0, 0, W, H)
    g.fillStyle(EGA.YELLOW); print(g, 'TOWN PULSE — DAY 7', 72, 8)

    // Tension lines between zones (pulsing)
    const pulse = Math.abs(Math.sin(time * 0.003))
    g.lineStyle(1, EGA.RED, pulse * 0.8)
    g.lineBetween(58, 79, 116, 79)
    g.lineBetween(160, 79, 218, 79)
    g.lineBetween(87, 79, 218, 70)

    // Draw zones
    ZONES.forEach((z, i) => {
      const sel = i === this.zone
      const alpha = sel ? 0.25 : 0.08
      g.fillStyle(z.color, alpha); g.fillRect(z.x, z.y, z.w, z.h)
      g.lineStyle(sel ? 2 : 1, z.color, sel ? 1 : 0.5)
      g.strokeRect(z.x, z.y, z.w, z.h)

      // Name
      g.fillStyle(z.color); print(g, z.name, z.x + 4, z.y + 4, 1)
      g.fillStyle(EGA.DARK_GRAY); print(g, z.sub, z.x + 4, z.y + 12, 1)

      if (sel) {
        // Full stats for selected zone
        const s = z.stats
        const drawBar = (label: string, val: number, col: number, y: number) => {
          g.fillStyle(EGA.LIGHT_GRAY); print(g, label, z.x + 4, y, 1)
          g.fillStyle(EGA.DARK_GRAY); g.fillRect(z.x + 4, y + 7, 78, 4)
          g.fillStyle(col); g.fillRect(z.x + 4, y + 7, Math.floor(78 * val / 100), 4)
          g.fillStyle(EGA.LIGHT_GRAY); print(g, String(val), z.x + 62, y, 1)
        }
        drawBar('TRUST ', s.trust, EGA.CYAN, z.y + 26)
        drawBar('POWER ', s.power, EGA.YELLOW, z.y + 42)
        drawBar('MOOD  ', s.mood, EGA.LIGHT_GREEN, z.y + 58)

        // Notes
        g.lineStyle(1, z.color, 0.4); g.lineBetween(z.x + 4, z.y + 76, z.x + z.w - 8, z.y + 76)
        z.notes.forEach((n, ni) => {
          g.fillStyle(ni === 3 ? EGA.LIGHT_RED : EGA.LIGHT_GRAY)
          print(g, n, z.x + 4, z.y + 80 + ni * 7, 1)
        })
      } else {
        // Compact view for other zones
        g.fillStyle(EGA.DARK_GRAY)
        print(g, `T:${z.stats.trust}`, z.x + 4, z.y + 28, 1)
        print(g, `P:${z.stats.power}`, z.x + 4, z.y + 38, 1)
        print(g, `M:${z.stats.mood}`, z.x + 4, z.y + 48, 1)
      }
    })

    // Zone indicator
    g.fillStyle(EGA.BLACK); g.fillRect(0, 140, W, 60)
    g.lineStyle(1, EGA.CYAN); g.lineBetween(0, 140, W, 140)
    const z = ZONES[this.zone]
    g.fillStyle(z.color); print(g, z.name, 10, 146)
    g.fillStyle(EGA.YELLOW)
    print(g, `TRUST ${z.stats.trust}  POWER ${z.stats.power}  MOOD ${z.stats.mood}`, 10, 160)
    g.fillStyle(EGA.DARK_GRAY)
    print(g, '[</> ZONE   [ESC] BACK', 10, 190)

    // Zone dots
    ZONES.forEach((_, i) => {
      g.fillStyle(i === this.zone ? EGA.YELLOW : EGA.DARK_GRAY)
      g.fillRect(W / 2 - 10 + i * 10, 178, 6, 6)
    })
  }
}
