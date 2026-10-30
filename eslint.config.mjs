import coreWebVitals from 'eslint-config-next/core-web-vitals';

const config = [
  ...coreWebVitals,
  { ignores: ['out/', '.next/', 'public/'] },
  {
    // Aturan baru eslint-config-next 16 (React Compiler); belum dirapikan satu-satu.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
    },
  },
];

export default config;
