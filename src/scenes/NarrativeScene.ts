import Phaser from 'phaser'
import { EGA } from '../palette'

const W = 320
const H = 200

interface Beat {
  draw: (g: Phaser.GameObjects.Graphics, t: number) => void
  lines: string[]
}

export class NarrativeScene extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics
  private beatIndex = 0
  private lineIndex = 0
  private charIndex = 0
  private elapsed = 0
  private textComplete = false
  private canAdvance = false
  private spaceKey!: Phaser.Input.Keyboard.Key
  private enterKey!: Phaser.Input.Keyboard.Key
  private beats!: Beat[]
  private fadeAlpha = 1
  private fadingIn = true

  constructor() { super({ key: 'NarrativeScene' }) }

  create() {
    this.g = this.add.graphics()
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
    this.beats = this.buildBeats()
    this.fadeAlpha = 1
    this.fadingIn = true
  }

  update(time: number, delta: number) {
    this.g.clear()

    const beat = this.beats[this.beatIndex]
    beat.draw(this.g, time)
    this.drawTextBox(beat)
    this.tickText(delta)
    this.drawFade()
    this.handleInput()
  }

  private tickText(delta: number) {
    if (this.textComplete) {
      this.canAdvance = true
      return
    }
    this.elapsed += delta
    if (this.elapsed > 28) {
      this.elapsed = 0
      const beat = this.beats[this.beatIndex]
      const line = beat.lines[this.lineIndex]
      if (this.charIndex < line.length) {
        this.charIndex++
      } else {
        if (this.lineIndex < beat.lines.length - 1) {
          this.lineIndex++
          this.charIndex = 0
        } else {
          this.textComplete = true
          this.canAdvance = true
        }
      }
    }
  }

  private handleInput() {
    if (!this.canAdvance) return
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      if (!this.textComplete) {
        // skip typewriter
        this.charIndex = this.beats[this.beatIndex].lines[this.lineIndex].length
        this.lineIndex = this.beats[this.beatIndex].lines.length - 1
        this.textComplete = true
        return
      }
      this.advance()
    }
  }

  private advance() {
    if (this.beatIndex >= this.beats.length - 1) return
    this.fadingIn = false
    this.fadeAlpha = 0
    this.time.delayedCall(300, () => {
      this.beatIndex++
      this.lineIndex = 0
      this.charIndex = 0
      this.textComplete = false
      this.canAdvance = false
      this.fadingIn = true
      this.fadeAlpha = 1
    })
  }

  private drawFade() {
    if (this.fadingIn) {
      this.fadeAlpha = Math.max(0, this.fadeAlpha - 0.08)
    } else {
      this.fadeAlpha = Math.min(1, this.fadeAlpha + 0.08)
    }
    if (this.fadeAlpha > 0) {
      this.g.fillStyle(EGA.BLACK, this.fadeAlpha)
      this.g.fillRect(0, 0, W, H)
    }
  }

  private drawTextBox(beat: Beat) {
    // Box background
    this.g.fillStyle(EGA.BLACK)
    this.g.fillRect(0, 148, W, 52)
    this.g.lineStyle(1, EGA.CYAN)
    this.g.lineBetween(0, 148, W, 148)

    // Draw completed lines + current line up to charIndex
    const visibleLines = beat.lines.slice(0, this.lineIndex + 1)
    visibleLines.forEach((line, i) => {
      const text = i < this.lineIndex ? line : line.slice(0, this.charIndex)
      const color = line.startsWith('—') ? EGA.YELLOW : EGA.WHITE
      this.g.fillStyle(color)
      this.printText(text, 8, 155 + i * 14)
    })

    // Blinking advance arrow
    if (this.textComplete && Math.floor(Date.now() / 400) % 2 === 0) {
      this.g.fillStyle(EGA.LIGHT_CYAN)
      this.printText('>', W - 14, 188)
    }

    // Progress dots
    this.beats.forEach((_, i) => {
      const x = W / 2 - (this.beats.length * 6) / 2 + i * 6
      this.g.fillStyle(i === this.beatIndex ? EGA.YELLOW : EGA.DARK_GRAY)
      this.g.fillRect(x, 145, 4, 2)
    })
  }

  // ─── Scene Backgrounds ───────────────────────────────────────────────────

  private buildBeats(): Beat[] {
    return [

      // 0: TITLE
      {
        lines: ['A RIDICULOUS GAME', '— an explorable pitch'],
        draw: (g, t) => {
          g.fillStyle(EGA.BLACK); g.fillRect(0, 0, W, H)
          // Stars
          for (let i = 0; i < 40; i++) {
            const sx = (i * 73 + 11) % W
            const sy = (i * 47 + 7) % 130
            const bright = Math.sin(t * 0.002 + i) > 0
            g.fillStyle(bright ? EGA.WHITE : EGA.DARK_GRAY)
            g.fillRect(sx, sy, 2, 2)
          }
          // Title text large
          g.fillStyle(EGA.YELLOW)
          this.printLarge('A RIDICULOUS', 20, 40)
          this.printLarge('GAME', 80, 60)
          g.fillStyle(EGA.CYAN)
          this.printText('PRESS SPACE TO BEGIN', 60, 120)
        }
      },

      // 1: THE VAN
      {
        lines: ['Somewhere in New Zealand.', 'A van pulls up to a town square.'],
        draw: (g) => {
          // Sky
          g.fillStyle(EGA.BLUE); g.fillRect(0, 0, W, 90)
          // Hills
          g.fillStyle(EGA.GREEN); g.fillRect(0, 70, W, 80)
          g.fillStyle(0x007700); g.fillRect(0, 80, W, 70)
          // Road
          g.fillStyle(EGA.DARK_GRAY); g.fillRect(0, 110, W, 30)
          g.fillStyle(EGA.YELLOW)
          for (let x = 0; x < W; x += 30) g.fillRect(x, 124, 16, 3)
          // Van (chunky pixel)
          g.fillStyle(EGA.LIGHT_BLUE); g.fillRect(80, 95, 60, 28)
          g.fillStyle(EGA.CYAN);       g.fillRect(118, 98, 20, 16) // windshield area
          g.fillStyle(EGA.DARK_GRAY);  g.fillRect(84, 119, 12, 8)  // wheel L
          g.fillStyle(EGA.DARK_GRAY);  g.fillRect(122, 119, 12, 8) // wheel R
          g.fillStyle(EGA.BLACK);      g.fillRect(86, 121, 8, 5)
          g.fillStyle(EGA.BLACK);      g.fillRect(124, 121, 8, 5)
          g.fillStyle(EGA.YELLOW)
          this.printText('THE CIRCUIT', 83, 102)
          // Mountains bg
          g.fillStyle(0x004488)
          g.fillTriangle(0, 70, 60, 20, 120, 70)
          g.fillTriangle(100, 70, 180, 10, 260, 70)
          g.fillTriangle(200, 70, 290, 30, W, 70)
        }
      },

      // 2: THE CREW
      {
        lines: ["You're The Circuit.", 'You travel town to town.', 'You build things that connect people.'],
        draw: (g) => {
          // Interior of van — side view
          g.fillStyle(EGA.DARK_GRAY); g.fillRect(0, 0, W, H)
          g.fillStyle(EGA.BLACK); g.fillRect(8, 8, W - 16, 130)
          // Window
          g.fillStyle(EGA.BLUE); g.fillRect(20, 20, 80, 50)
          g.fillStyle(EGA.CYAN); g.fillRect(22, 22, 76, 46)
          g.fillStyle(EGA.LIGHT_BLUE)
          for (let i = 0; i < 5; i++) g.fillRect(22, 22 + i * 10, 76, 2)
          // 5 silhouettes in van
          const crew = [
            { x: 110, color: EGA.LIGHT_BLUE,    label: 'REN' },
            { x: 145, color: EGA.LIGHT_GREEN,   label: 'HANA' },
            { x: 180, color: EGA.BROWN,         label: 'GOROU' },
            { x: 215, color: EGA.LIGHT_MAGENTA, label: 'MIKO' },
            { x: 250, color: EGA.LIGHT_RED,     label: 'DAICHI' },
          ]
          crew.forEach(c => {
            g.fillStyle(c.color)
            g.fillRect(c.x, 55, 18, 28) // body
            g.fillRect(c.x + 3, 44, 12, 13) // head
            g.fillStyle(EGA.WHITE)
            this.printText(c.label, c.x - 2, 86)
          })
        }
      },

      // 3: THE TOWN MAP
      {
        lines: ['Every town has three forces.', 'The Council. The Collective. The Elders.', 'None of them fully trust each other.'],
        draw: (g, t) => {
          g.fillStyle(EGA.BLACK); g.fillRect(0, 0, W, H)
          // Simple hex-ish town map
          g.fillStyle(0x001133); g.fillRect(0, 0, W, 144)
          // Three zones
          const zones = [
            { x: 40,  y: 50,  w: 70, h: 55, color: EGA.BLUE,    label: 'THE COUNCIL',     sub: 'money & permits' },
            { x: 125, y: 30,  w: 70, h: 55, color: EGA.GREEN,   label: 'THE COLLECTIVE',  sub: 'space & people' },
            { x: 210, y: 50,  w: 70, h: 55, color: EGA.BROWN,   label: 'THE ELDERS',      sub: 'meaning & memory' },
          ]
          zones.forEach(z => {
            g.fillStyle(z.color, 0.3); g.fillRect(z.x, z.y, z.w, z.h)
            g.lineStyle(1, z.color);   g.strokeRect(z.x, z.y, z.w, z.h)
            g.fillStyle(z.color)
            this.printText(z.label, z.x + 4, z.y + 8)
            g.fillStyle(EGA.DARK_GRAY)
            this.printText(z.sub, z.x + 4, z.y + 20)
          })
          // Tension lines between zones
          const pulse = Math.sin(t * 0.003) > 0 ? EGA.YELLOW : EGA.RED
          g.lineStyle(1, pulse, 0.5)
          g.lineBetween(110, 77, 125, 57)
          g.lineBetween(195, 57, 210, 77)
          g.lineBetween(110, 90, 210, 90)
          // You are here
          g.fillStyle(EGA.YELLOW)
          g.fillRect(158, 105, 6, 6)
          this.printText('YOU', 152, 114)
        }
      },

      // 4: THE CALENDAR
      {
        lines: ['You have 30 days.', 'After that, you leave.', 'What you built stays. What you broke stays.'],
        draw: (g) => {
          g.fillStyle(EGA.BLACK); g.fillRect(0, 0, W, H)
          // Calendar grid
          const startX = 30, startY = 20, cw = 16, ch = 14
          g.fillStyle(EGA.DARK_GRAY); g.fillRect(startX - 4, startY - 4, 7 * cw + 12, 5 * ch + 14)
          g.fillStyle(EGA.RED)
          this.printText('DAYS UNTIL YOU LEAVE', startX, startY - 14)
          for (let d = 0; d < 30; d++) {
            const col = d % 7, row = Math.floor(d / 7)
            const x = startX + col * cw, y = startY + row * ch
            const shade = d < 8 ? EGA.DARK_GRAY : d < 20 ? EGA.BLUE : d < 28 ? EGA.RED : EGA.LIGHT_RED
            g.fillStyle(shade); g.fillRect(x, y, cw - 2, ch - 2)
            if (d === 0) {
              g.fillStyle(EGA.YELLOW)
              this.printText('1', x + 4, y + 3)
            }
          }
          // Legend
          g.fillStyle(EGA.DARK_GRAY); g.fillRect(210, 20, 10, 8)
          g.fillStyle(EGA.WHITE); this.printText('early days', 224, 21)
          g.fillStyle(EGA.BLUE); g.fillRect(210, 34, 10, 8)
          g.fillStyle(EGA.WHITE); this.printText('mid game', 224, 35)
          g.fillStyle(EGA.LIGHT_RED); g.fillRect(210, 48, 10, 8)
          g.fillStyle(EGA.WHITE); this.printText('final push', 224, 49)
        }
      },

      // 5: REN
      {
        lines: ["— REN. That's you.", "Not the best at anything.", 'But you listen. That matters.'],
        draw: (g, t) => {
          g.fillStyle(EGA.BLACK); g.fillRect(0, 0, W, H)
          this.drawCharacterPortrait(g, 10, 10, EGA.LIGHT_BLUE, EGA.CYAN, t)
          g.fillStyle(EGA.CYAN)
          this.printLarge('REN', 105, 12)
          g.fillStyle(EGA.LIGHT_GRAY)
          this.printText('ROLE: PROTAGONIST', 105, 38)
          this.printText('BEST:  ADAPTABLE', 105, 52)
          this.printText('WORST: CONFIDENCE', 105, 66)
          this.printText('SECRET:', 105, 82)
          g.fillStyle(EGA.DARK_GRAY)
          this.printText('already known', 105, 94)
        }
      },

      // 6: HANA
      {
        lines: ['— HANA. The strategist.', 'She mapped every power in town', 'before you left the van.'],
        draw: (g, t) => {
          g.fillStyle(EGA.BLACK); g.fillRect(0, 0, W, H)
          this.drawCharacterPortrait(g, 10, 10, EGA.LIGHT_GREEN, EGA.GREEN, t)
          g.fillStyle(EGA.LIGHT_GREEN)
          this.printLarge('HANA', 105, 12)
          g.fillStyle(EGA.LIGHT_GRAY)
          this.printText('ROLE: STRATEGIST', 105, 38)
          this.printText('BEST:  INTELLIGENCE', 105, 52)
          this.printText('WORST: PATIENCE', 105, 66)
          this.printText('SECRET:', 105, 82)
          g.fillStyle(EGA.DARK_GRAY)
          this.printText("has a plan she", 105, 94)
          this.printText("hasn't told you", 105, 106)
        }
      },

      // 7: GOROU
      {
        lines: ['— GOROU. The veteran.', 'Best in the field. Getting old.', 'This may be his last job.'],
        draw: (g, t) => {
          g.fillStyle(EGA.BLACK); g.fillRect(0, 0, W, H)
          this.drawCharacterPortrait(g, 10, 10, EGA.BROWN, EGA.LIGHT_GRAY, t)
          g.fillStyle(EGA.BROWN)
          this.printLarge('GOROU', 105, 12)
          g.fillStyle(EGA.LIGHT_GRAY)
          this.printText('ROLE: VETERAN', 105, 38)
          this.printText('BEST:  FIELD ABILITY', 105, 52)
          this.printText('WORST: DECLINING', 105, 66)
          this.printText('SECRET:', 105, 82)
          g.fillStyle(EGA.DARK_GRAY)
          this.printText('knows the clock', 105, 94)
          this.printText('is ticking on him', 105, 106)
          g.fillStyle(EGA.DARK_GRAY); g.fillRect(105, 118, 60, 5)
          g.fillStyle(EGA.BROWN);     g.fillRect(105, 118, 35, 5)
          g.fillStyle(EGA.WHITE);     this.printText('TIME', 170, 116)
        }
      },

      // 8: MIKO
      {
        lines: ['— MIKO. The reader.', 'She can read anyone in the room.', 'Anyone except herself.'],
        draw: (g, t) => {
          g.fillStyle(EGA.BLACK); g.fillRect(0, 0, W, H)
          this.drawCharacterPortrait(g, 10, 10, EGA.LIGHT_MAGENTA, EGA.MAGENTA, t)
          g.fillStyle(EGA.LIGHT_MAGENTA)
          this.printLarge('MIKO', 105, 12)
          g.fillStyle(EGA.LIGHT_GRAY)
          this.printText('ROLE: NEGOTIATOR', 105, 38)
          this.printText('BEST:  EMPATHY', 105, 52)
          this.printText('WORST: SELF-KNOWLEDGE', 105, 66)
          this.printText('SECRET:', 105, 82)
          g.fillStyle(EGA.DARK_GRAY)
          this.printText('leaves if her', 105, 94)
          this.printText('values are broken', 105, 106)
        }
      },

      // 9: DAICHI
      {
        lines: ['— DAICHI. The wild card.', 'Low loyalty. High potential.', '30 days decides which.'],
        draw: (g, t) => {
          g.fillStyle(EGA.BLACK); g.fillRect(0, 0, W, H)
          this.drawCharacterPortrait(g, 10, 10, EGA.LIGHT_RED, EGA.RED, t)
          g.fillStyle(EGA.LIGHT_RED)
          this.printLarge('DAICHI', 105, 12)
          g.fillStyle(EGA.LIGHT_GRAY)
          this.printText('ROLE: WILD CARD', 105, 38)
          this.printText('BEST:  RAW ABILITY', 105, 52)
          this.printText('WORST: LOYALTY', 105, 66)
          this.printText('WARNING:', 105, 82)
          g.fillStyle(EGA.RED)
          this.printText('ignore him and', 105, 94)
          this.printText('he defects', 105, 106)
        }
      },

      // 10: THE CONFRONTATION EXPLAINED AS STORY
      {
        lines: ['Sometimes words run out.', 'Two people. Something has to happen.', 'You read them. They read you.'],
        draw: (g, t) => {
          // Two characters facing off
          g.fillStyle(EGA.BLACK); g.fillRect(0, 0, W, H)
          const pulse = Math.sin(t * 0.004) * 10
          // Left — Ren
          g.fillStyle(EGA.LIGHT_BLUE)
          g.fillRect(40, 50 + pulse * 0.2, 32, 48)
          g.fillRect(46, 38 + pulse * 0.2, 20, 18)
          // Right — Council rep (antagonist)
          g.fillStyle(EGA.RED)
          g.fillRect(W - 72, 50 - pulse * 0.2, 32, 48)
          g.fillRect(W - 66, 38 - pulse * 0.2, 20, 18)
          // Tension line
          g.lineStyle(1, EGA.YELLOW, Math.abs(Math.sin(t * 0.006)))
          g.lineBetween(73, 74, W - 73, 74)
          // Speech bubbles hinting at choices
          const choices = ['CHALLENGE', 'DODGE', 'PASS', 'HOLD']
          choices.forEach((c, i) => {
            const alpha = i === Math.floor(t * 0.002) % 4 ? 1 : 0.3
            g.fillStyle(EGA.CYAN, alpha)
            this.printText(c, 20 + i * 70, 115)
          })
          g.fillStyle(EGA.YELLOW)
          this.printText('WHAT WILL YOU DO?', 80, 128)
        }
      },

      // 11: THE INSTALLATION
      {
        lines: ['Day 30. The installation goes up.', 'Whether it means something here', 'depends on every choice you made.'],
        draw: (g, t) => {
          g.fillStyle(EGA.BLACK); g.fillRect(0, 0, W, H)
          // Building silhouette
          g.fillStyle(EGA.DARK_GRAY); g.fillRect(100, 30, 120, 110)
          g.fillStyle(EGA.BLACK);     g.fillRect(104, 34, 112, 102)
          // Glowing installation on the building face
          const glow = Math.abs(Math.sin(t * 0.002))
          for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 8; col++) {
              const on = (row + col + Math.floor(t * 0.003)) % 3 !== 0
              const c = on ? EGA.CYAN : EGA.BLUE
              g.fillStyle(c, on ? glow : 0.2)
              g.fillRect(108 + col * 13, 38 + row * 15, 10, 12)
            }
          }
          // People silhouettes watching
          const crowd = [30, 55, 68, 240, 258, 272, 285]
          crowd.forEach(cx => {
            g.fillStyle(EGA.DARK_GRAY)
            g.fillRect(cx, 115, 8, 20)
            g.fillRect(cx + 1, 108, 6, 9)
          })
          g.fillStyle(EGA.YELLOW)
          this.printText('THE INSTALLATION', 90, 20)
        }
      },

      // 12: THE QUESTION
      {
        lines: ['This is A Ridiculous Game.', 'A game about building things that matter', 'in places that remember.'],
        draw: (g, t) => {
          g.fillStyle(EGA.BLACK); g.fillRect(0, 0, W, H)
          // Pulsing circuit/connection lines
          const nodes = [
            [60, 40], [160, 25], [260, 45],
            [30, 80],  [120, 90], [200, 75], [280, 85],
            [70, 120], [170, 110], [250, 125],
          ]
          nodes.forEach(([nx, ny], i) => {
            const pulse = Math.sin(t * 0.002 + i) > 0
            g.fillStyle(pulse ? EGA.CYAN : EGA.BLUE)
            g.fillRect(nx - 3, ny - 3, 6, 6)
            if (i < nodes.length - 1) {
              const [nx2, ny2] = nodes[i + 1]
              g.lineStyle(1, pulse ? EGA.CYAN : EGA.DARK_GRAY, 0.6)
              g.lineBetween(nx, ny, nx2, ny2)
            }
          })
          g.fillStyle(EGA.YELLOW)
          this.printLarge('PLAY?', 115, 60)
          g.fillStyle(EGA.CYAN)
          this.printText('[SPACE] to start over', 80, 95)
          g.fillStyle(EGA.DARK_GRAY)
          this.printText('built with vibe coding, june 2026', 48, 108)
        }
      },
    ]
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private drawCharacterPortrait(g: Phaser.GameObjects.Graphics, x: number, y: number, bodyColor: number, headColor: number, t: number) {
    const bob = Math.sin(t * 0.003) * 2
    const bw = 40, bh = 58, hw = 26, hh = 22
    // Body
    g.fillStyle(bodyColor)
    g.fillRect(x, y + 26 + bob, bw, bh)
    // Head
    g.fillStyle(headColor)
    g.fillRect(x + 7, y + 6 + bob, hw, hh)
    // Eyes
    g.fillStyle(EGA.BLACK)
    g.fillRect(x + 12, y + 12 + bob, 5, 5)
    g.fillRect(x + 22, y + 12 + bob, 5, 5)
    // Scanlines
    for (let i = 0; i < 10; i++) {
      g.fillStyle(EGA.BLACK, 0.15)
      g.fillRect(x, y + 26 + i * 6 + bob, bw, 2)
    }
    // Shadow
    g.fillStyle(EGA.BLACK, 0.3)
    g.fillRect(x + 3, y + 86, bw, 5)
  }

  private printLarge(text: string, x: number, y: number) {
    const g = this.g
    let cx = x
    for (const ch of text.toUpperCase()) {
      const bitmap = FONT[ch] || FONT[' ']
      for (let row = 0; row < bitmap.length; row++) {
        for (let col = 0; col < bitmap[row].length; col++) {
          if (bitmap[row][col]) g.fillRect(cx + col * 3, y + row * 3, 3, 3)
        }
      }
      cx += (bitmap[0]?.length ?? 3) * 3 + 3
    }
  }

  private printText(text: string, x: number, y: number) {
    const g = this.g
    let cx = x
    for (const ch of text.toUpperCase()) {
      const bitmap = FONT[ch] || FONT[' ']
      for (let row = 0; row < bitmap.length; row++) {
        for (let col = 0; col < bitmap[row].length; col++) {
          if (bitmap[row][col]) g.fillRect(cx + col * 2, y + row * 2, 2, 2)
        }
      }
      cx += (bitmap[0]?.length ?? 3) * 2 + 2
    }
  }
}

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
  "'": [[1],[1],[0],[0],[0]],
  '.': [[0],[0],[0],[0],[1]],
  ',': [[0],[0],[0],[1],[1]],
  '-': [[0,0,0],[1,1,1],[0,0,0]],
  '/': [[0,0,1],[0,0,1],[0,1,0],[1,0,0],[1,0,0]],
  '[': [[1,1],[1,0],[1,0],[1,0],[1,1]],
  ']': [[1,1],[0,1],[0,1],[0,1],[1,1]],
  '—': [[0,0,0,0,0],[1,1,1,1,1],[0,0,0,0,0]],
  ' ': [[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]],
}
