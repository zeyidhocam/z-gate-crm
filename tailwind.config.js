/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            transitionDuration: {
                DEFAULT: '200ms',
            },
            colors: {
                background: "var(--background)",
                sidebar: "var(--sidebar)",
                card: "var(--card)",
                primary: "var(--primary)",
                "primary-fg": "var(--primary-foreground)",
                textMain: "var(--foreground)",
                textMuted: "var(--muted-foreground)",
                border: "var(--border)",
                ring: "var(--ring)",
                input: "var(--input)",
                destructive: "var(--destructive)",
            },
            fontFamily: {
                sans: ["var(--font-sans)", "sans-serif"],
                mono: ["var(--font-mono)", "monospace"],
            }
        },
    },
    plugins: [],
};
