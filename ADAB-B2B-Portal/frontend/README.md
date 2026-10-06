
# B2B Portal - Phase 1 Setup

This project is an enterprise-grade React 18 + TypeScript boilerplate configured with Vite and Tailwind CSS.

## Initialization Steps

To set this up locally from scratch:

1. **Create the Project**
   ```bash
   npm create vite@latest b2b-portal -- --template react-ts
   cd b2b-portal
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Install Tailwind CSS**
   ```bash
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```

4. **Configuration**
   - Update `tailwind.config.js` with your content paths and brand theme.
   - Configure `vite.config.ts` for any specific enterprise requirements (base paths, proxying, etc.).

## Development

- Start the development server: `npm run dev`
- Build for production: `npm run build`
- Preview build: `npm run preview`

## Next Steps (Phase 2)
- [ ] Define shared UI component library (atomic design).
- [ ] Setup Routing (HashRouter for this specific environment).
- [ ] Implement State Management (Zustand or TanStack Query).
- [ ] Define API services layer.
