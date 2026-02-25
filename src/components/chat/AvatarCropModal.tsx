import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

export interface AvatarCropModalProps {
    show: boolean;
    onClose: () => void;
    imgSrc?: string;
    crop?: Crop;
    setCrop: (crop: Crop | undefined) => void;
    setCompletedCrop: (crop: PixelCrop | null) => void;
    onSave: () => void;
    imgRef: React.RefObject<HTMLImageElement | null>;
    title?: string;
    saveButtonText?: string;
}

const AvatarCropModal: React.FC<AvatarCropModalProps> = ({
    show, onClose, imgSrc, crop, setCrop, setCompletedCrop, onSave, imgRef,
    title = "Profile Synchronization", saveButtonText = "Update Profile"
}) => {
    const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        const initialCrop = centerCrop(
            makeAspectCrop({ unit: '%', width: 90 }, 1, width, height),
            width, height
        );
        setCrop(initialCrop);
    };

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    className="absolute inset-0 bg-black/20 backdrop-blur-2xl z-[60] flex items-center justify-center p-6"
                >
                    <motion.div
                        initial={{ scale: 0.95 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.95 }}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        className="bg-white/60 backdrop-blur-xl w-full max-w-xl rounded-[2.5rem] border border-white/50 shadow-premium overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        <div className="p-8 border-b border-white/40 flex justify-between items-center bg-white/40 shrink-0">
                            <h3 className="text-xs uppercase tracking-[0.3em] font-black text-brand-text">{title}</h3>
                            <button onClick={onClose} className="text-brand-text-dim hover:text-brand-text transition-colors">
                                <X size={24} strokeWidth={2} />
                            </button>
                        </div>

                        <div className="p-10 flex flex-col items-center justify-center bg-transparent overflow-hidden">
                            {imgSrc && (
                                <ReactCrop
                                    crop={crop}
                                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                                    onComplete={(c) => setCompletedCrop(c)}
                                    aspect={1}
                                    circularCrop
                                    className="max-h-[50vh] border-2 border-brand-border rounded-xl overflow-hidden shadow-2xl"
                                >
                                    <img
                                        ref={imgRef}
                                        alt="Crop target"
                                        src={imgSrc}
                                        className="max-w-full block"
                                        onLoad={onImageLoad}
                                    />
                                </ReactCrop>
                            )}
                        </div>

                        <div className="p-8 bg-white/40 border-t border-white/40 shrink-0">
                            <button onClick={onSave} className="glow-button w-full border-none py-5 text-sm tracking-[0.4em] font-black uppercase flex items-center justify-center space-x-4">
                                <Check size={20} strokeWidth={4} />
                                <span>{saveButtonText}</span>
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AvatarCropModal;
