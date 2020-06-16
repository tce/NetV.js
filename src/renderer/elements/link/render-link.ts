/**
 * @author Xiaodong Zhao <zhaoxiaodong@zju.edu.cn>
 * @description Link used in renderer
 */

import vertShaderStr from './vertex.glsl'
import fragShaderStr from './fragment.glsl'
import idVertShaderStr from './id-vertex.glsl'
import idFragShaderStr from './id-fragment.glsl'
import {
    createProgram,
    createArrayBuffer,
    extractAttributesFromShader,
    encodeRenderId
} from '../../utils'
import { RenderAttribute, Transform } from '../../interfaces'
import Link from '../../../link'

enum LinkAttrKey {
    TEMPLATE,
    SOURCE,
    TARGET,
    WIDTH,
    COLOR
}

enum LinkIdAttrKey {
    TEMPLATE,
    SOURCE,
    TARGET,
    WIDTH,
    COLOR,
    ID
}

export class RenderLinkManager {
    private gl: WebGL2RenderingContext
    private limit: number
    private count = 0
    private width: number
    private height: number
    private program: WebGLProgram
    private attributes: RenderAttribute
    private idProgram: WebGLProgram
    private idAttributes: RenderAttribute
    private idTexture: WebGLTexture
    private renderIdToIds: [string, string][]

    public constructor(
        gl: WebGL2RenderingContext,
        width: number,
        height: number,
        limit: number,
        idTexture: WebGLTexture
    ) {
        this.gl = gl
        this.limit = limit
        this.width = width
        this.height = height

        this.attributes = extractAttributesFromShader(vertShaderStr)
        this.program = createProgram(this.gl, vertShaderStr, fragShaderStr, this.attributes)

        this.idAttributes = extractAttributesFromShader(idVertShaderStr)
        this.idProgram = createProgram(this.gl, idVertShaderStr, idFragShaderStr, this.idAttributes)
        this.idTexture = idTexture
        this.renderIdToIds = new Array(limit)

        // init arrays
        // prettier-ignore
        this.attributes[LinkAttrKey.TEMPLATE].array = new Float32Array([
            -0.5, 0.5, 1.0,
            -0.5, -0.5, 1.0,
            0.5, 0.5, 1.0,
            0.5, -0.5, 1.0,
        ])
        this.attributes.forEach((attr) => {
            if (!attr.isBuildIn) attr.array = new Float32Array(attr.size * this.limit)
        })

        // init buffers
        this.attributes.forEach((attr) => {
            attr.buffer = createArrayBuffer(this.gl, attr.array)
        })

        // init id attributes and buffers
        // TODO: hardcode check, need refactor
        this.idAttributes.forEach((attr, idx) => {
            if (idx < this.attributes.length) {
                this.idAttributes[idx] = this.attributes[idx]
            } else {
                if (!attr.isBuildIn) attr.array = new Float32Array(attr.size * this.limit)
                attr.buffer = createArrayBuffer(this.gl, attr.array)
            }
        })

        // init uniforms
        this.gl.useProgram(this.program)
        const projectionLoc = this.gl.getUniformLocation(this.program, 'projection')
        const scaleLoc = this.gl.getUniformLocation(this.program, 'scale')
        const translateLoc = this.gl.getUniformLocation(this.program, 'translate')

        // this.gl.viewport(0, 0, this.width, this.height) // TODO: viewport set, not needed? put here in case bug appear

        // prettier-ignore
        const projection = new Float32Array([
            2 / this.width, 0, 0,
            0, -2 / this.height, 0,
            -1, 1, 1
        ])
        this.gl.uniformMatrix3fv(projectionLoc, false, projection)

        const scale = new Float32Array([1, 1])
        this.gl.uniform2fv(scaleLoc, scale)

        const translate = new Float32Array([0, 0])
        this.gl.uniform2fv(translateLoc, translate)

        // id uniforms, identical to link
        // TODO: need refactor too
        this.gl.useProgram(this.idProgram)
        const idProjectionLoc = this.gl.getUniformLocation(this.idProgram, 'projection')
        const idScaleLoc = this.gl.getUniformLocation(this.idProgram, 'scale')
        const idTranslateLoc = this.gl.getUniformLocation(this.idProgram, 'translate')

        this.gl.uniformMatrix3fv(idProjectionLoc, false, projection)
        this.gl.uniform2fv(idScaleLoc, scale)
        this.gl.uniform2fv(idTranslateLoc, translate)
    }

    /**
     * add links data to engine
     * @param links links data
     */
    public addData(links: Link[]) {
        // set array
        links.forEach((link, i) => {
            // TODO: consider link and render link attribute mapping
            const source = link.source()
            const sourcePosition = source.position()
            this.attributes[LinkAttrKey.SOURCE].array[2 * (this.count + i)] = sourcePosition.x
            this.attributes[LinkAttrKey.SOURCE].array[2 * (this.count + i) + 1] = sourcePosition.y

            const target = link.target()
            const targetPosition = target.position()
            this.attributes[LinkAttrKey.TARGET].array[2 * (this.count + i)] = targetPosition.x
            this.attributes[LinkAttrKey.TARGET].array[2 * (this.count + i) + 1] = targetPosition.y

            this.attributes[LinkAttrKey.WIDTH].array[this.count + i] = link.strokeWidth()

            const color = link.strokeColor()
            this.attributes[LinkAttrKey.COLOR].array[4 * (this.count + i)] = color.r
            this.attributes[LinkAttrKey.COLOR].array[4 * (this.count + i) + 1] = color.g
            this.attributes[LinkAttrKey.COLOR].array[4 * (this.count + i) + 2] = color.b
            this.attributes[LinkAttrKey.COLOR].array[4 * (this.count + i) + 3] = color.a

            const renderIdColor = encodeRenderId(this.count + i)
            this.idAttributes[LinkIdAttrKey.ID].array[4 * (this.count + i)] = renderIdColor.r
            this.idAttributes[LinkIdAttrKey.ID].array[4 * (this.count + i) + 1] = renderIdColor.g
            this.idAttributes[LinkIdAttrKey.ID].array[4 * (this.count + i) + 2] = renderIdColor.b
            this.idAttributes[LinkIdAttrKey.ID].array[4 * (this.count + i) + 3] = renderIdColor.a

            const sourceTarget = link.sourceTarget()
            this.renderIdToIds[this.count + i] = [
                sourceTarget.source.id(),
                sourceTarget.target.id()
            ]
        })

        this.attributes.forEach((attr) => {
            if (!attr.isBuildIn) {
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, attr.buffer)
                this.gl.bufferSubData(
                    this.gl.ARRAY_BUFFER,
                    attr.size * this.count * attr.array.BYTES_PER_ELEMENT,
                    attr.array,
                    attr.size * this.count,
                    attr.size * links.length
                )
            }
        })

        // id buffer data
        const attr = this.idAttributes[LinkIdAttrKey.ID]
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, attr.buffer)
        this.gl.bufferSubData(
            this.gl.ARRAY_BUFFER,
            attr.size * this.count * attr.array.BYTES_PER_ELEMENT,
            attr.array,
            attr.size * this.count,
            attr.size * links.length
        )

        this.count += links.length
    }

    /**
     * set Transform in Render Link
     * @param transform current transform(pan&zoom condition)
     */
    public setTransform(transform: Transform) {
        this.gl.useProgram(this.program)
        const scaleLoc = this.gl.getUniformLocation(this.program, 'scale')
        const translateLoc = this.gl.getUniformLocation(this.program, 'translate')

        const scale = new Float32Array([transform.k, transform.k])
        this.gl.uniform2fv(scaleLoc, scale)

        const translate = new Float32Array([transform.x, transform.y])
        this.gl.uniform2fv(translateLoc, translate)

        // id uniforms, identical to link
        // TODO: need refactor too
        this.gl.useProgram(this.idProgram)
        const idScaleLoc = this.gl.getUniformLocation(this.idProgram, 'scale')
        const idTranslateLoc = this.gl.getUniformLocation(this.idProgram, 'translate')

        this.gl.uniform2fv(idScaleLoc, scale)
        this.gl.uniform2fv(idTranslateLoc, translate)
    }

    /**
     * render id to link ids(source and target)
     * @param renderId
     */
    public getIdsByRenderId(renderId: number): [string, string] {
        return this.renderIdToIds[renderId]
    }

    /**
     * draw links
     */
    public draw() {
        if (this.count > 0) {
            this.gl.useProgram(this.program)
            this.attributes.forEach((attr) => {
                this.gl.enableVertexAttribArray(attr.index)
            })

            this.attributes.forEach((attr, i) => {
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, attr.buffer)
                this.gl.vertexAttribPointer(
                    attr.index,
                    attr.size,
                    this.gl.FLOAT,
                    false,
                    attr.isBuildIn ? 0 : attr.size * attr.array.BYTES_PER_ELEMENT,
                    0
                )
                if (!attr.isBuildIn) this.gl.vertexAttribDivisor(attr.index, 1)
            })
        }

        this.gl.drawArraysInstanced(this.gl.TRIANGLE_STRIP, 0, 4, this.count)

        // draw id
        this.gl.blendFunc(this.gl.ONE, this.gl.ZERO)
        this.gl.useProgram(this.idProgram)
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.idTexture)

        this.idAttributes.forEach((attr) => {
            this.gl.enableVertexAttribArray(attr.index)
        })

        const attr = this.idAttributes[LinkIdAttrKey.ID]
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, attr.buffer)
        this.gl.vertexAttribPointer(
            attr.index,
            attr.size,
            this.gl.FLOAT,
            false,
            attr.size * attr.array.BYTES_PER_ELEMENT,
            0
        )
        this.gl.vertexAttribDivisor(attr.index, 1)

        this.gl.drawArraysInstanced(this.gl.TRIANGLE_STRIP, 0, 4, this.count)
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null)

        this.gl.enable(this.gl.BLEND)
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA)
    }
}
