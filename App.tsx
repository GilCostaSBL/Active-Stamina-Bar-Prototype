
import React, { useState, useEffect, useRef, useCallback } from 'react';

const TOTAL_STAMINA = 100;
const ACTION_STAMINA_RECOVERY_RATE = 2.0; // Fixed 2% per second recovery for the action bar

interface StaminaState {
  exhaustion: number;
  action: number;
}

interface ConfigState {
  exhaustionDecay: number;
  actionStaminaDecay: number;
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
  const [stamina, setStamina] = useState<StaminaState>({ exhaustion: TOTAL_STAMINA, action: TOTAL_STAMINA });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [config, setConfig] = useState<ConfigState>({
    exhaustionDecay: 0.5, // 1% every 2 seconds
    actionStaminaDecay: 3.0, // 3% per second
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
    setStamina({ exhaustion: TOTAL_STAMINA, action: TOTAL_STAMINA });
    previousTime.current = undefined;
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
      animationFrameId.current = requestAnimationFrame(gameLoop);
      return;
    }
    const deltaTime = (currentTime - previousTime.current) / 1000;
    
    setStamina(prev => {
      // Exhaustion bar decays constantly and does not recover.
      const exhaustionChange = -config.exhaustionDecay;
      const newExhaustion = prev.exhaustion + exhaustionChange * deltaTime;
      const clampedExhaustion = Math.max(0, Math.min(TOTAL_STAMINA, newExhaustion));
      
      // Action bar drains on key press, and recovers up to the exhaustion level otherwise.
      let newAction;
      if (isSpacePressedRef.current) {
        newAction = prev.action - config.actionStaminaDecay * deltaTime;
      } else {
        newAction = prev.action + ACTION_STAMINA_RECOVERY_RATE * deltaTime;
      }
      
      const clampedAction = Math.max(0, Math.min(clampedExhaustion, newAction));
      
      return { exhaustion: clampedExhaustion, action: clampedAction };
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

  const exhaustionPercent = (stamina.exhaustion / TOTAL_STAMINA) * 100;
  // Calculate the action percentage relative to the current exhaustion level for the gradient
  const actionRelativeToExhaustionPercent = stamina.exhaustion > 0 ? (stamina.action / stamina.exhaustion) * 100 : 0;

  return (
    <main className="bg-gray-900 min-h-screen flex items-center justify-center font-sans p-4">
      <div className="w-full max-w-2xl bg-gray-800 shadow-2xl rounded-2xl p-6 md:p-8 border border-gray-700">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white">Interactive Stamina Bar</h1>
          <p className="text-gray-400 mt-2">Press and hold the <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-200 bg-gray-700 border border-gray-600 rounded-lg">Spacebar</kbd> to drain action stamina.</p>
        </div>

        {/* Stamina Bar */}
        <div className="relative w-full h-8 bg-gray-700 rounded-full overflow-hidden shadow-inner border-2 border-black/30 mb-8" title="Total Stamina">
            {/* Combined Action/Exhaustion Bar */}
            <div
                className="absolute top-0 left-0 h-full"
                style={{
                    width: `${exhaustionPercent}%`,
                    // Uses a gradient to show light green (Action) up to its value, and dark green (Exhaustion) for the rest.
                    // RGB values correspond to Tailwind's green-400 and green-800.
                    background: `linear-gradient(to right, rgb(74 222 128) ${actionRelativeToExhaustionPercent}%, rgb(22 101 52) ${actionRelativeToExhaustionPercent}%)`,
                    transition: 'width 150ms linear, background 150ms linear'
                }}
                title={`Action: ${Math.round(stamina.action)}, Exhaustion: ${Math.round(stamina.exhaustion)}`}
            ></div>
            <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm tracking-wider" style={{ textShadow: '1px 1px 2px black' }}>
                {Math.round(stamina.action)} / {Math.round(stamina.exhaustion)}
            </div>
        </div>

        {/* Controls */}
        <div className="bg-black/20 p-6 rounded-lg border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4 text-center">Adjust Parameters</h2>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
              <SliderControl 
                label="Exhaustion Decay"
                value={config.exhaustionDecay}
                min={0} max={10} step={0.5}
                onChange={handleConfigChange}
                unit="%/sec"
                name="exhaustionDecay"
              />
              <SliderControl 
                label="Action Stamina Decay"
                value={config.actionStaminaDecay}
                min={0} max={15} step={0.5}
                onChange={handleConfigChange}
                unit="%/sec"
                name="actionStaminaDecay"
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
