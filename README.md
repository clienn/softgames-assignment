# softgames-assignment

PixiJS Animated Card Spread

This project demonstrates an animated spread of cards using PixiJS, a powerful WebGL-based rendering library. It features an interactive fan-style animation of tarot cards with smooth transitions and performance tracking.

Features

Smooth Card Spread Animation: Cards are smoothly animated into a fan-like spread with customizable arc.

Interactive Controls: Includes a "Back" button for easy navigation and resetting the animation.

Real-time FPS Display: Displays the animation performance directly on-screen.

Shuffle Logic: Cards are randomly shuffled ensuring a unique spread each time.

Getting Started

Installation

Clone the repository:

git clone https://github.com/clienn/softgames-assignment.git
cd softgames-assignment
npm install

Running the Project

Serve the application locally:

npm run dev

Then open http://localhost:5173 (or your chosen port) in your web browser.

Project Structure

startCardSpread Function: Handles loading assets, initializing animations, and managing card positioning.

Animation Logic: Uses PixiJS's Ticker for frame-based animations.

Interactivity: The back button resets the animation state and allows navigation.

Dependencies

PixiJS

Contributions

Feel free to fork this project and submit pull requests to improve the animation or add new features.

License

This project is licensed under the MIT License.
