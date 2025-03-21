// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

class Pointer {
	constructor() {
		this.id = -1;
		this.texcoordX = 0;
		this.texcoordY = 0;
		this.prevTexcoordX = 0;
		this.prevTexcoordY = 0;
		this.deltaX = 0;
		this.deltaY = 0;
		this.down = false;
		this.moved = false;
		this.color = [0, 0, 0];
	}
}

class WebGLContext {
	constructor(canvas) {
		this.canvas = canvas;
		this.gl = this.initializeWebGLContext();
		this.ext = this.getExtensions();
	}

	initializeWebGLContext() {
		const params = {
			alpha: true,
			depth: false,
			stencil: false,
			antialias: false,
			preserveDrawingBuffer: false,
		};

		let gl = this.canvas.getContext('webgl2', params);
		if (!gl) {
			gl = this.canvas.getContext('webgl', params) || this.canvas.getContext('experimental-webgl', params);
		}
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		return gl;
	}

	getExtensions() {
		const isWebGL2 = !!this.gl;
		let halfFloat;
		let supportLinearFiltering;

		if (isWebGL2) {
			this.gl.getExtension('EXT_color_buffer_float');
			supportLinearFiltering = this.gl.getExtension('OES_texture_float_linear');
		} else {
			halfFloat = this.gl.getExtension('OES_texture_half_float');
			supportLinearFiltering = this.gl.getExtension('OES_texture_half_float_linear');
		}

		const halfFloatTexType = isWebGL2 ? this.gl.HALF_FLOAT : halfFloat.HALF_FLOAT_OES;
		const formats = this.getSupportedFormats(halfFloatTexType, isWebGL2);

		return {
			...formats,
			halfFloatTexType,
			supportLinearFiltering,
		};
	}

	getSupportedFormats(halfFloatTexType, isWebGL2) {
		let formatRGBA, formatRG, formatR;

		if (isWebGL2) {
			formatRGBA = this.getSupportedFormat(this.gl.RGBA16F, this.gl.RGBA, halfFloatTexType);
			formatRG = this.getSupportedFormat(this.gl.RG16F, this.gl.RG, halfFloatTexType);
			formatR = this.getSupportedFormat(this.gl.R16F, this.gl.RED, halfFloatTexType);
		} else {
			formatRGBA = this.getSupportedFormat(this.gl.RGBA, this.gl.RGBA, halfFloatTexType);
			formatRG = this.getSupportedFormat(this.gl.RGBA, this.gl.RGBA, halfFloatTexType);
			formatR = this.getSupportedFormat(this.gl.RGBA, this.gl.RGBA, halfFloatTexType);
		}

		return { formatRGBA, formatRG, formatR };
	}

	getSupportedFormat(internalFormat, format, type) {
		if (!this.supportRenderTextureFormat(internalFormat, format, type)) {
			switch (internalFormat) {
				case this.gl.R16F:
					return this.getSupportedFormat(this.gl.RG16F, this.gl.RG, type);
				case this.gl.RG16F:
					return this.getSupportedFormat(this.gl.RGBA16F, this.gl.RGBA, type);
				default:
					return null;
			}
		}
		return { internalFormat, format };
	}

	supportRenderTextureFormat(internalFormat, format, type) {
		const texture = this.gl.createTexture();
		this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
		this.gl.texImage2D(this.gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);

		const fbo = this.gl.createFramebuffer();
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fbo);
		this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, texture, 0);

		const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
		return status === this.gl.FRAMEBUFFER_COMPLETE;
	}
}

class Shader {
	constructor(gl, vertexShaderSource, fragmentShaderSource) {
		this.gl = gl;
		this.vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
		this.fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
		this.program = this.createProgram(this.vertexShader, this.fragmentShader);
		this.uniforms = this.getUniforms();
	}

	compileShader(type, source) {
		const shader = this.gl.createShader(type);
		this.gl.shaderSource(shader, source);
		this.gl.compileShader(shader);

		if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
			console.trace(this.gl.getShaderInfoLog(shader));
		}

		return shader;
	}

	createProgram(vertexShader, fragmentShader) {
		const program = this.gl.createProgram();
		this.gl.attachShader(program, vertexShader);
		this.gl.attachShader(program, fragmentShader);
		this.gl.linkProgram(program);

		if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
			console.trace(this.gl.getProgramInfoLog(program));
		}

		return program;
	}

	getUniforms() {
		const uniforms = {};
		const uniformCount = this.gl.getProgramParameter(this.program, this.gl.ACTIVE_UNIFORMS);
		for (let i = 0; i < uniformCount; i++) {
			const uniformName = this.gl.getActiveUniform(this.program, i).name;
			uniforms[uniformName] = this.gl.getUniformLocation(this.program, uniformName);
		}

		return uniforms;
	}

	bind() {
		this.gl.useProgram(this.program);
	}
}

class Framebuffer {
	constructor(gl, width, height, internalFormat, format, type, param) {
		this.gl = gl;
		this.texture = gl.createTexture();
		this.width = width;
		this.height = height;
		this.texelSizeX = 1.0 / width;
		this.texelSizeY = 1.0 / height;
		this.fbo = this.createFramebuffer(internalFormat, format, type, param);
	}

	createFramebuffer(internalFormat, format, type, param) {
		const { gl } = this;
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, this.width, this.height, 0, format, type, null);

		const fbo = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
		gl.viewport(0, 0, this.width, this.height);
		gl.clear(gl.COLOR_BUFFER_BIT);

		return fbo;
	}

	attach(id) {
		this.gl.activeTexture(this.gl.TEXTURE0 + id);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
		return id;
	}
}

class DoubleFramebuffer {
	constructor(gl, width, height, internalFormat, format, type, param) {
		this.fbo1 = new Framebuffer(gl, width, height, internalFormat, format, type, param);
		this.fbo2 = new Framebuffer(gl, width, height, internalFormat, format, type, param);
		this.width = width;
		this.height = height;
		this.texelSizeX = this.fbo1.texelSizeX;
		this.texelSizeY = this.fbo1.texelSizeY;
	}

	get read() {
		return this.fbo1;
	}

	set read(value) {
		this.fbo1 = value;
	}

	get write() {
		return this.fbo2;
	}

	set write(value) {
		this.fbo2 = value;
	}

	swap() {
		const temp = this.fbo1;
		this.fbo1 = this.fbo2;
		this.fbo2 = temp;
	}
}

class FluidSimulation {
	constructor(canvas) {
		this.canvas = canvas;
		this.config = this.defaultConfig();
		this.pointers = [new Pointer()];
		this.webGLContext = new WebGLContext(canvas);
		this.gl = this.webGLContext.gl;
		this.ext = this.webGLContext.ext;
		this.initShaders();
		this.initFramebuffers();
		this.updateKeywords();
		this.lastUpdateTime = Date.now();
		this.colorUpdateTimer = 0.0;
		this.addEventListeners();
		this.update();
	}

	defaultConfig() {
		return {
			SIM_RESOLUTION: 128,
			DYE_RESOLUTION: 1440,
			CAPTURE_RESOLUTION: 512,
			DENSITY_DISSIPATION: 3.5,
			VELOCITY_DISSIPATION: 2,
			PRESSURE: 0.1,
			PRESSURE_ITERATIONS: 20,
			CURL: 3,
			SPLAT_RADIUS: 0.2,
			SPLAT_FORCE: 6000,
			SHADING: true,
			COLOR_UPDATE_SPEED: 10,
			PAUSED: false,
			BACK_COLOR: { r: 0.5, g: 0, b: 0 },
			TRANSPARENT: true,
		};
	}

	initShaders() {
		this.baseVertexShader = this.compileShader(this.gl.VERTEX_SHADER, `
	  precision highp float;
	  attribute vec2 aPosition;
	  varying vec2 vUv;
	  varying vec2 vL;
	  varying vec2 vR;
	  varying vec2 vT;
	  varying vec2 vB;
	  uniform vec2 texelSize;

	  void main() {
		vUv = aPosition * 0.5 + 0.5;
		vL = vUv - vec2(texelSize.x, 0.0);
		vR = vUv + vec2(texelSize.x, 0.0);
		vT = vUv + vec2(0.0, texelSize.y);
		vB = vUv - vec2(0.0, texelSize.y);
		gl_Position = vec4(aPosition, 0.0, 1.0);
	  }
	`);

		this.blurVertexShader = this.compileShader(this.gl.VERTEX_SHADER, `
	  precision highp float;
	  attribute vec2 aPosition;
	  varying vec2 vUv;
	  varying vec2 vL;
	  varying vec2 vR;
	  uniform vec2 texelSize;

	  void main () {
		vUv = aPosition * 0.5 + 0.5;
		float offset = 1.33333333;
		vL = vUv - texelSize * offset;
		vR = vUv + texelSize * offset;
		gl_Position = vec4(aPosition, 0.0, 1.0);
	  }
	`);

		this.blurShader = this.compileShader(this.gl.FRAGMENT_SHADER, `
	  precision mediump float;
	  precision mediump sampler2D;
	  varying vec2 vUv;
	  varying vec2 vL;
	  varying vec2 vR;
	  uniform sampler2D uTexture;

	  void main () {
		vec4 sum = texture2D(uTexture, vUv) * 0.29411764;
		sum += texture2D(uTexture, vL) * 0.35294117;
		sum += texture2D(uTexture, vR) * 0.35294117;
		gl_FragColor = sum;
	  }
	`);

		this.copyShader = this.compileShader(this.gl.FRAGMENT_SHADER, `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      uniform sampler2D uTexture;
      void main () {
        gl_FragColor = texture2D(uTexture, vUv);
      }
    `);

		this.clearShader = this.compileShader(this.gl.FRAGMENT_SHADER, `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      uniform sampler2D uTexture;
      uniform float value;
      void main () {
        gl_FragColor = value * texture2D(uTexture, vUv);
      }
    `);

		this.colorShader = this.compileShader(this.gl.FRAGMENT_SHADER, `
      precision mediump float;
      uniform vec4 color;
      void main () {
        gl_FragColor = color;
      }
    `);

		this.displayShaderSource = `
	  precision highp float;
	  precision highp sampler2D;
	  varying vec2 vUv;
	  uniform sampler2D uTexture;
	  uniform vec2 texelSize;

	  void main () {
		vec3 c = texture2D(uTexture, vUv).rgb;

		#ifdef SHADING
		  vec3 lColor = texture2D(uTexture, vUv - vec2(texelSize.x, 0)).rgb;
		  vec3 rColor = texture2D(uTexture, vUv + vec2(texelSize.x, 0)).rgb;
		  vec3 tColor = texture2D(uTexture, vUv + vec2(0, texelSize.y)).rgb;
		  vec3 bColor = texture2D(uTexture, vUv - vec2(0, texelSize.y)).rgb;

		  float dx = length(rColor) - length(lColor);
		  float dy = length(tColor) - length(bColor);
		  vec3 normal = normalize(vec3(dx, dy, length(texelSize)));
		  vec3 lightDir = vec3(0.0, 0.0, 1.0);
		  float diffuse = clamp(dot(normal, lightDir) + 0.7, 0.7, 1.0);
		  c *= diffuse;
		#endif

		float alpha = max(c.r, max(c.g, c.b));
		gl_FragColor = vec4(c, alpha);
	  }
	`;

		this.splatShader = this.compileShader(this.gl.FRAGMENT_SHADER, `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      uniform sampler2D uTarget;
      uniform float aspectRatio;
      uniform vec3 color;
      uniform vec2 point;
      uniform float radius;
      void main () {
        vec2 p = vUv - point.xy;
        p.x *= aspectRatio;
        vec3 splat = exp(-dot(p, p) / radius) * color;
        vec3 base = texture2D(uTarget, vUv).xyz;
        gl_FragColor = vec4(base + splat, 1.0);
      }
    `);

		this.advectionShader = this.compileShader(this.gl.FRAGMENT_SHADER, `
	  precision highp float;
	  precision highp sampler2D;
	  varying vec2 vUv;
	  uniform sampler2D uVelocity;
	  uniform sampler2D uSource;
	  uniform vec2 texelSize;
	  uniform float dt;
	  uniform float dissipation;

	  vec4 bilerp (sampler2D tex, vec2 uv) {
		vec2 st = uv / texelSize - 0.5;
		vec2 iuv = floor(st);
		vec2 fuv = fract(st);
		vec4 a = texture2D(tex, (iuv + vec2(0.5, 0.5)) * texelSize);
		vec4 b = texture2D(tex, (iuv + vec2(1.5, 0.5)) * texelSize);
		vec4 c = texture2D(tex, (iuv + vec2(0.5, 1.5)) * texelSize);
		vec4 d = texture2D(tex, (iuv + vec2(1.5, 1.5)) * texelSize);
		return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
	  }

	  void main () {
		vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
		vec4 result = bilerp(uSource, coord);
		gl_FragColor = result / (1.0 + dissipation * dt);
	  }
	`);

		this.divergenceShader = this.compileShader(this.gl.FRAGMENT_SHADER, `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uVelocity;
      void main () {
        float L = texture2D(uVelocity, vL).x;
        float R = texture2D(uVelocity, vR).x;
        float T = texture2D(uVelocity, vT).y;
        float B = texture2D(uVelocity, vB).y;
        vec2 C = texture2D(uVelocity, vUv).xy;
        if (vL.x < 0.0) { L = -C.x; }
        if (vR.x > 1.0) { R = -C.x; }
        if (vT.y > 1.0) { T = -C.y; }
        if (vB.y < 0.0) { B = -C.y; }
        float div = 0.5 * (R - L + T - B);
        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
      }
    `);

		this.curlShader = this.compileShader(this.gl.FRAGMENT_SHADER, `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uVelocity;
      void main () {
        float L = texture2D(uVelocity, vL).y;
        float R = texture2D(uVelocity, vR).y;
        float T = texture2D(uVelocity, vT).x;
        float B = texture2D(uVelocity, vB).x;
        float vorticity = R - L - T + B;
        gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
      }
    `);

		this.vorticityShader = this.compileShader(this.gl.FRAGMENT_SHADER, `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uVelocity;
      uniform sampler2D uCurl;
      uniform float curl;
      uniform float dt;
      void main () {
        float L = texture2D(uCurl, vL).x;
        float R = texture2D(uCurl, vR).x;
        float T = texture2D(uCurl, vT).x;
        float B = texture2D(uCurl, vB).x;
        float C = texture2D(uCurl, vUv).x;
        vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
        force /= length(force) + 0.0001;
        force *= curl * C;
        force.y *= -1.0;
        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity += force * dt;
        velocity = min(max(velocity, -1000.0), 1000.0);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
      }
    `);

		this.pressureShader = this.compileShader(this.gl.FRAGMENT_SHADER, `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uPressure;
      uniform sampler2D uDivergence;
      void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        float C = texture2D(uPressure, vUv).x;
        float divergence = texture2D(uDivergence, vUv).x;
        float pressure = (L + R + B + T - divergence) * 0.25;
        gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
      }
    `);

		this.gradientSubtractShader = this.compileShader(this.gl.FRAGMENT_SHADER, `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uPressure;
      uniform sampler2D uVelocity;
      void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity.xy -= vec2(R - L, T - B);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
      }
    `);

		this.curlProgram = new Shader(this.gl, this.baseVertexShader, this.curlShader);
		this.vorticityProgram = new Shader(this.gl, this.baseVertexShader, this.vorticityShader);
		this.divergenceProgram = new Shader(this.gl, this.baseVertexShader, this.divergenceShader);
		this.clearProgram = new Shader(this.gl, this.baseVertexShader, this.clearShader);
		this.displayProgram = new Shader(this.gl, this.baseVertexShader, this.displayShaderSource);
		this.displayMaterial = new Shader(this.gl, this.baseVertexShader, this.displayShaderSource);
		this.splatProgram = new Shader(this.gl, this.baseVertexShader, this.splatShader);
		this.advectionProgram = new Shader(this.gl, this.baseVertexShader, this.advectionShader);
		this.pressureProgram = new Shader(this.gl, this.baseVertexShader, this.pressureShader);
		this.gradientSubtractProgram = new Shader(this.gl, this.baseVertexShader, this.gradientSubtractShader);
	}

	compileShader(type, source) {
		const shader = this.gl.createShader(type);
		this.gl.shaderSource(shader, source);
		this.gl.compileShader(shader);

		if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
			console.trace(this.gl.getShaderInfoLog(shader));
		}
		return shader;
	}

	initFramebuffers() {
		const simRes = this.getResolution(this.config.SIM_RESOLUTION);
		const dyeRes = this.getResolution(this.config.DYE_RESOLUTION);

		const texType = this.ext.halfFloatTexType;
		const rgba = this.ext.formatRGBA;
		const rg = this.ext.formatRG;
		const r = this.ext.formatR;
		const filtering = this.ext.supportLinearFiltering ? this.gl.LINEAR : this.gl.NEAREST;

		this.gl.disable(this.gl.BLEND);

		this.dye = new DoubleFramebuffer(this.gl, dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
		this.velocity = new DoubleFramebuffer(this.gl, simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);

		this.divergence = new Framebuffer(this.gl, simRes.width, simRes.height, r.internalFormat, r.format, texType, this.gl.NEAREST);
		this.curl = new Framebuffer(this.gl, simRes.width, simRes.height, r.internalFormat, r.format, texType, this.gl.NEAREST);
		this.pressure = new DoubleFramebuffer(this.gl, simRes.width, simRes.height, r.internalFormat, r.format, texType, this.gl.NEAREST);
	}

	updateKeywords() {
		const displayKeywords = [];
		if (this.config.SHADING) displayKeywords.push('SHADING');
	}

	addEventListeners() {
		window.addEventListener('mousedown', this.handleMouseDown.bind(this));
		window.addEventListener('mousemove', this.handleMouseMove.bind(this));
		window.addEventListener('touchstart', this.handleTouchStart.bind(this));
		window.addEventListener('touchmove', this.handleTouchMove.bind(this));
		window.addEventListener('touchend', this.handleTouchEnd.bind(this));
	}

	handleMouseDown(e) {
		const pointer = this.pointers[0];
		const posX = this.scaleByPixelRatio(e.clientX);
		const posY = this.scaleByPixelRatio(e.clientY);
		this.updatePointerDownData(pointer, -1, posX, posY);
		this.clickSplat(pointer);
	}

	handleMouseMove(e) {
		const pointer = this.pointers[0];
		const posX = this.scaleByPixelRatio(e.clientX);
		const posY = this.scaleByPixelRatio(e.clientY);
		this.updatePointerMoveData(pointer, posX, posY, pointer.color);
	}

	handleTouchStart(e) {
		const touches = e.targetTouches;
		const pointer = this.pointers[0];
		for (let i = 0; i < touches.length; i++) {
			const posX = this.scaleByPixelRatio(touches[i].clientX);
			const posY = this.scaleByPixelRatio(touches[i].clientY);
			this.updatePointerDownData(pointer, touches[i].identifier, posX, posY);
		}
	}

	handleTouchMove(e) {
		const touches = e.targetTouches;
		const pointer = this.pointers[0];
		for (let i = 0; i < touches.length; i++) {
			const posX = this.scaleByPixelRatio(touches[i].clientX);
			const posY = this.scaleByPixelRatio(touches[i].clientY);
			this.updatePointerMoveData(pointer, posX, posY, pointer.color);
		}
	}

	handleTouchEnd(e) {
		const touches = e.changedTouches;
		const pointer = this.pointers[0];
		for (let i = 0; i < touches.length; i++) {
			this.updatePointerUpData(pointer);
		}
	}

	updatePointerDownData(pointer, id, posX, posY) {
		pointer.id = id;
		pointer.down = true;
		pointer.moved = false;
		pointer.texcoordX = posX / this.canvas.width;
		pointer.texcoordY = 1.0 - posY / this.canvas.height;
		pointer.prevTexcoordX = pointer.texcoordX;
		pointer.prevTexcoordY = pointer.texcoordY;
		pointer.deltaX = 0;
		pointer.deltaY = 0;
		pointer.color = this.generateColor();
	}

	updatePointerMoveData(pointer, posX, posY, color) {
		pointer.prevTexcoordX = pointer.texcoordX;
		pointer.prevTexcoordY = pointer.texcoordY;
		pointer.texcoordX = posX / this.canvas.width;
		pointer.texcoordY = 1.0 - posY / this.canvas.height;
		pointer.deltaX = this.correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
		pointer.deltaY = this.correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
		pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
		pointer.color = color;
	}

	updatePointerUpData(pointer) {
		pointer.down = false;
	}

	correctDeltaX(delta) {
		const aspectRatio = this.canvas.width / this.canvas.height;
		if (aspectRatio < 1) delta *= aspectRatio;
		return delta;
	}

	correctDeltaY(delta) {
		const aspectRatio = this.canvas.width / this.canvas.height;
		if (aspectRatio > 1) delta /= aspectRatio;
		return delta;
	}

	generateColor() {
		const c = this.HSVtoRGB(Math.random(), 1.0, 1.0);
		c.r *= 0.15;
		c.g *= 0.15;
		c.b *= 0.15;
		return c;
	}

	HSVtoRGB(h, s, v) {
		const i = Math.floor(h * 6);
		const f = h * 6 - i;
		const p = v * (1 - s);
		const q = v * (1 - f * s);
		const t = v * (1 - (1 - f) * s);

		let r, g, b;

		switch (i % 6) {
			case 0:
				r = v;
				g = t;
				b = p;
				break;
			case 1:
				r = q;
				g = v;
				b = p;
				break;
			case 2:
				r = p;
				g = v;
				b = t;
				break;
			case 3:
				r = p;
				g = q;
				b = v;
				break;
			case 4:
				r = t;
				g = p;
				b = v;
				break;
			case 5:
				r = v;
				g = p;
				b = q;
				break;
		}

		return { r, g, b };
	}

	scaleByPixelRatio(input) {
		const pixelRatio = window.devicePixelRatio || 1;
		return Math.floor(input * pixelRatio);
	}

	getResolution(resolution) {
		let aspectRatio = this.gl.drawingBufferWidth / this.gl.drawingBufferHeight;
		if (aspectRatio < 1) aspectRatio = 1.0 / aspectRatio;

		const min = Math.round(resolution);
		const max = Math.round(resolution * aspectRatio);

		if (this.gl.drawingBufferWidth > this.gl.drawingBufferHeight) {
			return { width: max, height: min };
		}

		return { width: min, height: max };
	}

	update() {
		const dt = this.calcDeltaTime();
		if (this.resizeCanvas()) this.initFramebuffers();
		this.updateColors(dt);
		this.applyInputs();
		this.step(dt);
		this.render(null);
		requestAnimationFrame(this.update.bind(this));
	}

	calcDeltaTime() {
		const now = Date.now();
		let dt = (now - this.lastUpdateTime) / 1000;
		dt = Math.min(dt, 0.016666);
		this.lastUpdateTime = now;
		return dt;
	}

	resizeCanvas() {
		const width = this.scaleByPixelRatio(this.canvas.clientWidth);
		const height = this.scaleByPixelRatio(this.canvas.clientHeight);
		if (this.canvas.width !== width || this.canvas.height !== height) {
			this.canvas.width = width;
			this.canvas.height = height;
			return true;
		}
		return false;
	}

	updateColors(dt) {
		this.colorUpdateTimer += dt * this.config.COLOR_UPDATE_SPEED;
		if (this.colorUpdateTimer >= 1) {
			this.colorUpdateTimer = this.wrap(this.colorUpdateTimer, 0, 1);
			this.pointers.forEach((p) => {
				p.color = this.generateColor();
			});
		}
	}

	applyInputs() {
		this.pointers.forEach((p) => {
			if (p.moved) {
				p.moved = false;
				this.splatPointer(p);
			}
		});
	}

	step(dt) {
		const { gl } = this;

		gl.disable(gl.BLEND);

		this.curlProgram.bind();
		gl.uniform2f(this.curlProgram.uniforms.texelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
		gl.uniform1i(this.curlProgram.uniforms.uVelocity, this.velocity.read.attach(0));
		this.blit(this.curl);

		this.vorticityProgram.bind();
		gl.uniform2f(this.vorticityProgram.uniforms.texelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
		gl.uniform1i(this.vorticityProgram.uniforms.uVelocity, this.velocity.read.attach(0));
		gl.uniform1i(this.vorticityProgram.uniforms.uCurl, this.curl.attach(1));
		gl.uniform1f(this.vorticityProgram.uniforms.curl, this.config.CURL);
		gl.uniform1f(this.vorticityProgram.uniforms.dt, dt);
		this.blit(this.velocity.write);
		this.velocity.swap();

		this.divergenceProgram.bind();
		gl.uniform2f(this.divergenceProgram.uniforms.texelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
		gl.uniform1i(this.divergenceProgram.uniforms.uVelocity, this.velocity.read.attach(0));
		this.blit(this.divergence);

		this.clearProgram.bind();
		gl.uniform1i(this.clearProgram.uniforms.uTexture, this.pressure.read.attach(0));
		gl.uniform1f(this.clearProgram.uniforms.value, this.config.PRESSURE);
		this.blit(this.pressure.write);
		this.pressure.swap();

		this.pressureProgram.bind();
		gl.uniform2f(this.pressureProgram.uniforms.texelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
		gl.uniform1i(this.pressureProgram.uniforms.uDivergence, this.divergence.attach(0));
		for (let i = 0; i < this.config.PRESSURE_ITERATIONS; i++) {
			gl.uniform1i(this.pressureProgram.uniforms.uPressure, this.pressure.read.attach(1));
			this.blit(this.pressure.write);
			this.pressure.swap();
		}

		this.gradientSubtractProgram.bind();
		gl.uniform2f(this.gradientSubtractProgram.uniforms.texelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
		gl.uniform1i(this.gradientSubtractProgram.uniforms.uPressure, this.pressure.read.attach(0));
		gl.uniform1i(this.gradientSubtractProgram.uniforms.uVelocity, this.velocity.read.attach(1));
		this.blit(this.velocity.write);
		this.velocity.swap();

		this.advectionProgram.bind();
		gl.uniform2f(this.advectionProgram.uniforms.texelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
		if (!this.ext.supportLinearFiltering) {
			gl.uniform2f(this.advectionProgram.uniforms.dyeTexelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
		}
		const velocityId = this.velocity.read.attach(0);
		gl.uniform1i(this.advectionProgram.uniforms.uVelocity, velocityId);
		gl.uniform1i(this.advectionProgram.uniforms.uSource, velocityId);
		gl.uniform1f(this.advectionProgram.uniforms.dt, dt);
		gl.uniform1f(this.advectionProgram.uniforms.dissipation, this.config.VELOCITY_DISSIPATION);
		this.blit(this.velocity.write);
		this.velocity.swap();

		if (!this.ext.supportLinearFiltering) {
			gl.uniform2f(this.advectionProgram.uniforms.dyeTexelSize, this.dye.texelSizeX, this.dye.texelSizeY);
		}
		gl.uniform1i(this.advectionProgram.uniforms.uVelocity, this.velocity.read.attach(0));
		gl.uniform1i(this.advectionProgram.uniforms.uSource, this.dye.read.attach(1));
		gl.uniform1f(this.advectionProgram.uniforms.dissipation, this.config.DENSITY_DISSIPATION);
		this.blit(this.dye.write);
		this.dye.swap();
	}

	render(target) {
		this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
		this.gl.enable(this.gl.BLEND);
		this.drawDisplay(target);
	}

	drawDisplay(target) {
		const width = target == null ? this.gl.drawingBufferWidth : target.width;
		const height = target == null ? this.gl.drawingBufferHeight : target.height;

		this.displayMaterial.bind();
		if (this.config.SHADING) {
			this.gl.uniform2f(this.displayMaterial.uniforms.texelSize, 1.0 / width, 1.0 / height);
		}
		this.gl.uniform1i(this.displayMaterial.uniforms.uTexture, this.dye.read.attach(0));
		this.blit(target);
	}

	splatPointer(pointer) {
		const dx = pointer.deltaX * this.config.SPLAT_FORCE;
		const dy = pointer.deltaY * this.config.SPLAT_FORCE;
		this.splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color);
	}

	clickSplat(pointer) {
		const color = this.generateColor();
		color.r *= 10.0;
		color.g *= 10.0;
		color.b *= 10.0;
		const dx = 10 * (Math.random() - 0.5);
		const dy = 30 * (Math.random() - 0.5);
		this.splat(pointer.texcoordX, pointer.texcoordY, dx, dy, color);
	}

	splat(x, y, dx, dy, color) {
		this.splatProgram.bind();
		this.gl.uniform1i(this.splatProgram.uniforms.uTarget, this.velocity.read.attach(0));
		this.gl.uniform1f(this.splatProgram.uniforms.aspectRatio, this.canvas.width / this.canvas.height);
		this.gl.uniform2f(this.splatProgram.uniforms.point, x, y);
		this.gl.uniform3f(this.splatProgram.uniforms.color, dx, dy, 0.0);
		this.gl.uniform1f(this.splatProgram.uniforms.radius, this.correctRadius(this.config.SPLAT_RADIUS / 100.0));
		this.blit(this.velocity.write);
		this.velocity.swap();

		this.gl.uniform1i(this.splatProgram.uniforms.uTarget, this.dye.read.attach(0));
		this.gl.uniform3f(this.splatProgram.uniforms.color, color.r, color.g, color.b);
		this.blit(this.dye.write);
		this.dye.swap();
	}

	correctRadius(radius) {
		const aspectRatio = this.canvas.width / this.canvas.height;
		if (aspectRatio > 1) radius *= aspectRatio;
		return radius;
	}

	blit(target, clear = false) {
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.gl.createBuffer());
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), this.gl.STATIC_DRAW);
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.gl.createBuffer());
		this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), this.gl.STATIC_DRAW);
		this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, 0, 0);
		this.gl.enableVertexAttribArray(0);

		if (target == null) {
			this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
			this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
		} else {
			this.gl.viewport(0, 0, target.width, target.height);
			this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, target.fbo);
		}
		if (clear) {
			this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
			this.gl.clear(this.gl.COLOR_BUFFER_BIT);
		}
		this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
	}

	wrap(value, min, max) {
		const range = max - min;
		if (range === 0) return min;
		return ((value - min) % range) + min;
	}
}

const useFluidCursor = () => {
	const canvas = document.getElementById('fluid');
	if (!canvas) {
		console.error('Canvas element not found!');
		return;
	}

	const simulation = new FluidSimulation(canvas);

	if (!simulation.gl) {
		console.error('Failed to initialize WebGL');
	}
};

export default useFluidCursor;
