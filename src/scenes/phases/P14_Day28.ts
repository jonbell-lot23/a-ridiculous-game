import Phaser from 'phaser'
import { EGA } from '../../palette'
import { print } from '../../utils/font'

const W = 320, H = 200
const DAYS_LEFT = 2

// Simulated end-game state
const STATE = {
  factions: [
    { name: 'THE COUNCIL', trust: 62, power: 70, color: EGA.BLUE,  note: 'Permit: CONDITIONAL' },
    { name: 'COLLECTIVE',  trust: 78, power: 40, color: EGA.GREEN, note: 'Space: CONFIRMED' },
    { name: 'THE ELDERS',  trust: 48, power: 55, color: EGA.BROWN, note: 'Blessing: PENDING' },
  ],
  crew: [
    { name: 'REN',    loyalty: 100, status: 'STEADY', color: EGA.LIGHT_BLUE },
    { name: 'HANA',   loyalty: 85,  status: 'FOCUSED', color: EGA.LIGHT_GREEN },
    { name: 'GOROU',  loyalty: 60,  status: 'TIRED', color: EGA.BROWN },
    { name: 'MIKO',   loyalty: 90,  status: 'COMMITTED', color: EGA.LIGHT_MAGENTA },
    { name: 'DAICHI', loyalty: 45,  status: 'UNCERTAIN', color: EGA.LIGHT_RED },
  ],
  installation: 72,
}

const PANELS = ['OVERVIEW', 'FACTIONS', 'CREW', 'INSTALLATION']

export class P14_Day28 extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics
  private panel = 0
  private lt!: Phaser.Input.Keyboard.Key
  private rt!: Phaser.Input.Keyboard.Key

  constructor() { super({ key: 'P14' }) }

  create() {
    this.g = this.add.graphics()
    this.panel = 0
    const kb = this.input.keyboard!
    this.lt = kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT)
    this.rt = kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => this.scene.start('PhaseSelector'))
  }

  update(time: number) {
    const g = this.g
    g.clear()

    if (Phaser.Input.Keyboard.JustDown(this.lt)) this.panel = (this.panel - 1 + 4) % 4
    if (Phaser.Input.Keyboard.JustDown(this.rt)) this.panel = (this.panel + 1) % 4

    g.fillStyle(EGA.BLACK); g.fillRect(0, 0, W, H)

    // Header — urgent energy
    g.fillStyle(EGA.RED); g.fillRect(0, 0, W, 14)
    g.fillStyle(EGA.YELLOW)
    print(g, `DAY 28 OF 30 — ${DAYS_LEFT} DAYS LEFT`, 6, 3)

    // Panel tabs
    PANELS.forEach((p, i) => {
      const sel = i === this.panel
      const x = i * 80
      g.fillStyle(sel ? EGA.DARK_GRAY : EGA.BLACK); g.fillRect(x, 14, 80, 12)
      g.lineStyle(1, sel ? EGA.YELLOW : EGA.DARK_GRAY); g.strokeRect(x, 14, 80, 12)
      g.fillStyle(sel ? EGA.YELLOW : EGA.DARK_GRAY); print(g, p, x + 4, 17, 1)
    })

    switch (this.panel) {
      case 0: this.drawOverview(g, time); break
      case 1: this.drawFactions(g); break
      case 2: this.drawCrew(g); break
      case 3: this.drawInstallation(g, time); break
    }

    // Footer
    g.fillStyle(EGA.BLACK); g.fillRect(0, 190, W, 10)
    g.fillStyle(EGA.DARK_GRAY)
    print(g, '[</> PANELS   [ESC] BACK', 8, 192, 1)
  }

  private drawOverview(g: Phaser.GameObjects.Graphics, time: number) {
    const y0 = 30

    // Faction summary
    g.fillStyle(EGA.CYAN); print(g, 'FACTIONS', 10, y0)
    STATE.factions.forEach((f, i) => {
      const y = y0 + 12 + i * 14
      g.fillStyle(f.color); print(g, f.name.slice(0, 9), 10, y, 1)
      g.fillStyle(EGA.DARK_GRAY); g.fillRect(80, y + 1, 80, 5)
      g.fillStyle(f.color); g.fillRect(80, y + 1, Math.floor(80 * f.trust / 100), 5)
      g.fillStyle(EGA.LIGHT_GRAY); print(g, `${f.trust}`, 166, y, 1)
    })

    // Crew summary
    g.fillStyle(EGA.CYAN); print(g, 'CREW', 10, y0 + 56)
    STATE.crew.forEach((c, i) => {
      const y = y0 + 68 + i * 12
      g.fillStyle(c.color); print(g, c.name, 10, y, 1)
      g.fillStyle(EGA.DARK_GRAY); g.fillRect(60, y + 1, 60, 4)
      g.fillStyle(c.loyalty >= 60 ? EGA.LIGHT_GREEN : EGA.LIGHT_RED)
      g.fillRect(60, y + 1, Math.floor(60 * c.loyalty / 100), 4)
    })

    // Install
    g.fillStyle(EGA.CYAN); print(g, 'INSTALLATION', 10, y0 + 134)
    const pct = STATE.installation
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(10, y0 + 146, 200, 8)
    const pulse = Math.abs(Math.sin(time * 0.003))
    g.fillStyle(pct > 80 ? EGA.LIGHT_GREEN : EGA.YELLOW, 0.6 + pulse * 0.4)
    g.fillRect(10, y0 + 146, Math.floor(200 * pct / 100), 8)
    g.fillStyle(EGA.LIGHT_GRAY); print(g, `${pct}%`, 216, y0 + 146, 1)

    // Warning
    const atRisk = STATE.crew.find(c => c.loyalty < 50)
    if (atRisk) {
      g.fillStyle(EGA.LIGHT_RED); print(g, `! ${atRisk.name}: AT RISK`, 10, y0 + 160, 1)
    }
  }

  private drawFactions(g: Phaser.GameObjects.Graphics) {
    STATE.factions.forEach((f, i) => {
      const y = 30 + i * 52
      g.lineStyle(1, f.color); g.strokeRect(8, y, W - 16, 48)
      g.fillStyle(f.color, 0.1); g.fillRect(8, y, W - 16, 48)
      g.fillStyle(f.color); print(g, f.name, 14, y + 4)
      g.fillStyle(EGA.YELLOW); print(g, f.note, 14, y + 18, 1)
      const drawStat = (label: string, val: number, x: number, sy: number) => {
        g.fillStyle(EGA.LIGHT_GRAY); print(g, label, x, sy, 1)
        g.fillStyle(EGA.DARK_GRAY); g.fillRect(x, sy + 8, 60, 4)
        g.fillStyle(f.color); g.fillRect(x, sy + 8, Math.floor(60 * val / 100), 4)
        g.fillStyle(EGA.LIGHT_GRAY); print(g, String(val), x + 62, sy, 1)
      }
      drawStat('TRUST', f.trust, 14, y + 30)
      drawStat('POWER', f.power, 160, y + 30)
    })
  }

  private drawCrew(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(EGA.CYAN); print(g, 'CREW STATUS — DAY 28', 10, 30)
    STATE.crew.forEach((c, i) => {
      const y = 44 + i * 26
      const at_risk = c.loyalty < 50
      g.fillStyle(at_risk ? EGA.DARK_GRAY : EGA.BLACK); g.fillRect(8, y, W - 16, 22)
      g.lineStyle(1, at_risk ? EGA.LIGHT_RED : EGA.DARK_GRAY); g.strokeRect(8, y, W - 16, 22)
      g.fillStyle(c.color); print(g, c.name, 14, y + 4, 1)
      g.fillStyle(EGA.DARK_GRAY); g.fillRect(70, y + 7, 100, 5)
      g.fillStyle(c.loyalty >= 60 ? EGA.LIGHT_GREEN : c.loyalty >= 40 ? EGA.YELLOW : EGA.LIGHT_RED)
      g.fillRect(70, y + 7, Math.floor(100 * c.loyalty / 100), 5)
      g.fillStyle(EGA.LIGHT_GRAY); print(g, `${c.loyalty}`, 175, y + 4, 1)
      g.fillStyle(at_risk ? EGA.LIGHT_RED : EGA.DARK_GRAY)
      print(g, at_risk ? `! ${c.status}` : c.status, 200, y + 4, 1)
    })
  }

  private drawInstallation(g: Phaser.GameObjects.Graphics, time: number) {
    g.fillStyle(EGA.CYAN); print(g, 'INSTALLATION STATUS', 10, 30)
    g.fillStyle(EGA.WHITE); print(g, `PROGRESS: ${STATE.installation}%`, 10, 46)
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(10, 60, W - 20, 10)
    const pulse = Math.abs(Math.sin(time * 0.003))
    g.fillStyle(EGA.CYAN, 0.6 + pulse * 0.4); g.fillRect(10, 60, Math.floor((W - 20) * STATE.installation / 100), 10)

    g.fillStyle(EGA.LIGHT_GRAY); print(g, 'TO COMPLETE:', 10, 78)
    const remaining = [
      { task: 'FINAL PANELS', pct: 80 },
      { task: 'LIGHTING RIG', pct: 40 },
      { task: 'ELDER BLESSING', pct: 0 },
    ]
    remaining.forEach((r, i) => {
      const y = 90 + i * 22
      g.fillStyle(r.pct > 0 ? EGA.YELLOW : EGA.LIGHT_RED)
      print(g, r.task, 10, y, 1)
      g.fillStyle(EGA.DARK_GRAY); g.fillRect(10, y + 9, 120, 4)
      g.fillStyle(r.pct > 0 ? EGA.YELLOW : EGA.DARK_GRAY); g.fillRect(10, y + 9, Math.floor(120 * r.pct / 100), 4)
      g.fillStyle(EGA.LIGHT_GRAY); print(g, `${r.pct}%`, 134, y, 1)
    })

    g.fillStyle(EGA.RED); print(g, `CRITICAL: ELDERS MUST BLESS FIRST.`, 10, 162, 1)
    g.fillStyle(EGA.YELLOW); print(g, 'USE YOUR LAST 2 DAYS WISELY.', 10, 172, 1)
  }
}
