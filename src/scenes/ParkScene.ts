import Phaser from 'phaser'
import { EGA } from '../palette'
import { print } from '../utils/font'
import { MALE_NAMES, FEMALE_NAMES } from '../data/names'

// ── Legacy sprite sheet (characters.png) ─────────────────────────────────────
// 512×640 — 40 modern civilians, 8 per row × 5 rows
// Each character block: 64×128 px  |  Each frame: 20×32 px
// Directions: 0=front  1=right-walk  2=left-walk  3=back
const BLOCK_W = 64, BLOCK_H = 128, FW = 20, FH = 32, CHARS_PER_ROW = 8, NUM_CHARS = 40

function fk(ci: number, row: number, f: number) { return `${ci}:${row}:${f}` }

// ── LPC layered sprite system ─────────────────────────────────────────────────
// 576×256 — 9 frames × 4 directions (64×64 each)
// Row 0=walk-down, Row 1=walk-left, Row 2=walk-right, Row 3=walk-up (back)
const LPC_FW = 64, LPC_FH = 64, LPC_ROWS = 4, LPC_FRAMES = 9
const LPC_SCALE = 0.45  // renders ~29×29 px, similar to legacy 20×32
const LPC_ROW_WALK = 2  // walk-right, flip for leftward movement
const LPC_ROW_BACK = 3  // back to viewer, used when at the wall

const LPC_LAYERS = ['lpc_body','lpc_hair','lpc_pants','lpc_shirt'] as const
type LPCLayer = typeof LPC_LAYERS[number]

// Tint multipliers applied per-layer to achieve variation
// Body: multiply against flesh-toned base for different skin tones
const LPC_SKIN_TONES  = [0xFFFFFF, 0xFFCC88, 0xEEAA66, 0xCC8844, 0xAA6633, 0x884422]
// Hair, pants, shirt: all gray-neutral base → tint cleanly to any color
const LPC_HAIR_COLORS = [0x111111, 0x3D2010, 0x8B5E3C, 0xD4A056, 0xFFD700, 0xFF7700, 0xCCCCCC]
const LPC_PANTS_COLORS = [0x1A2040, 0x3D2B10, 0x1A3A1A, 0x444444, 0xCC9933, 0x550011]
const LPC_SHIRT_COLORS = [0xFF5555, 0x5577FF, 0x44BB44, 0xFFAA22, 0xAA44BB, 0x33AACC, 0xEEEEEE, 0xCC2244]

// ── Constants ─────────────────────────────────────────────────────────────────
const WALL_H = 5, WALL_Y = 20, BASE_SPEED = 36, MAX_PEOPLE = 22
const P_STOP = 0.18, P_INTERACT = 0.55, P_PHONE = 0.28, P_RETURN = 0.22, P_CHAT = 0.20
const LANE_FRACS = [0.14,0.21,0.28,0.35,0.43,0.51,0.59,0.67,0.75,0.83,0.91]

type State = 'walking'|'slowing'|'viewing'|'phone'|'chatting'|'departing'|'gone'

interface Person {
  id:number; name:string; isFemale:boolean
  x:number; y:number; lane:number; dir:1|-1; speed:number
  state:State; stateTimer:number
  opinion:boolean; visitCount:number; isReturn:boolean
  charIdx:number; color:number; thought:string
  willStop:boolean; willInteract:boolean; willPhone:boolean; hasReacted:boolean
  viewX:number; bob:number
  chatPartner:number|null; chatLine:string
  noticeTimer:number; noticeGlyph:string
  // LPC fields
  useLPC:boolean; lpcSkin:number; lpcHair:number; lpcShirt:number; lpcPants:number
}

type ReturnData = Pick<Person,'name'|'isFemale'|'opinion'|'visitCount'|'charIdx'|'color'|'thought'|'useLPC'|'lpcSkin'|'lpcHair'|'lpcShirt'|'lpcPants'>

const CONVO_PAIRS: [string,string][] = [
  ['BEEN HERE BEFORE?','FIRST TIME!'],['AMAZING ISN\'T IT','YEAH WOW'],
  ['WHO MADE THIS?','NO IDEA'],['I LOVE IT','SAME!'],
  ['WHAT DO YOU THINK?','BEAUTIFUL'],['COME HERE OFTEN?','EVERY WEEKEND'],
  ['IT CHANGES YOU','I KNOW RIGHT'],['SHOULD WE STAY?','LET\'S STAY'],
  ['WILD ISN\'T IT','SO DIFFERENT'],['MY KIDS LOVE IT','MINE TOO!'],
  ['FEELS SPECIAL','SOMETHING ABOUT IT'],['YOU OKAY?','YEAH JUST THINKING'],
]
const THOUGHTS_POS = ['BEAUTIFUL!','LOVE THIS!','SO COOL!','AMAZING!','STUNNING!','WOW!!','MUST SHARE!','POWERFUL!']
const THOUGHTS_NEG = ['MEH...','CONFUSED?','NOT FOR ME','ODD...','WEIRD?','DON\'T GET IT','PRETENTIOUS?','EH.']
const PERSON_COLORS = [EGA.LIGHT_BLUE,EGA.LIGHT_GREEN,EGA.LIGHT_RED,EGA.YELLOW,EGA.LIGHT_MAGENTA,EGA.LIGHT_CYAN,EGA.WHITE,EGA.CYAN,EGA.BROWN,0xFF8C00,0x9B59B6,0x1ABC9C]
const STATE_LABELS: Record<State,string> = {
  walking:'PASSING BY',slowing:'NOTICED IT',viewing:'LOOKING AT IT',
  phone:'TAKING A PHOTO',chatting:'TALKING TO SOMEONE',departing:'WALKING AWAY',gone:'',
}

// ── Scene ─────────────────────────────────────────────────────────────────────
export class ParkScene extends Phaser.Scene {
  private bg!:  Phaser.GameObjects.Graphics
  private ui!:  Phaser.GameObjects.Graphics
  private sprites    = new Map<number, Phaser.GameObjects.Sprite>()
  private lpcSprites = new Map<number, Phaser.GameObjects.Sprite[]>()

  private people:      Person[] = []
  private nextId =     0
  private spawnTimer = 0
  private selected:    Person | null = null
  private returnQueue: { data: ReturnData; delay:number }[] = []
  private stats =      { total:0, stopped:0, phoned:0, returned:0 }
  private elapsed =    0

  constructor() { super({ key: 'ParkScene' }) }

  // ── Layout ───────────────────────────────────────────────────────────────────
  private get W()       { return 390 }
  private get H()       { return 700 }
  private get parkH()   { return 224 }
  private get panelY()  { return 224 }
  private get panelW()  { return 390 }
  private get wallW()   { return 195 }
  private get wallX()   { return 97 }
  private get viewY()   { return 55 }
  private get walkMax() { return 374 }
  private get lanes()   { return LANE_FRACS.map(f => Math.floor(224 * f)) }
  private get fs()      { return 2 }

  // ── Preload ──────────────────────────────────────────────────────────────────
  preload() {
    this.load.image('chars_raw', 'assets/characters.png')
    for (const layer of LPC_LAYERS) this.load.image(layer, `assets/${layer.replace('lpc_','lpc-')}.png`)
  }

  // ── Create ───────────────────────────────────────────────────────────────────
  create() {
    this.bg = this.add.graphics().setDepth(0)
    this.ui = this.add.graphics().setDepth(100)

    // Legacy character frames
    const tex = this.textures.get('chars_raw')
    for (let ci = 0; ci < NUM_CHARS; ci++) {
      const bx = (ci % CHARS_PER_ROW) * BLOCK_W
      const by = Math.floor(ci / CHARS_PER_ROW) * BLOCK_H
      for (let row = 0; row < 4; row++)
        for (let f = 0; f < 3; f++)
          tex.add(fk(ci, row, f), 0, bx + f * FW, by + row * FH, FW, FH)
    }
    for (let ci = 0; ci < NUM_CHARS; ci++) {
      this.anims.create({ key: `${ci}:walk`, frames: [0,1,2].map(f => ({ key: 'chars_raw', frame: fk(ci, 1, f) })), frameRate: 6, repeat: -1 })
      this.anims.create({ key: `${ci}:back`, frames: [0,1,2].map(f => ({ key: 'chars_raw', frame: fk(ci, 3, f) })), frameRate: 4, repeat: -1 })
    }

    // LPC frame registration — each layer shares the same grid layout
    for (const layer of LPC_LAYERS) {
      const t = this.textures.get(layer)
      for (let row = 0; row < LPC_ROWS; row++)
        for (let f = 0; f < LPC_FRAMES; f++)
          t.add(`${row}_${f}`, 0, f * LPC_FW, row * LPC_FH, LPC_FW, LPC_FH)
      this.anims.create({
        key: `${layer}:walk`,
        frames: Array.from({ length: LPC_FRAMES }, (_, f) => ({ key: layer, frame: `${LPC_ROW_WALK}_${f}` })),
        frameRate: 8, repeat: -1,
      })
      this.anims.create({
        key: `${layer}:back`,
        frames: Array.from({ length: LPC_FRAMES }, (_, f) => ({ key: layer, frame: `${LPC_ROW_BACK}_${f}` })),
        frameRate: 4, repeat: -1,
      })
    }

    this.people = []; this.returnQueue = []; this.selected = null
    this.stats = { total:0, stopped:0, phoned:0, returned:0 }; this.elapsed = 0
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => this.handleTouch(ptr.x, ptr.y))
  }

  // ── Update ───────────────────────────────────────────────────────────────────
  // @ts-expect-error Phaser 3 overridable
  update(_t: number, delta: number) {
    this.bg.clear(); this.ui.clear()
    this.elapsed += delta

    const active = this.people.filter(p => p.state !== 'gone').length
    this.spawnTimer -= delta
    if (this.spawnTimer <= 0 && active < MAX_PEOPLE) {
      this.spawnPerson(null)
      this.spawnTimer = 400 + Math.random() * 700
    }

    for (let i = this.returnQueue.length - 1; i >= 0; i--) {
      const e = this.returnQueue[i]!; e.delay -= delta
      if (e.delay <= 0) { this.spawnPerson(e.data); this.returnQueue.splice(i, 1) }
    }

    for (const p of this.people) {
      if (p.state === 'gone') {
        const s = this.sprites.get(p.id); if (s) { s.destroy(); this.sprites.delete(p.id) }
        const ls = this.lpcSprites.get(p.id); if (ls) { ls.forEach(s => s.destroy()); this.lpcSprites.delete(p.id) }
      }
    }
    this.people = this.people.filter(p => p.state !== 'gone')
    this.people.forEach(p => this.updatePerson(p, delta))
    this.checkConversations()
    this.people.forEach(p => this.updateSprite(p))

    this.drawBackground(this.bg)
    this.drawWall(this.bg)
    this.people.filter(p => p.state === 'chatting').forEach(p => this.drawAura(this.bg, p))

    this.drawDivider(this.ui)
    this.drawPanel(this.ui)
    const sorted = [...this.people].sort((a,b) => a.y - b.y)
    sorted.forEach(p => this.drawPersonUI(this.ui, p))
  }

  // ── Sprites ──────────────────────────────────────────────────────────────────
  private updateSprite(p: Person) {
    if (p.useLPC) { this.updateLPCSprite(p); return }

    const spr = this.sprites.get(p.id)
    if (!spr) return
    spr.x = p.x; spr.y = p.y
    spr.setDepth(1 + p.y / 1000)

    const atWall = p.state==='viewing'||p.state==='phone'||p.state==='chatting'
    const moving = p.state==='walking'||p.state==='departing'||p.state==='slowing'
    const key    = atWall ? `${p.charIdx}:back` : `${p.charIdx}:walk`
    if (moving || atWall) {
      if (spr.anims.currentAnim?.key !== key || !spr.anims.isPlaying) spr.anims.play(key, true)
    } else {
      spr.anims.stop(); spr.setFrame(fk(p.charIdx, atWall ? 3 : 1, 0))
    }
    spr.setFlipX(!atWall && p.dir === 1)
    spr.clearTint()
    if (p.isReturn) spr.setTint(0xFFEE88)
  }

  private updateLPCSprite(p: Person) {
    const sprs = this.lpcSprites.get(p.id)
    if (!sprs) return

    const atWall = p.state==='viewing'||p.state==='phone'||p.state==='chatting'
    const moving = p.state==='walking'||p.state==='departing'||p.state==='slowing'
    const depth  = 1 + p.y / 1000

    for (let i = 0; i < sprs.length; i++) {
      const spr = sprs[i]!
      spr.x = p.x; spr.y = p.y
      spr.setDepth(depth + i * 0.0001)  // layers stack: body → hair → pants → shirt

      const key = `${LPC_LAYERS[i]}:${atWall ? 'back' : 'walk'}`
      if (moving || atWall) {
        if (spr.anims.currentAnim?.key !== key || !spr.anims.isPlaying) spr.anims.play(key, true)
      } else {
        spr.anims.stop()
        spr.setFrame(`${atWall ? LPC_ROW_BACK : LPC_ROW_WALK}_0`)
      }
      // Walk-right frames face right; flip for leftward movement
      spr.setFlipX(!atWall && p.dir === -1)
    }
  }

  // ── Spawn ────────────────────────────────────────────────────────────────────
  private spawnPerson(ret: ReturnData | null) {
    const ls    = this.lanes
    const lane  = ls[Math.floor(Math.random() * ls.length)] ?? ls[0]!
    const dir   = (Math.random() < 0.5 ? 1 : -1) as 1|-1
    const id    = this.nextId++
    const fem   = ret ? ret.isFemale : Math.random() < 0.5
    const op    = ret ? ret.opinion  : Math.random() < 0.62
    const name  = ret ? ret.name : ((fem ? FEMALE_NAMES : MALE_NAMES)[Math.floor(Math.random() * 500)] ?? 'Billy')
    const thought = (ret ? ret.thought : (op ? THOUGHTS_POS : THOUGHTS_NEG)[Math.floor(Math.random() * 8)]) ?? 'WOW'
    const ci    = ret ? ret.charIdx : Math.floor(Math.random() * NUM_CHARS)
    const useLPC = ret ? ret.useLPC : true  // all new spawns use LPC
    const lpcSkin  = ret ? ret.lpcSkin  : Math.floor(Math.random() * LPC_SKIN_TONES.length)
    const lpcHair  = ret ? ret.lpcHair  : Math.floor(Math.random() * LPC_HAIR_COLORS.length)
    const lpcShirt = ret ? ret.lpcShirt : Math.floor(Math.random() * LPC_SHIRT_COLORS.length)
    const lpcPants = ret ? ret.lpcPants : Math.floor(Math.random() * LPC_PANTS_COLORS.length)

    const p: Person = {
      id, name, isFemale: fem,
      x: dir===1 ? 16 : this.walkMax, y: lane, lane, dir,
      speed: BASE_SPEED + (Math.random()-0.5)*4,
      state: 'walking', stateTimer: 0,
      opinion: op, visitCount: ret ? ret.visitCount+1 : 1, isReturn: ret!==null,
      charIdx: ci, color: PERSON_COLORS[id % PERSON_COLORS.length] ?? EGA.WHITE,
      thought,
      willStop:     ret ? Math.random()<0.75 : Math.random()<P_STOP,
      willInteract: ret ? Math.random()<0.85 : Math.random()<P_INTERACT,
      willPhone: Math.random()<P_PHONE, hasReacted: false,
      viewX: this.wallX + 12 + Math.random()*(this.wallW-24),
      bob: Math.random()*Math.PI*2,
      chatPartner: null, chatLine: '',
      noticeTimer: 0, noticeGlyph: '',
      useLPC, lpcSkin, lpcHair, lpcShirt, lpcPants,
    }
    this.people.push(p)
    this.stats.total++
    if (ret) this.stats.returned++

    if (useLPC) {
      const tints = [LPC_SKIN_TONES[lpcSkin]!, LPC_HAIR_COLORS[lpcHair]!, LPC_PANTS_COLORS[lpcPants]!, LPC_SHIRT_COLORS[lpcShirt]!]
      const layerSprs: Phaser.GameObjects.Sprite[] = []
      for (let i = 0; i < LPC_LAYERS.length; i++) {
        const spr = this.add.sprite(p.x, p.y, LPC_LAYERS[i]!, `${LPC_ROW_WALK}_0`)
        spr.setScale(LPC_SCALE).setDepth(1 + p.y / 1000 + i * 0.0001).setTint(tints[i]!)
        layerSprs.push(spr)
      }
      this.lpcSprites.set(id, layerSprs)
    } else {
      const spr = this.add.sprite(p.x, p.y, 'chars_raw', fk(ci, 1, 0))
      spr.setScale(1.0).setDepth(1 + p.y / 1000)
      this.sprites.set(id, spr)
    }
  }

  // ── Update person ────────────────────────────────────────────────────────────
  private updatePerson(p: Person, delta: number) {
    const dt = delta * 0.001
    p.stateTimer += delta
    if (p.noticeTimer > 0) p.noticeTimer -= delta

    switch (p.state) {
      case 'walking': {
        p.bob += dt*8; p.x += p.dir*p.speed*dt; p.y += (p.lane-p.y)*dt*5
        if (p.x < -20 || p.x > this.W+20) { p.state='gone'; break }
        if (!p.hasReacted) {
          const tx = p.dir===1 ? this.wallX-40 : this.wallX+this.wallW+40
          if (p.dir===1 ? p.x>=tx : p.x<=tx) {
            p.hasReacted = true
            if (p.willStop) { p.state='slowing'; p.stateTimer=0; this.stats.stopped++; p.noticeGlyph='?'; p.noticeTimer=900 }
          }
        }
        break
      }
      case 'slowing': {
        p.bob += dt*4
        const dx=p.viewX-p.x, dy=this.viewY-p.y, dist=Math.hypot(dx,dy)
        if (dist>2) { const s=p.speed*0.4; p.x+=(dx/dist)*s*dt; p.y+=(dy/dist)*s*dt }
        else {
          p.x=p.viewX; p.y=this.viewY; p.state='viewing'; p.stateTimer=0
          if (p.opinion) { p.noticeGlyph='!'; p.noticeTimer=900 }
        }
        break
      }
      case 'viewing': {
        const dwell = p.willInteract ? 20000+Math.random()*20000 : 1000+Math.random()*2000
        if (p.stateTimer>=dwell) {
          if (p.willInteract && p.willPhone) { p.state='phone'; p.stateTimer=0; this.stats.phoned++ }
          else this.depart(p)
        }
        break
      }
      case 'phone': { if (p.stateTimer>=15000+Math.random()*15000) this.depart(p); break }
      case 'chatting': {
        if (p.stateTimer>=5000+Math.random()*4000) {
          const partner = this.people.find(q=>q.id===p.chatPartner)
          if (partner) { partner.chatPartner=null; partner.state='departing'; partner.stateTimer=0 }
          p.chatPartner=null; this.depart(p)
        }
        break
      }
      case 'departing': {
        p.bob += dt*8; p.x += p.dir*p.speed*dt
        if (p.x<-20 || p.x>this.W+20) p.state='gone'
        break
      }
    }
  }

  private depart(p: Person) {
    if (p.visitCount===1 && Math.random()<P_RETURN) {
      this.returnQueue.push({
        data: { name:p.name, isFemale:p.isFemale, opinion:p.opinion, visitCount:p.visitCount, charIdx:p.charIdx, color:p.color, thought:p.thought, useLPC:p.useLPC, lpcSkin:p.lpcSkin, lpcHair:p.lpcHair, lpcShirt:p.lpcShirt, lpcPants:p.lpcPants },
        delay: 10000+Math.random()*20000,
      })
    }
    p.state='departing'; p.stateTimer=0
  }

  private checkConversations() {
    const v = this.people.filter(p=>(p.state==='viewing'||p.state==='phone')&&p.chatPartner===null)
    for (let i=0;i<v.length;i++) for (let j=i+1;j<v.length;j++) {
      const a=v[i]!, b=v[j]!
      if (Math.hypot(a.x-b.x,a.y-b.y)<30 && Math.random()<P_CHAT*0.01) {
        const pair = CONVO_PAIRS[Math.floor(Math.random()*CONVO_PAIRS.length)]!
        a.state='chatting'; a.stateTimer=0; a.chatPartner=b.id; a.chatLine=pair[0]!
        b.state='chatting'; b.stateTimer=0; b.chatPartner=a.id; b.chatLine=pair[1]!
      }
    }
  }

  // ── Aura ─────────────────────────────────────────────────────────────────────
  private drawAura(g: Phaser.GameObjects.Graphics, p: Person) {
    const px=Math.round(p.x), py=Math.round(p.y), t=this.elapsed
    const pulse = 0.12+0.10*Math.sin(t*0.005+p.id)
    g.fillStyle(EGA.YELLOW, pulse*2.2); g.fillRect(px-18, py-22, 36, 36)
    g.fillStyle(EGA.YELLOW, pulse*1.4); g.fillRect(px-26, py-30, 52, 50)
    g.fillStyle(EGA.YELLOW, pulse*0.7); g.fillRect(px-34, py-38, 68, 64)
    g.lineStyle(1, EGA.YELLOW, 0.5+0.5*Math.sin(t*0.005+p.id)); g.strokeRect(px-18, py-22, 36, 36)
  }

  // ── Per-person UI ─────────────────────────────────────────────────────────────
  private drawPersonUI(g: Phaser.GameObjects.Graphics, p: Person) {
    const px=Math.round(p.x), py=Math.round(p.y)
    if (this.selected===p) { g.lineStyle(2,EGA.YELLOW,0.9); g.strokeRect(px-12,py-26,24,36) }
    if (p.state==='phone') {
      g.fillStyle(0x88ccff, 0.3+0.3*Math.sin(this.elapsed*0.006+p.id))
      g.fillRect(px-12, py-26, 24, 36)
    }
    if (p.isReturn) { g.fillStyle(EGA.YELLOW); g.fillRect(px-1,py-32,3,3); g.fillRect(px,py-34,1,1) }
    if (p.noticeTimer>0) {
      g.fillStyle(p.noticeGlyph==='!' ? EGA.YELLOW : EGA.LIGHT_CYAN, Math.min(1,p.noticeTimer/200))
      print(g, p.noticeGlyph, px-2, py-42-Math.round((1-p.noticeTimer/900)*8), 2)
    }
    const nearWall = p.state==='viewing'||p.state==='phone'||p.state==='chatting'
    if (nearWall || this.selected===p) { this.drawNameTag(g,p,px,py); this.drawBubble(g,p,px,py) }
  }

  private drawNameTag(g: Phaser.GameObjects.Graphics, p: Person, px: number, py: number) {
    const bw=p.name.length*5+4; let bx=px-bw/2; const by=py-46
    bx=Math.max(2, Math.min(this.W-bw-2, bx))
    g.fillStyle(0x000000,0.85); g.fillRect(bx,by,bw,8)
    g.lineStyle(1,p.color,0.7); g.strokeRect(bx,by,bw,8)
    g.fillStyle(p.color); print(g,p.name,bx+2,by+1,1)
  }

  private drawBubble(g: Phaser.GameObjects.Graphics, p: Person, px: number, py: number) {
    const text = p.state==='chatting' ? p.chatLine : p.thought
    if (!text) return
    const bw=Math.min(text.length*6+10,140), bh=14
    let bx=px-bw/2; const above=py-62, below=py+20, by=above<2?below:above
    bx=Math.max(2, Math.min(this.W-bw-2, bx))
    g.fillStyle(0x00001a,0.94); g.fillRect(bx,by,bw,bh)
    g.lineStyle(1, p.state==='chatting' ? EGA.YELLOW : p.color); g.strokeRect(bx,by,bw,bh)
    g.fillStyle(p.color,0.12); g.fillRect(bx+1,by+1,bw-2,bh-2)
    g.fillStyle(0x00001a); g.fillRect(px-1,by+bh,2,3)
    if (p.state!=='chatting') {
      g.fillStyle(p.opinion ? EGA.LIGHT_GREEN : EGA.LIGHT_RED); print(g,p.opinion?'+':'-',bx+2,by+3,1)
      g.fillStyle(EGA.WHITE); print(g,text,bx+9,by+3,1)
    } else { g.fillStyle(EGA.YELLOW); print(g,text,bx+4,by+3,1) }
  }

  // ── Background ────────────────────────────────────────────────────────────────
  private drawBackground(g: Phaser.GameObjects.Graphics) {
    const W=this.W, pH=this.parkH
    g.fillStyle(0x4a7c59); g.fillRect(0,0,W,pH)
    g.lineStyle(1,0x3d6b4a,0.4)
    for (let x=0;x<W;x+=16) g.lineBetween(x,0,x,pH)
    for (let y=0;y<pH;y+=16) g.lineBetween(0,y,W,y)
    g.fillStyle(0xb8a47a); g.fillRect(0,14,W,pH-14)
    g.fillStyle(0x9a8a66); g.fillRect(0,14,W,2)
    g.fillStyle(0xa89868,0.5)
    for (let cx=8;cx<W;cx+=24) for (let cy=18;cy<pH;cy+=12) { const off=(Math.floor(cy/12)%2)*12; g.fillRect(cx+off,cy,20,10) }
    g.lineStyle(1,0x8a7a58,0.4)
    for (let cx=8;cx<W;cx+=24) for (let cy=18;cy<pH;cy+=12) { const off=(Math.floor(cy/12)%2)*12; g.strokeRect(cx+off,cy,20,10) }
    for (const [tx,ty] of [[10,67],[W-10,67]] as [number,number][]) {
      g.fillStyle(0x1a3a1a,0.4); g.fillRect(tx-9,ty+2,18,8)
      g.fillStyle(0x2d6e2d); g.fillRect(tx-10,ty-8,20,12)
      g.fillStyle(0x3d8e3d); g.fillRect(tx-8,ty-10,16,12)
      g.fillStyle(0x4dae4d); g.fillRect(tx-6,ty-12,12,8)
      g.fillStyle(0x5c3a1e); g.fillRect(tx-2,ty+2,4,8)
    }
    for (const lx of [64, W-64]) {
      g.fillStyle(0xccbb88); g.fillRect(lx-1,14,2,20)
      g.fillStyle(0xeedd99); g.fillRect(lx-3,11,6,4)
      g.fillStyle(0xffffcc,0.3); g.fillRect(lx-10,12,20,18)
    }
    const by2=Math.floor(pH*0.78)
    g.fillStyle(0x8b6914); g.fillRect(28,by2,26,4)
    g.fillStyle(0x6a5010); g.fillRect(28,by2+4,3,5); g.fillRect(51,by2+4,3,5)
    g.fillStyle(0x8b6914); g.fillRect(30,by2-3,22,3)
  }

  private drawWall(g: Phaser.GameObjects.Graphics) {
    const wx=this.wallX, ww=this.wallW
    g.fillStyle(0x6644cc,0.10); g.fillRect(wx-16,WALL_Y-6,ww+32,WALL_H+16)
    g.fillStyle(0x4422aa,0.15); g.fillRect(wx-8,WALL_Y-3,ww+16,WALL_H+10)
    g.fillStyle(0x1a1a2a); g.fillRect(wx,WALL_Y+WALL_H,ww,3)
    g.fillStyle(EGA.BLACK); g.fillRect(wx,WALL_Y,ww,WALL_H)
    g.lineStyle(1,0x4433aa); g.lineBetween(wx,WALL_Y,wx+ww,WALL_Y)
    g.fillStyle(0x8866ff)
    g.fillRect(wx-3,WALL_Y-2,4,4); g.fillRect(wx+ww-1,WALL_Y-2,4,4)
  }

  // ── Panel ─────────────────────────────────────────────────────────────────────
  private drawDivider(g: Phaser.GameObjects.Graphics) {
    const py=this.panelY
    g.fillStyle(0x000033); g.fillRect(0,py,this.W,2)
    g.lineStyle(2,EGA.YELLOW); g.lineBetween(0,py,this.W,py)
    g.lineStyle(1,0x4444aa); g.lineBetween(0,py+3,this.W,py+3)
    g.fillStyle(EGA.YELLOW); g.fillRect(0,py,6,6); g.fillRect(this.W-6,py,6,6)
    g.fillStyle(EGA.WHITE); g.fillRect(2,py+2,2,2); g.fillRect(this.W-4,py+2,2,2)
  }

  private drawPanel(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(0x000033); g.fillRect(0,this.panelY,this.panelW,this.H-this.panelY)
    if (this.selected && this.selected.state!=='gone') this.drawPersonPanel(g, this.selected)
    else this.drawIdlePanel(g)
  }

  private drawIdlePanel(g: Phaser.GameObjects.Graphics) {
    const py=this.panelY, cx=this.W/2, s=this.fs
    g.fillStyle(EGA.YELLOW); print(g,'THE INSTALLATION',cx-76*s,py+10,s)
    g.lineStyle(1,0x4444aa); g.lineBetween(10,py+16*s,this.W-10,py+16*s)
    const rows: [string,string,number][] = [
      ['PASSED BY',String(this.stats.total),    EGA.LIGHT_GRAY],
      ['STOPPED',  String(this.stats.stopped),  EGA.YELLOW],
      ['USED PHONE',String(this.stats.phoned),  EGA.CYAN],
      ['RETURNED', String(this.stats.returned), EGA.LIGHT_GREEN],
    ]
    rows.forEach(([l,v,c],i) => {
      const ry=py+(24+i*26)*s
      g.fillStyle(0x0a0a44); g.fillRect(10,ry,this.W-20,20*s)
      g.lineStyle(1,0x2222aa); g.strokeRect(10,ry,this.W-20,20*s)
      g.fillStyle(c as number); print(g,l as string,22,ry+6*s,s)
      g.fillStyle(EGA.WHITE); print(g,v as string,this.W-20-(v as string).length*6*s,ry+6*s,s)
    })
    const atWall=this.people.filter(p=>['viewing','phone','chatting'].includes(p.state)).length
    if (atWall>0) { g.fillStyle(EGA.CYAN); print(g,`${atWall} AT THE WALL NOW`,cx-70*s,py+132*s,s) }
    g.fillStyle(EGA.DARK_GRAY,0.5+0.5*Math.sin(this.elapsed*0.003)); print(g,'TAP A PERSON',cx-48*s,py+162*s,s)
  }

  private drawPersonPanel(g: Phaser.GameObjects.Graphics, p: Person) {
    const py=this.panelY, s=this.fs, pz=40*s, l=16, r=this.W-16
    const tx=l+pz+12

    // Portrait
    if (p.useLPC) {
      const tints = [LPC_SKIN_TONES[p.lpcSkin]!, LPC_HAIR_COLORS[p.lpcHair]!, LPC_PANTS_COLORS[p.lpcPants]!, LPC_SHIRT_COLORS[p.lpcShirt]!]
      for (let i = 0; i < LPC_LAYERS.length; i++) {
        const portraitSpr = this.add.image(l+pz/2, py+8+pz/2, LPC_LAYERS[i]!, `${LPC_ROW_BACK}_0`)
        portraitSpr.setScale(pz / LPC_FH).setDepth(101 + i * 0.001).setTint(tints[i]!)
        this.time.delayedCall(50, () => { if (portraitSpr?.active) portraitSpr.destroy() })
      }
    } else {
      const frameKey = fk(p.charIdx, p.state==='viewing'||p.state==='phone'||p.state==='chatting' ? 3 : 1, 0)
      const portraitSpr = this.add.image(l+pz/2, py+8+pz/2, 'chars_raw', frameKey)
      portraitSpr.setScale(pz/FW).setDepth(101)
      this.time.delayedCall(50, () => { if (portraitSpr?.active) portraitSpr.destroy() })
    }

    g.fillStyle(p.color); print(g,p.name,tx,py+10,s)
    g.fillStyle(EGA.DARK_GRAY); print(g,p.isFemale?'SHE/HER':'HE/HIM',tx,py+10+14*s,1)
    if (p.isReturn) { g.fillStyle(EGA.YELLOW); print(g,`VISIT #${p.visitCount}`,tx+60*s,py+10+14*s,1) }
    g.lineStyle(1,0x4444aa); g.lineBetween(l,py+pz+16,r,py+pz+16)
    const rows: [string,string,number][] = [
      ['OPINION',p.opinion?'LOVES IT':'NOT SOLD',p.opinion?EGA.LIGHT_GREEN:EGA.LIGHT_RED],
      ['STATUS', STATE_LABELS[p.state],           EGA.LIGHT_CYAN],
      ['THINKS', `"${p.thought}"`,                EGA.WHITE],
    ]
    if (p.state==='chatting') {
      const q=this.people.find(q=>q.id===p.chatPartner)
      if (q) rows.push(['TALKING TO',q.name,EGA.YELLOW])
    }
    rows.forEach(([lbl,val,col],i) => {
      const ry=py+pz+24+i*22*s
      g.fillStyle(EGA.DARK_GRAY); print(g,lbl as string,l+8,ry,1)
      g.fillStyle(col as number); print(g,val as string,l+8+80*s,ry,1)
    })
    const eng=this.engagePct(p), barY=py+pz+24+rows.length*22*s+8
    g.lineStyle(1,0x4444aa); g.lineBetween(l,barY-6,r,barY-6)
    g.fillStyle(EGA.DARK_GRAY); print(g,'ENGAGEMENT',l+8,barY,1)
    const bx=l+8+80*s, bw=r-bx-30
    g.fillStyle(0x111144); g.fillRect(bx,barY+1,bw,7)
    g.fillStyle(p.color); g.fillRect(bx,barY+1,Math.floor(bw*eng/100),7)
    g.fillStyle(EGA.WHITE); print(g,`${eng}%`,r-20,barY,1)
  }

  private engagePct(p: Person) {
    switch(p.state) {
      case 'slowing': return 25; case 'viewing': return p.willInteract?65:38
      case 'phone':   return 92; case 'chatting': return 85
      case 'departing': return p.willInteract?50:12; default: return 0
    }
  }

  // ── Input ─────────────────────────────────────────────────────────────────────
  private handleTouch(cx: number, cy: number) {
    if (cy>=this.panelY) { this.selected=null; return }
    let best: Person|null=null, d=30
    for (const p of this.people) { if (p.state==='gone') continue; const dd=Math.hypot(p.x-cx,p.y-cy); if (dd<d) { best=p; d=dd } }
    this.selected = (best && this.selected!==best) ? best : null
  }
}
