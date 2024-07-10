//
// Source: 
// AlteredQualia (https://alteredqualia.com/)
// https://experiments.withgoogle.com/webgl-cubes 
//

uniform float amplitude;

varying vec3 vViewPosition;
varying vec3 vNormal;

vec3 rotateVectorByQuaternion(vec3 v, vec4 q) {
  vec3 dest = vec3(0.0);

  float x = v.x, y = v.y, z = v.z;
  float qx = q.x, qy = q.y, qz = q.z, qw = q.w;

  // calculate quaternion * vector

  float ix = qw * x + qy * z - qz * y, iy = qw * y + qz * x - qx * z,
        iz = qw * z + qx * y - qy * x, iw = -qx * x - qy * y - qz * z;

  // calculate result * inverse quaternion

  dest.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
  dest.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
  dest.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;

  return dest;
}

vec4 axisAngleToQuaternion(vec3 axis, float angle) {
  vec4 dest = vec4(0.0);

  float halfAngle = angle / 2.0, s = sin(halfAngle);

  dest.x = axis.x * s;
  dest.y = axis.y * s;
  dest.z = axis.z * s;
  dest.w = cos(halfAngle);

  return dest;
}

void main() {
  vec4 rotation = vec4(0.0, 1.0, 0.0, amplitude * length(color) * 0.00125);
  vec4 qRotation = axisAngleToQuaternion(rotation.xyz, rotation.w);

  vec3 newPosition =
      rotateVectorByQuaternion(position - color, qRotation) + color;
  vNormal = normalMatrix * rotateVectorByQuaternion(normal, qRotation);

  vec4 mvPosition = modelViewMatrix * vec4(newPosition, 2.0);
  vViewPosition = -mvPosition.xyz;

  gl_Position = projectionMatrix * mvPosition;
}