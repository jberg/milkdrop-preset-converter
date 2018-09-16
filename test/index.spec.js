const presetConverter = require('../dist/milkdrop-preset-converter.min');

describe('MilkdropPresetConverter', () => {
  const HLSLShader = `shader_body {
      ret = float3(0.1, 0.2, 0.3);
    };`;

  const GLSLShader =
`vec2 matrix_row0(mat2 m, int i) { return vec2( m[0][i], m[1][i] ); }
vec3 matrix_row0(mat3 m, int i) { return vec3( m[0][i], m[1][i], m[2][i] ); }
vec4 matrix_row0(mat4 m, int i) { return vec4( m[0][i], m[1][i], m[2][i], m[3][i] ); }
vec2  m_scalar_swizzle20(float x) { return  vec2(x, x); }
ivec2 m_scalar_swizzle20(int   x) { return ivec2(x, x); }
vec3  m_scalar_swizzle30(float x) { return  vec3(x, x, x); }
ivec3 m_scalar_swizzle30(int   x) { return ivec3(x, x, x); }
vec4  m_scalar_swizzle40(float x) { return  vec4(x, x, x, x); }
ivec4 m_scalar_swizzle40(int   x) { return ivec4(x, x, x, x); }
uvec2 m_scalar_swizzle20(uint  x) { return uvec2(x, x); }
uvec3 m_scalar_swizzle30(uint  x) { return uvec3(x, x, x); }
uvec4 m_scalar_swizzle40(uint  x) { return uvec4(x, x, x, x); }
vec2 bvecTernary0(bvec2 cond, vec2 trueExpr, vec2 falseExpr) { vec2 ret; ret.x = cond.x ? trueExpr.x : falseExpr.x; ret.y = cond.y ? trueExpr.y : falseExpr.y; return ret; }
vec3 bvecTernary0(bvec3 cond, vec3 trueExpr, vec3 falseExpr) { vec3 ret; ret.x = cond.x ? trueExpr.x : falseExpr.x; ret.y = cond.y ? trueExpr.y : falseExpr.y; ret.z = cond.z ? trueExpr.z : falseExpr.z; return ret; }
vec4 bvecTernary0(bvec4 cond, vec4 trueExpr, vec4 falseExpr) { vec4 ret; ret.x = cond.x ? trueExpr.x : falseExpr.x; ret.y = cond.y ? trueExpr.y : falseExpr.y; ret.z = cond.z ? trueExpr.z : falseExpr.z; ret.w = cond.w ? trueExpr.w : falseExpr.w; return ret; }
vec4 main_shader_sentinel(vec2 uv) {
    vec3 ret;
    (ret = vec3(0.100000, 0.200000, 0.300000));
    return vec4(ret, 1.000000);
}
 shader_body {` + ' ' + `
    vec4 result = main_shader_sentinel(uv);
    ret = result.rgb;
 }`;

  it('converts HLSL to GLSL', async (done) => {
    const convertedShader = await presetConverter.convertShader(HLSLShader);
    expect(convertedShader.trim()).toEqual(GLSLShader.trim());
    done();
  });
});
