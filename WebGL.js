// noinspection DuplicatedCode

class VertexBuffer {
    constructor(gl, buffer, usage) {
        this.gl = gl
        this.vbo = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(buffer), usage)
    }
    bind() {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vbo)
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

    setUniform1i(name, int) {
        this.use()
        this.gl.uniform1i(this.gl.getUniformLocation(this.program, name), int)
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
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
            if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
                this.gl.generateMipmap(this.gl.TEXTURE_2D);
            } else {
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            }
        })
    }
    bind() {
        this.gl.activeTexture(this.gl.TEXTURE0 + this.slot)
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture)
    }
}
class Window {
    static textures = {}
    static pieces_map = {
        "r": "br",
        "n": "bn",
        "b": "bb",
        "q": "bq",
        "k": "bk",
        "R": "wr",
        "N": "wn",
        "B": "wb",
        "Q": "wq",
        "K": "wk",
        "p": "bp",
        "P": "wp",
        "d": "dot",
        "t": "target"
    }
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
            `#version 300 es
                      layout (location = 0) in vec4 aPos;
                      layout (location = 1) in vec4 aColour;
                      layout (location = 2) in vec2 aTexCord;
                      layout (location = 3) in float aSlot;
                      out vec2 vTexCord;
                      out float vSlot;
                      out vec4 vColour;
                      uniform mat4 mvp;
                      void main() {
                          gl_Position = mvp * aPos;
                          vColour = aColour;
                          vTexCord = aTexCord;
                          vSlot = aSlot;
                      }
                      `,
            `#version 300 es
                        precision mediump float;
                        in vec4 vColour;
                        in vec2 vTexCord;
                        in float vSlot;
                        out vec4 colour;
                        uniform sampler2D tex[16];
                        void main() {
                            int slot = int(vSlot);
                            switch (slot) {
                                case 0:
                                    colour = vColour;
                                    break;
                                case 1:
                                    colour = texture(tex[1], vTexCord);
                                    break;
                                case 2:
                                    colour = texture(tex[2], vTexCord);
                                    break;
                                case 3:
                                    colour = texture(tex[3], vTexCord);
                                    break;
                                case 4:
                                    colour = texture(tex[4], vTexCord);
                                    break;
                                case 5:
                                    colour = texture(tex[5], vTexCord);
                                    break;
                                case 6:
                                    colour = texture(tex[6], vTexCord);
                                    break;
                                case 7:
                                    colour = texture(tex[7], vTexCord);
                                    break;
                                case 8:
                                    colour = texture(tex[8], vTexCord);
                                    break;
                                case 9:
                                    colour = texture(tex[9], vTexCord);
                                    break;
                                case 10:
                                    colour = texture(tex[10], vTexCord);
                                    break;
                                case 11:
                                    colour = texture(tex[11], vTexCord);
                                    break;
                                case 12:
                                    colour = texture(tex[12], vTexCord);
                                    break;
                                case 13:
                                    colour = texture(tex[13], vTexCord);
                                    break;
                                case 14:
                                    colour = texture(tex[14], vTexCord);
                                    break;
                                case 15:
                                    colour = texture(tex[15], vTexCord);
                                    break;
                            }
                        }`
        )
        this.fontShader = new Shader(gl,
            `#version 300 es
                      layout (location = 0) in vec4 aPos;
                      layout (location = 2) in vec2 aTexCord;
                      out vec2 vTexCord;
                      uniform mat4 mvp;
                      void main() {
                          gl_Position = mvp * aPos;
                          vTexCord = aTexCord;
                      }`,
            `#version 300 es
                        precision mediump float;
                        in vec2 vTexCord;
                        out vec4 colour;
                        uniform sampler2D tex;
                        void main() {
                            colour = texture(tex, vTexCord);
                        }`
        )
    }
    click(x, y) {
        console.log(`x = ${x}, y = ${y}`)
        this.render()
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
    static load_texture(gl, slot, ...paths) {
        paths.forEach(path => {
            this.textures[path] = new Texture(gl, slot, `resources/textures/${path}.png`)
        })
    }
}
class Buffer {
    constructor(...vertices) {
        this.vertices = vertices
    }
    get length() { return this.vertices.length }
    to_array() {
        let arr = []
        this.vertices.forEach(value => arr = arr.concat(value))
        return arr
    }
    to_float_array() {
        return new Float32Array(this.to_array())
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
//     render() {}
// }
// class ChessButton extends Button {
//     constructor(x, y, w, h, colour, callback, piece) {
//         super(x, y, w, h, colour, callback);
//         this.piece = piece
//         this.colour_cpy = colour
//         this.is_target = false
//         this.index = this.y / 50 * 8 + this.x / 50
//         this.targets = []
//     }
//
//     get vertices() {
//         let target_slot = 0
//         if (this.is_target) {
//             const texture = Window.textures["target"]
//             texture.bind()
//             target_slot = texture.slot
//         }
//         let piece_slot = 0
//         if (this.piece !== '\0') {
//             const texture = Window.textures[Window.pieces_map[this.piece]]
//             texture.bind()
//             piece_slot = texture.slot
//         }
//         return new Buffer(
//             [this.x, this.y,                            this.colour[0], this.colour[1], this.colour[2], 1,    0, 0,    0],
//             [(this.x + this.width), this.y,                     this.colour[0], this.colour[1], this.colour[2], 1.0,    0, 0,    0],
//             [(this.x + this.width), (this.y + this.height),     this.colour[0], this.colour[1], this.colour[2], 1.0,    0, 0,    0],
//             [(this.x + this.width), (this.y + this.height),     this.colour[0], this.colour[1], this.colour[2], 1.0,    0, 0,    0],
//             [this.x, (this.y + this.height),                    this.colour[0], this.colour[1], this.colour[2], 1.0,    0, 0,    0],
//             [this.x, this.y,                                    this.colour[0], this.colour[1], this.colour[2], 1.0,    0, 0,    0],
//
//             [this.x, this.y,                                    0, 0, 0, 0,       0, 1,   target_slot],
//             [(this.x + this.width), this.y,                     0, 0, 0, 0,       1, 1,   target_slot],
//             [(this.x + this.width), (this.y + this.height),     0, 0, 0, 0,       1, 0,   target_slot],
//             [(this.x + this.width), (this.y + this.height),     0, 0, 0, 0,       1, 0,   target_slot],
//             [this.x, (this.y + this.height),                    0, 0, 0, 0,       0, 0,   target_slot],
//             [this.x, this.y,                                    0, 0, 0, 0,       0, 1,   target_slot],
//
//             [this.x, this.y,                                    0, 0, 0, 0,       0, 1,   piece_slot],
//             [(this.x + this.width), this.y,                     0, 0, 0, 0,       1, 1,   piece_slot],
//             [(this.x + this.width), (this.y + this.height),     0, 0, 0, 0,       1, 0,   piece_slot],
//             [(this.x + this.width), (this.y + this.height),     0, 0, 0, 0,       1, 0,   piece_slot],
//             [this.x, (this.y + this.height),                    0, 0, 0, 0,       0, 0,   piece_slot],
//             [this.x, this.y,                                    0, 0, 0, 0,       0, 1,   piece_slot]
//         );
//     }
//     has_target(button) {
//         return this.targets.includes(button)
//     }
//     add_target(button) {
//         button.is_target = true
//         this.targets = this.targets.concat(button)
//     }
//     clear_targets() {
//         this.targets.forEach(target => target.is_target = false)
//         this.targets = []
//     }
// }
// class Box {
//     constructor(gl, x, y, is_active) {
//         this.gl = gl
//         this.x = x
//         this.y = y
//         this.is_active = is_active
//         this.buttons = []
//         this.previous_button = null
//     }
//     add_button(button) {
//         button.add_offset(this.x, this.y)
//         this.buttons = this.buttons.concat(button)
//     }
//     render() {
//         if (this.buttons.length !== 0) {
//             let buffer = []
//             let len = 0
//             this.buttons.forEach(button => {
//                 const vertices = button.vertices
//                 buffer = buffer.concat(vertices.to_array())
//                 len += vertices.length
//             })
//             this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, new Float32Array(buffer))
//             this.gl.drawArrays(this.gl.TRIANGLES, 0, len)
//             this.buttons.forEach(button => button.render())
//         }
//     }
//     click(x, y) {
//         this.buttons.forEach(button => button.click(x, y))
//     }
//     hover(x, y) {
//         this.buttons.forEach(button => button.hover(x, y))
//     }
// }

const x = 10, y = 10, w = 50, h = 50;

const buffer = new Buffer(
    [x, y,              1, 0, 0, 1,     0, 0,   0],
    [x + w, y,          1, 0, 0, 1,      0, 0,   0],
    [x + w,  y + h,     1, 0, 0, 1,      0, 0,   0],
    [x + w,  y + h,     1, 0, 0, 1,      0, 0,   0],
    [x,  y + h,         1, 0, 0, 1,      0, 0,   0],
    [x, y,              1, 0, 0, 1,      0, 0,   0],

    [x, y,              0, 0, 0, 0,      0, 1,   1],
    [x + w, y,          0, 0, 0, 0,      1, 1,   1],
    [x + w,  y + h,     0, 0, 0, 0,      1, 0,   1],
    [x + w,  y + h,     0, 0, 0, 0,      1, 0,   1],
    [x,  y + h,         0, 0, 0, 0,      0, 0,   1],
    [x, y,              0, 0, 0, 0,      0, 1,   1],

    [x + w, y,              1, 1, 0, 1,      0, 0,   0],
    [x + w * 2, y,          1, 1, 0, 1,      0, 0,   0],
    [x + w * 2,  y + h,     1, 1, 0, 1,      0, 0,   0],
    [x + w * 2,  y + h,     1, 1, 0, 1,      0, 0,   0],
    [x + w,  y + h,         1, 1, 0, 1,      0, 0,   0],
    [x + w, y,              1, 1, 0, 1,      0, 0,   0],

    [x + w, y,              0, 0, 0, 0,      0, 1,   2],
    [x + w * 2, y,          0, 0, 0, 0,      1, 1,   2],
    [x + w * 2,  y + h,     0, 0, 0, 0,      1, 0,   2],
    [x + w * 2,  y + h,     0, 0, 0, 0,      1, 0,   2],
    [x + w,  y + h,         0, 0, 0, 0,      0, 0,   2],
    [x + w, y,              0, 0, 0, 0,      0, 1,   2]
)
function main() {
    const ctx = document.getElementById("text").getContext('2d')
    const canvas = document.getElementById("canvas")
    const html = document.getElementById("html")
    if (html.clientWidth <= 600) {
        canvas.width = html.clientWidth - 10
    }
    else canvas.width = 600
    canvas.height = canvas.width * (2 / 3)
    ctx.canvas.width = canvas.width
    ctx.canvas.height = canvas.height
    const gl = canvas.getContext('webgl2')

    const win = new Window(gl)
    window.addEventListener('click', event => {
        win.click(event.clientX - canvas.offsetLeft, canvas.height - (event.clientY - canvas.offsetTop))
    })

    const renderCallback = () => {
        ctx.save()
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
        ctx.fillStyle = "white"
        ctx.font = '20px Courier New, monospace'
        ctx.fillText("Srinjoy Sinha", 10, canvas.height - 70)
        ctx.restore()
        gl.clearColor(0, 0, 0, 1)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, buffer.to_float_array())
        gl.drawArrays(gl.TRIANGLES, 0, buffer.length)
    }

    window.addEventListener('resize', () => {
        if (html.clientWidth <= 600) {
            canvas.width = html.clientWidth - 10;
        }
        else canvas.width = 600
        canvas.height = canvas.width * ( 2 / 3 );
        renderCallback()
    })
    window.addEventListener('load', renderCallback)
    Window.load_texture(gl, 2, "bp")
    Window.load_texture(gl, 1, "wp")
    win.render(renderCallback)
}

main()