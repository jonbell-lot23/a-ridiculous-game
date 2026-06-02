// The Captain Tsubasa mechanic done right:
// Opponent has a learnable personality + visible tell (65-72% accurate).
// You commit before seeing the result. The reveal gap IS the tension.
// Guts = life. Hit 0 and you lose immediately.
import Phaser from 'phaser'
import { EGA } from '../../palette'
import { print } from '../../utils/font'

const W = 320, H = 200
const TELL_MS = 900     // how long opponent shows their tell
const REVEAL_GAP = 700  // silence between "both showed" and outcome text
const OUTCOME_MS = 2200 // how long outcome is shown
const SPECIAL_COST = 25
const ROUNDS = 5

type Choice = 'CHALLENGE' | 'DODGE' | 'PASS' | 'HOLD' | 'SPECIAL'
const CHOICES: Choice[] = ['CHALLENGE', 'DODGE', 'PASS', 'HOLD', 'SPECIAL']

// outcome[playerMove][oppMove] = { text, playerWins }
const OUTCOMES: Record<Choice, Record<Choice, { text: string; playerWins: boolean; draw: boolean }>> = {
  CHALLENGE: {
    CHALLENGE: { text: 'CLASH!',        playerWins: false, draw: true },
    DODGE:     { text: 'MISS!',         playerWins: false, draw: false },
    PASS:      { text: 'BLOCKED!',      playerWins: false, draw: false },
    HOLD:      { text: 'PUSH THROUGH!', playerWins: true,  draw: false },
    SPECIAL:   { text: 'DEFLECTED!',    playerWins: false, draw: false },
  },
  DODGE: {
    CHALLENGE: { text: 'EVADED!',       playerWins: true,  draw: false },
    DODGE:     { text: 'BOTH SLIP',     playerWins: false, draw: true },
    PASS:      { text: 'FOUND SPACE!',  playerWins: true,  draw: false },
    HOLD:      { text: 'SLIPPED PAST!', playerWins: true,  draw: false },
    SPECIAL:   { text: 'DODGED IT!',    playerWins: true,  draw: false },
  },
  PASS: {
    CHALLENGE: { text: 'INTERCEPT!',   playerWins: false, draw: false },
    DODGE:     { text: 'OPEN LANE!',   playerWins: true,  draw: false },
    PASS:      { text: 'DEFLECT!',     playerWins: false, draw: true },
    HOLD:      { text: 'THROUGH BALL!',playerWins: true,  draw: false },
    SPECIAL:   { text: 'BLOCKED PASS!',playerWins: false, draw: false },
  },
  HOLD: {
    CHALLENGE: { text: 'SHOVED!',      playerWins: false, draw: false },
    DODGE:     { text: 'TRACKED!',     playerWins: false, draw: false },
    PASS:      { text: 'SHIELD!',      playerWins: true,  draw: false },
    HOLD:      { text: 'STALEMATE',    playerWins: false, draw: true },
    SPECIAL:   { text: 'FORCED BACK!', playerWins: false, draw: false },
  },
  SPECIAL: {
    CHALLENGE: { text: 'DRIVE SHOT!',  playerWins: true,  draw: false },
    DODGE:     { text: 'SCORED!',      playerWins: true,  draw: false },
    PASS:      { text: 'GOAL!',        playerWins: true,  draw: false },
    HOLD:      { text: 'GOAL!',        playerWins: true,  draw: false },
    SPECIAL:   { text: 'BOTH HIT!',    playerWins: false, draw: true },
  },
}

// What each tell LOOKS like when drawn — distinct readable stances
const TELL_LABELS: Record<Choice, string> = {
  CHALLENGE: 'LEANS FORWARD',
  DODGE:     'SHIFTS WEIGHT BACK',
  PASS:      'LOOKS SIDEWAYS',
  HOLD:      'PLANTS WIDE',
  SPECIAL:   'CHARGES UP',
}

interface Opponent {
  name: string
  title: string
  color: number
  accent: number
  tendencies: Record<Choice, number>  // must sum to 1
  tellAccuracy: number
  lines: Record<string, string>       // flavor text for outcomes
}

const OPP: Opponent = {
  name: 'ALDERMAN TANE',
  title: 'COUNCIL REP',
  color: EGA.BLUE,
  accent: EGA.LIGHT_BLUE,
  tendencies: {
    CHALLENGE: 0.14,
    DODGE:     0.10,
    PASS:      0.30,
    HOLD:      0.41,
    SPECIAL:   0.05,
  },
  tellAccuracy: 0.68,
  lines: {
    win:  '"IS THAT ALL?"',
    lose: '"...WELL PLAYED."',
    draw: '"NEITHER OF US BLINKED."',
  },
}

type Phase = 'intro' | 'tell' | 'choose' | 'revealGap' | 'outcome' | 'roundEnd' | 'end'

export class P07_Confrontation extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics
  private phase: Phase = 'intro'
  private elapsed = 0
  private sel = 0

  private playerGuts = 100
  private oppGuts = 80
  private playerScore = 0
  private oppScore = 0
  private round = 1

  private oppActualMove: Choice = 'HOLD'
  private oppTellMove: Choice = 'HOLD'   // what the tell shows (may be fake)
  private playerMove: Choice | null = null
  private outcomeText = ''
  private playerWon = false
  private isDraw = false
  private gutsOut: 'player' | 'opp' | null = null

  private up!: Phaser.Input.Keyboard.Key
  private dn!: Phaser.Input.Keyboard.Key
  private ok!: Phaser.Input.Keyboard.Key

  constructor() { super({ key: 'P07' }) }

  create() {
    this.g = this.add.graphics()
    this.reset()
    const kb = this.input.keyboard!
    this.up = kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
    this.dn = kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN)
    this.ok = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => this.scene.start('PhaseSelector'))
  }

  private reset() {
    this.phase = 'intro'; this.elapsed = 0; this.sel = 0
    this.playerGuts = 100; this.oppGuts = 80
    this.playerScore = 0; this.oppScore = 0; this.round = 1
    this.playerMove = null; this.gutsOut = null
  }

  update(_t: number, delta: number) {
    const g = this.g
    g.clear()
    this.elapsed += delta
    this.handleInput()
    this.drawBackground(g)
    this.drawHeader(g)
    this.drawFighters(g)
    this.drawGutsMeters(g)
    this.drawPhase(g)
    if (this.phase !== 'end') {
      g.fillStyle(EGA.DARK_GRAY); print(g, '[ESC] BACK', 6, 192, 1)
    }
  }

  // ── State machine ────────────────────────────────────────────────────────

  private handleInput() {
    if (this.phase === 'intro' && Phaser.Input.Keyboard.JustDown(this.ok)) {
      this.startTell()
    }
    if (this.phase === 'choose') {
      const canSpecial = this.playerGuts >= SPECIAL_COST
      if (Phaser.Input.Keyboard.JustDown(this.up)) {
        this.sel--; if (this.sel < 0) this.sel = CHOICES.length - 1
        if (this.sel === 4 && !canSpecial) this.sel = 3
      }
      if (Phaser.Input.Keyboard.JustDown(this.dn)) {
        this.sel++; if (this.sel >= CHOICES.length) this.sel = 0
        if (this.sel === 4 && !canSpecial) this.sel = 0
      }
      if (Phaser.Input.Keyboard.JustDown(this.ok)) {
        if (this.sel === 4 && !canSpecial) return
        this.commitChoice()
      }
    }
    if (this.phase === 'end' && Phaser.Input.Keyboard.JustDown(this.ok)) {
      this.reset(); // replay
    }
  }

  private startTell() {
    this.oppActualMove = this.pickMove()
    this.oppTellMove = this.generateTell()
    this.phase = 'tell'; this.elapsed = 0
    this.time.delayedCall(TELL_MS, () => { this.phase = 'choose'; this.elapsed = 0 })
  }

  private commitChoice() {
    this.playerMove = CHOICES[this.sel]
    if (this.playerMove === 'SPECIAL') this.playerGuts -= SPECIAL_COST
    this.phase = 'revealGap'; this.elapsed = 0
    this.time.delayedCall(REVEAL_GAP, () => { this.resolveOutcome() })
  }

  private resolveOutcome() {
    if (!this.playerMove) return
    const o = OUTCOMES[this.playerMove][this.oppActualMove]
    this.outcomeText = o.text
    this.playerWon = o.playerWins
    this.isDraw = o.draw

    if (o.playerWins) {
      this.oppGuts = Math.max(0, this.oppGuts - 22)
      this.playerScore++
      this.cameras.main.flash(300, 55, 255, 55)
    } else if (!o.draw) {
      this.playerGuts = Math.max(0, this.playerGuts - 18)
      this.oppScore++
      this.cameras.main.shake(200, 0.007)
      this.cameras.main.flash(300, 200, 30, 30)
    } else {
      this.cameras.main.flash(200, 80, 80, 80)
    }

    this.phase = 'outcome'; this.elapsed = 0
    this.time.delayedCall(OUTCOME_MS, () => { this.afterOutcome() })
  }

  private afterOutcome() {
    if (this.playerGuts <= 0) { this.gutsOut = 'player'; this.phase = 'end'; return }
    if (this.oppGuts <= 0)    { this.gutsOut = 'opp';    this.phase = 'end'; return }
    if (this.round >= ROUNDS) { this.phase = 'end'; return }
    this.round++
    this.playerMove = null
    this.sel = 0
    this.phase = 'roundEnd'; this.elapsed = 0
    this.time.delayedCall(600, () => { this.startTell() })
  }

  // ── Picking ──────────────────────────────────────────────────────────────

  private pickMove(): Choice {
    const t = OPP.tendencies
    const r = Math.random()
    let cum = 0
    for (const [move, w] of Object.entries(t)) {
      cum += w; if (r < cum) return move as Choice
    }
    return 'HOLD'
  }

  private generateTell(): Choice {
    if (Math.random() < OPP.tellAccuracy) return this.oppActualMove
    const others = CHOICES.filter(c => c !== this.oppActualMove)
    return others[Math.floor(Math.random() * others.length)]
  }

  // ── Drawing ──────────────────────────────────────────────────────────────

  private drawBackground(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(0x000033); g.fillRect(0, 0, W, H)
    // Stadium bleachers
    g.fillStyle(0x001155); g.fillRect(0, 0, W, 50)
    for (let i = 0; i < 8; i++) {
      g.fillStyle(i % 2 === 0 ? 0x002266 : 0x001144)
      g.fillRect(i * 40, 0, 40, 50)
    }
    // Crowd dots
    for (let i = 0; i < 24; i++) {
      const cx = (i * 53 + 11) % W, cy = 6 + (i % 4) * 10
      g.fillStyle([EGA.LIGHT_RED, EGA.YELLOW, EGA.LIGHT_BLUE, EGA.WHITE][i % 4])
      g.fillRect(cx, cy, 4, 4)
    }
    // Pitch
    g.fillStyle(0x005500); g.fillRect(0, 50, W, 100)
    g.lineStyle(1, 0x007700, 0.6); g.strokeRect(18, 54, W - 36, 90)
    g.lineBetween(W / 2, 54, W / 2, 144)
    g.strokeCircle(W / 2, 99, 25)
  }

  private drawHeader(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(EGA.BLACK); g.fillRect(0, 0, W, 12)
    g.fillStyle(EGA.YELLOW)
    print(g, `CONFRONTATION  RD ${this.round}/${ROUNDS}`, 6, 2)
    // Round win pips
    for (let r = 0; r < ROUNDS; r++) {
      const x = W - 6 - (ROUNDS - r) * 10
      if (r < this.playerScore) { g.fillStyle(EGA.LIGHT_BLUE); g.fillRect(x, 3, 7, 6) }
      else if (r < this.playerScore + this.oppScore) { g.fillStyle(EGA.LIGHT_RED); g.fillRect(x, 3, 7, 6) }
      else { g.lineStyle(1, EGA.DARK_GRAY); g.strokeRect(x, 3, 7, 6) }
    }
  }

  private drawFighters(g: Phaser.GameObjects.Graphics) {
    const t = this.elapsed
    const pb = Math.sin(t * 0.004) * 2

    // Player (REN) — left
    this.drawRen(g, 28, 56, pb)

    // Opponent — right, with tell pose during TELL phase
    const pose = this.phase === 'tell' ? this.oppTellMove
      : this.phase === 'choose' ? null
      : this.phase === 'revealGap' || this.phase === 'outcome' ? this.oppActualMove
      : null
    this.drawOpp(g, W - 68, 56, -pb, pose)
  }

  private drawRen(g: Phaser.GameObjects.Graphics, x: number, y: number, bob: number) {
    const chosen = this.phase === 'revealGap' || this.phase === 'outcome'
    const col = chosen ? EGA.YELLOW : EGA.LIGHT_BLUE
    g.fillStyle(col); g.fillRect(x, y + 20 + bob, 28, 42)
    g.fillStyle(EGA.CYAN); g.fillRect(x + 5, y + 8 + bob, 18, 16)
    g.fillStyle(EGA.BLACK); g.fillRect(x + 8, y + 12 + bob, 5, 5); g.fillRect(x + 15, y + 12 + bob, 5, 5)
    if (chosen && this.playerMove) {
      g.fillStyle(EGA.WHITE); print(g, this.playerMove.slice(0, 4), x - 2, y + 66 + bob, 1)
    }
    g.fillStyle(EGA.LIGHT_BLUE); print(g, 'REN', x + 4, y + 2 + bob, 1)
  }

  private drawOpp(g: Phaser.GameObjects.Graphics, x: number, y: number, bob: number, pose: Choice | null) {
    const col = OPP.color
    // Pose-specific body modifications
    let dx = 0, dy = 0, bw = 28, bh = 42
    if (pose === 'CHALLENGE') { dx = -5; bw = 30 }
    if (pose === 'DODGE')     { dx = +5; bw = 32; bh = 38 }
    if (pose === 'HOLD')      { bw = 36; dy = 4; bh = 38 }
    if (pose === 'PASS')      { dx = -3 }
    if (pose === 'SPECIAL')   {
      g.fillStyle(EGA.YELLOW, 0.3)
      g.fillRect(x - 4, y + 4 + bob, 40, 70)
    }
    g.fillStyle(col); g.fillRect(x + dx, y + 20 + dy + bob, bw, bh)
    g.fillStyle(OPP.accent); g.fillRect(x + 5 + dx, y + 8 + bob, 18, 16)
    g.fillStyle(EGA.BLACK); g.fillRect(x + 8 + dx, y + 12 + bob, 5, 5); g.fillRect(x + 15 + dx, y + 12 + bob, 5, 5)
    // Glower during SPECIAL tell
    if (pose === 'SPECIAL') { g.fillStyle(EGA.YELLOW); g.fillRect(x + 8, y + 14 + bob, 3, 3); g.fillRect(x + 17, y + 14 + bob, 3, 3) }
    g.fillStyle(OPP.color); print(g, OPP.name.slice(0, 10), x - 6, y + 2 + bob, 1)
    // Show actual move after reveal
    if ((this.phase === 'outcome') && this.oppActualMove) {
      g.fillStyle(EGA.LIGHT_GRAY); print(g, this.oppActualMove.slice(0, 4), x + 2, y + 66 + bob, 1)
    }
  }

  private drawGutsMeters(g: Phaser.GameObjects.Graphics) {
    const bw = 78, y = 152
    // Player guts
    g.fillStyle(EGA.WHITE); print(g, 'GUTS', 6, y - 10, 1)
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(6, y, bw, 7)
    const pgPct = this.playerGuts / 100
    g.fillStyle(pgPct > 0.4 ? EGA.LIGHT_GREEN : EGA.LIGHT_RED)
    g.fillRect(6, y, Math.floor(bw * pgPct), 7)
    g.fillStyle(EGA.LIGHT_GRAY); print(g, String(this.playerGuts), 88, y - 10, 1)

    // Opp guts
    g.fillStyle(EGA.WHITE); print(g, 'GUTS', W - 90, y - 10, 1)
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(W - 86, y, bw, 7)
    const ogPct = this.oppGuts / 100
    g.fillStyle(EGA.LIGHT_RED, ogPct < 0.3 ? 0.5 + Math.sin(this.elapsed * 0.01) * 0.5 : 1)
    g.fillRect(W - 86, y, Math.floor(bw * ogPct), 7)
    g.fillStyle(EGA.LIGHT_GRAY); print(g, String(this.oppGuts), W - 96, y - 10, 1)
  }

  private drawPhase(g: Phaser.GameObjects.Graphics) {
    switch (this.phase) {
      case 'intro':     this.drawIntro(g); break
      case 'tell':      this.drawTell(g); break
      case 'choose':    this.drawChoose(g); break
      case 'revealGap': this.drawRevealGap(g); break
      case 'outcome':   this.drawOutcome(g); break
      case 'roundEnd':  break
      case 'end':       this.drawEnd(g); break
    }
  }

  private drawIntro(g: Phaser.GameObjects.Graphics) {
    const alpha = Math.min(1, this.elapsed / 400)
    g.fillStyle(EGA.BLACK, 0.7 * alpha); g.fillRect(40, 58, W - 80, 52)
    g.lineStyle(1, EGA.YELLOW); g.strokeRect(40, 58, W - 80, 52)
    g.fillStyle(EGA.YELLOW, alpha); print(g, 'WHAT WILL YOU DO?', 58, 68)
    g.fillStyle(EGA.DARK_GRAY, alpha); print(g, `VS ${OPP.title}`, 76, 86, 1)
    g.fillStyle(EGA.LIGHT_GRAY, alpha); print(g, '[SPACE] BEGIN', 90, 98, 1)
  }

  private drawTell(g: Phaser.GameObjects.Graphics) {
    // Spotlight effect on opponent
    g.fillStyle(EGA.YELLOW, 0.06)
    g.fillTriangle(W / 2, 0, W - 20, 110, W - 68, 110)
    // Tell label
    const pct = Math.min(1, this.elapsed / 300)
    g.fillStyle(EGA.BLACK, 0.8); g.fillRect(0, 144, W, 22)
    g.lineStyle(1, OPP.color); g.lineBetween(0, 144, W, 144)
    g.fillStyle(OPP.color, pct); print(g, OPP.name + ' —', 8, 148, 1)
    g.fillStyle(EGA.WHITE, pct)
    print(g, TELL_LABELS[this.oppTellMove], 8 + (OPP.name.length + 3) * 6, 148, 1)
    // Pulsing border on opponent side
    const pulse = Math.abs(Math.sin(this.elapsed * 0.006))
    g.lineStyle(1, OPP.color, pulse); g.strokeRect(W - 80, 50, 72, 98)
    // Timer bar
    const timeLeft = 1 - (this.elapsed / TELL_MS)
    g.fillStyle(EGA.DARK_GRAY); g.fillRect(0, H - 4, W, 4)
    g.fillStyle(EGA.YELLOW); g.fillRect(0, H - 4, Math.floor(W * timeLeft), 4)
    g.fillStyle(EGA.DARK_GRAY); print(g, 'READ THE TELL — CHOOSE IN...', 8, 170, 1)
  }

  private drawChoose(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(EGA.BLACK); g.fillRect(0, 162, W, 38)
    g.lineStyle(1, EGA.CYAN); g.lineBetween(0, 162, W, 162)
    const canSpecial = this.playerGuts >= SPECIAL_COST
    const cols = CHOICES.length
    CHOICES.forEach((c, i) => {
      const sel = i === this.sel
      const disabled = i === 4 && !canSpecial
      const x = 4 + i * (W / cols - 2)
      const cw = W / cols - 6
      if (sel && !disabled) {
        g.fillStyle(EGA.CYAN); g.fillRect(x - 1, 165, cw + 2, 28)
      }
      g.fillStyle(disabled ? EGA.DARK_GRAY : sel ? EGA.BLACK : EGA.LIGHT_GRAY)
      const label = i === 4 ? `SPL-${SPECIAL_COST}` : c.slice(0, 5)
      print(g, label, x + 1, 167, 1)
      if (sel && !disabled) {
        g.fillStyle(EGA.BLACK)
        print(g, i === 4 ? 'COSTS ' + SPECIAL_COST + ' GUTS' : this.getBeatsTip(c), x + 1, 179, 1)
      }
    })
    g.fillStyle(EGA.DARK_GRAY); print(g, '[^/v] SELECT  [SPACE] COMMIT', 8, 192, 1)
  }

  private drawRevealGap(g: Phaser.GameObjects.Graphics) {
    // Both chose — show what was picked but not the outcome yet
    g.fillStyle(EGA.BLACK, 0.85); g.fillRect(30, 58, W - 60, 72)
    g.lineStyle(2, EGA.YELLOW); g.strokeRect(30, 58, W - 60, 72)
    g.fillStyle(EGA.CYAN); print(g, 'REN:', 40, 64)
    g.fillStyle(EGA.WHITE); print(g, this.playerMove ?? '', 40, 80)
    g.fillStyle(EGA.DARK_GRAY); print(g, 'VS', W / 2 - 8, 90, 1)
    g.fillStyle(OPP.color); print(g, OPP.name + ':', 40, 100, 1)
    g.fillStyle(EGA.DARK_GRAY)
    const dots = '...'.slice(0, 1 + Math.floor(this.elapsed / 200) % 3)
    print(g, dots, 40, 112)
  }

  private drawOutcome(g: Phaser.GameObjects.Graphics) {
    if (!this.playerMove) return
    const outcomeAlpha = Math.min(1, (this.elapsed - 100) / 200)
    const border = this.playerWon ? EGA.LIGHT_GREEN : this.isDraw ? EGA.YELLOW : EGA.LIGHT_RED
    g.fillStyle(EGA.BLACK, 0.88); g.fillRect(24, 52, W - 48, 90)
    g.lineStyle(2, border); g.strokeRect(24, 52, W - 48, 90)

    g.fillStyle(EGA.CYAN, outcomeAlpha); print(g, `REN: ${this.playerMove}`, 34, 58)
    g.fillStyle(OPP.color, outcomeAlpha); print(g, `${OPP.name.split(' ')[1]}: ${this.oppActualMove}`, 34, 74, 1)

    if (outcomeAlpha > 0.3) {
      // Big outcome text
      const scale = Math.min(3, 1 + (this.elapsed - 300) / 150)
      const px = Math.floor(scale)
      g.fillStyle(border, outcomeAlpha)
      print(g, this.outcomeText, W / 2 - this.outcomeText.length * px * 3, 92, Math.min(3, px))

      if (this.elapsed > 800) {
        const quip = this.playerWon ? OPP.lines.lose : this.isDraw ? OPP.lines.draw : OPP.lines.win
        g.fillStyle(OPP.color); print(g, quip, 34, 120, 1)
      }
    }

    // Was the tell right?
    if (this.elapsed > 1200) {
      const tellWasRight = this.oppTellMove === this.oppActualMove
      g.fillStyle(tellWasRight ? EGA.LIGHT_GREEN : EGA.LIGHT_RED)
      print(g, tellWasRight ? 'TELL WAS TRUE' : 'TELL WAS FAKE', 34, 134, 1)
    }
  }

  private drawEnd(g: Phaser.GameObjects.Graphics) {
    const playerTotal = this.playerScore
    const oppTotal = this.oppScore
    const gutWin = this.gutsOut === 'opp'
    const gutLoss = this.gutsOut === 'player'
    const won = gutWin || (playerTotal > oppTotal && !gutLoss)
    const color = won ? EGA.LIGHT_GREEN : EGA.LIGHT_RED

    g.fillStyle(EGA.BLACK, 0.9); g.fillRect(24, 24, W - 48, 152)
    g.lineStyle(2, color); g.strokeRect(24, 24, W - 48, 152)

    g.fillStyle(color); print(g, won ? 'YOU WIN.' : 'YOU LOSE.', 60, 36)
    if (gutWin)  { g.fillStyle(EGA.YELLOW); print(g, 'OPPONENT RAN OUT OF GUTS.', 34, 54, 1) }
    if (gutLoss) { g.fillStyle(EGA.LIGHT_RED); print(g, 'YOU RAN OUT OF GUTS.', 34, 54, 1) }

    g.fillStyle(EGA.WHITE)
    print(g, `ROUNDS WON: REN ${playerTotal}  /  OPP ${oppTotal}`, 34, 70, 1)
    g.fillStyle(EGA.LIGHT_GRAY)
    print(g, `FINAL GUTS: REN ${this.playerGuts}  OPP ${this.oppGuts}`, 34, 82, 1)

    g.lineStyle(1, EGA.DARK_GRAY); g.lineBetween(34, 100, W - 34, 100)
    g.fillStyle(EGA.DARK_GRAY); print(g, 'THE TELL WAS ' + Math.round(OPP.tellAccuracy * 100) + '% ACCURATE.', 34, 106, 1)
    g.fillStyle(EGA.DARK_GRAY); print(g, 'LEARN THE PATTERNS. PLAY AGAIN.', 34, 116, 1)

    g.fillStyle(EGA.YELLOW); print(g, '[SPACE] REPLAY', 80, 138)
    g.fillStyle(EGA.DARK_GRAY); print(g, '[ESC] BACK TO SELECTOR', 64, 154)
  }

  private getBeatsTip(c: Choice): string {
    const tips: Record<Choice, string> = {
      CHALLENGE: 'BEATS HOLD',
      DODGE:     'BEATS CHALLENGE',
      PASS:      'BEATS HOLD+DODGE',
      HOLD:      'BEATS PASS',
      SPECIAL:   'BEATS MOST — COSTS GUTS',
    }
    return tips[c]
  }
}
