#version 300 es
precision highp float;
in vec4 color;

in vec4 id;

out vec4 fragmentColor;

void main(void) {
    fragmentColor = vec4(color.rgb * color.a, color.a);
}