# RakshAI 

**Protective Intelligence & Forensic Analysis Engine**

RakshAI is a cinematic, privacy-first frontend application designed to identify fraud, misinformation, and psychological manipulation in real-time. Built with Apple-grade aesthetics and fluid animations, it serves as a protective layer between the user and digital threats.

Visit and use: [RakshAI](https://kiktro.github.io/RakshAI/)

Share the website: `bit.ly/RakshAI`

##  Features

### 1. Verification (Rumour Scanner)
Verifies the authenticity of news articles, reports, and viral claims by cross-referencing reliable sources.
- **Capabilities:** Fact-checking, source verification, logic gap detection.

### 2.  Claim Guard (Insurance)
Analyzes insurance claims for inconsistencies and potential fraud indicators.
- **Domains:** Vehicle, Health, Property.
- **Input:** Policy type, incident type, and detailed description.

### 3.  Message Forensics (SMS/Phishing)
Scans text messages and emails for social engineering patterns.
- **Psychological Triggers:** Detects Fear, Urgency, Greed, Authority, Scarcity, and Social Proof.

### 4.  Risk Terminal (Investment)
Simulates financial risk scenarios for investment opportunities.
- **Metrics:** ROI verification, cycle analysis, regulatory entity checks.

---

##  AI Architecture

RakshAI supports a hybrid dual-engine architecture to optimize for speed, accuracy, and modality:

| Provider | Models Used | Best For |
| :--- | :--- | :--- |
| **Perplexity** | `sonar`, `sonar-pro` | Deep web research, real-time citation sourcing, text verification. |
| **Google Gemini** | `gemini-2.5-flash`, `gemini-3-pro` | **Image Analysis (OCR)**, high-speed logic, complex reasoning. |

> **Note:** Image upload features are exclusively powered by Gemini. You can switch providers instantly in the Settings menu.

---

##  Tech Stack

*   **Framework:** [React 18](https://react.dev/)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Build Tool:** [Vite](https://vitejs.dev/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **Animations:** [Framer Motion](https://www.framer.com/motion/)
*   **Data Viz:** [Recharts](https://recharts.org/)
*   **Icons:** [Lucide React](https://lucide.dev/)
*   **AI Integration:** `@google/genai` SDK & REST (Perplexity)

---

##  Getting Started

### Prerequisites
*   Node.js (v18 or higher)
*   npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/kiktro/rakshai.git
    cd rakshai
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```

### Configuration (API Keys)

RakshAI runs entirely client-side. No backend server is required.
To use the analysis features:

1.  Click the **Settings (Gear Icon)** in the top right corner.
2.  Select your preferred **AI Provider**.
3.  Enter your API Key:
    *   **Perplexity:** Starts with `pplx-...`
    *   **Gemini:** Starts with `AIza...`
4.  Click **Save Configuration**.

*Keys are stored securely in your browser's LocalStorage and are never transmitted to us.*

---

##  Mobile Experience

RakshAI features a fully responsive, fluid design. On mobile devices, the interface transforms to include:
*   Bottom navigation bar with glassmorphism effects.
*   Touch-optimized toggle for "Deep" vs "Fast" logic tiers.
*   Elastic scrolling and haptic-feel interactions.
##  Build for Production

To create a production build (e.g., for GitHub Pages or Vercel):

```bash
npm run build
```

The output will be generated in the `dist/` folder.

##  License

Distributed under the MIT License.

---

*Built with ❤️ by Krishnendu Halder*
