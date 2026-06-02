import Phaser from 'phaser'
import { EGA } from '../../palette'
import { print } from '../../utils/font'

const W = 320, H = 200

const VOICES = [
  {
    name: 'TAMA',   color: EGA.LIGHT_BLUE,
    lines: ['WE NEED STUDIO SPACE.', 'WHO DECIDES HERE?', 'I HEARD THIS BEFORE.'],
    reactions: [
      'HE NODS. "STUDIO FLOOR IS YOURS — IF YOU ASK FIRST."',
      'HE LAUGHS. "TECHNICALLY? NOBODY. PRACTICALLY? EVERYONE."',
      '"BUT THIS TIME IT\'S DIFFERENT. I CAN SEE IT."',
    ],
  },
  {
    name: 'AROHA',  color: EGA.LIGHT_GREEN,
    lines: ['THE YOUTH NEED THIS.', 'BRING THEM IN EARLY.', 'WHAT DO YOU NEED?'],
    reactions: [
      '"INVOLVE THE RANGATAHI FROM DAY ONE. NON-NEGOTIABLE."',
      '"THEY SMELL TOKENISM A MILE OFF. INVOLVE OR EXCLUDE."',
      '"VOLUNTEERS. TWENTY OF THEM. STARTING TOMORROW."',
    ],
  },
  {
    name: 'PETE',   color: EGA.YELLOW,
    lines: ["DON'T TRUST THE COUNCIL.", 'WORK AROUND THEM.', 'WE HAVE THE CONTACTS.'],
    reactions: [
      '"TANE WILL STALL FOREVER. USE EMERGENCY CONSENT."',
      '"THREE WEEKS NOTICE. TECHNICALLY LEGAL. USE IT."',
      '"GIVE ME A LIST. I\'LL MAKE CALLS."',
    ],
  },
  {
    name: 'NGAIO',  color: EGA.BROWN,
    lines: ['ELDERS WILL BLOCK THIS.', 'UNLESS...', 'THERE IS A WAY.'],
    reactions: [
      '"KUIA MERE LOST HER SON HERE. THE SITE MATTERS TO HER."',
      '"UNLESS YOU HONOR THE STORY OF THIS PLACE."',
      '"GO TO HER FIRST. BEFORE ANYONE ELSE."',
    ],
  },
  {
    name: 'JAMIE',  color: EGA.LIGHT_MAGENTA,
    lines: ['JUST START. ASK FORGIVENESS.', '...', "THAT'S HOW IT WORKS HERE."],
    reactions: [
      '"OR SPEND THREE WEEKS IN MEETINGS AND MISS YOUR WINDOW."',
      '"...SOMETIMES SILENCE IS STRATEGY."',
      '"EVERY SUCCESSFUL PROJECT HERE STARTED WITHOUT PERMISSION."',
    ],
  },
]

export class P05_Collective extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics
  private sel = 0
  private addressed: number[] = []
  private lineOffset = 0
  private lineTimer = 0
  private reaction = ''
  private showReaction = false
  private reactionTimer = 0
  private up!: Phaser.Input.Keyboard.Key
  private dn!: Phaser.Input.Keyboard.Key
  private ok!: Phaser.Input.Keyboard.Key

  constructor() { super({ key: 'P05' }) }

  create() {
    this.g = this.add.graphics()
    this.sel = 0; this.addressed = []; this.lineOffset = 0
    this.lineTimer = 0; this.showReaction = false
    const kb = this.input.keyboard!
    this.up = kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
    this.dn = kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN)
    this.ok = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => this.scene.start('PhaseSelector'))
  }

  update(_t: number, delta: number) {
    const g = this.g
    g.clear()
    this.lineTimer += delta
    if (this.lineTimer > 2800) { this.lineOffset++; this.lineTimer = 0 }
    if (this.showReaction) {
      this.reactionTimer -= delta
      if (this.reactionTimer <= 0) this.showReaction = false
    }
    this.handleInput()

    g.fillStyle(EGA.BLACK); g.fillRect(0, 0, W, H)
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(0, 0, W, 14)
    g.fillStyle(EGA.YELLOW); print(g, 'THE COLLECTIVE MEETING', 50, 3)
    g.fillStyle(EGA.LIGHT_GRAY); print(g, `${3 - this.addressed.length} ADDRESSES LEFT`, 216, 3, 1)

    if (this.addressed.length >= 3) {
      this.drawDone()
      return
    }

    VOICES.forEach((v, i) => {
      const y = 18 + i * 24
      const sel = i === this.sel
      const done = this.addressed.includes(i)
      const lineIdx = this.lineOffset % v.lines.length

      if (sel && !done) {
        g.fillStyle(EGA.DARK_GRAY); g.fillRect(6, y, W - 12, 22)
        g.lineStyle(1, v.color); g.strokeRect(6, y, W - 12, 22)
      } else {
        g.lineStyle(1, done ? EGA.DARK_GRAY : 0x222233); g.strokeRect(6, y, W - 12, 22)
      }

      // Name
      g.fillStyle(done ? EGA.DARK_GRAY : v.color)
      print(g, v.name, 12, y + 4, 1)

      // Current line (cycling)
      if (!done) {
        g.fillStyle(sel ? EGA.WHITE : EGA.LIGHT_GRAY)
        print(g, `"${v.lines[lineIdx]}"`, 50, y + 4, 1)
      } else {
        g.fillStyle(EGA.DARK_GRAY); print(g, '(addressed)', 50, y + 4, 1)
      }
    })

    // Reaction bubble
    if (this.showReaction) {
      g.fillStyle(EGA.BLACK, 0.9); g.fillRect(10, 140, W - 20, 42)
      g.lineStyle(1, EGA.CYAN); g.strokeRect(10, 140, W - 20, 42)
      g.fillStyle(EGA.CYAN); print(g, VOICES[this.sel].name + ':', 16, 144, 1)
      g.fillStyle(EGA.WHITE); print(g, this.reaction, 16, 154, 1)
    } else {
      g.fillStyle(EGA.DARK_GRAY)
      print(g, '[^/v] SELECT   [SPACE] ADDRESS   [ESC] BACK', 10, 191, 1)
    }
  }

  private handleInput() {
    if (this.addressed.length >= 3) return
    if (Phaser.Input.Keyboard.JustDown(this.up)) {
      this.sel = (this.sel - 1 + VOICES.length) % VOICES.length
    }
    if (Phaser.Input.Keyboard.JustDown(this.dn)) {
      this.sel = (this.sel + 1) % VOICES.length
    }
    if (Phaser.Input.Keyboard.JustDown(this.ok)) {
      if (this.addressed.includes(this.sel)) return
      const lineIdx = this.lineOffset % VOICES[this.sel].lines.length
      this.reaction = VOICES[this.sel].reactions[lineIdx]
      this.addressed.push(this.sel)
      this.showReaction = true
      this.reactionTimer = 3000
    }
  }

  private drawDone() {
    const g = this.g
    g.fillStyle(EGA.BLACK); g.fillRect(20, 20, W - 40, 160)
    g.lineStyle(1, EGA.GREEN); g.strokeRect(20, 20, W - 40, 160)
    g.fillStyle(EGA.LIGHT_GREEN); print(g, 'MEETING ENDS.', 80, 30)
    g.fillStyle(EGA.WHITE); print(g, 'YOU ADDRESSED:', 80, 48)
    this.addressed.forEach((idx, i) => {
      const v = VOICES[idx]
      g.fillStyle(v.color); print(g, `- ${v.name}`, 60, 62 + i * 18)
    })
    g.fillStyle(EGA.DARK_GRAY)
    print(g, 'THEIR ADVICE CARRIES FORWARD.', 40, 130, 1)
    print(g, '[ESC] BACK TO SELECTOR', 70, 148)
  }
}
