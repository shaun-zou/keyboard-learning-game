# Keyboard Learning Game for Kids 🎮

A fun, interactive web game designed to help children learn their keyboard layout, understand where each key is located on the computer, and practice typing!

## Features

- **Visual Keyboard Display** - See exactly which keys correspond to letter keys on your computer
- **Interactive Lessons** - Learn each letter from A to Z in a progressive order
- **Click-to-Learn** - Click the letter on screen and tell you which physical key is represented
- **Progress Tracking** - See how many letters you've learned
- **Practice Mode** - Practice typing combinations for different letters

## How to Play

1. Start the game using `npm run dev` or `npm start` in the `keyboard-learning-game/` folder
2. Click on each letter (A-Z) that you know how to type
3. The app will show you which physical key on your keyboard it matches
4. Practice combinations like "ASDF", "JKL", etc.

## Project Structure

```
keyboard-learning-game/
├── index.html          # Main HTML structure
├── package.json        # Dependencies and scripts
├── vite.config.js      # Vite configuration
├── vite-env.d.ts       # TypeScript declarations
├── src/
│   ├── App.jsx         # Main React component
│   ├── styles.css      # Global styles
│   └── animation.css   # Animations (if needed)
└── index.js            # Vite entry point
```

## Keyboard Layout Legend (for reference)

**QWERTY US Layout:**
- QWERTY ← → Space Bar
- A S D F G H J K L ; ' : - _ /  Backspace
- Z X C V B N M , . ? Enter Home Page Up

This game helps children memorize which keys correspond to letters on their keyboard.

## Development

```bash
# Install dependencies
cd keyboard-learning-game
npm install

# Start the development server
npm run dev

# Run tests (if available)
npm test
```

## License

MIT - Free for educational use in classrooms and home learning environments.
