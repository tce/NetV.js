import {NetV} from './NetV'
import data from './background'
export default function demo(id) {
/**
 * @author Xiaodong Zhao <zhaoxiaodong@zju.edu.cn>
 * @description landing page
 */

const div = document.getElementById(id)

const mousePos = {
    x: 1e9,
    y: 1e9
}

div.addEventListener('mousemove', (ev) => {
    mousePos.x = ev.offsetX
    mousePos.y = ev.offsetY
})
const width = document.getElementById(id).clientWidth
const titleHeight = document.getElementsByClassName('hero')[0].clientHeight
const featuresHeight = document.getElementsByClassName('features')[0].clientHeight
const height = titleHeight+featuresHeight+280+50//280是图片class的max-height
const configs = {
    container: div,
    width,
    height,
    nodeLimit: 1e5,
    linkLimit: 1e7,
    backgroundColor: { r: 0, g: 0, b: 0, a: 1 },
    node: {
        strokeWidth: 0,
        fill: { r: 0, g: 0.3, b: 0.7, a: 1 }
    }
}

// const data = {
//     nodes: [],
//     links: []
// }

// random generate nodes

// data.nodes = Array(5000)
//     .fill()
data.nodes.map((d, i) => {
        const x = d.x<0 ? -d.x*configs.width: (d.x+0.5)*configs.width
        const y = d.y<0 ? -d.y*configs.height: (d.y+0.5)*configs.height
        return {
            id: String(i),
            x: x,
            y: y,
            originX: x,
            originY: y,
            r: Math.random() * 2
        }
    })

const netv = new NetV(configs)
netv.data(data)

const mouseMass = 5000000
const forceMouseMax = 1000
const originK = 10

function render() {
    data.nodes.forEach((n) => {
        const node = netv.getNodeById(n.id)

        // calculate movement direction
        const lenMouse = Math.sqrt((n.x - mousePos.x) ** 2 + (n.y - mousePos.y) ** 2)
        let forceMouse = Math.min(forceMouseMax, mouseMass / lenMouse ** 2)
        const lenOrigin = Math.sqrt((n.x - n.originX) ** 2 + (n.y - n.originY) ** 2)
        let forceOrigin = originK * lenOrigin
        if (isNaN(forceOrigin)) {
            forceOrigin = 0
        }
        if (isNaN(forceMouse)) {
            forceMouse = 0
        }

        const force = {
            x: (n.originX - n.x) * originK + ((mousePos.x - n.x) / lenMouse) * forceMouse,
            y: (n.originY - n.y) * originK + ((mousePos.y - n.y) / lenMouse) * forceMouse
        }

        const movement = {
            x: force.x * 0.01,
            y: force.y * 0.01
        }

        n.x += movement.x
        n.y += movement.y

        node.position(n.x, n.y)
    })
    netv.draw()
    requestAnimationFrame(render)
}

render()

}