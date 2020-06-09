/**
 * @author Xiaodong Zhao <zhaoxiaodong@zju.edu.cn>
 * @description Basic test for render node
 *
 * expected: 4 square draw on screen
 */
const netv = new NetV(document.getElementById('main'))
const testData = {
    nodes: [
        {
            id: '0',
            x: 0,
            y: 0,
        },
        {
            id: '1',
            x: 100,
            y: 500,
        },
        {
            id: '2',
            x: 400,
            y: 400,
        },
        {
            id: '3',
            x: 800,
            y: 600,
            r: 20,
            fill: {
                r: 0,
                g: 0,
                b: 1,
                a: 1
            }
        }
    ],
    links: [
        {
            source: '0',
            target: '1',
            strokeColor: {
                r: 0.5,
                g: 0.5,
                b: 0.5,
                a: 0.5
            }
        },
        {
            source: '0',
            target: '2',
        },
        {
            source: '1',
            target: '2',
            strokeColor: {
                r: 0,
                g: 0,
                b: 1,
                a: 1
            }
        },
    ]
}

netv.data(testData)
netv.draw()
