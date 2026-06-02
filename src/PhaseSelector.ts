import Phaser from 'phaser'
import { EGA } from './palette'
import { print } from './utils/font'

const W = 320, H = 200

const PHASES = [
  { key: 'P01', label: 'ARRIVE',  title: 'THE ARRIVAL',     desc: 'Van pulls in. Town reveals its factions.' },
  { key: 'P02', label: 'PLAN',    title: 'MORNING BRIEF',   desc: '3 action slots. Build your day.' },
  { key: 'P03', label: 'MAP',     title: 'TOWN PULSE',      desc: 'Navigate zones. Read faction health.' },
  { key: 'P04', label: 'COUNCIL', title: 'COUNCIL CHAMBER', desc: 'Formal dialogue. Deal score tracked.' },
  { key: 'P05', label: 'CROWD',   title: 'THE COLLECTIVE',  desc: 'Chaotic. 5 voices. Who do you address?' },
  { key: 'P06', label: 'ELDERS',  title: 'ELDER MEETING',   desc: 'Slow. Share a story. See their reaction.' },
  { key: 'P07', label: 'FIGHT',   title: 'CONFRONTATION',   desc: '3-round hidden choice. Guts economy.' },
  { key: 'P08', label: 'HANA',    title: 'BOND: HANA',      desc: 'Press or deflect. Her secret wants out.' },
  { key: 'P09', label: 'DAICHI',  title: 'BOND: DAICHI',    desc: 'Loyalty bar. One choice. Watch it shift.' },
  { key: 'P10', label: 'INTEL',   title: 'INTEL PHASE',     desc: '3 tokens. Bribe, rumor, espionage, bank.' },
  { key: 'P11', label: 'BUILD',   title: 'BUILD DAY',       desc: 'Assign crew to tasks. Quality compounds.' },
  { key: 'P12', label: 'SPEECH',  title: 'PUBLIC EVENT',    desc: 'Build a speech. 3 factions watching.' },
  { key: 'P13', label: 'CRISIS',  title: 'CRISIS',          desc: '10-second timer. Something went wrong.' },
  { key: 'P14', label: 'DAY 28',  title: 'DAY 28 DASH',     desc: 'Full dashboard. 3 days left.' },
  { key: 'P15', label: 'LEGACY',  title: 'THE LEGACY',      desc: 'What you built. Who stayed. What changed.' },
]

export class PhaseSelector extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics
  private sel = 0
  private up!: Phaser.Input.Keyboard.Key
  private dn!: Phaser.Input.Keyboard.Key
  private lt!: Phaser.Input.Keyboard.Key
  private rt!: Phaser.Input.Keyboard.Key
  private ok!: Phaser.Input.Keyboard.Key

  constructor() { super({ key: 'PhaseSelector' }) }

  create() {
    this.g = this.add.graphics()
    const kb = this.input.keyboard!
    this.up = kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
    this.dn = kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN)
    this.lt = kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT)
    this.rt = kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)
    this.ok = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER).on('down', () => this.launch())
  }

  update() {
    const g = this.g
    g.clear()

    // Background
    g.fillStyle(EGA.BLACK); g.fillRect(0, 0, W, H)

    // Header
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(0, 0, W, 14)
    g.fillStyle(EGA.YELLOW); print(g, 'A RIDICULOUS GAME', 6, 3)
    g.fillStyle(EGA.CYAN); print(g, 'PHASE SELECT', 190, 3)

    // Grid: 5 cols × 3 rows
    const cW = 60, cH = 43, oX = 10, oY = 17
    PHASES.forEach((p, i) => {
      const col = i % 5, row = Math.floor(i / 5)
      const x = oX + col * cW, y = oY + row * cH
      const sel = i === this.sel

      if (sel) {
        g.fillStyle(EGA.DARK_GRAY); g.fillRect(x, y, cW - 4, cH - 4)
        g.lineStyle(1, EGA.YELLOW); g.strokeRect(x, y, cW - 4, cH - 4)
      } else {
        g.lineStyle(1, EGA.DARK_GRAY); g.strokeRect(x, y, cW - 4, cH - 4)
      }

      g.fillStyle(sel ? EGA.YELLOW : EGA.DARK_GRAY)
      print(g, String(i + 1).padStart(2, '0'), x + 3, y + 3, 2)
      g.fillStyle(sel ? EGA.WHITE : EGA.LIGHT_GRAY)
      print(g, p.label, x + 3, y + 17, 1)
    })

    // Info bar
    const phase = PHASES[this.sel]
    g.fillStyle(EGA.BLACK); g.fillRect(0, 150, W, H - 150)
    g.lineStyle(1, EGA.CYAN); g.lineBetween(0, 150, W, 150)
    g.fillStyle(EGA.CYAN); print(g, `[${String(this.sel + 1).padStart(2, '0')}] ${phase.title}`, 6, 155)
    g.fillStyle(EGA.LIGHT_GRAY); print(g, phase.desc, 6, 168, 1)
    g.fillStyle(EGA.DARK_GRAY); print(g, '[ARROWS] MOVE   [SPACE] LAUNCH', 6, 185)

    // Handle input
    if (Phaser.Input.Keyboard.JustDown(this.lt)) this.sel = (this.sel - 1 + 15) % 15
    if (Phaser.Input.Keyboard.JustDown(this.rt)) this.sel = (this.sel + 1) % 15
    if (Phaser.Input.Keyboard.JustDown(this.up)) this.sel = (this.sel - 5 + 15) % 15
    if (Phaser.Input.Keyboard.JustDown(this.dn)) this.sel = (this.sel + 5) % 15
    if (Phaser.Input.Keyboard.JustDown(this.ok)) this.launch()
  }

  private launch() { this.scene.start(PHASES[this.sel].key) }
}
