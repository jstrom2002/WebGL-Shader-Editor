// GLOBALS
// ========
// Main shader program, updated via textarea input.
var program = null;
var shaderText = null;

// Locations/buffers/values to set for shader at rendertime.
var positionBuffer = null;
var positionAttributeLocation = null;
var resolutionLocation = null;
var mouseLocation = null
var timeLocation = null;



// Generic function for error popups handled by API.
// For generic JS, the 'window.alert()' function handles this
// nicely across all browsers/platforms.
function ErrorMessageBox(errorStr)
{
  const canvas = document.querySelector("#canvas");
  const gl = canvas.getContext("webgl");

  // Also check for GL_ERROR while we're at it.
  if(gl.getError() != gl.NO_ERROR)
  {
    errorStr += "\n" + gl.getError();
  }

  // Display error string in both log and alert popup.
  alert(errorStr);
  console.log(errorStr);  
}


// Helper function to delete/setup shader program w/ proper attribs.
function CreateShaders()
{
  if(program != null)
    return;
  
    const canvas = document.querySelector("#canvas");
    const gl = canvas.getContext("webgl");
    if (!gl) 
    {
      ErrorMessageBox("Error! Could not find WebGL context for canvas.");
      return;
    }
    
  const vertSource = `
    attribute vec4 a_position;
    void main() {
      gl_Position = a_position;
    }`;

    // Create/update vertex shader.
    const vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, vertSource);
    gl.compileShader(vertShader);
    
    // Check this shader's compilation status
    const vCompiled = gl.getShaderParameter(vertShader, gl.COMPILE_STATUS);
    if (!vCompiled) 
    {
      ErrorMessageBox('Error in vertex shader linking:' + gl.getShaderInfoLog(vertShader));
    }
    
    // Create/update fragment shader. NOTE: you cannot access '.value' for input element without
    // providing JSDoc with proper @type tag indicator.
    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    /** @type {HTMLInputElement} */
    shaderText = document.getElementById("ShaderEditWindow").value;

    // Convert between JS line breaks and HTML.
    //shaderText.replace("\n", "<br/>");

    gl.shaderSource(fragShader, shaderText);
    gl.compileShader(fragShader);

    // Check this shader's compilation status
    const fCompiled = gl.getShaderParameter(fragShader, gl.COMPILE_STATUS);
    if (!fCompiled) 
    {
      ErrorMessageBox('Error in fragment shader linking:' + gl.getShaderInfoLog(fragShader));
    }    

    program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    // Cleanup: it is no longer necessary to keep individual shader objects in memory.
    gl.detachShader(program,vertShader);
    gl.deleteShader(vertShader);
    gl.detachShader(program,fragShader);
    gl.deleteShader(fragShader);

    // Check the link status.
    const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!linked) 
    {
      ErrorMessageBox('Error in program linking:' + gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
    }

    // Get shader attrib and uniform locations.
    positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    resolutionLocation = gl.getUniformLocation(program, "iResolution");
    mouseLocation = gl.getUniformLocation(program, "iMouse");
    timeLocation = gl.getUniformLocation(program, "iTime");

    // Create a buffer for 2D rendering quad (12 2D pts).
    if(positionBuffer == null)
    {
      positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1,]), gl.STATIC_DRAW);
    }  
}


// Listener for 'Recompile Shader' button.
function RecompileShaderListener()
{
  var canvas = document.querySelector("#canvas");
  var gl = canvas.getContext("webgl");

  // Delete old shader program.
  if(program != null)
  {
    gl.deleteProgram(program);
    program = null;
  }

  // Create new shader program.
  CreateShaders();
}


// ===================================================================


// Main entry point for rendering.
function main() 
{
  // Get current WebGL context for 'canvas' element (the main rendering area)
  /** @type {HTMLCanvasElement} */
  const canvas = document.querySelector("#canvas");
  const gl = canvas.getContext("webgl");
  if (!gl) 
  {
    ErrorMessageBox("Error! Could not find WebGL context for canvas.");
    return;
  }

  // Add listener for button to update frag shader.
  const rldBtn = document.getElementById("ReloadButton");
  rldBtn.addEventListener('click', RecompileShaderListener.bind(this));

  if(shaderText == null)
  {
    shaderText = `
    precision highp float;
    uniform vec2 iResolution;
    uniform vec2 iMouse;
    uniform float iTime;
    void mainImage( out vec4 fragColor, in vec2 fragCoord )
    {
        // Normalized pixel coordinates (from 0 to 1)
        vec2 uv = fragCoord/iResolution.xy;
    
        // Time varying pixel color
        vec3 col = 0.5 + 0.5*cos(iTime+uv.xyx+vec3(0,2,4));
    
        // Output to screen
        fragColor = vec4(col,1.0);
    }      
    void main() { mainImage(gl_FragColor, gl_FragCoord.xy); }`;

    // Convert between JS line breaks and HTML.
    //shaderText.replace("\n", "<br/>");
    shaderText = shaderText.replace("\r\n", "\\r\\n");

    /** @type {HTMLInputElement} */
    document.getElementById("ShaderEditWindow").value = shaderText;
  }

  // Initialize shader if it is null valued.
  CreateShaders();

  // Add listeners for play/pause control on mouseover.
  const playpauseElem = document.querySelector('.playpause');
  const inputElem = document.querySelector('.divcanvas');
  inputElem.addEventListener('mouseover', requestFrame);
  inputElem.addEventListener('mouseout', cancelFrame);

  // Get mouse position and use values in play/pause listeners.
  let mouseX = 0;
  let mouseY = 0;
  function setMousePosition(e) {
    const rect = inputElem.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = rect.height - (e.clientY - rect.top) - 1;  // bottom is 0 in WebGL
  }
  inputElem.addEventListener('mousemove', setMousePosition);
  inputElem.addEventListener('touchstart', (e) => {
    e.preventDefault();
    playpauseElem.classList.add('playpausehide');
    requestFrame();
  }, {passive: false});
  inputElem.addEventListener('touchmove', (e) => {
    e.preventDefault();
    setMousePosition(e.touches[0]);
  }, {passive: false});
  inputElem.addEventListener('touchend', (e) => {
    e.preventDefault();
    playpauseElem.classList.remove('playpausehide');
    cancelFrame();
  }, {passive: false});

  let requestId;
  function requestFrame() {
    if (!requestId) {
      requestId = requestAnimationFrame(render);
    }
  }
  function cancelFrame() {
    if (requestId) {
      cancelAnimationFrame(requestId);
      requestId = undefined;
    }
  }

  // Rendering code.
  let then = 0;
  let time = 0;
  function render(now) 
  {
    if(program == null)
      return;

    requestId = undefined;
    now *= 0.001;  // convert to ms -> seconds
    const elapsedTime = Math.min(now - then, 0.1);
    time += elapsedTime;
    then = now;

    // Resize canvas and viewport.
    gl.canvas.width = canvas.clientWidth;
    gl.canvas.height = canvas.clientHeight;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Set shader uniforms.
    gl.useProgram(program);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionAttributeLocation,2,gl.FLOAT,false,0,0,);
    gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);
    gl.uniform2f(mouseLocation, mouseX, mouseY);
    gl.uniform1f(timeLocation, time);

    gl.drawArrays(gl.TRIANGLES,0,6,);

    requestFrame();
  }

  requestFrame();
  requestAnimationFrame(cancelFrame);
}

main();