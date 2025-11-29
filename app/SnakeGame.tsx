import React, { useState, useEffect, useRef, useCallback } from 'react';
import Joystick from './Joystick'; // Import the Joystick component

const GRID_SIZE = 18;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_FOOD = { x: 15, y: 15 };
const INITIAL_DIRECTION = { x: 1, y: 0 }; // Right
const GAME_SPEED = 150; // milliseconds

type Direction = { x: number; y: number };
type SnakeSegment = { x: number; y: number };

const SnakeGame: React.FC = () => {
  const [snake, setSnake] = useState<SnakeSegment[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<SnakeSegment>(INITIAL_FOOD);
  const [direction, setDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [gameStarted, setGameStarted] = useState<boolean>(false); // New state for game start
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const [currentCellSize, setCurrentCellSize] = useState(20); // Default CELL_SIZE

  const changeDirection = useCallback((e: KeyboardEvent | string) => {
    if (gameOver) return;

    let newDirection: Direction = direction;
    if (typeof e === 'string') {
      switch (e) {
        case 'ArrowUp':
          if (direction.y === 0) newDirection = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
          if (direction.y === 0) newDirection = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
          if (direction.x === 0) newDirection = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
          if (direction.x === 0) newDirection = { x: 1, y: 0 };
          break;
      }
    } else {
      switch (e.key) {
        case 'ArrowUp':
          if (direction.y === 0) newDirection = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
          if (direction.y === 0) newDirection = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
          if (direction.x === 0) newDirection = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
          if (direction.x === 0) newDirection = { x: 1, y: 0 };
          break;
      }
    }
    setDirection(newDirection);
  }, [direction, gameOver]);

  const generateFood = useCallback(() => {
    let newFood: SnakeSegment;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    setFood(newFood);
  }, [snake]);

  const moveSnake = useCallback(() => {
    if (gameOver) return;

    setSnake(prevSnake => {
      const head = { x: prevSnake[0].x + direction.x, y: prevSnake[0].y + direction.y };

      // Check for collision with walls
      if (
        head.x < 0 ||
        head.x >= GRID_SIZE ||
        head.y < 0 ||
        head.y >= GRID_SIZE
      ) {
        setGameOver(true);
        setGameStarted(false); // End game when collision occurs
        return prevSnake;
      }

      // Check for collision with self
      if (prevSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
        setGameOver(true);
        setGameStarted(false); // End game when collision occurs
        return prevSnake;
      }

      const newSnake = [head, ...prevSnake];

      // Check for food collision
      if (head.x === food.x && head.y === food.y) {
        setScore(prevScore => prevScore + 1);
        generateFood();
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [direction, food, gameOver, generateFood]);

  useEffect(() => {
    const calculateCellSize = () => {
      if (gameAreaRef.current && gameAreaRef.current.parentElement) {
        const parentWidth = gameAreaRef.current.parentElement.offsetWidth;
        const newCellSize = Math.floor(parentWidth / GRID_SIZE);
        setCurrentCellSize(Math.max(10, newCellSize)); // Minimum 10px cell size
      }
    };

    calculateCellSize();
    window.addEventListener('resize', calculateCellSize);

    return () => {
      window.removeEventListener('resize', calculateCellSize);
    };
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (gameStarted && !gameOver && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault(); // Prevent page scrolling
    }
    changeDirection(e);
  }, [gameStarted, gameOver, changeDirection]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    if (gameStarted && !gameOver) {
      const gameInterval = setInterval(moveSnake, GAME_SPEED);
      return () => clearInterval(gameInterval);
    }
  }, [moveSnake, gameStarted, gameOver]);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setFood(INITIAL_FOOD);
    setDirection(INITIAL_DIRECTION);
    setGameOver(false);
    setScore(0);
    setGameStarted(true); // Start the game when reset
  };

  const handleJoystickMove = useCallback((direction: { x: number; y: number }) => {
    const threshold = 20; // Sensitivity threshold for joystick movement
    if (Math.abs(direction.x) > Math.abs(direction.y)) {
      // Horizontal movement
      if (direction.x > threshold) {
        changeDirection('ArrowRight');
      } else if (direction.x < -threshold) {
        changeDirection('ArrowLeft');
      }
    } else {
      // Vertical movement
      if (direction.y > threshold) {
        changeDirection('ArrowDown');
      } else if (direction.y < -threshold) {
        changeDirection('ArrowUp');
      }
    }
  }, [changeDirection]);

  return (
    <div className="flex flex-col items-center justify-center">
      <div
        ref={gameAreaRef}
        className="relative bg-zinc-950 rounded-lg shadow-lg border border-zinc-700"
        style={{
          width: GRID_SIZE * currentCellSize,
          height: GRID_SIZE * currentCellSize,
        }}
      >
        {snake.map((segment, index) => (
          <div
            key={index}
            className="absolute bg-indigo-500 rounded-sm"
            style={{
              left: segment.x * currentCellSize,
              top: segment.y * currentCellSize,
              width: currentCellSize,
              height: currentCellSize,
            }}
          ></div>
        ))}
        <div
          className="absolute bg-yellow-500"
          style={{
            left: food.x * currentCellSize,
            top: food.y * currentCellSize,
            width: currentCellSize,
            height: currentCellSize,
          }}
        ></div>
      </div>
      {gameOver && (
        <div className="mt-4 text-center">
          <p className="text-xl font-semibold text-red-500">Game Over!</p>
          <p className="text-lg">Score: {score}</p>
          <button
            onClick={resetGame}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Play Again
          </button>
        </div>
      )}
      {!gameOver && !gameStarted && (
        <button
          onClick={resetGame}
          className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600"
        >
          Start Game
        </button>
      )}
      {!gameOver && gameStarted && <p className="mt-4 text-lg">Score: {score}</p>}

      <Joystick onMove={handleJoystickMove} isVisible={!gameOver && gameStarted} />
    </div>
  );
};

export default SnakeGame;