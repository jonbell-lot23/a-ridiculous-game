import Phaser from 'phaser'
import { EGA } from '../../palette'
import { print } from '../../utils/font'

const W = 320, H = 200

// "Canonical" demo playthrough — a story that came out well
const OUTCOME = {
  councilTrust: 68,
  collectiveTrust: 82,
  eldersTrust: 74,
  installationPct: 91,
  crew: [
    { name: 'REN',    stayed: true,  color: EGA.LIGHT_BLUE },
    { name: 'HANA',   stayed: true,  color: EGA.LIGHT_GREEN },
    { name: 'GOROU',  stayed: true,  color: EGA.BROWN },
    { name: 'MIKO',   stayed: true,  color: EGA.LIGHT_MAGENTA },
    { name: 'DAICHI', stayed: false, color: EGA.DARK_GRAY },
  ],
  closingLines: [
    'THE CIRCUIT MOVED ON.',
    'WHANGANUI KEPT THE INSTALLATION.',
    'THE ELDERS NAMED IT.',
    'DAICHI STAYED BEHIND.',
  ],
}

type Phase = 'installation' | 'crew' | 'stats' | 'close'
const PHASES: Phase[] = ['installation', 'crew', 'stats', 'close']

export class P15_Legacy extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics
  private phaseIdx = 0
  private elapsed = 0
  private space!: Phaser.Input.Keyboard.Key

  constructor() { super({ key: 'P15' }) }

  create() {
    this.g = this.add.graphics()
    this.phaseIdx = 0; this.elapsed = 0
    const kb = this.input.keyboard!
    this.space = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => this.scene.start('PhaseSelector'))
  }

  update(_t: number, delta: number) {
    const g = this.g
    g.clear()
    this.elapsed += delta

    if (Phaser.Input.Keyboard.JustDown(this.space)) {
      if (this.phaseIdx < PHASES.length - 1) { this.phaseIdx++; this.elapsed = 0 }
      else this.scene.start('PhaseSelector')
    }

    switch (PHASES[this.phaseIdx]) {
      case 'installation': this.drawInstallation(g); break
      case 'crew':         this.drawCrew(g); break
      case 'stats':        this.drawStats(g); break
      case 'close':        this.drawClose(g); break
    }

    g.fillStyle(EGA.DARK_GRAY)
    print(g, this.phaseIdx < 3 ? '[SPACE] NEXT  [ESC] BACK' : '[SPACE] RETURN  [ESC] BACK', 60, 192, 1)
  }

  private drawInstallation(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(EGA.BLACK); g.fillRect(0, 0, W, H)
    g.fillStyle(EGA.YELLOW); print(g, 'THE INSTALLATION.', 80, 8)
    g.fillStyle(EGA.LIGHT_GRAY); print(g, 'DAY 30. IT WENT UP.', 80, 18, 1)

    // Building silhouette
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(90, 30, 140, 110)
    g.fillStyle(EGA.BLACK); g.fillRect(94, 34, 132, 102)

    // The installation — glowing LED panels
    const t = this.elapsed
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 8; col++) {
        const phase = (row + col + Math.floor(t * 0.003)) % 3
        const on = phase !== 0
        const brightness = on ? (0.7 + Math.sin(t * 0.002 + row + col) * 0.3) : 0.15
        g.fillStyle(on ? EGA.CYAN : EGA.BLUE, brightness)
        g.fillRect(98 + col * 15, 38 + row * 15, 12, 12)
      }
    }

    // Progress label
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(0, 148, W, 42)
    g.lineStyle(1, EGA.CYAN); g.lineBetween(0, 148, W, 148)
    g.fillStyle(EGA.WHITE); print(g, `COMPLETION: ${OUTCOME.installationPct}%`, 10, 154)
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(10, 168, 200, 6)
    const glow = 0.7 + Math.abs(Math.sin(this.elapsed * 0.002)) * 0.3
    g.fillStyle(EGA.CYAN, glow); g.fillRect(10, 168, Math.floor(200 * OUTCOME.installationPct / 100), 6)

    // Crowd silhouettes watching
    const crowd = [10, 26, 40, 250, 264, 280, 296]
    crowd.forEach(cx => {
      g.fillStyle(0x333333); g.fillRect(cx, 118, 8, 22); g.fillRect(cx + 1, 111, 6, 9)
    })
  }

  private drawCrew(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(EGA.BLACK); g.fillRect(0, 0, W, H)
    g.fillStyle(EGA.YELLOW); print(g, 'THE CIRCUIT.', 100, 8)
    g.fillStyle(EGA.LIGHT_GRAY); print(g, 'THEY MOVED ON.', 96, 18, 1)

    OUTCOME.crew.forEach((c, i) => {
      const x = 20 + i * 58
      const stayed = c.stayed
      // Portrait box
      g.fillStyle(stayed ? c.color : EGA.DARK_GRAY, stayed ? 0.3 : 0.15)
      g.fillRect(x, 34, 50, 80)
      g.lineStyle(1, stayed ? c.color : EGA.DARK_GRAY)
      g.strokeRect(x, 34, 50, 80)

      // Figure
      g.fillStyle(stayed ? c.color : EGA.DARK_GRAY)
      g.fillRect(x + 14, 54, 22, 36)
      g.fillRect(x + 18, 44, 14, 14)
      g.fillStyle(stayed ? EGA.BLACK : EGA.DARK_GRAY)
      g.fillRect(x + 21, 48, 4, 4); g.fillRect(x + 27, 48, 4, 4)

      // Name
      g.fillStyle(stayed ? c.color : EGA.DARK_GRAY)
      print(g, c.name, x + 4, 120, 1)
      // Status
      g.fillStyle(stayed ? EGA.LIGHT_GREEN : EGA.LIGHT_RED)
      print(g, stayed ? 'STAYS' : 'GONE', x + 8, 128, 1)
    })

    g.fillStyle(EGA.DARK_GRAY); g.fillRect(0, 148, W, 42)
    g.lineStyle(1, EGA.CYAN); g.lineBetween(0, 148, W, 148)
    g.fillStyle(EGA.LIGHT_GRAY); print(g, 'DAICHI STAYED. BECAME THEIR ARTIST.', 10, 158, 1)
    g.fillStyle(EGA.DARK_GRAY); print(g, 'THE OTHERS DROVE NORTH.', 10, 172, 1)
  }

  private drawStats(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(EGA.BLACK); g.fillRect(0, 0, W, H)
    g.fillStyle(EGA.YELLOW); print(g, 'WHANGANUI — THEN AND NOW.', 40, 8)

    const drawCompare = (label: string, before: number, after: number, color: number, y: number) => {
      g.fillStyle(EGA.LIGHT_GRAY); print(g, label, 10, y, 1)
      // Before bar
      g.fillStyle(EGA.DARK_GRAY); g.fillRect(10, y + 8, 120, 5)
      g.fillStyle(color, 0.4); g.fillRect(10, y + 8, Math.floor(120 * before / 100), 5)
      g.fillStyle(EGA.DARK_GRAY); print(g, `${before}`, 134, y, 1)
      g.fillStyle(EGA.DARK_GRAY); print(g, '->', 148, y, 1)
      // After bar
      g.fillStyle(EGA.DARK_GRAY); g.fillRect(170, y + 8, 120, 5)
      g.fillStyle(color); g.fillRect(170, y + 8, Math.floor(120 * after / 100), 5)
      g.fillStyle(color); print(g, `${after}`, 294, y, 1)
    }

    drawCompare('COUNCIL:', 30, OUTCOME.councilTrust, EGA.BLUE, 30)
    drawCompare('COLLECTIVE:', 50, OUTCOME.collectiveTrust, EGA.GREEN, 52)
    drawCompare('ELDERS:', 20, OUTCOME.eldersTrust, EGA.BROWN, 74)

    g.lineStyle(1, EGA.DARK_GRAY); g.lineBetween(8, 100, W - 8, 100)
    g.fillStyle(EGA.DARK_GRAY); print(g, 'BEFORE', 30, 105, 1)
    g.fillStyle(EGA.WHITE); print(g, 'AFTER', 200, 105, 1)

    g.fillStyle(EGA.LIGHT_GRAY)
    print(g, 'THESE NUMBERS DONT TELL THE STORY.', 10, 120, 1)
    print(g, 'THE STORY IS IN WHAT GOT BUILT.', 10, 130, 1)
    print(g, 'AND WHAT THEY KEPT AFTER YOU LEFT.', 10, 140, 1)
  }

  private drawClose(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(EGA.BLACK); g.fillRect(0, 0, W, H)
    // Stars
    for (let i = 0; i < 50; i++) {
      const sx = (i * 83 + 7) % W, sy = (i * 53 + 13) % 140
      const bright = Math.sin(this.elapsed * 0.002 + i) > 0
      g.fillStyle(bright ? EGA.WHITE : EGA.DARK_GRAY); g.fillRect(sx, sy, 2, 2)
    }

    const alpha = Math.min(1, this.elapsed / 1000)
    g.fillStyle(EGA.WHITE, alpha); print(g, 'A RIDICULOUS GAME.', 60, 50)

    if (this.elapsed > 800) {
      const a2 = Math.min(1, (this.elapsed - 800) / 800)
      OUTCOME.closingLines.forEach((l, i) => {
        g.fillStyle(i === 0 ? EGA.YELLOW : EGA.LIGHT_GRAY, a2)
        print(g, l, 60, 76 + i * 16, 1)
      })
    }

    if (this.elapsed > 2400) {
      g.fillStyle(EGA.CYAN); print(g, '— BUILT WITH VIBE CODING, 2026 —', 36, 148, 1)
    }
  }
}
