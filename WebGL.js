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
    setUniform1iv(name, arr) {
        this.use()
        this.gl.uniform1iv(this.gl.getUniformLocation(this.program, name), arr)
    }
}
class Texture {
    constructor(gl, slot, path) {
        this.gl = gl
        this.slot = slot
        this.path = path
        this.texture = gl.createTexture()
        gl.activeTexture(gl.TEXTURE0 + slot)
        gl.bindTexture(gl.TEXTURE_2D, this.texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]))
        const image = new Image();
        image.src = this.path;
        const isPowerOf2 = value => (value & (value - 1)) === 0
        image.addEventListener('load', () => {
            console.log(this.path)
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
                gl.generateMipmap(gl.TEXTURE_2D);
            } else {
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            }
        })
    }
    bind() {
        this.gl.activeTexture(gl.TEXTURE0 + this.slot)
        gl.bindTexture(gl.TEXTURE_2D, this.texture)
    }
}
class Window {
    constructor(gl) {
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
        this.tex = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
        this.vao = new VertexArray(gl)
        this.vbo = new VertexBuffer(gl, new Float32Array(1600), gl.DYNAMIC_DRAW)
        this.layout = new Layout()
        this.layout.add(2, 0)
        this.layout.add(4, 2)
        this.layout.add(2, 6)
        this.layout.add(1, 8)
        this.vao.add_layout(this.vbo, this.layout)
        this.shader = new Shader(gl,
            "attribute vec4 aPos;\n\
                      attribute vec4 aColour;\n\
                      attribute vec2 aTexCord;\n\
                      attribute float aSlot;\n\
                      varying vec2 vTexCord;\n\
                      varying float vSlot;\n\
                      varying vec4 vColour;\n\
                      uniform mat4 mvp;\n\
                      void main() {\n\
                          gl_Position = mvp * aPos;\n\
                          vColour = aColour;\n\
                          vTexCord = aTexCord;\n\
                          vSlot = aSlot;\n\
                      }\n\
                      ",
            "precision mediump float;\n\
                        #define i1 1\n\
                        varying vec4 vColour;\n\
                        varying vec2 vTexCord;\n\
                        varying float vSlot;\n\
                        uniform sampler2D tex[16];\n\
                        void main() {\n\
                            int slot = int(vSlot);\
                            if (slot == 0) {\n\
                                gl_FragColor = vColour;\n\
                            }\n\
                            else {\n\
                                if (slot == 1)\n\
                                    gl_FragColor = texture2D(tex[1], vTexCord);\n\
                                if (slot == 2)\n\
                                    gl_FragColor = texture2D(tex[2], vTexCord);\n\
                                if (slot == 3)\n\
                                    gl_FragColor = texture2D(tex[3], vTexCord);\n\
                                if (slot == 4)\n\
                                    gl_FragColor = texture2D(tex[4], vTexCord);\n\
                                if (slot == 5)\n\
                                    gl_FragColor = texture2D(tex[5], vTexCord);\n\
                                if (slot == 6)\n\
                                    gl_FragColor = texture2D(tex[6], vTexCord);\n\
                                if (slot == 7)\n\
                                    gl_FragColor = texture2D(tex[7], vTexCord);\n\
                                if (slot == 8)\n\
                                    gl_FragColor = texture2D(tex[8], vTexCord);\n\
                                if (slot == 9)\n\
                                    gl_FragColor = texture2D(tex[9], vTexCord);\n\
                                if (slot == 10)\n\
                                    gl_FragColor = texture2D(tex[10], vTexCord);\n\
                                if (slot == 11)\n\
                                    gl_FragColor = texture2D(tex[11], vTexCord);\n\
                                if (slot == 12)\n\
                                    gl_FragColor = texture2D(tex[12], vTexCord);\n\
                                if (slot == 13)\n\
                                    gl_FragColor = texture2D(tex[13], vTexCord);\n\
                                if (slot == 14)\n\
                                    gl_FragColor = texture2D(tex[14], vTexCord);\n\
                                if (slot == 15)\n\
                                    gl_FragColor = texture2D(tex[15], vTexCord);\n\
                            }\n\
                        }"
        )
    }
    click(x, y) {
        console.log(`x = ${x}, y = ${y}`)
        render()
    }
    render(callback = () => {}) {
        this.shader.use()
        const mvp = glMatrix.mat4.create()
        glMatrix.mat4.ortho(mvp, 0, 600, 0, 400, -1, 1)
        this.shader.use()
        this.shader.setUniformMat4fv("mvp", mvp)
        this.shader.setUniform1iv("tex", this.tex)
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
// class Button {
//     constructor(x, y, w, h, colour, callback) {
//         this.x = x;
//         this.y = y;
//         this.w = w;
//         this.h = h;
//         this.colour = colour;
//         this.callback = callback;
//     }
//     add_offset(x, y) {
//         this.x += x
//         this.y += y
//     }
//     get vertices() {}
//     click(x, y) {
//         if (this.hover(x, y)) this.callback(this)
//     }
//     hover(x, y) {
//         return x >= this.x && x <= (this.x + this.w) && y >= this.y && y <= (this.y + this.h)
//     }
// }
// class ChessButton extends Button {
//     constructor(x, y, w, h, colour, callback, piece) {
//         super(x, y, w, h, colour, callback);
//         this.piece = piece
//     }
//
//     get vertices() {
//         return new Buffer(
//             [this.x, this.y,                        this.colour[0], this.colour[1], this.colour[2], 1.0],
//             [this.x + this.w, this.y,                this.colour[0], this.colour[1], this.colour[2], 1.0],
//             [this.x + this.w,  this.y + this.h,      this.colour[0], this.colour[1], this.colour[2], 1.0],
//             [this.x + this.w,  this.y + this.h,      this.colour[0], this.colour[1], this.colour[2], 1.0],
//             [this.x,  this.y + this.h,               this.colour[0], this.colour[1], this.colour[2], 1.0],
//             [this.x, this.y,                         this.colour[0], this.colour[1], this.colour[2], 1.0]
//         );
//     }
// }
// class Box {
//
// }

const x = 10, y = 10, w = 100, h = 100;

const buffer = new Buffer(
    [x, y,              1.0, 0.0, 0.0, 1.0,     0, 1,   1],
    [x + w, y,          0.0, 0.0, 1.0, 1.0,      1, 1,   1],
    [x + w,  y + h,     0.0, 1.0, 0.0, 1.0,      1, 0,   1],
    [x + w,  y + h,     0.0, 1.0, 0.0, 1.0,      1, 0,   1],
    [x,  y + h,         1.0, 1.0, 0.0, 1.0,      0, 0,   1],
    [x, y,              1.0, 0.0, 0.0, 1.0,      0, 1,   1],

    [x + w, y + h,              1.0, 0.0, 0.0, 1.0,     0, 1,   2],
    [x + w * 2, y + h,          0.0, 0.0, 1.0, 1.0,      1, 1,   2],
    [x + w * 2,  y + h * 2,     0.0, 1.0, 0.0, 1.0,      1, 0,   2],
    [x + w * 2,  y + h * 2,     0.0, 1.0, 0.0, 1.0,      1, 0,   2],
    [x + w,  y + h * 2,         1.0, 1.0, 0.0, 1.0,      0, 0,   2],
    [x + w, y + h,              1.0, 0.0, 0.0, 1.0,      0, 1,   2]
)

const canvas = document.getElementById("canvas")
const html = document.getElementById("html")
if (html.clientWidth <= 600) {
    canvas.width = html.clientWidth - 10
}
else canvas.width = 600
canvas.height = canvas.width * (2 / 3)
const gl = canvas.getContext('webgl2')
const win = new Window(gl)

canvas.addEventListener('click', event => {
    win.click(event.clientX - canvas.offsetLeft, canvas.height - (event.clientY - canvas.offsetTop))
})
window.addEventListener('resize', () => {
    if (html.clientWidth <= 600) {
        canvas.width = html.clientWidth - 10;
    }
    else canvas.width = 600
    canvas.height = canvas.width * ( 2 / 3 );
    render()
})
window.addEventListener('load', render)

const texture = new Texture(gl, 1, "resources/chess_com.png")
texture.bind()
const king = new Texture(gl, 2, "resources/textures/wk.png")
king.bind()

function render() {
    win.render(() => {
        gl.clearColor(0, 0, 0, 1)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(buffer.to_float_array()))
        gl.drawArrays(gl.TRIANGLES, 0, buffer.length)
    })
}

render()