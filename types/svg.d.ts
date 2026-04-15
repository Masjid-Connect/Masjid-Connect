// TypeScript declarations for SVG-as-component imports.
// Paired with the react-native-svg-transformer setup in metro.config.js:
// `import Logo from '@/assets/images/foo.svg'` yields a React component
// that accepts the standard react-native-svg SvgProps (width, height,
// fill, color, style, etc.).
declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}
