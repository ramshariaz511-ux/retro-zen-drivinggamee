# 🚗 retroZen driving

A vintage, retro, pixelated 3D first-person driving & walking game with procedural ambient soundscapes and Google Gemini AI Mood Guide.

---

## 🕹️ Game Overview

- **First-Person Driving Perspective**: Cockpit view with dashboard, functioning speedometer needle, and steering wheel gripped by hands wearing **black driving gloves** with knuckle perforations. Wheel and hands rotate dynamically with steering input.
- **Pedestrian Walking & Skateboarding**: In the two pedestrian maps (**New York Times Square** and **Istiklal Street, Istanbul**), car driving is disabled in favor of:
  - **Walking Mode**: Natural first-person walking cadence, head-bobbing, footstep audio.
  - **Skateboarding Mode**: Retro 3D skateboard deck visible at the bottom of the screen with urethane wheels, kick-push acceleration, bearing roll sound, and board banking into turns.
- **6 Scenic Maps**:
  1. 🌆 **Sci-Fi / Tokyo Style**: Elevated cyber expressway, glowing neon skyscrapers, kanji signs, cyan & magenta lane dividers.
  2. 🌿 **Hillside Grass Fields**: Rolling green hills, winding country road, pine trees, wildflowers, and an iconic rotating windmill.
  3. 🇬🇧 **Streets of London**: Victorian red brick townhouses, classic K6 red telephone boxes, Big Ben silhouette, gas lamps, damp asphalt.
  4. ❄️ **Snow-Capped Peaks**: Alpine mountain pass, frosted guardrails, snow-capped peaks, and falling 3D snow particles.
  5. 🗽 **New York Times Square (BONUS Walk / Skate)**: 42nd & Broadway pedestrian plaza, towering animated LED billboard screens, parked yellow NYC cabs, red TKTS stairs.
  6. 🇹🇷 **Istiklal Street, Istanbul (BONUS Walk / Skate)**: Historic Nostalgic Red Heritage Tramway on tracks down the center of the street, 19th-century European/Ottoman facades, hanging lanterns, cobblestones, and simit carts.
- **4 Times of Day**:
  - 🌅 Sunrise (warm coral-peach dawn, soft morning fog)
  - ☀️ Afternoon (bright retro cyan-blue sky, fluffy voxel clouds, crisp sun)
  - 🌇 Sunset (80s synthwave magenta/orange gradient, long shadows, active headlights)
  - 🌙 Night (deep midnight navy starry sky, moon, active headlight beams)
- **Persistent Calming Sound Bar (Active at Top at All Times)**:
  - 💽 **Procedural Vinyl Crackle**: Warm turntable surface noise and analog needle pops.
  - 🌧️ **Procedural Rain**: Bandpass filtered rainfall with windshield droplets overlay.
  - 🎵 **6 Lo-Fi Chill Beats**: Synthesized in real-time via Web Audio API (chords, bass, chill lo-fi drums).
- **Google Gemini AI Mood Navigator**:
  - Secure backend endpoint `POST /api/gemini` safely reading `GEMINI_API_KEY`.
  - Analyzes user's mood and recommends tailored route, timing, lo-fi beat, and vehicle mode.
  - One-click `[ APPLY THIS ZEN TRIP NOW ]` button automatically configures the environment.
- **Vintage Retro Aesthetics**:
  - Bluish-grey (`#161e2e`) main color with cyan (`#00f5d4`) accent.
  - Pixelated fonts: `'Press Start 2P'` and `'VT323'`.
  - Custom yellow retro pixel cursor (`#facc15`).
  - Cute Mario Kart arcade chime sound synthesized on every click.
  - CRT Scanlines toggle.

---

## 🚀 Running the Game

1. Navigate to the project directory:
   ```powershell
   cd "C:\Users\LENOVO\.gemini\antigravity\scratch\retro-zen-driving"
   ```

2. (Optional) Set your Google Gemini API key:
   Edit `.env`:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   PORT=3000
   ```
   *Note: If no key is set, the game automatically uses an intelligent built-in Zen Navigator so all mood recommendations work out of the box!*

3. Start the server:
   ```powershell
   node server.js
   ```

4. Open in browser:
   **`http://localhost:3000`**

---

## ⌨️ Controls

- **Steer**: `A` / `D` or `Left Arrow` / `Right Arrow` (or on-screen touch buttons)
- **Accelerate**: `W` or `Up Arrow` (or Gas button)
- **Brake / Reverse**: `S` or `Down Arrow` (or Brake button)
- **Toggle Walk / Skateboard** (in Times Square & Istiklal Street): `Space` or `T`
- **CRT Scanlines**: Toggle via `[ 📺 CRT ]` in the top bar
- **Change Map**: `[ 🗺️ MAPS ]` button in the top bar
- **AI Mood Guide**: `[ 🤖 AI ZEN GUIDE ]` button in the top bar
