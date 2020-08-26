import { Layout } from './layout'
import { NetV } from '../index'

type Positions = { x: number; y: number }[]

function lerpPosition(source: Positions, target: Positions, ratio: number) {
    return Array(source.length)
        .fill(undefined)
        .map((_, i) => {
            const x = source[i].x + (target[i].x - source[i].x) * ratio
            const y = source[i].y + (target[i].y - source[i].y) * ratio
            return { x, y }
        })
}

class RandomLayout extends Layout {
    private _time: number
    private sourcePositions: Positions
    private currentPositions: Positions
    private targetPositions: Positions

    public constructor(netv: NetV) {
        super(netv)
    }

    public time(_time: number) {
        this._time = _time
    }

    public start() {
        this.computePosition()

        let start: number
        const step = (timestamp: number) => {
            if (start === undefined) {
                start = timestamp
                this.startCallback && this.startCallback()
            }
            const elapsed = timestamp - start

            this.currentPositions = lerpPosition(
                this.sourcePositions,
                this.targetPositions,
                elapsed / this._time
            )

            this.applyPosition()

            this.tickCallback && this.tickCallback()

            if (elapsed < this._time) {
                requestAnimationFrame(step)
            } else {
                this.stopCallback && this.stopCallback()
            }
        }

        requestAnimationFrame(step)
    }
    public stop() {}
    public finish() {
        this.computePosition()
        this.currentPositions = this.targetPositions
        this.applyPosition()
    }

    private computePosition() {
        if (this.targetPositions) {
            return
        }
        const nodes = this.netv.nodes()
        this.sourcePositions = nodes.map((n) => ({ x: n.x(), y: n.y() }))
        // random target position
        const width = this.netv.$_configs.width
        const height = this.netv.$_configs.height
        this.targetPositions = Array(this.sourcePositions.length)
            .fill(undefined)
            .map(() => {
                return {
                    x: Math.random() * width,
                    y: Math.random() * height
                }
            })
    }

    private applyPosition() {
        const nodes = this.netv.nodes()
        nodes.forEach((n, i) => {
            n.x(this.currentPositions[i].x)
            n.y(this.currentPositions[i].y)
        })
        this.netv.draw()
    }
}

export { RandomLayout }