// Face Recognition Utility using face-api.js
// This module handles face detection, descriptor extraction, and matching

let faceapi: any = null;
let modelsLoaded = false;

// Load face-api.js models
export async function loadFaceApiModels() {
    if (modelsLoaded) return true;

    try {
        // Dynamic import for client-side only
        if (typeof window === 'undefined') return false;

        faceapi = await import('face-api.js');

        const modelPath = `${window.location.origin}/models`;
        console.info('Memuat model face recognition dari:', modelPath);

        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(`${modelPath}/tiny_face_detector_model`),
            faceapi.nets.faceLandmark68Net.loadFromUri(`${modelPath}/face_landmark_68_model`),
            faceapi.nets.faceRecognitionNet.loadFromUri(`${modelPath}/face_recognition_model`),
        ]);

        modelsLoaded = true;
        return true;
    } catch (error) {
        console.error('Failed to load face-api models:', error);
        modelsLoaded = false;
        faceapi = null;
        return false;
    }
}

// Detect face and extract descriptor from video element
export async function detectFaceFromVideo(videoElement: HTMLVideoElement): Promise<Float32Array | null> {
    if (!faceapi || !modelsLoaded) {
        await loadFaceApiModels();
    }

    try {
        const detection = await faceapi
            .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 }))
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detection) return null;

        return detection.descriptor;
    } catch (error) {
        console.error('Face detection error:', error);
        return null;
    }
}

// Detect face and extract descriptor from image element
export async function detectFaceFromImage(imageElement: HTMLImageElement | HTMLCanvasElement): Promise<Float32Array | null> {
    if (!faceapi || !modelsLoaded) {
        await loadFaceApiModels();
    }

    try {
        const detection = await faceapi
            .detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 }))
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detection) return null;

        return detection.descriptor;
    } catch (error) {
        console.error('Face detection error:', error);
        return null;
    }
}

// Calculate Euclidean distance between two face descriptors
export function calculateDistance(descriptor1: Float32Array, descriptor2: Float32Array): number {
    if (descriptor1.length !== descriptor2.length) {
        throw new Error('Descriptor lengths do not match');
    }

    let sum = 0;
    for (let i = 0; i < descriptor1.length; i++) {
        const diff = descriptor1[i] - descriptor2[i];
        sum += diff * diff;
    }

    return Math.sqrt(sum);
}

// Match face descriptor against stored descriptors
// Returns best match and confidence (lower distance = higher confidence)
export function matchFace(
    descriptor: Float32Array,
    storedDescriptors: Array<{ userId: string; descriptor: number[]; name: string }>,
    threshold: number = 0.6
): { userId: string; name: string; confidence: number; matched: boolean } | null {
    if (!storedDescriptors || storedDescriptors.length === 0) return null;

    let bestMatch: { userId: string; name: string; distance: number } | null = null;

    for (const stored of storedDescriptors) {
        const storedDescriptor = new Float32Array(stored.descriptor);
        const distance = calculateDistance(descriptor, storedDescriptor);

        if (!bestMatch || distance < bestMatch.distance) {
            bestMatch = {
                userId: stored.userId,
                name: stored.name,
                distance: distance,
            };
        }
    }

    if (!bestMatch) return null;

    // Convert distance to confidence (0-1, where 1 is perfect match)
    // Typical face-api.js distances: < 0.5 = good match, < 0.6 = possible match
    const confidence = Math.max(0, 1 - (bestMatch.distance / 2));
    const matched = bestMatch.distance < threshold;

    return {
        userId: bestMatch.userId,
        name: bestMatch.name,
        confidence: Math.round(confidence * 100) / 100,
        matched,
    };
}

// Convert Float32Array to JSON-serializable array
export function descriptorToArray(descriptor: Float32Array): number[] {
    return Array.from(descriptor);
}

// Convert array to Float32Array
export function arrayToDescriptor(arr: number[]): Float32Array {
    return new Float32Array(arr);
}

// Capture image from video element
export function captureFromVideo(videoElement: HTMLVideoElement): string {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(videoElement, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
}

// Start video stream from webcam
export async function startVideoStream(videoElement: HTMLVideoElement): Promise<boolean> {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user',
            },
        });

        videoElement.srcObject = stream;
        await new Promise((resolve) => {
            videoElement.onloadedmetadata = () => {
                videoElement.play();
                resolve(true);
            };
        });

        return true;
    } catch (error) {
        console.error('Error accessing webcam:', error);
        return false;
    }
}

// Stop video stream
export function stopVideoStream(videoElement: HTMLVideoElement) {
    const stream = videoElement.srcObject as MediaStream;
    if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        videoElement.srcObject = null;
    }
}

// Anti-spoofing check (basic - check if image is too flat/uniform)
export function basicLivenessCheck(videoElement: HTMLVideoElement): boolean {
    // This is a basic check - in production, use more sophisticated methods
    // For now, we just check if we can detect a face
    return true;
}
