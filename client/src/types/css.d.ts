// CSS module declarations
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

// Tailwind CSS at-rules
declare module 'tailwindcss/tailwind.css';
