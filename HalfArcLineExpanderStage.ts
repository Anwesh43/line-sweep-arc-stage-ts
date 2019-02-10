const w : number = window.innerWidth
const h : number = window.innerHeight
const nodes : number = 5
const lines : number = 2
const scGap : number = 0.05
const scDiv : number = 0.51
const sizeFactor : number = 3
const strokeFactor : number = 90
const foreColor : string = "#673AB7"
const backColor : string = "#212121"


const maxScale : Function = (scale : number, i : number, n : number) : number => {
    return Math.max(0, scale - i / n)
}

const divideScale : Function = (scale : number, i : number, n : number) : number => {
    return Math.min(1/n, maxScale(scale, i, n))
}

const scaleFactor : Function = (scale : number) : number => Math.floor(scale / scDiv)

const mirrorValue : Function = (scale : number, a : number, b : number) : number => {
    const k : number = scaleFactor(scale)
    return (1 - k) / a + k / b
}

const updateValue : Function = (scale : number, dir : number, a : number, b : number) : number => {
    return mirrorValue(scale, a, b) * dir * scGap
}

const drawLineArc : Function = (context : CanvasRenderingContext2D, r : number, rot : number) => {
    context.save()
    context.rotate(rot)
    context.beginPath()
    context.moveTo(0, 0)
    context.lineTo(0, r)
    context.stroke()
    context.save()
    for (var i = 0; i <= rot; i++) {
        const x = r * Math.cos(i * Math.PI/180)
        const y = r * Math.sin(i * Math.PI/180)
        if (i == 0) {
            context.beginPath()
            context.moveTo(x, y)
        } else {
            context.lineTo(x, y)
        }
    }
    context.stroke()
    context.restore()
    context.restore()
}

const drawHALENode : Function = (context : CanvasRenderingContext2D, i : number, scale : number) => {
    const gap : number = w / (nodes + 1)
    const size : number = gap / sizeFactor
    context.strokeStyle = foreColor
    context.lineCap = 'round'
    context.lineWidth = Math.min(w, h) / strokeFactor
    const sc1 : number = divideScale(scale, 0, 2)
    const sc2 : number = divideScale(scale, 1, 2)
    context.save()
    context.translate(gap * i, h / 2)
    for (var j = 0; j < lines; j++) {
        const sf : number = 1 - 2 * j
        const sc : number = divideScale(scale, j, lines)
        drawLineArc(context, -180 * j * sc1 - 90 * sc * sf)
    }
    context.restore()
}

class HalfArcLineExpanderStage {

    canvas : HTMLCanvasElement = document.createElement('canvas')
    context : CanvasRenderingContext2D

    initCanvas() {
        this.canvas.width = w
        this.canvas.height = h
        this.context = this.canvas.getContext('2d')
        document.body.appendChild(this.canvas)
    }

    render() {
        this.context.fillStyle = backColor
        this.context.fillRect(0, 0, w, h)
    }

    handleTap() {
        this.canvas.onmousedown = () => {

        }
    }

    static init() {
        const stage : HalfArcLineExpanderStage = new HalfArcLineExpanderStage()
        stage.initCanvas()
        stage.render()
        stage.handleTap()
    }
}

class State {

    scale : number = 0
    dir : number = 0
    prevScale : number = 0

    update(cb : Function) {
        this.scale += updateValue(this.scale, this.dir, 1, lines)
        if (Math.abs(this.scale - this.prevScale) > 1) {
            this.scale = this.prevScale + this.dir
            this.dir = 0
            this.prevScale = this.scale
            cb()
        }
    }

    startUpdating(cb : Function) {
        if (this.dir == 0) {
            this.dir = 1 - 2 * this.prevScale
            cb()
        }
    }
}

class Animator {
    animated : boolean = false
    interval : number

    start(cb : Function) {
        if (!this.animated) {
            this.animated = true
            this.interval = setInterval(cb, 50)
        }
    }

    stop() {
        if (this.animated) {
            this.animated = false
            clearInterval(this.interval)
        }
    }
}

class HALENode {

    next : HALENode
    prev : HALENode
    state : State = new State()

    constructor(private i : number) {
        this.addNeighbor()
    }

    addNeighbor() {
        if (this.i < nodes - 1) {
            this.next = new HALENode(this.i + 1)
            this.next.prev = this
        }
    }

    draw(context : CanvasRenderingContext2D) {
        drawHALENode(context, this.i, this.state.scale)
        if (this.next) {
            this.next.draw(context)
        }
    }

    update(cb : Function) {
        this.state.update(cb)
    }

    startUpdating(cb : Function) {
        this.state.startUpdating(cb)
    }

    getNext(dir : number, cb : Function) : HALENode {
        var curr : HALENode = this.prev
        if (dir == 1) {
            curr = this.next
        }
        if (curr != null) {
            return curr
        }
        cb()
        return this
    }
}

class HalfArcLineExpander {
    root : HALENode = new HALENode(0)
    curr : HALENode = this.root
    dir : number = 1

    draw(context : CanvasRenderingContext2D) {
        this.root.draw(context)
    }


    update(cb : Function) {
        this.curr.update(() => {
            this.curr = this.curr.getNext(this.dir, () => {
                this.dir *= -1
            })
            cb()
        })
    }

    startUpdating(cb : Function) {
        this.curr.startUpdating(cb)
    }
}

class Renderer {

    hale : HalfArcLineExpander = new HalfArcLineExpander()
    animator : Animator = new Animator()

    render(context : CanvasRenderingContext2D) {
        this.hale.draw(context)
    }

    handleTap(cb : Function) {
        this.hale.startUpdating(() => {
            this.animator.start(() => {
                cb()
                this.hale.update(() => {
                    this.animator.stop()
                    cb()
                })
            })
        })
    }
}
