!! Disclaimer: All this is vibe coded with Google Gemini ai studio !!

# Cinema Film Strip Generator 🎞️

An interactive, customizable cinema 35mm / 70mm film strip creator and high-resolution canvas exporter built with React 19, TypeScript, Tailwind CSS, and HTML5 Canvas.

Create authentic movie film strips, custom photo stories, and vintage celluloid prints with custom sprocket holes, edge markings, color timing filters, and pixel-perfect framing.

---

## ✨ Features

- **🎞️ Authentic Film Stocks & Presets**: Kodak Vision3 500T, Fujifilm Eterna 500, Ilford HP5 Plus Noir, CineStill 800T, Vintage Monochrome, and Clean Modern.
- **📐 Flexible Frame Geometry & Aspect Ratios**: Choose from 3:2 (Classic 35mm), 16:9 (Widescreen), 4:3 (Academy Standard), 1:1 (Square), and 2.39:1 (Anamorphic Cinemascope), or define custom dimensions.
- **🖼️ Non-Destructive Framing & Precision Transforms**:
  - Zoom from `0.2x` to `10.0x` with full preservation of the uncropped source image.
  - 360° free rotation plus one-click 90° steps.
  - Horizontal and vertical flips.
  - Smooth pan and alignment presets (Left, Center, Right).
- **🎨 Vintage Color Timing & Film Grading**: Real-time Brightness, Contrast, Saturation, Sepia, Grayscale, and Warmth grading with instant cinema presets (Norm, B&W, Warm, Vivid, Noir).
- **🔤 Authentic Film Edge Markings**:
  - Customizable film stock codes (e.g. `KODAK 5219`, `FUJI ETERNA`).
  - Top and bottom frame index markings with auto-incrementing numbers and `A` suffixes (e.g. `12A`, `13`, `13A`).
  - Custom per-frame scene, take, or director labels.
- **⚙️ Custom Sprocket Holes & Borders**: Configure sprocket shape (rounded/square), pitch, count, fill color, and border styling.
- **📸 High-Resolution Canvas Export**:
  - Export at 1x (Standard), 2x (Retina/Print), or 4x (Ultra HD / Archival).
  - PNG, JPEG, and WebP format support with quality controls.
  - Individual frame export or full film strip download.
- **⌨️ Keyboard Shortcuts & Multi-touch Gestures**:
  - `Arrow Left` / `Arrow Right`: Navigate frames.
  - `Alt + Left` / `Alt + Right`: Swap frame order.
  - `Space + Drag`: Pan image inside active frame.
  - `Ctrl + Mouse Wheel` / `Pinch`: Zoom into frame.
  - `Delete` / `Backspace`: Remove photo from active frame.
  - `Esc`: Deselect active frame inspector.

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: v18.0.0 or higher (Node.js 20+ recommended)
- **Package Manager**: `npm` (comes with Node.js), `bun`, `pnpm`, or `yarn`

---

## 📦 Installation

1. **Clone or download the repository**:
   ```bash
   git clone <repository-url>
   cd filmstrip-generator
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```
   *(Or if using bun: `bun install` | pnpm: `pnpm install`)*

---

## 💻 Development & Running Locally

Start the local development server on `http://localhost:3000`:

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:3000` to start creating film strips.

---

## 🛠️ Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts Vite dev server on `http://0.0.0.0:3000` |
| `npm run build` | Compiles and builds production-ready static assets into `dist/` |
| `npm run preview` | Previews the production build locally |
| `npm run lint` | Runs TypeScript type checking (`tsc --noEmit`) |
| `npm run clean` | Cleans up previous build artifacts |

---

## 📖 How to Use

1. **Configure Film Strip**: Use the left sidebar to set the number of frames, aspect ratio, film stock preset, and border colors.
2. **Add Photos**: Click on any frame box or drag and drop images directly onto the strip.
3. **Adjust Framing & Filters**:
   - Click on any frame to activate the **3-Column Frame Options Bar** at the bottom.
   - Adjust Zoom, Rotation, Pan, Flips, Color Grading, and Custom Edge Labels.
4. **Export**: Click the **Export Strip** button at the top-right header to download a high-resolution PNG, JPEG, or WebP file.

---

## 🏗️ Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 6](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Rendering & Export**: Native HTML5 Canvas 2D Context & [JSZip](https://stuk.github.io/jszip/)
