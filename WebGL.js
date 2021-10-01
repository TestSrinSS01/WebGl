// noinspection DuplicatedCode

class VertexBuffer {
    constructor(gl, buffer, usage) {
        this.gl = gl
        this.vbo = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(buffer), usage)
    }
    bind() {
        this.gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo)
    }
}
class Layout {
    constructor() {
        this.elements = []
        this.stride = 0
    }
    add(count, offset) {
        this.elements.push({"count": count, "offset": offset * 4})
        this.stride += count * 4
    }
}
class VertexArray {
    constructor(gl) {
        this.gl = gl
        this.vao = gl.createVertexArray()
        gl.bindVertexArray(this.vao)
    }
    add_layout(vbo, layout) {
        this.bind()
        vbo.bind()
        const elements = layout.elements
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i]
            this.gl.vertexAttribPointer(i, element.count, this.gl.FLOAT, false, layout.stride, element.offset)
            this.gl.enableVertexAttribArray(i)
        }
    }
    bind() {
        this.gl.bindVertexArray(this.vao)
    }
}
class Shader {
    constructor(gl, vertex_src, fragment_src) {
        this.gl = gl
        this.program = ((gl, vertex_src, fragment_src) => {
            const compile_shader = (gl, type, src) => {
                const shader = gl.createShader(type)
                gl.shaderSource(shader, src)
                gl.compileShader(shader)
                if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                    const msg = gl.getShaderInfoLog(shader)
                    alert(`unable to compile ${type === gl.VERTEX_SHADER? "vertex": "fragment"} shader\n${msg}`)
                    gl.deleteShader(shader)
                    return null
                }
                return shader
            }
            const program = gl.createProgram()
            const vertex = compile_shader(gl, gl.VERTEX_SHADER, vertex_src)
            const fragment = compile_shader(gl, gl.FRAGMENT_SHADER, fragment_src)
            if (!(vertex && fragment)) return null
            gl.attachShader(program, vertex)
            gl.attachShader(program, fragment)
            gl.linkProgram(program)
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                const msg = gl.getProgramInfoLog(program)
                alert(`unable to link program\n${msg}`)
                return null
            }
            gl.validateProgram(program)
            if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
                const msg = gl.getProgramInfoLog(program)
                alert(`unable to validate program\n${msg}`)
                return null
            }
            gl.deleteShader(vertex)
            gl.deleteShader(fragment)
            return program
        })(gl, vertex_src, fragment_src)
    }
    use() {
        this.gl.useProgram(this.program)
    }
    setUniformMat4fv(name, mat) {
        this.use()
        this.gl.uniformMatrix4fv(this.gl.getUniformLocation(this.program, name), false, mat)
    }
}
class Window {
    constructor(gl, width, height) {
        this.width = width
        this.height = height
        this.vao = new VertexArray(gl)
        this.vbo = new VertexBuffer(gl, new Float32Array(1600), gl.DYNAMIC_DRAW)
        this.layout = new Layout()
        this.layout.add(2, 0)
        this.layout.add(4, 2)
        this.vao.add_layout(this.vbo, this.layout)
        this.shader = new Shader(gl,
            "attribute vec4 aPos;\n\
                      attribute vec4 aColour;\n\
                      varying vec4 vColour;\n\
                      uniform mat4 mvp;\n\
                      void main() {\n\
                          gl_Position = mvp * aPos;\n\
                          vColour = aColour;\n\
                      }\n\
                      ",
            "precision mediump float;\n\
                        varying vec4 vColour;\n\
                        void main() {\n\
                            gl_FragColor = vColour;\n\
                        }"
        )
    }
    click(x, y) {

    }
    render(callback = () => {}) {
        this.shader.use()
        const mvp = glMatrix.mat4.create()
        glMatrix.mat4.ortho(mvp, 0, this.width, 0, this.height, -1, 1)
        this.shader.use()
        this.shader.setUniformMat4fv("mvp", mvp)
        callback()
    }
}
class Buffer {
    constructor(...vertices) {
        this.vertices = vertices
    }
    get length() { return this.vertices.length }
    to_float_array() {
        let arr = []
        this.vertices.forEach(value => arr = arr.concat(value))
        return new Float32Array(arr)
    }
}
class Button {
    constructor(x, y, w, h, colour, callback, texture) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.colour = colour;
        this.callback = callback;
        this.texture = texture;
    }
    add_offset(x, y) {
        this.x += x
        this.y += y
    }
    get vertices() {
        return new Buffer(
            [this.x, this.y,                        this.colour[0], this.colour[1], this.colour[2], 1.0],
                   [this.x + this.w, this.y,                this.colour[0], this.colour[1], this.colour[2], 1.0],
                   [this.x + this.w,  this.y + this.h,      this.colour[0], this.colour[1], this.colour[2], 1.0],
                   [this.x + this.w,  this.y + this.h,      this.colour[0], this.colour[1], this.colour[2], 1.0],
                   [this.x,  this.y + this.h,               this.colour[0], this.colour[1], this.colour[2], 1.0],
                   [this.x, this.y,                         this.colour[0], this.colour[1], this.colour[2], 1.0]
        )
    }
    click(x, y) {
        if (this.hover(x, y)) this.callback(this)
    }
    hover(x, y) {
        return x >= this.x && x <= (this.x + this.w) && y >= this.y && y <= (this.y + this.h)
    }
}
class Box {

}

const x = 10, y = 10, w = 100, h = 100;

const buffer = new Buffer(
    [x, y,              1.0, 0.0, 0.0, 1.0],
            [x + w, y,          0.0, 0.0, 1.0, 1.0],
            [x + w,  y + h,     0.0, 1.0, 0.0, 1.0],
            [x + w,  y + h,     0.0, 1.0, 0.0, 1.0],
            [x,  y + h,         1.0, 1.0, 0.0, 1.0],
            [x, y,              1.0, 0.0, 0.0, 1.0]
)

const canvas = document.getElementById("foo")
const gl = canvas.getContext('webgl2')
const win = new Window(gl, 600, 400)

canvas.addEventListener('click', event => {
    win.click(event.clientX, 400 - event.clientY)
})

win.render(() => {
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(buffer.to_float_array()))
    gl.drawArrays(gl.TRIANGLES, 0, buffer.length)
})