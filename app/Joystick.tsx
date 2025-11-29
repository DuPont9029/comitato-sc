"use client";

import React, { useState, useEffect, useCallback } from 'react';

interface JoystickProps {
  onMove: (direction: { x: number; y: number }) => void;
  isVisible?: boolean; // New prop to control visibility
}

const Joystick: React.FC<JoystickProps> = ({ onMove, isVisible = true }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // Tailwind's 'md' breakpoint is 768px
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    const touch = e.touches[0];
    setStartPos({ x: touch.clientX, y: touch.clientY });
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - startPos.x;
    const deltaY = touch.clientY - startPos.y;

    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = 50; // Max distance the joystick can move from its center

    if (distance > maxDistance) {
      const angle = Math.atan2(deltaY, deltaX);
      setJoystickPos({
        x: Math.cos(angle) * maxDistance,
        y: Math.sin(angle) * maxDistance,
      });
    } else {
      setJoystickPos({ x: deltaX, y: deltaY });
    }

    onMove({ x: deltaX, y: deltaY });
  }, [isDragging, startPos, onMove]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setJoystickPos({ x: 0, y: 0 });
    onMove({ x: 0, y: 0 }); // Reset movement when joystick is released
  }, [onMove]);

  if (!isMobile || !isVisible) {
    return null; // Don't render joystick on desktop or if not visible
  }

  return (
    <div
      className="joystick-base"
      style={{
        position: 'fixed',
        bottom: '50px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        backgroundColor: 'rgba(128, 128, 128, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        touchAction: 'none', // Prevent browser default touch actions
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="joystick-handle"
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
        }}
      ></div>
    </div>
  );
};

export default Joystick;