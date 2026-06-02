import Phaser from 'phaser'
import { EGA } from '../../palette'
import { print } from '../../utils/font'

const W = 320, H = 200
const BASE_LOYALTY = 35
const INVEST_GAIN = 25
const IGNORE_LOSS = 15

export class P09_BondDaichi extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics
  private loyalty = BASE_LOYALTY
  private hover: 'invest' | 'ignore' | null = null
  private chosen: 'invest' | 'ignore' | null = null
  private elapsed = 0
  private up!: Phaser.Input.Keyboard.Key
  private dn!: Phaser.Input.Keyboard.Key
  private ok!: Phaser.Input.Keyboard.Key

  constructor() { super({ key: 'P09' }) }

  create() {
    this.g = this.add.graphics()
    this.loyalty = BASE_LOYALTY; this.hover = 'invest'; this.chosen = null; this.elapsed = 0
    const kb = this.input.keyboard!
    this.up = kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
    this.dn = kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN)
    this.ok = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => this.scene.start('PhaseSelector'))
  }

  update(_t: number, delta: number) {
    const g = this.g
    g.clear()
    this.elapsed += delta
    this.handleInput()

    g.fillStyle(EGA.BLACK); g.fillRect(0, 0, W, H)
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(0, 0, W, 14)
    g.fillStyle(EGA.LIGHT_RED); print(g, 'BOND: DAICHI', 6, 3)

    // Daichi portrait
    this.drawDaichi(g)

    if (this.chosen) {
      this.drawResult(g)
      return
    }

    // Daichi's message
    g.fillStyle(EGA.BLACK, 0.85); g.fillRect(80, 18, 230, 55)
    g.lineStyle(1, EGA.LIGHT_RED); g.strokeRect(80, 18, 230, 55)
    g.fillStyle(EGA.LIGHT_RED); print(g, 'DAICHI:', 88, 23, 1)
    g.fillStyle(EGA.WHITE)
    print(g, '"HEY. YOU GOT A MINUTE?"', 88, 33, 1)
    print(g, '"NEVER MIND. LOOKS LIKE YOU\'RE BUSY."', 88, 45, 1)
    g.fillStyle(EGA.YELLOW); print(g, '"I\'LL FIGURE IT OUT."', 88, 57, 1)

    // Loyalty meter
    g.fillStyle(EGA.WHITE); print(g, 'DAICHI LOYALTY:', 10, 82)
    const previewLoyalty = this.hover === 'invest'
      ? Math.min(100, this.loyalty + INVEST_GAIN)
      : this.hover === 'ignore'
      ? Math.max(0, this.loyalty - IGNORE_LOSS)
      : this.loyalty
    const barW = 200
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(10, 96, barW, 10)
    // Base bar
    g.fillStyle(EGA.LIGHT_RED); g.fillRect(10, 96, Math.floor(barW * this.loyalty / 100), 10)
    // Preview overlay
    if (this.hover === 'invest') {
      g.fillStyle(EGA.LIGHT_GREEN, 0.7)
      g.fillRect(10 + Math.floor(barW * this.loyalty / 100), 96, Math.floor(barW * INVEST_GAIN / 100), 10)
    } else if (this.hover === 'ignore') {
      g.fillStyle(EGA.DARK_GRAY, 0.9)
      g.fillRect(10 + Math.floor(barW * (this.loyalty - IGNORE_LOSS) / 100), 96, Math.floor(barW * IGNORE_LOSS / 100), 10)
    }
    g.fillStyle(EGA.LIGHT_GRAY); print(g, `${previewLoyalty}/100`, 216, 95, 1)

    // Loyalty zone label
    const zone = previewLoyalty >= 60 ? { label: 'COMMITTED', c: EGA.LIGHT_GREEN }
      : previewLoyalty >= 40 ? { label: 'UNCERTAIN', c: EGA.YELLOW }
      : { label: 'AT RISK OF LEAVING', c: EGA.LIGHT_RED }
    g.fillStyle(zone.c); print(g, zone.label, 10, 110, 1)

    // Choices
    const invSel = this.hover === 'invest'
    const ignSel = this.hover === 'ignore'

    g.fillStyle(invSel ? EGA.DARK_GRAY : EGA.BLACK); g.fillRect(6, 126, 148, 48)
    g.lineStyle(2, invSel ? EGA.LIGHT_GREEN : EGA.DARK_GRAY); g.strokeRect(6, 126, 148, 48)
    g.fillStyle(invSel ? EGA.LIGHT_GREEN : EGA.DARK_GRAY); print(g, 'INVEST TIME', 16, 132)
    g.fillStyle(EGA.LIGHT_GRAY)
    print(g, `LOYALTY +${INVEST_GAIN}`, 16, 148, 1)
    print(g, 'COSTS 1 ACTION TOMORROW', 16, 158, 1)

    g.fillStyle(ignSel ? EGA.DARK_GRAY : EGA.BLACK); g.fillRect(160, 126, 148, 48)
    g.lineStyle(2, ignSel ? EGA.LIGHT_RED : EGA.DARK_GRAY); g.strokeRect(160, 126, 148, 48)
    g.fillStyle(ignSel ? EGA.LIGHT_RED : EGA.DARK_GRAY); print(g, 'FOCUS ELSEWHERE', 168, 132)
    g.fillStyle(EGA.LIGHT_GRAY)
    print(g, `LOYALTY -${IGNORE_LOSS}`, 168, 148, 1)
    print(g, 'NO ACTION COST', 168, 158, 1)

    g.fillStyle(EGA.DARK_GRAY)
    print(g, '[^/v] HOVER   [SPACE] CHOOSE   [ESC] BACK', 6, 191, 1)
  }

  private handleInput() {
    if (this.chosen) return
    if (Phaser.Input.Keyboard.JustDown(this.up) || Phaser.Input.Keyboard.JustDown(this.dn)) {
      this.hover = this.hover === 'invest' ? 'ignore' : 'invest'
    }
    if (Phaser.Input.Keyboard.JustDown(this.ok)) {
      this.chosen = this.hover
      if (this.chosen === 'invest') {
        this.loyalty = Math.min(100, this.loyalty + INVEST_GAIN)
      } else {
        this.loyalty = Math.max(0, this.loyalty - IGNORE_LOSS)
      }
    }
  }

  private drawDaichi(g: Phaser.GameObjects.Graphics) {
    const y = 18
    g.fillStyle(EGA.LIGHT_RED); g.fillRect(8, y + 18, 60, 80)
    g.fillStyle(EGA.RED); g.fillRect(16, y + 6, 44, 18)
    g.fillStyle(EGA.BLACK); g.fillRect(22, y + 10, 7, 6); g.fillRect(35, y + 10, 7, 6)
    // Arms crossed (skeptical posture)
    g.fillStyle(EGA.LIGHT_RED); g.fillRect(2, y + 28, 12, 8); g.fillRect(66, y + 28, 12, 8)
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(18, y + 36, 40, 6) // arms crossing
  }

  private drawResult(g: Phaser.GameObjects.Graphics) {
    const invested = this.chosen === 'invest'
    g.fillStyle(EGA.BLACK); g.fillRect(20, 20, W - 40, 160)
    g.lineStyle(2, invested ? EGA.LIGHT_GREEN : EGA.LIGHT_RED)
    g.strokeRect(20, 20, W - 40, 160)
    g.fillStyle(invested ? EGA.LIGHT_GREEN : EGA.LIGHT_RED)
    print(g, invested ? 'YOU SPENT TIME WITH HIM.' : 'YOU MOVED ON.', 36, 32)
    g.fillStyle(EGA.WHITE); print(g, 'DAICHI LOYALTY:', 36, 52)
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(36, 66, 200, 8)
    g.fillStyle(EGA.LIGHT_RED); g.fillRect(36, 66, Math.floor(200 * this.loyalty / 100), 8)
    g.fillStyle(EGA.LIGHT_GRAY); print(g, `${this.loyalty}/100`, 36, 80)
    g.fillStyle(invested ? EGA.LIGHT_GREEN : EGA.YELLOW)
    print(g, invested ? '"...OK. THANKS."' : '"...FINE."', 36, 100)
    g.fillStyle(EGA.LIGHT_GRAY)
    print(g, invested ? 'HE STAYS. FOR NOW.' : 'HE DRIFTS A LITTLE.', 36, 118, 1)
    if (!invested && this.loyalty < 25) {
      g.fillStyle(EGA.LIGHT_RED); print(g, 'WARNING: DEFECTION RISK HIGH.', 36, 132, 1)
    }
    g.fillStyle(EGA.DARK_GRAY); print(g, '[ESC] BACK TO SELECTOR', 64, 152)
  }
}
