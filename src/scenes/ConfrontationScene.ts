import Phaser from 'phaser'
import { EGA } from '../palette'

const W = 320
const H = 200
const SCALE = 3

type Choice = 'CHALLENGE' | 'DODGE' | 'PASS' | 'HOLD'

const CHOICES: Choice[] = ['CHALLENGE', 'DODGE', 'PASS', 'HOLD']

const OUTCOMES: Record<Choice, Record<Choice, string>> = {
  CHALLENGE: { CHALLENGE: 'CLASH!',    DODGE: 'MISS!',     PASS: 'BLOCKED!', HOLD: 'PUSH THROUGH!' },
  DODGE:     { CHALLENGE: 'EVADED!',   DODGE: 'BOTH SLIP', PASS: 'SPACE!',   HOLD: 'SLIPPED PAST!' },
  PASS:      { CHALLENGE: 'INTERCEPT!',DODGE: 'OPEN LANE!',PASS: 'DEFLECT!', HOLD: 'THROUGH BALL!' },
  HOLD:      { CHALLENGE: 'SHOVED!',   DODGE: 'TRACKED!',  PASS: 'SHIELD!',  HOLD: 'STALEMATE' },
}

interface Fighter {
  name: string
  guts: number
  maxGuts: number
  color: number
  accentColor: number
}

export class ConfrontationScene extends Phaser.Scene {
  private player!: Fighter
  private opponent!: Fighter
  private phase: 'intro' | 'choose' | 'reveal' | 'outcome' = 'intro'
  private selectedIndex = 0
  private playerChoice: Choice | null = null
  private opponentChoice: Choice | null = null
  private graphics!: Phaser.GameObjects.Graphics
  private keys!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasdKeys!: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; confirm: Phaser.Input.Keyboard.Key }
  private canInput = true

  constructor() {
    super({ key: 'ConfrontationScene' })
  }

  create() {
    this.player = { name: 'REN', guts: 80, maxGuts: 100, color: EGA.LIGHT_BLUE, accentColor: EGA.CYAN }
    this.opponent = { name: 'GOROU', guts: 60, maxGuts: 100, color: EGA.LIGHT_RED, accentColor: EGA.RED }
    this.graphics = this.add.graphics()
    this.keys = this.input.keyboard!.createCursorKeys()
    this.wasdKeys = {
      up:      this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      confirm: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
    }
    this.phase = 'intro'
    this.time.delayedCall(1200, () => { this.phase = 'choose'; this.canInput = true })
  }

  update() {
    this.graphics.clear()
    this.drawBackground()
    this.drawFighters()
    this.drawGutsMeters()

    if (this.phase === 'choose') this.drawChoiceMenu()
    if (this.phase === 'reveal') this.drawReveal()
    if (this.phase === 'outcome') this.drawOutcome()
    if (this.phase === 'intro') this.drawIntro()

    this.handleInput()
  }

  private handleInput() {
    if (!this.canInput) return
    if (this.phase !== 'choose') return

    if (Phaser.Input.Keyboard.JustDown(this.keys.up) || Phaser.Input.Keyboard.JustDown(this.wasdKeys.up)) {
      this.selectedIndex = (this.selectedIndex - 1 + CHOICES.length) % CHOICES.length
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.down) || Phaser.Input.Keyboard.JustDown(this.wasdKeys.down)) {
      this.selectedIndex = (this.selectedIndex + 1) % CHOICES.length
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.space) || Phaser.Input.Keyboard.JustDown(this.wasdKeys.confirm)) {
      this.confirm()
    }
  }

  private confirm() {
    this.canInput = false
    this.playerChoice = CHOICES[this.selectedIndex]
    this.opponentChoice = CHOICES[Math.floor(Math.random() * CHOICES.length)]
    this.phase = 'reveal'
    this.time.delayedCall(1800, () => { this.phase = 'outcome' })
    this.time.delayedCall(3200, () => { this.resolveOutcome(); this.resetRound() })
  }

  private resolveOutcome() {
    if (!this.playerChoice || !this.opponentChoice) return
    const result = OUTCOMES[this.playerChoice][this.opponentChoice]
    const isGood = ['EVADED!', 'SPACE!', 'SLIPPED PAST!', 'OPEN LANE!', 'THROUGH BALL!', 'PUSH THROUGH!', 'SHIELD!'].includes(result)
    if (isGood) {
      this.opponent.guts = Math.max(0, this.opponent.guts - 15)
    } else {
      this.player.guts = Math.max(0, this.player.guts - 10)
    }
  }

  private resetRound() {
    this.playerChoice = null
    this.opponentChoice = null
    this.selectedIndex = 0
    this.phase = 'choose'
    this.canInput = true
  }

  // ── Drawing ──────────────────────────────────────────────────────────────

  private drawBackground() {
    const g = this.graphics
    // Sky
    g.fillStyle(EGA.BLUE); g.fillRect(0, 0, W, 90)
    // Ground
    g.fillStyle(EGA.GREEN); g.fillRect(0, 90, W, 110)
    // Pitch lines
    g.lineStyle(1, EGA.LIGHT_GREEN, 0.4)
    g.strokeRect(20, 95, W - 40, 60)
    g.lineBetween(W / 2, 95, W / 2, 155)
    // Title bar
    g.fillStyle(EGA.BLACK); g.fillRect(0, 0, W, 12)
    g.fillStyle(EGA.YELLOW)
    this.printText('CONFRONTATION', 4, 2)
  }

  private drawFighters() {
    const g = this.graphics
    // Player (left)
    g.fillStyle(this.player.color)
    g.fillRect(30, 55, 22, 36)
    g.fillStyle(this.player.accentColor)
    g.fillRect(34, 49, 14, 14) // head
    g.fillStyle(EGA.WHITE)
    this.printText(this.player.name, 18, 44)

    // Opponent (right)
    g.fillStyle(this.opponent.color)
    g.fillRect(W - 52, 55, 22, 36)
    g.fillStyle(this.opponent.accentColor)
    g.fillRect(W - 48, 49, 14, 14)
    g.fillStyle(EGA.LIGHT_GRAY)
    this.printText(this.opponent.name, W - 58, 44)
  }

  private drawGutsMeters() {
    const g = this.graphics
    const barW = 60; const barH = 6; const y = 163

    // Player guts
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(10, y, barW, barH)
    g.fillStyle(EGA.LIGHT_GREEN)
    g.fillRect(10, y, Math.floor(barW * (this.player.guts / this.player.maxGuts)), barH)
    g.fillStyle(EGA.WHITE); this.printText('GUTS', 10, y - 8)

    // Opponent guts
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(W - 70, y, barW, barH)
    g.fillStyle(EGA.LIGHT_RED)
    g.fillRect(W - 70, y, Math.floor(barW * (this.opponent.guts / this.opponent.maxGuts)), barH)
    g.fillStyle(EGA.WHITE); this.printText('GUTS', W - 70, y - 8)
  }

  private drawIntro() {
    const g = this.graphics
    // Dark overlay
    g.fillStyle(EGA.BLACK, 0.6); g.fillRect(40, 60, W - 80, 50)
    g.lineStyle(1, EGA.YELLOW); g.strokeRect(40, 60, W - 80, 50)
    g.fillStyle(EGA.YELLOW)
    this.printText('WHAT WILL', 105, 72)
    this.printText('YOU DO?', 110, 84)
  }

  private drawChoiceMenu() {
    const g = this.graphics
    // Panel
    g.fillStyle(EGA.BLACK); g.fillRect(0, 170, W, 30)
    g.lineStyle(1, EGA.CYAN); g.lineBetween(0, 170, W, 170)

    CHOICES.forEach((choice, i) => {
      const x = 10 + i * 76
      const selected = i === this.selectedIndex
      if (selected) {
        g.fillStyle(EGA.CYAN); g.fillRect(x - 2, 176, 72, 12)
        g.fillStyle(EGA.BLACK)
      } else {
        g.fillStyle(EGA.LIGHT_GRAY)
      }
      this.printText(choice, x + 2, 178)
    })

    // Cursor hint
    g.fillStyle(EGA.DARK_GRAY)
    this.printText('[UP/DOWN] SELECT  [SPACE] CONFIRM', 10, 192)
  }

  private drawReveal() {
    const g = this.graphics
    // Full panel takeover
    g.fillStyle(EGA.BLACK, 0.85); g.fillRect(20, 20, W - 40, 140)
    g.lineStyle(2, EGA.YELLOW); g.strokeRect(20, 20, W - 40, 140)

    // Player choice
    g.fillStyle(EGA.CYAN)
    this.printText(this.player.name + ':', 35, 35)
    g.fillStyle(EGA.WHITE)
    this.printText(this.playerChoice || '', 35, 47)

    // VS
    g.fillStyle(EGA.YELLOW)
    this.printText('VS', W / 2 - 4, 60)

    // Opponent choice — hidden until reveal
    g.fillStyle(EGA.LIGHT_RED)
    this.printText(this.opponent.name + ':', 35, 80)
    g.fillStyle(EGA.WHITE)
    this.printText(this.opponentChoice || '', 35, 92)

    // Tension dots
    const dots = Math.floor(Date.now() / 300) % 4
    g.fillStyle(EGA.YELLOW)
    this.printText('....'.slice(0, dots), W / 2 - 8, 115)
  }

  private drawOutcome() {
    if (!this.playerChoice || !this.opponentChoice) return
    const g = this.graphics
    const result = OUTCOMES[this.playerChoice][this.opponentChoice]

    g.fillStyle(EGA.BLACK, 0.85); g.fillRect(20, 20, W - 40, 140)
    g.lineStyle(2, EGA.LIGHT_GREEN); g.strokeRect(20, 20, W - 40, 140)

    g.fillStyle(EGA.CYAN)
    this.printText(this.player.name + ': ' + this.playerChoice, 35, 35)
    g.fillStyle(EGA.LIGHT_RED)
    this.printText(this.opponent.name + ': ' + this.opponentChoice, 35, 50)

    g.fillStyle(EGA.YELLOW)
    this.printText(result, W / 2 - (result.length * 4), 80)

    g.fillStyle(EGA.DARK_GRAY)
    this.printText('next round...', 100, 120)
  }

  // Tiny pixel font renderer (2x2 block per char, using Phaser's pixel art style)
  private printText(text: string, x: number, y: number) {
    // Use a temporary text object — we'll replace with a proper bitmap font later
    // For now render via Graphics rects using a minimal 4x5 font map
    const g = this.graphics
    const chars: Record<string, number[][]> = FONT
    let cx = x
    for (const ch of text.toUpperCase()) {
      const bitmap = chars[ch] || chars[' ']
      for (let row = 0; row < bitmap.length; row++) {
        for (let col = 0; col < bitmap[row].length; col++) {
          if (bitmap[row][col]) g.fillRect(cx + col * 2, y + row * 2, 2, 2)
        }
      }
      cx += (bitmap[0]?.length ?? 3) * 2 + 2
    }
  }
}

// Minimal 4x5 pixel font (each char: array of rows, 1=filled)
const FONT: Record<string, number[][]> = {
  'A': [[0,1,1,0],[1,0,0,1],[1,1,1,1],[1,0,0,1],[1,0,0,1]],
  'B': [[1,1,1,0],[1,0,0,1],[1,1,1,0],[1,0,0,1],[1,1,1,0]],
  'C': [[0,1,1,1],[1,0,0,0],[1,0,0,0],[1,0,0,0],[0,1,1,1]],
  'D': [[1,1,1,0],[1,0,0,1],[1,0,0,1],[1,0,0,1],[1,1,1,0]],
  'E': [[1,1,1,1],[1,0,0,0],[1,1,1,0],[1,0,0,0],[1,1,1,1]],
  'F': [[1,1,1,1],[1,0,0,0],[1,1,1,0],[1,0,0,0],[1,0,0,0]],
  'G': [[0,1,1,1],[1,0,0,0],[1,0,1,1],[1,0,0,1],[0,1,1,1]],
  'H': [[1,0,0,1],[1,0,0,1],[1,1,1,1],[1,0,0,1],[1,0,0,1]],
  'I': [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
  'J': [[0,0,1],[0,0,1],[0,0,1],[1,0,1],[0,1,1]],
  'K': [[1,0,0,1],[1,0,1,0],[1,1,0,0],[1,0,1,0],[1,0,0,1]],
  'L': [[1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,1,1]],
  'M': [[1,0,0,0,1],[1,1,0,1,1],[1,0,1,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  'N': [[1,0,0,1],[1,1,0,1],[1,0,1,1],[1,0,0,1],[1,0,0,1]],
  'O': [[0,1,1,0],[1,0,0,1],[1,0,0,1],[1,0,0,1],[0,1,1,0]],
  'P': [[1,1,1,0],[1,0,0,1],[1,1,1,0],[1,0,0,0],[1,0,0,0]],
  'Q': [[0,1,1,0],[1,0,0,1],[1,0,0,1],[1,0,1,1],[0,1,1,1]],
  'R': [[1,1,1,0],[1,0,0,1],[1,1,1,0],[1,0,1,0],[1,0,0,1]],
  'S': [[0,1,1,1],[1,0,0,0],[0,1,1,0],[0,0,0,1],[1,1,1,0]],
  'T': [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[0,1,0]],
  'U': [[1,0,0,1],[1,0,0,1],[1,0,0,1],[1,0,0,1],[0,1,1,0]],
  'V': [[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,1,0,1,0],[0,0,1,0,0]],
  'W': [[1,0,0,0,1],[1,0,0,0,1],[1,0,1,0,1],[1,1,0,1,1],[1,0,0,0,1]],
  'X': [[1,0,0,1],[0,1,1,0],[0,1,1,0],[0,1,1,0],[1,0,0,1]],
  'Y': [[1,0,0,1],[0,1,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
  'Z': [[1,1,1,1],[0,0,1,0],[0,1,0,0],[1,0,0,0],[1,1,1,1]],
  '0': [[0,1,1,0],[1,0,0,1],[1,0,0,1],[1,0,0,1],[0,1,1,0]],
  '1': [[0,1,0],[1,1,0],[0,1,0],[0,1,0],[1,1,1]],
  '2': [[0,1,1,0],[1,0,0,1],[0,0,1,0],[0,1,0,0],[1,1,1,1]],
  '3': [[1,1,1,0],[0,0,0,1],[0,1,1,0],[0,0,0,1],[1,1,1,0]],
  '4': [[1,0,0,1],[1,0,0,1],[1,1,1,1],[0,0,0,1],[0,0,0,1]],
  '5': [[1,1,1,1],[1,0,0,0],[1,1,1,0],[0,0,0,1],[1,1,1,0]],
  '6': [[0,1,1,0],[1,0,0,0],[1,1,1,0],[1,0,0,1],[0,1,1,0]],
  '7': [[1,1,1,1],[0,0,0,1],[0,0,1,0],[0,1,0,0],[0,1,0,0]],
  '8': [[0,1,1,0],[1,0,0,1],[0,1,1,0],[1,0,0,1],[0,1,1,0]],
  '9': [[0,1,1,0],[1,0,0,1],[0,1,1,1],[0,0,0,1],[0,1,1,0]],
  '!': [[1],[1],[1],[0],[1]],
  '?': [[0,1,1],[1,0,0],[0,1,0],[0,0,0],[0,1,0]],
  ':': [[0],[1],[0],[1],[0]],
  '.': [[0],[0],[0],[0],[1]],
  '/': [[0,0,1],[0,0,1],[0,1,0],[1,0,0],[1,0,0]],
  '[': [[1,1],[1,0],[1,0],[1,0],[1,1]],
  ']': [[1,1],[0,1],[0,1],[0,1],[1,1]],
  ' ': [[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]],
}
