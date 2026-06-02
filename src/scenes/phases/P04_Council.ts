import Phaser from 'phaser'
import { EGA } from '../../palette'
import { print } from '../../utils/font'

const W = 320, H = 200

type Beat = { speaker: string; line: string; choices: { text: string; delta: number; reply: string }[] }

const BEATS: Beat[] = [
  {
    speaker: 'COUNCIL',
    line: 'YOU WANT THE SQUARE. WHY?',
    choices: [
      { text: 'WE BUILD CONNECTIONS', delta: +10, reply: 'INTERESTING. GO ON.' },
      { text: 'PERFECT FOR OUR WORK', delta: +5,  reply: 'MANY GROUPS ASK FOR IT.' },
      { text: 'WE HAVE OTHER PERMITS', delta: -5,  reply: 'THIS IS NOT OTHER TOWNS.' },
    ],
  },
  {
    speaker: 'COUNCIL',
    line: 'WHAT DOES THIS COST US?',
    choices: [
      { text: 'NOTHING. BRINGS VISITORS', delta: +8,  reply: 'HOW MANY?' },
      { text: 'LESS THAN YOU THINK', delta: +2,  reply: '...' },
      { text: 'YOUR INVESTMENT RETURNS', delta: -3,  reply: 'WE HAVE NO INVESTMENT.' },
    ],
  },
  {
    speaker: 'COUNCIL',
    line: "DON'T PUSH US.",
    choices: [
      { text: 'WE APPRECIATE YOUR TIME', delta: +5,  reply: "WE'LL BE IN TOUCH." },
      { text: 'TIME IS SHORT FOR US',   delta: -5,  reply: "THAT'S YOUR PROBLEM." },
      { text: 'ELDERS AND CROWD ARE WITH US', delta: +12, reply: '...INTERESTING. WE DISCUSS.' },
    ],
  },
]

function dealLabel(score: number) {
  if (score > 80) return { text: 'DEAL MADE', color: EGA.LIGHT_GREEN }
  if (score > 65) return { text: 'WARM', color: EGA.YELLOW }
  if (score > 44) return { text: 'NEUTRAL', color: EGA.LIGHT_GRAY }
  return { text: 'COLD', color: EGA.LIGHT_RED }
}

export class P04_Council extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics
  private beat = 0
  private sel = 0
  private deal = 50
  private reply = ''
  private showReply = false
  private up!: Phaser.Input.Keyboard.Key
  private dn!: Phaser.Input.Keyboard.Key
  private ok!: Phaser.Input.Keyboard.Key

  constructor() { super({ key: 'P04' }) }

  create() {
    this.g = this.add.graphics()
    this.beat = 0; this.sel = 0; this.deal = 50; this.showReply = false
    const kb = this.input.keyboard!
    this.up = kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
    this.dn = kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN)
    this.ok = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => this.scene.start('PhaseSelector'))
  }

  update() {
    const g = this.g
    g.clear()
    this.handleInput()

    // Chamber background: dark pillars
    g.fillStyle(0x111122); g.fillRect(0, 0, W, H)
    g.fillStyle(EGA.DARK_GRAY)
    for (let x = 0; x < W; x += 40) { g.fillRect(x, 0, 8, 90) }
    g.fillStyle(0x111122); g.fillRect(0, 0, W, 10) // ceiling band

    // Deal score bar (top)
    g.fillStyle(EGA.BLACK); g.fillRect(0, 0, W, 14)
    g.fillStyle(EGA.DARK_GRAY); print(g, 'DEAL SCORE:', 6, 3)
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(90, 4, 160, 6)
    const dl = dealLabel(this.deal)
    g.fillStyle(dl.color); g.fillRect(90, 4, Math.floor(160 * this.deal / 100), 6)
    g.fillStyle(dl.color); print(g, dl.text, 258, 3)

    if (this.beat >= BEATS.length) {
      this.drawEnd()
      return
    }

    const currentBeat = BEATS[this.beat]

    // Council portrait (right side)
    this.drawCouncilRep(g, W - 80, 18)

    // Speech bubble from Council
    g.fillStyle(EGA.BLACK, 0.8); g.fillRect(10, 20, 190, 40)
    g.lineStyle(1, EGA.BLUE); g.strokeRect(10, 20, 190, 40)
    g.fillStyle(EGA.BLUE); print(g, 'COUNCIL:', 16, 24, 1)
    g.fillStyle(EGA.WHITE); print(g, currentBeat.line, 16, 34, 1)
    // Arrow from bubble to rep
    g.fillStyle(EGA.BLUE); g.fillRect(200, 34, 12, 4)

    if (this.showReply) {
      g.fillStyle(EGA.BLACK, 0.85); g.fillRect(30, 75, 200, 30)
      g.lineStyle(1, EGA.CYAN); g.strokeRect(30, 75, 200, 30)
      g.fillStyle(EGA.CYAN); print(g, 'COUNCIL:', 36, 79, 1)
      g.fillStyle(EGA.WHITE); print(g, this.reply, 36, 89, 1)
    } else {
      // Response choices
      g.fillStyle(EGA.DARK_GRAY); print(g, 'YOUR RESPONSE:', 16, 74)
      currentBeat.choices.forEach((c, i) => {
        const sel = i === this.sel
        if (sel) { g.fillStyle(EGA.DARK_GRAY); g.fillRect(14, 86 + i * 16, 220, 14) }
        g.fillStyle(sel ? EGA.YELLOW : EGA.LIGHT_GRAY)
        print(g, `${sel ? '>' : ' '} ${c.text}`, 16, 88 + i * 16, 1)
        const sign = c.delta >= 0 ? '+' : ''
        g.fillStyle(c.delta >= 0 ? EGA.LIGHT_GREEN : EGA.LIGHT_RED)
        print(g, `${sign}${c.delta}`, 240, 88 + i * 16, 1)
      })
    }

    // Beat progress
    BEATS.forEach((_, i) => {
      g.fillStyle(i < this.beat ? EGA.CYAN : i === this.beat ? EGA.YELLOW : EGA.DARK_GRAY)
      g.fillRect(W / 2 - 16 + i * 14, 140, 10, 4)
    })

    // Ren portrait (left)
    this.drawRen(g, 10, 100)

    g.fillStyle(EGA.DARK_GRAY)
    print(g, this.showReply ? '[SPACE] NEXT' : '[^/v] SELECT  [SPACE] SPEAK', 10, 191, 1)
  }

  private handleInput() {
    if (this.beat >= BEATS.length) return
    if (this.showReply) {
      if (Phaser.Input.Keyboard.JustDown(this.ok)) {
        this.beat++
        this.sel = 0
        this.showReply = false
      }
      return
    }
    if (Phaser.Input.Keyboard.JustDown(this.up)) this.sel = (this.sel - 1 + 3) % 3
    if (Phaser.Input.Keyboard.JustDown(this.dn)) this.sel = (this.sel + 1) % 3
    if (Phaser.Input.Keyboard.JustDown(this.ok)) {
      const choice = BEATS[this.beat].choices[this.sel]
      this.deal = Math.max(0, Math.min(100, this.deal + choice.delta))
      this.reply = choice.reply
      this.showReply = true
    }
  }

  private drawCouncilRep(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(x, y, 34, 50)
    g.fillStyle(EGA.BROWN); g.fillRect(x + 6, y - 10, 22, 18)
    g.fillStyle(EGA.BLACK); g.fillRect(x + 10, y - 6, 5, 5); g.fillRect(x + 19, y - 6, 5, 5)
    g.fillStyle(EGA.BLUE); g.fillRect(x + 2, y + 4, 30, 4) // collar
  }

  private drawRen(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    g.fillStyle(EGA.LIGHT_BLUE); g.fillRect(x, y + 18, 24, 38)
    g.fillStyle(EGA.CYAN); g.fillRect(x + 4, y + 6, 16, 14)
    g.fillStyle(EGA.BLACK); g.fillRect(x + 7, y + 10, 4, 4); g.fillRect(x + 13, y + 10, 4, 4)
    g.fillStyle(EGA.LIGHT_GRAY); print(g, 'REN', x + 2, y + 58, 1)
  }

  private drawEnd() {
    const g = this.g
    const dl = dealLabel(this.deal)
    g.fillStyle(EGA.BLACK); g.fillRect(30, 30, 260, 140)
    g.lineStyle(2, dl.color); g.strokeRect(30, 30, 260, 140)
    g.fillStyle(EGA.WHITE); print(g, 'MEETING ADJOURNED.', 70, 50)
    g.fillStyle(EGA.DARK_GRAY); print(g, 'FINAL DEAL SCORE:', 70, 70)
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(60, 84, 200, 8)
    g.fillStyle(dl.color); g.fillRect(60, 84, Math.floor(200 * this.deal / 100), 8)
    g.fillStyle(dl.color); print(g, `${this.deal}/100 — ${dl.text}`, 70, 100)
    g.fillStyle(EGA.LIGHT_GRAY); print(g, 'OUTCOME CARRIES TO NEXT SESSION.', 50, 120, 1)
    g.fillStyle(EGA.DARK_GRAY); print(g, '[ESC] BACK TO SELECTOR', 80, 148)
  }
}
