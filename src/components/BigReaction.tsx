import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BigReactionProps {
    emoji: string;
    onComplete: () => void;
}

const BigReaction: React.FC<BigReactionProps> = ({ emoji, onComplete }) => {
    useEffect(() => {
        const timer = setTimeout(onComplete, 3000);
        return () => clearTimeout(timer);
    }, [onComplete]);

    const isBanana = emoji === '🍌';
    const isWhale = emoji === '🐳' || emoji === '🐋';

    return (
        <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center overflow-hidden">
            <AnimatePresence>
                {isBanana && (
                    <motion.div
                        initial={{ scale: 0, rotate: -45, y: 100 }}
                        animate={{
                            scale: [0, 1.5, 1.2, 2, 0],
                            rotate: [0, 90, 180, 270, 360],
                            y: [100, -200, 0, 500],
                            opacity: [0, 1, 1, 1, 0]
                        }}
                        transition={{ duration: 2.5, ease: "easeInOut" }}
                        className="text-9xl filter drop-shadow-[0_0_50px_rgba(255,255,0,0.5)]"
                    >
                        🍌
                    </motion.div>
                )}

                {isWhale && (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <motion.div
                            initial={{ x: -500, y: 200, rotate: -20, scale: 0.5 }}
                            animate={{
                                x: [-500, 0, 500],
                                y: [200, -100, 200],
                                rotate: [-20, 0, 20],
                                scale: [0.5, 2, 0.5],
                                opacity: [0, 1, 0]
                            }}
                            transition={{ duration: 2, ease: "easeOut" }}
                            className="text-9xl filter drop-shadow-[0_0_50px_rgba(0,191,255,0.5)]"
                        >
                            🐳
                        </motion.div>
                        {/* Splash particles */}
                        {[1, 2, 3, 4, 5].map(i => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{
                                    opacity: [0, 1, 0],
                                    scale: [0, 1.5],
                                    x: [(i - 3) * 50, (i - 3) * 150],
                                    y: [0, -100]
                                }}
                                transition={{ duration: 1, delay: 0.8 }}
                                className="absolute bg-blue-400/40 w-4 h-4 rounded-full blur-sm"
                            />
                        ))}
                    </div>
                )}

                {!isBanana && !isWhale && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                            scale: [0, 2, 1.5, 0],
                            opacity: [0, 1, 1, 0]
                        }}
                        transition={{ duration: 1.5 }}
                        className="text-8xl"
                    >
                        {emoji}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BigReaction;
