import React, { useEffect, useRef, useState } from 'react';

interface Props {
    onDetected: (barcode: string) => void;
    onClose: () => void;
}

/**
 * BarcodeScanner — uses the native BarcodeDetector API (Chrome/Edge) with a
 * camera video stream. Falls back to manual text entry for unsupported browsers.
 */
const BarcodeScanner: React.FC<Props> = ({ onDetected, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const rafRef = useRef<number>(0);
    const [manualInput, setManualInput] = useState('');
    const [supported, setSupported] = useState<boolean | null>(null);
    const [error, setError] = useState('');
    const [scanning, setScanning] = useState(false);

    useEffect(() => {
        const hasBD = 'BarcodeDetector' in window;
        setSupported(hasBD);
        if (hasBD) startCamera();
        return () => stopCamera();
    }, []);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                setScanning(true);
                scan();
            }
        } catch {
            setError('Camera access denied. Use manual entry below.');
            setSupported(false);
        }
    };

    const stopCamera = () => {
        cancelAnimationFrame(rafRef.current);
        streamRef.current?.getTracks().forEach(t => t.stop());
    };

    const scan = async () => {
        const video = videoRef.current;
        if (!video || video.readyState < 2) {
            rafRef.current = requestAnimationFrame(scan);
            return;
        }
        try {
            // @ts-ignore — BarcodeDetector is not yet in TS lib
            const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e'] });
            const barcodes = await detector.detect(video);
            if (barcodes.length > 0) {
                stopCamera();
                onDetected(barcodes[0].rawValue);
                return;
            }
        } catch { /* keep scanning */ }
        rafRef.current = requestAnimationFrame(scan);
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualInput.trim()) {
            onDetected(manualInput.trim());
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="font-bold text-lg">Scan Barcode</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
                </div>

                {supported && (
                    <div className="relative bg-black rounded-lg overflow-hidden" style={{ height: 240 }}>
                        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                        {scanning && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="border-2 border-orange-400 rounded w-56 h-24 opacity-70" />
                            </div>
                        )}
                    </div>
                )}

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <div className="text-center text-xs text-gray-400">— or enter manually —</div>

                <form onSubmit={handleManualSubmit} className="flex gap-2">
                    <input
                        type="text"
                        className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                        placeholder="Type or paste barcode…"
                        value={manualInput}
                        onChange={e => setManualInput(e.target.value)}
                        autoFocus={!supported}
                    />
                    <button
                        type="submit"
                        className="bg-orange-500 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-orange-600"
                    >
                        Find
                    </button>
                </form>
            </div>
        </div>
    );
};

export default BarcodeScanner;
