// JavaScript Document
// qimozuoye.js 
// 顶点着色器
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'attribute vec4 a_Normal;\n' +
  //视图设置
  'uniform mat4 u_ModelMatrix;'+
  'uniform mat4 u_ViewMatrix;'+
  'uniform mat4 u_PerMatrix;'+
  'uniform mat4 u_NormalMatrix;\n' +
  //光照设置
  'uniform vec3 u_LightColor;\n' +
  'uniform vec3 u_LightDirection;\n' +
  'uniform vec3 u_AmbientLight;\n' +
  //雾化设置
  'uniform vec4 u_Eye;\n' +
  'varying float v_Dist;\n' +
  //纹理设置
  'attribute vec2 a_TexCoord;\n' +
  'varying vec2 v_TexCoord;\n' +
   
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_Position = u_PerMatrix * u_ViewMatrix *u_ModelMatrix * a_Position;\n' +
  '  vec4 normal = u_NormalMatrix * a_Normal;\n' +
  '  float nDotL = max(dot(u_LightDirection, normalize(normal.xyz)), 0.0);\n' +
  '  vec3 diffuse = u_LightColor * a_Color.rgb *nDotL;\n' +
  '  vec3 ambient = u_AmbientLight * a_Color.rgb;\n' +
  '  v_Color = vec4(diffuse+ambient, a_Color.a);\n' + 
  '  v_Dist = distance(u_PerMatrix*u_ViewMatrix*u_ModelMatrix * a_Position, u_Eye);\n' +
  '  v_TexCoord = a_TexCoord;\n' +
  '}\n';

// 片元着色器
var FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  //雾化设置
  'uniform vec3 u_FogColor;\n' +
  'uniform vec2 u_FogDist;\n' +
  'varying float v_Dist;\n' +
  //纹理取样
  'uniform sampler2D u_Sampler;\n' +
  'varying vec2 v_TexCoord;\n' +
  
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  float fogFactor = clamp((u_FogDist.y - v_Dist) / (u_FogDist.y - u_FogDist.x), 0.0, 1.0);\n' +
  '  vec3 color = mix(u_FogColor, vec3(v_Color), fogFactor);\n' +
  '  gl_FragColor = vec4(color, v_Color.a) * texture2D(u_Sampler, v_TexCoord);\n' +
  '}\n';
function main() {
  // 获取画布
  var canvas = document.getElementById('webgl');

  // 获取WEBGL上下文
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // 初始化着色器
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // 设置点坐标 
  var n = initVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }
  
  // 开启深度缓存测试
  gl.enable(gl.DEPTH_TEST);

  // 获取uniform变量的存储位置
  var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  var u_PerMatrix = gl.getUniformLocation(gl.program, 'u_PerMatrix');
  var u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  var u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  var u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
  var u_LightDirection = gl.getUniformLocation(gl.program, 'u_LightDirection');
  var u_AmbientLight = gl.getUniformLocation(gl.program, 'u_AmbientLight');
  if (!u_ModelMatrix || !u_NormalMatrix || !u_LightColor || !u_LightDirection || !u_AmbientLight) { 
    console.log('Failed to get the storage location');
    return;
  }
  
  // 雾的颜色
  var fogColor = new Float32Array([0.137, 0.231, 0.423]);
  // 雾的起始终止距离
  var fogDist = new Float32Array([55, 80]);
  // 视点的位置（并不是相机的位置）
  var eye = new Float32Array([25, 65, 35, 1.0]);
  
  // 得到雾化相关变量的位置
  var u_Eye = gl.getUniformLocation(gl.program, 'u_Eye');
  var u_FogColor = gl.getUniformLocation(gl.program, 'u_FogColor');
  var u_FogDist = gl.getUniformLocation(gl.program, 'u_FogDist');
  if (!u_Eye || !u_FogColor || !u_FogDist) {
    console.log('Failed to get the storage location');
    return;
  }
  
  gl.uniform3fv(u_FogColor, fogColor); // Colors
  gl.uniform2fv(u_FogDist, fogDist);   // Starting point and end point
  gl.uniform4fv(u_Eye, eye);           // Eye point

  var perMatrix = new Matrix4();   // 设置视图视点矩阵
  var viewMatrix = new Matrix4();
  // 设置相机和视图框
  var x=5;var z=7;
  perMatrix.setPerspective(30, canvas.width/canvas.height, 1, 100);
  viewMatrix.setLookAt(eye[0]/5, eye[1]/5, eye[3]/5, 0, 0, 0, 0, 1, 0);
  gl.uniformMatrix4fv(u_PerMatrix,false,perMatrix.elements);
  gl.uniformMatrix4fv(u_ViewMatrix,false,viewMatrix.elements);
  
  // 设置白光
  gl.uniform3f(u_LightColor, 1.0, 1.0, 1.0);
  // 设置光照方向
  var lightDirection = new Vector3([0.5, 3.0, 4.0]);
  lightDirection.normalize();     // 世界坐标系下归一化光照方向
  gl.uniform3fv(u_LightDirection, lightDirection.elements);
  // 设置环境光
  gl.uniform3f(u_AmbientLight, 0.7, 0.7, 0.7);
  
  
  var modelMatrix = new Matrix4();  // Model matrix
  var mvpMatrix = new Matrix4();    // Model view projection matrix
  var normalMatrix = new Matrix4(); // Transformation matrix for normals
  
  
  var currentAngle = 0.0;  //设置开始时旋转角度
  var Tx=0.0;              //设置开始时平移角度
  var Sx=1.0;              //设置开始时缩放比例
  
  document.onkeydown = function(ev){ keydown(ev, gl, n, u_FogDist, fogDist, eye, viewMatrix,u_ViewMatrix);};
  
  if (!initTextures(gl)) {
    console.log('Failed to intialize the texture.');
    return;
  }

  var tick = function() {
    currentAngle = animate(currentAngle);  // 变换旋转角度
	Tx = animateTranslate(Tx);             // 变换平移位置
	Sx = animateScale(Sx);                 // 变换缩放大小

    // 计算第一个正方体的模型矩阵
    modelMatrix.setRotate(currentAngle, Tx, Tx, Tx);
	modelMatrix.translate(Tx,Tx,Tx);
	modelMatrix.scale(Sx,Sx,Sx);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

    // 计算出第一个正方体法向量
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
    gl.clearColor(fogColor[0]+Tx/50,fogColor[1]+2*Tx/50,fogColor[2]+3*Tx/50,1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
	
	//第二个正方体
	modelMatrix.setRotate(currentAngle, -Tx, -Tx, -Tx);
	modelMatrix.translate(-Tx,-Tx,-Tx);
	modelMatrix.scale(Sx,Sx,Sx);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
	gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
	
    //第三个正方体
	modelMatrix.setRotate(currentAngle, Tx, Tx, -Tx); 
	modelMatrix.translate(Tx,Tx,-Tx);
	modelMatrix.scale(Sx,Sx,Sx);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
	gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
	
    //第四个正方体
	modelMatrix.setRotate(currentAngle, Tx, -Tx, Tx); 
	modelMatrix.translate(Tx,-Tx,Tx);
	modelMatrix.scale(Sx,Sx,Sx);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
	gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
	
	//第五个正方体
	modelMatrix.setRotate(currentAngle, Tx, -Tx, -Tx);
	modelMatrix.translate(Tx,-Tx,-Tx);
	modelMatrix.scale(Sx,Sx,Sx);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
	gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
	
	//第六个正方体
	modelMatrix.setRotate(currentAngle, -Tx, Tx, Tx); 
	modelMatrix.translate(-Tx,Tx,Tx);
	modelMatrix.scale(Sx,Sx,Sx);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
	gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
	
	//第七个正方体
	modelMatrix.setRotate(currentAngle, -Tx, Tx, -Tx); 
	modelMatrix.translate(-Tx,Tx,-Tx);
	modelMatrix.scale(Sx,Sx,Sx);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
	gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
	
	//第八个正方体
	modelMatrix.setRotate(currentAngle, -Tx, -Tx, Tx); 
	modelMatrix.translate(-Tx,-Tx,Tx);
	modelMatrix.scale(Sx,Sx,Sx);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
	gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
	
	//中心立方体
    modelMatrix.setRotate(currentAngle, 0, 1, 0);
	modelMatrix.scale(0.5,0.5,0.5); 
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
	gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
	
	//紧贴中心立方体的小正方体
	modelMatrix.setRotate(currentAngle, 0, 1, 0); 
	modelMatrix.translate(0.5,0.5,0.5);
	modelMatrix.scale(0.25,0.25,0.25);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
	gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
	
	modelMatrix.setRotate(currentAngle, 0, 1, 0); 
	modelMatrix.translate(0.5,-0.5,0.5);
	modelMatrix.scale(0.25,0.25,0.25);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
	gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
	
	modelMatrix.setRotate(currentAngle, 0, 1, 0); 
	modelMatrix.translate(0.5,0.5,-0.5);
	modelMatrix.scale(0.25,0.25,0.25);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
	gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
	
	modelMatrix.setRotate(currentAngle, 0, 1, 0); 
	modelMatrix.translate(0.5,-0.5,-0.5);
	modelMatrix.scale(0.25,0.25,0.25);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
	gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
	
	modelMatrix.setRotate(currentAngle, 0, 1, 0); 
	modelMatrix.translate(-0.5,0.5,0.5);
	modelMatrix.scale(0.25,0.25,0.25);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
	gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
	
	modelMatrix.setRotate(currentAngle, 0, 1, 0); 
	modelMatrix.translate(-0.5,0.5,-0.5);
	modelMatrix.scale(0.25,0.25,0.25);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
	gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
	
	modelMatrix.setRotate(currentAngle, 0, 1, 0); 
	modelMatrix.translate(-0.5,-0.5,0.5);
	modelMatrix.scale(0.25,0.25,0.25);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
	gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
	
	modelMatrix.setRotate(currentAngle, 0, 1, 0); 
	modelMatrix.translate(-0.5,-0.5,-0.5);
	modelMatrix.scale(0.25,0.25,0.25);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
	gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
	
    requestAnimationFrame(tick, canvas); // 多次调用tick函数
  };
  tick();
}


// 绘制正方体
function initVertexBuffers(gl) {
  // 创造正方体
  //    v6----- v5
  //   /|      /|
  //  v1------v0|
  //  | |     | |
  //  | |v7---|-|v4
  //  |/      |/
  //  v2------v3
  // vertices
  var vertices = new Float32Array([
     1.0, 1.0, 1.0,  -1.0, 1.0, 1.0,  -1.0,-1.0, 1.0,   1.0,-1.0, 1.0, // v0-v1-v2-v3 front
     1.0, 1.0, 1.0,   1.0,-1.0, 1.0,   1.0,-1.0,-1.0,   1.0, 1.0,-1.0, // v0-v3-v4-v5 right
     1.0, 1.0, 1.0,   1.0, 1.0,-1.0,  -1.0, 1.0,-1.0,  -1.0, 1.0, 1.0, // v0-v5-v6-v1 up
    -1.0, 1.0, 1.0,  -1.0, 1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0,-1.0, 1.0, // v1-v6-v7-v2 left
    -1.0,-1.0,-1.0,   1.0,-1.0,-1.0,   1.0,-1.0, 1.0,  -1.0,-1.0, 1.0, // v7-v4-v3-v2 down
     1.0,-1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0, 1.0,-1.0,   1.0, 1.0,-1.0  // v4-v7-v6-v5 back
  ]);

  // Colors
  var colors = new Float32Array([
    0.5, 0.5, 0.5,   0.5, 0.5, 0.5,   0.5, 0.5, 0.5,  0.5, 0.5, 0.5,     // v0-v1-v2-v3 front
    0.5, 0.5, 0.5,   0.5, 0.5, 0.5,   0.5, 0.5, 0.5,  0.5, 0.5, 0.5,     // v0-v3-v4-v5 right
    0.5, 0.5, 0.5,   0.5, 0.5, 0.5,   0.5, 0.5, 0.5,  0.5, 0.5, 0.5,     // v0-v5-v6-v1 up
    0.5, 0.5, 0.5,   0.5, 0.5, 0.5,   0.5, 0.5, 0.5,  0.5, 0.5, 0.5,     // v1-v6-v7-v2 left
    0.5, 0.5, 0.5,   0.5, 0.5, 0.5,   0.5, 0.5, 0.5,  0.5, 0.5, 0.5,     // v7-v4-v3-v2 down
    0.5, 0.5, 0.5,   0.5, 0.5, 0.5,   0.5, 0.5, 0.5,  0.5, 0.5, 0.5,　    // v4-v7-v6-v5 back
 ]);

  // Normal
  var normals = new Float32Array([
    0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,  // v0-v1-v2-v3 front
    1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,  // v0-v3-v4-v5 right
    0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,  // v0-v5-v6-v1 up
   -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  // v1-v6-v7-v2 left
    0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,  // v7-v4-v3-v2 down
    0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0   // v4-v7-v6-v5 back
  ]);

  // Indices of the vertices
  var indices = new Uint8Array([
     0, 1, 2,   0, 2, 3,    // front
     4, 5, 6,   4, 6, 7,    // right
     8, 9,10,   8,10,11,    // up
    12,13,14,  12,14,15,    // left
    16,17,18,  16,18,19,    // down
    20,21,22,  20,22,23     // back
 ]);
 
  // Texture coordinates
  var texCoords = new Float32Array([   
      1.0, 1.0,   0.0, 1.0,   0.0, 0.0,   1.0, 0.0,    // v0-v1-v2-v3 front
      0.0, 1.0,   0.0, 0.0,   1.0, 0.0,   1.0, 1.0,    // v0-v3-v4-v5 right
      1.0, 0.0,   1.0, 1.0,   0.0, 1.0,   0.0, 0.0,    // v0-v5-v6-v1 up
      1.0, 1.0,   0.0, 1.0,   0.0, 0.0,   1.0, 0.0,    // v1-v6-v7-v2 left
      0.0, 0.0,   1.0, 0.0,   1.0, 1.0,   0.0, 1.0,    // v7-v4-v3-v2 down
      0.0, 0.0,   1.0, 0.0,   1.0, 1.0,   0.0, 1.0     // v4-v7-v6-v5 back
  ]);

  // 创建各个缓存区 
  if (!initArrayBuffer(gl, 'a_Position', vertices, 3, gl.FLOAT)) return -1;
  if (!initArrayBuffer(gl, 'a_Color', colors, 3, gl.FLOAT)) return -1;
  if (!initArrayBuffer(gl, 'a_Normal', normals, 3, gl.FLOAT)) return -1;
  if (!initArrayBuffers(gl, texCoords, 2, gl.FLOAT, 'a_TexCoord')) return -1;

  // Unbind the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // 创建索引的缓存区
  var indexBuffer = gl.createBuffer();
  if (!indexBuffer) {
    console.log('Failed to create the buffer object');
    return false;
  }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  return indices.length;
}

function initArrayBuffer(gl, attribute, data, num, type) {
  var buffer = gl.createBuffer();
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return false;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  var a_attribute = gl.getAttribLocation(gl.program, attribute);
  if (a_attribute < 0) {
    console.log('Failed to get the storage location of ' + attribute);
    return false;
  }
  gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
  gl.enableVertexAttribArray(a_attribute);
  return true;
}


//设置角度随时间的变化
var ANGLE_STEP = 30.0;
var g_last = Date.now();
function animate(angle) {
  var now = Date.now();
  var elapsed = now - g_last;
  g_last = now;
  var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
  return newAngle %= 360;
}


//位置随时间的变化
var SPEED_STEP=0.05;
var g_last1=Date.now(); 
function animateTranslate(Tx){
	var now1 = Date.now();
	var elapsed1 = now1 - g_last1;
	g_last1 = now1;
	var newTx = Tx+(SPEED_STEP*elapsed1)/1000.0;
	return newTx;
}


//大小随时间的变化
var SCALE_STEP=0.999;
var g_last2=Date.now();
function animateScale(Sx){
	var now2 = Date.now();
	var elapsed2 = now2 - g_last2;
	g_last2 = now2;
	var newSx=Sx*SCALE_STEP;
	return newSx;
}

//交互改变雾化程度
function keydown(ev, gl, n, u_FogDist, fogDist) {
  switch (ev.keyCode) {
    case 38: 
      fogDist[1]  += 1;
      break;
    case 40: 
      if (fogDist[1] > fogDist[0]) fogDist[1] -= 1;
      break;
    default: return;
  }
  gl.uniform2fv(u_FogDist, fogDist);   
}


function initArrayBuffers(gl, data, num, type, attribute) {
  var buffer = gl.createBuffer();
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return false;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  var a_attribute = gl.getAttribLocation(gl.program, attribute);
  if (a_attribute < 0) {
    console.log('Failed to get the storage location of ' + attribute);
    return false;
  }
  gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
  gl.enableVertexAttribArray(a_attribute);
  return true;
}


function initTextures(gl) {
  var texture = gl.createTexture();
  if (!texture) {
    console.log('Failed to create the texture object');
    return false;
  }
  var u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler');
  if (!u_Sampler) {
    console.log('Failed to get the storage location of u_Sampler');
    return false;
  }
  var image = new Image();
  if (!image) {
    console.log('Failed to create the image object');
    return false;
  }
  image.onload = function(){ loadTexture(gl, texture, u_Sampler, image); };
  image.src = 'sea.png';
  return true;
}


function loadTexture(gl, texture, u_Sampler, image) {
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); 
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.uniform1i(u_Sampler, 0);
}

//用户交互函数
function keydown(ev, gl, n, u_FogDist, fogDist,eye,viewMatrix,u_ViewMatrix ) {
  switch (ev.keyCode) {
    case 38: 
      fogDist[1]  += 1;
      break;
    case 40: 
      if (fogDist[1] > fogDist[0]) fogDist[1] -= 1;
      break;
	case 87: 
      eye[2] += 1;
      break;
    case 83: 
      eye[2] -= 1;
      break;
	case 65:
	  eye[0] -= 1;
	case 68:
	  eye[0] += 1;
	case 81:
	  eye[1] += 1;
	case 69: 
	  eye[1] -= 1;
    default: return;
  }
  gl.uniform2fv(u_FogDist, fogDist);
  viewMatrix.setLookAt(eye[0]/5,eye[1]/5,eye[2]/5,0,0,0,0,1,0);
  gl.uniformMatrix4fv(u_ViewMatrix,false,viewMatrix.elements);   
}
