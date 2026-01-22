import { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [images, setImages] = useState([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playMode, setPlayMode] = useState('scroll'); // 'scroll' or 'auto'
  const canvasRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const imageObjectsRef = useRef([]);
  const animationFrameRef = useRef(null);
  const lastFrameTimeRef = useRef(0);
  const fps = 60;
  const frameInterval = 1000 / fps; // ~16.67ms per frame

  useEffect(() => {
    // Load all images from v1 folder
    const loadImages = async () => {
      try {
        const imageContext = require.context('./v1', false, /\.png$/);
        const imageKeys = imageContext.keys();
        
        // Sort the keys to ensure correct order
        const sortedKeys = imageKeys.sort((a, b) => {
          const numA = parseInt(a.match(/\d+/)?.[0] || '0');
          const numB = parseInt(b.match(/\d+/)?.[0] || '0');
          return numA - numB;
        });
        
        // Create array of image sources
        const imageSources = sortedKeys.map(key => imageContext(key));
        setImages(imageSources);
        
        // Preload all images as Image objects
        const imageObjects = [];
        let loadedCount = 0;
        
        imageSources.forEach((src, index) => {
          const img = new Image();
          img.onload = () => {
            loadedCount++;
            if (loadedCount === imageSources.length) {
              imageObjectsRef.current = imageObjects;
            }
          };
          img.src = src;
          imageObjects.push(img);
        });
        
        imageObjectsRef.current = imageObjects;
      } catch (error) {
        console.error('Error loading images:', error);
      }
    };

    loadImages();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || images.length === 0) return;

    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      const maxWidth = Math.min(1200, window.innerWidth - 40);
      const maxHeight = window.innerHeight - 40;
      
      // Get first image to determine aspect ratio
      if (imageObjectsRef.current.length > 0 && imageObjectsRef.current[0].complete) {
        const img = imageObjectsRef.current[0];
        const aspectRatio = img.width / img.height;
        
        let canvasWidth = maxWidth;
        let canvasHeight = canvasWidth / aspectRatio;
        
        if (canvasHeight > maxHeight) {
          canvasHeight = maxHeight;
          canvasWidth = canvasHeight * aspectRatio;
        }
        
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
      } else {
        canvas.width = maxWidth;
        canvas.height = maxHeight;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Draw current frame
    const drawFrame = (frameIndex) => {
      if (frameIndex < 0 || frameIndex >= imageObjectsRef.current.length) return;
      
      const img = imageObjectsRef.current[frameIndex];
      if (!img || !img.complete) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Calculate scaling to fit canvas while maintaining aspect ratio
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const x = (canvas.width - img.width * scale) / 2;
      const y = (canvas.height - img.height * scale) / 2;
      
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    };

    // Initial draw
    if (imageObjectsRef.current[currentFrame]) {
      drawFrame(currentFrame);
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [images, currentFrame]);

  // 60 FPS animation loop
  useEffect(() => {
    if (playMode !== 'auto' || !isPlaying || images.length === 0) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const animate = (currentTime) => {
      if (!lastFrameTimeRef.current) {
        lastFrameTimeRef.current = currentTime;
      }

      const elapsed = currentTime - lastFrameTimeRef.current;

      if (elapsed >= frameInterval) {
        setCurrentFrame((prevFrame) => {
          const nextFrame = prevFrame + 1;
          if (nextFrame >= images.length) {
            // Loop back to start
            return 0;
          }
          return nextFrame;
        });
        lastFrameTimeRef.current = currentTime;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      lastFrameTimeRef.current = 0;
    };
  }, [playMode, isPlaying, images.length]);

  // Scroll-based frame mapping
  useEffect(() => {
    if (playMode !== 'scroll') return;
    
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || images.length === 0) return;

    const handleScroll = () => {
      const scrollTop = scrollContainer.scrollTop;
      const scrollHeight = scrollContainer.scrollHeight - scrollContainer.clientHeight;
      const scrollProgress = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
      
      // Map scroll progress to frame index
      const frameIndex = Math.min(
        Math.floor(scrollProgress * images.length),
        images.length - 1
      );
      
      setCurrentFrame(frameIndex);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial calculation

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [images, playMode]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleMode = () => {
    setPlayMode(playMode === 'scroll' ? 'auto' : 'scroll');
    setIsPlaying(false);
  };

  return (
    <div className="App">
      <div className="scroll-container" ref={scrollContainerRef}>
        {/* Scrollable spacer to control animation (only in scroll mode) */}
        {playMode === 'scroll' && (
          <div 
            className="scroll-spacer" 
            style={{ height: `${images.length * 50}px` }}
          ></div>
        )}
        
        {/* Fixed canvas display */}
        <div className="canvas-container">
          <canvas ref={canvasRef} className="animation-canvas"></canvas>
          
          {/* Controls */}
          <div className="controls">
            <button onClick={toggleMode} className="mode-button">
              {playMode === 'scroll' ? 'Switch to Auto' : 'Switch to Scroll'}
            </button>
            {playMode === 'auto' && (
              <button onClick={togglePlay} className="play-button">
                {isPlaying ? 'Pause' : 'Play'}
              </button>
            )}
          </div>
          
          {images.length > 0 && (
            <div className="frame-info">
              <span>Frame {currentFrame + 1} / {images.length}</span>
              <span className="fps-info">{playMode === 'auto' && isPlaying ? `@ ${fps} FPS` : ''}</span>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${((currentFrame + 1) / images.length) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
          {images.length === 0 && (
            <div className="loading">Loading images...</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
