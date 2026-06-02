import Phaser from 'phaser'
import { EGA } from '../../palette'
import { print } from '../../utils/font'

const W = 320, H = 200

const CREW = [
  { name: 'REN',    color: EGA.LIGHT_BLUE,    skills: [3, 2, 3, 4, 3] },
  { name: 'HANA',   color: EGA.LIGHT_GREEN,   skills: [4, 2, 2, 5, 4] },
  { name: 'GOROU',  color: EGA.BROWN,         skills: [2, 5, 5, 2, 1] },
  { name: 'MIKO',   color: EGA.LIGHT_MAGENTA, skills: [3, 1, 2, 5, 3] },
  { name: 'DAICHI', color: EGA.LIGHT_RED,     skills: [5, 4, 4, 1, 2] },
]

const TASKS = ['DESIGN', 'FABRICATE', 'INSTALL', 'NEGOTIATE', 'DOCUMENT']

function skillColor(s: number): number {
  if (s >= 5) return EGA.LIGHT_GREEN
  if (s >= 4) return EGA.YELLOW
  if (s >= 3) return EGA.LIGHT_GRAY
  if (s >= 2) return EGA.DARK_GRAY
  return EGA.LIGHT_RED
}

export class P11_Build extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics
  private row = 0
  private col = 0
  // assignments[taskIdx] = crewIdx or -1
  private assignments: number[] = [-1, -1, -1, -1, -1]
  private confirmed = false
  private up!: Phaser.Input.Keyboard.Key
  private dn!: Phaser.Input.Keyboard.Key
  private lt!: Phaser.Input.Keyboard.Key
  private rt!: Phaser.Input.Keyboard.Key
  private ok!: Phaser.Input.Keyboard.Key

  constructor() { super({ key: 'P11' }) }

  create() {
    this.g = this.add.graphics()
    this.row = 0; this.col = 0; this.assignments = [-1, -1, -1, -1, -1]; this.confirmed = false
    const kb = this.input.keyboard!
    this.up = kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
    this.dn = kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN)
    this.lt = kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT)
    this.rt = kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)
    this.ok = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => this.scene.start('PhaseSelector'))
  }

  update() {
    const g = this.g
    g.clear()
    this.handleInput()

    g.fillStyle(EGA.BLACK); g.fillRect(0, 0, W, H)
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(0, 0, W, 14)
    g.fillStyle(EGA.YELLOW); print(g, 'BUILD DAY — ASSIGN CREW', 6, 3)

    if (this.confirmed) { this.drawConfirmed(g); return }

    const oX = 60, oY = 18, cW = 50, cH = 22

    // Task headers (cols)
    TASKS.forEach((t, ci) => {
      const x = oX + ci * cW
      const sel = ci === this.col
      g.fillStyle(sel ? EGA.YELLOW : EGA.DARK_GRAY)
      print(g, t.slice(0, 4), x + 2, oY + 2, 1)
      if (sel) { g.lineStyle(1, EGA.YELLOW); g.lineBetween(x, oY, x + cW - 2, oY) }
    })

    // Crew rows
    CREW.forEach((crew, ri) => {
      const y = oY + 16 + ri * cH
      const rowSel = ri === this.row
      g.fillStyle(rowSel ? crew.color : EGA.DARK_GRAY)
      print(g, crew.name, 2, y + 6, 1)

      TASKS.forEach((_, ci) => {
        const x = oX + ci * cW
        const sel = ri === this.row && ci === this.col
        const assignedHere = this.assignments[ci] === ri
        const crewBusy = this.assignments.some((a, ti) => a === ri && ti !== ci)

        const skill = crew.skills[ci]
        const sc = skillColor(skill)

        if (sel) {
          g.fillStyle(sc, 0.3); g.fillRect(x + 1, y + 1, cW - 4, cH - 4)
          g.lineStyle(2, EGA.YELLOW); g.strokeRect(x + 1, y + 1, cW - 4, cH - 4)
        } else if (assignedHere) {
          g.fillStyle(crew.color, 0.3); g.fillRect(x + 1, y + 1, cW - 4, cH - 4)
          g.lineStyle(1, crew.color); g.strokeRect(x + 1, y + 1, cW - 4, cH - 4)
        } else {
          g.lineStyle(1, EGA.DARK_GRAY); g.strokeRect(x + 1, y + 1, cW - 4, cH - 4)
        }

        if (assignedHere) {
          g.fillStyle(crew.color); print(g, crew.name.slice(0, 3), x + 4, y + 7, 1)
        } else if (!crewBusy) {
          g.fillStyle(crewBusy ? EGA.DARK_GRAY : sc)
          print(g, String(skill), x + 20, y + 7, 1)
        }
      })
    })

    // Quality score
    const quality = this.calcQuality()
    const allAssigned = this.assignments.every(a => a >= 0)
    g.fillStyle(EGA.BLACK); g.fillRect(0, 138, W, 52)
    g.lineStyle(1, EGA.CYAN); g.lineBetween(0, 138, W, 138)
    g.fillStyle(EGA.WHITE); print(g, 'BUILD QUALITY:', 6, 143)
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(6, 156, 200, 6)
    g.fillStyle(quality > 60 ? EGA.LIGHT_GREEN : quality > 40 ? EGA.YELLOW : EGA.LIGHT_RED)
    g.fillRect(6, 156, Math.floor(200 * quality / 100), 6)
    g.fillStyle(EGA.LIGHT_GRAY); print(g, `${quality}%`, 212, 153, 1)
    g.fillStyle(EGA.DARK_GRAY)
    print(g, allAssigned ? '[SPACE] CONFIRM BUILD' : `[ARROWS] NAV  [SPACE] ASSIGN  [ESC] BACK`, 6, 168, 1)
    if (allAssigned) { g.fillStyle(EGA.YELLOW); print(g, 'ALL ASSIGNED — CONFIRM?', 6, 180, 1) }
  }

  private handleInput() {
    if (this.confirmed) return
    if (Phaser.Input.Keyboard.JustDown(this.up)) this.row = (this.row - 1 + CREW.length) % CREW.length
    if (Phaser.Input.Keyboard.JustDown(this.dn)) this.row = (this.row + 1) % CREW.length
    if (Phaser.Input.Keyboard.JustDown(this.lt)) this.col = (this.col - 1 + TASKS.length) % TASKS.length
    if (Phaser.Input.Keyboard.JustDown(this.rt)) this.col = (this.col + 1) % TASKS.length
    if (Phaser.Input.Keyboard.JustDown(this.ok)) {
      const allAssigned = this.assignments.every(a => a >= 0)
      if (allAssigned) { this.confirmed = true; return }
      // Toggle assignment
      const crewBusy = this.assignments.findIndex((a, ti) => a === this.row && ti !== this.col)
      if (this.assignments[this.col] === this.row) {
        this.assignments[this.col] = -1 // unassign
      } else if (crewBusy >= 0) {
        // Already assigned elsewhere — unassign there, assign here
        this.assignments[crewBusy] = -1
        this.assignments[this.col] = this.row
      } else if (this.assignments[this.col] >= 0) {
        // Task already has someone — swap
        this.assignments[this.col] = this.row
      } else {
        this.assignments[this.col] = this.row
      }
    }
  }

  private calcQuality(): number {
    let total = 0, count = 0
    this.assignments.forEach((crewIdx, taskIdx) => {
      if (crewIdx >= 0) { total += CREW[crewIdx].skills[taskIdx]; count++ }
    })
    return count === 0 ? 0 : Math.round((total / (count * 5)) * 100)
  }

  private drawConfirmed(g: Phaser.GameObjects.Graphics) {
    const q = this.calcQuality()
    g.fillStyle(EGA.BLACK); g.fillRect(20, 20, W - 40, 160)
    g.lineStyle(2, q > 60 ? EGA.LIGHT_GREEN : EGA.YELLOW); g.strokeRect(20, 20, W - 40, 160)
    g.fillStyle(EGA.YELLOW); print(g, 'BUILD DAY UNDERWAY.', 46, 30)
    g.fillStyle(EGA.WHITE); print(g, 'CREW ASSIGNMENTS:', 46, 48)
    this.assignments.forEach((crewIdx, ti) => {
      const crew = crewIdx >= 0 ? CREW[crewIdx] : null
      g.fillStyle(crew ? crew.color : EGA.DARK_GRAY)
      print(g, `${TASKS[ti]}: ${crew ? crew.name : 'UNASSIGNED'}`, 46, 62 + ti * 14, 1)
      if (crew) {
        g.fillStyle(skillColor(crew.skills[ti]))
        print(g, `(SKILL ${crew.skills[ti]})`, 180, 62 + ti * 14, 1)
      }
    })
    g.fillStyle(EGA.WHITE); print(g, `QUALITY: ${q}%`, 46, 140)
    g.fillStyle(EGA.DARK_GRAY); print(g, '[ESC] BACK TO SELECTOR', 64, 158)
  }
}
