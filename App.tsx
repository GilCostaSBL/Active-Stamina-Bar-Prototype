
import React, { useState, useEffect, useRef, useCallback } from 'react';

const TOTAL_STAMINA = 100;

interface StaminaState {
  max: number;
  current: number;
}

interface ConfigState {
  maxStaminaDecay: number;
  currentStaminaDecay: number;
  currentStaminaRecovery: number;
}

// A reusable UI component for a slider control
const SliderControl: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  unit: string;
  name: string;
}> = ({ label, value, min, max, step, onChange, unit, name }) => (
  <div className="flex flex-col space-y-2">
    <div className="flex justify-between items-center text-sm">
      <label htmlFor={label} className="font-medium text-gray-300">{label}</label>
      <span className="px-2 py-1 bg-gray-700 rounded-md text-white font-mono text-xs">{value.toFixed(1)} {unit}</span>
    </div>
    <input
      id={label}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={onChange}
      name={name}
      className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-green-500"
    />
  </div>
);

export default function App() {
  const [stamina, setStamina] = useState<StaminaState>({ max: TOTAL_STAMINA, current: TOTAL_STAMINA });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [config, setConfig] = useState<ConfigState>({
    maxStaminaDecay: 1.5,
    currentStaminaDecay: 30,
    currentStaminaRecovery: 20,
  });

  const animationFrameId = useRef<number>();
  const previousTime = useRef<number>();
  const isSpacePressedRef = useRef(isSpacePressed);

  useEffect(() => {
    isSpacePressedRef.current = isSpacePressed;
  }, [isSpacePressed]);

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig(prevConfig => ({
      ...prevConfig,
      [name]: parseFloat(value),
    }));
  };
  
  const resetStamina = useCallback(() => {
    setStamina({ max: TOTAL_STAMINA, current: TOTAL_STAMINA });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const gameLoop = useCallback((currentTime: number) => {
    if (previousTime.current === undefined) {
      previousTime.current = currentTime;
    }
    const deltaTime = (currentTime - previousTime.current) / 1000;
    
    setStamina(prev => {
      const newMax = Math.max(0, prev.max - config.maxStaminaDecay * deltaTime);
      
      let newCurrent;
      if (isSpacePressedRef.current) {
        newCurrent = prev.current - config.currentStaminaDecay * deltaTime;
      } else {
        newCurrent = prev.current + config.currentStaminaRecovery * deltaTime;
      }
      
      newCurrent = Math.max(0, Math.min(newCurrent, newMax));
      
      return { max: newMax, current: newCurrent };
    });

    previousTime.current = currentTime;
    animationFrameId.current = requestAnimationFrame(gameLoop);
  }, [config]);


  useEffect(() => {
    animationFrameId.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      previousTime.current = undefined;
    };
  }, [gameLoop]);

  const maxPercent = (stamina.max / TOTAL_STAMINA) * 100;
  const currentPercent = (stamina.current / TOTAL_STAMINA) * 100;

  return (
    <main className="bg-gray-900 min-h-screen flex items-center justify-center font-sans p-4">
      <div className="w-full max-w-2xl bg-gray-800 shadow-2xl rounded-2xl p-6 md:p-8 border border-gray-700">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white">Interactive Stamina Bar</h1>
          <p className="text-gray-400 mt-2">Press and hold the <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-200 bg-gray-700 border border-gray-600 rounded-lg">Spacebar</kbd> to drain stamina.</p>
        </div>

        {/* Stamina Bar */}
        <div className="relative w-full h-8 bg-red-600/50 rounded-full overflow-hidden shadow-inner border-2 border-black/30 mb-8">
            <div 
                className="absolute top-0 left-0 h-full bg-green-800" 
                style={{ width: `${maxPercent}%`, transition: 'width 150ms linear' }}
            ></div>
            <div 
                className="absolute top-0 left-0 h-full bg-green-400"
                style={{ width: `${currentPercent}%`, transition: 'width 150ms linear' }}
            ></div>
            <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm tracking-wider" style={{ textShadow: '1px 1px 2px black' }}>
                {Math.round(stamina.current)} / {Math.round(stamina.max)}
            </div>
        </div>

        {/* Controls */}
        <div className="bg-black/20 p-6 rounded-lg border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4 text-center">Adjust Parameters</h2>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
              <SliderControl 
                label="Max Stamina Decay"
                value={config.maxStaminaDecay}
                min={0} max={10} step={0.1}
                onChange={handleConfigChange}
                unit="pts/sec"
                name="maxStaminaDecay"
              />
              <SliderControl 
                label="Action Stamina Drain"
                value={config.currentStaminaDecay}
                min={0} max={100} step={1}
                onChange={handleConfigChange}
                unit="pts/sec"
                name="currentStaminaDecay"
              />
              <SliderControl 
                label="Stamina Recovery"
                value={config.currentStaminaRecovery}
                min={0} max={100} step={1}
                onChange={handleConfigChange}
                unit="pts/sec"
                name="currentStaminaRecovery"
              />
          </div>
        </div>

        <div className="mt-8 flex justify-center">
            <button 
                onClick={resetStamina}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
            >
                Reset Stamina
            </button>
        </div>
      </div>
    </main>
  );
}
